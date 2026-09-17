import { describe, expect, it } from 'vitest'
import { step } from '../cpu'
import { byte, OP, stateWithMemory } from './helpers'

describe('PRL', () => {
  it('prints mem[OP1], mirrors it into OUT, advances OP1, and re-executes (PC unchanged) while OP1 < OP2', () => {
    const memory = [byte(OP.PRL, 0)]
    memory[10] = 'H'.charCodeAt(0)
    memory[11] = 'I'.charCodeAt(0)
    const state = stateWithMemory(memory, { OP1: 10, OP2: 11 })
    const { state: next, result } = step(state)
    expect(result.output).toEqual([{ kind: 'char', value: 'H' }])
    expect(next.registers.OUT).toBe('H'.charCodeAt(0))
    expect(next.registers.OP1).toBe(11)
    expect(next.registers.PC).toBe(0)
  })

  it('advances PC past itself once OP1 >= OP2', () => {
    const memory = [byte(OP.PRL, 0)]
    memory[10] = 'I'.charCodeAt(0)
    const state = stateWithMemory(memory, { OP1: 10, OP2: 10 })
    const { state: next } = step(state)
    expect(next.registers.OP1).toBe(10)
    expect(next.registers.PC).toBe(1)
  })
})
