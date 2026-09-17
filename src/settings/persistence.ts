import { MEMORY_SIZE } from '@/engine/types'
import type { DataRepresentation, UserMark, UserMarks } from '@/grid/marks'
import { exportSnapshot, importSnapshot } from '@/snapshot/codec'
import { DEFAULT_SETTINGS, MAX_ZOOM_PERCENT, MIN_ZOOM_PERCENT, type Settings } from './types'

/**
 * Serializes the persisted-preferences slice (§9) together with the
 * "resume last session" slice (§11.10: memory + marks, reusing the §7.3
 * snapshot format rather than inventing a new encoding) into one JSON blob.
 * Registers and execution status are deliberately not part of the session
 * slice - reloading always starts from a fresh, non-halted execution
 * context, which is simpler to reason about than resuming mid-run.
 */
export interface SessionState {
  memory: number[]
  marks: UserMarks
}

export interface PersistedState {
  settings: Settings
  session: SessionState | null
}

const CURRENT_VERSION = 1

export function serializePersistedState(state: PersistedState): string {
  return JSON.stringify({
    version: CURRENT_VERSION,
    settings: state.settings,
    session: state.session ? { memorySnapshot: exportSnapshot(state.session.memory), marks: state.session.marks } : null,
  })
}

function isDataRepresentation(value: unknown): value is DataRepresentation {
  return value === 'binary' || value === 'hex' || value === 'decimal' || value === 'ascii'
}

function isUserMark(value: unknown): value is UserMark {
  if (typeof value !== 'object' || value === null) return false
  const mark = value as Record<string, unknown>
  if (mark.kind === 'code') return true
  if (mark.kind === 'data') return isDataRepresentation(mark.representation)
  return false
}

function parseMarks(value: unknown): UserMarks | null {
  if (typeof value !== 'object' || value === null) return null
  const marks: Record<number, UserMark> = {}
  for (const [key, mark] of Object.entries(value)) {
    const address = Number(key)
    if (!Number.isInteger(address) || address < 0 || address >= MEMORY_SIZE) return null
    if (!isUserMark(mark)) return null
    marks[address] = mark
  }
  return marks
}

function parseSettings(value: unknown): Settings {
  if (typeof value !== 'object' || value === null) return DEFAULT_SETTINGS
  const raw = value as Record<string, unknown>
  const panelOpenRaw = (typeof raw.panelOpen === 'object' && raw.panelOpen !== null ? raw.panelOpen : {}) as Record<string, unknown>

  return {
    stepDelayMs: typeof raw.stepDelayMs === 'number' && raw.stepDelayMs > 0 ? raw.stepDelayMs : DEFAULT_SETTINGS.stepDelayMs,
    autoAdvance: typeof raw.autoAdvance === 'boolean' ? raw.autoAdvance : DEFAULT_SETTINGS.autoAdvance,
    panelOpen: {
      userGuide: typeof panelOpenRaw.userGuide === 'boolean' ? panelOpenRaw.userGuide : DEFAULT_SETTINGS.panelOpen.userGuide,
      instructionReference:
        typeof panelOpenRaw.instructionReference === 'boolean'
          ? panelOpenRaw.instructionReference
          : DEFAULT_SETTINGS.panelOpen.instructionReference,
      asciiTable: typeof panelOpenRaw.asciiTable === 'boolean' ? panelOpenRaw.asciiTable : DEFAULT_SETTINGS.panelOpen.asciiTable,
    },
    zoomPercent:
      typeof raw.zoomPercent === 'number' && raw.zoomPercent >= MIN_ZOOM_PERCENT && raw.zoomPercent <= MAX_ZOOM_PERCENT
        ? raw.zoomPercent
        : DEFAULT_SETTINGS.zoomPercent,
    lastFileName: typeof raw.lastFileName === 'string' ? raw.lastFileName : null,
  }
}

/** Never throws: any malformed/foreign/corrupted stored text falls back to
 * default settings and no resumed session, rather than crashing the app. */
export function parsePersistedState(text: string): PersistedState {
  try {
    const parsed = JSON.parse(text) as Record<string, unknown>
    const settings = parseSettings(parsed.settings)

    let session: SessionState | null = null
    const sessionRaw = parsed.session as Record<string, unknown> | null | undefined
    if (sessionRaw && typeof sessionRaw.memorySnapshot === 'string') {
      const snapshot = importSnapshot(sessionRaw.memorySnapshot)
      const marks = parseMarks(sessionRaw.marks)
      if (snapshot.ok && marks) session = { memory: snapshot.memory, marks }
    }

    return { settings, session }
  } catch {
    return { settings: DEFAULT_SETTINGS, session: null }
  }
}
