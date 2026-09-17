import { describe, expect, it } from 'vitest'
import { step } from '../cpu'
import { byte, nibbles, OP, REG, stateWithMemory } from './helpers'

describe('LDA', () => {
  it('loads dst with memory[value of src register] (indirect load)', () => {
    const state = stateWithMemory([byte(OP.LDA, 0), nibbles(REG.R0, REG.OP1), 0, 0, 0, 200], { R0: 5 })
    const { state: next } = step(state)
    expect(next.registers.OP1).toBe(200)
    expect(next.registers.PC).toBe(2)
  })

  it('errors on an out-of-range src or dst register index', () => {
    const state = stateWithMemory([byte(OP.LDA, 0), nibbles(REG.R0, 10)])
    const { state: next } = step(state)
    expect(next.error?.kind).toBe('invalid-register')
  })
})
