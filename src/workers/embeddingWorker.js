/**
 * src/workers/embeddingWorker.js
 *
 * Dedicated Web Worker for generating semantic text embeddings.
 * Uses Xenova/all-MiniLM-L6-v2 — a small (23MB), fast sentence transformer
 * that converts text into 384-dimensional vectors for cosine similarity search.
 *
 * This is what upgrades the RAG from keyword matching to true semantic search:
 * "What did I feel about my job?" will now match "career anxiety" entries
 * even if the word "job" never appears in them.
 *
 * Message API:
 *   RECEIVE { type: 'init' }
 *   RECEIVE { type: 'embed', payload: { id, text } }      — single text
 *   RECEIVE { type: 'embedBatch', payload: { items } }     — array of { id, text }
 *
 *   SEND { type: 'ready' }
 *   SEND { type: 'embedded',      id, vector }
 *   SEND { type: 'batchComplete', results: [{ id, vector }] }
 *   SEND { type: 'progress',      loaded, total }
 *   SEND { type: 'error',         error, failedAt }
 */

const EMBED_MODEL = 'Xenova/all-MiniLM-L6-v2'
const CDN = 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2/dist/transformers.min.js'

let extractor = null

const send = (msg) => self.postMessage(msg)

self.addEventListener('message', async ({ data }) => {
  const { type, payload } = data ?? {}

  // ── init ─────────────────────────────────────────────────────────────────
  if (type === 'init') {
    try {
      const { pipeline, env } = await import(CDN)

      env.allowLocalModels              = false
      env.useBrowserCache               = true
      env.backends.onnx.wasm.proxy      = false
      env.backends.onnx.wasm.numThreads = 1

      extractor = await pipeline('feature-extraction', EMBED_MODEL, {
        progress_callback(p) {
          if (p.status === 'download') {
            send({ type: 'progress', loaded: p.loaded ?? 0, total: p.total ?? 0 })
          }
        },
      })

      send({ type: 'ready' })
    } catch (err) {
      send({ type: 'error', error: err.message, failedAt: 'embedding model init' })
    }
    return
  }

  // ── single embed ──────────────────────────────────────────────────────────
  if (type === 'embed') {
    const { id, text } = payload ?? {}
    try {
      const output = await extractor(text, { pooling: 'mean', normalize: true })
      send({ type: 'embedded', id, vector: Array.from(output.data) })
    } catch (err) {
      send({ type: 'error', error: err.message, failedAt: `embedding id=${id}` })
    }
    return
  }

  // ── batch embed ────────────────────────────────────────────────────────────
  if (type === 'embedBatch') {
    const { items = [] } = payload ?? {}
    const results = []
    for (const { id, text } of items) {
      try {
        const output = await extractor(text, { pooling: 'mean', normalize: true })
        results.push({ id, vector: Array.from(output.data) })
      } catch (err) {
        console.error(`[embeddingWorker] Failed to embed id=${id}:`, err.message)
      }
    }
    send({ type: 'batchComplete', results })
    return
  }
})
