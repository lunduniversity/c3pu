import type { Mnemonic } from '@/engine/types'

/**
 * The plain-language instruction reference content (webapp-requirements.md
 * §3/§8.2) - kept as data, separate from decode.ts's structural decoding, so
 * the reference panel's prose can be edited freely without touching engine
 * logic, and vice versa.
 */
export interface InstructionReferenceEntry {
  mnemonic: Mnemonic
  /** How CPY is displayed depends on its move bit - MOV is a rendering of
   * the same mnemonic, not a separate one, so it's called out here rather
   * than given its own entry. */
  alsoRenderedAs?: string
  cells: 1 | 2
  operand: string
  behavior: string
  purpose: string
}

export const INSTRUCTION_REFERENCE: readonly InstructionReferenceEntry[] = [
  {
    mnemonic: 'NOP',
    cells: 1,
    operand: 'unused',
    behavior: 'Does nothing.',
    purpose:
      'Lets a student "comment out" an instruction without shifting every later address - a deliberate placeholder byte.',
  },
  {
    mnemonic: 'ADD',
    cells: 1,
    operand: 'unused',
    behavior: 'RES = OP1 + OP2 (wraps mod 256).',
    purpose: 'ALU addition via fixed operand/result registers.',
  },
  {
    mnemonic: 'SUB',
    cells: 1,
    operand: 'unused',
    behavior: 'RES = OP1 - OP2 (wraps mod 256).',
    purpose: 'ALU subtraction, same convention as ADD.',
  },
  {
    mnemonic: 'INC',
    cells: 1,
    operand: 'register index',
    behavior: 'reg = reg + 1 (wraps mod 256).',
    purpose: 'Counters and loop variables.',
  },
  {
    mnemonic: 'CPY',
    alsoRenderedAs: 'MOV',
    cells: 2,
    operand: 'low bit: copy (0) vs move (1); next cell: src/dst register nibbles',
    behavior: 'dst = src; if "move", src is then zeroed.',
    purpose:
      'Register-to-register data movement; teaches copy vs. move. Shown as MOV instead of CPY whenever the move bit is set.',
  },
  {
    mnemonic: 'LD',
    cells: 2,
    operand: 'destination register; next cell: literal value',
    behavior: 'reg = <literal>.',
    purpose: 'Load an immediate constant into a register.',
  },
  {
    mnemonic: 'LDA',
    cells: 2,
    operand: 'unused; next cell: src/dst register nibbles',
    behavior: 'dst = memory[value of src register].',
    purpose: 'Indirect load - treats a register’s value as a pointer/address.',
  },
  {
    mnemonic: 'ST',
    cells: 2,
    operand: 'source register; next cell: literal address',
    behavior: 'memory[<literal address>] = reg.',
    purpose: 'Store a register to a fixed, literal memory address.',
  },
  {
    mnemonic: 'STA',
    cells: 2,
    operand: 'unused; next cell: src/dst register nibbles',
    behavior: 'memory[value of dst register] = value of src register.',
    purpose: 'Indirect store - dst register is a pointer; pairs with LDA.',
  },
  {
    mnemonic: 'JMP',
    cells: 1,
    operand: 'register index',
    behavior: 'PC = value of register.',
    purpose: 'Unconditional jump to a computed (register-held) address.',
  },
  {
    mnemonic: 'CJP',
    cells: 2,
    operand: 'comparison operator (=, ≠, <, >, ≤, ≥); next cell: two register nibbles (left/right operands)',
    behavior: 'If "left <op> right" is true, PC = RES (the jump target is always read from RES); otherwise falls through.',
    purpose: 'The only branching instruction - conditional control flow.',
  },
  {
    mnemonic: 'PRT',
    cells: 1,
    operand: 'unused',
    behavior: 'Prints OUT as one ASCII character.',
    purpose: 'Character output.',
  },
  {
    mnemonic: 'PRD',
    cells: 1,
    operand: 'unused',
    behavior: 'Prints OUT as a decimal number.',
    purpose: 'Numeric output, visually distinct from character output in the console.',
  },
  {
    mnemonic: 'PRL',
    cells: 1,
    operand: 'unused',
    behavior:
      'Prints the byte at address OP1 as a character (and mirrors it into OUT). If OP1 < OP2, increments OP1 by 1 and re-executes this same instruction on the next step (PC does not advance); once OP1 ≥ OP2, advances PC past itself instead.',
    purpose: '"Print loop" - prints a whole run of memory as text, one character per step, without explicit loop-control instructions.',
  },
  {
    mnemonic: 'HLT',
    cells: 1,
    operand: 'unused',
    behavior: 'Stops execution (does not advance PC further); emits a trailing newline to output.',
    purpose: 'Explicit, successful end of program.',
  },
]
