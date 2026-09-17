import { describe, expect, it } from 'vitest'
import { step } from '../cpu'
import { byte, OP, REG, stateWithMemory } from './helpers'

describe('ST', () => {
  it('stores the source register to a literal memory address', () => {
    const state = stateWithMemory([byte(OP.ST, REG.R0), 10], { R0: 200 })
    const { state: next, result } = step(state)
    expect(next.memory[10]).toBe(200)
    expect(result.changed).toContainEqual({ kind: 'memory', address: 10 })
    expect(next.registers.PC).toBe(2)
  })

  it('errors on an out-of-range source register index', () => {
    const state = stateWithMemory([byte(OP.ST, 11), 10])
    const { state: next } = step(state)
    expect(next.error?.kind).toBe('invalid-register')
  })
})
