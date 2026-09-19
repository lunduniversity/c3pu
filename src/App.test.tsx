import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import App from './App'

describe('App', () => {
  it('renders the app heading', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: 'c3pu' })).toBeInTheDocument()
  })

  it('loading a bundled example populates its § 7.1 marks end-to-end', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Examples' }))
    await user.click(await screen.findByText('Hello world (via PRL)'))

    // Address 0 is the leading LD OP1,10 instruction (marked code in the
    // bundled file); address 10 is the first character of the ASCII data
    // block PRL prints (marked data ascii).
    expect(screen.getByLabelText('Interpretation mark for memory address 0')).toHaveValue('code')
    expect(screen.getByLabelText('Interpretation mark for memory address 10')).toHaveValue('data-ascii')
  })
})
