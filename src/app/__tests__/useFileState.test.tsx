import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { EXAMPLE_PROGRAMS } from '@/examples'
import { downloadTextFile } from '@/file/download'
import { exportSnapshot } from '@/snapshot/codec'
import { useFileState } from '../useFileState'

// jsdom doesn't implement the Blob-URL/anchor-click download mechanics -
// these tests only need to verify useFileState *calls* the download helper
// correctly, not that a browser download actually happens.
vi.mock('@/file/download', () => ({ downloadTextFile: vi.fn() }))

function makeFile(name: string, text: string): File {
  return new File([text], name, { type: 'text/plain' })
}

describe('useFileState', () => {
  let confirmSpy: ReturnType<typeof vi.spyOn>
  let alertSpy: ReturnType<typeof vi.spyOn>
  let promptSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
    alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})
    promptSpy = vi.spyOn(window, 'prompt').mockReturnValue('chosen.txt')
  })
  afterEach(() => {
    confirmSpy.mockRestore()
    alertSpy.mockRestore()
    promptSpy.mockRestore()
  })

  function setup(initialMemory: number[] = new Array(256).fill(0)) {
    let memory = initialMemory
    const onLoadProgram = vi.fn((next: readonly number[]) => {
      memory = [...next]
    })
    const view = renderHook(() => useFileState({ memory, onLoadProgram }))
    return { view, onLoadProgram, getMemory: () => memory }
  }

  it('is not dirty in a fresh, all-zero session', () => {
    const { view } = setup()
    expect(view.result.current.isDirty).toBe(false)
    expect(view.result.current.fileName).toBeNull()
  })

  it('opening a file sets the file name and a clean baseline', async () => {
    const { view, onLoadProgram } = setup()
    const file = makeFile('my_prog.txt', '01010110\n01001000')
    await act(async () => view.result.current.openFromFile(file))
    expect(onLoadProgram).toHaveBeenCalledOnce()
    view.rerender()
    expect(view.result.current.fileName).toBe('my_prog.txt')
    expect(view.result.current.isDirty).toBe(false)
  })

  it('rejects a malformed file without touching memory, and shows why', async () => {
    const { view, onLoadProgram } = setup()
    const file = makeFile('bad.txt', 'not binary')
    await act(async () => view.result.current.openFromFile(file))
    expect(onLoadProgram).not.toHaveBeenCalled()
    expect(alertSpy).toHaveBeenCalledWith(expect.stringContaining('bad.txt'))
    expect(view.result.current.fileName).toBeNull()
  })

  it('becomes dirty once memory drifts from the baseline, e.g. after an edit', async () => {
    let memory = new Array(256).fill(0)
    const onLoadProgram = vi.fn((next: readonly number[]) => {
      memory = [...next]
    })
    const view = renderHook(() => useFileState({ memory, onLoadProgram }))

    const file = makeFile('a.txt', '01010110')
    await act(async () => view.result.current.openFromFile(file))
    view.rerender()
    expect(view.result.current.isDirty).toBe(false)

    // Simulate a subsequent hand-edit outside of any file operation: memory
    // now differs from the baseline captured when the file was opened.
    memory = [...memory]
    memory[5] = 9
    view.rerender()
    expect(view.result.current.isDirty).toBe(true)
  })

  it('Save downloads under the existing file name and clears dirtiness', () => {
    const memory = [1, 2, 3]
    const view = renderHook(() => useFileState({ memory, onLoadProgram: vi.fn() }))
    expect(view.result.current.isDirty).toBe(true) // non-zero, never saved

    act(() => view.result.current.save())
    expect(downloadTextFile).toHaveBeenCalledWith('program.txt', expect.any(String))
    view.rerender()
    expect(view.result.current.fileName).toBe('program.txt')
    expect(view.result.current.isDirty).toBe(false)
  })

  it('Save As prompts for a name and uses it', () => {
    const view = renderHook(() => useFileState({ memory: [1], onLoadProgram: vi.fn() }))
    act(() => view.result.current.saveAs())
    view.rerender()
    expect(promptSpy).toHaveBeenCalled()
    expect(view.result.current.fileName).toBe('chosen.txt')
  })

  it('Save As does nothing if the prompt is cancelled', () => {
    promptSpy.mockReturnValue(null)
    const view = renderHook(() => useFileState({ memory: [1], onLoadProgram: vi.fn() }))
    act(() => view.result.current.saveAs())
    view.rerender()
    expect(view.result.current.fileName).toBeNull()
  })

  it('Close asks for confirmation when dirty, and clears memory + file association on confirm', () => {
    const onLoadProgram = vi.fn()
    const view = renderHook(() => useFileState({ memory: [1, 2, 3], onLoadProgram }))
    act(() => view.result.current.close())
    expect(confirmSpy).toHaveBeenCalled()
    expect(onLoadProgram).toHaveBeenCalledWith(new Array(256).fill(0))
    view.rerender()
    expect(view.result.current.fileName).toBeNull()
  })

  it('Close does nothing if the user declines to discard changes', () => {
    confirmSpy.mockReturnValue(false)
    const onLoadProgram = vi.fn()
    const view = renderHook(() => useFileState({ memory: [1, 2, 3], onLoadProgram }))
    act(() => view.result.current.close())
    expect(onLoadProgram).not.toHaveBeenCalled()
  })

  it('does not ask for confirmation when there is nothing unsaved to lose', () => {
    const onLoadProgram = vi.fn()
    const view = renderHook(() => useFileState({ memory: new Array(256).fill(0), onLoadProgram }))
    act(() => view.result.current.close())
    expect(confirmSpy).not.toHaveBeenCalled()
  })

  it('loadExample loads a bundled example and treats it as a clean baseline with no file name', () => {
    const onLoadProgram = vi.fn()
    const view = renderHook(() => useFileState({ memory: new Array(256).fill(0), onLoadProgram }))
    act(() => view.result.current.loadExample(EXAMPLE_PROGRAMS[0]))
    expect(onLoadProgram).toHaveBeenCalledOnce()
    view.rerender()
    expect(view.result.current.fileName).toBeNull()
  })

  it('exportSnapshotText / importSnapshotText round-trip and importing loads the memory', () => {
    const memory = new Array(256).fill(0)
    memory[0] = 5
    memory[1] = 6
    memory[2] = 7
    const onLoadProgram = vi.fn()
    const view = renderHook(() => useFileState({ memory, onLoadProgram }))
    const text = view.result.current.exportSnapshotText()
    expect(text).toBe(exportSnapshot(memory))

    const importResult = view.result.current.importSnapshotText(text)
    expect(importResult.ok).toBe(true)
    expect(onLoadProgram).toHaveBeenCalled()
  })

  it('importSnapshotText rejects malformed text without touching memory', () => {
    const onLoadProgram = vi.fn()
    const view = renderHook(() => useFileState({ memory: [1], onLoadProgram }))
    const result = view.result.current.importSnapshotText('garbage')
    expect(result.ok).toBe(false)
    expect(onLoadProgram).not.toHaveBeenCalled()
  })
})
