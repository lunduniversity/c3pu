import { describe, expect, it } from 'vitest'
import {
  clearMemoryRange,
  createGridState,
  deleteMemoryRange,
  insertBlankRows,
  moveMemoryRange,
  moveMemoryRangeTo,
  pasteMemoryBytes,
  readMemoryBit,
  readRegisterBit,
  setMemoryBit,
  toggleMemoryBit,
  toggleRegisterBit,
} from '../model'

describe('memory bit editing', () => {
  it('reads and sets a specific bit, MSB first', () => {
    let state = createGridState()
    state = setMemoryBit(state, 5, 0, 1) // MSB
    expect(state.memory[5]).toBe(0b10000000)
    expect(readMemoryBit(state.memory, 5, 0)).toBe(1)

    state = setMemoryBit(state, 5, 7, 1) // LSB
    expect(state.memory[5]).toBe(0b10000001)
  })

  it('toggles a bit', () => {
    let state = createGridState()
    state = toggleMemoryBit(state, 0, 3)
    expect(readMemoryBit(state.memory, 0, 3)).toBe(1)
    state = toggleMemoryBit(state, 0, 3)
    expect(readMemoryBit(state.memory, 0, 3)).toBe(0)
  })

  it('does not mutate the previous state (pure)', () => {
    const state = createGridState()
    const next = setMemoryBit(state, 0, 0, 1)
    expect(state.memory[0]).toBe(0)
    expect(next.memory[0]).toBe(0b10000000)
  })
})

describe('register bit editing', () => {
  it('sets and toggles a register bit', () => {
    let state = createGridState()
    state = toggleRegisterBit(state, 'PC', 7)
    expect(state.registers.PC).toBe(1)
    expect(readRegisterBit(state.registers, 'PC', 7)).toBe(1)
  })
})

describe('clearMemoryRange', () => {
  it('zeroes the selected cells, keeping positions/count unchanged', () => {
    let state = createGridState([10, 20, 30, 40, 50])
    state = clearMemoryRange(state, 1, 3)
    expect(state.memory.slice(0, 5)).toEqual([10, 0, 0, 0, 50])
  })
})

describe('deleteMemoryRange', () => {
  it('removes the selected cells and shifts everything after up to close the gap', () => {
    let state = createGridState([10, 20, 30, 40, 50])
    state = deleteMemoryRange(state, 1, 2)
    expect(state.memory.slice(0, 5)).toEqual([10, 40, 50, 0, 0])
  })

  it('shifts marks along with the data they describe, and drops marks within the deleted range', () => {
    let state = createGridState([10, 20, 30, 40, 50])
    state = {
      ...state,
      marks: { 0: { kind: 'code' }, 1: { kind: 'data', representation: 'hex' }, 3: { kind: 'code' } },
    }
    state = deleteMemoryRange(state, 1, 2)
    expect(state.marks[0]).toEqual({ kind: 'code' }) // untouched, before the deleted range
    expect(state.marks[1]).toEqual({ kind: 'code' }) // was address 3, shifted down by 2
    expect(Object.keys(state.marks)).toHaveLength(2) // address 1's mark (within the deleted range) is gone
  })
})

describe('moveMemoryRange', () => {
  it('moves a block up by one, displacing the single neighbor above', () => {
    let state = createGridState([1, 2, 3, 4, 5])
    state = moveMemoryRange(state, 2, 3, 'up')
    // block [3,4] (addresses 2-3) swaps past neighbor at address 1 (value 2)
    expect(state.memory.slice(0, 5)).toEqual([1, 3, 4, 2, 5])
  })

  it('moves a block down by one, displacing the single neighbor below', () => {
    let state = createGridState([1, 2, 3, 4, 5])
    state = moveMemoryRange(state, 1, 2, 'down')
    expect(state.memory.slice(0, 5)).toEqual([1, 4, 2, 3, 5])
  })

  it('is a no-op at the top/bottom edge of memory', () => {
    let state = createGridState([1, 2, 3])
    expect(moveMemoryRange(state, 0, 1, 'up')).toBe(state)
    state = createGridState(new Array(256).fill(0).map((_, i) => i))
    expect(moveMemoryRange(state, 254, 255, 'down')).toBe(state)
  })
})

