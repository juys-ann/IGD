/**
 * UploadProgressBar
 *
 * Props:
 *   current  number  — files processed so far
 *   total    number  — total files in batch
 *   label    string  — optional status label
 */
export default function UploadProgressBar({ current, total, label }) {
  const pct = total > 0 ? Math.round((current / total) * 100) : 0

  return (
    <div className="space-y-2">
      {/* Label row */}
      <div className="flex items-center justify-between text-xs">
        <span className="text-stone-500 font-medium">{label ?? `Processing files…`}</span>
        <span className="font-mono text-stone-400">
          {current} / {total} &nbsp;·&nbsp; {pct}%
        </span>
      </div>

      {/* Track */}
      <div className="h-2 w-full bg-stone-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-teal-400 to-teal-500 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
