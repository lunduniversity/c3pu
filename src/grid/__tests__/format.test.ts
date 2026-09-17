import { describe, expect, it } from 'vitest'
import { toAsciiText, toBinaryText, toDecimalText, toHexText } from '../format'

describe('format helpers', () => {
  it('renders binary, MSB first, zero-padded to 8 digits', () => {
    expect(toBinaryText(0b01010110)).toBe('01010110')
    expect(toBinaryText(1)).toBe('00000001')
  })

  it('renders uppercase, zero-padded hex', () => {
    expect(toHexText(255)).toBe('FF')
    expect(toHexText(5)).toBe('05')
  })

  it('renders decimal', () => {
    expect(toDecimalText(200)).toBe('200')
  })

  it('renders printable ASCII as the literal character', () => {
    expect(toAsciiText(72)).toBe('H')
  })

  it('renders control characters as their standard mnemonic', () => {
    expect(toAsciiText(0)).toBe('NUL')
    expect(toAsciiText(10)).toBe('LF')
  })

  it('renders bytes above the 7-bit ASCII range as a hex escape', () => {
    expect(toAsciiText(200)).toBe('\\xc8')
  })
})
