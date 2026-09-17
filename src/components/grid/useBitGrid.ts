import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Shared cursor/selection/keyboard/pointer logic for the memory and
 * register bit grids (webapp-requirements.md §11.2/§11.3): a roving-tabindex
 * bit-level edit cursor, plus a whole-cell range selection, driven by one
 * centralized handler rather than per-field logic. Operates on an abstract
 * 0-based `cellIndex` (256 for memory, 8 for registers) - RegisterGrid maps
 * cellIndex <-> RegisterName at its boundary.
 */
export interface BitCursor {
  cellIndex: number
  bitIndex: number
}

export interface CellRange {
  anchor: number
  focus: number
}

export interface UseBitGridParams {
  cellCount: number
  autoAdvance: boolean
  onToggleBit: (cellIndex: number, bitIndex: number) => void
  onSetBit: (cellIndex: number, bitIndex: number, value: 0 | 1) => void
}

export interface UseBitGridResult {
  cursor: BitCursor
  selection: CellRange
  setSelection: (range: CellRange) => void
  moveCursorTo: (cellIndex: number, bitIndex?: number) => void
  registerCellRef: (cellIndex: number, bitIndex: number, el: HTMLElement | null) => void
  handleBitKeyDown: (event: React.KeyboardEvent, cellIndex: number, bitIndex: number) => void
  handleBitPointerDown: (event: React.PointerEvent, cellIndex: number, bitIndex: number) => void
  handleBitPointerEnter: (cellIndex: number) => void
  isTabStop: (cellIndex: number, bitIndex: number) => boolean
}

export function useBitGrid({ cellCount, autoAdvance, onToggleBit, onSetBit }: UseBitGridParams): UseBitGridResult {
  const [cursor, setCursor] = useState<BitCursor>({ cellIndex: 0, bitIndex: 0 })
  const [selection, setSelection] = useState<CellRange>({ anchor: 0, focus: 0 })
  const draggingRef = useRef(false)
  const cellRefs = useRef(new Map<string, HTMLElement>())

  const focusCell = useCallback((cellIndex: number, bitIndex: number) => {
    cellRefs.current.get(`${cellIndex}:${bitIndex}`)?.focus()
  }, [])

  const moveCursor = useCallback(
    (next: BitCursor, extendSelection: boolean) => {
      const clamped: BitCursor = {
        cellIndex: Math.max(0, Math.min(cellCount - 1, next.cellIndex)),
        bitIndex: Math.max(0, Math.min(7, next.bitIndex)),
      }
      setCursor(clamped)
      setSelection((prev) => ({ anchor: extendSelection ? prev.anchor : clamped.cellIndex, focus: clamped.cellIndex }))
      focusCell(clamped.cellIndex, clamped.bitIndex)
    },
    [cellCount, focusCell],
  )

  const moveCursorTo = useCallback((cellIndex: number, bitIndex = 0) => moveCursor({ cellIndex, bitIndex }, false), [moveCursor])

  // Takes the cell/bit just acted on explicitly, rather than reading cursor
  // state: setCursor() doesn't apply synchronously, so a version reading
  // `cursor` here would still see the *previous* position when called right
  // after moveCursor() in the same handler (a stale-closure bug caught by
  // manual browser testing - see the Phase 2 fixture in App.tsx history).
  const advanceFrom = useCallback(
    (cellIndex: number, bitIndex: number) => {
      const nextBit = bitIndex + 1
      if (nextBit > 7) moveCursor({ cellIndex: cellIndex + 1, bitIndex: 0 }, false)
      else moveCursor({ cellIndex, bitIndex: nextBit }, false)
    },
    [moveCursor],
  )

  const registerCellRef = useCallback((cellIndex: number, bitIndex: number, el: HTMLElement | null) => {
    const key = `${cellIndex}:${bitIndex}`
    if (el) cellRefs.current.set(key, el)
    else cellRefs.current.delete(key)
  }, [])

  const handleBitKeyDown = useCallback(
    (event: React.KeyboardEvent, cellIndex: number, bitIndex: number) => {
      const editAndMaybeAdvance = (mutate: () => void) => {
        mutate()
        if (autoAdvance) advanceFrom(cellIndex, bitIndex)
      }
      switch (event.code) {
        case 'ArrowLeft':
          event.preventDefault()
          moveCursor({ cellIndex, bitIndex: bitIndex - 1 }, event.shiftKey)
          return
        case 'ArrowRight':
          event.preventDefault()
          moveCursor({ cellIndex, bitIndex: bitIndex + 1 }, event.shiftKey)
          return
        case 'ArrowUp':
          event.preventDefault()
          moveCursor({ cellIndex: cellIndex - 1, bitIndex }, event.shiftKey)
          return
        case 'ArrowDown':
          event.preventDefault()
          moveCursor({ cellIndex: cellIndex + 1, bitIndex }, event.shiftKey)
          return
        case 'Digit0':
        case 'Numpad0':
          event.preventDefault()
          editAndMaybeAdvance(() => onSetBit(cellIndex, bitIndex, 0))
          return
        case 'Digit1':
        case 'Numpad1':
          event.preventDefault()
          editAndMaybeAdvance(() => onSetBit(cellIndex, bitIndex, 1))
          return
        case 'KeyF':
          event.preventDefault()
          editAndMaybeAdvance(() => onToggleBit(cellIndex, bitIndex))
          return
        case 'Space':
          event.preventDefault()
          onToggleBit(cellIndex, bitIndex)
          return
        case 'Enter':
          event.preventDefault()
          advanceFrom(cellIndex, bitIndex)
          return
      }
    },
    [advanceFrom, autoAdvance, moveCursor, onSetBit, onToggleBit],
  )

  const handleBitPointerDown = useCallback(
    (event: React.PointerEvent, cellIndex: number, bitIndex: number) => {
      // Without this, the browser's own "focus the element under the
      // pointer" default action fires after this handler returns and
      // silently overrides whatever cell we just focused programmatically
      // (e.g. the auto-advanced next bit) - caught by manual browser testing.
      event.preventDefault()
      draggingRef.current = true
      if (event.shiftKey) {
        moveCursor({ cellIndex, bitIndex }, true)
        return
      }
      moveCursor({ cellIndex, bitIndex }, false)
      onToggleBit(cellIndex, bitIndex)
      if (autoAdvance) advanceFrom(cellIndex, bitIndex)
    },
    [advanceFrom, autoAdvance, moveCursor, onToggleBit],
  )

  const handleBitPointerEnter = useCallback((cellIndex: number) => {
    if (!draggingRef.current) return
    setSelection((prev) => ({ anchor: prev.anchor, focus: cellIndex }))
  }, [])

  useEffect(() => {
    const onPointerUp = () => {
      draggingRef.current = false
    }
    window.addEventListener('pointerup', onPointerUp)
    return () => window.removeEventListener('pointerup', onPointerUp)
  }, [])

  const isTabStop = useCallback((cellIndex: number, bitIndex: number) => cursor.cellIndex === cellIndex && cursor.bitIndex === bitIndex, [cursor])

  return {
    cursor,
    selection,
    setSelection,
    moveCursorTo,
    registerCellRef,
    handleBitKeyDown,
    handleBitPointerDown,
    handleBitPointerEnter,
    isTabStop,
  }
}
