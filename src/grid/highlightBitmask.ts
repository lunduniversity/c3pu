import type { CellHighlight, MemoryCellHighlight } from './highlight'

/**
 * Flattens the highlight-flags objects from highlight.ts into a single
 * primitive bitmask, so per-row/per-cell React components can be memoized
 * on primitive props (webapp-requirements.md §11.4) instead of on object
 * identity, which would change every render even when nothing about a given
 * cell actually changed.
 */
export const HL_PREDICTED_READ = 1 << 0
export const HL_PREDICTED_WRITE = 1 << 1
export const HL_ACTUAL_CHANGE = 1 << 2
export const HL_CURSOR = 1 << 3
export const HL_SELECTED = 1 << 4
export const HL_PROGRAM_COUNTER = 1 << 5
export const HL_HALTED = 1 << 6
export const HL_ERROR = 1 << 7

export function encodeCellHighlight(h: CellHighlight): number {
  return (
    (h.predictedRead ? HL_PREDICTED_READ : 0) |
    (h.predictedWrite ? HL_PREDICTED_WRITE : 0) |
    (h.actualChange ? HL_ACTUAL_CHANGE : 0) |
    (h.isCursor ? HL_CURSOR : 0) |
    (h.selected ? HL_SELECTED : 0)
  )
}

export function encodeMemoryHighlight(h: MemoryCellHighlight): number {
  return (
    encodeCellHighlight(h) |
    (h.isProgramCounter ? HL_PROGRAM_COUNTER : 0) |
    (h.haltedHere ? HL_HALTED : 0) |
    (h.errorHere ? HL_ERROR : 0)
  )
}
