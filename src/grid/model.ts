import { createMemory, createRegisters, MEMORY_SIZE, type RegisterName, type Registers } from '../engine/types'
import type { UserMarks } from './marks'

export interface GridState {
  memory: number[]
  registers: Registers
  marks: UserMarks
}

export function createGridState(memory?: readonly number[]): GridState {
  const mem = createMemory()
  if (memory) {
    for (let i = 0; i < MEMORY_SIZE && i < memory.length; i++) mem[i] = (memory[i] ?? 0) & 0xff
  }
  return { memory: mem, registers: createRegisters(), marks: {} }
}

function setBit(byte: number, bitIndex: number, value: 0 | 1): number {
  // bitIndex 0 = most significant bit, matching the §7.1 "MSB first" text format.
  const shift = 7 - bitIndex
  const mask = 1 << shift
  return value ? byte | mask : byte & ~mask
}

function getBit(byte: number, bitIndex: number): 0 | 1 {
  const shift = 7 - bitIndex
  return ((byte >> shift) & 1) as 0 | 1
}

export function readMemoryBit(memory: readonly number[], address: number, bitIndex: number): 0 | 1 {
  return getBit(memory[address] ?? 0, bitIndex)
}

export function setMemoryBit(state: GridState, address: number, bitIndex: number, value: 0 | 1): GridState {
  const memory = state.memory.slice()
  memory[address] = setBit(memory[address] ?? 0, bitIndex, value)
  return { ...state, memory }
}

export function toggleMemoryBit(state: GridState, address: number, bitIndex: number): GridState {
  const current = readMemoryBit(state.memory, address, bitIndex)
  return setMemoryBit(state, address, bitIndex, current ? 0 : 1)
}

export function readRegisterBit(registers: Registers, name: RegisterName, bitIndex: number): 0 | 1 {
  return getBit(registers[name], bitIndex)
}

export function setRegisterBit(state: GridState, name: RegisterName, bitIndex: number, value: 0 | 1): GridState {
  const registers = { ...state.registers, [name]: setBit(state.registers[name], bitIndex, value) }
  return { ...state, registers }
}

export function toggleRegisterBit(state: GridState, name: RegisterName, bitIndex: number): GridState {
  const current = readRegisterBit(state.registers, name, bitIndex)
  return setRegisterBit(state, name, bitIndex, current ? 0 : 1)
}

function clampRange(start: number, end: number): [number, number] {
  const lo = Math.max(0, Math.min(start, end))
  const hi = Math.min(MEMORY_SIZE - 1, Math.max(start, end))
  return [lo, hi]
}

/** Zeroes the selected cells' values, keeping their positions/count
 * unchanged (webapp-requirements.md §5). Marks are left as-is; the user can
 * clear them separately if desired. */
export function clearMemoryRange(state: GridState, start: number, end: number): GridState {
  const [lo, hi] = clampRange(start, end)
  const memory = state.memory.slice()
  for (let i = lo; i <= hi; i++) memory[i] = 0
  return { ...state, memory }
}

/** Removes the selected cells entirely and shifts everything after them up
 * to close the gap - a structural edit, distinct from Clear. Marks shift
 * along with the data they describe; marks that belonged to deleted cells
 * are dropped. */
export function deleteMemoryRange(state: GridState, start: number, end: number): GridState {
  const [lo, hi] = clampRange(start, end)
  const count = hi - lo + 1
  const memory = state.memory.slice()
  memory.splice(lo, count)
  while (memory.length < MEMORY_SIZE) memory.push(0)

  const marks: Record<number, UserMarks[number]> = {}
  for (const [key, mark] of Object.entries(state.marks)) {
    const address = Number(key)
    if (address < lo) {
      marks[address] = mark
    } else if (address > hi) {
      marks[address - count] = mark
    }
    // marks within [lo, hi] belonged to deleted cells - dropped.
  }
  return { ...state, memory, marks }
}

/**
 * Moves the selected block [start,end] so it starts at `targetStart`
 * (before or after its current position), shifting the cells it passes
 * over accordingly - an in-place reorder, not a copy. The general form of
 * moveMemoryRange's "shift by one," used by the row handle's drag-to-
 * arbitrary-position (webapp-requirements.md §5, mouse-first interaction
 * model). A no-op if the block would end up back where it started, or
 * `targetStart` is clamped to the same position by memory's bounds.
 */
