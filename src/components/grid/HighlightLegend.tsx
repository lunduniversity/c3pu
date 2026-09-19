interface LegendItem {
  label: string
  swatch: string
}

const ITEMS: LegendItem[] = [
  { label: 'Bit set to 1', swatch: 'bg-bit-on' },
  { label: 'Edit cursor', swatch: 'bg-background ring-2 ring-ring ring-inset' },
  { label: 'Selected', swatch: 'bg-selected' },
  { label: 'Would be read', swatch: 'bg-predicted-read' },
  { label: 'Would be written', swatch: 'bg-predicted-write' },
  { label: 'Just changed / halted', swatch: 'bg-actual-change' },
  { label: 'Program counter', swatch: 'bg-pc outline outline-2 -outline-offset-2 outline-pc' },
  { label: 'Error', swatch: 'bg-destructive/35' },
]

/**
 * A key for the grid's highlight colors (webapp-requirements.md §5): one
 * swatch per concept, reusing the exact same utility classes the grids
 * themselves use (see MemoryRow.tsx/RegisterRow.tsx/BitCell.tsx) so this
 * can never fall out of sync with what's actually shown.
 */
export function HighlightLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
      {ITEMS.map((item) => (
        <div key={item.label} className="flex items-center gap-1.5">
          <span className={`h-3.5 w-3.5 shrink-0 rounded-sm border border-border/50 ${item.swatch}`} aria-hidden="true" />
          <span>{item.label}</span>
        </div>
      ))}
    </div>
  )
}
