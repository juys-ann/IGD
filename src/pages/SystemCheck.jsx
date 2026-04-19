import { useState, useEffect } from 'react'
import { useAI } from '../context/AIContext'
import {
  ShieldCheck, Cpu, Database, Wifi, CheckCircle2,
  XCircle, AlertCircle, Loader2, Sparkles, HardDrive,
} from 'lucide-react'
import { db } from '../db'

// ── Individual check row ──────────────────────────────────────────────────────
function CheckRow({ icon: Icon, label, status, detail }) {
  const configs = {
    pass:    { dot: 'bg-teal-400',   text: 'text-teal-600',  Icon: CheckCircle2,  label: 'Available'   },
    fail:    { dot: 'bg-rose-400',   text: 'text-rose-600',  Icon: XCircle,       label: 'Unavailable' },
    warn:    { dot: 'bg-amber-400',  text: 'text-amber-600', Icon: AlertCircle,   label: 'Limited'     },
    loading: { dot: 'bg-stone-300',  text: 'text-stone-400', Icon: Loader2,       label: 'Checking…'   },
  }
  const cfg = configs[status] ?? configs.loading
  const StatusIcon = cfg.Icon

  return (
    <div className="flex items-center justify-between py-4 border-b border-stone-50 last:border-0">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-stone-50 flex items-center justify-center shrink-0">
          <Icon size={16} className="text-stone-400" />
        </div>
        <div>
          <p className="text-sm font-medium text-stone-800">{label}</p>
          {detail && <p className="text-xs text-stone-400 mt-0.5">{detail}</p>}
        </div>
      </div>
      <div className={`flex items-center gap-1.5 text-xs font-medium ${cfg.text}`}>
        <StatusIcon size={13} className={status === 'loading' ? 'animate-spin' : ''} />
        {cfg.label}
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function SystemCheck() {
  const { workerStatus } = useAI()

  const [checks, setChecks] = useState({
    webgpu:   'loading',
    wasm:     'loading',
    idb:      'loading',
    cache:    'loading',
    network:  'loading',
  })
  const [details, setDetails] = useState({})
  const [dbStats, setDbStats] = useState(null)

  useEffect(() => {
    runChecks()
    fetchDbStats()
  }, [])

  async function runChecks() {
    // ── WebGPU ────────────────────────────────────────────────────────────────
    try {
      if ('gpu' in navigator) {
        const adapter = await navigator.gpu.requestAdapter()
        if (adapter) {
          const info = adapter.info ?? {}
          setChecks((p) => ({ ...p, webgpu: 'pass' }))
          setDetails((p) => ({ ...p, webgpu: info.description || 'GPU adapter found' }))
        } else {
          setChecks((p) => ({ ...p, webgpu: 'warn' }))
          setDetails((p) => ({ ...p, webgpu: 'No suitable GPU adapter — falling back to WASM' }))
        }
      } else {
        setChecks((p) => ({ ...p, webgpu: 'fail' }))
        setDetails((p) => ({ ...p, webgpu: 'WebGPU API not available in this browser' }))
      }
    } catch {
      setChecks((p) => ({ ...p, webgpu: 'warn' }))
      setDetails((p) => ({ ...p, webgpu: 'WebGPU check failed — WASM mode will be used' }))
    }

    // ── WebAssembly ───────────────────────────────────────────────────────────
    try {
      if (typeof WebAssembly === 'object' && typeof WebAssembly.instantiate === 'function') {
        setChecks((p) => ({ ...p, wasm: 'pass' }))
        setDetails((p) => ({ ...p, wasm: 'WASM runtime available' }))
      } else {
        setChecks((p) => ({ ...p, wasm: 'fail' }))
        setDetails((p) => ({ ...p, wasm: 'WebAssembly not supported — AI engine cannot run' }))
      }
    } catch {
      setChecks((p) => ({ ...p, wasm: 'fail' }))
    }

    // ── IndexedDB ─────────────────────────────────────────────────────────────
    try {
      await db.journals.count()
      setChecks((p) => ({ ...p, idb: 'pass' }))
      setDetails((p) => ({ ...p, idb: 'Local database is healthy' }))
    } catch {
      setChecks((p) => ({ ...p, idb: 'fail' }))
      setDetails((p) => ({ ...p, idb: 'IndexedDB not accessible' }))
    }

    // ── Cache API ─────────────────────────────────────────────────────────────
    try {
      if ('caches' in window) {
        const keys = await caches.keys()
        const xenovaCache = keys.find((k) => k.includes('xenova') || k.includes('transformers'))
        setChecks((p) => ({ ...p, cache: 'pass' }))
        setDetails((p) => ({
          ...p,
          cache: xenovaCache
            ? 'Model weights are cached — no re-download needed'
            : 'Cache API ready — model will be cached on first load',
        }))
      } else {
        setChecks((p) => ({ ...p, cache: 'warn' }))
        setDetails((p) => ({ ...p, cache: 'Cache API unavailable — model will re-download each session' }))
      }
    } catch {
      setChecks((p) => ({ ...p, cache: 'warn' }))
    }

    // ── Network (ping Hugging Face CDN) ───────────────────────────────────────
    try {
      const res = await fetch('https://huggingface.co/favicon.ico', {
        method: 'HEAD', mode: 'no-cors', cache: 'no-store',
      })
      setChecks((p) => ({ ...p, network: 'pass' }))
      setDetails((p) => ({ ...p, network: 'Hugging Face CDN is reachable' }))
    } catch {
      setChecks((p) => ({ ...p, network: 'fail' }))
      setDetails((p) => ({ ...p, network: 'Cannot reach Hugging Face — model download will fail' }))
    }
  }

  async function fetchDbStats() {
    try {
      const [journals, messages, sessions] = await Promise.all([
        db.journals.count(),
        db.chatHistory.count(),
        db.chatSessions.count(),
      ])
      setDbStats({ journals, messages, sessions })
    } catch (err) {
      console.error('DB stats error:', err)
    }
  }

  const allPassed   = Object.values(checks).every((v) => v === 'pass')
  const anyFailed   = Object.values(checks).some((v) => v === 'fail')
  const stillLoading = Object.values(checks).some((v) => v === 'loading')

  const overallStatus = stillLoading ? 'loading'
    : anyFailed   ? 'fail'
    : allPassed   ? 'pass'
    : 'warn'

  const AI_STATUS = {
    idle:    { label: 'Not started',   color: 'text-stone-400',  bg: 'bg-stone-100'  },
    loading: { label: 'Initialising…', color: 'text-amber-600',  bg: 'bg-amber-50'   },
    ready:   { label: 'Online',        color: 'text-teal-600',   bg: 'bg-teal-50'    },
    error:   { label: 'Error',         color: 'text-rose-600',   bg: 'bg-rose-50'    },
  }
  const aiCfg = AI_STATUS[workerStatus] ?? AI_STATUS.idle

  return (
    <div className="max-w-2xl mx-auto space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-display font-semibold text-stone-800">Engine Status</h1>
        <p className="text-stone-400 mt-1 text-sm">
          Live diagnostics for your local AI environment. All processing stays on this device.
        </p>
      </div>

      {/* Overall status banner */}
      <div className={`rounded-2xl px-5 py-4 flex items-center gap-3 border
        ${overallStatus === 'pass'    ? 'bg-teal-50 border-teal-100'  :
          overallStatus === 'fail'    ? 'bg-rose-50 border-rose-100'  :
          overallStatus === 'warn'    ? 'bg-amber-50 border-amber-100' :
          'bg-stone-50 border-stone-100'}`}
      >
        {overallStatus === 'loading'
          ? <Loader2 size={18} className="text-stone-400 animate-spin shrink-0" />
          : overallStatus === 'pass'
          ? <CheckCircle2 size={18} className="text-teal-500 shrink-0" />
          : overallStatus === 'fail'
          ? <XCircle size={18} className="text-rose-500 shrink-0" />
          : <AlertCircle size={18} className="text-amber-500 shrink-0" />}
        <div>
          <p className="text-sm font-semibold text-stone-800">
            {overallStatus === 'loading' ? 'Running diagnostics…'
              : overallStatus === 'pass' ? 'All systems operational'
              : overallStatus === 'fail' ? 'Critical issue detected'
              : 'Ready with warnings'}
          </p>
          <p className="text-xs text-stone-400 mt-0.5">
            {overallStatus === 'pass'
              ? 'Your device supports all local AI features.'
              : 'Some features may be limited. Check the details below.'}
          </p>
        </div>
      </div>

      {/* Capability checks */}
      <div className="bg-white rounded-2xl border border-stone-100 shadow-sm px-5 divide-y divide-stone-50">
        <CheckRow icon={Cpu}       label="WebGPU Acceleration" status={checks.webgpu}  detail={details.webgpu}  />
        <CheckRow icon={Cpu}       label="WebAssembly Runtime" status={checks.wasm}    detail={details.wasm}    />
        <CheckRow icon={Database}  label="Local Database"      status={checks.idb}     detail={details.idb}     />
        <CheckRow icon={HardDrive} label="Browser Cache"       status={checks.cache}   detail={details.cache}   />
        <CheckRow icon={Wifi}      label="Model CDN Access"    status={checks.network} detail={details.network} />
      </div>

      {/* AI Engine status */}
      <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles size={15} className="text-teal-400" />
            <p className="text-sm font-semibold text-stone-800">AI Engine</p>
          </div>
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${aiCfg.bg} ${aiCfg.color}`}>
            {aiCfg.label}
          </span>
        </div>
        <p className="text-xs text-stone-400 leading-relaxed">
          LaMini-Flan-T5-248M · Runs entirely in your browser via WebAssembly.
          Initialize the Echo Chamber to load the model.
        </p>
        <div className="flex items-center gap-1.5 text-[11px] text-stone-300">
          <ShieldCheck size={11} className="text-teal-400" />
          No data ever leaves your device
        </div>
      </div>

      {/* Database stats */}
      {dbStats && (
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-5">
          <p className="text-sm font-semibold text-stone-800 mb-4">Storage Summary</p>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Journal Entries', value: dbStats.journals },
              { label: 'AI Messages',     value: dbStats.messages },
              { label: 'Conversations',   value: dbStats.sessions },
            ].map(({ label, value }) => (
              <div key={label} className="bg-stone-50 rounded-xl p-3 text-center">
                <p className="text-xl font-semibold text-stone-800">{value}</p>
                <p className="text-[11px] text-stone-400 mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
