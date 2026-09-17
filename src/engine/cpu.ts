import { decode } from './decode'
import {
  COMPARATOR_BY_CODE,
  type Comparator,
  createMemory,
  createRegisters,
  type Effect,
  type HaltReason,
  MEMORY_SIZE,
  REGISTER_NAMES,
  type RegisterName,
  type Registers,
  type RuntimeError,
  wrap8,
} from './types'

export interface CpuState {
  memory: number[]
  registers: Registers
  halted: boolean
  haltReason: HaltReason | null
  error: RuntimeError | null
}

export type OutputEvent = { kind: 'char'; value: string } | { kind: 'decimal'; value: number }

export interface StepResult {
  output: OutputEvent[]
  /** Cells/registers actually modified this step (distinct from the
   * statically-predicted effects in decode.ts's computeEffects). */
  changed: Effect[]
  error: RuntimeError | null
  halted: HaltReason | null
}

export function createInitialState(memory?: readonly number[]): CpuState {
  const mem = createMemory()
  if (memory) {
    for (let i = 0; i < MEMORY_SIZE && i < memory.length; i++) {
      mem[i] = memory[i] ?? 0
    }
  }
  return { memory: mem, registers: createRegisters(), halted: false, haltReason: null, error: null }
}

function compare(operator: Comparator, left: number, right: number): boolean {
  switch (operator) {
    case '=':
      return left === right
    case '≠':
      return left !== right
    case '<':
      return left < right
    case '>':
      return left > right
    case '≤':
      return left <= right
    case '≥':
      return left >= right
  }
}

/**
 * Executes exactly one instruction. Must not be called on an already
 * halted/errored state - that is a caller contract violation, not a domain
 * runtime error.
 */
export function step(state: CpuState): { state: CpuState; result: StepResult } {
  if (state.halted || state.error) {
    throw new Error('step() called on a halted or errored CpuState')
  }

  const memory = state.memory.slice()
  const registers = { ...state.registers }
  const pc = registers.PC
  const output: OutputEvent[] = []
  const changed: Effect[] = []

  const setReg = (name: RegisterName, value: number) => {
    const wrapped = wrap8(value)
    if (registers[name] !== wrapped) changed.push({ kind: 'register', name })
    registers[name] = wrapped
  }
  const setMem = (address: number, value: number) => {
    const wrapped = wrap8(value)
    if (memory[address] !== wrapped) changed.push({ kind: 'memory', address })
    memory[address] = wrapped
  }

  const instruction = decode(memory, pc)

  if (instruction.invalidReason !== null) {
    const error: RuntimeError = { ...instruction.invalidReason, address: pc }
    return {
      state: { memory, registers, halted: true, haltReason: null, error },
      result: { output, changed, error, halted: null },
    }
  }

  const { mnemonic, operand, extra } = instruction
  if (mnemonic === null) {
    // decode() guarantees invalidReason is set whenever mnemonic is null,
    // and that case already returned above.
    throw new Error('unreachable')
  }
  const hi = (extra ?? 0) >> 4
  const lo = (extra ?? 0) & 0xf
  let nextPc = pc + instruction.length

  switch (mnemonic) {
    case 'NOP':
      break
    case 'ADD':
      setReg('RES', registers.OP1 + registers.OP2)
      break
    case 'SUB':
      setReg('RES', registers.OP1 - registers.OP2)
      break
    case 'INC': {
      const r = REGISTER_NAMES[operand]
      setReg(r, registers[r] + 1)
      break
    }
    case 'CPY': {
      const move = (operand & 1) === 1
      const src = REGISTER_NAMES[hi]
      const dst = REGISTER_NAMES[lo]
      setReg(dst, registers[src])
      if (move) setReg(src, 0)
      break
    }
    case 'LD': {
      const dst = REGISTER_NAMES[operand]
      setReg(dst, extra ?? 0)
      break
    }
    case 'LDA': {
      const src = REGISTER_NAMES[hi]
      const dst = REGISTER_NAMES[lo]
      setReg(dst, memory[registers[src]])
      break
    }
    case 'ST': {
      const src = REGISTER_NAMES[operand]
      setMem(extra ?? 0, registers[src])
      break
    }
    case 'STA': {
      const src = REGISTER_NAMES[hi]
      const dst = REGISTER_NAMES[lo]
      setMem(registers[dst], registers[src])
      break
    }
    case 'JMP': {
      const r = REGISTER_NAMES[operand]
      nextPc = registers[r]
      break
    }
    case 'CJP': {
      const left = REGISTER_NAMES[hi]
      const right = REGISTER_NAMES[lo]
      const operator = COMPARATOR_BY_CODE[operand]
      if (compare(operator, registers[left], registers[right])) {
        nextPc = registers.RES
      }
      break
    }
    case 'PRT':
      output.push({ kind: 'char', value: String.fromCharCode(registers.OUT & 0xff) })
      break
    case 'PRD':
      output.push({ kind: 'decimal', value: registers.OUT })
      break
    case 'PRL': {
      const ch = memory[registers.OP1]
      setReg('OUT', ch)
      output.push({ kind: 'char', value: String.fromCharCode(ch & 0xff) })
      if (registers.OP1 < registers.OP2) {
        setReg('OP1', registers.OP1 + 1)
        nextPc = pc
      }
      break
    }
    case 'HLT': {
      output.push({ kind: 'char', value: '\n' })
      return {
        state: { memory, registers, halted: true, haltReason: 'normal', error: null },
        result: { output, changed, error: null, halted: 'normal' },
      }
    }
  }

  if (nextPc > 255) {
    registers.PC = nextPc
    return {
      state: { memory, registers, halted: true, haltReason: 'end-of-memory', error: null },
      result: { output, changed, error: null, halted: 'end-of-memory' },
    }
  }

  if (registers.PC !== nextPc) {
    changed.push({ kind: 'register', name: 'PC' })
    registers.PC = nextPc
  }

  return {
    state: { memory, registers, halted: false, haltReason: null, error: null },
    result: { output, changed, error: null, halted: null },
  }
}

