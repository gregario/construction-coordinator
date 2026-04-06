import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

// Mock next/navigation (used by RefreshButton)
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}))

import { BriefingHeader } from '@/components/briefing/BriefingHeader'

// @criterion: AC-PI-1, AC-PI-2, AC-PI-3
describe('BriefingHeader — project identity', () => {
  // AC-PI-1: Project name visible in briefing header
  it('renders the project name in the header region', () => {
    render(<BriefingHeader projectName="O'Brien Timber Frame House" />)

    expect(screen.getByText("O'Brien Timber Frame House")).toBeInTheDocument()
  })

  // AC-PI-2: Project name renders below Daily Briefing title as smaller text
  it('renders project name below Daily Briefing heading with text-sm class', () => {
    render(<BriefingHeader projectName="O'Brien Timber Frame House" />)

    const heading = screen.getByRole('heading', { level: 1 })
    expect(heading).toHaveTextContent('Daily Briefing')

    const subtitle = screen.getByText("O'Brien Timber Frame House")
    expect(subtitle.tagName).toBe('P')
    expect(subtitle.className).toContain('text-sm')
  })

  // AC-PI-3: Long project names do not break layout (truncate within container)
  it('applies truncate class to prevent overflow on long project names', () => {
    const longName = 'A'.repeat(60) + ' Very Long Project Name That Should Truncate'
    render(<BriefingHeader projectName={longName} />)

    const subtitle = screen.getByText(longName)
    expect(subtitle.className).toContain('truncate')
  })
})
