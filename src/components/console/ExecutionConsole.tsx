import { useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import type { ConsoleState } from '@/console/log'
import { cn } from '@/lib/utils'

export interface ExecutionConsoleProps {
  consoleState: ConsoleState
  onClear: () => void
}

/**
 * The output console (webapp-requirements.md §6): one ordered log,
 * auto-scrolling to the latest entry, with the three output categories
 * (character output, decimal output, system messages) visually
 * distinguished. Plain selectable text throughout - no custom clipboard
 * handling needed here, unlike the bit-editor grid.
 */
export function ExecutionConsole({ consoleState, onClear }: ExecutionConsoleProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [consoleState.entries.length])

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-lg font-medium">Output</h2>
        <Button size="sm" variant="outline" onClick={onClear}>
          Clear output
        </Button>
      </div>
      <div
        ref={scrollRef}
        role="log"
        aria-label="Program output"
        aria-live="polite"
        className="h-48 overflow-y-auto rounded border border-border bg-background p-2 font-mono text-sm"
      >
        {consoleState.entries.length === 0 && <div className="text-muted-foreground italic">No output yet.</div>}
        {consoleState.entries.map((entry, index) => {
          if (entry.kind === 'chars') {
            return (
              <div key={index} data-output-kind="chars" className="whitespace-pre-wrap">
                {entry.text}
              </div>
            )
          }
          if (entry.kind === 'decimal') {
            return (
              <div key={index} data-output-kind="decimal" className="font-semibold text-blue-700 dark:text-blue-400">
                {entry.value}
              </div>
            )
          }
          return (
            <div
              key={index}
              data-output-kind="system"
              data-level={entry.level}
              className={cn('italic', entry.level === 'error' ? 'text-destructive' : 'text-muted-foreground')}
            >
              {entry.text}
            </div>
          )
        })}
      </div>
    </div>
  )
}
