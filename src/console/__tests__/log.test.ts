import { describe, expect, it } from 'vitest'
import type { OutputEvent } from '@/engine/cpu'
import { appendOutputEvents, appendSystemMessage, clearConsole, createConsoleState } from '../log'

function chars(text: string): OutputEvent[] {
  return [...text].map((value) => ({ kind: 'char' as const, value }))
}

describe('appendOutputEvents', () => {
  it('accumulates consecutive character output into one block', () => {
    let state = createConsoleState()
    state = appendOutputEvents(state, chars('HELLO'))
    expect(state.entries).toEqual([{ kind: 'chars', text: 'HELLO' }])
  })

  it('starts a new block after a newline', () => {
    let state = createConsoleState()
    state = appendOutputEvents(state, chars('HI\n'))
    state = appendOutputEvents(state, chars('BYE'))
    expect(state.entries).toEqual([
      { kind: 'chars', text: 'HI' },
      { kind: 'chars', text: 'BYE' },
    ])
  })

  it('gives each decimal number its own block, breaking a char-output run', () => {
    let state = createConsoleState()
    state = appendOutputEvents(state, chars('X'))
    state = appendOutputEvents(state, [{ kind: 'decimal', value: 55 }])
    state = appendOutputEvents(state, chars('Y'))
    expect(state.entries).toEqual([
      { kind: 'chars', text: 'X' },
      { kind: 'decimal', value: 55 },
      { kind: 'chars', text: 'Y' },
    ])
  })

  it('does not merge two adjacent decimal outputs into one block', () => {
    let state = createConsoleState()
    state = appendOutputEvents(state, [
      { kind: 'decimal', value: 1 },
      { kind: 'decimal', value: 2 },
    ])
    expect(state.entries).toEqual([
      { kind: 'decimal', value: 1 },
      { kind: 'decimal', value: 2 },
    ])
  })
})

describe('appendSystemMessage / clearConsole', () => {
  it('appends a system message as its own entry, distinguished by level', () => {
    let state = createConsoleState()
    state = appendOutputEvents(state, chars('X'))
    state = appendSystemMessage(state, 'Program halted normally.', 'info')
    state = appendSystemMessage(state, 'Something went wrong.', 'error')
    expect(state.entries.slice(1)).toEqual([
      { kind: 'system', text: 'Program halted normally.', level: 'info' },
      { kind: 'system', text: 'Something went wrong.', level: 'error' },
    ])
  })

  it('a system message closes off any in-progress char block', () => {
    let state = createConsoleState()
    state = appendOutputEvents(state, chars('X'))
    state = appendSystemMessage(state, 'note')
    state = appendOutputEvents(state, chars('Y'))
    expect(state.entries).toEqual([
      { kind: 'chars', text: 'X' },
      { kind: 'system', text: 'note', level: 'info' },
      { kind: 'chars', text: 'Y' },
    ])
  })

  it('clearConsole empties the log independently of any execution state', () => {
    const withOutput = appendOutputEvents(createConsoleState(), chars('X'))
    expect(withOutput.entries).not.toEqual([])
    const state = clearConsole()
    expect(state.entries).toEqual([])
    expect(state.lineOpen).toBe(false)
  })
})
