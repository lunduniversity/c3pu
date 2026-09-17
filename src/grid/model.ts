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
 * Shifts the selected block of cells by one position, displacing the
 * single adjacent neighbor cell accordingly (an in-place reorder, not a
 * copy) - webapp-requirements.md §5. A no-op at either end of memory.
 */
export function moveMemoryRange(state: GridState, start: number, end: number, direction: 'up' | 'down'): GridState {
  const [lo, hi] = clampRange(start, end)
  if (direction === 'up' && lo === 0) return state
  if (direction === 'down' && hi === MEMORY_SIZE - 1) return state

  const memory = state.memory.slice()
  const marks = { ...state.marks }

  if (direction === 'up') {
    const neighborValue = memory[lo - 1]
    const neighborMark = marks[lo - 1]
    for (let i = lo - 1; i < hi; i++) {
      memory[i] = memory[i + 1]
      if (marks[i + 1] !== undefined) marks[i] = marks[i + 1]
      else delete marks[i]
    }
    memory[hi] = neighborValue
    if (neighborMark !== undefined) marks[hi] = neighborMark
    else delete marks[hi]
  } else {
    const neighborValue = memory[hi + 1]
    const neighborMark = marks[hi + 1]
    for (let i = hi + 1; i > lo; i--) {
      memory[i] = memory[i - 1]
      if (marks[i - 1] !== undefined) marks[i] = marks[i - 1]
      else delete marks[i]
    }
    memory[lo] = neighborValue
    if (neighborMark !== undefined) marks[lo] = neighborMark
    else delete marks[lo]
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
