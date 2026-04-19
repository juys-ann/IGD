/**
 * BrowsingGate.jsx
 *
 * Wraps any page that contains personal data.
 *
 * authState === 'loading'   → blank (prevents flash of personal data)
 * authState === 'browsing'  → sign-in card (no personal data visible)
 * authState === 'unlocked'  → renders children normally
 */
import { useAuth } from '../context/AuthContext'
import { KeyRound, Loader2 } from 'lucide-react'

export default function BrowsingGate({ children, feature, description, icon: Icon }) {
  const { isBrowsing, authState, requireAuth } = useAuth()

  // Still checking IndexedDB — show nothing to avoid data flash
  if (authState === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 size={22} className="animate-spin" style={{ color: '#d4b896' }} />
      </div>
    )
  }

  // Signed in — show the real page
  if (!isBrowsing) return children

  // Browsing (not signed in) — show sign-in card
  return (
    <div className="flex items-center justify-center min-h-[60vh] px-4">
      <div
        className="w-full max-w-sm rounded-3xl p-8 text-center space-y-5 shadow-xl"
        style={{
          background: '#f4ecd8',
          border: '1px solid #d4b896',
          animation: 'gateIn 0.2s ease-out',
        }}
      >
        {/* Feature icon */}
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto"
          style={{ background: '#e8d5b7' }}
        >
          {Icon
            ? <Icon size={28} style={{ color: '#c27a2a' }} />
            : <KeyRound size={28} style={{ color: '#c27a2a' }} />
          }
        </div>

        {/* Feature name + description */}
        <div>
          <h2
            className="text-xl font-semibold"
            style={{ color: '#3b2a1a', fontFamily: '"Playfair Display", Georgia, serif' }}
          >
            {feature}
          </h2>
          <p className="text-sm mt-2 leading-relaxed" style={{ color: '#9a7550' }}>
            {description}
          </p>
        </div>

        <div style={{ borderTop: '1px solid #d4b896' }} />

        {/* CTA */}
        <div className="space-y-3">
          <p className="text-xs" style={{ color: '#b09070' }}>
            Your personal memories are private and protected.
            Sign in to access your data.
          </p>
          <button
            onClick={() => requireAuth()}
            className="w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
            style={{ background: '#c27a2a', color: '#fff' }}
          >
            <KeyRound size={15} />
            Sign in to your journal
          </button>
        </div>

        <p className="text-[11px]" style={{ color: '#b09070' }}>
          ✦ Everything stays on your device — always.
        </p>
      </div>

      <style>{`
        @keyframes gateIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
