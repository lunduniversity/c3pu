import { describe, expect, it } from 'vitest'
import { step } from '../cpu'
import { byte, CMP, nibbles, OP, REG, stateWithMemory } from './helpers'

describe('CJP', () => {
  it('jumps to RES when the comparison is true', () => {
    const state = stateWithMemory([byte(OP.CJP, CMP.LT), nibbles(REG.R0, REG.R1)], { R0: 1, R1: 5, RES: 99 })
    const { state: next } = step(state)
    expect(next.registers.PC).toBe(99)
  })

  it('falls through to the next instruction when the comparison is false', () => {
    const state = stateWithMemory([byte(OP.CJP, CMP.LT), nibbles(REG.R0, REG.R1)], { R0: 5, R1: 1, RES: 99 })
    const { state: next } = step(state)
    expect(next.registers.PC).toBe(2)
  })

  it('treats comparator code 3 as not-equal (forced by docs/examples/segfault.txt)', () => {
    const notEqual = stateWithMemory([byte(OP.CJP, CMP.NE), nibbles(REG.R0, REG.R1)], { R0: 1, R1: 2, RES: 99 })
    expect(step(notEqual).state.registers.PC).toBe(99)

    const equal = stateWithMemory([byte(OP.CJP, CMP.NE), nibbles(REG.R0, REG.R1)], { R0: 1, R1: 1, RES: 99 })
    expect(step(equal).state.registers.PC).toBe(2)
  })

  it('errors on an out-of-range left/right register index', () => {
    const state = stateWithMemory([byte(OP.CJP, CMP.EQ), nibbles(13, REG.R1)])
    const { state: next } = step(state)
    expect(next.error?.kind).toBe('invalid-register')
  })

  it('errors on an out-of-range comparator code', () => {
    const state = stateWithMemory([byte(OP.CJP, 7), nibbles(REG.R0, REG.R1)])
    const { state: next } = step(state)
    expect(next.error?.kind).toBe('invalid-instruction')
  })
})
