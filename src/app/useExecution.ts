import { useCallback, useEffect, useRef, useState } from 'react'
import { createRunTicker, step as engineStep, type OutputEvent, type RunTicker } from '@/engine/cpu'
import type { Effect } from '@/engine/types'
import { appendOutputEvents, appendSystemMessage, clearConsole, createConsoleState, type ConsoleState } from '@/console/log'
import { describeError, describeHalt } from '@/console/messages'
import type { GridState } from '@/grid/model'
import type { UserMarks } from '@/grid/marks'
import { DEFAULT_STEP_DELAY_MS } from '@/settings/types'
import { type AppState, createAppState, mergeCpuState, resetExecution, toCpuState } from './state'

export { DEFAULT_STEP_DELAY_MS }

export interface UseExecutionOptions {
  initialMemory?: readonly number[]
  initialMarks?: UserMarks
  initialStepDelayMs?: number
}

export interface UseExecutionResult {
  appState: AppState
  /** For the grid components' onChange - manual edits also clear the
   * "last step" actual-change highlighting, since that describes what
   * *execution* just did, not a hand edit. Only merges the grid-owned
   * fields (memory/registers/marks); execution status is untouched. Pushes
   * an undo step (§11.9). */
  applyGridEdit: (next: GridState) => void
  consoleState: ConsoleState
  isRunning: boolean
  stepDelayMs: number
  setStepDelayMs: (ms: number) => void
  lastChanged: Effect[]
  handleStep: () => void
  handleRunToggle: () => void
  handleReset: () => void
  handleClearConsole: () => void
  /** Delete All Data (webapp-requirements.md §5): resets memory/registers/
   * marks *and* execution status together, unlike a plain grid edit. Pushes
   * an undo step. */
  handleDeleteAllData: () => void
  /** Replaces memory wholesale - Open, an example, or a snapshot import.
   * Not undoable (§11.9 scopes undo/redo to in-place edits). */
  handleLoadProgram: (memory: readonly number[]) => void
  canUndo: boolean
  canRedo: boolean
  handleUndo: () => void
  handleRedo: () => void
}

/** The undo/redo stack's unit of history (§11.9): a full snapshot of the
 * grid-editable slice of state, not a diff - deliberately, since the whole
 * editable state (256 memory bytes + 8 registers + marks) is tiny. */
interface EditSnapshot {
  memory: number[]
  registers: AppState['registers']
  marks: UserMarks
}

function snapshotOf(state: AppState): EditSnapshot {
  return { memory: state.memory, registers: state.registers, marks: state.marks }
}

