/**
 * ProfilePage.jsx
 *
 * The user's profile & settings hub.
 * Sections:
 *   1. Identity       — avatar, name, bio
 *   2. Security       — change password
 *   3. AI Settings    — Gemini API key
 *   4. Data & Privacy — export data, delete account
 */
import { useState, useRef, useCallback } from 'react'
import {
  Camera, User, Save, CheckCheck, Loader2, Eye, EyeOff,
  Key, Trash2, Download, AlertTriangle, ChevronRight,
  Sparkles, ShieldCheck, BookOpen, X, UserCircle,
} from 'lucide-react'
import { useProfile }   from '../context/ProfileContext'
import { useAuth }      from '../context/AuthContext'
import BrowsingGate     from '../components/BrowsingGate'
import { validatePIN, getPINStrength } from '../services/security/sanitizer'
import { hashPIN }      from '../services/security/crypto'
import { setupVault, getAllEntries, deleteAllUserData } from '../db'

// ── Helpers ───────────────────────────────────────────────────────────────────
function StrengthBar({ pin }) {
  if (!pin) return null
  const s = getPINStrength(pin)
  const cfg = {
    weak:   { label: 'Weak',   color: '#ef4444', w: '33%'  },
    fair:   { label: 'Fair',   color: '#f59e0b', w: '66%'  },
    strong: { label: 'Strong', color: '#10b981', w: '100%' },
  }[s] ?? { label: 'Weak', color: '#ef4444', w: '33%' }
  return (
    <div className="space-y-1 mt-1">
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: '#e8d5b7' }}>
        <div className="h-full rounded-full transition-all duration-300"
          style={{ width: cfg.w, background: cfg.color }} />
      </div>
      <p className="text-[11px] text-right font-medium" style={{ color: cfg.color }}>{cfg.label}</p>
    </div>
  )
}

function SectionCard({ title, icon: Icon, children }) {
  return (
    <div className="rounded-2xl border overflow-hidden"
      style={{ background: '#fdf8f2', borderColor: '#d4b896' }}>
      <div className="flex items-center gap-3 px-6 py-4 border-b"
        style={{ borderColor: '#e8d5b7', background: '#f4ecd8' }}>
        <Icon size={15} style={{ color: '#c27a2a' }} />
        <h2 className="text-sm font-semibold" style={{ color: '#7a4f2a', fontFamily: '"Playfair Display", Georgia, serif' }}>
          {title}
        </h2>
      </div>
      <div className="px-6 py-5 space-y-4">
        {children}
      </div>
    </div>
  )
}

function InputField({ label, type = 'text', value, onChange, placeholder, maxLength, hint, suffix, disabled }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#b09070' }}>
        {label}
      </label>
      <div className="relative">
        <input
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          maxLength={maxLength}
          disabled={disabled}
          className="w-full px-4 py-2.5 rounded-xl text-sm outline-none transition-all disabled:opacity-50"
          style={{ background: '#f4ecd8', border: '1px solid #d4b896', color: '#3b2a1a',
            fontFamily: type === 'password' ? 'monospace' : 'inherit' }}
          onFocus={(e) => { e.target.style.borderColor = '#c27a2a' }}
          onBlur={(e)  => { e.target.style.borderColor = '#d4b896'  }}
        />
        {suffix && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">{suffix}</div>
        )}
      </div>
      {hint && <p className="text-[11px]" style={{ color: '#b09070' }}>{hint}</p>}
    </div>
  )
}

