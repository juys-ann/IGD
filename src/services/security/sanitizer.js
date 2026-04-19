/**
 * src/services/security/sanitizer.js
 *
 * IAS Security Control B: Input Validation & XSS Prevention
 * CIA Principle: Integrity
 */

const SCRIPT_TAG      = /<script[\s\S]*?>[\s\S]*?<\/script>/gi
const EVENT_HANDLERS  = /\s(on\w+)\s*=\s*["'][^"']*["']/gi
const JAVASCRIPT_URI  = /javascript\s*:/gi
const DATA_URI        = /data\s*:/gi
const HTML_TAGS       = /<[^>]+>/g
const NULL_BYTES      = /\0/g
const PROTO_POLLUTION = /__proto__|constructor|prototype/gi

export function sanitizeText(input) {
  if (!input || typeof input !== 'string') return ''
  return input
    .replace(NULL_BYTES, '')
    .replace(SCRIPT_TAG, '')
    .replace(EVENT_HANDLERS, '')
    .replace(JAVASCRIPT_URI, '')
    .replace(DATA_URI, '')
    .replace(HTML_TAGS, '')
    .replace(PROTO_POLLUTION, '')
    .trim()
}

export function sanitizeTitle(input) {
  if (!input || typeof input !== 'string') return ''
  return sanitizeText(input).slice(0, 200)
}

export function validateFileType(file) {
  const ALLOWED_EXT = new Set(['.txt', '.docx'])
  const ext = '.' + file.name.split('.').pop().toLowerCase()
  if (!ALLOWED_EXT.has(ext)) {
    return { valid: false, error: `File type .${ext.slice(1)} is not allowed. Use .txt or .docx.` }
  }
  const MAX_BYTES = 10 * 1024 * 1024
  if (file.size > MAX_BYTES) {
    return { valid: false, error: `File exceeds 10 MB limit (${(file.size / 1e6).toFixed(1)} MB).` }
  }
  return { valid: true }
}

// ── Password strength helpers ─────────────────────────────────────────────────

const SPECIAL_CHARS = '!@#$%^&*'
const SPECIAL_RE    = /[!@#$%^&*]/

/**
 * validatePIN — IAS requirement: secure password
 *
 * Rules (all must pass):
 *   • At least 8 characters
 *   • At most 20 characters
 *   • At least 1 uppercase letter (A-Z)
 *   • At least 1 number (0-9)
 *   • At least 1 special character: ! @ # $ % ^ & *
 */
export function validatePIN(pin) {
  if (!pin || typeof pin !== 'string') {
    return { valid: false, error: 'Password is required.' }
  }
  if (pin.length < 8) {
    return { valid: false, error: 'Password must be at least 8 characters.' }
  }
  if (pin.length > 20) {
    return { valid: false, error: 'Password must be 20 characters or fewer.' }
  }
  if (!/[A-Z]/.test(pin)) {
    return { valid: false, error: 'Password must include at least one uppercase letter (A-Z).' }
  }
  if (!/[0-9]/.test(pin)) {
    return { valid: false, error: 'Password must include at least one number (0-9).' }
  }
  if (!SPECIAL_RE.test(pin)) {
    return { valid: false, error: `Password must include at least one special character: ${SPECIAL_CHARS}` }
  }
  return { valid: true }
}

/**
 * getPINStrength — returns 'weak' | 'fair' | 'strong' for the live indicator.
 * Does NOT enforce rules — just provides feedback as the user types.
 */
export function getPINStrength(pin) {
  if (!pin) return null
  let score = 0
  if (pin.length >= 8)        score++
  if (pin.length >= 12)       score++
  if (/[A-Z]/.test(pin))      score++
  if (/[0-9]/.test(pin))      score++
  if (SPECIAL_RE.test(pin))   score++
  if (pin.length >= 16)       score++

  if (score <= 2) return 'weak'
  if (score <= 4) return 'fair'
  return 'strong'
}

export function sanitizeFileContent(content) {
  if (!content || typeof content !== 'string') return ''
  return content
    .replace(NULL_BYTES, '')
    .replace(SCRIPT_TAG, '')
    .replace(EVENT_HANDLERS, '')
    .replace(JAVASCRIPT_URI, '')
    .replace(DATA_URI, '')
    .replace(PROTO_POLLUTION, '')
    .trim()
}
