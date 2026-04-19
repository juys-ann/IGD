/**
 * src/services/context/contextWindow.js
 *
 * Sprint 6 — IGD-016 / IGD-017: Long-Context Window Management
 *
 * LaMini-Flan-T5-248M has a ~512 token context limit.
 * This service keeps the prompt within budget across long sessions by:
 *
 *   1. SLIDING WINDOW (IGD-016 T1)
 *      Always keeps the last N turns verbatim for immediate coherence.
 *
 *   2. IMPORTANCE SCORING (IGD-016 T2)
 *      Older turns are scored by how many named entities / emotional
 *      keywords they contain. High-scoring old turns are preserved even
 *      when the window shrinks.
 *
 *   3. AUTO-SUMMARISATION (IGD-017 T1/T2/T3)
 *      When history exceeds the token budget, the oldest turns beyond
 *      the sliding window are compressed into a short "session recap"
 *      bullet list. The summary is injected once at the top of the
 *      prompt so The Echo retains long-term coherence.
 *
 *   4. CONTEXT BUFFER (IGD-016 T4)
 *      The last 10 turns are always kept in full regardless of scores.
 *
 * All logic runs synchronously in the main thread — no worker needed,
 * because this is string manipulation, not ML inference.
 */

// ── Token budget ──────────────────────────────────────────────────────────────
// LaMini-Flan-T5-248M: 512 tokens input limit.
// We reserve ~120 tokens for the journal context block + question,
// leaving ~390 tokens for conversation history.
const MAX_HISTORY_TOKENS = 390
const SLIDING_WINDOW     = 10   // last N turns always kept verbatim (IGD-016 T4)
const SUMMARY_THRESHOLD  = 0.80 // trigger summarisation at 80% capacity (IGD-017 T1)

// ── Rough token estimator (≈ 4 chars per token for English) ──────────────────
export function estimateTokens(text) {
  if (!text) return 0
  return Math.ceil(text.length / 4)
}

// ── Importance scorer (IGD-016 T2) ───────────────────────────────────────────
// A turn scores higher if it contains named entities (capitalised words)
// or emotional keywords. These are the turns worth keeping when compressing.
const EMOTIONAL_KEYWORDS = new Set([
  'feel','felt','feeling','emotion','love','fear','hope','grief','joy','sad',
  'happy','angry','anxious','proud','regret','grateful','lost','strong','hurt',
])

function scoreTurn(text) {
  if (!text) return 0
  let score = 0
  // Named entities (capitalised words, 3+ chars, not sentence-start)
  const entities = (text.match(/(?<!\. )\b[A-Z][a-z]{2,}\b/g) ?? [])
  score += Math.min(entities.length, 4) * 2

  // Emotional keywords
  const lower = text.toLowerCase()
  for (const kw of EMOTIONAL_KEYWORDS) {
    if (lower.includes(kw)) score += 1
  }

  // Length bonus — longer turns are usually more substantive
  score += Math.min(estimateTokens(text) / 20, 3)

  return score
}

// ── Local summariser (IGD-017 T3) ─────────────────────────────────────────────
// Condenses a list of turns into a short bullet-point recap.
// Runs entirely locally — no LLM call needed for summarisation.
function localSummarise(turns) {
  if (!turns.length) return ''

  // Extract the key sentence from each turn (first sentence or first 60 chars)
  const bullets = turns.map(({ role, text }) => {
    const snippet = text.split(/[.!?]/)[0]?.trim().slice(0, 80) ?? text.slice(0, 80)
    const speaker = role === 'user' ? 'You asked' : 'Echo said'
    return `• ${speaker}: "${snippet}"`
  })

  return `[Earlier in this conversation]\n${bullets.join('\n')}`
}

// ── Main export: build a managed prompt from the full message history ─────────

/**
 * buildManagedPrompt
 *
 * @param {string}   message       — the user's current question
 * @param {Array}    allMessages   — full chat history: [{ role, text }]
 * @param {Array}    ragContext     — journal entries retrieved for this turn
 * @param {object}   opts
 * @param {boolean}  opts.verbose  — include debug stats in returned meta
 *
 * @returns {{ prompt: string, meta: object }}
 *   meta: { totalTurns, keptVerbatim, summarised, estimatedTokens, triggered }
 */
