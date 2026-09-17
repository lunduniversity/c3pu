export const REGISTER_NAMES = ['R0', 'R1', 'R2', 'OP1', 'OP2', 'RES', 'OUT', 'PC'] as const

export type RegisterName = (typeof REGISTER_NAMES)[number]

export type Registers = Record<RegisterName, number>

export const MNEMONICS = [
  'NOP',
  'ADD',
  'SUB',
  'INC',
  'CPY',
  'LD',
  'LDA',
  'ST',
  'STA',
  'JMP',
  'CJP',
  'PRT',
  'PRD',
  'PRL',
  'HLT',
] as const

export type Mnemonic = (typeof MNEMONICS)[number]

/** Comparison operators available to CJP. */
export const COMPARATORS = ['=', '≠', '<', '>', '≤', '≥'] as const
export type Comparator = (typeof COMPARATORS)[number]

/**
 * CJP's comparator-code encoding is this reimplementation's own choice: of the
 * six 4-bit codes, only code 3 ("not equal") is forced by the bundled example
 * fixtures (docs/examples/segfault.txt only produces its documented
 * self-modifying-code crash under that assignment). The other five codes are
 * never exercised by any fixture in a way that distinguishes one ordering
 * from another, so this table is a free (but now fixed) design choice.
 */
export const COMPARATOR_BY_CODE: Record<number, Comparator> = {
  0: '=',
  1: '<',
  2: '>',
  3: '≠',
  4: '≤',
  5: '≥',
}

export type Effect = { kind: 'memory'; address: number } | { kind: 'register'; name: RegisterName }

export type RuntimeErrorKind = 'invalid-instruction' | 'invalid-register' | 'stuck-program' | 'step-cap'

export interface RuntimeError {
  kind: RuntimeErrorKind
  message: string
  address: number
}

export type HaltReason = 'normal' | 'end-of-memory'

export const MEMORY_SIZE = 256

export function createRegisters(): Registers {
  return { R0: 0, R1: 0, R2: 0, OP1: 0, OP2: 0, RES: 0, OUT: 0, PC: 0 }
}

export function createMemory(): number[] {
  return new Array(MEMORY_SIZE).fill(0)
}

export function wrap8(value: number): number {
  return ((value % 256) + 256) % 256
}
