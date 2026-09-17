import { MEMORY_SIZE } from '@/engine/types'

/**
 * Compact snapshot export/import (webapp-requirements.md §7.3): the full
 * 256-byte memory image as a single copyable text string, compressing long
 * runs of zero (most student programs use only a small fraction of memory)
 * rather than spelling out every cell. Round-tripping export -> import must
 * reproduce the exact original memory; malformed input is rejected wholesale,
 * never partially applied.
 *
 * Compact byte encoding: 0x00 is reserved as a "zero-run" marker, always
 * followed by one length byte encoding (run length - 1), so a single byte
 * covers runs of 1-256 zeros. Any non-zero byte is emitted literally - there
 * is no ambiguity, since a literal byte is never 0x00 by construction. That
 * compact byte stream is then base64url-encoded (URL/clipboard-safe, no
 * padding) behind a short version prefix so a clearly-invalid string is
 * rejected immediately rather than partway through decoding.
 */
const PREFIX = 'c3pu1:'

function compress(memory: readonly number[]): number[] {
  const out: number[] = []
  let i = 0
  while (i < MEMORY_SIZE) {
    if (memory[i] === 0) {
      let runLength = 1
      while (i + runLength < MEMORY_SIZE && memory[i + runLength] === 0 && runLength < 256) runLength++
      out.push(0x00, runLength - 1)
      i += runLength
    } else {
      out.push(memory[i])
      i++
    }
  }
  return out
}

/** Returns null if the compact byte stream doesn't decode to exactly 256
 * bytes (truncated, overrun, or otherwise malformed). */
function decompress(bytes: readonly number[]): number[] | null {
  const out: number[] = []
  let i = 0
  while (i < bytes.length) {
    const byte = bytes[i]
    if (byte === 0x00) {
      const lengthByte = bytes[i + 1]
      if (lengthByte === undefined) return null
      const runLength = lengthByte + 1
      if (out.length + runLength > MEMORY_SIZE) return null
      for (let k = 0; k < runLength; k++) out.push(0)
      i += 2
    } else {
      if (out.length + 1 > MEMORY_SIZE) return null
      out.push(byte)
      i += 1
    }
  }
  return out.length === MEMORY_SIZE ? out : null
}

function bytesToBase64Url(bytes: readonly number[]): string {
  const binary = String.fromCharCode(...bytes)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function base64UrlToBytes(text: string): number[] | null {
  if (!/^[A-Za-z0-9\-_]*$/.test(text)) return null
  const padded = text.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(text.length / 4) * 4, '=')
  try {
    const binary = atob(padded)
    return [...binary].map((ch) => ch.charCodeAt(0))
  } catch {
    return null
  }
}

export function exportSnapshot(memory: readonly number[]): string {
  return PREFIX + bytesToBase64Url(compress(memory))
}

export type ImportSnapshotResult = { ok: true; memory: number[] } | { ok: false; message: string }

export function importSnapshot(text: string): ImportSnapshotResult {
  const trimmed = text.trim()
  if (!trimmed.startsWith(PREFIX)) {
    return { ok: false, message: `not a c3pu snapshot (expected it to start with "${PREFIX}")` }
  }
  const body = trimmed.slice(PREFIX.length)
  const bytes = base64UrlToBytes(body)
  if (bytes === null) return { ok: false, message: 'not valid base64url text' }
  const memory = decompress(bytes)
  if (memory === null) return { ok: false, message: `does not decode to exactly ${MEMORY_SIZE} memory cells` }
  return { ok: true, memory }
}
