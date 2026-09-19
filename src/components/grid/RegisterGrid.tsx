import { useCallback, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { REGISTER_NAMES, type Effect } from '@/engine/types'
import { parseClipboardText } from '@/grid/clipboard'
import { computeRegisterHighlights, predictedEffects } from '@/grid/highlight'
import { encodeCellHighlight } from '@/grid/highlightBitmask'
import { serializeBytes } from '@/engine/program-format'
import { type GridState, setRegisterBit, toggleRegisterBit } from '@/grid/model'
import { useBitGrid } from './useBitGrid'
import { RegisterRow } from './RegisterRow'

export interface RegisterGridProps {
  state: GridState
  onChange: (next: GridState) => void
  autoAdvance?: boolean
  memoryCursorAddress?: number | null
  lastChanged?: readonly Effect[]
}

export function RegisterGrid({ state, onChange, autoAdvance = false, memoryCursorAddress = null, lastChanged = [] }: RegisterGridProps) {
  const onToggleBit = useCallback(
    (index: number, bitIndex: number) => onChange(toggleRegisterBit(state, REGISTER_NAMES[index], bitIndex)),
    [state, onChange],
  )
  const onSetBit = useCallback(
    (index: number, bitIndex: number, value: 0 | 1) => onChange(setRegisterBit(state, REGISTER_NAMES[index], bitIndex, value)),
    [state, onChange],
  )

  const { cursor, selection, registerCellRef, handleBitKeyDown, handleBitPointerDown, handleBitPointerEnter } = useBitGrid({
    cellCount: 8,
    autoAdvance,
    onToggleBit,
    onSetBit,
  })

  const selectionRange = useMemo(
    () => ({ start: REGISTER_NAMES[Math.min(selection.anchor, selection.focus)], end: REGISTER_NAMES[Math.max(selection.anchor, selection.focus)] }),
    [selection],
  )

  // The memory edit cursor (if any) is what predicts these registers'
  // read/write effects, unless this grid's own cursor currently has focus -
  // approximated here by always predicting from the memory cursor, since
  // register values themselves don't decode into instructions.
  const predicted = useMemo(
    () => predictedEffects(state.memory, state.registers, memoryCursorAddress),
    [state.memory, state.registers, memoryCursorAddress],
  )

  const highlights = useMemo(
    () =>
      computeRegisterHighlights({
        predicted,
        changed: lastChanged,
        cursorRegister: REGISTER_NAMES[cursor.cellIndex],
        selection: selectionRange,
      }),
    [predicted, lastChanged, cursor.cellIndex, selectionRange],
  )

  const handleClear = useCallback(() => {
    const lo = Math.min(selection.anchor, selection.focus)
    const hi = Math.max(selection.anchor, selection.focus)
    const registers = { ...state.registers }
    for (let i = lo; i <= hi; i++) registers[REGISTER_NAMES[i]] = 0
    onChange({ ...state, registers })
  }, [state, selection, onChange])

  const handleCopy = useCallback(
    (event: React.ClipboardEvent) => {
      const lo = Math.min(selection.anchor, selection.focus)
      const hi = Math.max(selection.anchor, selection.focus)
      const bytes = REGISTER_NAMES.slice(lo, hi + 1).map((name) => state.registers[name])
      event.clipboardData.setData('text/plain', serializeBytes(bytes))
      event.preventDefault()
    },
    [state.registers, selection],
  )

  const handlePaste = useCallback(
    (event: React.ClipboardEvent) => {
      const parsed = parseClipboardText(event.clipboardData.getData('text/plain'))
      event.preventDefault()
      if (!parsed.ok) return
      const lo = Math.min(selection.anchor, selection.focus)
      const hi = Math.max(selection.anchor, selection.focus)
      const registers = { ...state.registers }
      for (let i = 0; i < parsed.bytes.length && lo + i <= hi; i++) {
        registers[REGISTER_NAMES[lo + i]] = parsed.bytes[i] & 0xff
      }
      onChange({ ...state, registers })
    },
    [state, selection, onChange],
  )

  return (
    <div>
      <div className="mb-2 flex gap-2">
        <Button size="sm" variant="outline" onClick={handleClear}>
          Clear
        </Button>
      </div>
      <div
        role="grid"
        aria-label="Registers"
        aria-rowcount={8}
        aria-multiselectable="true"
        className="overflow-x-auto"
        onCopy={handleCopy}
        onPaste={handlePaste}
      >
        {REGISTER_NAMES.map((name, index) => (
          <RegisterRow
            key={name}
            index={index}
            name={name}
            value={state.registers[name]}
            cursorBitIndex={cursor.cellIndex === index ? cursor.bitIndex : null}
            highlightBitmask={encodeCellHighlight(highlights[name])}
            registerCellRef={registerCellRef}
            onKeyDown={handleBitKeyDown}
            onPointerDown={handleBitPointerDown}
            onPointerEnter={handleBitPointerEnter}
          />
        ))}
      </div>
    </div>
  )
}
