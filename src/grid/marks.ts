import { decode } from '../engine/decode'
import { MEMORY_SIZE } from '../engine/types'

/**
 * §11.11 (decided: build it). A cell's *effective* interpretation is
 * "unmarked" (show every representation equally - the default) unless the
 * user explicitly marks it, with one exception: the trailing operand cell of
 * a 2-cell instruction whose leading cell is marked "code" is automatically
 * "operand" data, not independently markable. This module keeps that
 * derivation as a pure recomputation from (memory, userMarks) rather than
 * stored/cached state, so "reconsidered whenever the leading cell's marking
 * or opcode changes" (§11.11) falls out for free - there is nothing stale to
 * invalidate.
 */
export type DataRepresentation = 'binary' | 'hex' | 'decimal' | 'ascii'

export type UserMark = { kind: 'code' } | { kind: 'data'; representation: DataRepresentation }

export type UserMarks = Readonly<Record<number, UserMark>>

export type EffectiveMark =
  | { kind: 'unmarked' }
  | { kind: 'code' }
  | { kind: 'data'; representation: DataRepresentation }
  | { kind: 'operand'; ownerAddress: number }

export function deriveEffectiveMarks(memory: readonly number[], marks: UserMarks): EffectiveMark[] {
  const effective: EffectiveMark[] = new Array(MEMORY_SIZE)
  let address = 0
  while (address < MEMORY_SIZE) {
    const userMark = marks[address]
    if (!userMark) {
      effective[address] = { kind: 'unmarked' }
      address += 1
      continue
    }
    effective[address] = userMark
    if (userMark.kind === 'code') {
      const instruction = decode(memory, address)
      if (instruction.length === 2 && address + 1 < MEMORY_SIZE) {
        effective[address + 1] = { kind: 'operand', ownerAddress: address }
        address += 2
        continue
      }
    }
    address += 1
  }
  return effective
}

/** Returns marks unchanged if `address` is currently an auto-derived operand
 * cell (§11.11: not independently markable) - a defensive domain check, not
 * just a UI affordance, so callers other than the mark-picker control can't
 * bypass it either. */
export function setUserMark(memory: readonly number[], marks: UserMarks, address: number, mark: UserMark): UserMarks {
  const effective = deriveEffectiveMarks(memory, marks)
  if (effective[address]?.kind === 'operand') return marks
  return { ...marks, [address]: mark }
}

export function clearUserMark(memory: readonly number[], marks: UserMarks, address: number): UserMarks {
  const effective = deriveEffectiveMarks(memory, marks)
  if (effective[address]?.kind === 'operand') return marks
  if (!(address in marks)) return marks
  const next = { ...marks }
  delete next[address]
  return next
}
