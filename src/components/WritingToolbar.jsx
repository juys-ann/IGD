/**
 * WritingToolbar  — Task 3.4
 * Vertical sidebar toolbar shown beside the textarea.
 * Controls: Font family · Text size (S/M/L) · Bold/Italic · Ink colour (12)
 */
import { Bold, Italic, Type } from 'lucide-react'

// ── Ink colours (12 warm tones) ────────────────────────────────────────────
export const INK_COLORS = [
  { hex: '#3b2a1a', label: 'Espresso' },
  { hex: '#1a3b2a', label: 'Forest'   },
  { hex: '#c27a2a', label: 'Amber'    },
  { hex: '#2a1a3b', label: 'Midnight' },
  { hex: '#8b2635', label: 'Crimson'  },
  { hex: '#1a3b4f', label: 'Navy'     },
  { hex: '#4f3b1a', label: 'Walnut'   },
  { hex: '#2a4f3b', label: 'Emerald'  },
  { hex: '#7a4f2a', label: 'Caramel'  },
  { hex: '#4a4a6a', label: 'Slate'    },
  { hex: '#6a2a4a', label: 'Plum'     },
  { hex: '#2a4a4a', label: 'Teal'     },
]

// ── Font families ──────────────────────────────────────────────────────────
export const FONTS = [
  { id: 'serif',   label: 'Serif',   short: 'Serif',  family: 'Georgia, "Times New Roman", serif'  },
  { id: 'caveat',  label: 'Caveat',  short: 'Cave',   family: '"Caveat", cursive'                   },
  { id: 'dancing', label: 'Dancing', short: 'Dance',  family: '"Dancing Script", cursive'           },
  { id: 'kalam',   label: 'Kalam',   short: 'Kalam',  family: '"Kalam", cursive'                    },
  { id: 'satisfy', label: 'Satisfy', short: 'Satis',  family: '"Satisfy", cursive'                  },
]

export const FONT_MAP  = Object.fromEntries(FONTS.map((f) => [f.id, f.family]))

// ── Text sizes ─────────────────────────────────────────────────────────────
export const TEXT_SIZES = [
  { key: 'S', px: '13px', lh: '1.9' },
  { key: 'M', px: '15px', lh: '2.0' },
  { key: 'L', px: '18px', lh: '2.1' },
]
export const SIZE_MAP = Object.fromEntries(TEXT_SIZES.map((s) => [s.key, { fontSize: s.px, lineHeight: s.lh }]))

// ── Default writing style ──────────────────────────────────────────────────
export const DEFAULT_WRITING_STYLE = {
  inkColor:   '#3b2a1a',
  fontSize:   'M',
  fontFamily: 'serif',
  bold:       false,
  italic:     false,
}

// ── Helper: derive textarea CSS from writingStyle ──────────────────────────
export function getTextareaStyle(writingStyle) {
  const { inkColor, fontSize, fontFamily, bold, italic } = writingStyle
  return {
    color:      inkColor,
    fontFamily: FONT_MAP[fontFamily] ?? FONT_MAP.serif,
    fontSize:   SIZE_MAP[fontSize]?.fontSize ?? '15px',
    lineHeight: SIZE_MAP[fontSize]?.lh       ?? '2.0',
    fontWeight: bold   ? '700'    : '400',
    fontStyle:  italic ? 'italic' : 'normal',
  }
}

// ── Component ──────────────────────────────────────────────────────────────
export default function WritingToolbar({ writingStyle, onChange }) {
  const { inkColor, fontSize, fontFamily, bold, italic } = writingStyle
  const set = (patch) => onChange({ ...writingStyle, ...patch })

  const pill = (active) => ({
    background: active ? '#c27a2a' : 'transparent',
    color:      active ? '#fff'    : '#9a7550',
  })

  return (
    <div
      id="writing-toolbar"
      className="flex flex-col items-center gap-3 py-4 px-2 border-r shrink-0"
      style={{ borderColor: '#ede8df', background: '#faf7f3', minWidth: '56px' }}
      role="toolbar"
      aria-label="Writing tools"
    >
      {/* ── Font family ─────────────────────────────── */}
      <label className="text-[9px] font-bold uppercase tracking-wider" style={{ color: '#c4b09a' }}>
        <Type size={10} className="mx-auto mb-0.5" />
        Font
      </label>
      <div className="flex flex-col items-stretch gap-0.5 w-full">
        {FONTS.map(({ id, short, family }) => (
          <button
            key={id}
            title={id}
            onClick={() => set({ fontFamily: id })}
            className="text-center px-1 py-0.5 rounded-md text-[11px] font-medium transition-colors"
            style={{ fontFamily: family, ...pill(fontFamily === id) }}
            aria-pressed={fontFamily === id}
            id={`font-${id}`}
          >
            {short}
          </button>
        ))}
      </div>

      <div className="w-7 h-px" style={{ background: '#e8d5b7' }} />

      {/* ── Text size ───────────────────────────────── */}
      <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: '#c4b09a' }}>Size</span>
      <div className="flex flex-col items-center gap-1">
        {TEXT_SIZES.map(({ key }) => (
          <button
            key={key}
            onClick={() => set({ fontSize: key })}
            className="w-8 h-7 rounded-lg text-[12px] font-bold transition-colors"
            style={pill(fontSize === key)}
            aria-pressed={fontSize === key}
            id={`size-${key}`}
          >
            {key}
          </button>
        ))}
      </div>

      <div className="w-7 h-px" style={{ background: '#e8d5b7' }} />

      {/* ── Bold / Italic ────────────────────────────── */}
      <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: '#c4b09a' }}>Style</span>
      <div className="flex flex-col items-center gap-1">
        <button
          onClick={() => set({ bold: !bold })}
          className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
          style={pill(bold)}
          title="Bold" aria-pressed={bold} id="writing-bold"
        >
          <Bold size={14} />
        </button>
        <button
          onClick={() => set({ italic: !italic })}
          className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
          style={pill(italic)}
          title="Italic" aria-pressed={italic} id="writing-italic"
        >
          <Italic size={14} />
        </button>
      </div>

      <div className="w-7 h-px" style={{ background: '#e8d5b7' }} />

      {/* ── Ink colours ─────────────────────────────── */}
      <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: '#c4b09a' }}>Ink</span>
      <div className="grid grid-cols-2 gap-1.5">
        {INK_COLORS.map(({ hex, label }) => (
          <button
            key={hex}
            title={label}
            onClick={() => set({ inkColor: hex })}
            className="w-5 h-5 rounded-full transition-transform hover:scale-110 focus:outline-none"
            style={{
              background: hex,
              boxShadow:  inkColor === hex
                ? `0 0 0 2px #fff, 0 0 0 3.5px ${hex}`
                : '0 0 0 1px rgba(0,0,0,0.08)',
            }}
            aria-label={label}
            aria-pressed={inkColor === hex}
            id={`ink-${label.toLowerCase()}`}
          />
        ))}
      </div>
    </div>
  )
}