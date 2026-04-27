export default function PrivacyMonitor({ isLocal, progress, statusMessage }) {
  return (
    <div
      className="rounded-xl p-4"
      style={{
        background: '#3b2a1a',
        border: '1px solid #5a3d26',
        boxShadow: '0 4px 16px rgba(59,42,26,0.3)',
      }}
    >
      <div className="mb-3 flex items-center justify-between gap-4">
        <div>
          <p
            className="text-xs font-semibold uppercase tracking-widest mb-0.5"
            style={{ color: '#c27a2a', letterSpacing: '0.2em' }}
          >
            Security mode
          </p>
          <h2 className="text-lg font-semibold" style={{ color: '#fdf8f2', fontFamily: '"Playfair Display", Georgia, serif' }}>
            Local Mode Active
          </h2>
        </div>
        <div
          className="rounded-full px-3 py-1 text-sm font-semibold"
          style={{
            background: isLocal ? '#22c55e' : '#f59e0b',
            color: '#3b2a1a',
          }}
        >
          {isLocal ? 'Local' : 'Fallback'}
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <p className="text-sm mb-2" style={{ color: '#b09070' }}>LLM initialization progress</p>
          <div
            className="h-2.5 overflow-hidden rounded-full"
            style={{ background: '#5a3d26' }}
          >
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${progress}%`,
                background: 'linear-gradient(to right, #c27a2a, #d4956a)',
              }}
            />
          </div>
        </div>

        <div
          className="rounded-lg p-3 text-sm"
          style={{ background: 'rgba(255,255,255,0.06)', color: '#e8d5b7' }}
        >
          {statusMessage || 'Awaiting engine startup…'}
        </div>
      </div>
    </div>
  )
}
