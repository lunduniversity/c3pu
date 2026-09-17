import { describe, expect, it } from 'vitest'
import { createMemory } from '../../engine/types'
import { clearUserMark, deriveEffectiveMarks, setUserMark } from '../marks'

// LD OUT, 72 at address 0-1 (opcode 5, operand 6=OUT); NOP at address 2.
const OPCODE_LD = 5
const REG_OUT = 6

function memoryWithLdAt(address: number): number[] {
  const memory = createMemory()
  memory[address] = (OPCODE_LD << 4) | REG_OUT
  memory[address + 1] = 72
  return memory
}

describe('deriveEffectiveMarks', () => {
  it('is unmarked by default', () => {
    const memory = createMemory()
    const effective = deriveEffectiveMarks(memory, {})
    expect(effective[0]).toEqual({ kind: 'unmarked' })
    expect(effective[255]).toEqual({ kind: 'unmarked' })
  })

  it('reflects an explicit code or data mark as-is', () => {
    const memory = createMemory()
    const effective = deriveEffectiveMarks(memory, {
      0: { kind: 'code' },
      1: { kind: 'data', representation: 'ascii' },
    })
    expect(effective[0]).toEqual({ kind: 'code' })
    expect(effective[1]).toEqual({ kind: 'data', representation: 'ascii' })
  })

  it('auto-marks the trailing cell of a 2-cell instruction marked code as operand', () => {
    const memory = memoryWithLdAt(0)
    const effective = deriveEffectiveMarks(memory, { 0: { kind: 'code' } })
    expect(effective[0]).toEqual({ kind: 'code' })
    expect(effective[1]).toEqual({ kind: 'operand', ownerAddress: 0 })
  })

  it("does not propagate to the trailing cell of a 1-cell instruction marked code", () => {
    const memory = createMemory() // all NOPs, 1 cell each
    const effective = deriveEffectiveMarks(memory, { 0: { kind: 'code' } })
    expect(effective[0]).toEqual({ kind: 'code' })
    expect(effective[1]).toEqual({ kind: 'unmarked' })
  })

  it('reconsiders the operand designation when the owner cell is no longer marked code', () => {
    const memory = memoryWithLdAt(0)
    const marked = deriveEffectiveMarks(memory, { 0: { kind: 'code' }, 1: { kind: 'data', representation: 'hex' } })
    expect(marked[1]).toEqual({ kind: 'operand', ownerAddress: 0 })

    // Same underlying marks map, but cell 0 is no longer marked "code" - the
    // user's own mark on cell 1 (never removed from storage) reappears.
    const unmarked = deriveEffectiveMarks(memory, { 1: { kind: 'data', representation: 'hex' } })
    expect(unmarked[1]).toEqual({ kind: 'data', representation: 'hex' })
  })

  it('reconsiders the operand designation when the owner opcode changes to a 1-cell instruction', () => {
    const memory = memoryWithLdAt(0)
    memory[0] = 0 // now NOP (1 cell) instead of LD (2 cells), still marked "code"
    const effective = deriveEffectiveMarks(memory, { 0: { kind: 'code' } })
    expect(effective[1]).toEqual({ kind: 'unmarked' })
  })
})

describe('setUserMark / clearUserMark', () => {
  it('sets a mark on an ordinary cell', () => {
    const memory = createMemory()
    const marks = setUserMark(memory, {}, 5, { kind: 'code' })
    expect(marks[5]).toEqual({ kind: 'code' })
  })

  it('refuses to mark a cell that is currently an auto-derived operand', () => {
    const memory = memoryWithLdAt(0)
    const marks = setUserMark(memory, { 0: { kind: 'code' } }, 1, { kind: 'data', representation: 'hex' })
    // unchanged: address 1 is the operand of the code-marked instruction at 0
    expect(marks[1]).toBeUndefined()
  })

  it('clears a mark', () => {
    const memory = createMemory()
    const marks = clearUserMark(memory, { 5: { kind: 'code' } }, 5)
    expect(marks[5]).toBeUndefined()
  })

  it('refuses to clear an auto-derived operand mark (there is nothing stored to clear)', () => {
    const memory = memoryWithLdAt(0)
    const original = { 0: { kind: 'code' as const } }
    const marks = clearUserMark(memory, original, 1)
    expect(marks).toBe(original)
  })
})
