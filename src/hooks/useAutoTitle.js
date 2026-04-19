import { useState, useEffect } from 'react'
import { countWrittenEntries } from '../db'

/**
 * useAutoTitle(key)
 * Re-runs whenever `key` changes (pass a bumping counter for "New Entry").
 * Pass key = -1 to skip the query entirely (editing an existing entry).
 */
export function useAutoTitle(key = 0) {
  const [defaultTitle, setDefaultTitle] = useState('')
  const [title,        setTitle]        = useState('')
  const [isLoading,    setIsLoading]    = useState(key !== -1)

  useEffect(() => {
    if (key === -1) { setIsLoading(false); return }
    let cancelled = false
    setIsLoading(true)
    ;(async () => {
      try {
        const count   = await countWrittenEntries()
        const computed = `Journal ${count + 1}`
        if (!cancelled) { setDefaultTitle(computed); setTitle(computed) }
      } catch {
        if (!cancelled) { setDefaultTitle('Journal 1'); setTitle('Journal 1') }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [key])

  const resetToDefault = () =>
    setTitle((prev) => (prev.trim() ? prev : defaultTitle))

  return { title, setTitle, defaultTitle, resetToDefault, isLoading }
}
