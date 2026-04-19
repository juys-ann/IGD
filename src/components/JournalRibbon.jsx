/**
 * JournalRibbon — Tasks 3.2-3.5
 * Word-like ribbon: tab strip (always visible) + collapsible panel
 * Tabs: Cover | Page | Writing | Insert
 */
import { useRef } from 'react'
import { Save, CheckCheck, Loader2, PenLine, Bold, Italic, Upload, Check } from 'lucide-react'

// ── Shared constants ───────────────────────────────────────────────────────
const COVER_COLORS = [
  { hex: '#c27a2a', label: 'Amber'     }, { hex: '#d4895e', label: 'Terracotta'},
  { hex: '#a85f3e', label: 'Sienna'    }, { hex: '#b5763c', label: 'Caramel'   },
  { hex: '#8b4513', label: 'Saddlewood'}, { hex: '#d2691e', label: 'Cinnamon'  },
  { hex: '#c9956c', label: 'Peach'     }, { hex: '#7a5c3a', label: 'Walnut'    },
  { hex: '#e8c99a', label: 'Parchment' }, { hex: '#5c7a4a', label: 'Sage'      },
  { hex: '#4a6b8a', label: 'Ink Blue'  }, { hex: '#6b5b8a', label: 'Plum'      },
]
const PAGE_COLORS = [
  { hex: '#ffffff', label: 'White'     }, { hex: '#fdf8f2', label: 'Parchment' },
  { hex: '#fef9ec', label: 'Cream'     }, { hex: '#f0f7f0', label: 'Mint'      },
  { hex: '#f0f4ff', label: 'Lavender'  }, { hex: '#fff0f3', label: 'Rose'      },
  { hex: '#f5f0e8', label: 'Sand'      }, { hex: '#e8f4f8', label: 'Sky'       },
]
const RULE_STYLES = [
  { key: 'blank',   label: 'Blank'    },
  { key: 'lines',   label: 'Lines'    },
  { key: 'dotgrid', label: 'Dot Grid' },
  { key: 'grid',    label: 'Grid'     },
]
const FONTS = [
  { id: 'serif',   short: 'Serif',    family: 'Georgia, serif'              },
  { id: 'caveat',  short: 'Caveat',   family: '"Caveat", cursive'            },
  { id: 'dancing', short: 'Dancing',  family: '"Dancing Script", cursive'    },
  { id: 'kalam',   short: 'Kalam',    family: '"Kalam", cursive'             },
  { id: 'satisfy', short: 'Satisfy',  family: '"Satisfy", cursive'           },
]
const INK_COLORS = [
  { hex: '#3b2a1a', label: 'Espresso' }, { hex: '#c27a2a', label: 'Amber'    },
  { hex: '#8b2635', label: 'Crimson'  }, { hex: '#1a3b4f', label: 'Navy'     },
  { hex: '#1a3b2a', label: 'Forest'   }, { hex: '#2a4f3b', label: 'Emerald'  },
  { hex: '#2a1a3b', label: 'Midnight' }, { hex: '#4a4a6a', label: 'Slate'    },
  { hex: '#6a2a4a', label: 'Plum'     }, { hex: '#2a4a4a', label: 'Teal'     },
  { hex: '#7a4f2a', label: 'Caramel'  }, { hex: '#4f3b1a', label: 'Walnut'   },
]
const STICKY_COLORS = ['#fef08a','#fda4af','#93c5fd','#86efac','#fdba74','#c4b5fd']
const STICKERS = ['⭐','💡','❤️','🌸','🌟','🎉','💫','🌈','🎨','🏆','💎','🌙','☀️','🦋','🌺','💕','✨','🎵','📌','🔖','🌿','🕊️','🧡','🍃']

// ── Sub-components ─────────────────────────────────────────────────────────
function Dot({ hex, label, active, onClick, size = 24 }) {
  return (
    <button title={label} onClick={onClick} aria-label={label} aria-pressed={active}
      className="rounded-full shrink-0 transition-transform hover:scale-110 focus:outline-none flex items-center justify-center"
      style={{ width: size, height: size, background: hex, boxShadow: active ? `0 0 0 2px #fff,0 0 0 4px ${hex}` : '0 0 0 1.5px #ddd6c8', transform: active ? 'scale(1.2)' : undefined }}>
      {active && <Check size={size * 0.45} color="#fff" strokeWidth={3} />}
    </button>
  )
}

function Pill({ active, onClick, children, style = {} }) {
  return (
    <button onClick={onClick}
      className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap"
      style={{ background: active ? '#c27a2a' : 'rgba(0,0,0,0.05)', color: active ? '#fff' : '#7a5c3a', ...style }}>
      {children}
    </button>
  )
}

