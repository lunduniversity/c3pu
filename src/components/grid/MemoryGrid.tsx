import { useCallback, useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { useLatestRef } from '@/lib/useLatestRef'
import type { Effect } from '@/engine/types'
import { parseClipboardText, serializeSelection } from '@/grid/clipboard'
import { computeMemoryHighlights, predictedEffects } from '@/grid/highlight'
import { encodeMemoryHighlight } from '@/grid/highlightBitmask'
import { deriveEffectiveMarks, type UserMark } from '@/grid/marks'
import {
  clearMemoryRange,
  deleteAllData,
  deleteMemoryRange,
  type GridState,
  insertBlankRows,
  moveMemoryRange,
  moveMemoryRangeTo,
  pasteMemoryBytes,
  setMemoryBit,
  toggleMemoryBit,
} from '@/grid/model'
import { useBitGrid } from './useBitGrid'
import { useRowDrag, type RowRange } from './useRowDrag'
import { MemoryRow } from './MemoryRow'

export interface MemoryGridProps {
  state: GridState
  onChange: (next: GridState) => void
  autoAdvance?: boolean
  /** Where predictive read/write highlighting (§5) should be computed from
   * once execution has started - the program counter - as opposed to
   * following the edit cursor while idle. Null (the idle default) falls
   * back to the cursor; this is deliberately *not* the same thing as
   * `currentPcAddress` below, which always reflects the real PC. */
  programCounterAddress?: number | null
  /** The program counter's actual current address, always - shown as a
   * distinct border/background on that memory cell (§5) regardless of
   * whether execution has started yet, so it's visible immediately after a
   * program is loaded or Reset, not just after the first Step. */
  currentPcAddress?: number | null
  lastChanged?: readonly Effect[]
  haltedNormallyAt?: number | null
  errorAt?: number | null
  /** Notifies the parent of the current edit-cursor address, so sibling
   * views (e.g. RegisterGrid) can predict from the same source cell. */
  onCursorChange?: (address: number) => void
  /** Overrides the default Delete All Data handling (which only touches
   * memory/registers/marks) - e.g. so the app layer can also clear
   * execution status, which this component has no notion of. Still asks
   * for confirmation itself either way. */
  onDeleteAllData?: () => void
}

export function MemoryGrid({
  state,
  onChange,
  autoAdvance = false,
  programCounterAddress = null,
  currentPcAddress = null,
  lastChanged = [],
  haltedNormallyAt = null,
  errorAt = null,
  onCursorChange,
  onDeleteAllData,
}: MemoryGridProps) {
  // Read via a ref rather than closing over `state` directly in the
  // callbacks below: those are passed identically to every one of the 256
  // rows, so an identity that changes on every edit would bust each row's
  // memo() on every edit too (webapp-requirements.md §11.4).
  const stateRef = useLatestRef(state)

  const onToggleBit = useCallback(
    (address: number, bitIndex: number) => onChange(toggleMemoryBit(stateRef.current, address, bitIndex)),
    [onChange, stateRef],
  )
  const onSetBit = useCallback(
    (address: number, bitIndex: number, value: 0 | 1) => onChange(setMemoryBit(stateRef.current, address, bitIndex, value)),
    [onChange, stateRef],
  )

  const {
    cursor,
    selection,
    registerCellRef,
    handleBitKeyDown,
    handleBitPointerDown,
    handleRowPointerDown,
    handleBitPointerEnter,
    handleBitDoubleClick,
  } = useBitGrid({
    cellCount: 256,
    autoAdvance,
    onToggleBit,
    onSetBit,
  })

  useEffect(() => {
    onCursorChange?.(cursor.cellIndex)
  }, [cursor.cellIndex, onCursorChange])

  const selectionRange = useMemo(() => ({ start: Math.min(selection.anchor, selection.focus), end: Math.max(selection.anchor, selection.focus) }), [selection])
  const selectionRangeRef = useLatestRef(selectionRange)

  /** The range a row-level action (handle drag, clear/delete/insert button)
   * should act on: the whole active selection if the acted-on row is part
   * of it, or just that single row otherwise - mirrors how a spreadsheet
   * applies a row action to a multi-row selection. Reads the selection via
   * a ref so this - and everything built on it below - stays stable across
   * selection changes, for the same memo()-stability reason as stateRef. */
  const effectiveRange = useCallback(
    (address: number): RowRange => {
      const sel = selectionRangeRef.current
      return address >= sel.start && address <= sel.end ? sel : { start: address, end: address }
    },
    [selectionRangeRef],
  )

  const handleRowDrop = useCallback(
    (range: RowRange, targetStart: number) => onChange(moveMemoryRangeTo(stateRef.current, range.start, range.end, targetStart)),
    [onChange, stateRef],
  )
  const { dragRange, dropTargetAddress, handleHandlePointerDown, handleHandlePointerMove, handleHandlePointerUp, handleHandlePointerCancel } =
    useRowDrag(handleRowDrop)

  const handleHandleStart = useCallback(
    (event: React.PointerEvent<HTMLElement>, address: number) => handleHandlePointerDown(event, effectiveRange(address)),
    [handleHandlePointerDown, effectiveRange],
  )

  const effectiveMarks = useMemo(() => deriveEffectiveMarks(state.memory, state.marks), [state.memory, state.marks])

  const predictionSource = programCounterAddress ?? cursor.cellIndex
  const predicted = useMemo(
    () => predictedEffects(state.memory, state.registers, predictionSource),
    [state.memory, state.registers, predictionSource],
  )

  const highlights = useMemo(
    () =>
      computeMemoryHighlights({
        predicted,
        changed: lastChanged,
        cursorAddress: cursor.cellIndex,
        selection: selectionRange,
        programCounterAddress: currentPcAddress,
        haltedNormallyAt,
        errorAt,
      }),
    [predicted, lastChanged, cursor.cellIndex, selectionRange, currentPcAddress, haltedNormallyAt, errorAt],
  )

  const handleMarkChange = useCallback(
    (address: number, mark: UserMark | null) => {
      const current = stateRef.current
      const next = { ...current.marks }
      if (mark) next[address] = mark
      else delete next[address]
      onChange({ ...current, marks: next })
    },
    [onChange, stateRef],
  )

  const handleCopy = useCallback(
    (event: React.ClipboardEvent) => {
      const text = serializeSelection(state.memory, selectionRange.start, selectionRange.end)
      event.clipboardData.setData('text/plain', text)
      event.preventDefault()
    },
    [state.memory, selectionRange],
  )

  const handlePaste = useCallback(
    (event: React.ClipboardEvent) => {
      const text = event.clipboardData.getData('text/plain')
      const parsed = parseClipboardText(text)
      event.preventDefault()
      if (!parsed.ok) return
      const isRealRange = selection.anchor !== selection.focus
      onChange(pasteMemoryBytes(state, selectionRange.start, isRealRange ? selectionRange.end : null, parsed.bytes))
    },
    [state, selection, selectionRange, onChange],
  )

  const handleClear = useCallback(() => onChange(clearMemoryRange(state, selectionRange.start, selectionRange.end)), [state, selectionRange, onChange])
  const handleDelete = useCallback(() => onChange(deleteMemoryRange(state, selectionRange.start, selectionRange.end)), [state, selectionRange, onChange])

  const handleRowClear = useCallback(
    (address: number) => {
      const range = effectiveRange(address)
      onChange(clearMemoryRange(stateRef.current, range.start, range.end))
    },
    [effectiveRange, onChange, stateRef],
  )
  const handleRowDelete = useCallback(
    (address: number) => {
      const range = effectiveRange(address)
      onChange(deleteMemoryRange(stateRef.current, range.start, range.end))
    },
    [effectiveRange, onChange, stateRef],
  )
  const handleRowInsertBefore = useCallback(
    (address: number) => {
      const range = effectiveRange(address)
      onChange(insertBlankRows(stateRef.current, range.start, range.end - range.start + 1))
    },
    [effectiveRange, onChange, stateRef],
  )
  const handleRowInsertAfter = useCallback(
    (address: number) => {
      const range = effectiveRange(address)
      onChange(insertBlankRows(stateRef.current, range.end + 1, range.end - range.start + 1))
    },
    [effectiveRange, onChange, stateRef],
  )

  const handleMoveUp = useCallback(
    () => onChange(moveMemoryRange(state, selectionRange.start, selectionRange.end, 'up')),
    [state, selectionRange, onChange],
  )
  const handleMoveDown = useCallback(
    () => onChange(moveMemoryRange(state, selectionRange.start, selectionRange.end, 'down')),
    [state, selectionRange, onChange],
  )
  const handleDeleteAllData = useCallback(() => {
    if (!window.confirm('Delete all memory and register data? This cannot be undone.')) return
    if (onDeleteAllData) onDeleteAllData()
    else onChange(deleteAllData())
  }, [onChange, onDeleteAllData])

  return (
    <div>
      <div className="mb-2 flex gap-2">
        <Button size="sm" variant="outline" onClick={handleClear}>
          Clear
        </Button>
        <Button size="sm" variant="outline" onClick={handleDelete}>
          Delete
        </Button>
        <Button size="sm" variant="outline" onClick={handleMoveUp}>
          Move up
        </Button>
        <Button size="sm" variant="outline" onClick={handleMoveDown}>
          Move down
        </Button>
        <Button size="sm" variant="destructive" onClick={handleDeleteAllData}>
          Delete all data
        </Button>
      </div>
      <div
        role="grid"
        aria-label="Memory"
        aria-rowcount={256}
        aria-multiselectable="true"
        className="max-h-[70vh] overflow-auto"
        onCopy={handleCopy}
        onPaste={handlePaste}
      >
        {state.memory.map((byte, address) => {
          const mark = effectiveMarks[address]
          return (
            <MemoryRow
              key={address}
              address={address}
              byte={byte}
              nextByte={state.memory[address + 1] ?? 0}
              cursorBitIndex={cursor.cellIndex === address ? cursor.bitIndex : null}
              highlightBitmask={encodeMemoryHighlight(highlights[address])}
              markKind={mark.kind}
              markRepresentation={mark.kind === 'data' ? mark.representation : undefined}
              operandOwnerAddress={mark.kind === 'operand' ? mark.ownerAddress : undefined}
              isDropTarget={dropTargetAddress === address}
              isBeingDragged={dragRange !== null && address >= dragRange.start && address <= dragRange.end}
              registerCellRef={registerCellRef}
              onBitKeyDown={handleBitKeyDown}
              onBitPointerDown={handleBitPointerDown}
              onBitDoubleClick={handleBitDoubleClick}
              onCellPointerEnter={handleBitPointerEnter}
              onRowPointerDown={handleRowPointerDown}
              onHandlePointerDown={handleHandleStart}
              onHandlePointerMove={handleHandlePointerMove}
              onHandlePointerUp={handleHandlePointerUp}
              onHandlePointerCancel={handleHandlePointerCancel}
              onMarkChange={handleMarkChange}
              onClearRow={handleRowClear}
              onDeleteRow={handleRowDelete}
              onInsertBefore={handleRowInsertBefore}
              onInsertAfter={handleRowInsertAfter}
            />
          )
        })}
      </div>
    </div>
  )
}
