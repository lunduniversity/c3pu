import { describe, expect, it } from 'vitest'
import {
  clearMemoryRange,
  createGridState,
  deleteMemoryRange,
  moveMemoryRange,
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
