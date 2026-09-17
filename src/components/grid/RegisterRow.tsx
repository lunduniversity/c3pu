import { memo } from 'react'
import type { RegisterName } from '@/engine/types'
import { toAsciiText, toDecimalText, toHexText } from '@/grid/format'
import { HL_ACTUAL_CHANGE, HL_ERROR, HL_HALTED, HL_PREDICTED_READ, HL_PREDICTED_WRITE, HL_PROGRAM_COUNTER, HL_SELECTED } from '@/grid/highlightBitmask'
import { cn } from '@/lib/utils'
import { BitCell } from './BitCell'

export interface RegisterRowProps {
  index: number
  name: RegisterName
  value: number
  cursorBitIndex: number | null
  highlightBitmask: number
  registerCellRef: (cellIndex: number, bitIndex: number, el: HTMLElement | null) => void
  onKeyDown: (event: React.KeyboardEvent, cellIndex: number, bitIndex: number) => void
  onPointerDown: (event: React.PointerEvent, cellIndex: number, bitIndex: number) => void
  onPointerEnter: (cellIndex: number) => void
}

function RegisterRowImpl({
  index,
  name,
  value,
  cursorBitIndex,
  highlightBitmask,
  registerCellRef,
  onKeyDown,
  onPointerDown,
  onPointerEnter,
}: RegisterRowProps) {
  return (
    <div
      role="row"
      aria-rowindex={index + 1}
      aria-selected={(highlightBitmask & HL_SELECTED) !== 0}
      className={cn(
        'flex items-center gap-2 border-b border-border/50 px-2 py-0.5',
        (highlightBitmask & HL_SELECTED) !== 0 && 'bg-accent',
        (highlightBitmask & HL_PROGRAM_COUNTER) !== 0 && 'outline outline-2 outline-primary',
        (highlightBitmask & HL_ERROR) !== 0 && 'bg-destructive/20',
        (highlightBitmask & HL_HALTED) !== 0 && 'bg-primary/10',
      )}
    >
      <span className="w-10 shrink-0 font-mono text-xs font-semibold text-muted-foreground">{name}</span>

      <div role="presentation" aria-hidden="true" className="flex w-6 shrink-0 items-center gap-0.5">
        {(highlightBitmask & HL_PREDICTED_READ) !== 0 && <span title="Would be read" className="h-2 w-2 rounded-full bg-blue-400" />}
        {(highlightBitmask & HL_PREDICTED_WRITE) !== 0 && <span title="Would be written" className="h-2 w-2 rounded-full bg-orange-400" />}
        {(highlightBitmask & HL_ACTUAL_CHANGE) !== 0 && <span title="Just changed" className="h-2 w-2 rounded-full bg-green-500" />}
      </div>

      <div role="presentation" className="flex shrink-0 gap-0.5">
        {Array.from({ length: 8 }, (_, bitIndex) => {
          const bit = ((value >> (7 - bitIndex)) & 1) as 0 | 1
          return (
            <BitCell
              key={bitIndex}
              cellIndex={index}
              bitIndex={bitIndex}
              value={bit}
              isTabStop={cursorBitIndex === bitIndex}
              isCursor={cursorBitIndex === bitIndex}
              ariaLabel={`Register ${name}, bit ${bitIndex}, value ${bit}`}
              cellRef={(el) => registerCellRef(index, bitIndex, el)}
              onKeyDown={onKeyDown}
              onPointerDown={onPointerDown}
              onPointerEnter={onPointerEnter}
            />
          )
        })}
      </div>

      <span role="gridcell" className="w-8 shrink-0 select-text font-mono text-xs">
        {toHexText(value)}
      </span>
      <span role="gridcell" className="w-10 shrink-0 select-text font-mono text-xs">
        {toDecimalText(value)}
      </span>
      <span role="gridcell" className="w-10 shrink-0 select-text font-mono text-xs">
        {toAsciiText(value)}
      </span>
    </div>
  )
}

export const RegisterRow = memo(RegisterRowImpl)
