import { useCallback, useEffect, useRef, useState } from 'react'
import { createRunTicker, step as engineStep, type OutputEvent, type RunTicker } from '@/engine/cpu'
import type { Effect } from '@/engine/types'
import { appendOutputEvents, appendSystemMessage, clearConsole, createConsoleState, type ConsoleState } from '@/console/log'
import { describeError, describeHalt } from '@/console/messages'
import type { GridState } from '@/grid/model'
import { type AppState, createAppState, mergeCpuState, resetExecution, toCpuState } from './state'

export const DEFAULT_STEP_DELAY_MS = 200

export interface UseExecutionResult {
  appState: AppState
  /** For the grid components' onChange - manual edits also clear the
   * "last step" actual-change highlighting, since that describes what
   * *execution* just did, not a hand edit. Only merges the grid-owned
   * fields (memory/registers/marks); execution status is untouched. */
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
   * marks *and* execution status together, unlike a plain grid edit. */
  handleDeleteAllData: () => void
}

export function useExecution(initialMemory?: readonly number[]): UseExecutionResult {
  const [appState, setAppState] = useState<AppState>(() => createAppState(initialMemory))
  const [consoleState, setConsoleState] = useState<ConsoleState>(() => createConsoleState())
  const [isRunning, setIsRunning] = useState(false)
  const [stepDelayMs, setStepDelayMs] = useState(DEFAULT_STEP_DELAY_MS)
  const [lastChanged, setLastChanged] = useState<Effect[]>([])

  // Tracks the latest AppState synchronously (updated at every call site
  // below, right alongside setAppState) rather than via a useEffect: an
  // effect only runs after render flushes, so two handler calls made back
  // to back in the same tick (e.g. two setInterval ticks, or a test calling
  // handleStep() several times in one act()) would otherwise both read the
  // *same* pre-batch snapshot instead of seeing each other's effect.
  const appStateRef = useRef(appState)
  const setBothAppState = useCallback((next: AppState) => {
    appStateRef.current = next
    setAppState(next)
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

  const applyGridEdit = useCallback(
    (next: GridState) => {
      setBothAppState({ ...appStateRef.current, memory: next.memory, registers: next.registers, marks: next.marks })
      setLastChanged([])
    },
    [setBothAppState],
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

  const handleReset = useCallback(() => {
    stopTimer()
    setIsRunning(false)
    tickerRef.current = null
    setBothAppState(resetExecution(appStateRef.current))
    setLastChanged([])
  }, [setBothAppState, stopTimer])

  const handleClearConsole = useCallback(() => setConsoleState(clearConsole()), [])

  const handleDeleteAllData = useCallback(() => {
    stopTimer()
    setIsRunning(false)
    tickerRef.current = null
    setBothAppState(createAppState())
    setLastChanged([])
  }, [setBothAppState, stopTimer])

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
  }
}
