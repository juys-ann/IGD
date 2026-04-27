import { CheckCircle2, FileText, Hash, Calendar, AlertTriangle, X } from 'lucide-react'

export default function SuccessReport({ report, onClose }) {
  if (!report) return null
  const { saved, skipped, totalWords, files } = report
  const allSkipped = saved === 0

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: '#fff', border: '1px solid #e8d5b7', boxShadow: '0 1px 4px #d4b89618' }}
    >
      {/* Header */}
      <div
        className="px-5 py-4 flex items-start justify-between"
        style={{
          background: allSkipped ? '#fce7e7' : '#f0fdf4',
          borderBottom: `1px solid ${allSkipped ? '#fca5a5' : '#bbf7d0'}`,
        }}
      >
        <div className="flex items-center gap-3">
          {allSkipped
            ? <AlertTriangle size={18} style={{ color: '#e53e3e', flexShrink: 0, marginTop: 2 }} />
            : <CheckCircle2 size={18}  style={{ color: '#16a34a', flexShrink: 0, marginTop: 2 }} />
          }
          <div>
            <p className="text-sm font-semibold" style={{ color: allSkipped ? '#9b1c1c' : '#15803d' }}>
              {allSkipped ? 'No files were imported' : 'Import complete!'}
            </p>
            <p className="text-xs mt-0.5" style={{ color: allSkipped ? '#ef4444' : '#16a34a' }}>
              {!allSkipped && <>{saved} {saved === 1 ? 'file' : 'files'} saved · </>}
              {totalWords > 0 && <>{totalWords.toLocaleString()} words imported · </>}
              {skipped > 0 && <>{skipped} skipped</>}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          style={{ color: '#9a7550' }}
          aria-label="Dismiss report"
        >
          <X size={15} />
        </button>
      </div>

      {/* Stats row */}
      {!allSkipped && (
        <div
          className="grid grid-cols-3"
          style={{ borderBottom: '1px solid #e8d5b7', borderTop: 'none' }}
        >
          <Stat icon={FileText} color="#0d9488" label="Files saved"      value={saved} />
          <Stat icon={Hash}     color="#818cf8" label="Words imported"   value={totalWords.toLocaleString()} divider />
          <Stat icon={Calendar} color="#c27a2a" label="Skipped"          value={skipped} divider />
        </div>
      )}

      {/* Per-file breakdown */}
      <div className="divide-y max-h-64 overflow-y-auto" style={{ '--tw-divide-opacity': 1 }}>
        {files.map((f, i) => (
          <div
            key={i}
            className="flex items-center justify-between px-5 py-2.5 text-xs"
            style={{ borderBottom: i < files.length - 1 ? '1px solid #f0e8da' : 'none' }}
          >
            <div className="flex items-center gap-2 min-w-0">
              <StatusDot status={f.status} />
              <span className="truncate max-w-xs" style={{ color: '#3b2a1a' }}>{f.name}</span>
            </div>
            <div className="flex items-center gap-3 shrink-0" style={{ color: '#b09070' }}>
              {f.status === 'saved' && (
                <>
                  <span>{f.words.toLocaleString()} words</span>
                  {f.detectedDate && (
                    <span className="flex items-center gap-1" style={{ color: '#c27a2a' }}>
                      <Calendar size={10} /> Date found
                    </span>
                  )}
                </>
              )}
              {(f.status === 'skipped' || f.status === 'error') && (
                <span style={{ color: '#e53e3e' }}>{f.error ?? 'Parse error'}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function Stat({ icon: Icon, color, label, value, divider }) {
  return (
    <div
      className="flex flex-col items-center py-3 px-4 gap-0.5"
      style={{ borderLeft: divider ? '1px solid #e8d5b7' : 'none' }}
    >
      <Icon size={14} style={{ color }} />
      <span className="text-base font-semibold" style={{ color: '#3b2a1a' }}>{value}</span>
      <span className="text-[10px]" style={{ color: '#b09070' }}>{label}</span>
    </div>
  )
}

function StatusDot({ status }) {
  const colors = { saved: '#0d9488', skipped: '#e53e3e', error: '#e53e3e' }
  return (
    <span
      className="w-1.5 h-1.5 rounded-full shrink-0"
      style={{ background: colors[status] ?? '#d4b896' }}
    />
  )
}
