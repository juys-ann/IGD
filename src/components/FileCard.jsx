import { FileText, File, BookOpen, CheckCircle2 } from 'lucide-react'

const iconMap = {
  pdf:  { Icon: FileText, bg: '#fce7e7', border: '#fca5a5', text: '#e53e3e', badge: { bg: '#fce7e7', color: '#9b1c1c' } },
  docx: { Icon: BookOpen, bg: '#ede9fe', border: '#c4b5fd', text: '#818cf8', badge: { bg: '#ede9fe', color: '#4c1d95' } },
  doc:  { Icon: BookOpen, bg: '#ede9fe', border: '#c4b5fd', text: '#818cf8', badge: { bg: '#ede9fe', color: '#4c1d95' } },
  txt:  { Icon: File,     bg: '#f0fdfa', border: '#99f6e4', text: '#0d9488', badge: { bg: '#f0fdfa', color: '#134e4a' } },
}

const fallback = {
  Icon: File,
  bg: '#f4ecd8', border: '#d4b896', text: '#9a7550',
  badge: { bg: '#f4ecd8', color: '#7a4f2a' },
}

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
  const s = iconMap[ext] ?? fallback
  const { Icon } = s

  return (
    <button
      onClick={() => onClick(entry)}
      className="group w-full text-left rounded-2xl p-5 transition-all duration-200 focus:outline-none"
      style={{
        background: '#fff',
        border: `1px solid ${s.border}`,
        boxShadow: '0 1px 4px #d4b89614',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.boxShadow = '0 4px 16px #d4b89628'
        e.currentTarget.style.transform = 'translateY(-2px)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.boxShadow = '0 1px 4px #d4b89614'
        e.currentTarget.style.transform = 'translateY(0)'
      }}
    >
      {/* Icon + badge row */}
      <div className="flex items-start justify-between mb-4">
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center"
          style={{ background: s.bg }}
        >
          <Icon size={20} style={{ color: s.text }} />
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className="text-[10px] font-semibold font-mono px-2 py-0.5 rounded-full"
            style={{ background: s.badge.bg, color: s.badge.color }}
          >
            {ext.toUpperCase()}
          </span>
          <CheckCircle2 size={14} style={{ color: '#0d9488' }} aria-label="Indexed" />
        </div>
      </div>

      {/* Filename */}
      <p className="text-sm font-semibold leading-tight truncate mb-1.5" style={{ color: '#3b2a1a', fontFamily: '"Playfair Display", Georgia, serif' }}>
        {entry.title}
      </p>

      {/* Preview */}
      <p className="text-xs leading-relaxed line-clamp-2 mb-4" style={{ color: '#9a7550' }}>
        {entry.preview || 'No preview available.'}
      </p>

      {/* Footer */}
      <div
        className="flex items-center justify-between pt-3"
        style={{ borderTop: '1px solid #f0e8da' }}
      >
        <span className="text-[11px]" style={{ color: '#c9b99a' }}>{formatDate(entry.createdAt)}</span>
        <span className="text-[11px]" style={{ color: '#c9b99a' }}>{formatBytes(entry.size)}</span>
      </div>
    </button>
  )
}
