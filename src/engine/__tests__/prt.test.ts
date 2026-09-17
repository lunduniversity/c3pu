import { describe, expect, it } from 'vitest'
import { step } from '../cpu'
import { byte, OP, stateWithMemory } from './helpers'

describe('PRT', () => {
  it('prints OUT as one ASCII character', () => {
    const state = stateWithMemory([byte(OP.PRT, 0)], { OUT: 72 })
    const { result } = step(state)
    expect(result.output).toEqual([{ kind: 'char', value: 'H' }])
  })
})
