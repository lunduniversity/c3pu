import { parseLinesWithComments, type ParseFailure } from '../engine/program-format'
import { MEMORY_SIZE } from '../engine/types'
import { annotationToMark, markToAnnotation, type UserMark, type UserMarks } from './marks'

export interface ProgramFileParseSuccess {
  ok: true
  memory: number[]
  marks: UserMarks
}

export type ProgramFileParseResult = ProgramFileParseSuccess | ParseFailure

/**
 * Parses a whole program file including per-cell marks (webapp-requirements.md
 * §7.1's `%`-annotation grammar - see grid/marks.ts): same line format as
 * engine/program-format.ts's parseProgram, always yielding exactly 256 cells,
 * but a line's `% code`/`% data ...` annotation (if any) also seeds that
 * cell's UserMarks entry. An unrecognized `%` comment (or none at all) simply
 * leaves that cell unmarked, so plain, pre-existing files without any
 * annotations still load identically to before.
 */
export function parseProgramFile(text: string): ProgramFileParseResult {
  const result = parseLinesWithComments(text, MEMORY_SIZE)
  if (!result.ok) return result

  const memory = new Array(MEMORY_SIZE).fill(0)
  const marks: Record<number, UserMark> = {}
  result.entries.forEach((entry, address) => {
    memory[address] = entry.byte
    const mark = annotationToMark(entry.percentComment)
    if (mark) marks[address] = mark
  })

  return { ok: true, memory, marks }
}

/** Serializes memory and marks back to the canonical program text format,
 * appending a `%` annotation to every marked cell's line. Trailing all-zero,
 * unmarked cells are still emitted (one line per cell, always 256 lines),
 * matching engine/program-format.ts's serializeProgram. */
export function serializeProgramFile(memory: readonly number[], marks: UserMarks): string {
  const lines: string[] = new Array(MEMORY_SIZE)
  for (let address = 0; address < MEMORY_SIZE; address++) {
    const byte = (memory[address] ?? 0) & 0xff
    const bits = byte.toString(2).padStart(8, '0')
    const line = `${bits.slice(0, 4)} ${bits.slice(4)}`
    const mark = marks[address]
    lines[address] = mark ? `${line} % ${markToAnnotation(mark)}` : line
  }
  return lines.join('\n')
}
