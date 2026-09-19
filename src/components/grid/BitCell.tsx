import { memo } from 'react'
import { cn } from '@/lib/utils'

export interface BitCellProps {
  cellIndex: number
  bitIndex: number
  value: 0 | 1
  isTabStop: boolean
  isCursor: boolean
  ariaLabel: string
  cellRef: (el: HTMLElement | null) => void
  onKeyDown: (event: React.KeyboardEvent, cellIndex: number, bitIndex: number) => void
  onPointerDown: (event: React.PointerEvent, cellIndex: number, bitIndex: number) => void
  onPointerEnter: (cellIndex: number) => void
  onDoubleClick: (event: React.MouseEvent, cellIndex: number, bitIndex: number) => void
}

/**
 * A single bit, modeled as a non-text toggle (webapp-requirements.md §11.2)
 * rather than a text `<input>` - a bit is a boolean, not free text, so this
 * avoids re-implementing caret movement/selection-across-fields the way a
 * repurposed text field would need.
 */
function BitCellImpl({
  cellIndex,
  bitIndex,
  value,
  isTabStop,
  isCursor,
  ariaLabel,
  cellRef,
  onKeyDown,
  onPointerDown,
  onPointerEnter,
  onDoubleClick,
}: BitCellProps) {
  return (
    <div
      ref={cellRef}
      role="gridcell"
      aria-label={ariaLabel}
      tabIndex={isTabStop ? 0 : -1}
      data-cursor={isCursor || undefined}
      data-value={value}
      className={cn(
        'flex h-6 w-6 shrink-0 select-none items-center justify-center rounded-sm border font-mono text-xs outline-none',
        value ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground',
        isCursor ? 'ring-2 ring-ring ring-offset-1' : 'border-border',
      )}
      onKeyDown={(event) => onKeyDown(event, cellIndex, bitIndex)}
      onPointerDown={(event) => onPointerDown(event, cellIndex, bitIndex)}
      onPointerEnter={() => onPointerEnter(cellIndex)}
      onDoubleClick={(event) => onDoubleClick(event, cellIndex, bitIndex)}
    >
      {value}
    </div>
  )
}

export const BitCell = memo(BitCellImpl)