// ── Cover panel ────────────────────────────────────────────────────────────
function CoverPanel({ coverColor, coverImage, onCoverChange, onOpenModal }) {
  return (
    <div className="flex items-center gap-6 flex-wrap">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[10px] font-bold uppercase tracking-wider shrink-0" style={{ color: '#b09070' }}>Colour</span>
        {COVER_COLORS.map(({ hex, label }) => (
          <Dot key={hex} hex={hex} label={label} size={28}
            active={coverColor === hex && !coverImage}
            onClick={() => onCoverChange({ coverColor: hex, coverImage: null })} />
        ))}
      </div>
      <div className="flex items-center gap-2">
        <button onClick={onOpenModal}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors"
          style={{ borderColor: '#d4b896', color: '#7a5c3a', background: coverImage ? '#fef3e2' : 'transparent' }}>
          <Upload size={12} /> {coverImage ? '✓ Custom image' : 'Upload image'}
        </button>
        {(coverColor || coverImage) && (
          <button onClick={() => onCoverChange({ coverColor: null, coverImage: null })}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
            style={{ background: '#fee2e2', color: '#b91c1c' }}>
            Remove cover
          </button>
        )}
      </div>
    </div>
  )
}

// ── Page panel ─────────────────────────────────────────────────────────────
function PagePanel({ pageStyle, onChange }) {
  const { orientation, ruleStyle, pageColor } = pageStyle
  const set = (p) => onChange({ ...pageStyle, ...p })
  return (
    <div className="flex items-center gap-5 flex-wrap">
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] font-bold uppercase tracking-wider mr-1" style={{ color: '#b09070' }}>Orientation</span>
        <Pill active={orientation === 'portrait'}  onClick={() => set({ orientation: 'portrait'  })}>◻ Portrait</Pill>
        <Pill active={orientation === 'landscape'} onClick={() => set({ orientation: 'landscape' })}>▭ Landscape</Pill>
      </div>
      <div className="w-px h-6 shrink-0" style={{ background: '#e8d5b7' }} />
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] font-bold uppercase tracking-wider mr-1" style={{ color: '#b09070' }}>Rule</span>
        {RULE_STYLES.map(({ key, label }) => (
          <Pill key={key} active={ruleStyle === key} onClick={() => set({ ruleStyle: key })}>{label}</Pill>
        ))}
      </div>
      <div className="w-px h-6 shrink-0" style={{ background: '#e8d5b7' }} />
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[10px] font-bold uppercase tracking-wider shrink-0" style={{ color: '#b09070' }}>Background</span>
        {PAGE_COLORS.map(({ hex, label }) => (
          <Dot key={hex} hex={hex} label={label} size={26}
            active={pageColor === hex} onClick={() => set({ pageColor: hex })} />
        ))}
      </div>
    </div>
  )
}

// ── Writing panel ──────────────────────────────────────────────────────────
function WritingPanel({ writingStyle, onChange }) {
  const { inkColor, fontSize, fontFamily, bold, italic } = writingStyle
  const set = (p) => onChange({ ...writingStyle, ...p })
  return (
    <div className="flex items-center gap-5 flex-wrap">
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-[10px] font-bold uppercase tracking-wider mr-1" style={{ color: '#b09070' }}>Font</span>
        {FONTS.map(({ id, short, family }) => (
          <Pill key={id} active={fontFamily === id} onClick={() => set({ fontFamily: id })}
            style={{ fontFamily: family, fontSize: '12px' }}>{short}</Pill>
        ))}
      </div>
      <div className="w-px h-6 shrink-0" style={{ background: '#e8d5b7' }} />
      <div className="flex items-center gap-1">
        <span className="text-[10px] font-bold uppercase tracking-wider mr-1" style={{ color: '#b09070' }}>Size</span>
        {['S','M','L'].map(k => <Pill key={k} active={fontSize === k} onClick={() => set({ fontSize: k })}>{k}</Pill>)}
      </div>
      <div className="flex items-center gap-1">
        <button onClick={() => set({ bold: !bold })} aria-pressed={bold}
          className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors font-bold"
          style={{ background: bold ? '#c27a2a' : 'transparent', color: bold ? '#fff' : '#7a5c3a' }}>
          <Bold size={14} />
        </button>
        <button onClick={() => set({ italic: !italic })} aria-pressed={italic}
          className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
          style={{ background: italic ? '#c27a2a' : 'transparent', color: italic ? '#fff' : '#7a5c3a' }}>
          <Italic size={14} />
        </button>
      </div>
      <div className="w-px h-6 shrink-0" style={{ background: '#e8d5b7' }} />
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-[10px] font-bold uppercase tracking-wider shrink-0" style={{ color: '#b09070' }}>Ink</span>
        {INK_COLORS.map(({ hex, label }) => (
          <Dot key={hex} hex={hex} label={label} size={22}
            active={inkColor === hex} onClick={() => set({ inkColor: hex })} />
        ))}
      </div>
    </div>
  )
}

