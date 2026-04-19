/**
 * src/services/security/crypto.js
 *
 * IAS Security Control A: Secure Authentication
 * CIA Principle: Confidentiality
 *
 * Uses the browser-native Web Crypto API (window.crypto.subtle) to hash
 * the user's vault PIN before storage. No plain-text PIN is ever saved.
 * No external library required — crypto.subtle is available in all modern
 * browsers and in Web Workers.
 *
 * Threat addressed: Credential theft / unauthorized access to journals.
 */

// Application-specific salt prevents rainbow table attacks.
// Combine with the PIN so that the same PIN produces a unique hash per app.
const APP_SALT = 'IGD_VAULT_2026_SALT'

/**
 * Hash a PIN string using SHA-256 + application salt.
 * Returns a hex string (64 characters).
 */
export async function hashPIN(pin) {
  const encoder = new TextEncoder()
  const data    = encoder.encode(pin + APP_SALT)
  const buffer  = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * Compare a plain-text PIN against a stored hash.
 * Returns true if they match.
 */
export async function verifyPIN(pin, storedHash) {
  const candidate = await hashPIN(pin)
  return candidate === storedHash
}

/**
 * Generate a short random session token stored in sessionStorage.
 * Invalidated automatically when the browser tab is closed.
 */
export function createSessionToken() {
  const array = new Uint8Array(16)
  crypto.getRandomValues(array)
  return Array.from(array).map((b) => b.toString(16).padStart(2, '0')).join('')
}

// ── Session storage keys ──────────────────────────────────────────────────────
const SESSION_KEY = 'IGD_SESSION'
const ROLE_KEY    = 'IGD_ROLE'

export function saveSession(token, role) {
  sessionStorage.setItem(SESSION_KEY, token)
  sessionStorage.setItem(ROLE_KEY, role)
}

export function getSession() {
  return {
    token: sessionStorage.getItem(SESSION_KEY),
    role:  sessionStorage.getItem(ROLE_KEY),
  }
}

export function clearSession() {
  sessionStorage.removeItem(SESSION_KEY)
  sessionStorage.removeItem(ROLE_KEY)
}

export function isSessionActive() {
  return !!sessionStorage.getItem(SESSION_KEY)
}
