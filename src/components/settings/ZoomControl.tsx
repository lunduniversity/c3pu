const ZOOM_LEVELS = [50, 75, 90, 100, 110, 125, 150, 175, 200]

export interface ZoomControlProps {
  zoomPercent: number
  onChange: (zoomPercent: number) => void
}

/** UI zoom/text size level (webapp-requirements.md §9). */
export function ZoomControl({ zoomPercent, onChange }: ZoomControlProps) {
  return (
    <label className="flex items-center gap-2 text-sm">
      Zoom
      <select
        value={zoomPercent}
        onChange={(event) => onChange(Number(event.target.value))}
        className="rounded border border-border bg-background px-1 py-0.5 text-sm"
      >
        {ZOOM_LEVELS.map((level) => (
          <option key={level} value={level}>
            {level}%
          </option>
        ))}
      </select>
    </label>
  )
}
