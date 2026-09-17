import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { EXAMPLE_PROGRAMS } from '@/examples'
import type { UseFileStateResult } from '@/app/useFileState'

export interface FileControlsProps {
  file: UseFileStateResult
}

/**
 * File operations (webapp-requirements.md §7.2/§7.4) and the compact
 * snapshot export/import (§7.3). All the confirm-if-unsaved-changes logic
 * lives in useFileState - this component is purely presentational plumbing.
 */
export function FileControls({ file }: FileControlsProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [snapshotText, setSnapshotText] = useState('')
  const [importText, setImportText] = useState('')
  const [importError, setImportError] = useState<string | null>(null)
  const [showSnapshot, setShowSnapshot] = useState(false)

  const handleOpenClick = () => fileInputRef.current?.click()

  const handleFileSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0]
    event.target.value = '' // allow re-selecting the same file later
    if (selected) await file.openFromFile(selected)
  }

  const handleShowSnapshot = () => {
    setSnapshotText(file.exportSnapshotText())
    setShowSnapshot(true)
  }

  const handleCopySnapshot = async () => {
    try {
      await navigator.clipboard?.writeText(snapshotText)
    } catch {
      // Clipboard API may be unavailable (e.g. a file:// origin) - the text
      // is already visible and selectable in the textarea either way.
    }
  }

  const handleImport = () => {
    const result = file.importSnapshotText(importText)
    if (result.ok) {
      setImportError(null)
      setImportText('')
    } else if (result.message) {
      setImportError(result.message)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant="outline" onClick={handleOpenClick}>
          Open
        </Button>
        <input ref={fileInputRef} type="file" accept=".txt,text/plain" className="hidden" onChange={handleFileSelected} />
        <Button size="sm" variant="outline" onClick={file.save}>
          Save
        </Button>
        <Button size="sm" variant="outline" onClick={file.saveAs}>
          Save As
        </Button>
        <Button size="sm" variant="outline" onClick={file.close}>
          Close
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="outline">
              Examples
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {EXAMPLE_PROGRAMS.map((example) => (
              <DropdownMenuItem key={example.id} onSelect={() => file.loadExample(example)} title={example.description}>
                {example.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <Button size="sm" variant="outline" onClick={handleShowSnapshot}>
          Snapshot
        </Button>
        <span className="text-sm text-muted-foreground">
          {file.fileName ?? 'Untitled'}
          {file.isDirty ? ' — unsaved changes' : ''}
        </span>
      </div>

      {showSnapshot && (
        <div className="flex flex-col gap-2 rounded border border-border p-2">
          <div className="flex items-center justify-between">
            <label htmlFor="snapshot-export" className="text-sm font-medium">
              Export snapshot
            </label>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={handleCopySnapshot}>
                Copy
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowSnapshot(false)}>
                Hide
              </Button>
            </div>
          </div>
          <textarea
            id="snapshot-export"
            readOnly
            value={snapshotText}
            onFocus={(event) => event.currentTarget.select()}
            className="h-16 w-full resize-none rounded border border-border bg-background p-1 font-mono text-xs"
          />

          <label htmlFor="snapshot-import" className="text-sm font-medium">
            Import snapshot
          </label>
          <div className="flex gap-2">
            <input
              id="snapshot-import"
              type="text"
              value={importText}
              onChange={(event) => setImportText(event.target.value)}
              placeholder="c3pu1:..."
              className="flex-1 rounded border border-border bg-background p-1 font-mono text-xs"
            />
            <Button size="sm" variant="outline" onClick={handleImport}>
              Import
            </Button>
          </div>
          {importError && <p className="text-xs text-destructive">{importError}</p>}
        </div>
      )}
    </div>
  )
}
