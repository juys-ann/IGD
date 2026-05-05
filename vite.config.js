import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * vite.config.js
 *
 * COEP fix — why this matters:
 *
 * The app previously used (or defaulted to) COEP: require-corp.
 * That policy blocks any cross-origin resource that doesn't explicitly
 * send a Cross-Origin-Resource-Policy: cross-origin header — including
 * HuggingFace's favicon.ico, which causes:
 *   ERR_BLOCKED_BY_RESPONSE.NotSameOriginAfterDefaultedToSameOriginByCoep
 *
 * Fix: switch to COEP: credentialless.
 *   - Still satisfies the requirement for SharedArrayBuffer
 *     (which needs COEP + COOP together).
 *   - Allows cross-origin resources loaded without credentials
 *     (images, favicons, CDN assets) to load normally.
 *   - The Gemini API fetch uses mode:'cors' with explicit credentials:
 *     'omit' (default), so it is unaffected.
 *
 * References:
 *   https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cross-Origin-Embedder-Policy
 *   https://web.dev/cross-origin-isolation-guide/
 */
export default defineConfig({
  plugins: [react()],

  server: {
    headers: {
      // credentialless — allows cross-origin no-credential resources (favicons, CDN)
      // while still enabling SharedArrayBuffer / WebAssembly threads
      'Cross-Origin-Embedder-Policy': 'credentialless',

      // required alongside COEP to achieve cross-origin isolation
      'Cross-Origin-Opener-Policy': 'same-origin',
    },
  },

  preview: {
    headers: {
      'Cross-Origin-Embedder-Policy': 'credentialless',
      'Cross-Origin-Opener-Policy':   'same-origin',
    },
  },
})