export function moveMemoryRangeTo(state: GridState, start: number, end: number, targetStart: number): GridState {
  const [lo, hi] = clampRange(start, end)
  const count = hi - lo + 1
  const clampedTarget = Math.max(0, Math.min(targetStart, MEMORY_SIZE - count))
  if (clampedTarget === lo) return state

  // Remove the block, then reinsert it at the target position - simplest
  // expressed as one array of {byte, mark} pairs so memory and marks can
  // never drift out of sync with each other mid-computation.
  const cells: { byte: number; mark: UserMarks[number] | undefined }[] = state.memory.map((byte, address) => ({
    byte,
    mark: state.marks[address],
  }))
  const block = cells.splice(lo, count)
  cells.splice(clampedTarget, 0, ...block)

  const memory = cells.map((cell) => cell.byte)
  const marks: Record<number, UserMarks[number]> = {}
  cells.forEach((cell, address) => {
    if (cell.mark !== undefined) marks[address] = cell.mark
  })
  return { ...state, memory, marks }
}

/**
 * Shifts the selected block of cells by one position, displacing the
 * single adjacent neighbor cell accordingly - webapp-requirements.md §5. A
 * no-op at either end of memory.
 */
export function moveMemoryRange(state: GridState, start: number, end: number, direction: 'up' | 'down'): GridState {
  const [lo, hi] = clampRange(start, end)
  return moveMemoryRangeTo(state, lo, hi, direction === 'up' ? lo - 1 : lo + 1)
}

/**
 * Inserts `count` blank (zero-valued, unmarked) cells starting at
 * `atAddress`, shifting existing cells (and their marks) down and
 * truncating whatever falls off the end of memory - the mirror image of
 * deleteMemoryRange's shift-up-and-pad-with-zero, for the mouse-first
 * "Insert row before/after" row action. A no-op past the end of memory
 * (nothing to shift into) or for a non-positive count.
 */
export function insertBlankRows(state: GridState, atAddress: number, count: number): GridState {
  const at = Math.max(0, Math.min(atAddress, MEMORY_SIZE))
  if (count <= 0 || at >= MEMORY_SIZE) return state

  const memory = state.memory.slice()
  memory.splice(at, 0, ...new Array(count).fill(0))
  memory.length = MEMORY_SIZE

  const marks: Record<number, UserMarks[number]> = {}
  for (const [key, mark] of Object.entries(state.marks)) {
    const address = Number(key)
    if (address < at) marks[address] = mark
    else if (address + count < MEMORY_SIZE) marks[address + count] = mark
    // marks shifted at/past address 256 belonged to cells that fell off the
    // end - dropped, same as deleteMemoryRange drops marks in a deleted range.
  }
  return { ...state, memory, marks }
}

/**
 * Pastes bytes starting at `start`. When `end` is given (a bounded range
 * selection), the destination is fixed at end-start+1 cells: pasting more
 * values truncates at that bound, pasting fewer leaves the remainder of the
 * range unchanged. When `end` is omitted (pasting at a single cursor
 * position), the destination is bounded only by the end of memory; any
 * overflow past address 255 is dropped, not wrapped.
 */
export function pasteMemoryBytes(state: GridState, start: number, end: number | null, bytes: readonly number[]): GridState {
  const destinationEnd = end !== null ? clampRange(start, end)[1] : MEMORY_SIZE - 1
  const destinationStart = end !== null ? clampRange(start, end)[0] : Math.max(0, Math.min(start, MEMORY_SIZE - 1))
  const capacity = destinationEnd - destinationStart + 1
  const memory = state.memory.slice()
  const count = Math.min(bytes.length, capacity)
  for (let i = 0; i < count; i++) memory[destinationStart + i] = bytes[i] & 0xff
  return { ...state, memory }
}

/** A single, explicitly-confirmed, irreversible action that resets all of
 * memory and all registers to zero (webapp-requirements.md §5) - distinct
 * from Reset (engine-level, preserves the program) and Close (file
 * association only). Also clears all cell marks, since they describe data
 * that no longer exists. */
export function deleteAllData(): GridState {
  return createGridState()
}
