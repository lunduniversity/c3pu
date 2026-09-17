import { parseBytes, serializeBytes } from '../engine/program-format'

/**
 * Copy/paste round-trips a selection through the same plain-text binary
 * format used for program files (webapp-requirements.md §5, §7.1), via the
 * native copy/paste DOM events rather than navigator.clipboard (§11.3) - so
 * this module only handles the text <-> bytes conversion; wiring it to the
 * `copy`/`paste` events happens in the grid component.
 */
export function serializeSelection(memory: readonly number[], start: number, end: number): string {
  const lo = Math.min(start, end)
  const hi = Math.max(start, end)
  return serializeBytes(memory.slice(lo, hi + 1))
}

export const parseClipboardText = parseBytes
