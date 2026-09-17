import { describe, expect, it } from 'vitest'
import { createRunTicker, step } from '../cpu'
import { byte, OP, REG, stateWithMemory } from './helpers'

describe('createRunTicker', () => {
  it('executes one instruction per tick and stops at a normal HLT', () => {
    const ticker = createRunTicker()
    let state = stateWithMemory([byte(OP.LD, REG.OUT), 65, byte(OP.PRT, 0), byte(OP.HLT, 0)])

    let result = ticker.next(state)
    state = result.state
    expect(state.halted).toBe(false)
    expect(ticker.stepCount).toBe(1)

    result = ticker.next(state)
    state = result.state
    expect(result.result.output).toEqual([{ kind: 'char', value: 'A' }])

    result = ticker.next(state)
    state = result.state
    expect(state.halted).toBe(true)
    expect(state.haltReason).toBe('normal')
    expect(ticker.stepCount).toBe(3)
  })

  it('detects a stuck program across ticks the same way run() does in one call', () => {
    const ticker = createRunTicker()
    const state = stateWithMemory([byte(OP.JMP, REG.R0)]) // R0=0, jumps to itself forever
    let result = ticker.next(state)
    expect(result.state.halted).toBe(false)
    result = ticker.next(result.state)
    expect(result.state.error?.kind).toBe('stuck-program')
  })

  it('hits the step cap without double-counting the capping tick', () => {
    const ticker = createRunTicker(2)
    let state = stateWithMemory([byte(OP.NOP, 0)])
    state = step(state).state // address 0 -> 1, outside the ticker
    let result = ticker.next(state)
    state = result.state
    expect(ticker.stepCount).toBe(1)
    result = ticker.next(state)
    state = result.state
    expect(ticker.stepCount).toBe(2)
    result = ticker.next(state) // cap reached, does not execute
    expect(result.state.error?.kind).toBe('step-cap')
    expect(ticker.stepCount).toBe(2)
  })
})
