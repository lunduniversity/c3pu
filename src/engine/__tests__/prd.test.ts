import { describe, expect, it } from 'vitest'
import { step } from '../cpu'
import { byte, OP, stateWithMemory } from './helpers'

describe('PRD', () => {
  it('prints OUT as a decimal number', () => {
    const state = stateWithMemory([byte(OP.PRD, 0)], { OUT: 55 })
    const { result } = step(state)
    expect(result.output).toEqual([{ kind: 'decimal', value: 55 }])
  })
})
