import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { createInitialState, type OutputEvent, run } from '../cpu'
import { parseProgram } from '../program-format'

const EXAMPLES_DIR = join(process.cwd(), 'docs/examples')

function loadExample(name: string) {
  const text = readFileSync(join(EXAMPLES_DIR, `${name}.txt`), 'utf-8')
  const parsed = parseProgram(text)
  if (!parsed.ok) throw new Error(`fixture ${name} failed to parse at line ${parsed.line}: ${parsed.message}`)
  return parsed.memory
}

function renderOutput(output: OutputEvent[]): string {
  return output.map((e) => (e.kind === 'char' ? e.value : `[${e.value}]`)).join('')
}

describe('bundled example programs (docs/examples/*.txt)', () => {
  it('tiny_program: loads a value, prints it, halts', () => {
    const { state, output } = run(createInitialState(loadExample('tiny_program')))
    expect(state.haltReason).toBe('normal')
    expect(renderOutput(output)).toBe('H\n')
  })

  it('simple_add: loads two values, adds them, prints the decimal result', () => {
    const { state, output } = run(createInitialState(loadExample('simple_add')))
    expect(state.haltReason).toBe('normal')
    expect(renderOutput(output)).toBe('[55]\n')
  })

  it('hello_world: prints "HELLO WORLD!" via one load+print pair per character', () => {
    const { state, output } = run(createInitialState(loadExample('hello_world')))
    expect(state.haltReason).toBe('normal')
    expect(renderOutput(output)).toBe('HELLO WORLD!\n')
  })

  it('hello_world_loop: prints "HELLO WORLD!" via PRL over data stored in memory', () => {
    const { state, output } = run(createInitialState(loadExample('hello_world_loop')))
    expect(state.haltReason).toBe('normal')
    expect(renderOutput(output)).toBe('HELLO WORLD!\n')
  })

  it('simple_loop: repeats a block a fixed number of times using CJP', () => {
    const { state, output } = run(createInitialState(loadExample('simple_loop')))
    expect(state.haltReason).toBe('normal')
    expect(renderOutput(output)).toBe('HAHAHAHAHA\n')
  })

  it('segfault: deliberately reads/writes out of bounds, demonstrating the out-of-range error', () => {
    const { state } = run(createInitialState(loadExample('segfault')))
    expect(state.error).not.toBeNull()
    expect(state.error?.kind).toBe('invalid-register')
  })

  it('segfault_inf_loop: re-triggers the fault in a loop, demonstrating the run guard', () => {
    const { state } = run(createInitialState(loadExample('segfault_inf_loop')))
    expect(state.error).not.toBeNull()
    expect(['invalid-register', 'invalid-instruction', 'stuck-program', 'step-cap']).toContain(state.error?.kind)
  })
})
