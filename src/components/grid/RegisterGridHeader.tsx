/**
 * Column headers for RegisterGrid - a purely visual labeling aid, not part
 * of the ARIA grid model (see MemoryGridHeader.tsx for why). Column widths
 * mirror RegisterRow's own width and gap utility classes exactly.
 */
export function RegisterGridHeader() {
  return (
    <div
      aria-hidden="true"
      className="flex items-center gap-2 border-b border-border px-2 py-1 text-[0.65rem] font-medium tracking-wide text-muted-foreground uppercase"
    >
      <span className="w-6 shrink-0" />
      <span className="w-10 shrink-0">Reg</span>
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
    </div>
  )
}
