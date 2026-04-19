/**
 * src/services/nlp/emotionClassifier.js
 *
 * Sprint 3 — IGD-007: Emotional Theme Classification
 *
 * Classifies journal text into emotional themes using a local keyword
 * lexicon. No external API call — runs entirely in the browser.
 *
 * Returns an array of { theme, score, keywords } sorted by score.
 * Scores are normalised 0-1 so they can feed the Pattern Radar chart.
 */

// ── Emotion lexicon ───────────────────────────────────────────────────────────
// Each theme maps to an array of indicator words/phrases.
// Weighted: words appearing in the list more than once have implicit higher weight.
const LEXICON = {
  Joy: [
    'happy','happiness','joy','joyful','excited','exciting','love','loved','grateful',
    'gratitude','wonderful','amazing','great','fantastic','thrilled','elated','proud',
    'delight','delighted','celebrate','blessed','content','peaceful','hopeful','smile',
    'laugh','laughter','fun','enjoy','enjoyed','pleasure',
  ],
  Sadness: [
    'sad','sadness','crying','cry','cried','tears','grief','grieving','heartbroken',
    'lonely','loneliness','depressed','depression','hopeless','lost','missing','miss',
    'loss','empty','numb','hurt','pain','sorrow','sorrowful','devastated','broken',
    'unhappy','regret','regretful','disappointed','disappointment',
  ],
  Anxiety: [
    'anxious','anxiety','worried','worry','nervous','stressed','stress','overwhelmed',
    'panic','fear','scared','afraid','dread','uncertain','unsure','doubt','doubtful',
    'uneasy','restless','tense','tension','pressure','burden','overthinking',
    'overthink','insecure','insecurity',
  ],
  Anger: [
    'angry','anger','furious','frustrated','frustration','annoyed','annoying','rage',
    'mad','upset','irritated','irritation','resentful','resentment','betrayed',
    'betrayal','unfair','injustice','hate','hatred','disgusted','disgusting',
  ],
  Resilience: [
    'strong','strength','resilient','resilience','overcome','overcoming','survived',
    'survive','push','pushed','kept going','moving forward','progress','grow','growth',
    'learn','learned','lesson','better','improve','improved','healing','healed',
    'recovery','recovered','persevere','perseverance','determination','determined',
    'courage','courageous','brave','bravery','rise','arose','bounce back',
  ],
  Ambition: [
    'goal','goals','dream','dreams','plan','plans','future','aspire','aspiration',
    'career','success','successful','achieve','achievement','work hard','hustle',
    'opportunity','challenge','challenges','motivated','motivation','passion',
    'purpose','vision','build','create','created','start','started','launch',
  ],
  Calm: [
    'calm','peaceful','peace','serene','serenity','quiet','stillness','meditate',
    'meditation','relax','relaxed','relaxation','breathe','breathing','mindful',
    'mindfulness','balanced','balance','gentle','soft','easy','slow','present',
    'acceptance','accept','accepted','rest','rested',
  ],
  Nostalgia: [
    'remember','remembered','memory','memories','miss','missed','back then','used to',
    'childhood','young','younger','years ago','past','old times','throwback',
    'nostalgia','nostalgic','reminisce','remind','reminded','earlier','long ago',
    'once','when i was','those days','time flies',
  ],
}

export const EMOTION_COLORS = {
  Joy:        '#f59e0b',  // amber
  Sadness:    '#6366f1',  // indigo
  Anxiety:    '#ef4444',  // red
  Anger:      '#dc2626',  // dark red
  Resilience: '#10b981',  // teal
  Ambition:   '#8b5cf6',  // purple
  Calm:       '#06b6d4',  // cyan
  Nostalgia:  '#d97706',  // warm amber
}

/**
 * Classify the emotional themes present in a text.
 *
 * @param {string} text
 * @returns {{ theme: string, score: number, matchedKeywords: string[] }[]}
 *   Sorted by score descending. Only themes with score > 0 are returned.
 */
export function classifyEmotions(text) {
  if (!text?.trim()) return []

  const lower = text.toLowerCase()
  const results = []

  for (const [theme, keywords] of Object.entries(LEXICON)) {
    const matched = []
    let hits = 0

    for (const kw of keywords) {
      const regex = new RegExp(`\\b${kw.replace(/\s+/g, '\\s+')}\\b`, 'gi')
      const occurrences = (lower.match(regex) ?? []).length
      if (occurrences > 0) {
        matched.push(kw)
        hits += occurrences
      }
    }

    if (hits > 0) {
      // Normalise: score is proportion of matching unique keywords, capped at 1
      const score = Math.min(matched.length / 8, 1)
      results.push({ theme, score: +score.toFixed(3), matchedKeywords: [...new Set(matched)] })
    }
  }

  return results.sort((a, b) => b.score - a.score)
}

/**
 * Get the single dominant emotion from a text.
 * Returns null if no emotions detected.
 */
export function getDominantEmotion(text) {
  const results = classifyEmotions(text)
  return results[0] ?? null
}

/**
 * Summarise emotions for a collection of entries (for dashboard charts).
 * Returns { [theme]: averageScore } across all entries.
 */
export function aggregateEmotions(entries) {
  const totals = {}
  const counts = {}

  for (const entry of entries) {
    const results = classifyEmotions(entry.content ?? '')
    for (const { theme, score } of results) {
      totals[theme] = (totals[theme] ?? 0) + score
      counts[theme] = (counts[theme] ?? 0) + 1
    }
  }

  const averages = {}
  for (const theme of Object.keys(totals)) {
    averages[theme] = +(totals[theme] / counts[theme]).toFixed(3)
  }
  return averages
}
