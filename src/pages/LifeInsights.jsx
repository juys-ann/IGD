/**
 * LifeInsights.jsx — Sprint 7 (IGD-019 + IGD-020)
 *
 * The dedicated Life Insights page. Shows:
 *  1. Emotion Radar — full-size aggregated emotional profile
 *  2. Tonal Shift Timeline — emotion scores over time (bar chart per entry)
 *  3. Top Recurring Entities — people/topics mentioned most across journals
 *  4. Entry-level breakdown — dominant emotion per journal entry
 */
import { useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { TrendingUp, Users, BookOpen, AlertCircle, Activity } from 'lucide-react'
import EmotionRadar  from '../components/EmotionRadar'
import BrowsingGate  from '../components/BrowsingGate'
import { db } from '../db'
import {
  aggregateEmotions,
  classifyEmotions,
  getDominantEmotion,
  EMOTION_COLORS,
} from '../services/nlp/emotionClassifier'

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtDate(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

// ── Tonal Shift Timeline ──────────────────────────────────────────────────────
// Shows top-2 emotions per entry as stacked bars, oldest→newest left→right
function TonalTimeline({ entries }) {
  if (!entries?.length) return null

  // Use stored emotions if present, else classify on the fly
  const data = useMemo(() => {
    return [...entries].reverse().slice(0, 30).map((e) => {
      const emotions = e.emotions?.length
        ? e.emotions
        : classifyEmotions(e.content ?? '').slice(0, 2)
      return { title: e.title || 'Untitled', date: e.timestamp, emotions }
    })
  }, [entries])

  return (
    <div className="space-y-3">
      <div className="flex items-end gap-1.5 h-24 overflow-x-auto pb-1">
        {data.map((item, i) => {
          const total = item.emotions.slice(0, 2).reduce((a, e) => a + (e.score ?? 0), 0)
          return (
            <div key={i}
              className="flex flex-col-reverse shrink-0 rounded-sm overflow-hidden group relative"
              style={{ width: '22px', height: '100%' }}
              title={`${item.title}\n${item.emotions.map(e => `${e.theme}: ${Math.round((e.score ?? 0) * 100)}%`).join('\n')}`}
            >
              {item.emotions.slice(0, 2).map(({ theme, score }) => (
                <div key={theme}
                  style={{
                    height: `${total > 0 ? ((score ?? 0) / total) * 100 : 50}%`,
                    background: EMOTION_COLORS[theme] ?? '#d4b896',
                    opacity: 0.85,
                  }}
                />
              ))}
              {/* tooltip label */}
              <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 hidden group-hover:block z-10 whitespace-nowrap text-[10px] px-2 py-1 rounded shadow-lg"
                style={{ background: '#3b2a1a', color: '#fdf8f2' }}>
                {item.title?.slice(0, 24)}
              </div>
            </div>
          )
        })}
      </div>
      <p className="text-[11px]" style={{ color: '#b09070' }}>
        ← Oldest · Newest → · Hover any bar to see entry title
      </p>
    </div>
  )
}

// ── Top Recurring Entities ────────────────────────────────────────────────────
function EntityFrequency({ graphLinks }) {
  const counts = useMemo(() => {
    if (!graphLinks?.length) return []
    const map = {}
    for (const { entityName, type } of graphLinks) {
      const key = `${type}::${entityName}`
      map[key] = (map[key] ?? 0) + 1
    }
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([key, count]) => {
        const [type, ...parts] = key.split('::')
        return { name: parts.join('::'), type, count }
      })
  }, [graphLinks])

  if (!counts.length) return (
    <p className="text-xs py-4 text-center" style={{ color: '#b09070' }}>
      No entities detected yet. Write more journal entries.
    </p>
  )

  const maxCount = counts[0]?.count ?? 1

  return (
    <div className="space-y-2">
      {counts.map(({ name, type, count }) => (
        <div key={`${type}-${name}`} className="flex items-center gap-3">
          <span
            className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0 w-12 text-center"
            style={{
              background: type === 'person' ? '#6366f122' : '#f59e0b22',
              color:      type === 'person' ? '#6366f1'   : '#d97706',
            }}
          >
            {type === 'person' ? 'person' : 'topic'}
          </span>
          <span className="text-xs font-medium capitalize w-24 truncate" style={{ color: '#3b2a1a' }}>
            {name}
          </span>
          <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: '#e8d5b7' }}>
            <div className="h-full rounded-full" style={{
              width: `${(count / maxCount) * 100}%`,
              background: type === 'person' ? '#6366f1' : '#f59e0b',
            }} />
          </div>
          <span className="text-[11px] shrink-0 font-mono" style={{ color: '#9a7550' }}>
            ×{count}
          </span>
        </div>
      ))}
    </div>
  )
}

