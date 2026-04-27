import { useEffect, useRef } from 'react'
import { X, FileText, BookOpen, File, Calendar, HardDrive } from 'lucide-react'

const iconMap = {
  pdf:  { Icon: FileText, color: '#e53e3e', bg: '#fce7e7' },
  docx: { Icon: BookOpen, color: '#818cf8', bg: '#ede9fe' },
  doc:  { Icon: BookOpen, color: '#818cf8', bg: '#ede9fe' },
  txt:  { Icon: File,     color: '#0d9488', bg: '#f0fdfa' },
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })
}

function formatBytes(bytes) {
  if (!bytes) return 'Unknown size'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function EntryModal({ entry, onClose }) {
  const panelRef = useRef(null)

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  useEffect(() => { panelRef.current?.focus() }, [])

  if (!entry) return null

  const ext = entry.title.split('.').pop().toLowerCase()
  const style = iconMap[ext] ?? { Icon: File, color: '#9a7550', bg: '#f4ecd8' }
  const { Icon } = style

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 transition-opacity"
        style={{ background: 'rgba(59,42,26,0.45)', backdropFilter: 'blur(4px)' }}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-over panel */}
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={entry.title}
        className="fixed right-0 top-0 h-full w-full max-w-2xl z-50 shadow-2xl flex flex-col outline-none"
        style={{
          background: '#fdf8f2',
          borderLeft: '1px solid #d4b896',
          animation: 'slideIn 0.25s cubic-bezier(0.16,1,0.3,1)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-start gap-4 px-7 py-6 shrink-0"
          style={{ borderBottom: '1px solid #e8d5b7' }}
        >
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: style.bg }}
          >
            <Icon size={22} style={{ color: style.color }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-base font-semibold truncate" style={{ color: '#3b2a1a', fontFamily: '"Playfair Display", Georgia, serif' }}>
              {entry.title}
            </p>
            <div className="flex items-center gap-4 mt-1">
              <span className="flex items-center gap-1 text-xs" style={{ color: '#b09070' }}>
                <Calendar size={11} /> {formatDate(entry.createdAt)}
              </span>
              <span className="flex items-center gap-1 text-xs" style={{ color: '#b09070' }}>
                <HardDrive size={11} /> {formatBytes(entry.size)}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors shrink-0"
            style={{ color: '#9a7550' }}
            onMouseEnter={e => e.currentTarget.style.background = '#e8d5b7'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Snippet banner */}
        {entry.preview && (
          <div
            className="px-7 py-3 shrink-0"
            style={{ background: '#f4ecd8', borderBottom: '1px solid #e8d5b7' }}
          >
            <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: '#b09070' }}>Snippet</p>
            <p className="text-sm italic leading-relaxed" style={{ color: '#7a4f2a' }}>"{entry.preview}…"</p>
          </div>
        )}

        {/* Full content */}
        <div className="flex-1 overflow-y-auto px-7 py-6">
          <p className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: '#b09070' }}>Full Content</p>
          <div>
            {entry.content
              ? entry.content.split('\n').filter(Boolean).map((para, i) => (
                  <p key={i} className="text-sm leading-7 mb-3" style={{ color: '#3b2a1a' }}>
                    {para}
                  </p>
                ))
              : <p className="text-sm italic" style={{ color: '#b09070' }}>No content extracted from this file.</p>
            }
          </div>
        </div>

        {/* Footer */}
        <div
          className="px-7 py-4 shrink-0 flex justify-end"
          style={{ borderTop: '1px solid #e8d5b7' }}
        >
          <button
            onClick={onClose}
            className="text-sm font-medium transition-colors"
            style={{ color: '#9a7550' }}
            onMouseEnter={e => e.currentTarget.style.color = '#3b2a1a'}
            onMouseLeave={e => e.currentTarget.style.color = '#9a7550'}
          >
            Close
          </button>
        </div>
      </div>

      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0.5; }
          to   { transform: translateX(0);   opacity: 1; }
        }
      `}</style>
    </>
  )
}
