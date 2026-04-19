import { FileText, File, BookOpen, CheckCircle2 } from 'lucide-react'

const iconMap = {
  pdf: { Icon: FileText, bg: 'bg-rose-50', border: 'border-rose-100', text: 'text-rose-500', badge: 'bg-rose-100 text-rose-600' },
  docx: { Icon: BookOpen, bg: 'bg-indigo-50', border: 'border-indigo-100', text: 'text-indigo-500', badge: 'bg-indigo-100 text-indigo-600' },
  doc: { Icon: BookOpen, bg: 'bg-indigo-50', border: 'border-indigo-100', text: 'text-indigo-500', badge: 'bg-indigo-100 text-indigo-600' },
  txt: { Icon: File, bg: 'bg-teal-50', border: 'border-teal-100', text: 'text-teal-500', badge: 'bg-teal-100 text-teal-600' },
}

const fallback = { Icon: File, bg: 'bg-stone-50', border: 'border-stone-200', text: 'text-stone-400', badge: 'bg-stone-100 text-stone-500' }

function formatBytes(bytes) {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

export default function FileCard({ entry, onClick }) {
  const ext = entry.title.split('.').pop().toLowerCase()
  const style = iconMap[ext] ?? fallback
  const { Icon } = style

  return (
    <button
      onClick={() => onClick(entry)}
      className={`group w-full text-left bg-white rounded-2xl border ${style.border} p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-400`}
    >
      {/* Icon + badge row */}
      <div className="flex items-start justify-between mb-4">
        <div className={`w-11 h-11 rounded-xl ${style.bg} flex items-center justify-center`}>
          <Icon size={20} className={style.text} />
        </div>
        <div className="flex items-center gap-1.5">
          <span className={`text-[10px] font-semibold font-mono px-2 py-0.5 rounded-full ${style.badge}`}>
            {ext.toUpperCase()}
          </span>
          <CheckCircle2 size={14} className="text-teal-400" aria-label="Indexed" />
        </div>
      </div>

      {/* Filename */}
      <p className="text-sm font-semibold text-stone-800 leading-tight truncate mb-1.5">
        {entry.title}
      </p>

      {/* Preview snippet */}
      <p className="text-xs text-stone-400 leading-relaxed line-clamp-2 mb-4">
        {entry.preview || 'No preview available.'}
      </p>

      {/* Footer metadata */}
      <div className="flex items-center justify-between pt-3 border-t border-stone-100">
        <span className="text-[11px] text-stone-300">{formatDate(entry.createdAt)}</span>
        <span className="text-[11px] text-stone-300">{formatBytes(entry.size)}</span>
      </div>
    </button>
  )
}
