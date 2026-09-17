import { Button } from '@/components/ui/button'
import type { HaltReason, RuntimeError } from '@/engine/types'

export interface ExecutionControlsProps {
  isRunning: boolean
  halted: boolean
  haltReason: HaltReason | null
  error: RuntimeError | null
  stepDelayMs: number
  onStep: () => void
  onRunToggle: () => void
  onReset: () => void
  onStepDelayChange: (ms: number) => void
}

function statusText(isRunning: boolean, halted: boolean, haltReason: HaltReason | null, error: RuntimeError | null): string {
  if (error) return `Error: ${error.message}`
  if (halted) return haltReason === 'normal' ? 'Halted (program completed normally)' : 'Halted (reached the end of memory)'
  if (isRunning) return 'Running…'
  return 'Idle'
}

/**
 * Step/Run/Reset (webapp-requirements.md §4). Run and Stop are the same
 * toggle. The status text is an aria-live region so a screen reader user
 * learns about a halt/error the same way a sighted user does from the
 * grid's highlight changes (§11.5).
 */
export function ExecutionControls({
  isRunning,
  halted,
  haltReason,
  error,
  stepDelayMs,
  onStep,
  onRunToggle,
  onReset,
  onStepDelayChange,
}: ExecutionControlsProps) {
  const stopped = halted || error !== null

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button size="sm" onClick={onStep} disabled={isRunning || stopped}>
        Step
      </Button>
      <Button size="sm" variant={isRunning ? 'destructive' : 'default'} onClick={onRunToggle} disabled={!isRunning && stopped}>
        {isRunning ? 'Stop' : 'Run'}
      </Button>
      <Button size="sm" variant="outline" onClick={onReset}>
        Reset
      </Button>
      <label className="flex items-center gap-2 text-sm">
        Speed
        <input
          type="range"
          min={20}
          max={1000}
          step={20}
          value={stepDelayMs}
          onChange={(event) => onStepDelayChange(Number(event.target.value))}
          aria-label="Delay between steps while running, in milliseconds"
        />
        <span className="tabular-nums text-muted-foreground">{stepDelayMs}ms/step</span>
      </label>
      <span role="status" aria-live="polite" className="text-sm font-medium">
        {statusText(isRunning, halted, haltReason, error)}
      </span>
    </div>
  )
}