// ── Per-entry emotion breakdown ───────────────────────────────────────────────
function EntryBreakdown({ entries }) {
  if (!entries?.length) return null
  const recent = entries.slice(0, 8)

  return (
    <div className="divide-y" style={{ divideColor: '#e8d5b7' }}>
      {recent.map((entry) => {
        const dominant = entry.emotions?.length
          ? entry.emotions[0]
          : getDominantEmotion(entry.content ?? '')
        const color = dominant ? EMOTION_COLORS[dominant.theme] : '#b09070'

        return (
          <div key={entry.id} className="flex items-center gap-3 py-2.5">
            {/* Colour stripe */}
            <div className="w-1 h-8 rounded-full shrink-0" style={{ background: color }} />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate" style={{ color: '#3b2a1a' }}>
                {entry.title || 'Untitled Entry'}
              </p>
              <p className="text-[11px]" style={{ color: '#9a7550' }}>
                {fmtDate(entry.timestamp)}
              </p>
            </div>
            {dominant ? (
              <span className="text-[11px] font-medium shrink-0 px-2 py-0.5 rounded-full"
                style={{ background: `${color}22`, color }}>
                {dominant.theme} · {Math.round((dominant.score ?? 0) * 100)}%
              </span>
            ) : (
              <span className="text-[11px]" style={{ color: '#b09070' }}>—</span>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function LifeInsights() {
  const entries    = useLiveQuery(() => db.journals.orderBy('timestamp').reverse().toArray(), [])
  const graphLinks = useLiveQuery(() => db.graphLinks.toArray(), [])

  const emotionScores = useMemo(() => {
    if (!entries?.length) return {}
    return aggregateEmotions(entries)
  }, [entries])

  const hasData = entries && entries.length > 0

  // Tonal shift detection: find the two biggest score changes between consecutive entries
  const tonalShifts = useMemo(() => {
    if (!entries || entries.length < 3) return []
    const chronological = [...entries].reverse()
    const shifts = []

    for (let i = 1; i < chronological.length; i++) {
      const prev = chronological[i - 1]
      const curr = chronological[i]
      const prevTop = (prev.emotions ?? classifyEmotions(prev.content ?? ''))[0]
      const currTop = (curr.emotions ?? classifyEmotions(curr.content ?? ''))[0]

      if (prevTop && currTop && prevTop.theme !== currTop.theme) {
        shifts.push({
          from:     prevTop.theme,
          to:       currTop.theme,
          fromDate: prev.timestamp,
          toDate:   curr.timestamp,
          title:    curr.title || 'Untitled',
        })
      }
    }

    // Return the 3 most recent shifts
    return shifts.slice(-3).reverse()
  }, [entries])

  if (!hasData) {
    return (
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-semibold mb-6"
          style={{ color: '#3b2a1a', fontFamily: '"Playfair Display", Georgia, serif' }}>
          Life Insights
        </h1>
        <div className="rounded-2xl border p-12 flex flex-col items-center gap-4 text-center"
          style={{ background: '#fdf8f2', borderColor: '#d4b896' }}>
          <AlertCircle size={32} style={{ color: '#d4b896' }} />
          <p className="text-sm font-medium" style={{ color: '#9a7550' }}>
            No journal entries yet
          </p>
          <p className="text-xs max-w-xs leading-relaxed" style={{ color: '#b09070' }}>
            Start writing in your journal and your emotional landscape,
            patterns, and insights will appear here automatically.
          </p>
        </div>
      </div>
    )
  }

  return (
    <BrowsingGate
      feature="Life Insights"
      description="Your emotional landscape mapped over time — patterns, tonal shifts, and recurring themes from your journals."
      icon={Activity}
    >
    <div className="max-w-4xl mx-auto space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold"
          style={{ color: '#3b2a1a', fontFamily: '"Playfair Display", Georgia, serif' }}>
          Life Insights
        </h1>
        <p className="text-sm mt-1" style={{ color: '#9a7550' }}>
          Your emotional landscape, mapped from {entries.length} journal {entries.length === 1 ? 'entry' : 'entries'}.
        </p>
      </div>

      {/* Top row: Radar + Tonal Shifts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Emotion Radar */}
        <div className="rounded-2xl border p-5 flex flex-col gap-4"
          style={{ background: '#fdf8f2', borderColor: '#d4b896' }}>
          <div className="flex items-center gap-2">
            <TrendingUp size={15} style={{ color: '#c27a2a' }} />
            <h2 className="text-sm font-semibold" style={{ color: '#7a4f2a' }}>
              Emotional Landscape
            </h2>
          </div>
          <EmotionRadar scores={emotionScores} />
        </div>

        {/* Tonal shifts + entity frequency */}
        <div className="space-y-4">

          {/* Tonal shifts panel */}
          {tonalShifts.length > 0 && (
            <div className="rounded-2xl border p-5"
              style={{ background: '#fdf8f2', borderColor: '#d4b896' }}>
              <h2 className="text-sm font-semibold mb-3" style={{ color: '#7a4f2a' }}>
                Recent Tonal Shifts
              </h2>
              <div className="space-y-2">
                {tonalShifts.map((shift, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <span className="font-medium px-2 py-0.5 rounded-full"
                      style={{ background: `${EMOTION_COLORS[shift.from]}22`, color: EMOTION_COLORS[shift.from] }}>
                      {shift.from}
                    </span>
                    <span style={{ color: '#b09070' }}>→</span>
                    <span className="font-medium px-2 py-0.5 rounded-full"
                      style={{ background: `${EMOTION_COLORS[shift.to]}22`, color: EMOTION_COLORS[shift.to] }}>
                      {shift.to}
                    </span>
                    <span className="truncate ml-1" style={{ color: '#9a7550' }}>
                      in "{shift.title?.slice(0, 24)}"
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recurring entities */}
          <div className="rounded-2xl border p-5"
            style={{ background: '#fdf8f2', borderColor: '#d4b896' }}>
            <div className="flex items-center gap-2 mb-3">
              <Users size={14} style={{ color: '#c27a2a' }} />
              <h2 className="text-sm font-semibold" style={{ color: '#7a4f2a' }}>
                Recurring People & Topics
              </h2>
            </div>
            <EntityFrequency graphLinks={graphLinks ?? []} />
          </div>
        </div>
      </div>

      {/* Tonal Timeline */}
      <div className="rounded-2xl border p-5"
        style={{ background: '#fdf8f2', borderColor: '#d4b896' }}>
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp size={14} style={{ color: '#c27a2a' }} />
          <h2 className="text-sm font-semibold" style={{ color: '#7a4f2a' }}>
            Emotional Timeline
          </h2>
          <span className="text-[11px]" style={{ color: '#b09070' }}>
            — last {Math.min(entries.length, 30)} entries
          </span>
        </div>
        <TonalTimeline entries={entries} />
      </div>

      {/* Per-entry breakdown */}
      <div className="rounded-2xl border p-5"
        style={{ background: '#fdf8f2', borderColor: '#d4b896' }}>
        <div className="flex items-center gap-2 mb-3">
          <BookOpen size={14} style={{ color: '#c27a2a' }} />
          <h2 className="text-sm font-semibold" style={{ color: '#7a4f2a' }}>
            Recent Entry Emotions
          </h2>
        </div>
        <EntryBreakdown entries={entries} />
      </div>
    </div>
    </BrowsingGate>
  )
}
