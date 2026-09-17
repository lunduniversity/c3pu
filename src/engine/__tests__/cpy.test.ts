import { describe, expect, it } from 'vitest'
import { step } from '../cpu'
import { byte, nibbles, OP, REG, stateWithMemory } from './helpers'

describe('CPY/MOV', () => {
  it('copies src to dst and leaves src unchanged when the move bit is 0', () => {
    const state = stateWithMemory([byte(OP.CPY, 0b0000), nibbles(REG.RES, REG.OUT)], { RES: 55 })
    const { state: next } = step(state)
    expect(next.registers.OUT).toBe(55)
    expect(next.registers.RES).toBe(55)
    expect(next.registers.PC).toBe(2)
  })

  it('moves src to dst and zeros src when the move bit is 1', () => {
    const state = stateWithMemory([byte(OP.CPY, 0b0001), nibbles(REG.RES, REG.OUT)], { RES: 55 })
    const { state: next } = step(state)
    expect(next.registers.OUT).toBe(55)
    expect(next.registers.RES).toBe(0)
  })

  it('errors on an out-of-range src or dst register index', () => {
    const state = stateWithMemory([byte(OP.CPY, 0), nibbles(9, REG.OUT)])
    const { state: next } = step(state)
    expect(next.error?.kind).toBe('invalid-register')
  })
})
