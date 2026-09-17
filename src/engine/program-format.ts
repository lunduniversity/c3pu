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

/**
 * Parses the canonical program text format (webapp-requirements.md §7.1):
 * one line per memory cell, 8 binary digits (MSB first), optional internal
 * whitespace (e.g. a "nibble nibble" grouping), and `//`/`#`/`%` line
 * comments. Blank/comment-only lines are skipped entirely (they don't
 * consume a memory cell).
 */
export function parseProgram(text: string): ParseResult {
  const memory: number[] = []
  const lines = text.split(/\r\n|\r|\n/)

  for (let i = 0; i < lines.length; i++) {
    const withoutComment = lines[i].split(/\/\/|#|%/, 1)[0]
    const trimmed = withoutComment.trim()
    if (trimmed.length === 0) continue

    const bits = trimmed.replace(/\s+/g, '')
    if (!/^[01]{8}$/.test(bits)) {
      return { ok: false, line: i + 1, message: `expected 8 binary digits, got "${trimmed}"` }
    }
    if (memory.length >= MEMORY_SIZE) {
      return { ok: false, line: i + 1, message: `program exceeds ${MEMORY_SIZE} memory cells` }
    }
    memory.push(Number.parseInt(bits, 2))
  }

  while (memory.length < MEMORY_SIZE) memory.push(0)

  return { ok: true, memory }
}

/** Serializes memory back to the canonical program text format. Trailing
 * all-zero cells are still emitted (one line per cell, always 256 lines) -
 * §7.1 doesn't ask for trimming, and round-tripping stays trivially exact. */
export function serializeProgram(memory: readonly number[]): string {
  const lines: string[] = []
  for (let i = 0; i < MEMORY_SIZE; i++) {
    const byte = memory[i] ?? 0
    const bits = byte.toString(2).padStart(8, '0')
    lines.push(`${bits.slice(0, 4)} ${bits.slice(4)}`)
  }
  return lines.join('\n')
}
