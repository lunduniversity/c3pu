import { describe, expect, it } from 'vitest'
import { parseClipboardText, serializeSelection } from '../clipboard'

describe('clipboard round-trip', () => {
  it('serializes a selection and parses it back to the same bytes', () => {
    const memory = new Array(256).fill(0)
    memory[10] = 0b01010110
    memory[11] = 72
    memory[12] = 0

    const text = serializeSelection(memory, 10, 12)
    const parsed = parseClipboardText(text)
    expect(parsed.ok).toBe(true)
    if (parsed.ok) expect(parsed.bytes).toEqual([0b01010110, 72, 0])
  })

  it('serializes regardless of start/end order', () => {
    const memory = [1, 2, 3]
    expect(serializeSelection(memory, 2, 0)).toBe(serializeSelection(memory, 0, 2))
  })
})
