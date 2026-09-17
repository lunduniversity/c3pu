import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { appendOutputEvents, appendSystemMessage, createConsoleState } from '@/console/log'
import { ExecutionConsole } from '../ExecutionConsole'

describe('ExecutionConsole', () => {
  it('renders char, decimal, and system entries with distinct data-output-kind markers', () => {
    let state = createConsoleState()
    state = appendOutputEvents(state, [{ kind: 'char', value: 'H' }])
    state = appendOutputEvents(state, [{ kind: 'decimal', value: 55 }])
    state = appendSystemMessage(state, 'Program halted normally.', 'info')
    render(<ExecutionConsole consoleState={state} onClear={() => {}} />)

    expect(screen.getByText('H').closest('[data-output-kind]')).toHaveAttribute('data-output-kind', 'chars')
    expect(screen.getByText('55').closest('[data-output-kind]')).toHaveAttribute('data-output-kind', 'decimal')
    expect(screen.getByText('Program halted normally.').closest('[data-output-kind]')).toHaveAttribute('data-output-kind', 'system')
  })

  it('marks an error-level system message distinctly from an info one', () => {
    let state = createConsoleState()
    state = appendSystemMessage(state, 'oops', 'error')
    render(<ExecutionConsole consoleState={state} onClear={() => {}} />)
    expect(screen.getByText('oops').closest('[data-output-kind]')).toHaveAttribute('data-level', 'error')
  })

  it('calls onClear when the Clear output button is clicked', async () => {
    const user = userEvent.setup()
    const onClear = vi.fn()
    render(<ExecutionConsole consoleState={createConsoleState()} onClear={onClear} />)
    await user.click(screen.getByRole('button', { name: 'Clear output' }))
    expect(onClear).toHaveBeenCalledOnce()
  })
})
