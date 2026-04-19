/**
 * ProfileContext.jsx
 *
 * Provides the user's profile (name, photo, bio, geminiApiKey) to the
 * entire app via React context. Loads once from IndexedDB on mount,
 * and exposes a `updateProfile` function that persists changes.
 *
 * Usage:
 *   const { profile, updateProfile, isLoading } = useProfile()
 */

import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { getProfile, saveProfile } from '../db'

const ProfileContext = createContext(null)

export const DEFAULT_PROFILE = {
  name:         'Jhoyce',
  bio:          '',
  photo:        null,   // base64 dataURL | null
  geminiApiKey: '',
}

export function ProfileProvider({ children }) {
  const [profile,   setProfile]   = useState(DEFAULT_PROFILE)
  const [isLoading, setIsLoading] = useState(true)

  // Load from IndexedDB on mount
  useEffect(() => {
    getProfile()
      .then((saved) => {
        if (saved) {
          setProfile({ ...DEFAULT_PROFILE, ...saved })
        }
      })
      .catch(console.error)
      .finally(() => setIsLoading(false))
  }, [])

  /**
   * Merge a partial patch into the profile, persist it, and update state.
   * Returns the new profile object.
   */
  const updateProfile = useCallback(async (patch) => {
    const next = { ...profile, ...patch }
    setProfile(next)
    await saveProfile(patch)
    return next
  }, [profile])

  /**
   * Hard-reset the in-memory profile to defaults (called after account deletion).
   */
  const resetProfile = useCallback(() => {
    setProfile(DEFAULT_PROFILE)
  }, [])

  return (
    <ProfileContext.Provider value={{ profile, updateProfile, resetProfile, isLoading }}>
      {children}
    </ProfileContext.Provider>
  )
}

export function useProfile() {
  const ctx = useContext(ProfileContext)
  if (!ctx) throw new Error('useProfile() must be used inside <ProfileProvider>')
  return ctx
}
