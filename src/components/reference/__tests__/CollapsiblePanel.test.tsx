import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { CollapsiblePanel } from '../CollapsiblePanel'

describe('CollapsiblePanel', () => {
  it('shows its children only when open', () => {
    const { rerender } = render(
      <CollapsiblePanel title="Test panel" open={false} onOpenChange={() => {}}>
        <p>panel content</p>
      </CollapsiblePanel>,
    )
    expect(screen.getByText('panel content')).not.toBeVisible()

    rerender(
      <CollapsiblePanel title="Test panel" open={true} onOpenChange={() => {}}>
        <p>panel content</p>
      </CollapsiblePanel>,
    )
    expect(screen.getByText('panel content')).toBeVisible()
  })

  it('calls onOpenChange when the summary is clicked', async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()
    render(
      <CollapsiblePanel title="Test panel" open={false} onOpenChange={onOpenChange}>
        <p>content</p>
      </CollapsiblePanel>,
    )
    await user.click(screen.getByText('Test panel'))
    expect(onOpenChange).toHaveBeenCalledWith(true)
  })
})
