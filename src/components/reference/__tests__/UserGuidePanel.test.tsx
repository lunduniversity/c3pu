import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { UserGuidePanel } from '../UserGuidePanel'

describe('UserGuidePanel', () => {
  it('covers the required topics: quickstart, layout, editing, selection, and running', () => {
    render(<UserGuidePanel />)
    expect(screen.getByText('Quickstart')).toBeInTheDocument()
    expect(screen.getByText('Layout')).toBeInTheDocument()
    expect(screen.getByText('Editing memory and registers')).toBeInTheDocument()
    expect(screen.getByText('Selecting, moving, and copying memory rows')).toBeInTheDocument()
    expect(screen.getByText('Running a program')).toBeInTheDocument()
  })
})