export function useExecution(options: UseExecutionOptions = {}): UseExecutionResult {
  const { initialMemory, initialMarks, initialStepDelayMs = DEFAULT_STEP_DELAY_MS } = options
  const [appState, setAppState] = useState<AppState>(() => {
    const initial = createAppState(initialMemory)
    return initialMarks ? { ...initial, marks: initialMarks } : initial
  })
  const [consoleState, setConsoleState] = useState<ConsoleState>(() => createConsoleState())
  const [isRunning, setIsRunning] = useState(false)
  const [stepDelayMs, setStepDelayMs] = useState(initialStepDelayMs)
  const [lastChanged, setLastChanged] = useState<Effect[]>([])
  const [undoStack, setUndoStack] = useState<EditSnapshot[]>([])
  const [redoStack, setRedoStack] = useState<EditSnapshot[]>([])

  // Every one of these refs tracks its paired state synchronously (updated
  // at every call site below, not via a useEffect): an effect only runs
  // after render flushes, so two handler calls made back to back in the
  // same tick (e.g. two setInterval ticks, or rapid double-clicks) would
  // otherwise both read the *same* pre-batch snapshot instead of seeing
  // each other's effect.
  const appStateRef = useRef(appState)
  const setBothAppState = useCallback((next: AppState) => {
    appStateRef.current = next
    setAppState(next)
  }, [])
  const undoStackRef = useRef(undoStack)
  const setBothUndoStack = useCallback((next: EditSnapshot[]) => {
    undoStackRef.current = next
    setUndoStack(next)
  }, [])
  const redoStackRef = useRef(redoStack)
  const setBothRedoStack = useCallback((next: EditSnapshot[]) => {
    redoStackRef.current = next
    setRedoStack(next)
  }, [])

  const tickerRef = useRef<RunTicker | null>(null)
  const intervalRef = useRef<number | null>(null)

  const stopTimer = useCallback(() => {
    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  useEffect(() => stopTimer, [stopTimer])

  const logResult = useCallback((haltReason: AppState['haltReason'], error: AppState['error'], output: readonly OutputEvent[]) => {
    setConsoleState((prev) => {
      let next = appendOutputEvents(prev, output)
      if (haltReason) next = appendSystemMessage(next, describeHalt(haltReason), 'info')
      if (error) next = appendSystemMessage(next, describeError(error), 'error')
      return next
    })
  }, [])

  /** Pushes the state *before* an edit onto the undo stack and clears the
   * redo stack (a fresh edit invalidates whatever was previously redoable),
   * mirroring the appStateRef pattern above for the same batching-safety
   * reason. */
  const recordUndoStep = useCallback(() => {
    setBothUndoStack([...undoStackRef.current, snapshotOf(appStateRef.current)])
    setBothRedoStack([])
  }, [setBothRedoStack, setBothUndoStack])

  const applyGridEdit = useCallback(
    (next: GridState) => {
      recordUndoStep()
      setBothAppState({ ...appStateRef.current, memory: next.memory, registers: next.registers, marks: next.marks })
      setLastChanged([])
    },
    [recordUndoStep, setBothAppState],
  )

  const handleStep = useCallback(() => {
    const current = appStateRef.current
    if (current.halted || current.error) return
    const { state: nextCpu, result } = engineStep(toCpuState(current))
    const nextApp = mergeCpuState({ ...current, hasExecutionStarted: true }, nextCpu)
    setBothAppState(nextApp)
    setLastChanged(result.changed)
    logResult(nextCpu.haltReason, nextCpu.error, result.output)
  }, [logResult, setBothAppState])

  const runTick = useCallback(() => {
    const current = appStateRef.current
    if (current.halted || current.error || !tickerRef.current) {
      stopTimer()
      setIsRunning(false)
      return
    }
    const { state: nextCpu, result } = tickerRef.current.next(toCpuState(current))
    const nextApp = mergeCpuState({ ...current, hasExecutionStarted: true }, nextCpu)
    setBothAppState(nextApp)
    setLastChanged(result.changed)
    logResult(nextCpu.haltReason, nextCpu.error, result.output)
    if (nextCpu.halted || nextCpu.error) {
      stopTimer()
      setIsRunning(false)
    }
  }, [logResult, setBothAppState, stopTimer])

  const handleRunToggle = useCallback(() => {
    if (isRunning) {
      setIsRunning(false)
      return
    }
    if (appStateRef.current.halted || appStateRef.current.error) return
    // A fresh ticker per Run invocation: stuck-program/step-cap detection is
    // scoped to "a single Run invocation" (webapp-requirements.md §4), not
    // to manual Step presses, and not carried over between separate Runs.
    tickerRef.current = createRunTicker()
    setIsRunning(true)
  }, [isRunning])

  // The single authority for the running interval, so toggling Run/Stop and
  // changing the speed mid-run can never both schedule a timer at once.
  useEffect(() => {
    if (!isRunning) return
    intervalRef.current = window.setInterval(runTick, stepDelayMs)
    return () => {
      if (intervalRef.current !== null) window.clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [isRunning, stepDelayMs, runTick])

  // Shared by Reset, Delete All Data, and loading a new program (Open/an
  // example/a snapshot import): none of those make sense mid-Run.
  const stopExecution = useCallback(() => {
    stopTimer()
    setIsRunning(false)
    tickerRef.current = null
  }, [stopTimer])

  const handleReset = useCallback(() => {
    stopExecution()
    setBothAppState(resetExecution(appStateRef.current))
    setLastChanged([])
  }, [setBothAppState, stopExecution])

  const handleClearConsole = useCallback(() => setConsoleState(clearConsole()), [])

  const handleDeleteAllData = useCallback(() => {
    recordUndoStep()
    stopExecution()
    setBothAppState(createAppState())
    setLastChanged([])
  }, [recordUndoStep, setBothAppState, stopExecution])

  /** Replaces memory wholesale (Open, an example, or a snapshot import) -
   * registers and marks reset, execution status cleared, like a fresh
   * session with this program already typed in. Not part of undo/redo. */
  const handleLoadProgram = useCallback(
    (memory: readonly number[]) => {
      stopExecution()
      setBothAppState(createAppState(memory))
      setLastChanged([])
    },
    [setBothAppState, stopExecution],
  )

  const handleUndo = useCallback(() => {
    const stack = undoStackRef.current
    if (stack.length === 0) return
    const previous = stack[stack.length - 1]
    setBothUndoStack(stack.slice(0, -1))
    setBothRedoStack([...redoStackRef.current, snapshotOf(appStateRef.current)])
    setBothAppState({ ...appStateRef.current, memory: previous.memory, registers: previous.registers, marks: previous.marks })
    setLastChanged([])
  }, [setBothAppState, setBothRedoStack, setBothUndoStack])

  const handleRedo = useCallback(() => {
    const stack = redoStackRef.current
    if (stack.length === 0) return
    const next = stack[stack.length - 1]
    setBothRedoStack(stack.slice(0, -1))
    setBothUndoStack([...undoStackRef.current, snapshotOf(appStateRef.current)])
    setBothAppState({ ...appStateRef.current, memory: next.memory, registers: next.registers, marks: next.marks })
    setLastChanged([])
  }, [setBothAppState, setBothRedoStack, setBothUndoStack])

  return {
    appState,
    applyGridEdit,
    consoleState,
    isRunning,
    stepDelayMs,
    setStepDelayMs,
    lastChanged,
    handleStep,
    handleRunToggle,
    handleReset,
    handleClearConsole,
    handleDeleteAllData,
    handleLoadProgram,
    canUndo: undoStack.length > 0,
    canRedo: redoStack.length > 0,
    handleUndo,
    handleRedo,
  }
}
