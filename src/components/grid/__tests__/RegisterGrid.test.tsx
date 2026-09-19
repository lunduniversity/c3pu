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

  it('a single click selects a bit without flipping it', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    const bit = screen.getByLabelText('Register PC, bit 7, value 0')
    await user.click(bit)
    expect(screen.getByLabelText('Register PC, bit 7, value 0')).toBeInTheDocument()
    expect(bit).toHaveFocus()
  })

  it('double-click flips a register bit', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.dblClick(screen.getByLabelText('Register PC, bit 7, value 0'))
    expect(screen.getByLabelText('Register PC, bit 7, value 1')).toBeInTheDocument()
  })

  it("a row's own Clear button clears just that register", async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.dblClick(screen.getByLabelText('Register R0, bit 7, value 0'))
    expect(screen.getByLabelText('Register R0, bit 7, value 1')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Clear register R0' }))
    expect(screen.getByLabelText('Register R0, bit 7, value 0')).toBeInTheDocument()
  })

  it('has no decoded-instruction column or mark picker (registers are not code)', () => {
    render(<Harness />)
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
  })
})
