import { type CpuState, createInitialState } from '../cpu'
import { type Registers } from '../types'

/** Register index encoding, per §2's listed order (verified against the
 * bundled example programs - see docs/examples/*.txt). */
export const REG = { R0: 0, R1: 1, R2: 2, OP1: 3, OP2: 4, RES: 5, OUT: 6, PC: 7 } as const

/** Opcode encoding, per §3's table row order (verified against the bundled
 * example programs - see docs/examples/*.txt). */
export const OP = {
  NOP: 0,
  ADD: 1,
  SUB: 2,
  INC: 3,
  CPY: 4,
  LD: 5,
  LDA: 6,
  ST: 7,
  STA: 8,
  JMP: 9,
  CJP: 10,
  PRT: 11,
  PRD: 12,
  PRL: 13,
  HLT: 14,
  INVALID: 15,
} as const

/** CJP comparator codes, per this reimplementation's own encoding
 * (types.ts's COMPARATOR_BY_CODE) - only code 3 ("not equal") is forced by
 * the example fixtures; the rest are this project's free choice. */
export const CMP = { EQ: 0, LT: 1, GT: 2, NE: 3, LE: 4, GE: 5 } as const

export function byte(opcode: number, operand: number): number {
  return ((opcode << 4) | (operand & 0xf)) & 0xff
}

export function nibbles(hi: number, lo: number): number {
  return ((hi << 4) | (lo & 0xf)) & 0xff
}

export function stateWithMemory(bytes: readonly number[], registers: Partial<Registers> = {}): CpuState {
  const state = createInitialState(bytes)
  Object.assign(state.registers, registers)
  return state
}
