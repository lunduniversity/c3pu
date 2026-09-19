import type { CpuState } from '@/engine/cpu'
import { createRegisters, type HaltReason, type RuntimeError } from '@/engine/types'
import { createGridState, type GridState } from '@/grid/model'
import type { UserMarks } from '@/grid/marks'

/**
 * The whole app's editable state: GridState (memory/registers/marks - what
 * the bit-editor grid edits) plus the engine's execution status. Kept as one
 * extension of GridState (rather than a separate parallel copy of
 * memory/registers) so there is exactly one source of truth for what's
 * currently in memory and the registers, whether it got there by hand-editing
 * or by running the program.
 */
export interface AppState extends GridState {
  halted: boolean
  haltReason: HaltReason | null
  error: RuntimeError | null
  /** True once Step or Run has executed at least one instruction since the
   * last Reset/edit-from-scratch - see toPredictionSource() below. */
  hasExecutionStarted: boolean
}

export function createAppState(memory?: readonly number[], marks?: UserMarks): AppState {
  const grid = createGridState(memory)
  return { ...grid, marks: marks ?? grid.marks, halted: false, haltReason: null, error: null, hasExecutionStarted: false }
}

export function toCpuState(state: AppState): CpuState {
  return { memory: state.memory, registers: state.registers, halted: state.halted, haltReason: state.haltReason, error: state.error }
}

export function mergeCpuState(state: AppState, cpu: CpuState): AppState {
  return { ...state, memory: cpu.memory, registers: cpu.registers, halted: cpu.halted, haltReason: cpu.haltReason, error: cpu.error }
}

/** Reset (webapp-requirements.md §4): zero all registers (including PC) and
 * clear any halted state, but leave memory untouched. */
export function resetExecution(state: AppState): AppState {
  return { ...state, registers: createRegisters(), halted: false, haltReason: null, error: null, hasExecutionStarted: false }
}
