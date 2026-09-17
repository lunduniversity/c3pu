import { describe, expect, it } from 'vitest'
import { step } from '../cpu'
import { byte, OP, stateWithMemory } from './helpers'

describe('NOP', () => {
  it('does nothing but advance PC by 1', () => {
    const state = stateWithMemory([byte(OP.NOP, 0)])
    const { state: next, result } = step(state)
    expect(next.registers.PC).toBe(1)
    expect(result.changed).toEqual([{ kind: 'register', name: 'PC' }])
    expect(result.output).toEqual([])
    expect(next.halted).toBe(false)
  })
})
