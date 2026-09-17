import { memo } from 'react'
import type { DataRepresentation, UserMark } from '@/grid/marks'

export interface MarkPickerProps {
  address: number
  markKind: 'unmarked' | 'code' | 'data' | 'operand'
  markRepresentation?: DataRepresentation
  operandOwnerAddress?: number
  onChange: (mark: UserMark | null) => void
}

const OPTIONS: { value: string; mark: UserMark | null }[] = [
  { value: 'unmarked', mark: null },
  { value: 'code', mark: { kind: 'code' } },
  { value: 'data-binary', mark: { kind: 'data', representation: 'binary' } },
  { value: 'data-hex', mark: { kind: 'data', representation: 'hex' } },
  { value: 'data-decimal', mark: { kind: 'data', representation: 'decimal' } },
  { value: 'data-ascii', mark: { kind: 'data', representation: 'ascii' } },
]

/**
 * Lets the user explicitly mark a memory cell's intended interpretation
 * (webapp-requirements.md §11.11, decided). Disabled while the cell is an
 * auto-derived operand of a preceding code-marked instruction - it isn't
 * independently markable in that state.
 */
function MarkPickerImpl({ address, markKind, markRepresentation, operandOwnerAddress, onChange }: MarkPickerProps) {
  const isOperand = markKind === 'operand'
  const value = isOperand ? 'unmarked' : markKind === 'data' ? `data-${markRepresentation}` : markKind

  return (
    <select
      aria-label={`Interpretation mark for memory address ${address}`}
      className="h-6 rounded-sm border border-border bg-background px-1 font-mono text-xs disabled:opacity-50"
      value={value}
      disabled={isOperand}
      title={isOperand ? `Operand of the instruction at address ${operandOwnerAddress}` : undefined}
      onChange={(event) => {
        const option = OPTIONS.find((o) => o.value === event.target.value)
        onChange(option?.mark ?? null)
      }}
    >
      {isOperand ? (
        <option value="unmarked">operand of #{operandOwnerAddress}</option>
      ) : (
        OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.value === 'unmarked' ? 'unmarked' : o.value.replace('data-', 'data: ')}
          </option>
        ))
      )}
    </select>
  )
}

export const MarkPicker = memo(MarkPickerImpl)