export function buildManagedPrompt(message, allMessages, ragContext = [], opts = {}) {
  // Filter out thinking bubbles before any processing
  const history = allMessages.filter((m) => m.text && !m.thinking)

  const fmtDate = (iso) =>
    iso ? new Date(iso).toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric',
    }) : 'some time ago'

  // Build the RAG memory block
  const memoryBlock = ragContext.length
    ? ragContext
        .map((e) => `On ${fmtDate(e.timestamp)}: ${(e.content ?? '').slice(0, 250).trim()}`)
        .join('\n')
    : '(no matching memories found)'

  // ── Sliding window: always keep the last SLIDING_WINDOW turns ────────────
  const recentTurns = history.slice(-SLIDING_WINDOW)
  const olderTurns  = history.slice(0, Math.max(0, history.length - SLIDING_WINDOW))

  // ── Check if we need to summarise ────────────────────────────────────────
  const recentTokens = recentTurns.reduce((a, m) => a + estimateTokens(m.text), 0)
  const budgetUsed   = recentTokens / MAX_HISTORY_TOKENS
  const needsSummary = budgetUsed > SUMMARY_THRESHOLD && olderTurns.length > 0

  let summaryBlock   = ''
  let keptOlder      = []

  if (needsSummary) {
    // Score older turns, keep top-scored ones verbatim, summarise the rest
    const scored = olderTurns
      .map((turn) => ({ turn, score: scoreTurn(turn.text) }))
      .sort((a, b) => b.score - a.score)

    // Budget remaining after recent turns
    let remaining = MAX_HISTORY_TOKENS - recentTokens

    for (const { turn } of scored) {
      const t = estimateTokens(turn.text)
      if (remaining - t > 20) {
        keptOlder.push(turn)
        remaining -= t
      }
    }

    // Everything not kept verbatim gets summarised
    const toSummarise = olderTurns.filter((t) => !keptOlder.includes(t))
    if (toSummarise.length > 0) {
      summaryBlock = localSummarise(toSummarise)
    }
  } else if (olderTurns.length > 0) {
    // Within budget — keep older turns verbatim up to the limit
    let remaining = MAX_HISTORY_TOKENS - recentTokens
    for (const turn of [...olderTurns].reverse()) {
      const t = estimateTokens(turn.text)
      if (remaining - t > 0) { keptOlder.unshift(turn); remaining -= t }
      else break
    }
  }

  // ── Assemble history block ────────────────────────────────────────────────
  const verbatimTurns = [...keptOlder, ...recentTurns]
  const historyBlock  = verbatimTurns
    .map((m) => `${m.role === 'user' ? 'You' : 'Echo'}: ${m.text}`)
    .join('\n')

  // ── Assemble final prompt ─────────────────────────────────────────────────
  const parts = [
    'Past journal entries:',
    memoryBlock,
    '',
  ]

  if (summaryBlock) {
    parts.push(summaryBlock, '')
  }

  if (historyBlock) {
    parts.push('Recent conversation:', historyBlock, '')
  }

  parts.push(`Question: ${message}`, `My honest reflection as my past self:`)

  const prompt = parts.join('\n')

  const meta = {
    totalTurns:      history.length,
    keptVerbatim:    verbatimTurns.length,
    summarised:      olderTurns.length - keptOlder.length,
    estimatedTokens: estimateTokens(prompt),
    triggered:       needsSummary,
    budgetUsed:      +budgetUsed.toFixed(2),
  }

  return { prompt, meta }
}

/**
 * getContextStats — lightweight stats for the UI indicator
 * @param {Array} messages  — full message array including thinking bubbles
 * @returns {{ turnCount, budgetUsed, isSummarising }}
 */
export function getContextStats(messages) {
  const history = messages.filter((m) => m.text && !m.thinking)
  const tokens  = history.reduce((a, m) => a + estimateTokens(m.text), 0)
  const used    = Math.min(tokens / MAX_HISTORY_TOKENS, 1)
  return {
    turnCount:     history.length,
    budgetUsed:    +used.toFixed(2),
    isSummarising: used > SUMMARY_THRESHOLD,
  }
}
