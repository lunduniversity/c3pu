import {
  COMPARATOR_BY_CODE,
  type Effect,
  MNEMONICS,
  type Mnemonic,
  REGISTER_NAMES,
  type RegisterName,
  type Registers,
  type RuntimeErrorKind,
} from './types'

/** Table row order from webapp-requirements.md §3; opcode 15 has no mnemonic. */
const OPCODE_TABLE: readonly Mnemonic[] = MNEMONICS

const TWO_CELL_MNEMONICS = new Set<Mnemonic>(['CPY', 'LD', 'LDA', 'ST', 'STA', 'CJP'])

function registerName(index: number): RegisterName | null {
  return index >= 0 && index < REGISTER_NAMES.length ? REGISTER_NAMES[index] : null
}

export interface DecodedInstruction {
  address: number
  length: 1 | 2
  opcode: number
  operand: number
  /** Raw second byte, present only for 2-cell instructions. */
  extra: number | null
  mnemonic: Mnemonic | null
  /** Set when the opcode is unrecognized, or recognized but an embedded
   * register index (or, for CJP, comparator code) is out of range. The
   * instruction still has a well-defined length, but executing it is a
   * runtime error. */
  invalidReason: { kind: RuntimeErrorKind; message: string } | null
  describe(): string
}

function invalidRegister(index: number): { kind: RuntimeErrorKind; message: string } {
  return { kind: 'invalid-register', message: `register index ${index} is out of range (valid: 0-7)` }
}

export function decode(memory: readonly number[], address: number): DecodedInstruction {
  const byte = memory[address] ?? 0
  const opcode = byte >> 4
  const operand = byte & 0xf
  const mnemonic = OPCODE_TABLE[opcode] ?? null
  const length: 1 | 2 = mnemonic !== null && TWO_CELL_MNEMONICS.has(mnemonic) ? 2 : 1
  const extra = length === 2 ? (memory[address + 1] ?? 0) : null

  let invalidReason: { kind: RuntimeErrorKind; message: string } | null = null
  if (mnemonic === null) {
    invalidReason = {
      kind: 'invalid-instruction',
      message: `opcode ${opcode} does not correspond to any instruction`,
    }
  } else {
    invalidReason = checkInvalidReason(mnemonic, operand, extra)
  }

  return {
    address,
    length,
    opcode,
    operand,
    extra,
    mnemonic,
    invalidReason,
    describe(): string {
      return describeInstruction(mnemonic, operand, extra, invalidReason)
    },
  }
}

function checkInvalidReason(
  mnemonic: Mnemonic,
  operand: number,
  extra: number | null,
): { kind: RuntimeErrorKind; message: string } | null {
  switch (mnemonic) {
    case 'INC':
    case 'JMP':
    case 'ST':
    case 'LD': {
      return registerName(operand) === null ? invalidRegister(operand) : null
    }
    case 'CPY':
    case 'LDA':
    case 'STA': {
      const hi = (extra ?? 0) >> 4
      const lo = (extra ?? 0) & 0xf
      if (registerName(hi) === null) return invalidRegister(hi)
      if (registerName(lo) === null) return invalidRegister(lo)
      return null
    }
    case 'CJP': {
      const hi = (extra ?? 0) >> 4
      const lo = (extra ?? 0) & 0xf
      if (!(operand in COMPARATOR_BY_CODE)) {
        return {
          kind: 'invalid-instruction',
          message: `comparison operator code ${operand} is not one of the 6 valid operators`,
        }
      }
      if (registerName(hi) === null) return invalidRegister(hi)
      if (registerName(lo) === null) return invalidRegister(lo)
      return null
    }
    default:
      return null
  }
}

