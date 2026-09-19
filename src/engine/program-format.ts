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

export interface LineEntry {
  byte: number
  /** The trimmed text following a `%` marker on this line, or `''` if there
   * was none (or the line's comment used `//`/`#` instead). A higher layer
   * (e.g. grid/marks.ts's cell-interpretation annotations) interprets this
   * text against its own grammar - this module only knows it's a comment. */
  percentComment: string
}

export interface LinesParseSuccess {
  ok: true
  entries: LineEntry[]
}

export type LinesParseResult = LinesParseSuccess | ParseFailure

/**
 * Parses the canonical binary-lines format (webapp-requirements.md §7.1):
 * one line per byte, 8 binary digits (MSB first), optional internal
 * whitespace (e.g. a "nibble nibble" grouping), and `//`/`#`/`%` line
 * comments. Blank/comment-only lines are skipped entirely (they don't
 * consume a byte). Also surfaces each line's `%`-comment text (if any) as
 * `percentComment`, since a `%` comment (unlike `//`/`#`) can carry a
 * higher layer's own annotation grammar (see LineEntry) - this is the
 * shared parser behind whole-program files (§7.2), range copy/paste (§5),
 * and per-cell mark annotations.
 */
export function parseLinesWithComments(text: string, maxBytes: number = Number.POSITIVE_INFINITY): LinesParseResult {
  const entries: LineEntry[] = []
  const lines = text.split(/\r\n|\r|\n/)

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const match = line.match(/\/\/|#|%/)
    const withoutComment = match ? line.slice(0, match.index) : line
    const percentComment = match?.[0] === '%' ? line.slice((match.index ?? 0) + 1).trim() : ''
    const trimmed = withoutComment.trim()
    if (trimmed.length === 0) continue

    const bits = trimmed.replace(/\s+/g, '')
    if (!/^[01]{8}$/.test(bits)) {
      return { ok: false, line: i + 1, message: `expected 8 binary digits, got "${trimmed}"` }
    }
    if (entries.length >= maxBytes) {
      return { ok: false, line: i + 1, message: `exceeds ${maxBytes} cells` }
    }
    entries.push({ byte: Number.parseInt(bits, 2), percentComment })
  }

  return { ok: true, entries }
}

/**
 * Parses the canonical binary-lines format into a plain byte array, with no
 * padding/truncation to the 256-cell memory size - the shared parser behind
 * both whole-program files (§7.2) and range copy/paste (§5). Comment text is
 * discarded; use parseLinesWithComments directly to keep it.
 */
export function parseBytes(text: string, maxBytes: number = Number.POSITIVE_INFINITY): BytesParseResult {
  const result = parseLinesWithComments(text, maxBytes)
  if (!result.ok) return result
  return { ok: true, bytes: result.entries.map((entry) => entry.byte) }
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
