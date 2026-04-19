import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import topLevelAwait from 'vite-plugin-top-level-await'

/**
 * vite.config.js — Inter-Generational Dialogue
 *
 * Now that ai.worker.js loads @xenova/transformers from CDN at runtime,
 * the optimizeDeps.exclude and onnxruntime-web exclusions are no longer
 * the load-bearing fixes — but we keep them as defensive settings so that
 * if anything in the main thread ever imports from @xenova/transformers,
 * it also won't be mangled by esbuild.
 *
 * The COOP / COEP headers are still required: jsDelivr sends
 * Cross-Origin-Resource-Policy: cross-origin on all its responses, so the
 * require-corp COEP policy is satisfied and SharedArrayBuffer stays available.
 */
export default defineConfig({
  plugins: [
    react(),
    topLevelAwait(),
  ],

  worker: {
    format: 'es',
    plugins: () => [topLevelAwait()],
  },

  // Defensive: prevents esbuild from mangling these if imported in main thread
  optimizeDeps: {
    exclude: ['@xenova/transformers', 'onnxruntime-web'],
  },

  build: {
    target: 'esnext',
  },

  // process.env.NODE_ENV — needed by onnxruntime-web internals in some builds
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV ?? 'production'),
  },

  assetsInclude: ['**/*.onnx', '**/*.bin'],

  server: {
    headers: {
      // Required for SharedArrayBuffer (ONNX multi-thread inference)
      // jsDelivr sends CORP: cross-origin so require-corp is satisfied
      'Cross-Origin-Opener-Policy':   'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },

  preview: {
    headers: {
      'Cross-Origin-Opener-Policy':   'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
})
