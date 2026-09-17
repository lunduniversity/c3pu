import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ZoomControl } from '../ZoomControl'

describe('ZoomControl', () => {
  it('reflects the current zoom level and calls onChange when a new one is picked', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<ZoomControl zoomPercent={100} onChange={onChange} />)
    const select = screen.getByRole('combobox', { name: 'Zoom' })
    expect(select).toHaveValue('100')
    await user.selectOptions(select, '150')
    expect(onChange).toHaveBeenCalledWith(150)
  })
})
