import { describe, expect, it } from 'vitest'
import { step } from '../cpu'
import { byte, OP, REG, stateWithMemory } from './helpers'

describe('INC', () => {
  it('increments the named register by 1', () => {
    const state = stateWithMemory([byte(OP.INC, REG.R0)], { R0: 5 })
    const { state: next, result } = step(state)
    expect(next.registers.R0).toBe(6)
    expect(result.changed).toContainEqual({ kind: 'register', name: 'R0' })
  })

  it('wraps mod 256', () => {
    const state = stateWithMemory([byte(OP.INC, REG.R0)], { R0: 255 })
    const { state: next } = step(state)
    expect(next.registers.R0).toBe(0)
  })

  it('errors on an out-of-range register index', () => {
    const state = stateWithMemory([byte(OP.INC, 9)])
    const { state: next, result } = step(state)
    expect(next.halted).toBe(true)
    expect(next.error?.kind).toBe('invalid-register')
    expect(result.error?.kind).toBe('invalid-register')
  })
})