export const RUN_STEP_CAP = 1000

export interface RunResult {
  state: CpuState
  output: OutputEvent[]
  steps: number
}

export interface RunTicker {
  /** Executes exactly one step and updates this ticker's own stuck-program/
   * step-cap bookkeeping. Must not be called again once a tick returns a
   * halted/errored state. */
  next(state: CpuState): { state: CpuState; result: StepResult }
  /** Number of instructions actually executed so far (excludes a tick that
   * only hit the step-cap without executing anything). */
  readonly stepCount: number
}

/**
 * The stuck-program/step-cap bookkeeping behind `run()`, factored out so a
 * UI-driven Run (one step per timer tick, with a visible delay and a Stop
 * button - webapp-requirements.md §4) can reuse the exact same detection
 * logic instead of duplicating it, while still being interruptible between
 * ticks the way a single synchronous `run()` call cannot be.
 */
export function createRunTicker(maxSteps: number = RUN_STEP_CAP): RunTicker {
  let steps = 0
  let prevPc: number | null = null
  let prevOutputLength = 0
  let totalOutputLength = 0

  return {
    get stepCount() {
      return steps
    },
    next(state: CpuState): { state: CpuState; result: StepResult } {
      if (steps >= maxSteps) {
        const error: RuntimeError = {
          kind: 'step-cap',
          message: `exceeded the ${maxSteps}-step safety cap for a single run`,
          address: state.registers.PC,
        }
        return {
          state: { ...state, halted: true, error },
          result: { output: [], changed: [], error, halted: null },
        }
      }

      const pcBefore = state.registers.PC
      const { state: nextState, result } = step(state)
      steps++
      totalOutputLength += result.output.length

      if (result.error) return { state: nextState, result }

      if (prevPc !== null && pcBefore === prevPc && totalOutputLength === prevOutputLength) {
        const error: RuntimeError = {
          kind: 'stuck-program',
          message: 'the program counter revisited the same address with no output in between',
          address: pcBefore,
        }
        return { state: { ...nextState, halted: true, error }, result: { ...result, error } }
      }

      prevPc = pcBefore
      prevOutputLength = totalOutputLength
      return { state: nextState, result }
    },
  }
}

/**
 * Repeatedly steps until halt/error, the 1000-step safety cap
 * (webapp-requirements.md §4) is hit, or a stuck program is detected: the PC
 * revisits its previous-step address with no output produced in between.
 */
export function run(initialState: CpuState, maxSteps: number = RUN_STEP_CAP): RunResult {
  const ticker = createRunTicker(maxSteps)
  let state = initialState
  const output: OutputEvent[] = []

  while (!state.halted && !state.error) {
    const { state: nextState, result } = ticker.next(state)
    output.push(...result.output)
    state = nextState
  }

  return { state, output, steps: ticker.stepCount }
}
