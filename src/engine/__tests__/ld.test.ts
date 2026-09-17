import { describe, expect, it } from 'vitest'
import { step } from '../cpu'
import { byte, OP, REG, stateWithMemory } from './helpers'

describe('LD', () => {
  it('loads a literal value into the destination register', () => {
    const state = stateWithMemory([byte(OP.LD, REG.OUT), 72])
    const { state: next } = step(state)
    expect(next.registers.OUT).toBe(72)
    expect(next.registers.PC).toBe(2)
  })

  it('errors on an out-of-range destination register index', () => {
    const state = stateWithMemory([byte(OP.LD, 12), 5])
    const { state: next } = step(state)
    expect(next.error?.kind).toBe('invalid-register')
  })
})