// ── Insert panel (Task 3.5) ────────────────────────────────────────────────
function InsertPanel({ onInsert }) {
  const photoRef = useRef(null)
  const handlePhotoFile = (e) => {
    const file = e.target.files?.[0]
    if (!file || !file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = (ev) => onInsert('photo', { src: ev.target.result })
    reader.readAsDataURL(file)
    e.target.value = ''
  }
  return (
    <div className="flex items-center gap-5 flex-wrap">
      {/* Photo */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-bold uppercase tracking-wider shrink-0" style={{ color: '#b09070' }}>Photo</span>
        <input ref={photoRef} type="file" accept="image/*" className="sr-only" onChange={handlePhotoFile} />
        <button onClick={() => photoRef.current?.click()}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors"
          style={{ borderColor: '#d4b896', color: '#7a5c3a' }}>
          📷 Add Photo
        </button>
      </div>
      <div className="w-px h-6 shrink-0" style={{ background: '#e8d5b7' }} />
      {/* Sticky */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-bold uppercase tracking-wider shrink-0" style={{ color: '#b09070' }}>Sticky</span>
        {STICKY_COLORS.map((color) => (
          <button key={color} title="Add sticky note" onClick={() => onInsert('sticky', { color })}
            className="w-6 h-6 rounded-sm transition-transform hover:scale-110 border border-black/10"
            style={{ background: color }} />
        ))}
      </div>
      <div className="w-px h-6 shrink-0" style={{ background: '#e8d5b7' }} />
      {/* Stickers */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-[10px] font-bold uppercase tracking-wider shrink-0" style={{ color: '#b09070' }}>Stickers</span>
        {STICKERS.map((emoji) => (
          <button key={emoji} onClick={() => onInsert('sticker', { emoji })}
            className="text-xl leading-none hover:scale-125 transition-transform" title={`Add ${emoji}`}>
            {emoji}
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Main ribbon ────────────────────────────────────────────────────────────
const TABS = [
  { key: 'cover',   label: '📔 Cover'   },
  { key: 'page',    label: '🎨 Page'    },
  { key: 'writing', label: '✍️ Writing'  },
  { key: 'insert',  label: '📎 Insert'  },
]

export default function JournalRibbon({
  activeTab, onTabChange,
  coverColor, coverImage, onCoverChange, onOpenCoverModal,
  pageStyle, onPageStyleChange,
  writingStyle, onWritingStyleChange,
  onInsert,
  saveStatus, statusText, StatusIcon, statusCls,
  wordCount, currentId, content, isEditingExisting,
  onManualSave, onNewEntry,
}) {
  const handleTabClick = (key) => onTabChange(activeTab === key ? null : key)
  const SAVE_ICONS = { saving: true, pending: true }

  return (
    <div style={{ background: '#fefcf8', borderBottom: '1px solid #e8d5b7', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
      {/* ── Tab strip ─────────────────────────────────────────────── */}
      <div className="flex items-center" style={{ borderBottom: activeTab ? '1px solid #e8d5b7' : 'none', minHeight: '44px', paddingLeft: '8px', paddingRight: '12px' }}>
        {/* Tabs */}
        <div className="flex items-stretch flex-1">
          {TABS.map(({ key, label }) => (
            <button key={key} onClick={() => handleTabClick(key)}
              className="px-4 py-2 text-xs font-semibold relative transition-colors"
              id={`ribbon-tab-${key}`}
              aria-selected={activeTab === key}
              style={{ color: activeTab === key ? '#c27a2a' : '#7a5c3a', background: activeTab === key ? '#fdf4e3' : 'transparent' }}>
              {label}
              {activeTab === key && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5" style={{ background: '#c27a2a' }} />
              )}
            </button>
          ))}
        </div>

        {/* Right side: status + save controls */}
        <div className="flex items-center gap-3 ml-4">
          <span className={`flex items-center gap-1 text-xs font-medium transition-opacity ${saveStatus === 'idle' ? 'opacity-0' : 'opacity-100'} ${statusCls}`}>
            {StatusIcon && <StatusIcon size={11} className={SAVE_ICONS[saveStatus] ? 'animate-spin' : ''} />}
            {statusText}
          </span>
          {wordCount > 0 && <span className="text-[11px]" style={{ color: '#b09070' }}>{wordCount}w</span>}
          {currentId && !isEditingExisting && (
            <button onClick={onNewEntry}
              className="flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-lg transition-colors"
              style={{ color: '#7a5c3a', background: '#f0e8d8' }}>
              <PenLine size={11} /> New
            </button>
          )}
          <button onClick={onManualSave} disabled={saveStatus === 'saving' || !content?.trim()}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all disabled:opacity-40"
            style={{ background: '#3b2a1a', color: '#fdf8f2' }}>
            <Save size={11} /> Save
          </button>
        </div>
      </div>

      {/* ── Panel ─────────────────────────────────────────────────── */}
      {activeTab && (
        <div className="px-5 py-3 overflow-x-auto" style={{ background: '#fffdf9', scrollbarWidth: 'none' }}>
          {activeTab === 'cover'   && <CoverPanel   coverColor={coverColor} coverImage={coverImage} onCoverChange={onCoverChange} onOpenModal={onOpenCoverModal} />}
          {activeTab === 'page'    && <PagePanel    pageStyle={pageStyle}     onChange={onPageStyleChange} />}
          {activeTab === 'writing' && <WritingPanel writingStyle={writingStyle} onChange={onWritingStyleChange} />}
          {activeTab === 'insert'  && <InsertPanel  onInsert={onInsert} />}
        </div>
      )}
    </div>
  )
}