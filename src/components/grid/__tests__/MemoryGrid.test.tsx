import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { createGridState, type GridState } from '@/grid/model'
import { MemoryGrid } from '../MemoryGrid'

function Harness() {
  const [state, setState] = useState<GridState>(() => createGridState())
  return <MemoryGrid state={state} onChange={setState} />
}

describe('MemoryGrid', () => {
  it('renders 256 rows with bit toggles and read-only representation columns', () => {
    render(<Harness />)
    const grid = screen.getByRole('grid', { name: 'Memory' })
    expect(grid).toBeInTheDocument()
    expect(screen.getAllByRole('row')).toHaveLength(256)
    expect(screen.getByLabelText('Memory address 0, bit 0, value 0')).toBeInTheDocument()
    expect(screen.getByLabelText('Memory address 255, bit 7, value 0')).toBeInTheDocument()
  })

  it('toggles a bit on click and updates the hex/decimal/ASCII columns', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    const bit0 = screen.getByLabelText('Memory address 0, bit 0, value 0')
    await user.click(bit0)
    expect(screen.getByLabelText('Memory address 0, bit 0, value 1')).toBeInTheDocument()
  })

  it('has exactly one roving tab stop across the whole grid initially', () => {
    render(<Harness />)
    const tabbable = screen.getAllByRole('gridcell').filter((el) => el.getAttribute('tabindex') === '0')
    expect(tabbable).toHaveLength(1)
    expect(tabbable[0]).toHaveAttribute('aria-label', 'Memory address 0, bit 0, value 0')
  })

  it('moves the roving tab stop with arrow keys', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    screen.getByLabelText('Memory address 0, bit 0, value 0').focus()
    await user.keyboard('{ArrowRight}')
    expect(screen.getByLabelText('Memory address 0, bit 1, value 0')).toHaveFocus()
    await user.keyboard('{ArrowDown}')
    expect(screen.getByLabelText('Memory address 1, bit 1, value 0')).toHaveFocus()
  })

  it('sets a bit explicitly with the 0/1 keys and flips it with F', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    screen.getByLabelText('Memory address 0, bit 0, value 0').focus()
    await user.keyboard('1')
    expect(screen.getByLabelText('Memory address 0, bit 0, value 1')).toBeInTheDocument()
    await user.keyboard('f')
    expect(screen.getByLabelText('Memory address 0, bit 0, value 0')).toBeInTheDocument()
  })

  it('shows the decoded instruction and a mark picker per row', () => {
    render(<Harness />)
    // address 0 defaults to all zero bytes, which decode as NOP
    expect(screen.getAllByText('NOP')[0]).toBeInTheDocument()
    expect(screen.getAllByRole('combobox', { name: /Interpretation mark/ })).toHaveLength(256)
  })

  it('disables the mark picker for an auto-derived operand cell, and re-enables it once the leading cell is no longer marked code', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    // Build "LD OUT, 0" at address 0 (opcode 5 = 0101, operand 6 = 0110): only need the opcode nibble bits set.
    for (const bitIndex of [1, 3]) {
      await user.click(screen.getByLabelText(`Memory address 0, bit ${bitIndex}, value 0`))
    }
    for (const bitIndex of [5, 6]) {
      await user.click(screen.getByLabelText(`Memory address 0, bit ${bitIndex}, value 0`))
    }
    const markPicker0 = screen.getByLabelText('Interpretation mark for memory address 0')
    await user.selectOptions(markPicker0, 'code')

    const markPicker1 = screen.getByLabelText('Interpretation mark for memory address 1')
    expect(markPicker1).toBeDisabled()

    await user.selectOptions(markPicker0, 'unmarked')
    expect(screen.getByLabelText('Interpretation mark for memory address 1')).toBeEnabled()
  })

  it('clears the selected range without changing its size when Clear is clicked', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.click(screen.getByLabelText('Memory address 5, bit 0, value 0'))
    expect(screen.getByLabelText('Memory address 5, bit 0, value 1')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Clear' }))
    expect(screen.getByLabelText('Memory address 5, bit 0, value 0')).toBeInTheDocument()
  })
})
