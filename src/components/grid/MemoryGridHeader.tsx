/**
 * Column headers for MemoryGrid, sticky to the top of its scroll container
 * (webapp-requirements.md §5/§11.4) so they stay visible while scrolling
 * through 256 rows. Column widths deliberately mirror MemoryRow's own width
 * and gap utility classes exactly, rather than computing a layout
 * independently, so the two can't drift out of alignment with each other.
 */
export function MemoryGridHeader() {
  return (
    // Not role="row": this is a purely visual labeling aid, not part of the
    // 256-row ARIA grid model (aria-rowcount/aria-rowindex on the real rows
    // already accounts for exactly 256) - each cell's own aria-label already
    // carries full context (e.g. "Memory address 42, bit 3, value 1")
    // independent of this header.
    <div
      aria-hidden="true"
      className="sticky top-0 z-10 flex items-center gap-2 border-b border-border bg-background px-2 py-1 text-[0.65rem] font-medium tracking-wide text-muted-foreground uppercase"
    >
      <span className="w-4 shrink-0" />
      <span className="w-[6.375rem] shrink-0" />
      <span className="w-10 shrink-0">Addr</span>
      <span className="w-6 shrink-0" />
      <div className="flex shrink-0 gap-0.5">
        {[7, 6, 5, 4, 3, 2, 1, 0].map((bit) => (
          <span key={bit} className="flex h-4 w-6 shrink-0 items-center justify-center normal-case">
            {bit}
          </span>
        ))}
      </div>
      <span className="w-8 shrink-0">Hex</span>
      <span className="w-10 shrink-0">Dec</span>
      <span className="w-10 shrink-0">ASCII</span>
      <span className="min-w-40 shrink-0">Instruction</span>
      <span className="shrink-0">Mark</span>
    </div>
  )
}
