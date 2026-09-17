import { describe, expect, it } from 'vitest'
import { step } from '../cpu'
import { byte, OP, stateWithMemory } from './helpers'

describe('ADD', () => {
  it('sets RES = OP1 + OP2', () => {
    const state = stateWithMemory([byte(OP.ADD, 0)], { OP1: 42, OP2: 13 })
    const { state: next } = step(state)
    expect(next.registers.RES).toBe(55)
    expect(next.registers.PC).toBe(1)
  })

  it('wraps mod 256 on overflow', () => {
    const state = stateWithMemory([byte(OP.ADD, 0)], { OP1: 255, OP2: 1 })
    const { state: next } = step(state)
    expect(next.registers.RES).toBe(0)
  })
})
