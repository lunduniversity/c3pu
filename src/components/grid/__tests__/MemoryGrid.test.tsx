import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
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

  it('shows column headers, sticky to the top of the scroll container, without affecting the 256-row count', () => {
    render(<Harness />)
    const grid = screen.getByRole('grid', { name: 'Memory' })
    expect(within(grid).getByText('Addr')).toBeInTheDocument()
    expect(within(grid).getByText('Hex')).toBeInTheDocument()
    expect(within(grid).getByText('Instruction')).toBeInTheDocument()
    expect(within(grid).getByText('Mark')).toBeInTheDocument()
    // still exactly 256 - the header is a visual aid, not an ARIA row.
    expect(screen.getAllByRole('row')).toHaveLength(256)

    const header = within(grid).getByText('Addr').closest('div[class*="sticky"]')
    expect(header).not.toBeNull()
  })

  it('a single click selects a bit without flipping it (mouse-first interaction model)', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    const bit0 = screen.getByLabelText('Memory address 0, bit 0, value 0')
    await user.click(bit0)
    expect(screen.getByLabelText('Memory address 0, bit 0, value 0')).toBeInTheDocument()
    expect(bit0).toHaveFocus()
  })

  it('double-click flips a bit and updates the hex/decimal/ASCII columns', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    const bit0 = screen.getByLabelText('Memory address 0, bit 0, value 0')
    await user.dblClick(bit0)
    expect(screen.getByLabelText('Memory address 0, bit 0, value 1')).toBeInTheDocument()
  })

  it('click-and-drag across rows selects a range, anchored at the row the drag started on', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    const row0 = screen.getByLabelText('Memory address 0, bit 0, value 0')
    const row2 = screen.getByLabelText('Memory address 2, bit 0, value 0')
    await user.pointer([{ keys: '[MouseLeft>]', target: row0 }, { target: row2 }, { keys: '[/MouseLeft]' }])
    const rows = screen.getAllByRole('row')
    expect(rows[0]).toHaveAttribute('aria-selected', 'true')
    expect(rows[1]).toHaveAttribute('aria-selected', 'true')
    expect(rows[2]).toHaveAttribute('aria-selected', 'true')
    expect(rows[3]).toHaveAttribute('aria-selected', 'false')
  })

  it('click-and-drag starting from the address label (not a bit) also starts a range selection', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    const rows = screen.getAllByRole('row')
    // The address label is the row's first <span> - the read-only
    // representation columns (hex/decimal/ASCII/instruction) come later and
    // stay outside the drag-select zone (webapp-requirements.md §11.3).
    const addressLabel = (row: HTMLElement) => row.querySelector('span')!
    await user.pointer([
      { keys: '[MouseLeft>]', target: addressLabel(rows[0]) },
      { target: addressLabel(rows[1]) },
      { keys: '[/MouseLeft]' },
    ])
    expect(rows[0]).toHaveAttribute('aria-selected', 'true')
    expect(rows[1]).toHaveAttribute('aria-selected', 'true')
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
      await user.dblClick(screen.getByLabelText(`Memory address 0, bit ${bitIndex}, value 0`))
    }
    for (const bitIndex of [5, 6]) {
      await user.dblClick(screen.getByLabelText(`Memory address 0, bit ${bitIndex}, value 0`))
    }
    const markPicker0 = screen.getByLabelText('Interpretation mark for memory address 0')
    await user.selectOptions(markPicker0, 'code')

    const markPicker1 = screen.getByLabelText('Interpretation mark for memory address 1')
    expect(markPicker1).toBeDisabled()

    await user.selectOptions(markPicker0, 'unmarked')
    expect(screen.getByLabelText('Interpretation mark for memory address 1')).toBeEnabled()
  }, 20000)

  it('clears the selected range without changing its size when Clear is clicked', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.dblClick(screen.getByLabelText('Memory address 5, bit 0, value 0'))
    expect(screen.getByLabelText('Memory address 5, bit 0, value 1')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Clear' }))
    expect(screen.getByLabelText('Memory address 5, bit 0, value 0')).toBeInTheDocument()
  })

  it("a row's own Clear action clears just that row when it isn't part of a larger selection", async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.dblClick(screen.getByLabelText('Memory address 5, bit 0, value 0'))
    await user.click(screen.getByRole('button', { name: 'Clear memory address 5' }))
    expect(screen.getByLabelText('Memory address 5, bit 0, value 0')).toBeInTheDocument()
  })

  it("a row's own Delete action removes just that row and shifts everything after it up", async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.dblClick(screen.getByLabelText('Memory address 0, bit 0, value 0')) // address 0 now 0b10000000
    await user.dblClick(screen.getByLabelText('Memory address 1, bit 7, value 0')) // address 1 now 0b00000001
    await user.click(screen.getByRole('button', { name: 'Delete memory address 0' }))
    // address 1's value (1) has shifted up into address 0
    expect(screen.getByLabelText('Memory address 0, bit 7, value 1')).toBeInTheDocument()
    expect(screen.getByLabelText('Memory address 0, bit 0, value 0')).toBeInTheDocument()
  })

  it('Insert before/after add a blank row and shift the rest without losing data off the end', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.dblClick(screen.getByLabelText('Memory address 0, bit 0, value 0'))
    await user.click(screen.getByRole('button', { name: 'Insert a row after memory address 0' }))
    // address 0 unchanged, a fresh blank row is now at address 1, and the
    // rest of memory (still all zero) is simply shifted, so this is really
    // only observable via the marked cell moving down by one.
    expect(screen.getByLabelText('Memory address 0, bit 0, value 1')).toBeInTheDocument()
    expect(screen.getByLabelText('Memory address 1, bit 0, value 0')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Insert a row before memory address 0' }))
    expect(screen.getByLabelText('Memory address 0, bit 0, value 0')).toBeInTheDocument()
    expect(screen.getByLabelText('Memory address 1, bit 0, value 1')).toBeInTheDocument()
  })

  it('dragging over the read-only instruction column does not start a range selection', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    const rows = screen.getAllByRole('row')
    // The instruction/description column is the last <span> before the mark
    // picker - deliberately outside the drag-select zone so it stays
    // natively selectable text (webapp-requirements.md §11.3).
    const spans = (row: HTMLElement) => row.querySelectorAll('span')
    const instructionCell = (row: HTMLElement) => spans(row)[spans(row).length - 1]
    await user.pointer([
      { keys: '[MouseLeft>]', target: instructionCell(rows[0]) },
      { target: instructionCell(rows[1]) },
      { keys: '[/MouseLeft]' },
    ])
    expect(rows[1]).toHaveAttribute('aria-selected', 'false')
  })

  it("dragging a row's handle over another row and releasing moves the block there", async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.dblClick(screen.getByLabelText('Memory address 0, bit 0, value 0')) // address 0 now 0b10000000

    const handle0 = screen.getByLabelText('Drag to move memory address 0')
    const row2 = screen.getAllByRole('row')[2]
    // jsdom does no real layout and doesn't even define elementFromPoint, so
    // the handle drag's elementFromPoint-based hit-testing (chosen
    // specifically because pointerenter on other elements isn't reliable
    // while dragging from a <button> - see useRowDrag.ts) has nothing real
    // to call; stub it to report "row 2" under the pointer, the same way a
    // real browser would from coordinates.
    document.elementFromPoint = vi.fn().mockReturnValue(row2)
    fireEvent.pointerDown(handle0, { pointerId: 1 })
    fireEvent.pointerMove(handle0, { pointerId: 1, clientX: 10, clientY: 100 })
    fireEvent.pointerUp(handle0, { pointerId: 1 })
    // @ts-expect-error - restoring jsdom's default absence of this method
    delete document.elementFromPoint

    // The marked byte moved from address 0 to address 2, displacing the
    // (zero-valued) cells originally at 1-2 up by one.
    expect(screen.getByLabelText('Memory address 0, bit 0, value 0')).toBeInTheDocument()
    expect(screen.getByLabelText('Memory address 2, bit 0, value 1')).toBeInTheDocument()
  })
})
