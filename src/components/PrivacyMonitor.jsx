export default function PrivacyMonitor({ isLocal, progress, statusMessage }) {
  return (
    <div className="privacy-monitor rounded-xl border border-slate-300 bg-slate-950/90 p-4 text-slate-100 shadow-lg">
      <div className="mb-3 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.25em] text-emerald-300">Security mode</p>
          <h2 className="text-xl font-semibold">Local Mode Active</h2>
        </div>
        <div className={`rounded-full px-3 py-1 text-sm font-semibold ${isLocal ? 'bg-emerald-500 text-slate-950' : 'bg-amber-500 text-slate-950'}`}>
          {isLocal ? 'Local' : 'Fallback'}
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <p className="text-sm text-slate-400">LLM initialization progress</p>
          <div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-700">
            <div className="h-full bg-emerald-400" style={{ width: `${progress}%` }} />
          </div>
        </div>

        <div className="rounded-lg bg-slate-800/80 p-3 text-sm text-slate-200">
          {statusMessage || 'Awaiting engine startup...'}
        </div>
      </div>
    </div>
  );
}
