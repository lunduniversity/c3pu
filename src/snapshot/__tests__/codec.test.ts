import { describe, expect, it } from 'vitest'
import { MEMORY_SIZE } from '@/engine/types'
import { exportSnapshot, importSnapshot } from '../codec'

function memoryOf(overrides: Record<number, number>): number[] {
  const memory = new Array(MEMORY_SIZE).fill(0)
  for (const [k, v] of Object.entries(overrides)) memory[Number(k)] = v
  return memory
}

/** Mirrors codec.ts's own text encoding, so a test can hand-craft a
 * malformed *compact byte stream* (as opposed to malformed base64 text)
 * without codec.ts needing to export its private helpers. */
function encodeCompactBytes(bytes: number[]): string {
  const binary = String.fromCharCode(...bytes)
  return `c3pu1:${btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')}`
}

describe('exportSnapshot / importSnapshot', () => {
  it('round-trips an all-zero memory', () => {
    const memory = memoryOf({})
    const result = importSnapshot(exportSnapshot(memory))
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.memory).toEqual(memory)
  })

  it('round-trips a sparse program (mostly zero with scattered bytes)', () => {
    const memory = memoryOf({ 0: 0b01010110, 1: 72, 2: 0b10110000, 3: 0b11100000, 200: 255, 255: 1 })
    const result = importSnapshot(exportSnapshot(memory))
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.memory).toEqual(memory)
  })

  it('round-trips a fully non-zero memory (worst case for the zero-run compression)', () => {
    const memory = Array.from({ length: MEMORY_SIZE }, (_, i) => (i % 255) + 1)
    const result = importSnapshot(exportSnapshot(memory))
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.memory).toEqual(memory)
  })

  it('round-trips a zero run of exactly 256 (the full-width edge case) as a single short record', () => {
    const memory = memoryOf({})
    const exported = exportSnapshot(memory)
    // the whole 256-byte all-zero memory should compress to one short record
    expect(exported.length).toBeLessThan(15)
    const result = importSnapshot(exported)
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.memory).toEqual(memory)
  })

  it('compresses a sparse program to something much shorter than the raw 256 bytes', () => {
    const memory = memoryOf({ 0: 5, 1: 6, 2: 7 })
    const exported = exportSnapshot(memory)
    expect(exported.length).toBeLessThan(30)
  })

  it('rejects text without the version prefix', () => {
    const result = importSnapshot('not-a-snapshot')
    expect(result.ok).toBe(false)
  })

  it('rejects invalid base64url content after a valid prefix', () => {
    const result = importSnapshot('c3pu1:not valid base64!!')
    expect(result.ok).toBe(false)
  })

  it('rejects a snapshot that decodes to fewer than 256 cells (truncated)', () => {
    // A single zero-run record of length 1 - nowhere near 256 cells.
    const result = importSnapshot(encodeCompactBytes([0x00, 0]))
    expect(result.ok).toBe(false)
  })

  it('rejects a snapshot that would decode to more than 256 cells (overrun)', () => {
    // Two consecutive full-width (256-cell) zero-run records - 512 cells total.
    const result = importSnapshot(encodeCompactBytes([0x00, 255, 0x00, 255]))
    expect(result.ok).toBe(false)
  })

  it('rejects a zero-run record missing its length byte (truncated mid-record)', () => {
    const result = importSnapshot(encodeCompactBytes([5, 5, 0x00]))
    expect(result.ok).toBe(false)
  })

  it('never partially applies a malformed import - the result carries no memory on failure', () => {
    const result = importSnapshot('garbage')
    expect(result.ok).toBe(false)
    expect('memory' in result).toBe(false)
  })

  it('tolerates surrounding whitespace (e.g. pasted from a chat message)', () => {
    const memory = memoryOf({ 5: 9 })
    const result = importSnapshot(`  ${exportSnapshot(memory)}  \n`)
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.memory).toEqual(memory)
  })
})
