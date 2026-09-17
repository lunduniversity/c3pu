import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useExecution } from '../useExecution'

// LD OUT,65 ; PRT ; HLT - a tiny complete program (mirrors tiny_program.txt's shape).
const PROGRAM = [0b0101_0110, 65, 0b1011_0000, 0b1110_0000]

// LD OUT,65 ; PRT ; JMP R0 (R0=0) - an infinite loop that always outputs, for
// exercising Run/Stop without hitting a halt/error mid-test.
const LOOP_PROGRAM = [0b0101_0110, 65, 0b1011_0000, 0b1001_0000]

describe('useExecution', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('handleStep executes one instruction and logs its output', () => {
    const { result } = renderHook(() => useExecution({ initialMemory: PROGRAM }))
    act(() => result.current.handleStep()) // LD
    expect(result.current.appState.registers.OUT).toBe(65)
    expect(result.current.appState.hasExecutionStarted).toBe(true)

    act(() => result.current.handleStep()) // PRT
    expect(result.current.consoleState.entries).toEqual([{ kind: 'chars', text: 'A' }])

    act(() => result.current.handleStep()) // HLT
    expect(result.current.appState.halted).toBe(true)
    expect(result.current.appState.haltReason).toBe('normal')
    expect(result.current.consoleState.entries).toEqual([
      { kind: 'chars', text: 'A' },
      { kind: 'system', text: 'Program halted normally.', level: 'info' },
    ])
  })

  it('does nothing if Step is called again after halting', () => {
    const { result } = renderHook(() => useExecution({ initialMemory: PROGRAM }))
    act(() => {
      result.current.handleStep()
      result.current.handleStep()
      result.current.handleStep()
    })
    const afterHalt = result.current.appState
    act(() => result.current.handleStep())
    expect(result.current.appState).toBe(afterHalt)
  })

  it('handleReset zeroes registers and clears halt state but leaves memory untouched', () => {
    const { result } = renderHook(() => useExecution({ initialMemory: PROGRAM }))
    act(() => {
      result.current.handleStep()
      result.current.handleStep()
      result.current.handleStep()
    })
    expect(result.current.appState.halted).toBe(true)

    act(() => result.current.handleReset())
    expect(result.current.appState.halted).toBe(false)
    expect(result.current.appState.registers.OUT).toBe(0)
    expect(result.current.appState.hasExecutionStarted).toBe(false)
    expect(result.current.appState.memory.slice(0, 4)).toEqual(PROGRAM)
  })

  it('Run executes steps on a timer and Stop pauses without erroring', () => {
    const { result } = renderHook(() => useExecution({ initialMemory: LOOP_PROGRAM }))
    act(() => result.current.handleRunToggle())
    expect(result.current.isRunning).toBe(true)

    act(() => vi.advanceTimersByTime(result.current.stepDelayMs * 3))
    expect(result.current.appState.error).toBeNull()
    expect(result.current.consoleState.entries).toEqual([{ kind: 'chars', text: 'A' }])

    act(() => result.current.handleRunToggle())
    expect(result.current.isRunning).toBe(false)

    const afterStop = result.current.appState
    act(() => vi.advanceTimersByTime(result.current.stepDelayMs * 5))
    expect(result.current.appState).toBe(afterStop) // no further ticks after Stop
  })

  it('handleDeleteAllData clears memory, registers, marks, and execution status together', () => {
    const { result } = renderHook(() => useExecution({ initialMemory: PROGRAM }))
    act(() => {
      result.current.handleStep()
      result.current.handleStep()
      result.current.handleStep()
    })
    expect(result.current.appState.halted).toBe(true)

    act(() => result.current.handleDeleteAllData())
    expect(result.current.appState.halted).toBe(false)
    expect(result.current.appState.memory.every((b) => b === 0)).toBe(true)
    expect(result.current.appState.marks).toEqual({})
  })

  describe('undo/redo (§11.9)', () => {
    it('starts with nothing to undo or redo', () => {
      const { result } = renderHook(() => useExecution())
      expect(result.current.canUndo).toBe(false)
      expect(result.current.canRedo).toBe(false)
    })

    it('undoes a grid edit (bit toggle/clear/delete/move/paste all funnel through applyGridEdit)', () => {
      const { result } = renderHook(() => useExecution())
      const before = result.current.appState
      act(() => result.current.applyGridEdit({ ...before, memory: [1, 0, 0] }))
      expect(result.current.appState.memory[0]).toBe(1)
      expect(result.current.canUndo).toBe(true)

      act(() => result.current.handleUndo())
      expect(result.current.appState.memory[0]).toBe(0)
      expect(result.current.canUndo).toBe(false)
      expect(result.current.canRedo).toBe(true)
    })

    it('redoes an undone edit', () => {
      const { result } = renderHook(() => useExecution())
      const before = result.current.appState
      act(() => result.current.applyGridEdit({ ...before, memory: [1, 0, 0] }))
      act(() => result.current.handleUndo())
      act(() => result.current.handleRedo())
      expect(result.current.appState.memory[0]).toBe(1)
      expect(result.current.canRedo).toBe(false)
      expect(result.current.canUndo).toBe(true)
    })

    it('treats each edit as its own undo step (one bit toggle = one step)', () => {
      const { result } = renderHook(() => useExecution())
      const s0 = result.current.appState
      act(() => result.current.applyGridEdit({ ...s0, memory: [1, 0, 0] }))
      act(() => result.current.applyGridEdit({ ...result.current.appState, memory: [1, 1, 0] }))
      act(() => result.current.applyGridEdit({ ...result.current.appState, memory: [1, 1, 1] }))
      expect(result.current.appState.memory.slice(0, 3)).toEqual([1, 1, 1])

      act(() => result.current.handleUndo())
      expect(result.current.appState.memory.slice(0, 3)).toEqual([1, 1, 0])
      act(() => result.current.handleUndo())
      expect(result.current.appState.memory.slice(0, 3)).toEqual([1, 0, 0])
      act(() => result.current.handleUndo())
      expect(result.current.appState.memory.slice(0, 3)).toEqual([0, 0, 0])
      expect(result.current.canUndo).toBe(false)
    })

    it('a new edit clears the redo stack', () => {
      const { result } = renderHook(() => useExecution())
      const s0 = result.current.appState
      act(() => result.current.applyGridEdit({ ...s0, memory: [1, 0, 0] }))
      act(() => result.current.handleUndo())
      expect(result.current.canRedo).toBe(true)

      act(() => result.current.applyGridEdit({ ...result.current.appState, memory: [2, 0, 0] }))
      expect(result.current.canRedo).toBe(false)
    })

    it('Delete All Data is itself undoable', () => {
      const { result } = renderHook(() => useExecution({ initialMemory: PROGRAM }))
      act(() => result.current.handleDeleteAllData())
      expect(result.current.appState.memory.every((b) => b === 0)).toBe(true)

      act(() => result.current.handleUndo())
      expect(result.current.appState.memory.slice(0, 4)).toEqual(PROGRAM)
    })

    it('does not treat Step/Run or handleLoadProgram as undoable', () => {
      const { result } = renderHook(() => useExecution({ initialMemory: PROGRAM }))
      act(() => result.current.handleStep())
      expect(result.current.canUndo).toBe(false)

      act(() => result.current.handleLoadProgram([9, 9, 9]))
      expect(result.current.canUndo).toBe(false)
    })

    it('undo/redo of nothing is a harmless no-op', () => {
      const { result } = renderHook(() => useExecution())
      const before = result.current.appState
      act(() => result.current.handleUndo())
      expect(result.current.appState).toBe(before)
      act(() => result.current.handleRedo())
      expect(result.current.appState).toBe(before)
    })
  })
})
