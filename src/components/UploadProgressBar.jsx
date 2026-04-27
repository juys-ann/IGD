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
        <span className="font-medium" style={{ color: '#7a4f2a' }}>
          {label ?? 'Processing files…'}
        </span>
        <span className="font-mono" style={{ color: '#b09070' }}>
          {current} / {total} &nbsp;·&nbsp; {pct}%
        </span>
      </div>

      {/* Track */}
      <div
        className="h-2 w-full rounded-full overflow-hidden"
        style={{ background: '#e8d5b7' }}
      >
        <div
          className="h-full rounded-full transition-all duration-300 ease-out"
          style={{
            width: `${pct}%`,
            background: 'linear-gradient(to right, #c27a2a, #d4956a)',
          }}
        />
      </div>
    </div>
  )
}
