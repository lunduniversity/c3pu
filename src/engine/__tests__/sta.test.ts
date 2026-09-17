import { describe, expect, it } from 'vitest'
import { step } from '../cpu'
import { byte, nibbles, OP, REG, stateWithMemory } from './helpers'

describe('STA', () => {
  it('stores src register value to memory[value of dst register] (indirect store)', () => {
    const state = stateWithMemory([byte(OP.STA, 0), nibbles(REG.RES, REG.R2)], { RES: 42, R2: 20 })
    const { state: next } = step(state)
    expect(next.memory[20]).toBe(42)
    expect(next.registers.PC).toBe(2)
  })

  it('errors on an out-of-range src or dst register index', () => {
    const state = stateWithMemory([byte(OP.STA, 0), nibbles(15, REG.R2)])
    const { state: next } = step(state)
    expect(next.error?.kind).toBe('invalid-register')
  })
})
