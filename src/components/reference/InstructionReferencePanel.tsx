import { INSTRUCTION_REFERENCE } from '@/reference/instructions'
import type { Mnemonic } from '@/engine/types'
import { cn } from '@/lib/utils'

export interface InstructionReferencePanelProps {
  /** The mnemonic at whatever address the cursor/PC is currently on (§3/§8:
   * "the instruction corresponding to whatever the cursor/PC is currently
   * on should be highlighted in this list"), or null if there's nothing
   * meaningful to highlight (e.g. an invalid instruction). */
  currentMnemonic: Mnemonic | null
}

export function InstructionReferencePanel({ currentMnemonic }: InstructionReferencePanelProps) {
  return (
    <dl className="flex flex-col gap-3 text-sm">
      {INSTRUCTION_REFERENCE.map((entry) => {
        const isCurrent = entry.mnemonic === currentMnemonic
        return (
          <div
            key={entry.mnemonic}
            data-current={isCurrent || undefined}
            className={cn('rounded p-2', isCurrent && 'bg-accent ring-1 ring-ring')}
          >
            <dt className="font-mono font-semibold">
              {entry.mnemonic}
              {entry.alsoRenderedAs && <span className="font-sans font-normal text-muted-foreground"> (shown as {entry.alsoRenderedAs} when applicable)</span>}
              <span className="ml-2 font-sans font-normal text-muted-foreground">{entry.cells} cell{entry.cells === 2 ? 's' : ''}</span>
            </dt>
            <dd className="mt-1 flex flex-col gap-0.5">
              <span>
                <span className="font-medium">Operand: </span>
                {entry.operand}
              </span>
              <span>
                <span className="font-medium">Behavior: </span>
                {entry.behavior}
              </span>
              <span className="text-muted-foreground">{entry.purpose}</span>
            </dd>
          </div>
        )
      })}
    </dl>
  )
}
