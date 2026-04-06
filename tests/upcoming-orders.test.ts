import { describe, it, expect } from 'vitest'
import {
  daysUntilOrderBy,
  formatMaterialCost,
  selectUpcomingOrders,
  type MaterialDeadlineInput,
} from '@/lib/materials/operations'

// --- AC-UO-2: days remaining until order_by_date ---

describe('daysUntilOrderBy — AC-UO-2', () => {
  it('returns positive days for a future order_by_date', () => {
    expect(daysUntilOrderBy('2026-06-10', '2026-06-15')).toBe(5)
  })

  it('returns 0 when order_by_date is today', () => {
    expect(daysUntilOrderBy('2026-06-10', '2026-06-10')).toBe(0)
  })

  it('returns negative days for an overdue order_by_date', () => {
    expect(daysUntilOrderBy('2026-06-15', '2026-06-10')).toBe(-5)
  })

  it('returns null when order_by_date is null', () => {
    expect(daysUntilOrderBy('2026-06-10', null)).toBeNull()
  })

  it('returns null when order_by_date is malformed', () => {
    expect(daysUntilOrderBy('2026-06-10', 'not-a-date')).toBeNull()
  })

  it('handles month boundary correctly', () => {
    expect(daysUntilOrderBy('2026-01-30', '2026-02-01')).toBe(2)
  })
})

// --- AC-UO-3: formatted estimated_cost ---

describe('formatMaterialCost — AC-UO-3', () => {
  it('formats a cost as EUR with 2 decimals', () => {
    expect(formatMaterialCost(1200.5)).toBe('€1,200.50')
  })

  it('formats a zero cost', () => {
    expect(formatMaterialCost(0)).toBe('€0.00')
  })

  it('returns null for null input', () => {
    expect(formatMaterialCost(null)).toBeNull()
  })

  it('formats a whole number cost', () => {
    expect(formatMaterialCost(500)).toBe('€500.00')
  })
})

// --- AC-UO-4: section hidden when no upcoming orders ---

describe('selectUpcomingOrders with AC-UO-4 context', () => {
  const makeMat = (
    id: string,
    orderByDate: string | null,
    status: 'not_ordered' | 'ordered' | 'delivered' = 'not_ordered'
  ): MaterialDeadlineInput => ({
    id,
    name: `Material ${id}`,
    order_by_date: orderByDate,
    order_status: status,
  })

  it('returns empty array when no materials due within 7 days', () => {
    const result = selectUpcomingOrders(
      [makeMat('1', '2026-07-01'), makeMat('2', null)],
      '2026-06-10'
    )
    expect(result).toEqual([])
  })

  it('excludes already ordered materials', () => {
    const result = selectUpcomingOrders(
      [makeMat('1', '2026-06-12', 'ordered')],
      '2026-06-10'
    )
    expect(result).toEqual([])
  })

  it('includes overdue not_ordered materials (they sort first)', () => {
    const overdue = makeMat('1', '2026-06-08')
    const dueSoon = makeMat('2', '2026-06-15')
    const result = selectUpcomingOrders([dueSoon, overdue], '2026-06-10')
    expect(result[0].id).toBe('1')
    expect(result[1].id).toBe('2')
  })
})
