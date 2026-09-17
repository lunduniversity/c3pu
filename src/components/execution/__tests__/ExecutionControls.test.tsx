import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ExecutionControls } from '../ExecutionControls'

describe('ExecutionControls', () => {
  it('shows Idle status and enables Step/Run when neither running nor halted', () => {
    render(
      <ExecutionControls
        isRunning={false}
        halted={false}
        haltReason={null}
        error={null}
        stepDelayMs={200}
        onStep={() => {}}
        onRunToggle={() => {}}
        onReset={() => {}}
        onStepDelayChange={() => {}}
      />,
    )
    expect(screen.getByRole('status')).toHaveTextContent('Idle')
    expect(screen.getByRole('button', { name: 'Step' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Run' })).toBeEnabled()
  })

  it('disables Step and Run once halted, and shows the halt reason', () => {
    render(
      <ExecutionControls
        isRunning={false}
        halted={true}
        haltReason="normal"
        error={null}
        stepDelayMs={200}
        onStep={() => {}}
        onRunToggle={() => {}}
        onReset={() => {}}
        onStepDelayChange={() => {}}
      />,
    )
    expect(screen.getByRole('status')).toHaveTextContent('Halted (program completed normally)')
    expect(screen.getByRole('button', { name: 'Step' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Run' })).toBeDisabled()
  })

  it('shows the error message and still allows Reset', () => {
    render(
      <ExecutionControls
        isRunning={false}
        halted={false}
        haltReason={null}
        error={{ kind: 'invalid-instruction', message: 'bad opcode', address: 5 }}
        stepDelayMs={200}
        onStep={() => {}}
        onRunToggle={() => {}}
        onReset={() => {}}
        onStepDelayChange={() => {}}
      />,
    )
    expect(screen.getByRole('status')).toHaveTextContent('Error: bad opcode')
    expect(screen.getByRole('button', { name: 'Reset' })).toBeEnabled()
  })

  it('renders Run as Stop while running, and always keeps it enabled', async () => {
    const user = userEvent.setup()
    const onRunToggle = vi.fn()
    render(
      <ExecutionControls
        isRunning={true}
        halted={false}
        haltReason={null}
        error={null}
        stepDelayMs={200}
        onStep={() => {}}
        onRunToggle={onRunToggle}
        onReset={() => {}}
        onStepDelayChange={() => {}}
      />,
    )
    const stopButton = screen.getByRole('button', { name: 'Stop' })
    expect(stopButton).toBeEnabled()
    await user.click(stopButton)
    expect(onRunToggle).toHaveBeenCalledOnce()
  })
})
