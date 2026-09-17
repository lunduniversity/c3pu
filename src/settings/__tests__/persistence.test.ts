import { describe, expect, it } from 'vitest'
import { MEMORY_SIZE } from '@/engine/types'
import { DEFAULT_SETTINGS } from '../types'
import { parsePersistedState, serializePersistedState } from '../persistence'

describe('serializePersistedState / parsePersistedState', () => {
  it('round-trips settings with no session', () => {
    const settings = { ...DEFAULT_SETTINGS, stepDelayMs: 500, autoAdvance: true, zoomPercent: 125, lastFileName: 'a.txt' }
    const text = serializePersistedState({ settings, session: null })
    const result = parsePersistedState(text)
    expect(result.settings).toEqual(settings)
    expect(result.session).toBeNull()
  })

  it('round-trips a session (memory + marks) via the snapshot codec', () => {
    const memory = new Array(MEMORY_SIZE).fill(0)
    memory[0] = 0b01010110
    memory[10] = 72
    const marks = { 0: { kind: 'code' as const } }
    const text = serializePersistedState({ settings: DEFAULT_SETTINGS, session: { memory, marks } })
    const result = parsePersistedState(text)
    expect(result.session?.memory).toEqual(memory)
    expect(result.session?.marks).toEqual(marks)
  })

  it('round-trips a data mark with its representation', () => {
    const memory = new Array(MEMORY_SIZE).fill(0)
    const marks = { 5: { kind: 'data' as const, representation: 'hex' as const } }
    const text = serializePersistedState({ settings: DEFAULT_SETTINGS, session: { memory, marks } })
    const result = parsePersistedState(text)
    expect(result.session?.marks).toEqual(marks)
  })

  it('falls back to defaults for completely malformed text, without throwing', () => {
    const result = parsePersistedState('not json at all {{{')
    expect(result.settings).toEqual(DEFAULT_SETTINGS)
    expect(result.session).toBeNull()
  })

  it('falls back to default settings field-by-field when the shape is partially wrong', () => {
    const result = parsePersistedState(JSON.stringify({ settings: { stepDelayMs: 'not a number', autoAdvance: true } }))
    expect(result.settings.stepDelayMs).toBe(DEFAULT_SETTINGS.stepDelayMs)
    expect(result.settings.autoAdvance).toBe(true)
  })

  it('rejects an out-of-range zoom level in favor of the default', () => {
    const result = parsePersistedState(JSON.stringify({ settings: { zoomPercent: 9999 } }))
    expect(result.settings.zoomPercent).toBe(DEFAULT_SETTINGS.zoomPercent)
  })

  it('discards a session with a corrupted snapshot rather than importing garbage memory', () => {
    const result = parsePersistedState(JSON.stringify({ session: { memorySnapshot: 'garbage', marks: {} } }))
    expect(result.session).toBeNull()
  })

  it('discards a session with malformed marks even if the memory snapshot is valid', () => {
    const memory = new Array(MEMORY_SIZE).fill(0)
    const validSnapshotOnly = serializePersistedState({ settings: DEFAULT_SETTINGS, session: { memory, marks: {} } })
    const parsed = JSON.parse(validSnapshotOnly)
    parsed.session.marks = { 0: { kind: 'not-a-real-kind' } }
    const result = parsePersistedState(JSON.stringify(parsed))
    expect(result.session).toBeNull()
  })

  it('treats a missing top-level "session" key the same as no session', () => {
    const result = parsePersistedState(JSON.stringify({ settings: DEFAULT_SETTINGS }))
    expect(result.session).toBeNull()
  })
})
