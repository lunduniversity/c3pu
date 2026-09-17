import { memo } from 'react'
import { decode } from '@/engine/decode'
import { toAsciiText, toDecimalText, toHexText } from '@/grid/format'
import { HL_ACTUAL_CHANGE, HL_CURSOR, HL_ERROR, HL_HALTED, HL_PREDICTED_READ, HL_PREDICTED_WRITE, HL_PROGRAM_COUNTER, HL_SELECTED } from '@/grid/highlightBitmask'
import type { DataRepresentation, UserMark } from '@/grid/marks'
import { cn } from '@/lib/utils'
import { BitCell } from './BitCell'
import { MarkPicker } from './MarkPicker'

export interface MemoryRowProps {
  address: number
  byte: number
  nextByte: number
  cursorBitIndex: number | null
  highlightBitmask: number
  markKind: 'unmarked' | 'code' | 'data' | 'operand'
  markRepresentation?: DataRepresentation
  operandOwnerAddress?: number
  registerCellRef: (cellIndex: number, bitIndex: number, el: HTMLElement | null) => void
  onBitKeyDown: (event: React.KeyboardEvent, cellIndex: number, bitIndex: number) => void
  onBitPointerDown: (event: React.PointerEvent, cellIndex: number, bitIndex: number) => void
  onBitPointerEnter: (cellIndex: number) => void
  onMarkChange: (address: number, mark: UserMark | null) => void
}

function emphasis(isIntended: boolean, isDeemphasized: boolean): string {
  if (isIntended) return 'font-semibold text-foreground'
  if (isDeemphasized) return 'text-muted-foreground/50'
  return ''
}

function MemoryRowImpl({
  address,
  byte,
  nextByte,
  cursorBitIndex,
  highlightBitmask,
  markKind,
  markRepresentation,
  operandOwnerAddress,
  registerCellRef,
  onBitKeyDown,
  onBitPointerDown,
  onBitPointerEnter,
  onMarkChange,
}: MemoryRowProps) {
  const instruction = decode([byte, nextByte], 0)
  const hasCustomEmphasis = markKind === 'code' || markKind === 'data'

  return (
    <div
      role="row"
      aria-rowindex={address + 1}
      data-predicted-read={(highlightBitmask & HL_PREDICTED_READ) !== 0 || undefined}
      data-predicted-write={(highlightBitmask & HL_PREDICTED_WRITE) !== 0 || undefined}
      data-actual-change={(highlightBitmask & HL_ACTUAL_CHANGE) !== 0 || undefined}
      data-cursor-row={(highlightBitmask & HL_CURSOR) !== 0 || undefined}
      aria-selected={(highlightBitmask & HL_SELECTED) !== 0}
      data-program-counter={(highlightBitmask & HL_PROGRAM_COUNTER) !== 0 || undefined}
      data-halted={(highlightBitmask & HL_HALTED) !== 0 || undefined}
      data-error={(highlightBitmask & HL_ERROR) !== 0 || undefined}
      className={cn(
        'flex items-center gap-2 border-b border-border/50 px-2 py-0.5',
        (highlightBitmask & HL_SELECTED) !== 0 && 'bg-accent',
        (highlightBitmask & HL_PROGRAM_COUNTER) !== 0 && 'outline outline-2 outline-primary',
        (highlightBitmask & HL_ERROR) !== 0 && 'bg-destructive/20',
        (highlightBitmask & HL_HALTED) !== 0 && 'bg-primary/10',
      )}
    >
      <span className="w-10 shrink-0 font-mono text-xs text-muted-foreground">{address}</span>

      <div role="presentation" aria-hidden="true" className="flex w-6 shrink-0 items-center gap-0.5">
        {(highlightBitmask & HL_PREDICTED_READ) !== 0 && <span title="Would be read" className="h-2 w-2 rounded-full bg-blue-400" />}
        {(highlightBitmask & HL_PREDICTED_WRITE) !== 0 && <span title="Would be written" className="h-2 w-2 rounded-full bg-orange-400" />}
        {(highlightBitmask & HL_ACTUAL_CHANGE) !== 0 && <span title="Just changed" className="h-2 w-2 rounded-full bg-green-500" />}
      </div>

      <div role="presentation" className="flex shrink-0 gap-0.5">
        {Array.from({ length: 8 }, (_, bitIndex) => {
          const value = ((byte >> (7 - bitIndex)) & 1) as 0 | 1
          return (
            <BitCell
              key={bitIndex}
              cellIndex={address}
              bitIndex={bitIndex}
              value={value}
              isTabStop={cursorBitIndex === bitIndex}
              isCursor={cursorBitIndex === bitIndex}
              ariaLabel={`Memory address ${address}, bit ${bitIndex}, value ${value}`}
              cellRef={(el) => registerCellRef(address, bitIndex, el)}
              onKeyDown={onBitKeyDown}
              onPointerDown={onBitPointerDown}
              onPointerEnter={onBitPointerEnter}
            />
          )
        })}
      </div>

      <span
        role="gridcell"
        className={cn('w-8 shrink-0 select-text font-mono text-xs', emphasis(hasCustomEmphasis && markRepresentation === 'hex', hasCustomEmphasis))}
      >
        {toHexText(byte)}
      </span>
      <span
        role="gridcell"
        className={cn('w-10 shrink-0 select-text font-mono text-xs', emphasis(hasCustomEmphasis && markRepresentation === 'decimal', hasCustomEmphasis))}
      >
        {toDecimalText(byte)}
      </span>
      <span
        role="gridcell"
        className={cn('w-10 shrink-0 select-text font-mono text-xs', emphasis(hasCustomEmphasis && markRepresentation === 'ascii', hasCustomEmphasis))}
      >
        {toAsciiText(byte)}
      </span>
      <span
        role="gridcell"
        className={cn('min-w-40 shrink-0 select-text font-mono text-xs', emphasis(markKind === 'code', hasCustomEmphasis || markKind === 'operand'))}
      >
        {markKind === 'operand' ? `→ operand of #${operandOwnerAddress}` : instruction.describe()}
      </span>

      <MarkPicker
        address={address}
        markKind={markKind}
        markRepresentation={markRepresentation}
        operandOwnerAddress={operandOwnerAddress}
        onChange={(mark) => onMarkChange(address, mark)}
      />
    </div>
  )
}

export const MemoryRow = memo(MemoryRowImpl)
