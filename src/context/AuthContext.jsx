/**
 * src/context/AuthContext.jsx
 *
 * Deferred / lazy authentication.
 *
 * States:
 *   'loading'   — checking IndexedDB on startup
 *   'browsing'  — no active session; user can see the app shell and
 *                 feature previews but CANNOT access personal data.
 *   'unlocked'  — PIN verified, session active; full access.
 *
 * v2: adds displayName — stored in vault, exposed via context so any
 *     component can personalise greetings without extra DB calls.
 */

import {
  createContext, useContext, useState, useEffect,
  useCallback, useRef,
} from 'react'
import {
  hashPIN, verifyPIN, createSessionToken,
  saveSession, getSession, clearSession, isSessionActive,
} from '../services/security/crypto'
import { setupVault, getVault, isVaultSetup, updateDisplayName } from '../db'

const AuthContext = createContext(null)

// Session storage key for display name (survives nav, clears on tab close)
const DISPLAY_NAME_KEY = 'IGD_DISPLAY_NAME'

export function AuthProvider({ children }) {
  const [authState,    setAuthState]    = useState('loading')
  const [role,         setRole]         = useState(null)
  const [displayName,  setDisplayName]  = useState('')
  const [error,        setError]        = useState(null)
  const [modalVisible, setModalVisible] = useState(false)
  const [modalMode,    setModalMode]    = useState('unlock')

  const pendingResolverRef = useRef(null)

  // ── Init ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      try {
        const vaultExists = await isVaultSetup()

        if (isSessionActive()) {
          const { role: savedRole } = getSession()
          // Restore display name from sessionStorage (fast, no DB read)
          const savedName = sessionStorage.getItem(DISPLAY_NAME_KEY) ?? ''
          setDisplayName(savedName)
          setRole(savedRole ?? 'owner')
          setAuthState('unlocked')
          return
        }

        setModalMode(vaultExists ? 'unlock' : 'setup')
        setAuthState('browsing')
      } catch {
        setAuthState('browsing')
      }
    }
    init()
  }, [])

  // ── requireAuth ─────────────────────────────────────────────────────────────
  const requireAuth = useCallback(() => {
    if (authState === 'unlocked') return Promise.resolve(true)

    return new Promise((resolve) => {
      pendingResolverRef.current = resolve
      setError(null)
      setModalVisible(true)
      isVaultSetup().then((exists) => setModalMode(exists ? 'unlock' : 'setup'))
    })
  }, [authState])

  const dismissModal = useCallback(() => {
    setModalVisible(false)
    pendingResolverRef.current?.(false)
    pendingResolverRef.current = null
    setError(null)
  }, [])

  // ── Setup vault ─────────────────────────────────────────────────────────────
  const setupVaultPIN = useCallback(async (pin, confirmPin, name = '') => {
    setError(null)
    if (pin !== confirmPin) { setError("Passwords don't match."); return false }
    try {
      const pinHash = await hashPIN(pin)
      await setupVault({ pinHash, role: 'owner', displayName: name.trim() })
      const token = createSessionToken()
      saveSession(token, 'owner')
      const trimmedName = name.trim()
      sessionStorage.setItem(DISPLAY_NAME_KEY, trimmedName)
      setDisplayName(trimmedName)
      setRole('owner')
      setAuthState('unlocked')
      setModalVisible(false)
      pendingResolverRef.current?.(true)
      pendingResolverRef.current = null
      return true
    } catch {
      setError('Failed to set up vault. Please try again.')
      return false
    }
  }, [])

  // ── Unlock ──────────────────────────────────────────────────────────────────
  const unlock = useCallback(async (pin) => {
    setError(null)
    try {
      const vault = await getVault()
      if (!vault) { setError('Vault not found. Please set up your password first.'); return false }

      const match = await verifyPIN(pin, vault.pinHash)
      if (!match) { setError('Incorrect password. Please try again.'); return false }

      const token = createSessionToken()
      saveSession(token, vault.role)
      const name = vault.displayName ?? ''
      sessionStorage.setItem(DISPLAY_NAME_KEY, name)
      setDisplayName(name)
      setRole(vault.role)
      setAuthState('unlocked')
      setModalVisible(false)
      pendingResolverRef.current?.(true)
      pendingResolverRef.current = null
      return true
    } catch {
      setError('Authentication failed. Please try again.')
      return false
    }
  }, [])

  // ── Lock ────────────────────────────────────────────────────────────────────
  const lock = useCallback(() => {
    clearSession()
    sessionStorage.removeItem(DISPLAY_NAME_KEY)
    setRole(null)
    setDisplayName('')
    setAuthState('browsing')
  }, [])

  // ── Update display name ──────────────────────────────────────────────────────
  const saveDisplayName = useCallback(async (name) => {
    const trimmed = name.trim()
    await updateDisplayName(trimmed)
    sessionStorage.setItem(DISPLAY_NAME_KEY, trimmed)
    setDisplayName(trimmed)
  }, [])

  const isOwner    = role === 'owner'
  const canWrite   = authState === 'unlocked' && isOwner
  const isBrowsing = authState === 'browsing'

  return (
    <AuthContext.Provider value={{
      authState,
      role,
      displayName,
      error,
      isOwner,
      canWrite,
      isBrowsing,
      modalVisible,
      modalMode,
      requireAuth,
      dismissModal,
      setupVaultPIN,
      unlock,
      lock,
      saveDisplayName,
      clearError: () => setError(null),
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth() must be used inside <AuthProvider>')
  return ctx
}
