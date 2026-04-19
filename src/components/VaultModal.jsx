import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { validatePIN, getPINStrength } from '../services/security/sanitizer'
import { KeyRound, Eye, EyeOff, Feather, Loader2, X, User } from 'lucide-react'

// ── Strength indicator bar ────────────────────────────────────────────────────
function StrengthBar({ pin }) {
  const strength = getPINStrength(pin)
  if (!pin) return null

  const config = {
    weak:   { label: 'Weak',   color: '#ef4444', width: '33%'  },
    fair:   { label: 'Fair',   color: '#f59e0b', width: '66%'  },
    strong: { label: 'Strong', color: '#10b981', width: '100%' },
  }
  const cfg = config[strength] ?? config.weak

  return (
    <div className="space-y-1">
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: '#e8d5b7' }}>
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: cfg.width, background: cfg.color }}
        />
      </div>
      <p className="text-[11px] text-right font-medium" style={{ color: cfg.color }}>
        {cfg.label}
      </p>
    </div>
  )
}

// ── Password requirements checklist ──────────────────────────────────────────
function Requirements({ pin }) {
  const checks = [
    { label: '8 or more characters',                      pass: pin.length >= 8 },
    { label: 'At least one uppercase letter (A-Z)',        pass: /[A-Z]/.test(pin) },
    { label: 'At least one number (0-9)',                  pass: /[0-9]/.test(pin) },
    { label: 'At least one special character (!@#$%^&*)', pass: /[!@#$%^&*]/.test(pin) },
  ]
  return (
    <ul className="space-y-1 text-[11px]">
      {checks.map(({ label, pass }) => (
        <li key={label} className="flex items-center gap-1.5"
          style={{ color: pass ? '#10b981' : '#b09070' }}>
          <span>{pass ? '✓' : '○'}</span>
          {label}
        </li>
      ))}
    </ul>
  )
}

// ── Setup form ────────────────────────────────────────────────────────────────
function SetupForm() {
  const { setupVaultPIN, error, clearError, dismissModal } = useAuth()
  const [name,     setName]     = useState('')
  const [pin,      setPin]      = useState('')
  const [confirm,  setConfirm]  = useState('')
  const [show,     setShow]     = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [localErr, setLocalErr] = useState('')
  const [showReqs, setShowReqs] = useState(false)
  const nameRef = useRef(null)

  useEffect(() => { nameRef.current?.focus() }, [])

  const handleSubmit = async () => {
    clearError(); setLocalErr('')
    const v = validatePIN(pin)
    if (!v.valid) { setLocalErr(v.error); return }
    if (pin !== confirm) { setLocalErr("Passwords don't match."); return }
    setLoading(true)
    // Pass name as third argument
    await setupVaultPIN(pin, confirm, name)
    setLoading(false)
  }

  const displayError = localErr || error

  return (
    <div className="space-y-4">
      <div className="text-center">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3"
          style={{ background: '#e8d5b7' }}>
          <Feather size={22} style={{ color: '#c27a2a' }} />
        </div>
        <h2 className="text-lg font-semibold"
          style={{ color: '#3b2a1a', fontFamily: '"Playfair Display", Georgia, serif' }}>
          Protect Your Journal
        </h2>
        <p className="text-xs mt-1" style={{ color: '#9a7550' }}>
          Create a secure password to keep your memories private.
        </p>
      </div>

      {/* Display name — optional */}
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#b09070' }}>
          <User size={14} />
        </span>
        <input
          ref={nameRef}
          type="text"
          placeholder="Your name (optional)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={40}
          className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none"
          style={{ background: '#fdf8f2', border: '1px solid #d4b896', color: '#3b2a1a' }}
        />
      </div>

      {/* Password input */}
      <div className="space-y-1">
        <div className="relative">
          <input
            type={show ? 'text' : 'password'}
            placeholder="Create a password"
            value={pin}
            onChange={(e) => { setPin(e.target.value); setShowReqs(true) }}
            maxLength={20}
            className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
            style={{ background: '#fdf8f2', border: '1px solid #d4b896', color: '#3b2a1a' }}
          />
          <button onClick={() => setShow(p => !p)}
            className="absolute right-3 top-1/2 -translate-y-1/2"
            style={{ color: '#9a7550' }}>
            {show ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        </div>
        {pin && <StrengthBar pin={pin} />}
      </div>

      {/* Requirements checklist */}
      {showReqs && pin && (
        <div className="rounded-xl p-3" style={{ background: '#fdf8f2', border: '1px solid #e8d5b7' }}>
          <Requirements pin={pin} />
        </div>
      )}

      {/* Confirm password */}
      <input
        type={show ? 'text' : 'password'}
        placeholder="Confirm password"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit() }}
        maxLength={20}
        className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
        style={{ background: '#fdf8f2', border: '1px solid #d4b896', color: '#3b2a1a' }}
      />

      {displayError && (
        <p className="text-xs text-center px-2 py-1.5 rounded-lg"
          style={{ background: '#fce7e7', color: '#c0392b' }}>
          {displayError}
        </p>
      )}

      <button
        onClick={handleSubmit}
        disabled={loading || !pin || !confirm}
        className="w-full py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
        style={{ background: '#c27a2a', color: '#fff' }}
      >
        {loading ? <Loader2 size={14} className="animate-spin" /> : <KeyRound size={14} />}
        {loading ? 'Setting up…' : 'Create Vault & Continue'}
      </button>

      <button onClick={dismissModal}
        className="w-full text-xs py-1.5 transition-colors"
        style={{ color: '#b09070' }}>
        Maybe later — continue browsing
      </button>
    </div>
  )
}

// ── Unlock form ───────────────────────────────────────────────────────────────
function UnlockForm() {
  const { unlock, error, clearError, dismissModal } = useAuth()
  const [pin,     setPin]     = useState('')
  const [show,    setShow]    = useState(false)
  const [loading, setLoading] = useState(false)
  const inputRef = useRef(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  const handleUnlock = async () => {
    clearError()
    if (!pin) return
    setLoading(true)
    await unlock(pin)
    setLoading(false)
  }

  return (
    <div className="space-y-4">
      <div className="text-center">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3"
          style={{ background: '#e8d5b7' }}>
          <KeyRound size={20} style={{ color: '#c27a2a' }} />
        </div>
        <h2 className="text-lg font-semibold"
          style={{ color: '#3b2a1a', fontFamily: '"Playfair Display", Georgia, serif' }}>
          Welcome Back
        </h2>
        <p className="text-xs mt-1" style={{ color: '#9a7550' }}>
          Enter your password to open your journal.
        </p>
      </div>

      <div className="relative">
        <input
          ref={inputRef}
          type={show ? 'text' : 'password'}
          placeholder="Enter your password"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleUnlock() }}
          maxLength={20}
          className="w-full px-4 py-2.5 rounded-xl text-sm outline-none text-center tracking-widest"
          style={{ background: '#fdf8f2', border: '1px solid #d4b896', color: '#3b2a1a' }}
        />
        <button onClick={() => setShow(p => !p)}
          className="absolute right-3 top-1/2 -translate-y-1/2"
          style={{ color: '#9a7550' }}>
          {show ? <EyeOff size={14} /> : <Eye size={14} />}
        </button>
      </div>

      {error && (
        <p className="text-xs text-center px-2 py-1.5 rounded-lg"
          style={{ background: '#fce7e7', color: '#c0392b' }}>
          {error}
        </p>
      )}

      <button
        onClick={handleUnlock}
        disabled={loading || !pin}
        className="w-full py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
        style={{ background: '#c27a2a', color: '#fff' }}
      >
        {loading && <Loader2 size={14} className="animate-spin" />}
        {loading ? 'Verifying…' : 'Open My Journal'}
      </button>

      <button onClick={dismissModal}
        className="w-full text-xs py-1.5 transition-colors"
        style={{ color: '#b09070' }}>
        Cancel — keep browsing
      </button>
    </div>
  )
}

