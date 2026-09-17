import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { MNEMONICS } from '@/engine/types'
import { InstructionReferencePanel } from '../InstructionReferencePanel'

describe('InstructionReferencePanel', () => {
  it('lists every instruction from the engine’s mnemonic set', () => {
    render(<InstructionReferencePanel currentMnemonic={null} />)
    for (const mnemonic of MNEMONICS) {
      expect(screen.getByText(mnemonic)).toBeInTheDocument()
    }
  })

  it('highlights the entry matching the current mnemonic, and only that one', () => {
    render(<InstructionReferencePanel currentMnemonic="CJP" />)
    const highlighted = document.querySelectorAll('[data-current]')
    expect(highlighted).toHaveLength(1)
    expect(highlighted[0]).toHaveTextContent('CJP')
  })

  it('highlights nothing when there is no current mnemonic', () => {
    render(<InstructionReferencePanel currentMnemonic={null} />)
    expect(document.querySelectorAll('[data-current]')).toHaveLength(0)
  })
})
