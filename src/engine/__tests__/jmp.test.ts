import { describe, expect, it } from 'vitest'
import { step } from '../cpu'
import { byte, OP, REG, stateWithMemory } from './helpers'

describe('JMP', () => {
  it('sets PC to the value of the named register', () => {
    const state = stateWithMemory([byte(OP.JMP, REG.R0)], { R0: 42 })
    const { state: next } = step(state)
    expect(next.registers.PC).toBe(42)
  })

  it('errors on an out-of-range register index', () => {
    const state = stateWithMemory([byte(OP.JMP, 8)])
    const { state: next } = step(state)
    expect(next.error?.kind).toBe('invalid-register')
  })
})
