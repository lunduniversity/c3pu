import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { HighlightLegend } from '../HighlightLegend'

describe('HighlightLegend', () => {
  it('labels every highlight concept used by the memory/register grids', () => {
    render(<HighlightLegend />)
    for (const label of [
      'Bit set to 1',
      'Edit cursor',
      'Selected',
      'Would be read',
      'Would be written',
      'Just changed / halted',
      'Program counter',
      'Error',
    ]) {
      expect(screen.getByText(label)).toBeInTheDocument()
    }
  })
})
