import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { AsciiTablePanel } from '../AsciiTablePanel'

describe('AsciiTablePanel', () => {
  it('groups entries under all 5 categories', () => {
    render(<AsciiTablePanel />)
    for (const heading of ['Control characters', 'Digits', 'Uppercase letters', 'Lowercase letters', 'Punctuation & symbols']) {
      expect(screen.getByText(heading)).toBeInTheDocument()
    }
  })

  it('shows a printable character with its hex/decimal/binary representations in the same row', () => {
    render(<AsciiTablePanel />)
    const row = screen.getByText('H').closest('[role="row"]')
    expect(row).not.toBeNull()
    // "H" (char), "48" (hex), "72" (decimal), "01001000" (binary)
    expect(row).toHaveTextContent('H4872' + '01001000')
  })

  it('shows a control character by its mnemonic label, not a raw glyph', () => {
    render(<AsciiTablePanel />)
    expect(screen.getByText('NUL')).toBeInTheDocument()
    expect(screen.getByText('LF')).toBeInTheDocument()
  })
})
