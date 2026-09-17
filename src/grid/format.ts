import { asciiDisplay } from '../ascii'

export function toBinaryText(byte: number): string {
  return (byte & 0xff).toString(2).padStart(8, '0')
}

export function toHexText(byte: number): string {
  return (byte & 0xff).toString(16).padStart(2, '0').toUpperCase()
}

export function toDecimalText(byte: number): string {
  return String(byte & 0xff)
}

export function toAsciiText(byte: number): string {
  return asciiDisplay(byte & 0xff).label
}
