import { computeEffects, decode } from '../engine/decode'
import { MEMORY_SIZE, REGISTER_NAMES, type Effect, type RegisterName, type Registers } from '../engine/types'

/**
 * The statically-predicted read/write effects of whichever instruction sits
 * at `address` (webapp-requirements.md §3/§5) - or nothing, if there is no
 * address to predict from (e.g. the edit cursor is currently on a register,
 * not a memory cell).
 */
export function predictedEffects(
  memory: readonly number[],
  registers: Registers,
  address: number | null,
): { reads: Effect[]; writes: Effect[] } {
  if (address === null) return { reads: [], writes: [] }
  const instruction = decode(memory, address)
  return computeEffects(instruction, registers)
}

export interface CellHighlight {
  /** Statically predicted to be read if the cursor/PC cell executed now. */
  predictedRead: boolean
  /** Statically predicted to be written if the cursor/PC cell executed now. */
  predictedWrite: boolean
  /** Actually modified by the most recently executed step. */
  actualChange: boolean
  /** Has the edit cursor. */
  isCursor: boolean
  /** Is part of the current range selection. */
  selected: boolean
}

export interface MemoryHighlightInputs {
  predicted: { reads: Effect[]; writes: Effect[] }
  changed: readonly Effect[]
  cursorAddress: number | null
  selection: { start: number; end: number } | null
  /** The memory address the program counter is on, and whether it just
   * halted successfully or errored there - null/false when not executing. */
  programCounterAddress: number | null
  haltedNormallyAt: number | null
  errorAt: number | null
}

export interface MemoryCellHighlight extends CellHighlight {
  isProgramCounter: boolean
  haltedHere: boolean
  errorHere: boolean
}

export function computeMemoryHighlights(inputs: MemoryHighlightInputs): MemoryCellHighlight[] {
  const highlights: MemoryCellHighlight[] = Array.from({ length: MEMORY_SIZE }, () => ({
    predictedRead: false,
    predictedWrite: false,
    actualChange: false,
    isCursor: false,
    selected: false,
    isProgramCounter: false,
    haltedHere: false,
    errorHere: false,
  }))

  for (const effect of inputs.predicted.reads) {
    if (effect.kind === 'memory' && highlights[effect.address]) highlights[effect.address].predictedRead = true
  }
  for (const effect of inputs.predicted.writes) {
    if (effect.kind === 'memory' && highlights[effect.address]) highlights[effect.address].predictedWrite = true
  }
  for (const effect of inputs.changed) {
    if (effect.kind === 'memory' && highlights[effect.address]) highlights[effect.address].actualChange = true
  }
  if (inputs.cursorAddress !== null && highlights[inputs.cursorAddress]) {
    highlights[inputs.cursorAddress].isCursor = true
  }
  if (inputs.selection) {
    const lo = Math.min(inputs.selection.start, inputs.selection.end)
    const hi = Math.max(inputs.selection.start, inputs.selection.end)
    for (let i = lo; i <= hi; i++) {
      if (highlights[i]) highlights[i].selected = true
    }
  }
  if (inputs.programCounterAddress !== null && highlights[inputs.programCounterAddress]) {
    highlights[inputs.programCounterAddress].isProgramCounter = true
  }
  if (inputs.haltedNormallyAt !== null && highlights[inputs.haltedNormallyAt]) {
    highlights[inputs.haltedNormallyAt].haltedHere = true
  }
  if (inputs.errorAt !== null && highlights[inputs.errorAt]) {
    highlights[inputs.errorAt].errorHere = true
  }

  return highlights
}

export interface RegisterHighlightInputs {
  predicted: { reads: Effect[]; writes: Effect[] }
  changed: readonly Effect[]
  cursorRegister: RegisterName | null
  selection: { start: RegisterName; end: RegisterName } | null
}

export function computeRegisterHighlights(inputs: RegisterHighlightInputs): Record<RegisterName, CellHighlight> {
  const highlights = {} as Record<RegisterName, CellHighlight>
  for (const name of REGISTER_NAMES) {
    highlights[name] = { predictedRead: false, predictedWrite: false, actualChange: false, isCursor: false, selected: false }
  }

  for (const effect of inputs.predicted.reads) {
    if (effect.kind === 'register') highlights[effect.name].predictedRead = true
  }
  for (const effect of inputs.predicted.writes) {
    if (effect.kind === 'register') highlights[effect.name].predictedWrite = true
  }
  for (const effect of inputs.changed) {
    if (effect.kind === 'register') highlights[effect.name].actualChange = true
  }
  if (inputs.cursorRegister !== null) highlights[inputs.cursorRegister].isCursor = true
  if (inputs.selection) {
    const loIndex = Math.min(REGISTER_NAMES.indexOf(inputs.selection.start), REGISTER_NAMES.indexOf(inputs.selection.end))
    const hiIndex = Math.max(REGISTER_NAMES.indexOf(inputs.selection.start), REGISTER_NAMES.indexOf(inputs.selection.end))
    for (let i = loIndex; i <= hiIndex; i++) highlights[REGISTER_NAMES[i]].selected = true
  }

  return highlights
}
