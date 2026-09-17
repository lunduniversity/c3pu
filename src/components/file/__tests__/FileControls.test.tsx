import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { UseFileStateResult } from '@/app/useFileState'
import { FileControls } from '../FileControls'

function makeFileState(overrides: Partial<UseFileStateResult> = {}): UseFileStateResult {
  return {
    fileName: null,
    isDirty: false,
    openFromFile: vi.fn(),
    save: vi.fn(),
    saveAs: vi.fn(),
    close: vi.fn(),
    loadExample: vi.fn(),
    exportSnapshotText: vi.fn(() => 'c3pu1:AP8'),
    importSnapshotText: vi.fn(() => ({ ok: true })),
    ...overrides,
  }
}

describe('FileControls', () => {
  it('shows "Untitled" with no dirty suffix for a fresh, clean session', () => {
    render(<FileControls file={makeFileState()} />)
    expect(screen.getByText('Untitled')).toBeInTheDocument()
    expect(screen.queryByText(/unsaved changes/)).not.toBeInTheDocument()
  })

  it('shows the file name and an unsaved-changes marker when dirty', () => {
    render(<FileControls file={makeFileState({ fileName: 'my_prog.txt', isDirty: true })} />)
    expect(screen.getByText(/my_prog\.txt/)).toHaveTextContent('my_prog.txt — unsaved changes')
  })

  it('calls save/saveAs/close on their respective buttons', async () => {
    const user = userEvent.setup()
    const fileState = makeFileState()
    render(<FileControls file={fileState} />)
    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(fileState.save).toHaveBeenCalledOnce()
    await user.click(screen.getByRole('button', { name: 'Save As' }))
    expect(fileState.saveAs).toHaveBeenCalledOnce()
    await user.click(screen.getByRole('button', { name: 'Close' }))
    expect(fileState.close).toHaveBeenCalledOnce()
  })

  it('lists every bundled example in the Examples menu and loads the one clicked', async () => {
    const user = userEvent.setup()
    const fileState = makeFileState()
    render(<FileControls file={fileState} />)
    await user.click(screen.getByRole('button', { name: 'Examples' }))
    const item = await screen.findByRole('menuitem', { name: 'Simple add' })
    await user.click(item)
    expect(fileState.loadExample).toHaveBeenCalledWith(expect.objectContaining({ id: 'simple_add' }))
  })

  it('reveals the snapshot panel with the exported text when Snapshot is clicked', async () => {
    const user = userEvent.setup()
    const fileState = makeFileState({ exportSnapshotText: vi.fn(() => 'c3pu1:XYZ') })
    render(<FileControls file={fileState} />)
    await user.click(screen.getByRole('button', { name: 'Snapshot' }))
    expect(screen.getByLabelText('Export snapshot')).toHaveValue('c3pu1:XYZ')
  })

  it('imports pasted snapshot text and clears the field on success', async () => {
    const user = userEvent.setup()
    const fileState = makeFileState()
    render(<FileControls file={fileState} />)
    await user.click(screen.getByRole('button', { name: 'Snapshot' }))
    const importField = screen.getByLabelText('Import snapshot')
    await user.type(importField, 'c3pu1:AP8')
    await user.click(screen.getByRole('button', { name: 'Import' }))
    expect(fileState.importSnapshotText).toHaveBeenCalledWith('c3pu1:AP8')
    expect(importField).toHaveValue('')
  })

  it('shows an error message when the import fails, and keeps the text for correction', async () => {
    const user = userEvent.setup()
    const fileState = makeFileState({ importSnapshotText: vi.fn(() => ({ ok: false, message: 'not valid base64url text' })) })
    render(<FileControls file={fileState} />)
    await user.click(screen.getByRole('button', { name: 'Snapshot' }))
    await user.type(screen.getByLabelText('Import snapshot'), 'garbage')
    await user.click(screen.getByRole('button', { name: 'Import' }))
    expect(screen.getByText('not valid base64url text')).toBeInTheDocument()
    expect(screen.getByLabelText('Import snapshot')).toHaveValue('garbage')
  })
})
