import type { ReactNode } from 'react'

export interface CollapsiblePanelProps {
  title: string
  open: boolean
  onOpenChange: (open: boolean) => void
  children: ReactNode
}

/**
 * A foldable side panel (webapp-requirements.md §11.1): the three reference
 * resources (§8) are meant to stay visible *alongside* the main working
 * view, not interrupt it as a modal or a separate window. Native
 * <details>/<summary> gives this for free - keyboard support, semantics,
 * and no extra dependency - controlled here so its state can later be
 * wired to a persisted preference (§9) without changing this component.
 */
export function CollapsiblePanel({ title, open, onOpenChange, children }: CollapsiblePanelProps) {
  return (
    <details
      open={open}
      onToggle={(event) => onOpenChange(event.currentTarget.open)}
      className="rounded border border-border"
    >
      <summary className="cursor-pointer select-none rounded px-3 py-2 font-medium hover:bg-accent">{title}</summary>
      <div className="max-h-[70vh] overflow-y-auto border-t border-border p-3">{children}</div>
    </details>
  )
}
