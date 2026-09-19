import { useCallback, useRef, useState } from 'react'

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
  handleHandlePointerDown: (event: React.PointerEvent<HTMLElement>, range: RowRange) => void
  handleHandlePointerMove: (event: React.PointerEvent<HTMLElement>) => void
  handleHandlePointerUp: (event: React.PointerEvent<HTMLElement>) => void
  handleHandlePointerCancel: (event: React.PointerEvent<HTMLElement>) => void
}

/**
 * Drag-to-arbitrary-position for the memory grid's row handles (mouse-first
 * interaction model): grabbing a row's handle and dragging it over other
 * rows tracks a live drop target, and releasing commits the move via
 * `onDrop`.
 *
 * Deliberately uses explicit pointer capture + `elementFromPoint` hit-
 * testing rather than relying on `pointerenter` firing on whatever row the
 * cursor passes over: a plain div reliably keeps receiving hover-tracking
 * events while a mouse button is held (that's how useBitGrid's own range-
 * selection drag works), but a native `<button>` - what the handle actually
 * is - doesn't reliably do the same across browsers once it's the pointer-
 * down target. Capturing the pointer on the handle itself sidesteps that
 * entirely: every subsequent pointermove/pointerup is delivered to the
 * handle regardless of what's visually under the cursor, and this hook does
 * its own hit-testing from the event's coordinates instead of trusting
 * ambient hover events.
 */
export function useRowDrag(onDrop: (range: RowRange, targetStart: number) => void): UseRowDragResult {
  const [dragRange, setDragRange] = useState<RowRange | null>(null)
  const [dropTargetAddress, setDropTargetAddress] = useState<number | null>(null)
  const draggingRef = useRef<RowRange | null>(null)
  const dropTargetRef = useRef<number | null>(null)

  const handleHandlePointerDown = useCallback((event: React.PointerEvent<HTMLElement>, range: RowRange) => {
    event.preventDefault()
    event.currentTarget.setPointerCapture?.(event.pointerId)
    draggingRef.current = range
    dropTargetRef.current = range.start
    setDragRange(range)
    setDropTargetAddress(range.start)
  }, [])

  const handleHandlePointerMove = useCallback((event: React.PointerEvent<HTMLElement>) => {
    if (!draggingRef.current) return
    const hit = document.elementFromPoint(event.clientX, event.clientY)
    const rowEl = hit instanceof Element ? hit.closest<HTMLElement>('[data-row-address]') : null
    if (!rowEl) return
    const address = Number(rowEl.dataset.rowAddress)
    if (Number.isNaN(address) || address === dropTargetRef.current) return
    dropTargetRef.current = address
    setDropTargetAddress(address)
  }, [])

  const endDrag = useCallback(
    (commit: boolean) => {
      const range = draggingRef.current
      const target = dropTargetRef.current
      draggingRef.current = null
      dropTargetRef.current = null
      setDragRange(null)
      setDropTargetAddress(null)
      if (commit && range !== null && target !== null && target !== range.start) onDrop(range, target)
    },
    [onDrop],
  )

  const handleHandlePointerUp = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      if (!draggingRef.current) return
      event.currentTarget.releasePointerCapture?.(event.pointerId)
      endDrag(true)
    },
    [endDrag],
  )

  // A rare safety net (e.g. the browser interrupts the gesture and revokes
  // capture on its own) - end the drag without committing a move.
  const handleHandlePointerCancel = useCallback(() => endDrag(false), [endDrag])

  return {
    dragRange,
    dropTargetAddress,
    handleHandlePointerDown,
    handleHandlePointerMove,
    handleHandlePointerUp,
    handleHandlePointerCancel,
  }
}
