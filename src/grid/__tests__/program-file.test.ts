import { describe, expect, it } from 'vitest'
import { MEMORY_SIZE } from '../../engine/types'
import { parseProgramFile, serializeProgramFile } from '../program-file'

describe('parseProgramFile', () => {
  it('parses marks from % annotations: code, bare data (binary), and data with a representation', () => {
    const text = ['0101 0110 % code', '0100 1000', '0000 0000 % data', '0000 0001 % data hex', '0000 0010 % data decimal', '0000 0011 % data ascii'].join(
      '\n',
    )
    const result = parseProgramFile(text)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.marks).toEqual({
      0: { kind: 'code' },
      2: { kind: 'data', representation: 'binary' },
      3: { kind: 'data', representation: 'hex' },
      4: { kind: 'data', representation: 'decimal' },
      5: { kind: 'data', representation: 'ascii' },
    })
    expect(result.memory).toHaveLength(MEMORY_SIZE)
  })

  it('is backward-compatible: a plain %/#/// comment with no recognized annotation leaves the cell unmarked', () => {
    for (const comment of ['% just a note', '// code', '# data hex', '%']) {
      const result = parseProgramFile(`01010110 ${comment}`)
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.marks).toEqual({})
        expect(result.memory[0]).toBe(0b01010110)
      }
    }
  })

  it('an old file with no annotations at all parses with no marks, same bytes as before', () => {
    const result = parseProgramFile('01010110\n01001000')
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.marks).toEqual({})
      expect(result.memory[0]).toBe(0b01010110)
      expect(result.memory[1]).toBe(0b01001000)
    }
  })

  it('still reports the failing line for a malformed byte line', () => {
    const result = parseProgramFile('01010110\nnot binary % code')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.line).toBe(2)
  })
})

describe('serializeProgramFile', () => {
  it('round-trips memory and marks exactly', () => {
    const memory = new Array(MEMORY_SIZE).fill(0)
    memory[0] = 0b01010110
    memory[2] = 1
    const marks = {
      0: { kind: 'code' as const },
      2: { kind: 'data' as const, representation: 'hex' as const },
    }
    const text = serializeProgramFile(memory, marks)
    const parsed = parseProgramFile(text)
    expect(parsed.ok).toBe(true)
    if (parsed.ok) {
      expect(parsed.memory).toEqual(memory)
      expect(parsed.marks).toEqual(marks)
    }
  })

  it('omits the annotation for an unmarked cell, and writes bare "% data" for binary representation', () => {
    const memory = new Array(MEMORY_SIZE).fill(0)
    const text = serializeProgramFile(memory, { 5: { kind: 'data', representation: 'binary' } })
    const lines = text.split('\n')
    expect(lines[0]).toBe('0000 0000')
    expect(lines[5]).toBe('0000 0000 % data')
  })
})
