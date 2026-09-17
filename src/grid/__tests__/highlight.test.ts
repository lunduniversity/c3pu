import { describe, expect, it } from 'vitest'
import { createMemory, createRegisters } from '../../engine/types'
import { computeMemoryHighlights, computeRegisterHighlights, predictedEffects } from '../highlight'

const OPCODE_LDA = 6
const REG_R0 = 0
const REG_OP1 = 3

describe('predictedEffects', () => {
  it('resolves an indirect instruction using the current register values', () => {
    const memory = createMemory()
    memory[0] = (OPCODE_LDA << 4) | 0
    memory[1] = (REG_R0 << 4) | REG_OP1
    const registers = createRegisters()
    registers.R0 = 42
    const { reads } = predictedEffects(memory, registers, 0)
    expect(reads).toContainEqual({ kind: 'memory', address: 42 })
  })

  it('returns no effects when there is no address to predict from', () => {
    const memory = createMemory()
    const { reads, writes } = predictedEffects(memory, createRegisters(), null)
    expect(reads).toEqual([])
    expect(writes).toEqual([])
  })
})

describe('computeMemoryHighlights', () => {
  it('flags predicted reads/writes, actual changes, cursor, selection, PC, halt, and error independently', () => {
    const highlights = computeMemoryHighlights({
      predicted: { reads: [{ kind: 'memory', address: 10 }], writes: [{ kind: 'memory', address: 20 }] },
      changed: [{ kind: 'memory', address: 30 }],
      cursorAddress: 5,
      selection: { start: 40, end: 42 },
      programCounterAddress: 50,
      haltedNormallyAt: 60,
      errorAt: 70,
    })

    expect(highlights[10].predictedRead).toBe(true)
    expect(highlights[20].predictedWrite).toBe(true)
    expect(highlights[30].actualChange).toBe(true)
    expect(highlights[5].isCursor).toBe(true)
    expect(highlights[40].selected).toBe(true)
    expect(highlights[41].selected).toBe(true)
    expect(highlights[42].selected).toBe(true)
    expect(highlights[39].selected).toBe(false)
    expect(highlights[43].selected).toBe(false)
    expect(highlights[50].isProgramCounter).toBe(true)
    expect(highlights[60].haltedHere).toBe(true)
    expect(highlights[70].errorHere).toBe(true)

    // Nothing bleeds into unrelated cells.
    expect(highlights[0]).toEqual({
      predictedRead: false,
      predictedWrite: false,
      actualChange: false,
      isCursor: false,
      selected: false,
      isProgramCounter: false,
      haltedHere: false,
      errorHere: false,
    })
  })

  it('lets predicted and actual highlights differ on the same cell (e.g. an untaken CJP branch)', () => {
    const highlights = computeMemoryHighlights({
      predicted: { reads: [], writes: [{ kind: 'memory', address: 5 }] },
      changed: [], // the branch wasn't actually taken, so nothing there changed
      cursorAddress: null,
      selection: null,
      programCounterAddress: null,
      haltedNormallyAt: null,
      errorAt: null,
    })
    expect(highlights[5].predictedWrite).toBe(true)
    expect(highlights[5].actualChange).toBe(false)
  })
})

describe('computeRegisterHighlights', () => {
  it('flags predicted/actual/cursor/selection per register', () => {
    const highlights = computeRegisterHighlights({
      predicted: { reads: [{ kind: 'register', name: 'OP1' }], writes: [{ kind: 'register', name: 'RES' }] },
      changed: [{ kind: 'register', name: 'RES' }],
      cursorRegister: 'PC',
      selection: { start: 'R0', end: 'R2' },
    })
    expect(highlights.OP1.predictedRead).toBe(true)
    expect(highlights.RES.predictedWrite).toBe(true)
    expect(highlights.RES.actualChange).toBe(true)
    expect(highlights.PC.isCursor).toBe(true)
    expect(highlights.R0.selected).toBe(true)
    expect(highlights.R1.selected).toBe(true)
    expect(highlights.R2.selected).toBe(true)
    expect(highlights.OP2.selected).toBe(false)
  })
})
