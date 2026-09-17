/**
 * The 128-character ASCII table (webapp-requirements.md §8.3's reference
 * panel, and shared by the memory grid's ASCII column). Lives outside
 * src/engine and src/grid since it's used by both the grid (Phase 2) and
 * the standalone ASCII reference panel (Phase 5).
 */
export type AsciiCategory = 'control' | 'digit' | 'uppercase' | 'lowercase' | 'punctuation'

export interface AsciiEntry {
  code: number
  /** The literal character for a printable code; a short mnemonic (e.g.
   * "NUL", "BEL") for a control code. Always safe to render as text. */
  label: string
  category: AsciiCategory
}

const CONTROL_LABELS: Record<number, string> = {
  0: 'NUL',
  1: 'SOH',
  2: 'STX',
  3: 'ETX',
  4: 'EOT',
  5: 'ENQ',
  6: 'ACK',
  7: 'BEL',
  8: 'BS',
  9: 'HT',
  10: 'LF',
  11: 'VT',
  12: 'FF',
  13: 'CR',
  14: 'SO',
  15: 'SI',
  16: 'DLE',
  17: 'DC1',
  18: 'DC2',
  19: 'DC3',
  20: 'DC4',
  21: 'NAK',
  22: 'SYN',
  23: 'ETB',
  24: 'CAN',
  25: 'EM',
  26: 'SUB',
  27: 'ESC',
  28: 'FS',
  29: 'GS',
  30: 'RS',
  31: 'US',
  127: 'DEL',
}

function categoryOf(code: number): AsciiCategory {
  if (code === 127 || code < 32) return 'control'
  if (code >= 48 && code <= 57) return 'digit'
  if (code >= 65 && code <= 90) return 'uppercase'
  if (code >= 97 && code <= 122) return 'lowercase'
  return 'punctuation'
}

export const ASCII_TABLE: readonly AsciiEntry[] = Array.from({ length: 128 }, (_, code) => ({
  code,
  label: CONTROL_LABELS[code] ?? String.fromCharCode(code),
  category: categoryOf(code),
}))

/** Display info for any byte 0-255 (the grid covers the full byte range,
 * not just standard 7-bit ASCII). */
export function asciiDisplay(byte: number): { label: string; category: AsciiCategory | 'non-ascii' } {
  if (byte < 0 || byte > 255) throw new RangeError(`byte out of range: ${byte}`)
  if (byte > 127) return { label: `\\x${byte.toString(16).padStart(2, '0')}`, category: 'non-ascii' }
  const entry = ASCII_TABLE[byte]
  return { label: entry.label, category: entry.category }
}
