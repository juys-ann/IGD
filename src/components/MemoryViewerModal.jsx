import { useState, useEffect, useRef } from 'react'
import {
  X, Pencil, Save, CheckCheck, Loader2,
  Calendar, Smile, Meh, Frown, Zap, Moon,
  BookOpen,
} from 'lucide-react'
import { updateEntry } from '../db'
import { getTextareaStyle, DEFAULT_WRITING_STYLE } from './WritingToolbar'
import { getPagePattern } from './PageStyleToolbar'

const DEFAULT_PAGE_STYLE = { orientation: 'portrait', ruleStyle: 'blank', pageColor: '#ffffff' }

// ── Mood display ──────────────────────────────────────────────────────────────
const MOOD_MAP = {
  joyful:    { Icon: Smile,  color: 'text-amber-600',  label: 'Joyful'    },
  calm:      { Icon: Moon,   color: 'text-teal-600',   label: 'Calm'      },
  energised: { Icon: Zap,    color: 'text-indigo-600', label: 'Energised' },
  neutral:   { Icon: Meh,    color: 'text-stone-500',  label: 'Neutral'   },
  low:       { Icon: Frown,  color: 'text-rose-600',   label: 'Low'       },
}

const MOOD_KEYS = Object.keys(MOOD_MAP)

function formatFullDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })
}

const SAVE_STATUS = {
  idle:   { text: '',          Icon: null,       cls: '' },
  saving: { text: 'Saving…',  Icon: Loader2,    cls: 'text-amber-700 animate-pulse' },
  saved:  { text: 'Saved',    Icon: CheckCheck, cls: 'text-teal-700' },
  error:  { text: 'Error',    Icon: null,       cls: 'text-rose-600' },
}

/**
 * MemoryViewerModal
 *
 * Props:
 *   entry    object | null   — the journal entry to display; null = closed
 *   onClose  fn              — dismiss callback
 *   onSaved  fn(updatedEntry)— called after a successful in-modal edit save
 */
