/**
 * src/services/foresight/foresight.js
 *
 * Sprint 8 — IGD-022 / IGD-023: Behavioral Foresight Engine
 *
 * All computation runs locally — no server, no external ML model.
 *
 * Exports:
 *   computeTrajectory(entries)   → trend data for the chart + projection
 *   scoreGoalProbability(...)    → 0-100 likelihood score for a goal
 *   retrieveResilienceMoments(entries) → breakthrough quotes from journals
 *   generateActivePrompt(entries, recentMood) → motivational nudge text
 */

import { classifyEmotions, EMOTION_COLORS } from '../nlp/emotionClassifier'

// ── Positive / growth themes ──────────────────────────────────────────────────
const POSITIVE_THEMES = new Set(['Joy', 'Resilience', 'Calm', 'Ambition'])
const STRUGGLE_THEMES = new Set(['Sadness', 'Anxiety', 'Anger'])

// ── Simple linear regression ─────────────────────────────────────────────────
// Returns { slope, intercept } for a series of (x, y) pairs.
function linearRegression(points) {
  const n = points.length
  if (n < 2) return { slope: 0, intercept: points[0]?.y ?? 0 }

  const sumX  = points.reduce((a, p) => a + p.x, 0)
  const sumY  = points.reduce((a, p) => a + p.y, 0)
  const sumXY = points.reduce((a, p) => a + p.x * p.y, 0)
  const sumX2 = points.reduce((a, p) => a + p.x * p.x, 0)

  const slope     = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX)
  const intercept = (sumY - slope * sumX) / n
  return { slope, intercept }
}

/**
 * computeTrajectory
 *
 * Analyses all journal entries to produce:
 *   - historical: [{ date, score, dominant }] — one point per entry
 *   - projection: [{ date, score }] — 30 days into the future
 *   - currentPath:  'rising' | 'falling' | 'stable'
 *   - optimizedPath: description of what would improve the trajectory
 *   - consistency: 0-1 (how regularly the user has been writing)
 */
export function computeTrajectory(entries) {
  if (!entries?.length) return null

  const chronological = [...entries]
    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))

  // Convert each entry to a sentiment score (0-1)
  // Positive themes add, struggle themes subtract, normalised
  const scored = chronological.map((entry, i) => {
    const emotions = entry.emotions?.length
      ? entry.emotions
      : classifyEmotions(entry.content ?? '').slice(0, 5)

    let score = 0.5 // neutral baseline
    for (const { theme, score: s } of emotions) {
      if (POSITIVE_THEMES.has(theme)) score += s * 0.3
      if (STRUGGLE_THEMES.has(theme)) score -= s * 0.2
    }
    score = Math.max(0.05, Math.min(0.95, score))

    const dominant = emotions[0]?.theme ?? null

    return {
      x:        i,
      date:     entry.timestamp,
      score:    +score.toFixed(3),
      dominant,
      entryId:  entry.id,
      title:    entry.title || 'Untitled',
    }
  })

  // Linear regression on sentiment scores
  const { slope, intercept } = linearRegression(scored)

  // Project 7 future points (each ~4 days apart)
  const lastX   = scored.length - 1
  const lastDate = new Date(scored[scored.length - 1]?.date ?? Date.now())

  const projection = Array.from({ length: 7 }, (_, i) => {
    const x     = lastX + i + 1
    const score = Math.max(0.05, Math.min(0.95, slope * x + intercept))
    const date  = new Date(lastDate.getTime() + (i + 1) * 4 * 24 * 60 * 60 * 1000)
    return { x, date: date.toISOString(), score: +score.toFixed(3) }
  })

  // Current path classification
  const recentSlope = (() => {
    if (scored.length < 3) return slope
    const recent = scored.slice(-5)
    return linearRegression(recent).slope
  })()

  const currentPath = recentSlope > 0.01 ? 'rising'
    : recentSlope < -0.01 ? 'falling'
    : 'stable'

  // Writing consistency: ratio of days with entries in last 30 days
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000
  const recentEntries = entries.filter((e) => new Date(e.timestamp) > thirtyDaysAgo)
  const uniqueDays    = new Set(
    recentEntries.map((e) => new Date(e.timestamp).toDateString())
  ).size
  const consistency   = +Math.min(uniqueDays / 20, 1).toFixed(2)  // 20 days = 100%

  // Optimised path: what would it look like with +0.03/entry improvement
  const optimized = projection.map((p, i) => ({
    ...p,
    score: Math.min(0.95, p.score + (i + 1) * 0.025),
  }))

  return {
    historical:    scored,
    projection,
    optimized,
    currentPath,
    slope:         +slope.toFixed(4),
    consistency,
    totalEntries:  entries.length,
  }
}

