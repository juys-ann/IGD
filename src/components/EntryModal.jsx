import { useEffect, useRef } from 'react'
import { X, FileText, BookOpen, File, Calendar, HardDrive } from 'lucide-react'

const iconMap = {
  pdf: { Icon: FileText, color: 'text-rose-500', bg: 'bg-rose-50' },
  docx: { Icon: BookOpen, color: 'text-indigo-500', bg: 'bg-indigo-50' },
  doc: { Icon: BookOpen, color: 'text-indigo-500', bg: 'bg-indigo-50' },
  txt: { Icon: File, color: 'text-teal-500', bg: 'bg-teal-50' },
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

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  // Trap focus inside panel
  useEffect(() => {
    panelRef.current?.focus()
  }, [])

  if (!entry) return null

  const ext = entry.title.split('.').pop().toLowerCase()
  const style = iconMap[ext] ?? { Icon: File, color: 'text-stone-400', bg: 'bg-stone-50' }
  const { Icon } = style

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm z-40 transition-opacity"
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
        className="fixed right-0 top-0 h-full w-full max-w-2xl bg-white z-50 shadow-2xl flex flex-col outline-none animate-slide-in"
        style={{ animation: 'slideIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)' }}
      >
        {/* Header */}
        <div className="flex items-start gap-4 px-7 py-6 border-b border-stone-100 shrink-0">
          <div className={`w-12 h-12 rounded-xl ${style.bg} flex items-center justify-center shrink-0`}>
            <Icon size={22} className={style.color} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-base font-semibold text-stone-800 truncate">{entry.title}</p>
            <div className="flex items-center gap-4 mt-1">
              <span className="flex items-center gap-1 text-xs text-stone-400">
                <Calendar size={11} />
                {formatDate(entry.createdAt)}
              </span>
              <span className="flex items-center gap-1 text-xs text-stone-400">
                <HardDrive size={11} />
                {formatBytes(entry.size)}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-stone-100 flex items-center justify-center transition-colors text-stone-400 hover:text-stone-700 shrink-0"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Preview snippet banner */}
        {entry.preview && (
          <div className="px-7 py-3 bg-stone-50 border-b border-stone-100 shrink-0">
            <p className="text-xs font-medium text-stone-400 uppercase tracking-wider mb-1">Snippet</p>
            <p className="text-sm text-stone-600 italic leading-relaxed">"{entry.preview}…"</p>
          </div>
        )}

        {/* Full content */}
        <div className="flex-1 overflow-y-auto px-7 py-6">
          <p className="text-xs font-medium text-stone-400 uppercase tracking-wider mb-4">Full Content</p>
          <div className="prose prose-sm prose-stone max-w-none">
            {entry.content ? (
              entry.content.split('\n').filter(Boolean).map((para, i) => (
                <p key={i} className="text-sm text-stone-700 leading-7 mb-3">
                  {para}
                </p>
              ))
            ) : (
              <p className="text-sm text-stone-400 italic">No content extracted from this file.</p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-7 py-4 border-t border-stone-100 shrink-0 flex justify-end">
          <button
            onClick={onClose}
            className="text-sm font-medium text-stone-500 hover:text-stone-800 transition-colors"
          >
            Close
          </button>
        </div>
      </div>

      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0.5; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </>
  )
}
