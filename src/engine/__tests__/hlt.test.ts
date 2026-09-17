import { describe, expect, it } from 'vitest'
import { step } from '../cpu'
import { byte, OP, stateWithMemory } from './helpers'

describe('HLT', () => {
  it('halts normally, emits a trailing newline, and does not advance PC further', () => {
    const state = stateWithMemory([byte(OP.HLT, 0)])
    const { state: next, result } = step(state)
    expect(next.halted).toBe(true)
    expect(next.haltReason).toBe('normal')
    expect(next.registers.PC).toBe(0)
    expect(result.output).toEqual([{ kind: 'char', value: '\n' }])
  })
})
