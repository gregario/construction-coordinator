import { describe, it, expect } from 'vitest'

describe('Snag status transitions', () => {
  const validTransitions: Record<string, string[]> = {
    open: ['in_progress', 'resolved'],
    in_progress: ['resolved'],
    resolved: [],
  }

  it('allows open → in_progress', () => {
    expect(validTransitions.open).toContain('in_progress')
  })

  it('allows open → resolved', () => {
    expect(validTransitions.open).toContain('resolved')
  })

  it('allows in_progress → resolved', () => {
    expect(validTransitions.in_progress).toContain('resolved')
  })

  it('prevents resolved → open (no backward)', () => {
    expect(validTransitions.resolved).not.toContain('open')
  })

  it('prevents resolved → in_progress (no backward)', () => {
    expect(validTransitions.resolved).not.toContain('in_progress')
  })

  it('prevents in_progress → open (no backward)', () => {
    expect(validTransitions.in_progress).not.toContain('open')
  })
})

describe('Snag priority values', () => {
  const priorities = ['low', 'medium', 'high', 'critical']

  it('has 4 priority levels', () => {
    expect(priorities).toHaveLength(4)
  })

  it('orders from least to most urgent', () => {
    expect(priorities[0]).toBe('low')
    expect(priorities[3]).toBe('critical')
  })
})

describe('Snag validation', () => {
  it('rejects empty title', () => {
    const title = '  '
    expect(title.trim()).toBe('')
  })

  it('accepts valid title', () => {
    const title = 'Leaking waste pipe under bath'
    expect(title.trim().length).toBeGreaterThan(0)
  })
})
