import mammoth from 'mammoth'

// ── Supported types ───────────────────────────────────────────────────────────
export const ACCEPTED_TYPES = new Set(['txt', 'docx'])
export const ACCEPTED_MIME  = '.txt,.docx'

export function getExtension(filename) {
  return filename.split('.').pop().toLowerCase()
}

export function isSupported(file) {
  return ACCEPTED_TYPES.has(getExtension(file.name))
}

// ── Text extraction ───────────────────────────────────────────────────────────

async function parseTxt(file) {
  return file.text()
}

/** mammoth runs entirely in the browser — no server call */
async function parseDocx(file) {
  const arrayBuffer = await file.arrayBuffer()
  const result = await mammoth.extractRawText({ arrayBuffer })
  return result.value
}

export async function extractText(file) {
  const ext = getExtension(file.name)
  if (ext === 'txt')  return parseTxt(file)
  if (ext === 'docx') return parseDocx(file)
  throw new Error(`Unsupported file type: .${ext}`)
}

// ── Date regex patterns (most-specific first) ─────────────────────────────────
// Each pattern's first capture group must be parseable by new Date().
const DATE_PATTERNS = [
  // ISO / underscore:  2023-08-14  |  2023_08_14
  /\b(\d{4}[-_]\d{2}[-_]\d{2})\b/,
  // DMY slash or dash: 14/08/2023  |  14-08-2023
  /\b(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})\b/,
  // Compact YYYYMMDD (capture groups 1-3 reassembled below): 20230814
  /\b(20\d{2})(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\b/,
  // Long month name:  August 14, 2023
  /\b((?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4})\b/i,
  // Short month name: Aug 14, 2023
  /\b((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2},?\s+\d{4})\b/i,
]

function extractDate(source) {
  for (const pattern of DATE_PATTERNS) {
    const match = source.match(pattern)
    if (match) {
      // Compact YYYYMMDD produces three groups — reassemble before parsing
      const raw = (match[1] && match[2] && match[3])
        ? `${match[1]}-${match[2]}-${match[3]}`
        : match[1]
      const d = new Date(raw)
      if (!isNaN(d.getTime())) return d
    }
  }
  return null
}

function titleFromFilename(filename) {
  return filename
    .replace(/\.[^.]+$/, '')
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim()
}

/**
 * Extract title + timestamp from a file + its raw text.
 * Strategy: filename date → content date → now.
 * Title: first short non-empty line, or filename.
 */
export function extractMetadata(file, rawText) {
  const firstLines = rawText
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, 3)
    .join(' ')

  let dateObj = extractDate(file.name) ?? extractDate(firstLines)

  const firstLine = rawText.split('\n').map((l) => l.trim()).find(Boolean) ?? ''
  const title = (firstLine.length > 0 && firstLine.length <= 80)
    ? firstLine
    : titleFromFilename(file.name)

  return {
    title,
    timestamp:    dateObj ? dateObj.toISOString() : new Date().toISOString(),
    detectedDate: !!dateObj,
  }
}

// ── Utilities ─────────────────────────────────────────────────────────────────
export function countWords(text) {
  return text.trim() ? text.trim().split(/\s+/).length : 0
}
