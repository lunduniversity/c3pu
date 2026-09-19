import { memo } from 'react'
import { ArrowDownToLine, ArrowUpToLine, Eraser, GripVertical, Trash2 } from 'lucide-react'
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
  /** Row handle drag-to-reorder (mouse-first interaction model): this row
   * is the live drop target, or part of the range currently being dragged. */
  isDropTarget: boolean
  isBeingDragged: boolean
  registerCellRef: (cellIndex: number, bitIndex: number, el: HTMLElement | null) => void
  onBitKeyDown: (event: React.KeyboardEvent, cellIndex: number, bitIndex: number) => void
  onBitPointerDown: (event: React.PointerEvent, cellIndex: number, bitIndex: number) => void
  onBitDoubleClick: (event: React.MouseEvent, cellIndex: number, bitIndex: number) => void
  /** Fires on pointer-enter for both the bit cells and the row's own
   * selection-drag zone (address label, predicted-effect dots) - extends
   * whichever drag (range-selection or row-reorder) is currently active. */
  onCellPointerEnter: (cellIndex: number) => void
  /** Pointer-down on the row's selection-drag zone: starts a range
   * selection anchored at this row, same as pointer-down on one of its
   * bits, without landing on a specific bit. */
  onRowPointerDown: (event: React.PointerEvent, address: number) => void
  onHandlePointerDown: (event: React.PointerEvent<HTMLElement>, address: number) => void
  onHandlePointerMove: (event: React.PointerEvent<HTMLElement>) => void
  onHandlePointerUp: (event: React.PointerEvent<HTMLElement>) => void
  onHandlePointerCancel: (event: React.PointerEvent<HTMLElement>) => void
  onMarkChange: (address: number, mark: UserMark | null) => void
  onClearRow: (address: number) => void
  onDeleteRow: (address: number) => void
  onInsertBefore: (address: number) => void
  onInsertAfter: (address: number) => void
}

function emphasis(isIntended: boolean, isDeemphasized: boolean): string {
  if (isIntended) return 'font-semibold text-foreground'
  if (isDeemphasized) return 'text-muted-foreground/50'
  return ''
}

/** One background class, chosen by priority rather than layered - several
 * of these flags can be true on the same row at once (e.g. the PC's own
 * cell is selected), and stacking multiple bg-* utility classes leaves
 * which one actually wins up to Tailwind's generated stylesheet order,
 * which isn't predictable from here. Error/halted (rare, important) beat an
 * active selection, which in turn beats the always-on "this is the PC"
 * background (placeholder color pending the Phase 4 theme). */
function rowBackground(highlightBitmask: number): string | undefined {
  if ((highlightBitmask & HL_ERROR) !== 0) return 'bg-destructive/20'
  if ((highlightBitmask & HL_HALTED) !== 0) return 'bg-primary/10'
  if ((highlightBitmask & HL_SELECTED) !== 0) return 'bg-accent'
  if ((highlightBitmask & HL_PROGRAM_COUNTER) !== 0) return 'bg-yellow-100 dark:bg-yellow-900/30'
  return undefined
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
  isDropTarget,
  isBeingDragged,
  registerCellRef,
  onBitKeyDown,
  onBitPointerDown,
  onBitDoubleClick,
  onCellPointerEnter,
  onRowPointerDown,
  onHandlePointerDown,
  onHandlePointerMove,
  onHandlePointerUp,
  onHandlePointerCancel,
  onMarkChange,
  onClearRow,
  onDeleteRow,
  onInsertBefore,
  onInsertAfter,
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
      data-drop-target={isDropTarget || undefined}
      data-dragging={isBeingDragged || undefined}
      data-row-address={address}
      className={cn(
        'flex items-center gap-2 border-b border-t-2 border-t-transparent border-b-border/50 px-2 py-0.5',
        // A single background wins by priority - error/halted are rarer,
        // more important states than the always-on "this is the PC" one,
        // and an active selection should stay visible even over that.
        rowBackground(highlightBitmask),
        (highlightBitmask & HL_PROGRAM_COUNTER) !== 0 && 'outline outline-2 outline-primary',
        isBeingDragged && 'opacity-40',
        isDropTarget && 'border-t-primary',
      )}
    >
      <button
        type="button"
        aria-label={`Drag to move memory address ${address}`}
        title="Drag to move"
        className="flex h-6 w-4 shrink-0 cursor-grab touch-none items-center justify-center text-muted-foreground hover:text-foreground active:cursor-grabbing"
        onPointerDown={(event) => onHandlePointerDown(event, address)}
        onPointerMove={onHandlePointerMove}
        onPointerUp={onHandlePointerUp}
        onPointerCancel={onHandlePointerCancel}
      >
        <GripVertical className="h-3.5 w-3.5" aria-hidden="true" />
      </button>

      <div role="presentation" className="flex shrink-0 gap-0.5">
        <button
          type="button"
          aria-label={`Clear memory address ${address}`}
          title="Clear"
          className="flex h-6 w-6 items-center justify-center rounded-sm text-muted-foreground hover:bg-accent hover:text-foreground"
          onClick={() => onClearRow(address)}
        >
          <Eraser className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
        <button
          type="button"
          aria-label={`Delete memory address ${address}`}
          title="Delete"
          className="flex h-6 w-6 items-center justify-center rounded-sm text-muted-foreground hover:bg-accent hover:text-foreground"
          onClick={() => onDeleteRow(address)}
        >
          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
        <button
          type="button"
          aria-label={`Insert a row before memory address ${address}`}
          title="Insert before"
          className="flex h-6 w-6 items-center justify-center rounded-sm text-muted-foreground hover:bg-accent hover:text-foreground"
          onClick={() => onInsertBefore(address)}
        >
          <ArrowUpToLine className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
        <button
          type="button"
          aria-label={`Insert a row after memory address ${address}`}
          title="Insert after"
          className="flex h-6 w-6 items-center justify-center rounded-sm text-muted-foreground hover:bg-accent hover:text-foreground"
          onClick={() => onInsertAfter(address)}
        >
          <ArrowDownToLine className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>

      <span
        className="w-10 shrink-0 cursor-pointer font-mono text-xs text-muted-foreground select-none"
        onPointerDown={(event) => onRowPointerDown(event, address)}
        onPointerEnter={() => onCellPointerEnter(address)}
      >
        {address}
      </span>

      <div
        role="presentation"
        aria-hidden="true"
        className="flex w-6 shrink-0 cursor-pointer items-center gap-0.5"
        onPointerDown={(event) => onRowPointerDown(event, address)}
        onPointerEnter={() => onCellPointerEnter(address)}
      >
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
              onPointerEnter={onCellPointerEnter}
              onDoubleClick={onBitDoubleClick}
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
