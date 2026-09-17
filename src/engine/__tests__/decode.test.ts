import { describe, expect, it } from 'vitest'
import { computeEffects, decode } from '../decode'
import { createRegisters } from '../types'
import { byte, nibbles, OP, REG } from './helpers'

describe('decode', () => {
  it('reports length 1 for one-cell instructions', () => {
    expect(decode([byte(OP.NOP, 0)], 0).length).toBe(1)
    expect(decode([byte(OP.PRT, 0)], 0).length).toBe(1)
  })

  it('reports length 2 for two-cell instructions', () => {
    expect(decode([byte(OP.LD, REG.R0), 5], 0).length).toBe(2)
    expect(decode([byte(OP.CJP, 0), 0], 0).length).toBe(2)
  })

  it('flags an unrecognized opcode as invalid, with length 1', () => {
    const instr = decode([byte(OP.INVALID, 0)], 0)
    expect(instr.mnemonic).toBeNull()
    expect(instr.length).toBe(1)
    expect(instr.invalidReason?.kind).toBe('invalid-instruction')
  })

  it('describes a CPY as resolved register names', () => {
    const instr = decode([byte(OP.CPY, 0), nibbles(REG.R0, REG.R1)], 0)
    expect(instr.describe()).toBe('CPY (R0 → R1)')
  })

  it('describes CPY with the move bit set as MOV', () => {
    const instr = decode([byte(OP.CPY, 1), nibbles(REG.R0, REG.R1)], 0)
    expect(instr.describe()).toBe('MOV (R0 → R1)')
  })

  it('does not itself need register values to describe an instruction', () => {
    // Purely structural: same bytes always describe the same way regardless
    // of what the registers currently hold.
    const instr = decode([byte(OP.LDA, 0), nibbles(REG.R0, REG.OP1)], 0)
    expect(instr.describe()).toBe('LDA (mem[R0] → OP1)')
  })
})

describe('computeEffects', () => {
  it('resolves LDA\'s indirect memory read using the current register value', () => {
    const instr = decode([byte(OP.LDA, 0), nibbles(REG.R0, REG.OP1)], 0)
    const registers = createRegisters()
    registers.R0 = 42
    const { reads } = computeEffects(instr, registers)
    expect(reads).toContainEqual({ kind: 'memory', address: 42 })
  })

  it('returns no effects for an invalid instruction', () => {
    const instr = decode([byte(OP.INVALID, 0)], 0)
    const { reads, writes } = computeEffects(instr, createRegisters())
    expect(reads).toEqual([])
    expect(writes).toEqual([])
  })
})
