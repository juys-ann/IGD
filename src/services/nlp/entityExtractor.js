/**
 * entityExtractor.js
 * Local NLP service — no external API, runs entirely in the browser.
 *
 * Extracts two kinds of entities from raw journal text:
 *   • person  — capitalised words (naïve NER heuristic)
 *   • topic   — keyword match against a curated list
 *
 * Returns an array of { entityName: string, type: 'person' | 'topic' }
 * de-duplicated per (entityName, type) pair.
 */

const TOPIC_KEYWORDS = [
  'family', 'work', 'travel', 'health', 'school',
  'project', 'vacation', 'friend', 'relationship',
  'money', 'career', 'anxiety', 'grief', 'joy',
]

// Common English words that are capitalised at sentence start but aren't names
const STOPWORDS = new Set([
  'I', 'The', 'This', 'That', 'It', 'He', 'She', 'We', 'They',
  'You', 'My', 'His', 'Her', 'Our', 'Their', 'But', 'And', 'Or',
  'So', 'If', 'In', 'On', 'At', 'To', 'Of', 'For', 'A', 'An',
  'Was', 'Were', 'Is', 'Are', 'Has', 'Have', 'Had', 'Did', 'Do',
  'Just', 'Still', 'Then', 'When', 'Where', 'What', 'How', 'Why',
])

export function extractEntities(text) {
  if (!text?.trim()) return []

  const found = []

  // ── Person extraction (capitalised words, 3+ chars, not stopwords) ─────────
  const personMatches = Array.from(text.matchAll(/\b([A-Z][a-z]{2,})\b/g))
  for (const [, name] of personMatches) {
    if (!STOPWORDS.has(name) && !found.some((e) => e.entityName === name && e.type === 'person')) {
      found.push({ entityName: name, type: 'person' })
    }
  }

  // ── Topic extraction (keyword list, case-insensitive) ──────────────────────
  for (const topic of TOPIC_KEYWORDS) {
    if (new RegExp(`\\b${topic}\\b`, 'i').test(text)) {
      if (!found.some((e) => e.entityName === topic && e.type === 'topic')) {
        found.push({ entityName: topic, type: 'topic' })
      }
    }
  }

  return found
}
