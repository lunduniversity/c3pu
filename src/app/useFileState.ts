import { useCallback, useEffect, useState } from 'react'
import { parseProgram, serializeProgram } from '@/engine/program-format'
import { MEMORY_SIZE } from '@/engine/types'
import type { ExampleProgram } from '@/examples'
import { downloadTextFile } from '@/file/download'
import { exportSnapshot, importSnapshot } from '@/snapshot/codec'

const DEFAULT_FILE_NAME = 'program.txt'

function memoriesEqual(a: readonly number[], b: readonly number[]): boolean {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false
  return true
}

export interface UseFileStateParams {
  memory: readonly number[]
  onLoadProgram: (memory: readonly number[]) => void
}

export interface UseFileStateResult {
  /** Null when there is no associated file (a fresh session, after Close, or
   * after loading an example/snapshot - those aren't "a file"). */
  fileName: string | null
  /** True whenever the current memory differs from what was last opened/
   * saved/loaded (webapp-requirements.md §7.2). */
  isDirty: boolean
  openFromFile: (file: File) => Promise<void>
  save: () => void
  saveAs: () => void
  close: () => void
  loadExample: (example: ExampleProgram) => void
  exportSnapshotText: () => string
  importSnapshotText: (text: string) => { ok: boolean; message?: string }
}

/**
 * File operations (webapp-requirements.md §7.2/§7.3/§7.4). Per §11.6's
 * chosen tradeoff there is no true "save in place" (no File System Access
 * API, so the app still works when opened as a bare file:// page) - Save
 * downloads a fresh copy each time. "Unsaved changes" is tracked as memory
 * differing from a baseline set by the last Open/Save/example-load/snapshot
 * import, not tied to registers or execution status (only memory is part of
 * the file format, per §7.1).
 */
export function useFileState({ memory, onLoadProgram }: UseFileStateParams): UseFileStateResult {
  const [fileName, setFileName] = useState<string | null>(null)
  const [baselineMemory, setBaselineMemory] = useState<readonly number[] | null>(null)

  const isDirty = baselineMemory ? !memoriesEqual(memory, baselineMemory) : memory.some((byte) => byte !== 0)

  useEffect(() => {
    if (!isDirty) return
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault()
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [isDirty])

  const confirmDiscard = useCallback(
    (verb: string): boolean => {
      if (!isDirty) return true
      return window.confirm(`You have unsaved changes. ${verb} anyway and discard them?`)
    },
    [isDirty],
  )

  const openFromFile = useCallback(
    async (file: File) => {
      if (!confirmDiscard('Open')) return
      const text = await file.text()
      const parsed = parseProgram(text)
      if (!parsed.ok) {
        window.alert(`Could not open ${file.name}: line ${parsed.line}: ${parsed.message}`)
        return
      }
      onLoadProgram(parsed.memory)
      setFileName(file.name)
      setBaselineMemory(parsed.memory)
    },
    [confirmDiscard, onLoadProgram],
  )

  const save = useCallback(() => {
    const name = fileName ?? DEFAULT_FILE_NAME
    downloadTextFile(name, serializeProgram(memory))
    setFileName(name)
    setBaselineMemory(memory)
  }, [fileName, memory])

  const saveAs = useCallback(() => {
    const proposed = fileName ?? DEFAULT_FILE_NAME
    const name = window.prompt('Save as filename:', proposed)
    if (!name) return
    downloadTextFile(name, serializeProgram(memory))
    setFileName(name)
    setBaselineMemory(memory)
  }, [fileName, memory])

  const close = useCallback(() => {
    if (!confirmDiscard('Close')) return
    onLoadProgram(new Array(MEMORY_SIZE).fill(0))
    setFileName(null)
    setBaselineMemory(null)
  }, [confirmDiscard, onLoadProgram])

  const loadExample = useCallback(
    (example: ExampleProgram) => {
      if (!confirmDiscard('Load this example')) return
      const parsed = parseProgram(example.text)
      if (!parsed.ok) {
        window.alert(`Bundled example "${example.label}" failed to parse - this is a bug, please report it.`)
        return
      }
      onLoadProgram(parsed.memory)
      setFileName(null)
      setBaselineMemory(parsed.memory)
    },
    [confirmDiscard, onLoadProgram],
  )

  const exportSnapshotText = useCallback(() => exportSnapshot(memory), [memory])

  const importSnapshotText = useCallback(
    (text: string): { ok: boolean; message?: string } => {
      const result = importSnapshot(text)
      if (!result.ok) return { ok: false, message: result.message }
      if (!confirmDiscard('Import this snapshot')) return { ok: false }
      onLoadProgram(result.memory)
      setFileName(null)
      setBaselineMemory(result.memory)
      return { ok: true }
    },
    [confirmDiscard, onLoadProgram],
  )

  return { fileName, isDirty, openFromFile, save, saveAs, close, loadExample, exportSnapshotText, importSnapshotText }
}