// ── Delete Account Modal ──────────────────────────────────────────────────────
function DeleteAccountModal({ onConfirm, onCancel }) {
  const [confirmText, setConfirmText] = useState('')
  const CONFIRM_PHRASE = 'delete my journal'
  const ready = confirmText.toLowerCase() === CONFIRM_PHRASE

  return (
    <>
      <div className="fixed inset-0 z-50" style={{ background: 'rgba(59,42,26,0.6)', backdropFilter: 'blur(4px)' }}
        onClick={onCancel} aria-hidden="true" />
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md rounded-3xl p-7 shadow-2xl"
        style={{ background: '#f4ecd8', border: '1px solid #d4b896' }}>
        <button onClick={onCancel} className="absolute top-4 right-4 w-7 h-7 rounded-lg flex items-center justify-center"
          style={{ color: '#9a7550' }}><X size={14} /></button>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: '#fee2e2' }}>
            <AlertTriangle size={18} style={{ color: '#ef4444' }} />
          </div>
          <div>
            <h3 className="text-base font-semibold" style={{ color: '#3b2a1a', fontFamily: '"Playfair Display", Georgia, serif' }}>
              Delete everything?
            </h3>
            <p className="text-xs mt-0.5" style={{ color: '#9a7550' }}>
              This permanently erases all journals, memories, and settings.
            </p>
          </div>
        </div>

        <div className="rounded-xl p-4 mb-5 space-y-1" style={{ background: '#fee2e2', border: '1px solid #fca5a5' }}>
          <p className="text-xs font-semibold" style={{ color: '#b91c1c' }}>This will permanently delete:</p>
          {['All journal entries', 'All uploaded archives', 'All AI conversations', 'Your profile and password'].map((item) => (
            <p key={item} className="text-xs flex items-center gap-2" style={{ color: '#dc2626' }}>
              <span>✕</span> {item}
            </p>
          ))}
        </div>

        <div className="space-y-2 mb-5">
          <label className="text-xs font-medium" style={{ color: '#9a7550' }}>
            Type <strong style={{ color: '#3b2a1a' }}>{CONFIRM_PHRASE}</strong> to confirm
          </label>
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder={CONFIRM_PHRASE}
            className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
            style={{ background: '#fdf8f2', border: `1px solid ${ready ? '#ef4444' : '#d4b896'}`, color: '#3b2a1a' }}
          />
        </div>

        <div className="flex gap-3">
          <button onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium"
            style={{ background: '#e8d5b7', color: '#7a4f2a' }}>
            Keep my journal
          </button>
          <button onClick={onConfirm} disabled={!ready}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-40"
            style={{ background: ready ? '#ef4444' : '#e8d5b7', color: ready ? '#fff' : '#9a7550' }}>
            Delete everything
          </button>
        </div>
      </div>
    </>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function ProfilePage() {
  const { profile, updateProfile } = useProfile()
  const { lock } = useAuth()

  // ── Identity state ─────────────────────────────────────────────────────────
  const [name,      setName]      = useState(profile.name ?? '')
  const [bio,       setBio]       = useState(profile.bio  ?? '')
  const [photoPreview, setPhotoPreview] = useState(profile.photo ?? null)
  const [identitySaving, setIdentitySaving] = useState('idle') // idle|saving|saved
  const photoRef = useRef(null)

  // ── Password state ─────────────────────────────────────────────────────────
  const [currentPw,  setCurrentPw]  = useState('')
  const [newPw,      setNewPw]      = useState('')
  const [confirmPw,  setConfirmPw]  = useState('')
  const [showPw,     setShowPw]     = useState(false)
  const [pwStatus,   setPwStatus]   = useState('idle') // idle|saving|saved|error
  const [pwError,    setPwError]    = useState('')

  // ── API key state ──────────────────────────────────────────────────────────
  const [geminiKey,    setGeminiKey]    = useState(profile.geminiApiKey ?? '')
  const [showKey,      setShowKey]      = useState(false)
  const [keySaving,    setKeySaving]    = useState('idle')

  // ── Delete state ───────────────────────────────────────────────────────────
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [isDeleting,      setIsDeleting]      = useState(false)

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handlePhotoFile = (e) => {
    const file = e.target.files?.[0]
    if (!file || !file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = (ev) => setPhotoPreview(ev.target.result)
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const handleSaveIdentity = async () => {
    setIdentitySaving('saving')
    await updateProfile({ name: name.trim() || 'Jhoyce', bio: bio.trim(), photo: photoPreview })
    setIdentitySaving('saved')
    setTimeout(() => setIdentitySaving('idle'), 2000)
  }

  const handleSavePassword = async () => {
    setPwError('')
    const v = validatePIN(newPw)
    if (!v.valid) { setPwError(v.error); return }
    if (newPw !== confirmPw) { setPwError("Passwords don't match."); return }

    setPwStatus('saving')
    try {
      const vault = await (await import('../db')).getVault()
      if (vault) {
        const { verifyPIN } = await import('../services/security/crypto')
        const match = await verifyPIN(currentPw, vault.pinHash)
        if (!match) { setPwError('Current password is incorrect.'); setPwStatus('error'); return }
      }
      const pinHash = await hashPIN(newPw)
      await setupVault({ pinHash, role: 'owner' })
      setPwStatus('saved')
      setCurrentPw(''); setNewPw(''); setConfirmPw('')
      setTimeout(() => setPwStatus('idle'), 2000)
    } catch (err) {
      console.error(err)
      setPwError('Failed to update password. Please try again.')
      setPwStatus('error')
    }
  }

  const handleSaveApiKey = async () => {
    setKeySaving('saving')
    await updateProfile({ geminiApiKey: geminiKey.trim() })
    setKeySaving('saved')
    setTimeout(() => setKeySaving('idle'), 2000)
  }

  const handleExportData = async () => {
    const entries = await getAllEntries()
    const blob = new Blob([JSON.stringify(entries, null, 2)], { type: 'application/json' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `my-journal-export-${new Date().toISOString().slice(0,10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleDeleteAccount = async () => {
    setIsDeleting(true)
    try {
      await deleteAllUserData()
      sessionStorage.clear()
      lock()
      window.location.reload()
    } catch (err) {
      console.error(err)
      setIsDeleting(false)
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  const SaveBtn = ({ status, onClick, disabled }) => (
    <button
      onClick={onClick}
      disabled={disabled || status === 'saving'}
      className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold transition-all disabled:opacity-40"
      style={{ background: status === 'saved' ? '#10b981' : '#c27a2a', color: '#fff' }}
    >
      {status === 'saving' ? <Loader2 size={14} className="animate-spin" />
        : status === 'saved' ? <CheckCheck size={14} />
        : <Save size={14} />}
      {status === 'saving' ? 'Saving…' : status === 'saved' ? 'Saved!' : 'Save changes'}
    </button>
  )

  return (
    <BrowsingGate
      feature="Profile & Settings"
      description="Manage your identity, password, and app preferences."
      icon={UserCircle}
    >
    <div className="max-w-2xl mx-auto space-y-6 pb-12">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-semibold"
          style={{ color: '#3b2a1a', fontFamily: '"Playfair Display", Georgia, serif' }}>
          Profile & Settings
        </h1>
        <p className="text-sm mt-1" style={{ color: '#9a7550' }}>
          Manage your identity, security, and preferences.
        </p>
      </div>

      {/* ── 1. Identity ───────────────────────────────────────────────────── */}
      <SectionCard title="Identity" icon={User}>
        {/* Avatar */}
        <div className="flex items-center gap-5">
          <div className="relative shrink-0">
            <div
              className="w-20 h-20 rounded-2xl overflow-hidden flex items-center justify-center"
              style={{ background: '#e8d5b7', border: '2px solid #d4b896' }}
            >
              {photoPreview
                ? <img src={photoPreview} alt="Profile" className="w-full h-full object-cover" />
                : <User size={32} style={{ color: '#b09070' }} />}
            </div>
            <button
              onClick={() => photoRef.current?.click()}
              className="absolute -bottom-1 -right-1 w-7 h-7 rounded-lg flex items-center justify-center shadow-md transition-colors"
              style={{ background: '#c27a2a', color: '#fff' }}
              aria-label="Upload photo"
            >
              <Camera size={13} />
            </button>
            <input ref={photoRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoFile} />
          </div>
          <div className="flex-1 space-y-1">
            <p className="text-xs" style={{ color: '#9a7550' }}>
              Upload a profile photo. Stored only on your device.
            </p>
            <div className="flex gap-2">
              <button onClick={() => photoRef.current?.click()}
                className="text-xs px-3 py-1.5 rounded-lg font-medium transition-colors"
                style={{ background: '#f4ecd8', color: '#7a4f2a', border: '1px solid #d4b896' }}>
                {photoPreview ? 'Change photo' : 'Upload photo'}
              </button>
              {photoPreview && (
                <button onClick={() => setPhotoPreview(null)}
                  className="text-xs px-3 py-1.5 rounded-lg font-medium transition-colors"
                  style={{ background: '#fee2e2', color: '#c0392b', border: '1px solid #fca5a5' }}>
                  Remove
                </button>
              )}
            </div>
          </div>
        </div>

        <InputField
          label="Display Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          maxLength={40}
          hint="This appears in the Dashboard and Sidebar."
        />
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#b09070' }}>
            Bio
          </label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="A short note about yourself…"
            maxLength={200}
            rows={3}
            className="w-full px-4 py-2.5 rounded-xl text-sm outline-none resize-none transition-all"
            style={{ background: '#f4ecd8', border: '1px solid #d4b896', color: '#3b2a1a' }}
            onFocus={(e) => { e.target.style.borderColor = '#c27a2a' }}
            onBlur={(e)  => { e.target.style.borderColor = '#d4b896'  }}
          />
          <p className="text-[11px] text-right" style={{ color: '#b09070' }}>{bio.length}/200</p>
        </div>

        <div className="flex justify-end pt-1">
          <SaveBtn status={identitySaving} onClick={handleSaveIdentity} />
        </div>
      </SectionCard>

      {/* ── 2. Security ───────────────────────────────────────────────────── */}
      <SectionCard title="Security" icon={ShieldCheck}>
        <div className="space-y-3">
          <div className="relative">
            <input
              type={showPw ? 'text' : 'password'}
              value={currentPw}
              onChange={(e) => setCurrentPw(e.target.value)}
              placeholder="Current password"
              className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
              style={{ background: '#f4ecd8', border: '1px solid #d4b896', color: '#3b2a1a', fontFamily: 'monospace' }}
            />
            <button onClick={() => setShowPw(p => !p)}
              className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: '#9a7550' }}>
              {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
          <div>
            <input
              type={showPw ? 'text' : 'password'}
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
              placeholder="New password"
              className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
              style={{ background: '#f4ecd8', border: '1px solid #d4b896', color: '#3b2a1a', fontFamily: 'monospace' }}
            />
            {newPw && <StrengthBar pin={newPw} />}
          </div>
          <input
            type={showPw ? 'text' : 'password'}
            value={confirmPw}
            onChange={(e) => setConfirmPw(e.target.value)}
            placeholder="Confirm new password"
            onKeyDown={(e) => { if (e.key === 'Enter') handleSavePassword() }}
            className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
            style={{ background: '#f4ecd8', border: '1px solid #d4b896', color: '#3b2a1a', fontFamily: 'monospace' }}
          />
        </div>

        {/* Requirements hint */}
        <div className="rounded-xl p-3 text-[11px] space-y-0.5" style={{ background: '#f4ecd8', border: '1px solid #e8d5b7' }}>
          {[
            ['8–20 characters',        newPw.length >= 8 && newPw.length <= 20],
            ['One uppercase letter',   /[A-Z]/.test(newPw)],
            ['One number',             /[0-9]/.test(newPw)],
            ['One special char (!@#$%^&*)', /[!@#$%^&*]/.test(newPw)],
          ].map(([label, pass]) => (
            <p key={label} className="flex items-center gap-1.5" style={{ color: pass ? '#10b981' : '#b09070' }}>
              <span>{pass ? '✓' : '○'}</span>{label}
            </p>
          ))}
        </div>

        {pwError && (
          <p className="text-xs px-3 py-2 rounded-lg" style={{ background: '#fce7e7', color: '#c0392b' }}>
            {pwError}
          </p>
        )}

        <div className="flex justify-end">
          <SaveBtn
            status={pwStatus}
            onClick={handleSavePassword}
            disabled={!currentPw || !newPw || !confirmPw}
          />
        </div>
      </SectionCard>

      {/* ── 3. AI Settings ────────────────────────────────────────────────── */}
      <SectionCard title="AI Settings" icon={Sparkles}>
        <div className="rounded-xl p-4 flex items-start gap-3"
          style={{ background: '#f4ecd8', border: '1px solid #e8d5b7' }}>
          <Sparkles size={16} style={{ color: '#c27a2a', marginTop: 1, flexShrink: 0 }} />
          <div className="text-xs leading-relaxed" style={{ color: '#7a4f2a' }}>
            The <strong>Echo Chamber</strong> uses the Google Gemini API to power conversations with your past self.
            Your API key is stored locally on your device and never sent anywhere except Google's servers.
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#b09070' }}>
            Google Gemini API Key
          </label>
          <div className="relative">
            <input
              type={showKey ? 'text' : 'password'}
              value={geminiKey}
              onChange={(e) => setGeminiKey(e.target.value)}
              placeholder="AIza…"
              className="w-full px-4 py-2.5 rounded-xl text-sm outline-none font-mono"
              style={{ background: '#f4ecd8', border: '1px solid #d4b896', color: '#3b2a1a' }}
            />
            <button onClick={() => setShowKey(p => !p)}
              className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: '#9a7550' }}>
              {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
          <p className="text-[11px]" style={{ color: '#b09070' }}>
            Get your free key at{' '}
            <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer"
              className="underline" style={{ color: '#c27a2a' }}>
              aistudio.google.com
            </a>
          </p>
        </div>

        <div className="flex justify-end">
          <SaveBtn status={keySaving} onClick={handleSaveApiKey} disabled={!geminiKey.trim()} />
        </div>
      </SectionCard>

      {/* ── 4. Data & Privacy ─────────────────────────────────────────────── */}
      <SectionCard title="Data & Privacy" icon={BookOpen}>
        <div className="space-y-3">
          {/* Export */}
          <button
            onClick={handleExportData}
            className="w-full flex items-center justify-between px-4 py-3.5 rounded-xl transition-colors group"
            style={{ background: '#f4ecd8', border: '1px solid #e8d5b7' }}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: '#e8d5b7' }}>
                <Download size={14} style={{ color: '#7a4f2a' }} />
              </div>
              <div className="text-left">
                <p className="text-sm font-medium" style={{ color: '#3b2a1a' }}>Export my data</p>
                <p className="text-[11px]" style={{ color: '#9a7550' }}>Download all journal entries as JSON</p>
              </div>
            </div>
            <ChevronRight size={14} style={{ color: '#b09070' }} />
          </button>

          {/* Delete account */}
          <button
            onClick={() => setShowDeleteModal(true)}
            className="w-full flex items-center justify-between px-4 py-3.5 rounded-xl transition-colors"
            style={{ background: '#fef2f2', border: '1px solid #fca5a5' }}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: '#fee2e2' }}>
                <Trash2 size={14} style={{ color: '#ef4444' }} />
              </div>
              <div className="text-left">
                <p className="text-sm font-medium" style={{ color: '#b91c1c' }}>Delete account & all data</p>
                <p className="text-[11px]" style={{ color: '#ef4444' }}>Permanently erase everything — cannot be undone</p>
              </div>
            </div>
            <ChevronRight size={14} style={{ color: '#fca5a5' }} />
          </button>
        </div>

        {/* Privacy note */}
        <div className="flex items-center gap-2 pt-2 text-[11px]" style={{ color: '#b09070' }}>
          <ShieldCheck size={12} style={{ color: '#10b981' }} />
          All data is stored exclusively on this device. Nothing is sent to external servers
          (except AI generation requests to Google when using the Echo Chamber).
        </div>
      </SectionCard>

      {/* Delete account modal */}
      {showDeleteModal && (
        <DeleteAccountModal
          onConfirm={handleDeleteAccount}
          onCancel={() => setShowDeleteModal(false)}
        />
      )}
    </div>
    </BrowsingGate>
  )
}