describe('moveMemoryRangeTo', () => {
  it('moves a block to an arbitrary later position, preserving relative order of displaced cells', () => {
    let state = createGridState([1, 2, 3, 4, 5, 6])
    state = moveMemoryRangeTo(state, 0, 1, 4)
    // block [1,2] (addresses 0-1) ends up starting at address 4
    expect(state.memory.slice(0, 6)).toEqual([3, 4, 5, 6, 1, 2])
  })

  it('moves a block to an arbitrary earlier position', () => {
    let state = createGridState([1, 2, 3, 4, 5, 6])
    state = moveMemoryRangeTo(state, 4, 5, 1)
    expect(state.memory.slice(0, 6)).toEqual([1, 5, 6, 2, 3, 4])
  })

  it('moves marks along with the block and with the displaced cells', () => {
    let state = createGridState([1, 2, 3, 4, 5])
    state = { ...state, marks: { 0: { kind: 'code' }, 2: { kind: 'data', representation: 'hex' } } }
    state = moveMemoryRangeTo(state, 0, 0, 2)
    // value 1 (with its "code" mark) moves to address 2; value 3 (with its
    // "data hex" mark) shifts down to address 1.
    expect(state.memory.slice(0, 3)).toEqual([2, 3, 1])
    expect(state.marks[2]).toEqual({ kind: 'code' })
    expect(state.marks[1]).toEqual({ kind: 'data', representation: 'hex' })
    expect(state.marks[0]).toBeUndefined()
  })

  it('is a no-op when the target is the current position, or clamped back to it', () => {
    const state = createGridState([1, 2, 3])
    expect(moveMemoryRangeTo(state, 0, 1, 0)).toBe(state)
    expect(moveMemoryRangeTo(state, 0, 1, -5)).toBe(state) // clamped to 0
  })

  it('clamps an out-of-range target to the last position the block can occupy', () => {
    let state = createGridState(new Array(256).fill(0).map((_, i) => i))
    state = moveMemoryRangeTo(state, 0, 1, 1000)
    // the 2-cell block can end no later than address 254 (254 + 2 = 256)
    expect(state.memory[254]).toBe(0)
    expect(state.memory[255]).toBe(1)
  })

  it('moveMemoryRange (single-step up/down) still behaves exactly as before', () => {
    let state = createGridState([1, 2, 3, 4, 5])
    state = moveMemoryRange(state, 2, 3, 'up')
    expect(state.memory.slice(0, 5)).toEqual([1, 3, 4, 2, 5])

    state = createGridState([1, 2, 3, 4, 5])
    state = moveMemoryRange(state, 1, 2, 'down')
    expect(state.memory.slice(0, 5)).toEqual([1, 4, 2, 3, 5])
  })
})

describe('insertBlankRows', () => {
  it('inserts blank cells at the given address, shifting the rest down and truncating at the end', () => {
    let state = createGridState([1, 2, 3, 4, 5])
    state = insertBlankRows(state, 1, 2)
    expect(state.memory.slice(0, 7)).toEqual([1, 0, 0, 2, 3, 4, 5])
    expect(state.memory).toHaveLength(256)
  })

  it('shifts marks along with the cells they describe, dropping any that fall off the end', () => {
    let state = createGridState(new Array(256).fill(0))
    state = { ...state, marks: { 0: { kind: 'code' }, 255: { kind: 'data', representation: 'hex' } } }
    state = insertBlankRows(state, 0, 1)
    expect(state.marks[1]).toEqual({ kind: 'code' })
    expect(state.marks[0]).toBeUndefined()
    expect(Object.keys(state.marks)).toHaveLength(1) // address 255's mark fell off the end
  })

  it('is a no-op for a non-positive count or a position at/past the end of memory', () => {
    const state = createGridState([1, 2, 3])
    expect(insertBlankRows(state, 1, 0)).toBe(state)
    expect(insertBlankRows(state, 256, 3)).toBe(state)
  })
})

describe('pasteMemoryBytes', () => {
  it('truncates when pasting more values than a bounded selection can hold', () => {
    let state = createGridState([0, 0, 0, 0, 0])
    state = pasteMemoryBytes(state, 1, 2, [9, 9, 9, 9])
    expect(state.memory.slice(0, 5)).toEqual([0, 9, 9, 0, 0])
  })

  it('leaves the remainder of a bounded selection unchanged when pasting fewer values', () => {
    let state = createGridState([1, 2, 3, 4, 5])
    state = pasteMemoryBytes(state, 1, 3, [9])
    expect(state.memory.slice(0, 5)).toEqual([1, 9, 3, 4, 5])
  })

  it('drops overflow past the end of memory when pasting at a single cursor position', () => {
    let state = createGridState()
    state = pasteMemoryBytes(state, 254, null, [7, 8, 9])
    expect(state.memory[254]).toBe(7)
    expect(state.memory[255]).toBe(8)
    // the 3rd value (9) had nowhere to go and is silently dropped
  })
})
