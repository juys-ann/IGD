/**
 * PageStyleToolbar  — Task 3.3
 * Horizontal toolbar shown above the writing area.
 * Controls: Orientation · Rule Style · Page Color
 */
import { RectangleVertical, RectangleHorizontal } from 'lucide-react'

// ── Orientation ────────────────────────────────────────────────────────────
export const ORIENTATIONS = [
  { key: 'portrait',  label: 'Portrait',  Icon: RectangleVertical   },
  { key: 'landscape', label: 'Landscape', Icon: RectangleHorizontal },
]

// ── Rule styles with CSS pattern generators ────────────────────────────────
export const RULE_STYLES = [
  { key: 'blank',   label: 'Blank'    },
  { key: 'lines',   label: 'Lines'    },
  { key: 'dotgrid', label: 'Dot Grid' },
  { key: 'grid',    label: 'Grid'     },
]

export function getPagePattern(ruleStyle) {
  switch (ruleStyle) {
    case 'lines':
      return {
        backgroundImage:
          'repeating-linear-gradient(to bottom, transparent 0px, transparent 31px, #ddd6c8 31px, #ddd6c8 32px)',
        backgroundAttachment: 'local',
      }
    case 'dotgrid':
      return {
        backgroundImage:
          'radial-gradient(circle, #c4b8a8 1.3px, transparent 1.3px)',
        backgroundSize: '20px 20px',
        backgroundAttachment: 'local',
      }
    case 'grid':
      return {
        backgroundImage:
          'linear-gradient(to right, #ddd6c8 1px, transparent 1px), linear-gradient(to bottom, #ddd6c8 1px, transparent 1px)',
        backgroundSize: '20px 20px',
        backgroundAttachment: 'local',
      }
    default:
      return {}
  }
}

// ── Page colours ───────────────────────────────────────────────────────────
export const PAGE_COLORS = [
  { hex: '#ffffff', label: 'White'     },
  { hex: '#fdf8f2', label: 'Parchment' },
  { hex: '#fef9ec', label: 'Cream'     },
  { hex: '#f0f7f0', label: 'Mint'      },
  { hex: '#f0f4ff', label: 'Lavender'  },
  { hex: '#fff0f3', label: 'Rose'      },
  { hex: '#f5f0e8', label: 'Sand'      },
  { hex: '#e8f4f8', label: 'Sky'       },
]

// ── Component ──────────────────────────────────────────────────────────────
export default function PageStyleToolbar({ pageStyle, onChange }) {
  const { orientation, ruleStyle, pageColor } = pageStyle
  const set = (patch) => onChange({ ...pageStyle, ...patch })

  const btnBase = 'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all duration-150 whitespace-nowrap'
  const active  = { background: '#c27a2a', color: '#fff' }
  const inactive = { background: 'transparent', color: '#9a7550' }

  return (
    <div
      id="page-style-toolbar"
      className="flex items-center gap-3 px-4 py-2.5 rounded-xl border overflow-x-auto"
      style={{ background: '#faf5ee', borderColor: '#e8d5b7', scrollbarWidth: 'none' }}
      role="toolbar"
      aria-label="Page style options"
    >
      {/* ── Orientation ─────────────────────────────────── */}
      <span className="text-[10px] font-bold uppercase tracking-wider shrink-0" style={{ color: '#c4b09a' }}>Page</span>
      <div className="flex items-center gap-1">
        {ORIENTATIONS.map(({ key, label, Icon }) => (
          <button
            key={key}
            title={label}
            onClick={() => set({ orientation: key })}
            className={btnBase}
            style={orientation === key ? active : inactive}
            aria-pressed={orientation === key}
            id={`orientation-${key}`}
          >
            <Icon size={12} />
            {label}
          </button>
        ))}
      </div>

      {/* ── Divider ─────────────────────────────────────── */}
      <div className="w-px h-5 shrink-0" style={{ background: '#ddd6c8' }} />

      {/* ── Rule style ──────────────────────────────────── */}
      <span className="text-[10px] font-bold uppercase tracking-wider shrink-0" style={{ color: '#c4b09a' }}>Rule</span>
      <div className="flex items-center gap-1">
        {RULE_STYLES.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => set({ ruleStyle: key })}
            className={btnBase}
            style={ruleStyle === key ? active : inactive}
            aria-pressed={ruleStyle === key}
            id={`rule-${key}`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Divider ─────────────────────────────────────── */}
      <div className="w-px h-5 shrink-0" style={{ background: '#ddd6c8' }} />

      {/* ── Page colour ─────────────────────────────────── */}
      <span className="text-[10px] font-bold uppercase tracking-wider shrink-0" style={{ color: '#c4b09a' }}>Bg</span>
      <div className="flex items-center gap-1.5">
        {PAGE_COLORS.map(({ hex, label }) => (
          <button
            key={hex}
            title={label}
            onClick={() => set({ pageColor: hex })}
            className="w-5 h-5 rounded-full shrink-0 transition-transform hover:scale-110"
            style={{
              background:  hex,
              border:      pageColor === hex ? '2.5px solid #c27a2a' : '1.5px solid #ddd6c8',
              transform:   pageColor === hex ? 'scale(1.25)' : undefined,
            }}
            aria-label={label}
            aria-pressed={pageColor === hex}
            id={`pagecolor-${label.toLowerCase()}`}
          />
        ))}
      </div>
    </div>
  )
}