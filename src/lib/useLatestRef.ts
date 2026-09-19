import { useEffect, useRef } from 'react'

/**
 * A ref that always holds the latest `value`, for reading fresh state
 * inside a stable useCallback without putting that state in its dependency
 * array. Updated in an effect (not during render) per the react-hooks/refs
 * rule - safe because effects commit before any user-triggered event can
 * fire the callback that reads it.
 */
export function useLatestRef<T>(value: T) {
  const ref = useRef(value)
  useEffect(() => {
    ref.current = value
  })
  return ref
}