/**
 * scoreGoalProbability
 *
 * IGD-022 T4: estimates 0-100 likelihood of achieving a goal.
 *
 * Factors:
 *  - trajectory slope (trending positive?)
 *  - writing consistency (showing up regularly?)
 *  - resilience score (do they bounce back?)
 *  - ambition mentions in recent entries
 */
export function scoreGoalProbability(trajectory, goalKeyword = '') {
  if (!trajectory) return 0

  let score = 50 // neutral baseline

  // Slope factor: positive trend adds up to 20 pts
  score += Math.min(trajectory.slope * 200, 20)

  // Consistency factor: regular writing = more self-awareness
  score += trajectory.consistency * 20

  // Current path bonus/penalty
  if (trajectory.currentPath === 'rising')  score += 10
  if (trajectory.currentPath === 'falling') score -= 15

  return Math.max(5, Math.min(98, Math.round(score)))
}

/**
 * retrieveResilienceMoments
 *
 * IGD-023 T2: scans all entries for paragraphs containing resilience
 * and growth indicators. Returns the top 3 most encouraging quotes.
 */
export function retrieveResilienceMoments(entries) {
  if (!entries?.length) return []

  const RESILIENCE_WORDS = [
    'overcame', 'survived', 'made it', 'pushed through', 'kept going',
    'proud', 'stronger', 'learned', 'grew', 'healed', 'recovered',
    'managed', 'finally', 'breakthrough', 'realised', 'realized',
  ]

  const moments = []

  for (const entry of entries) {
    if (!entry.content) continue
    const sentences = entry.content
      .split(/[.!?\n]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 30 && s.length < 200)

    for (const sentence of sentences) {
      const lower = sentence.toLowerCase()
      const hits  = RESILIENCE_WORDS.filter((w) => lower.includes(w)).length
      if (hits >= 1) {
        moments.push({
          quote:     sentence.trim(),
          date:      entry.timestamp,
          title:     entry.title || 'Untitled',
          score:     hits,
          entryId:   entry.id,
        })
      }
    }
  }

  return moments
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
}

/**
 * generateActivePrompt
 *
 * IGD-023 T3: generates a motivational nudge in second person,
 * grounded in the user's own past resilience moments.
 * Runs fully locally — no LLM call.
 */
export function generateActivePrompt(entries, currentMood = null) {
  const moments = retrieveResilienceMoments(entries)

  const STRUGGLE_MOODS = new Set(['low', 'anxious'])
  const isStruggling   = STRUGGLE_MOODS.has(currentMood) ||
    (() => {
      const recent = entries.slice(0, 3)
      return recent.every((e) => {
        const top = e.emotions?.[0]?.theme
        return STRUGGLE_THEMES.has(top)
      })
    })()

  if (!isStruggling && !moments.length) return null

  // Build prompt grounded in their own words
  const anchor = moments[0]
    ? `You once wrote: "${moments[0].quote}" — that was you, on ${
        new Date(moments[0].date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
      }.`
    : 'You have already survived every difficult day you have faced so far.'

  const encouragements = [
    'That strength is still part of you.',
    'That version of you still lives in these pages.',
    'You carried yourself through it. You can do it again.',
    'Your past self left you this proof: you are resilient.',
  ]

  const closing = encouragements[Math.floor(Math.random() * encouragements.length)]

  return {
    triggered: isStruggling,
    text:      `${anchor} ${closing}`,
    source:    moments[0] ?? null,
  }
}
