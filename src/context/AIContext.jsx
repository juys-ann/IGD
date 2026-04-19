/**
 * src/context/AIContext.jsx
 *
 * Singleton AI Worker Provider.
 *
 * By lifting the Web Worker into a Context that lives at the App root,
 * it survives all page navigation. The model downloads once and stays
 * "Ready" for the lifetime of the browser session.
 *
 * Usage:
 *   const { workerStatus, workerError, downloadProgress, initWorker, generate } = useAI()
 *
 * generate(prompt, maxNewTokens?) → Promise<string>
 *   Resolves with the generated text, or rejects with an Error.
 */

import { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react'

const AIContext = createContext(null)

export function AIProvider({ children }) {
  const [workerStatus,      setWorkerStatus]     = useState('idle')   // idle|loading|ready|error
  const [workerError,       setWorkerError]      = useState(null)
  const [downloadProgress,  setDownloadProgress] = useState({ pct: 0, loadedMB: '', totalMB: '' })

  const workerRef          = useRef(null)
  const pendingGenerateRef = useRef(null)   // { resolve, reject } for the in-flight generate call
  const downloadFilesRef   = useRef({})     // { [filename]: { loaded, total } }

  // Terminate worker when the entire app unmounts (page close / refresh)
  useEffect(() => () => workerRef.current?.terminate(), [])

  // ── Progress bookkeeping ────────────────────────────────────────────────────
  const handleProgress = useCallback((file, loaded, total) => {
    downloadFilesRef.current = {
      ...downloadFilesRef.current,
      [file]: { loaded, total },
    }
    const files      = Object.values(downloadFilesRef.current)
    const totalLoaded = files.reduce((a, f) => a + (f.loaded ?? 0), 0)
    const totalBytes  = files.reduce((a, f) => a + (f.total  ?? 0), 0)
    const pct  = totalBytes > 0 ? Math.min(100, Math.round((totalLoaded / totalBytes) * 100)) : 0
    const toMB = (b) => b > 0 ? `${(b / 1e6).toFixed(1)} MB` : ''
    setDownloadProgress({ pct, loadedMB: toMB(totalLoaded), totalMB: toMB(totalBytes) })
  }, [])

  // ── Worker initialisation ───────────────────────────────────────────────────
  const initWorker = useCallback(() => {
    // Clean up any existing worker before creating a new one
    workerRef.current?.terminate()
    downloadFilesRef.current = {}
    setDownloadProgress({ pct: 0, loadedMB: '', totalMB: '' })
    setWorkerError(null)

    const worker = new Worker(
      new URL('../workers/ai.worker.js', import.meta.url),
      { type: 'module' }
    )

    worker.addEventListener('message', ({ data }) => {
      const msg = data ?? {}

      switch (msg.type) {
        case 'progress':
          handleProgress(msg.file, msg.loaded, msg.total)
          break

        case 'ready':
          setWorkerStatus('ready')
          break

        case 'result':
          // Resolve the pending generate() Promise
          pendingGenerateRef.current?.resolve(msg.text)
          pendingGenerateRef.current = null
          break

        case 'error': {
          const detail = [msg.error, msg.failedAt ? `→ ${msg.failedAt}` : '']
            .filter(Boolean).join('\n')

          if (pendingGenerateRef.current) {
            // A generate() call was in-flight — reject its Promise
            pendingGenerateRef.current.reject(new Error(detail))
            pendingGenerateRef.current = null
          } else {
            // Init-time failure — surface in the UI
            setWorkerError(detail)
            setWorkerStatus('error')
          }
          break
        }

        case 'log':
          (msg.level === 'error' ? console.error : console.log)(
            '[worker]', msg.message, msg.meta ?? ''
          )
          break

        default:
          break
      }
    })

    // Catch script-load / compile errors (wrong path, MIME type, syntax)
    worker.addEventListener('error', (err) => {
      const detail = err.filename
        ? `Script error in ${err.filename}:${err.lineno} — ${err.message}`
        : err.message ?? 'Unknown worker script error'
      setWorkerError(detail)
      setWorkerStatus('error')
    })

    workerRef.current = worker
    setWorkerStatus('loading')
    worker.postMessage({ type: 'init' })
  }, [handleProgress])

  // ── generate ────────────────────────────────────────────────────────────────
  // Returns a Promise so callers can await the result directly.
  // Only one generate call can be in-flight at a time (the worker is serial).
  const generate = useCallback((prompt, maxNewTokens = 200) => {
    if (workerStatus !== 'ready' || !workerRef.current) {
      return Promise.reject(new Error('AI worker is not ready.'))
    }
    if (pendingGenerateRef.current) {
      return Promise.reject(new Error('A generation is already in progress.'))
    }

    return new Promise((resolve, reject) => {
      pendingGenerateRef.current = { resolve, reject }
      workerRef.current.postMessage({
        type:    'generate',
        payload: { prompt, maxNewTokens },
      })
    })
  }, [workerStatus])

  return (
    <AIContext.Provider value={{
      workerStatus,
      workerError,
      downloadProgress,
      initWorker,
      generate,
    }}>
      {children}
    </AIContext.Provider>
  )
}

export function useAI() {
  const ctx = useContext(AIContext)
  if (!ctx) throw new Error('useAI() must be called inside <AIProvider>')
  return ctx
}
