/**
 * The persisted-preferences slice (webapp-requirements.md §9): small, flat,
 * and independently serializable, kept separate from ephemeral UI state
 * (current selection, scroll position, the undo/redo stack) that is never a
 * persistence candidate (§11.10).
 */
export interface PanelOpenSettings {
  userGuide: boolean
  instructionReference: boolean
  asciiTable: boolean
}

export interface Settings {
  stepDelayMs: number
  autoAdvance: boolean
  panelOpen: PanelOpenSettings
  zoomPercent: number
  lastFileName: string | null
}

export const DEFAULT_STEP_DELAY_MS = 200
export const MIN_ZOOM_PERCENT = 50
export const MAX_ZOOM_PERCENT = 200

export const DEFAULT_SETTINGS: Settings = {
  stepDelayMs: DEFAULT_STEP_DELAY_MS,
  autoAdvance: false,
  panelOpen: { userGuide: false, instructionReference: false, asciiTable: false },
  zoomPercent: 100,
  lastFileName: null,
}