export default function MemoryViewerModal({ entry, onClose, onSaved }) {
  const [isEditing,   setIsEditing]   = useState(false)
  const [editTitle,   setEditTitle]   = useState('')
  const [editContent, setEditContent] = useState('')
  const [editMood,    setEditMood]    = useState(null)
  const [saveStatus,  setSaveStatus]  = useState('idle')
  const textareaRef = useRef(null)
  const closeBtnRef = useRef(null)

  // Sync local edit state when entry changes
  useEffect(() => {
    if (entry) {
      setEditTitle(entry.title ?? '')
      setEditContent(entry.content ?? '')
      setEditMood(entry.mood ?? null)
      setIsEditing(false)
      setSaveStatus('idle')
    }
  }, [entry])

  // Auto-focus textarea when edit mode opens
  useEffect(() => {
    if (isEditing) textareaRef.current?.focus()
  }, [isEditing])

  // Close on Escape
  useEffect(() => {
    if (!entry) return
    const handler = (e) => { if (e.key === 'Escape') handleClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [entry, isEditing])

  if (!entry) return null

  const handleClose = () => {
    // Warn if unsaved edits exist
    if (
      isEditing &&
      (editContent !== entry.content || editTitle !== entry.title || editMood !== entry.mood)
    ) {
      if (!window.confirm('You have unsaved changes. Discard them?')) return
    }
    setIsEditing(false)
    onClose()
  }

  const handleSave = async () => {
    setSaveStatus('saving')
    try {
      await updateEntry(entry.id, {
        title:    editTitle   || 'Untitled Entry',
        content:  editContent,
        mood:     editMood,
        // Preserve all design fields including draggable assets
        elements: entry.elements ?? [],
      })
      setSaveStatus('saved')
      onSaved?.({
        ...entry,
        title: editTitle, content: editContent, mood: editMood,
        elements: entry.elements ?? [],
      })
      setTimeout(() => {
        setSaveStatus('idle')
        setIsEditing(false)
      }, 1200)
    } catch (err) {
      console.error(err)
      setSaveStatus('error')
    }
  }

  const { text: statusText, Icon: StatusIcon, cls: statusCls } = SAVE_STATUS[saveStatus]
  const wordCount = editContent.trim() ? editContent.trim().split(/\s+/).length : 0

  const displayMood = isEditing ? editMood : entry.mood
  const moodMeta    = displayMood ? MOOD_MAP[displayMood] : null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-stone-900/50 backdrop-blur-sm z-40"
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Modal panel — parchment aesthetic */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={entry.title}
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50
                   w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl shadow-2xl
                   overflow-hidden"
        style={{
          animation: 'modalIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
          // Use the entry's actual page color so the modal matches the journal
          backgroundColor: entry.pageStyle?.pageColor ?? '#f4ecd8',
          border: '1px solid #d4b896',
        }}
      >
        {/* ── Cover image banner (if entry has one) ─────────────────────── */}
        {entry.coverImage && (
          <div
            className="w-full shrink-0"
            style={{
              height: '72px',
              backgroundImage:    `url(${entry.coverImage})`,
              backgroundSize:     'cover',
              backgroundPosition: 'center',
            }}
          />
        )}
        {!entry.coverImage && entry.coverColor && (
          <div className="w-full shrink-0" style={{ height: '5px', background: entry.coverColor }} />
        )}

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div
          className="flex items-start justify-between px-7 py-5 shrink-0"
          style={{ borderBottom: '1px solid #d4b896' }}
        >
          <div className="flex items-start gap-3 min-w-0">
            <BookOpen
              size={18}
              className="mt-0.5 shrink-0"
              style={{ color: '#8b6343' }}
            />
            <div className="min-w-0">
              {isEditing ? (
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="text-base font-semibold w-full bg-transparent outline-none
                             border-b pb-0.5"
                  style={{
                    color: '#3b2a1a',
                    fontFamily: '"Playfair Display", Georgia, serif',
                    borderColor: '#c4a882',
                  }}
                  placeholder="Entry title…"
                />
              ) : (
                <h2
                  className="text-base font-semibold leading-tight"
                  style={{ color: '#3b2a1a', fontFamily: '"Playfair Display", Georgia, serif' }}
                >
                  {entry.title || 'Untitled Entry'}
                </h2>
              )}

              {/* Date + mood row */}
              <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                <span className="flex items-center gap-1 text-xs" style={{ color: '#9a7550' }}>
                  <Calendar size={11} />
                  {formatFullDate(entry.timestamp)}
                </span>
                {moodMeta && (
                  <span className={`flex items-center gap-1 text-xs font-medium ${moodMeta.color}`}>
                    <moodMeta.Icon size={11} />
                    {moodMeta.label}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2 shrink-0 ml-4">
            {/* Save status */}
            {saveStatus !== 'idle' && (
              <span className={`flex items-center gap-1 text-xs font-medium ${statusCls}`}>
                {StatusIcon && <StatusIcon size={12} className={saveStatus === 'saving' ? 'animate-spin' : ''} />}
                {statusText}
              </span>
            )}

            {/* Edit / Save toggle */}
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg
                           transition-colors"
                style={{ background: '#e8d5b7', color: '#7a5230', border: '1px solid #c4a882' }}
              >
                <Pencil size={12} /> Edit
              </button>
            ) : (
              <button
                onClick={handleSave}
                disabled={saveStatus === 'saving'}
                className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg
                           transition-colors disabled:opacity-50"
                style={{ background: '#5c7c5c', color: '#fff', border: '1px solid #4a6a4a' }}
              >
                <Save size={12} />
                {saveStatus === 'saving' ? 'Saving…' : 'Save changes'}
              </button>
            )}

            {/* Close */}
            <button
              ref={closeBtnRef}
              onClick={handleClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
              style={{ color: '#9a7550' }}
              aria-label="Close"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* ── Mood selector (edit mode only) ─────────────────────────────── */}
        {isEditing && (
          <div
            className="flex items-center gap-2 px-7 py-2.5 shrink-0"
            style={{ borderBottom: '1px solid #d4b896', background: 'rgba(0,0,0,0.03)' }}
          >
            <span className="text-xs mr-1" style={{ color: '#9a7550' }}>Mood</span>
            {MOOD_KEYS.map((key) => {
              const { Icon, color, label } = MOOD_MAP[key]
              const active = editMood === key
              return (
                <button
                  key={key}
                  onClick={() => setEditMood(active ? null : key)}
                  title={label}
                  className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
                  style={active
                    ? { background: '#e8d5b7', outline: '2px solid #c4a882' }
                    : {}
                  }
                >
                  <Icon size={15} className={active ? color : 'text-stone-400'} />
                </button>
              )
            })}
            {editMood && (
              <span className="text-xs capitalize ml-1" style={{ color: '#9a7550' }}>
                {MOOD_MAP[editMood]?.label}
              </span>
            )}
          </div>
        )}

        {/* ── Body — applies entry's writingStyle + pageStyle pattern ──── */}
        {(() => {
          const wStyle = entry.writingStyle
            ? { ...DEFAULT_WRITING_STYLE, ...entry.writingStyle }
            : DEFAULT_WRITING_STYLE
          const pStyle = entry.pageStyle
            ? { ...DEFAULT_PAGE_STYLE, ...entry.pageStyle }
            : DEFAULT_PAGE_STYLE
          const textStyle    = getTextareaStyle(wStyle)
          const patternStyle = getPagePattern(pStyle.ruleStyle)
          const assets       = entry.elements ?? []

          return (
            <div
              className="flex-1 overflow-y-auto px-7 py-6"
              style={{ position: 'relative', ...patternStyle }}
            >
              {/* ── Read-only draggable assets (photos, stickies, stickers) */}
              {assets.map((el) => {
                const base = {
                  position: 'absolute',
                  left: el.x ?? 0,
                  top:  el.y ?? 0,
                  zIndex: 10,
                  pointerEvents: 'none',
                  userSelect: 'none',
                }

                if (el.type === 'photo') return (
                  <div key={el.id} style={{ ...base, width: el.width ?? 200 }}>
                    <img
                      src={el.src}
                      alt="attached"
                      draggable={false}
                      style={{
                        width: '100%', display: 'block',
                        borderRadius: 6,
                        boxShadow: '0 4px 16px rgba(0,0,0,0.22)',
                      }}
                    />
                  </div>
                )

                if (el.type === 'sticky') return (
                  <div key={el.id} style={{
                    ...base,
                    width: 180, minHeight: 150,
                    background: el.color,
                    boxShadow: '3px 5px 16px rgba(0,0,0,0.18)',
                    borderRadius: '2px 2px 2px 24px',
                    padding: '8px',
                    overflow: 'hidden',
                  }}>
                    <p style={{
                      fontFamily: '"Caveat", cursive', fontSize: 15,
                      color: '#3b2a1a', lineHeight: 1.5,
                      whiteSpace: 'pre-wrap', margin: 0,
                    }}>
                      {el.text || ''}
                    </p>
                  </div>
                )

                if (el.type === 'sticker') return (
                  <div key={el.id} style={{ ...base, lineHeight: 1 }}>
                    <span style={{ fontSize: el.size ?? 38, display: 'block' }}>{el.emoji}</span>
                  </div>
                )

                return null
              })}

              {isEditing ? (
                <textarea
                  ref={textareaRef}
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full h-full min-h-64 bg-transparent outline-none resize-none"
                  style={{ ...textStyle, minHeight: '256px', position: 'relative', zIndex: 1 }}
                  placeholder="Write your memory…"
                />
              ) : (
                <div className="space-y-2" style={{ position: 'relative', zIndex: 1 }}>
                  {entry.content
                    ? entry.content
                        .split('\n')
                        .filter(Boolean)
                        .map((para, i) => (
                          <p key={i} style={{ ...textStyle, margin: 0 }}>
                            {para}
                          </p>
                        ))
                    : (
                      <p style={{ fontSize: '13px', color: '#b09070', fontStyle: 'italic' }}>
                        No content in this entry.
                      </p>
                    )
                  }
                </div>
              )}
            </div>
          )
        })()}

        {/* ── Footer ─────────────────────────────────────────────────────── */}
        <div
          className="flex items-center justify-between px-7 py-3 shrink-0 text-xs"
          style={{ borderTop: '1px solid #d4b896', color: '#b09070' }}
        >
          <span>{wordCount.toLocaleString()} words</span>
          {isEditing && (
            <button
              onClick={() => {
                setEditTitle(entry.title ?? '')
                setEditContent(entry.content ?? '')
                setEditMood(entry.mood ?? null)
                setIsEditing(false)
              }}
              className="hover:underline"
              style={{ color: '#9a7550' }}
            >
              Discard changes
            </button>
          )}
        </div>
      </div>

      <style>{`
        @keyframes modalIn {
          from { opacity: 0; transform: translate(-50%, calc(-50% + 16px)); }
          to   { opacity: 1; transform: translate(-50%, -50%); }
        }
      `}</style>
    </>
  )
}
