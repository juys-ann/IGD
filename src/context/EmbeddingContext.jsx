/**
 * src/context/EmbeddingContext.jsx
 *
 * Singleton context for the embedding worker.
 * Lives at the App root alongside AIContext — survives all navigation.
 *
 * Usage:
 *   const { embedStatus, embed, semanticSearch, indexEntry, indexAll } = useEmbedding()
 *
 * embed(text) → Promise<number[]>          — get a vector for any text
 * semanticSearch(text, topK) → Promise<[{journalId, score}]>  — query the store
 * indexEntry(journalEntry) → Promise<void> — embed + store one journal entry
 * indexAll(entries) → Promise<void>        — (re-)index all entries in bulk
 */

import { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react'
import { saveVectors, semanticSearch as storeSearch, chunkText, isIndexed } from '../services/embedding/vectorStore'

const EmbeddingContext = createContext(null)

export function EmbeddingProvider({ children }) {
  const [embedStatus, setEmbedStatus] = useState('idle') // idle|loading|ready|error
  const [indexingProgress, setIndexingProgress] = useState(null) // { current, total } | null

  const workerRef         = useRef(null)
  const pendingEmbedRef   = useRef(null)    // { resolve, reject } for single embed call
  const pendingBatchRef   = useRef(null)    // { resolve, reject } for batch call
  const isReadyRef        = useRef(false)

  useEffect(() => () => workerRef.current?.terminate(), [])

  const initWorker = useCallback(() => {
    workerRef.current?.terminate()

    const worker = new Worker(
      new URL('../workers/embeddingWorker.js', import.meta.url),
      { type: 'module' }
    )

    worker.addEventListener('message', ({ data }) => {
      const msg = data ?? {}

      if (msg.type === 'ready') {
        setEmbedStatus('ready')
        isReadyRef.current = true
        return
      }

      if (msg.type === 'embedded') {
        pendingEmbedRef.current?.resolve(msg.vector)
        pendingEmbedRef.current = null
        return
      }

      if (msg.type === 'batchComplete') {
        pendingBatchRef.current?.resolve(msg.results)
        pendingBatchRef.current = null
        return
      }

      if (msg.type === 'error') {
        const err = new Error(msg.error)
        pendingEmbedRef.current?.reject(err)
        pendingBatchRef.current?.reject(err)
        pendingEmbedRef.current = null
        pendingBatchRef.current = null
        if (embedStatus !== 'ready') {
          setEmbedStatus('error')
        }
        console.error('[EmbeddingContext]', msg.error, msg.failedAt)
        return
      }
    })

    worker.addEventListener('error', (err) => {
      console.error('[EmbeddingContext worker error]', err.message)
      setEmbedStatus('error')
    })

    workerRef.current = worker
    setEmbedStatus('loading')
    worker.postMessage({ type: 'init' })
  }, [])

  // Auto-init on mount
  useEffect(() => { initWorker() }, [])

  // ── embed: get a vector for a single piece of text ────────────────────────
  const embed = useCallback((text) => {
    if (!isReadyRef.current || !workerRef.current) {
      return Promise.reject(new Error('Embedding worker not ready'))
    }
    return new Promise((resolve, reject) => {
      pendingEmbedRef.current = { resolve, reject }
      workerRef.current.postMessage({ type: 'embed', payload: { id: 'query', text } })
    })
  }, [])

  // ── semanticSearch: embed a query and find similar journal entries ─────────
  const semanticSearch = useCallback(async (queryText, topK = 5) => {
    if (embedStatus !== 'ready') return []
    const vector = await embed(queryText)
    return storeSearch(vector, topK)
  }, [embed, embedStatus])

  // ── indexEntry: embed + store one journal entry (with chunking) ───────────
  const indexEntry = useCallback(async (entry) => {
    if (!isReadyRef.current) return

    const text = `${entry.title ?? ''} ${entry.content ?? ''}`.trim()
    if (!text) return

    const chunks   = chunkText(text, 150, 20)
    const vectors  = []

    for (const chunk of chunks) {
      const vec = await embed(chunk)
      vectors.push(vec)
    }

    await saveVectors(entry.id, vectors)
  }, [embed])

  // ── indexAll: (re-)index all entries, skipping already-indexed ones ────────
  const indexAll = useCallback(async (entries) => {
    if (!isReadyRef.current || !entries?.length) return
    setIndexingProgress({ current: 0, total: entries.length })

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i]

      // Skip if already indexed (saves time on re-open)
      const already = await isIndexed(entry.id)
      if (!already) {
        await indexEntry(entry)
      }

      setIndexingProgress({ current: i + 1, total: entries.length })
    }

    setIndexingProgress(null)
  }, [indexEntry])

  return (
    <EmbeddingContext.Provider value={{
      embedStatus,
      indexingProgress,
      embed,
      semanticSearch,
      indexEntry,
      indexAll,
      reinit: initWorker,
    }}>
      {children}
    </EmbeddingContext.Provider>
  )
}

export function useEmbedding() {
  const ctx = useContext(EmbeddingContext)
  if (!ctx) throw new Error('useEmbedding() must be used inside <EmbeddingProvider>')
  return ctx
}
