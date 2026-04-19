import { CheckCircle2, FileText, Hash, Calendar, AlertTriangle, X } from 'lucide-react'

/**
 * SuccessReport
 *
 * Props:
 *   report   object  — { saved, skipped, totalWords, files: FileResult[] }
 *   onClose  fn      — dismiss handler
 *
 * FileResult shape:
 *   { name, status: 'saved'|'skipped'|'error', words, detectedDate, error? }
 */
export default function SuccessReport({ report, onClose }) {
  if (!report) return null

  const { saved, skipped, totalWords, files } = report
  const allSkipped = saved === 0

  return (
    <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className={`px-5 py-4 flex items-start justify-between
        ${allSkipped ? 'bg-rose-50 border-b border-rose-100' : 'bg-teal-50 border-b border-teal-100'}`}
      >
        <div className="flex items-center gap-3">
          {allSkipped
            ? <AlertTriangle size={18} className="text-rose-400 shrink-0 mt-0.5" />
            : <CheckCircle2 size={18} className="text-teal-500 shrink-0 mt-0.5" />
          }
          <div>
            <p className={`text-sm font-semibold ${allSkipped ? 'text-rose-700' : 'text-teal-700'}`}>
              {allSkipped ? 'No files were imported' : 'Import complete!'}
            </p>
            <p className={`text-xs mt-0.5 ${allSkipped ? 'text-rose-500' : 'text-teal-600'}`}>
              {!allSkipped && (
                <>{saved} {saved === 1 ? 'file' : 'files'} saved · </>
              )}
              {totalWords > 0 && (
                <>{totalWords.toLocaleString()} words imported · </>
              )}
              {skipped > 0 && (
                <>{skipped} skipped</>
              )}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-stone-400 hover:text-stone-700 transition-colors"
          aria-label="Dismiss report"
        >
          <X size={15} />
        </button>
      </div>

      {/* Stats row */}
      {!allSkipped && (
        <div className="grid grid-cols-3 divide-x divide-stone-100 border-b border-stone-100">
          <Stat icon={FileText} color="text-teal-500" label="Files saved"  value={saved} />
          <Stat icon={Hash}     color="text-indigo-400" label="Words imported" value={totalWords.toLocaleString()} />
          <Stat icon={Calendar} color="text-amber-400"  label="Skipped"    value={skipped} />
        </div>
      )}

      {/* Per-file breakdown */}
      <div className="divide-y divide-stone-50 max-h-64 overflow-y-auto">
        {files.map((f, i) => (
          <div key={i} className="flex items-center justify-between px-5 py-2.5 text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <StatusDot status={f.status} />
              <span className="truncate text-stone-700 max-w-xs">{f.name}</span>
            </div>
            <div className="flex items-center gap-3 shrink-0 text-stone-400">
              {f.status === 'saved' && (
                <>
                  <span>{f.words.toLocaleString()} words</span>
                  {f.detectedDate && (
                    <span className="flex items-center gap-1 text-amber-500">
                      <Calendar size={10} /> Date found
                    </span>
                  )}
                </>
              )}
              {f.status === 'skipped' && (
                <span className="text-rose-400">{f.error}</span>
              )}
              {f.status === 'error' && (
                <span className="text-rose-400">{f.error ?? 'Parse error'}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function Stat({ icon: Icon, color, label, value }) {
  return (
    <div className="flex flex-col items-center py-3 px-4 gap-0.5">
      <Icon size={14} className={color} />
      <span className="text-base font-semibold text-stone-800">{value}</span>
      <span className="text-[10px] text-stone-400">{label}</span>
    </div>
  )
}

function StatusDot({ status }) {
  const map = {
    saved:   'bg-teal-400',
    skipped: 'bg-rose-400',
    error:   'bg-rose-400',
  }
  return <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${map[status] ?? 'bg-stone-300'}`} />
}
