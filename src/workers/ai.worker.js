/**
 * src/workers/ai.worker.js
 *
 * ── Why CDN instead of npm import ────────────────────────────────────────────
 *
 * Every previous fix tried to tell Vite's bundler how to handle
 * onnxruntime-web correctly. That battle cannot be won reliably because
 * onnxruntime-web initialises itself (calls registerBackend) at module-parse
 * time, inside the bundled artifact, before any user code can configure it.
 *
 * The definitive fix: don't ask Vite to bundle it at all.
 * A dynamic import() from jsDelivr CDN loads the pre-built, self-contained
 * transformers.min.js. That build knows exactly where its own WASM files live
 * (relative to the CDN URL), so registerBackend always has a valid backend
 * object and the crash cannot occur.
 *
 * ── Message API ──────────────────────────────────────────────────────────────
 * RECEIVE  { type: 'init' }
 * RECEIVE  { type: 'generate', payload: { prompt, maxNewTokens? } }
 *
 * SEND     { type: 'progress', stage, file, loaded, total }
 * SEND     { type: 'ready' }
 * SEND     { type: 'result',   text }
 * SEND     { type: 'error',    error, failedAt }
 * SEND     { type: 'log',      level, message }
 */

// Pinned CDN URL — update the version number here when upgrading
const TRANSFORMERS_CDN =
  'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2/dist/transformers.min.js'

const MODEL_ID = 'Xenova/LaMini-Flan-T5-248M'
const TASK     = 'text2text-generation'

let generator = null   // populated after successful init

// ── Helpers ───────────────────────────────────────────────────────────────────
const send = (msg) => self.postMessage(msg)
const log  = (level, message, meta) => {
  send({ type: 'log', level, message, meta })
  ;(level === 'error' ? console.error : console.log)('[ai.worker]', message, meta ?? '')
}

function diagnose(errMsg = '') {
  const m = errMsg.toLowerCase()
  if (m.includes('registerbackend'))
    return 'onnxruntime registerBackend crash — delete node_modules/.vite and restart'
  if (m.includes("unexpected token '<'") || m.includes('not valid json'))
    return 'Received index.html instead of a model file — CDN may be blocked or CORS issue'
  if (m.includes('failed to fetch') || m.includes('networkerror'))
    return 'Network error fetching from CDN — check internet connection'
  if (m.includes('sharedarraybuffer'))
    return 'SharedArrayBuffer unavailable — check COOP/COEP headers in vite.config.js'
  if (m.includes('tokenizer'))   return 'tokenizer.json failed to load'
  if (m.includes('onnx'))        return 'model.onnx (weight file) failed to load'
  if (m.includes('config'))      return 'config.json failed to load'
  return `unknown — raw: "${errMsg.slice(0, 140)}"`
}

// ── Message handler ───────────────────────────────────────────────────────────
self.addEventListener('message', async ({ data }) => {
  const { type, payload } = data ?? {}

  // ── init ───────────────────────────────────────────────────────────────────
  if (type === 'init') {
    log('info', `Loading @xenova/transformers from CDN…`)

    try {
      // ── STEP 1: load library from CDN ──────────────────────────────────────
      // Dynamic import resolves at runtime from jsDelivr, not from node_modules.
      // Vite never touches this module so onnxruntime-web initialises cleanly.
      const { env, pipeline } = await import(TRANSFORMERS_CDN)

      // ── STEP 2: configure env AFTER import (safe here because the CDN build
      // defers backend registration to first pipeline() call, not import time)
      env.allowLocalModels             = false  // never look for local /models/
      env.useBrowserCache              = true   // cache weights after first download
      env.backends.onnx.wasm.proxy     = false  // disable nested proxy worker
      env.backends.onnx.wasm.numThreads = 1     // single-threaded: avoids Atomics issues

      log('info', `Creating pipeline: ${MODEL_ID}`)

      // ── STEP 3: load the model (downloads ~500 MB on first run, cached after)
      generator = await pipeline(TASK, MODEL_ID, {
        progress_callback(p) {
          if (p.status === 'initiate') {
            send({ type: 'progress', stage: 'initiate', file: p.file, loaded: 0, total: 0 })
          } else if (p.status === 'download') {
            send({ type: 'progress', stage: 'download',
              file: p.file, loaded: p.loaded ?? 0, total: p.total ?? 0 })
          } else if (p.status === 'loading') {
            send({ type: 'progress', stage: 'loading',
              file: p.file, loaded: p.loaded ?? 0, total: p.total ?? 0 })
          }
        },
      })

      log('info', 'Pipeline ready ✓')
      send({ type: 'ready' })

    } catch (err) {
      const failedAt = diagnose(err.message)
      log('error', `Init FAILED: ${err.message}`, { failedAt })
      send({ type: 'error', error: err.message, failedAt })
    }
    return
  }

  // ── generate ───────────────────────────────────────────────────────────────
  if (type === 'generate') {
    if (!generator) {
      send({ type: 'error',
        error: 'Generator not ready. Wait for { type: "ready" } before sending generate.',
        failedAt: 'generator is null' })
      return
    }

    const { prompt = '', maxNewTokens = 200 } = payload ?? {}

    if (!prompt.trim()) {
      send({ type: 'error', error: 'Empty prompt.', failedAt: 'prompt validation' })
      return
    }

    try {
      log('info', `Generating (max_new_tokens=${maxNewTokens})…`)

      const output = await generator(prompt, {
        max_new_tokens:     maxNewTokens,
        temperature:        0.75,
        do_sample:          true,
        repetition_penalty: 1.3,
      })

      const text = output?.[0]?.generated_text?.trim() ?? ''
      log('info', `Done — ${text.split(/\s+/).length} words`)
      send({ type: 'result', text })

    } catch (err) {
      const failedAt = diagnose(err.message)
      log('error', `Generation FAILED: ${err.message}`, { failedAt })
      send({ type: 'error', error: err.message, failedAt })
    }
    return
  }

  log('warn', `Unhandled message type: "${type}"`)
})
