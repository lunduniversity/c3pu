import { MEMORY_SIZE } from './types'

export interface ParseSuccess {
  ok: true
  memory: number[]
}

export interface ParseFailure {
  ok: false
  line: number
  message: string
}

export type ParseResult = ParseSuccess | ParseFailure

export interface BytesParseSuccess {
  ok: true
  bytes: number[]
}

export type BytesParseResult = BytesParseSuccess | ParseFailure

/**
 * Parses the canonical binary-lines format (webapp-requirements.md §7.1) into
 * a plain byte array, with no padding/truncation to the 256-cell memory
 * size: one line per byte, 8 binary digits (MSB first), optional internal
 * whitespace (e.g. a "nibble nibble" grouping), and `//`/`#`/`%` line
 * comments. Blank/comment-only lines are skipped entirely (they don't
 * consume a byte). This is the shared parser behind both whole-program
 * files (§7.2) and range copy/paste (§5, via the same text format).
 */
export function parseBytes(text: string, maxBytes: number = Number.POSITIVE_INFINITY): BytesParseResult {
  const bytes: number[] = []
  const lines = text.split(/\r\n|\r|\n/)

  for (let i = 0; i < lines.length; i++) {
    const withoutComment = lines[i].split(/\/\/|#|%/, 1)[0]
    const trimmed = withoutComment.trim()
    if (trimmed.length === 0) continue

    const bits = trimmed.replace(/\s+/g, '')
    if (!/^[01]{8}$/.test(bits)) {
      return { ok: false, line: i + 1, message: `expected 8 binary digits, got "${trimmed}"` }
    }
    if (bytes.length >= maxBytes) {
      return { ok: false, line: i + 1, message: `exceeds ${maxBytes} cells` }
    }
    bytes.push(Number.parseInt(bits, 2))
  }

  return { ok: true, bytes }
}

/** Serializes bytes to the canonical binary-lines format, one line per byte,
 * grouped as two space-separated nibbles for readability. */
export function serializeBytes(bytes: readonly number[]): string {
  return bytes
    .map((byte) => {
      const bits = (byte & 0xff).toString(2).padStart(8, '0')
      return `${bits.slice(0, 4)} ${bits.slice(4)}`
    })
    .join('\n')
}

/**
 * Parses a whole program file (webapp-requirements.md §7.1): same format as
 * parseBytes, but always yields exactly 256 cells (padding unspecified
 * trailing cells with zero) since a full program always replaces the whole
 * memory image.
 */
export function parseProgram(text: string): ParseResult {
  const result = parseBytes(text, MEMORY_SIZE)
  if (!result.ok) return result
  const memory = result.bytes.slice()
  while (memory.length < MEMORY_SIZE) memory.push(0)
  return { ok: true, memory }
}

/** Serializes memory back to the canonical program text format. Trailing
 * all-zero cells are still emitted (one line per cell, always 256 lines) -
 * §7.1 doesn't ask for trimming, and round-tripping stays trivially exact. */
export function serializeProgram(memory: readonly number[]): string {
  const full = new Array(MEMORY_SIZE).fill(0)
  for (let i = 0; i < MEMORY_SIZE; i++) full[i] = memory[i] ?? 0
  return serializeBytes(full)
}
