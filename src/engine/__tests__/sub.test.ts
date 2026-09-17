import { describe, expect, it } from 'vitest'
import { step } from '../cpu'
import { byte, OP, stateWithMemory } from './helpers'

describe('SUB', () => {
  it('sets RES = OP1 - OP2', () => {
    const state = stateWithMemory([byte(OP.SUB, 0)], { OP1: 13, OP2: 5 })
    const { state: next } = step(state)
    expect(next.registers.RES).toBe(8)
  })

  it('wraps mod 256 on underflow', () => {
    const state = stateWithMemory([byte(OP.SUB, 0)], { OP1: 0, OP2: 1 })
    const { state: next } = step(state)
    expect(next.registers.RES).toBe(255)
  })
})
