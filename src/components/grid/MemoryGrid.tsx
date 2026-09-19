import { useCallback, useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/button'
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
  moveMemoryRange,
  pasteMemoryBytes,
  setMemoryBit,
  toggleMemoryBit,
} from '@/grid/model'
import { useBitGrid } from './useBitGrid'
import { MemoryRow } from './MemoryRow'

export interface MemoryGridProps {
  state: GridState
  onChange: (next: GridState) => void
  autoAdvance?: boolean
  /** Execution state, supplied once Phase 3 wires the engine in; omitted
   * (or null) while there is nothing currently running. */
  programCounterAddress?: number | null
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
  lastChanged = [],
  haltedNormallyAt = null,
  errorAt = null,
  onCursorChange,
  onDeleteAllData,
}: MemoryGridProps) {
  const onToggleBit = useCallback((address: number, bitIndex: number) => onChange(toggleMemoryBit(state, address, bitIndex)), [state, onChange])
  const onSetBit = useCallback(
    (address: number, bitIndex: number, value: 0 | 1) => onChange(setMemoryBit(state, address, bitIndex, value)),
    [state, onChange],
  )

  const { cursor, selection, registerCellRef, handleBitKeyDown, handleBitPointerDown, handleBitPointerEnter } = useBitGrid({
    cellCount: 256,
    autoAdvance,
    onToggleBit,
    onSetBit,
  })

  useEffect(() => {
    onCursorChange?.(cursor.cellIndex)
  }, [cursor.cellIndex, onCursorChange])

  const selectionRange = useMemo(() => ({ start: Math.min(selection.anchor, selection.focus), end: Math.max(selection.anchor, selection.focus) }), [selection])

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
        programCounterAddress,
        haltedNormallyAt,
        errorAt,
      }),
    [predicted, lastChanged, cursor.cellIndex, selectionRange, programCounterAddress, haltedNormallyAt, errorAt],
  )

  const handleMarkChange = useCallback(
    (address: number, mark: UserMark | null) => {
      const next = { ...state.marks }
      if (mark) next[address] = mark
      else delete next[address]
      onChange({ ...state, marks: next })
    },
    [state, onChange],
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
              registerCellRef={registerCellRef}
              onBitKeyDown={handleBitKeyDown}
              onBitPointerDown={handleBitPointerDown}
              onBitPointerEnter={handleBitPointerEnter}
              onMarkChange={handleMarkChange}
            />
          )
        })}
      </div>
    </div>
  )
}
