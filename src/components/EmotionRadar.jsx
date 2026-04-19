/**
 * EmotionRadar.jsx — Sprint 7 (IGD-019)
 *
 * Renders a multi-axis radar chart of the user's emotional profile
 * aggregated across all journal entries. Uses inline SVG — no chart
 * library needed, keeping the bundle small and offline-capable.
 *
 * Data flows: journal entries → aggregateEmotions() → radar polygon.
 */
import { useMemo } from 'react'
import { EMOTION_COLORS } from '../services/nlp/emotionClassifier'

const THEMES = ['Joy','Sadness','Anxiety','Anger','Resilience','Ambition','Calm','Nostalgia']
const SIZE   = 220   // SVG canvas size
const CX     = SIZE / 2
const CY     = SIZE / 2
const R      = 85    // max radius of the radar

/** Convert polar (angle, radius) to cartesian (x, y) */
function polar(angleDeg, r) {
  const rad = ((angleDeg - 90) * Math.PI) / 180
  return { x: CX + r * Math.cos(rad), y: CY + r * Math.sin(rad) }
}

/** Build a polygon points string from scores (0-1 per axis) */
function buildPolygon(scores) {
  const n = THEMES.length
  return THEMES.map((theme, i) => {
    const angle = (360 / n) * i
    const r     = (scores[theme] ?? 0) * R
    const { x, y } = polar(angle, r)
    return `${x},${y}`
  }).join(' ')
}

/** Build evenly-spaced concentric ring polygons for the grid */
function buildGrid(steps = 4) {
  return Array.from({ length: steps }, (_, s) => {
    const r = R * ((s + 1) / steps)
    return THEMES.map((_, i) => {
      const { x, y } = polar((360 / THEMES.length) * i, r)
      return `${x},${y}`
    }).join(' ')
  })
}

export default function EmotionRadar({ scores = {}, compact = false }) {
  const hasData = Object.keys(scores).length > 0 && Object.values(scores).some((v) => v > 0)
  const svgSize = compact ? 160 : SIZE
  const scale   = compact ? 160 / SIZE : 1

  const gridRings = useMemo(() => buildGrid(4), [])
  const dataPoints = useMemo(() => buildPolygon(scores), [scores])

  // Axis lines from center to each corner
  const axes = THEMES.map((_, i) => {
    const { x, y } = polar((360 / THEMES.length) * i, R)
    return { x, y }
  })

  if (!hasData) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-8"
        style={{ color: '#b09070' }}>
        <svg width={compact ? 80 : 110} height={compact ? 80 : 110} viewBox={`0 0 ${SIZE} ${SIZE}`}>
          {gridRings.map((pts, i) => (
            <polygon key={i} points={pts} fill="none"
              stroke="#e8d5b7" strokeWidth="1" />
          ))}
        </svg>
        <p className="text-xs text-center" style={{ color: '#b09070' }}>
          Write more journal entries to see your emotional landscape.
        </p>
      </div>
    )
  }

  return (
    <div className={`flex ${compact ? 'flex-row items-center gap-4' : 'flex-col items-center gap-4'}`}>
      <svg
        width={svgSize} height={svgSize}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        style={{ overflow: 'visible' }}
      >
        {/* Grid rings */}
        {gridRings.map((pts, i) => (
          <polygon key={i} points={pts} fill="none"
            stroke="#e8d5b7" strokeWidth={i === 3 ? '1.5' : '1'} />
        ))}

        {/* Axis lines */}
        {axes.map(({ x, y }, i) => (
          <line key={i} x1={CX} y1={CY} x2={x} y2={y}
            stroke="#d4b896" strokeWidth="1" />
        ))}

        {/* Data polygon — filled with amber warmth */}
        {hasData && (
          <polygon
            points={dataPoints}
            fill="rgba(194,122,42,0.18)"
            stroke="#c27a2a"
            strokeWidth="2"
            strokeLinejoin="round"
          />
        )}

        {/* Axis labels */}
        {THEMES.map((theme, i) => {
          const angle  = (360 / THEMES.length) * i
          const { x, y } = polar(angle, R + (compact ? 16 : 20))
          const score  = scores[theme] ?? 0
          const color  = score > 0.3 ? EMOTION_COLORS[theme] : '#b09070'
          return (
            <text key={theme} x={x} y={y}
              textAnchor="middle" dominantBaseline="middle"
              fontSize={compact ? 9 : 10}
              fontWeight={score > 0.3 ? '600' : '400'}
              fill={color}
            >
              {theme}
            </text>
          )
        })}

        {/* Score dots on data polygon */}
        {hasData && THEMES.map((theme, i) => {
          const angle = (360 / THEMES.length) * i
          const r     = (scores[theme] ?? 0) * R
          if (r < 2) return null
          const { x, y } = polar(angle, r)
          return (
            <circle key={theme} cx={x} cy={y} r={compact ? 3 : 4}
              fill={EMOTION_COLORS[theme]} stroke="#fdf8f2" strokeWidth="1.5">
              <title>{theme}: {Math.round((scores[theme] ?? 0) * 100)}%</title>
            </circle>
          )
        })}
      </svg>

      {/* Legend — only on full-size */}
      {!compact && (
        <div className="flex flex-wrap justify-center gap-x-4 gap-y-1.5 max-w-xs">
          {THEMES.filter((t) => (scores[t] ?? 0) > 0).map((theme) => (
            <span key={theme} className="flex items-center gap-1.5 text-[11px]"
              style={{ color: '#7a5c3a' }}>
              <span className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ background: EMOTION_COLORS[theme] }} />
              {theme} — {Math.round((scores[theme] ?? 0) * 100)}%
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
