/**
 * ThenVsNow.jsx — Sprint 4 (IGD-011)
 *
 * Displays two semantically similar journal entries side-by-side so the
 * user can see how their perspective on the same topic has evolved over time.
 *
 * Data: takes `current` (the newest entry) and `past` (the most similar
 * older entry found via semantic search), plus the time gap between them.
 */
import { Clock, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { EMOTION_COLORS } from '../services/nlp/emotionClassifier'

function timeDiff(isoA, isoB) {
  const msA  = new Date(isoA).getTime()
  const msB  = new Date(isoB).getTime()
  const days = Math.abs(Math.round((msA - msB) / (1000 * 60 * 60 * 24)))
  if (days < 7)   return `${days} day${days !== 1 ? 's' : ''} apart`
  if (days < 30)  return `${Math.round(days / 7)} week${Math.round(days / 7) !== 1 ? 's' : ''} apart`
  if (days < 365) return `${Math.round(days / 30)} month${Math.round(days / 30) !== 1 ? 's' : ''} apart`
  const yrs = (days / 365).toFixed(1)
  return `${yrs} year${yrs !== '1.0' ? 's' : ''} apart`
}

function fmtDate(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function EmotionChips({ emotions = [] }) {
  if (!emotions.length) return null
  return (
    <div className="flex flex-wrap gap-1 mt-2">
      {emotions.slice(0, 3).map(({ theme, score }) => (
        <span key={theme} className="text-[10px] font-medium px-2 py-0.5 rounded-full"
          style={{ background: `${EMOTION_COLORS[theme]}25`, color: EMOTION_COLORS[theme] }}>
          {theme}
        </span>
      ))}
    </div>
  )
}

function GrowthIndicator({ current, past }) {
  // Compare dominant emotion scores to infer growth direction
  const cTop = current?.emotions?.[0]?.theme
  const pTop = past?.emotions?.[0]?.theme

  const positiveThemes = new Set(['Joy', 'Resilience', 'Calm', 'Ambition'])
  const cPositive = positiveThemes.has(cTop)
  const pPositive = positiveThemes.has(pTop)

  if (cPositive && !pPositive) return (
    <span className="flex items-center gap-1 text-[11px] font-medium"
      style={{ color: '#10b981' }}>
      <TrendingUp size={12} /> Growth detected
    </span>
  )
  if (!cPositive && pPositive) return (
    <span className="flex items-center gap-1 text-[11px] font-medium"
      style={{ color: '#ef4444' }}>
      <TrendingDown size={12} /> Shift in tone
    </span>
  )
  return (
    <span className="flex items-center gap-1 text-[11px]" style={{ color: '#9a7550' }}>
      <Minus size={12} /> Similar tone
    </span>
  )
}

export default function ThenVsNow({ current, past }) {
  if (!current || !past) return null

  const gap = timeDiff(current.timestamp, past.timestamp)
  const sameDay = new Date(current.timestamp).toDateString() === new Date(past.timestamp).toDateString()
  if (sameDay) return null  // don't show if entries are from the same day

  return (
    <div className="rounded-2xl overflow-hidden border"
      style={{ borderColor: '#d4b896', background: '#fdf8f2' }}>

      {/* Header */}
      <div className="px-5 py-3 flex items-center justify-between border-b"
        style={{ borderColor: '#e8d5b7', background: '#f4ecd8' }}>
        <div className="flex items-center gap-2">
          <Clock size={14} style={{ color: '#c27a2a' }} />
          <span className="text-xs font-semibold" style={{ color: '#7a4f2a', fontFamily: '"Playfair Display", Georgia, serif' }}>
            Then vs Now — {gap}
          </span>
        </div>
        <GrowthIndicator current={current} past={past} />
      </div>

      {/* Split view */}
      <div className="grid grid-cols-2 divide-x" style={{ divideColor: '#e8d5b7' }}>

        {/* PAST */}
        <div className="px-4 py-4 space-y-2">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#b09070' }}>Then</span>
            <span className="text-[10px]" style={{ color: '#b09070' }}>· {fmtDate(past.timestamp)}</span>
          </div>
          <p className="text-xs font-semibold truncate" style={{ color: '#3b2a1a', fontFamily: '"Playfair Display", Georgia, serif' }}>
            {past.title || 'Untitled'}
          </p>
          <p className="text-[11px] leading-relaxed line-clamp-4" style={{ color: '#7a5c3a' }}>
            {(past.content ?? '').slice(0, 220)}
            {(past.content ?? '').length > 220 ? '…' : ''}
          </p>
          <EmotionChips emotions={past.emotions ?? []} />
        </div>

        {/* CURRENT */}
        <div className="px-4 py-4 space-y-2" style={{ background: 'rgba(194,122,42,0.04)' }}>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#c27a2a' }}>Now</span>
            <span className="text-[10px]" style={{ color: '#b09070' }}>· {fmtDate(current.timestamp)}</span>
          </div>
          <p className="text-xs font-semibold truncate" style={{ color: '#3b2a1a', fontFamily: '"Playfair Display", Georgia, serif' }}>
            {current.title || 'Untitled'}
          </p>
          <p className="text-[11px] leading-relaxed line-clamp-4" style={{ color: '#7a5c3a' }}>
            {(current.content ?? '').slice(0, 220)}
            {(current.content ?? '').length > 220 ? '…' : ''}
          </p>
          <EmotionChips emotions={current.emotions ?? []} />
        </div>
      </div>
    </div>
  )
}
