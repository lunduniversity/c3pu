import { describe, expect, it } from 'vitest'
import { encodeMemoryHighlight, HL_ACTUAL_CHANGE, HL_CURSOR, HL_PREDICTED_READ } from '../highlightBitmask'

describe('encodeMemoryHighlight', () => {
  it('encodes each flag as an independent bit', () => {
    const bitmask = encodeMemoryHighlight({
      predictedRead: true,
      predictedWrite: false,
      actualChange: true,
      isCursor: true,
      selected: false,
      isProgramCounter: false,
      haltedHere: false,
      errorHere: false,
    })
    expect(bitmask & HL_PREDICTED_READ).toBeTruthy()
    expect(bitmask & HL_ACTUAL_CHANGE).toBeTruthy()
    expect(bitmask & HL_CURSOR).toBeTruthy()
    expect(bitmask).toBe(HL_PREDICTED_READ | HL_ACTUAL_CHANGE | HL_CURSOR)
  })

  it('encodes "nothing set" as 0', () => {
    const bitmask = encodeMemoryHighlight({
      predictedRead: false,
      predictedWrite: false,
      actualChange: false,
      isCursor: false,
      selected: false,
      isProgramCounter: false,
      haltedHere: false,
      errorHere: false,
    })
    expect(bitmask).toBe(0)
  })
})