function describeInstruction(
  mnemonic: Mnemonic | null,
  operand: number,
  extra: number | null,
  invalidReason: { kind: RuntimeErrorKind; message: string } | null,
): string {
  if (mnemonic === null) {
    return `INVALID (opcode ${operand >> 4})`
  }
  const hi = (extra ?? 0) >> 4
  const lo = (extra ?? 0) & 0xf
  const regOrRaw = (n: number) => registerName(n) ?? `#${n}`

  switch (mnemonic) {
    case 'NOP':
      return 'NOP'
    case 'ADD':
      return 'ADD (RES = OP1 + OP2)'
    case 'SUB':
      return 'SUB (RES = OP1 - OP2)'
    case 'INC':
      return `INC ${regOrRaw(operand)}`
    case 'CPY': {
      const move = (operand & 1) === 1
      return `${move ? 'MOV' : 'CPY'} (${regOrRaw(hi)} → ${regOrRaw(lo)})`
    }
    case 'LD':
      return `LD ${regOrRaw(operand)}, ${extra ?? 0}`
    case 'LDA':
      return `LDA (mem[${regOrRaw(hi)}] → ${regOrRaw(lo)})`
    case 'ST':
      return `ST ${regOrRaw(operand)} → mem[${extra ?? 0}]`
    case 'STA':
      return `STA ${regOrRaw(hi)} → mem[${regOrRaw(lo)}]`
    case 'JMP':
      return `JMP ${regOrRaw(operand)}`
    case 'CJP': {
      const cmp = COMPARATOR_BY_CODE[operand] ?? `?${operand}`
      return `CJP ${regOrRaw(hi)} ${cmp} ${regOrRaw(lo)} → RES`
    }
    case 'PRT':
      return 'PRT (print OUT as char)'
    case 'PRD':
      return 'PRD (print OUT as decimal)'
    case 'PRL':
      return 'PRL (print mem[OP1], loop to OP2)'
    case 'HLT':
      return 'HLT'
    default:
      return invalidReason?.message ?? mnemonic
  }
}

/**
 * Statically computes which memory cells / registers this instruction would
 * read from and write to if executed right now, without executing it. Used
 * both for predictive highlighting (webapp-requirements.md §5) and, via the
 * same decode, by the executor itself, so the two can never drift apart.
 *
 * Returns empty reads/writes for an instruction with no mnemonic or an
 * invalidReason - there is nothing safe to predict for those.
 */
export function computeEffects(instruction: DecodedInstruction, registers: Registers): { reads: Effect[]; writes: Effect[] } {
  const { mnemonic, operand, extra, invalidReason } = instruction
  if (mnemonic === null || invalidReason !== null) {
    return { reads: [], writes: [] }
  }
  const hi = (extra ?? 0) >> 4
  const lo = (extra ?? 0) & 0xf
  const reg = (name: RegisterName): Effect => ({ kind: 'register', name })
  const mem = (address: number): Effect => ({ kind: 'memory', address })

  switch (mnemonic) {
    case 'NOP':
      return { reads: [], writes: [] }
    case 'ADD':
    case 'SUB':
      return { reads: [reg('OP1'), reg('OP2')], writes: [reg('RES')] }
    case 'INC': {
      const r = REGISTER_NAMES[operand]
      return { reads: [reg(r)], writes: [reg(r)] }
    }
    case 'CPY': {
      const move = (operand & 1) === 1
      const src = REGISTER_NAMES[hi]
      const dst = REGISTER_NAMES[lo]
      return { reads: [reg(src)], writes: move ? [reg(dst), reg(src)] : [reg(dst)] }
    }
    case 'LD': {
      const dst = REGISTER_NAMES[operand]
      return { reads: [], writes: [reg(dst)] }
    }
    case 'LDA': {
      const src = REGISTER_NAMES[hi]
      const dst = REGISTER_NAMES[lo]
      return { reads: [reg(src), mem(registers[src])], writes: [reg(dst)] }
    }
    case 'ST': {
      const src = REGISTER_NAMES[operand]
      const address = extra ?? 0
      return { reads: [reg(src)], writes: [mem(address)] }
    }
    case 'STA': {
      const src = REGISTER_NAMES[hi]
      const dst = REGISTER_NAMES[lo]
      return { reads: [reg(src), reg(dst)], writes: [mem(registers[dst])] }
    }
    case 'JMP': {
      const r = REGISTER_NAMES[operand]
      return { reads: [reg(r)], writes: [reg('PC')] }
    }
    case 'CJP': {
      const left = REGISTER_NAMES[hi]
      const right = REGISTER_NAMES[lo]
      // RES is always read (as the candidate jump target) even though it is
      // only actually taken conditionally - this is the static prediction.
      return { reads: [reg(left), reg(right), reg('RES')], writes: [reg('PC')] }
    }
    case 'PRT':
    case 'PRD':
      return { reads: [reg('OUT')], writes: [] }
    case 'PRL':
      return { reads: [reg('OP1'), reg('OP2'), mem(registers.OP1)], writes: [reg('OUT'), reg('OP1')] }
    case 'HLT':
      return { reads: [], writes: [] }
    default:
      return { reads: [], writes: [] }
  }
}
