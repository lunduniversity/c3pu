import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MEMORY_SIZE } from '@/engine/types'
import { serializePersistedState } from '@/settings/persistence'
import { readStorage } from '@/settings/storage'
import { DEFAULT_SETTINGS } from '@/settings/types'
import { usePersistence } from '../usePersistence'

describe('usePersistence', () => {
  beforeEach(() => {
    window.localStorage.clear()
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('loads default settings and no session when storage is empty', () => {
    const { result } = renderHook(() => usePersistence())
    expect(result.current.settings).toEqual(DEFAULT_SETTINGS)
    expect(result.current.initialMemory).toBeUndefined()
    expect(result.current.initialMarks).toBeUndefined()
  })

  it('loads a previously-saved settings + session blob on init', () => {
    const memory = new Array(MEMORY_SIZE).fill(0)
    memory[3] = 42
    const settings = { ...DEFAULT_SETTINGS, autoAdvance: true }
    window.localStorage.setItem(
      'c3pu:state:v1',
      serializePersistedState({ settings, session: { memory, marks: { 3: { kind: 'code' } } } }),
    )
    const { result } = renderHook(() => usePersistence())
    expect(result.current.settings.autoAdvance).toBe(true)
    expect(result.current.initialMemory).toEqual(memory)
    expect(result.current.initialMarks).toEqual({ 3: { kind: 'code' } })
  })

  it('does not write to storage synchronously on updateSettings - it debounces', () => {
    const { result } = renderHook(() => usePersistence())
    act(() => result.current.updateSettings({ autoAdvance: true }))
    expect(readStorage()).toBeNull()

    act(() => vi.advanceTimersByTime(600))
    const stored = readStorage()
    expect(stored).not.toBeNull()
    expect(JSON.parse(stored!).settings.autoAdvance).toBe(true)
  })

  it('coalesces rapid successive updates into a single write', () => {
    const { result } = renderHook(() => usePersistence())
    act(() => {
      result.current.updateSettings({ stepDelayMs: 100 })
      result.current.updateSettings({ stepDelayMs: 200 })
      result.current.updateSettings({ stepDelayMs: 300 })
    })
    act(() => vi.advanceTimersByTime(600))
    const stored = JSON.parse(readStorage()!)
    expect(stored.settings.stepDelayMs).toBe(300)
  })

  it('persists a session via notifySession, debounced the same way', () => {
    const { result } = renderHook(() => usePersistence())
    const memory = new Array(MEMORY_SIZE).fill(0)
    memory[0] = 7
    act(() => result.current.notifySession({ memory, marks: {} }))
    expect(readStorage()).toBeNull()

    act(() => vi.advanceTimersByTime(600))
    const stored = JSON.parse(readStorage()!)
    expect(stored.session).not.toBeNull()
  })

  it('flushes a pending write immediately on beforeunload', () => {
    const { result } = renderHook(() => usePersistence())
    act(() => result.current.updateSettings({ autoAdvance: true }))
    expect(readStorage()).toBeNull()

    act(() => window.dispatchEvent(new Event('beforeunload')))
    expect(readStorage()).not.toBeNull()
  })
})
