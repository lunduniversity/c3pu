import { describe, expect, it } from 'vitest'
import { parseProgram, serializeProgram } from '../program-format'
import { MEMORY_SIZE } from '../types'

describe('parseProgram', () => {
  it('parses one 8-bit line per memory cell, MSB first', () => {
    const result = parseProgram('01010110\n01001000')
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.memory[0]).toBe(0b01010110)
      expect(result.memory[1]).toBe(0b01001000)
      expect(result.memory).toHaveLength(MEMORY_SIZE)
    }
  })

  it('ignores whitespace within a line (nibble grouping)', () => {
    const result = parseProgram('0101 0110')
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.memory[0]).toBe(0b01010110)
  })

  it('strips //, #, and % comments before parsing', () => {
    for (const marker of ['//', '#', '%']) {
      const result = parseProgram(`0101 0110 ${marker} loads OUT`)
      expect(result.ok).toBe(true)
      if (result.ok) expect(result.memory[0]).toBe(0b01010110)
    }
  })

  it('skips blank and comment-only lines without consuming a cell', () => {
    const result = parseProgram('\n// just a comment\n01010110\n')
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.memory[0]).toBe(0b01010110)
  })

  it('reports which line failed for a malformed line', () => {
    const result = parseProgram('01010110\n0101 (not binary)\n01010110')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.line).toBe(2)
  })

  it('pads unspecified trailing cells with zero', () => {
    const result = parseProgram('01010110')
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.memory[1]).toBe(0)
      expect(result.memory[255]).toBe(0)
    }
  })

  it('rejects a program with more than 256 cells', () => {
    const line = '00000000\n'
    const result = parseProgram(line.repeat(257))
    expect(result.ok).toBe(false)
  })
})

describe('serializeProgram', () => {
  it('round-trips through parseProgram exactly', () => {
    const memory = new Array(MEMORY_SIZE).fill(0)
    memory[0] = 0b01010110
    memory[1] = 72
    memory[255] = 1
    const text = serializeProgram(memory)
    const parsed = parseProgram(text)
    expect(parsed.ok).toBe(true)
    if (parsed.ok) expect(parsed.memory).toEqual(memory)
  })
})
