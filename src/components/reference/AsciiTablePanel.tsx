import { ASCII_TABLE, type AsciiCategory } from '@/ascii'
import { toBinaryText, toDecimalText, toHexText } from '@/grid/format'

const CATEGORY_LABELS: Record<AsciiCategory, string> = {
  control: 'Control characters',
  digit: 'Digits',
  uppercase: 'Uppercase letters',
  lowercase: 'Lowercase letters',
  punctuation: 'Punctuation & symbols',
}

const CATEGORY_ORDER: AsciiCategory[] = ['control', 'digit', 'uppercase', 'lowercase', 'punctuation']

/**
 * The ASCII reference table (webapp-requirements.md §8.3): all 128 ASCII
 * characters, grouped by category, with character/hex/decimal/binary shown
 * together - needed because the print instructions work in raw byte values
 * a student has to look up when composing text data by hand.
 */
export function AsciiTablePanel() {
  return (
    <div className="flex flex-col gap-4 text-sm">
      {CATEGORY_ORDER.map((category) => {
        const entries = ASCII_TABLE.filter((entry) => entry.category === category)
        return (
          <div key={category}>
            <h3 className="mb-1 font-medium">{CATEGORY_LABELS[category]}</h3>
            <div role="table" aria-label={CATEGORY_LABELS[category]} className="grid grid-cols-[3rem_2.5rem_2.5rem_5.5rem] gap-x-2 gap-y-0.5 font-mono text-xs">
              <div role="row" className="contents font-sans font-medium text-muted-foreground">
                <span role="columnheader">Char</span>
                <span role="columnheader">Hex</span>
                <span role="columnheader">Dec</span>
                <span role="columnheader">Binary</span>
              </div>
              {entries.map((entry) => (
                <div role="row" className="contents" key={entry.code}>
                  <span role="cell">{entry.label}</span>
                  <span role="cell">{toHexText(entry.code)}</span>
                  <span role="cell">{toDecimalText(entry.code)}</span>
                  <span role="cell">{toBinaryText(entry.code)}</span>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
