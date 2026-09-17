import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { createGridState, type GridState } from '@/grid/model'
import { RegisterGrid } from '../RegisterGrid'

function Harness() {
  const [state, setState] = useState<GridState>(() => createGridState())
  return <RegisterGrid state={state} onChange={setState} />
}

describe('RegisterGrid', () => {
  it('renders all 8 registers with bit toggles', () => {
    render(<Harness />)
    expect(screen.getByRole('grid', { name: 'Registers' })).toBeInTheDocument()
    expect(screen.getAllByRole('row')).toHaveLength(8)
    expect(screen.getByLabelText('Register PC, bit 7, value 0')).toBeInTheDocument()
  })

  it('toggles a register bit on click', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.click(screen.getByLabelText('Register PC, bit 7, value 0'))
    expect(screen.getByLabelText('Register PC, bit 7, value 1')).toBeInTheDocument()
  })

  it('has no decoded-instruction column or mark picker (registers are not code)', () => {
    render(<Harness />)
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
  })
})
