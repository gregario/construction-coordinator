import { describe, it, expect } from 'vitest'
import {
  validateDelayDate,
  formatCascadeSummaryMessage,
} from '@/lib/tasks/delay'

// @criterion: AC-DL-2
describe('validateDelayDate — AC-DL-2', () => {
  it('accepts a strictly later date', () => {
    expect(validateDelayDate('2026-06-10', '2026-06-15')).toEqual({ ok: true })
  })

  it('accepts a date one day later (boundary)', () => {
    expect(validateDelayDate('2026-06-10', '2026-06-11')).toEqual({ ok: true })
  })

  it('rejects the same date as current end', () => {
    const r = validateDelayDate('2026-06-10', '2026-06-10')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toMatch(/after the current end date/i)
  })

  it('rejects an earlier date', () => {
    const r = validateDelayDate('2026-06-10', '2026-06-05')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toMatch(/after the current end date/i)
  })

  it('rejects a malformed date string', () => {
    const r = validateDelayDate('2026-06-10', 'tomorrow')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toMatch(/valid date/i)
  })

  it('rejects an empty new date', () => {
    const r = validateDelayDate('2026-06-10', '')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toMatch(/valid date/i)
  })

  it('rejects a calendar-impossible date (Feb 30)', () => {
    const r = validateDelayDate('2026-01-01', '2026-02-30')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toMatch(/valid date/i)
  })

  it('handles month-boundary later dates', () => {
    expect(validateDelayDate('2026-06-30', '2026-07-01')).toEqual({ ok: true })
  })

  it('handles year-boundary later dates', () => {
    expect(validateDelayDate('2026-12-31', '2027-01-01')).toEqual({ ok: true })
  })

  it('rejects when current end is missing', () => {
    const r = validateDelayDate('', '2026-06-15')
    expect(r.ok).toBe(false)
  })
})

// @criterion: AC-DL-3
describe('formatCascadeSummaryMessage — AC-DL-3', () => {
  it('pluralizes both counts above 1', () => {
    expect(formatCascadeSummaryMessage(3, 5)).toBe(
      '3 tasks shifted, 5 material order-by dates moved'
    )
  })

  it('singularizes task when count is 1', () => {
    expect(formatCascadeSummaryMessage(1, 5)).toBe(
      '1 task shifted, 5 material order-by dates moved'
    )
  })

  it('singularizes material date when count is 1', () => {
    expect(formatCascadeSummaryMessage(3, 1)).toBe(
      '3 tasks shifted, 1 material order-by date moved'
    )
  })

  it('renders zero counts honestly', () => {
    expect(formatCascadeSummaryMessage(1, 0)).toBe(
      '1 task shifted, 0 material order-by dates moved'
    )
  })

  it('handles zero tasks (defensive — cascade always returns at least the trigger)', () => {
    expect(formatCascadeSummaryMessage(0, 0)).toBe(
      '0 tasks shifted, 0 material order-by dates moved'
    )
  })
})
