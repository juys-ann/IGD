/**
 * src/components/ProtectedRoute.jsx  (v2)
 *
 * Central authentication guard for all protected routes.
 *
 * States:
 *   'loading'   → neutral spinner (prevents layout flash)
 *   'browsing'  → full LandingPage with sign-in CTA
 *   'unlocked'  → renders children normally
 *
 * The LandingPage receives:
 *   onSignIn  — opens VaultModal via requireAuth()
 *   isSetup   — true if a vault PIN already exists (changes CTA copy)
 */

import { useAuth } from '../context/AuthContext'
import LandingPage from './LandingPage'

// ── Spinner shown during the 'loading' state ──────────────────────────────────
function LoadingScreen() {
  return (
    <div
      className="fixed inset-0 flex items-center justify-center"
      style={{ background: '#fdf8f2' }}
    >
      <div className="flex flex-col items-center gap-3">
        <div
          className="w-8 h-8 rounded-full border-2 animate-spin"
          style={{ borderColor: '#d4b896', borderTopColor: 'transparent' }}
        />
        <p className="text-sm" style={{ color: '#b09070' }}>
          Loading your vault…
        </p>
      </div>
    </div>
  )
}

// ── ProtectedRoute ────────────────────────────────────────────────────────────
export default function ProtectedRoute({ children }) {
  const { authState, modalMode, requireAuth } = useAuth()

  if (authState === 'loading') return <LoadingScreen />

  if (authState === 'browsing') {
    return (
      <LandingPage
        onSignIn={requireAuth}
        isSetup={modalMode === 'unlock'}   // vault exists → returning user copy
      />
    )
  }

  return children
}
