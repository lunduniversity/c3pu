import { useCallback, useEffect, useRef, useState } from 'react'

export interface RowRange {
  start: number
  end: number
}

export interface UseRowDragResult {
  /** The range currently being dragged via its handle, or null when idle -
   * lets the dragged rows render a "lifted" look. */
  dragRange: RowRange | null
  /** The address currently under the pointer while dragging - the position
   * the range would land at if dropped now. Drives the drop-target
   * indicator; also null when idle. */
  dropTargetAddress: number | null
  handleHandlePointerDown: (event: React.PointerEvent, range: RowRange) => void
  handleRowPointerEnterForDrag: (address: number) => void
}

/**
 * Drag-to-arbitrary-position for the memory grid's row handles (mouse-first
 * interaction model): grabbing a row's handle and dragging it over other
 * rows tracks a live drop target, and releasing commits the move via
 * `onDrop`. Deliberately separate from useBitGrid's own pointer-drag state
 * (range *selection*) - a handle-drag and a selection-drag are different
 * gestures started from different elements, so they never interfere with
 * each other even though both listen for the same pointer events.
 */
export function useRowDrag(onDrop: (range: RowRange, targetStart: number) => void): UseRowDragResult {
  const [dragRange, setDragRange] = useState<RowRange | null>(null)
  const [dropTargetAddress, setDropTargetAddress] = useState<number | null>(null)
  const draggingRef = useRef<RowRange | null>(null)
  const dropTargetRef = useRef<number | null>(null)

  const handleHandlePointerDown = useCallback((event: React.PointerEvent, range: RowRange) => {
    event.preventDefault()
    draggingRef.current = range
    dropTargetRef.current = range.start
    setDragRange(range)
    setDropTargetAddress(range.start)
  }, [])

  const handleRowPointerEnterForDrag = useCallback((address: number) => {
    if (!draggingRef.current) return
    dropTargetRef.current = address
    setDropTargetAddress(address)
  }, [])

  useEffect(() => {
    const onPointerUp = () => {
      const range = draggingRef.current
      const target = dropTargetRef.current
      draggingRef.current = null
      dropTargetRef.current = null
      setDragRange(null)
      setDropTargetAddress(null)
      if (range !== null && target !== null && target !== range.start) onDrop(range, target)
    }
    window.addEventListener('pointerup', onPointerUp)
    return () => window.removeEventListener('pointerup', onPointerUp)
  }, [onDrop])

  return { dragRange, dropTargetAddress, handleHandlePointerDown, handleRowPointerEnterForDrag }
}
