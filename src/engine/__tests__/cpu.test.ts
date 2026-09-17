import { describe, expect, it } from 'vitest'
import { run } from '../cpu'
import { byte, OP, REG, stateWithMemory } from './helpers'

describe('run()', () => {
  it('halts with reason "end-of-memory" when PC walks off the end without HLT', () => {
    // The whole 256-byte memory defaults to zero, i.e. all NOPs.
    const state = stateWithMemory([byte(OP.NOP, 0)])
    const { state: final, steps } = run(state)
    expect(final.halted).toBe(true)
    expect(final.haltReason).toBe('end-of-memory')
    expect(final.error).toBeNull()
    expect(steps).toBe(256)
  })

  it('aborts as a runtime error when an unrecognized opcode is executed', () => {
    const state = stateWithMemory([byte(OP.INVALID, 0)])
    const { state: final } = run(state)
    expect(final.error?.kind).toBe('invalid-instruction')
  })

  it('detects a stuck program: PC revisits its previous address with no output produced', () => {
    // JMP R0 with R0=0 (the default), at address 0: jumps to itself forever.
    const state = stateWithMemory([byte(OP.JMP, REG.R0)])
    const { state: final } = run(state)
    expect(final.error?.kind).toBe('stuck-program')
  })

  it('does not treat an output-producing loop (e.g. PRL) as stuck', () => {
    const memory = [byte(OP.PRL, 0)]
    memory[100] = 65
    memory[101] = 66
    memory[102] = 67
    const state = stateWithMemory(memory, { OP1: 100, OP2: 102 })
    const { state: final, output } = run(state)
    expect(final.error).toBeNull()
    expect(output).toEqual([
      { kind: 'char', value: 'A' },
      { kind: 'char', value: 'B' },
      { kind: 'char', value: 'C' },
    ])
  })

  it('aborts at the step cap when a loop keeps producing output but never halts', () => {
    // LD OUT,65 ; PRT ; JMP R0 (R0=0) - an infinite loop that always outputs.
    const memory = [byte(OP.LD, REG.OUT), 65, byte(OP.PRT, 0), byte(OP.JMP, REG.R0)]
    const state = stateWithMemory(memory)
    const { state: final, steps } = run(state, 50)
    expect(final.error?.kind).toBe('step-cap')
    expect(steps).toBe(50)
  })
})
