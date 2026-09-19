import { useCallback, useEffect, useState } from 'react'
import { MEMORY_SIZE } from '@/engine/types'
import type { ExampleProgram } from '@/examples'
import { downloadTextFile } from '@/file/download'
import type { UserMarks } from '@/grid/marks'
import { parseProgramFile, serializeProgramFile } from '@/grid/program-file'
import { exportSnapshot, importSnapshot } from '@/snapshot/codec'

const DEFAULT_FILE_NAME = 'program.txt'

/** The file-format-relevant slice of state (webapp-requirements.md §7.1 now
 * covers marks too) - what "unsaved changes" is tracked against. */
interface FileBaseline {
  memory: readonly number[]
  marks: UserMarks
}

function memoriesEqual(a: readonly number[], b: readonly number[]): boolean {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false
  return true
}

function marksEqual(a: UserMarks, b: UserMarks): boolean {
  const aKeys = Object.keys(a)
  const bKeys = Object.keys(b)
  if (aKeys.length !== bKeys.length) return false
  return aKeys.every((key) => JSON.stringify(a[Number(key)]) === JSON.stringify(b[Number(key)]))
}

export interface UseFileStateParams {
  memory: readonly number[]
  marks: UserMarks
  onLoadProgram: (memory: readonly number[], marks?: UserMarks) => void
  /** Seeds fileName/baseline from a resumed session (§11.10) - the restored
   * memory should read as "unmodified since last saved," not as a
   * from-scratch, already-dirty program. */
  initialFileName?: string | null
  initialBaselineMemory?: readonly number[] | null
  initialBaselineMarks?: UserMarks | null
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
 * or marks differing from a baseline set by the last Open/Save/example-load/
 * snapshot import, not tied to registers or execution status (memory and
 * marks are both part of the file format, per §7.1; a snapshot import's
 * baseline has empty marks, since the snapshot codec doesn't carry them).
 */
export function useFileState({
  memory,
  marks,
  onLoadProgram,
  initialFileName = null,
  initialBaselineMemory = null,
  initialBaselineMarks = null,
}: UseFileStateParams): UseFileStateResult {
  const [fileName, setFileName] = useState<string | null>(initialFileName)
  const [baseline, setBaseline] = useState<FileBaseline | null>(
    initialBaselineMemory ? { memory: initialBaselineMemory, marks: initialBaselineMarks ?? {} } : null,
  )

  const isDirty = baseline
    ? !memoriesEqual(memory, baseline.memory) || !marksEqual(marks, baseline.marks)
    : memory.some((byte) => byte !== 0) || Object.keys(marks).length > 0

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
      const parsed = parseProgramFile(text)
      if (!parsed.ok) {
        window.alert(`Could not open ${file.name}: line ${parsed.line}: ${parsed.message}`)
        return
      }
      onLoadProgram(parsed.memory, parsed.marks)
      setFileName(file.name)
      setBaseline({ memory: parsed.memory, marks: parsed.marks })
    },
    [confirmDiscard, onLoadProgram],
  )

  const save = useCallback(() => {
    const name = fileName ?? DEFAULT_FILE_NAME
    downloadTextFile(name, serializeProgramFile(memory, marks))
    setFileName(name)
    setBaseline({ memory, marks })
  }, [fileName, memory, marks])

  const saveAs = useCallback(() => {
    const proposed = fileName ?? DEFAULT_FILE_NAME
    const name = window.prompt('Save as filename:', proposed)
    if (!name) return
    downloadTextFile(name, serializeProgramFile(memory, marks))
    setFileName(name)
    setBaseline({ memory, marks })
  }, [fileName, memory, marks])

  const close = useCallback(() => {
    if (!confirmDiscard('Close')) return
    onLoadProgram(new Array(MEMORY_SIZE).fill(0))
    setFileName(null)
    setBaseline(null)
  }, [confirmDiscard, onLoadProgram])

  const loadExample = useCallback(
    (example: ExampleProgram) => {
      if (!confirmDiscard('Load this example')) return
      const parsed = parseProgramFile(example.text)
      if (!parsed.ok) {
        window.alert(`Bundled example "${example.label}" failed to parse - this is a bug, please report it.`)
        return
      }
      onLoadProgram(parsed.memory, parsed.marks)
      setFileName(null)
      setBaseline({ memory: parsed.memory, marks: parsed.marks })
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
      setBaseline({ memory: result.memory, marks: {} })
      return { ok: true }
    },
    [confirmDiscard, onLoadProgram],
  )

  return { fileName, isDirty, openFromFile, save, saveAs, close, loadExample, exportSnapshotText, importSnapshotText }
}
