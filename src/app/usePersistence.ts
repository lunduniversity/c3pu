import { useCallback, useEffect, useRef, useState } from 'react'
import type { UserMarks } from '@/grid/marks'
import { parsePersistedState, serializePersistedState, type SessionState } from '@/settings/persistence'
import { readStorage, writeStorage } from '@/settings/storage'
import { DEFAULT_SETTINGS, type Settings } from '@/settings/types'

const DEBOUNCE_MS = 500

export interface UsePersistenceResult {
  settings: Settings
  updateSettings: (patch: Partial<Settings>) => void
  /** The resumed session's memory/marks, present only on the very first
   * render (seeds useExecution's initial state) - undefined if there was
   * nothing to resume. */
  initialMemory: number[] | undefined
  initialMarks: UserMarks | undefined
  /** Called whenever memory/marks change, to (debounced) persist the
   * "resume last session" slice (§11.10). */
  notifySession: (session: SessionState) => void
}

/**
 * Loads persisted settings + the last session synchronously on first
 * render (a lazy useState initializer, guaranteed to run exactly once -
 * avoids a flash of defaults before a subsequent effect could load them),
 * and debounces writes back to storage rather than firing on every bit
 * toggle or Run step (§11.10).
 */
export function usePersistence(): UsePersistenceResult {
  const [initial] = useState(() => {
    const stored = readStorage()
    return stored ? parsePersistedState(stored) : { settings: DEFAULT_SETTINGS, session: null }
  })
  const [settings, setSettings] = useState(initial.settings)
  const settingsRef = useRef(settings)
  const sessionRef = useRef<SessionState | null>(initial.session)
  const timerRef = useRef<number | null>(null)

  const flush = useCallback(() => {
    if (timerRef.current === null) return
    window.clearTimeout(timerRef.current)
    timerRef.current = null
    writeStorage(serializePersistedState({ settings: settingsRef.current, session: sessionRef.current }))
  }, [])

  const scheduleWrite = useCallback(() => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current)
    timerRef.current = window.setTimeout(flush, DEBOUNCE_MS)
  }, [flush])

  // Flush on tab close / navigation, so the debounce window can't silently
  // drop the very last change.
  useEffect(() => {
    window.addEventListener('beforeunload', flush)
    return () => {
      flush()
      window.removeEventListener('beforeunload', flush)
    }
  }, [flush])

  const updateSettings = useCallback(
    (patch: Partial<Settings>) => {
      setSettings((prev) => {
        const next = { ...prev, ...patch }
        settingsRef.current = next
        return next
      })
      scheduleWrite()
    },
    [scheduleWrite],
  )

  const notifySession = useCallback(
    (session: SessionState) => {
      sessionRef.current = session
      scheduleWrite()
    },
    [scheduleWrite],
  )

  return {
    settings,
    updateSettings,
    initialMemory: initial.session?.memory,
    initialMarks: initial.session?.marks,
    notifySession,
  }
}
