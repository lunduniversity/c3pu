import type { OutputEvent } from '@/engine/cpu'

/**
 * The output console's log model (webapp-requirements.md §6): a single,
 * ordered log mixing program output and system messages, with three
 * visually-distinguishable categories. Character output accumulates into a
 * running block that a newline closes off (a new block starts after it);
 * decimal output is always its own block, never merged with neighboring
 * characters; system messages (errors/info) are their own category
 * entirely.
 */
export type ConsoleEntry =
  | { kind: 'chars'; text: string }
  | { kind: 'decimal'; value: number }
  | { kind: 'system'; text: string; level: 'info' | 'error' }

export interface ConsoleState {
  entries: ConsoleEntry[]
  /** Whether the trailing 'chars' entry (if any) can still be appended to,
   * i.e. no newline has closed it off yet. */
  lineOpen: boolean
}

export function createConsoleState(): ConsoleState {
  return { entries: [], lineOpen: false }
}

export function clearConsole(): ConsoleState {
  return createConsoleState()
}

export function appendOutputEvents(state: ConsoleState, events: readonly OutputEvent[]): ConsoleState {
  let entries = state.entries
  let lineOpen = state.lineOpen

  for (const event of events) {
    if (event.kind === 'char') {
      if (event.value === '\n') {
        lineOpen = false
        continue
      }
      if (lineOpen) {
        const last = entries[entries.length - 1] as Extract<ConsoleEntry, { kind: 'chars' }>
        entries = [...entries.slice(0, -1), { kind: 'chars', text: last.text + event.value }]
      } else {
        entries = [...entries, { kind: 'chars', text: event.value }]
        lineOpen = true
      }
    } else {
      entries = [...entries, { kind: 'decimal', value: event.value }]
      lineOpen = false
    }
  }

  return { entries, lineOpen }
}

export function appendSystemMessage(state: ConsoleState, text: string, level: 'info' | 'error' = 'info'): ConsoleState {
  return { entries: [...state.entries, { kind: 'system', text, level }], lineOpen: false }
}