// ── Modal wrapper ─────────────────────────────────────────────────────────────
export default function VaultModal() {
  const { modalVisible, modalMode, dismissModal } = useAuth()
  if (!modalVisible) return null

  return (
    <>
      <div
        className="fixed inset-0 z-50"
        style={{ background: 'rgba(59,42,26,0.5)', backdropFilter: 'blur(4px)' }}
        onClick={dismissModal}
        aria-hidden="true"
      />
      <div
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-sm rounded-3xl p-7 shadow-2xl"
        style={{
          background: '#f4ecd8',
          border: '1px solid #d4b896',
          animation: 'vaultIn 0.22s cubic-bezier(0.16,1,0.3,1)',
        }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <button
          onClick={dismissModal}
          className="absolute top-4 right-4 w-7 h-7 rounded-lg flex items-center justify-center hover:bg-amber-100 transition-colors"
          style={{ color: '#9a7550' }}
          aria-label="Close"
        >
          <X size={14} />
        </button>
        {modalMode === 'setup' ? <SetupForm /> : <UnlockForm />}
      </div>
      <style>{`
        @keyframes vaultIn {
          from { opacity:0; transform:translate(-50%,calc(-50% + 14px)); }
          to   { opacity:1; transform:translate(-50%,-50%); }
        }
      `}</style>
    </>
  )
}
