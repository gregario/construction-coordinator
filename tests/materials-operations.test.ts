import { describe, it, expect } from 'vitest'
import {
  validateMaterialInput,
  computeOrderByDate,
  parseEstimatedCost,
  materialDeadlineStatus,
  selectUpcomingOrders,
  type MaterialFormValues,
  type MaterialDeadlineInput,
} from '@/lib/materials/operations'

const VALID: MaterialFormValues = {
  name: 'Lumber 2x6',
  quantity: '40 pieces',
  lead_time_days: '14',
  estimated_cost: '',
  supplier_name: '',
  notes: '',
}

// @criterion: AC-ML-1
// AC-ML-1: form fields — name, quantity (freeform string), lead_time_days,
// estimated_cost (optional), supplier_name (optional), notes
describe('validateMaterialInput — AC-ML-1 / AC-ML-2', () => {
  it('accepts a valid material with all fields', () => {
    const result = validateMaterialInput({
      name: 'Lumber 2x6',
      quantity: '40 pieces',
      lead_time_days: '14',
      estimated_cost: '1200.50',
      supplier_name: 'Acme Lumber',
      notes: 'PT rated',
    })
    expect(result.ok).toBe(true)
    expect(result.errors).toEqual({})
  })

  it('accepts name + lead_time with everything else blank', () => {
    const result = validateMaterialInput({
      name: 'Lumber 2x6',
      quantity: '',
      lead_time_days: '14',
      estimated_cost: '',
      supplier_name: '',
      notes: '',
    })
    expect(result.ok).toBe(true)
  })

  it('accepts lead_time_days = 0 (in-stock items)', () => {
    const result = validateMaterialInput({ ...VALID, lead_time_days: '0' })
    expect(result.ok).toBe(true)
    expect(result.errors.lead_time_days).toBeFalsy()
  })

  it('rejects empty name', () => {
    const result = validateMaterialInput({ ...VALID, name: '' })
    expect(result.errors.name).toBeTruthy()
    expect(result.ok).toBe(false)
  })

  it('rejects whitespace-only name', () => {
    const result = validateMaterialInput({ ...VALID, name: '   ' })
    expect(result.errors.name).toBeTruthy()
    expect(result.ok).toBe(false)
  })

  it('rejects name longer than 200 characters', () => {
    const result = validateMaterialInput({ ...VALID, name: 'x'.repeat(201) })
    expect(result.errors.name).toBeTruthy()
    expect(result.ok).toBe(false)
  })
})

// @criterion: AC-ML-3
// AC-ML-3: lead_time_days empty or negative → "Lead time must be 0 or more days"
describe('validateMaterialInput — AC-ML-3 lead time validation', () => {
  it('rejects empty lead_time_days', () => {
    const result = validateMaterialInput({ ...VALID, lead_time_days: '' })
    expect(result.errors.lead_time_days).toBe('Lead time must be 0 or more days')
    expect(result.ok).toBe(false)
  })

  it('rejects whitespace-only lead_time_days', () => {
    const result = validateMaterialInput({ ...VALID, lead_time_days: '   ' })
    expect(result.errors.lead_time_days).toBe('Lead time must be 0 or more days')
  })

  it('rejects negative lead_time_days', () => {
    const result = validateMaterialInput({ ...VALID, lead_time_days: '-1' })
    expect(result.errors.lead_time_days).toBe('Lead time must be 0 or more days')
  })

  it('rejects non-numeric lead_time_days', () => {
    const result = validateMaterialInput({ ...VALID, lead_time_days: 'abc' })
    expect(result.errors.lead_time_days).toBe('Lead time must be 0 or more days')
  })

  it('rejects fractional lead_time_days', () => {
    const result = validateMaterialInput({ ...VALID, lead_time_days: '2.5' })
    expect(result.errors.lead_time_days).toBeTruthy()
  })
})

describe('validateMaterialInput — estimated_cost', () => {
  it('accepts blank estimated_cost', () => {
    const result = validateMaterialInput({ ...VALID, estimated_cost: '' })
    expect(result.errors.estimated_cost).toBeFalsy()
  })

  it('accepts a decimal estimated_cost', () => {
    const result = validateMaterialInput({ ...VALID, estimated_cost: '1234.56' })
    expect(result.errors.estimated_cost).toBeFalsy()
  })

  it('rejects a negative estimated_cost', () => {
    const result = validateMaterialInput({ ...VALID, estimated_cost: '-5' })
    expect(result.errors.estimated_cost).toBeTruthy()
  })

  it('rejects non-numeric estimated_cost', () => {
    const result = validateMaterialInput({ ...VALID, estimated_cost: 'free' })
    expect(result.errors.estimated_cost).toBeTruthy()
  })
})

describe('parseEstimatedCost', () => {
  it('returns null for blank', () => {
    expect(parseEstimatedCost('')).toBeNull()
    expect(parseEstimatedCost('  ')).toBeNull()
  })

  it('parses a decimal string', () => {
    expect(parseEstimatedCost('1200.50')).toBe(1200.5)
  })

  it('returns null for invalid', () => {
    expect(parseEstimatedCost('abc')).toBeNull()
  })
})

// @criterion: AC-ML-4
// AC-ML-4: edit → if lead_time_days changed, order_by_date recalculated.
// order_by_date = task.planned_start - lead_time_days (mirrors schema trigger).
describe('computeOrderByDate — AC-ML-4', () => {
  it('subtracts lead_time_days from planned_start', () => {
    expect(computeOrderByDate('2026-05-15', 14)).toBe('2026-05-01')
  })

  it('returns planned_start when lead_time is 0', () => {
    expect(computeOrderByDate('2026-05-15', 0)).toBe('2026-05-15')
  })

  it('handles month rollover correctly', () => {
    expect(computeOrderByDate('2026-05-05', 10)).toBe('2026-04-25')
  })

  it('handles year rollover correctly', () => {
    expect(computeOrderByDate('2026-01-05', 10)).toBe('2025-12-26')
  })

  it('returns null if planned_start is null', () => {
    expect(computeOrderByDate(null, 14)).toBeNull()
  })

  it('AC-OB-1: lead_time=14 + start=2026-06-15 → 2026-06-01', () => {
    expect(computeOrderByDate('2026-06-15', 14)).toBe('2026-06-01')
  })
})

const TODAY = '2026-04-05'

function mat(
  overrides: Partial<MaterialDeadlineInput> = {}
): MaterialDeadlineInput {
  return {
    id: 'm1',
    name: 'Lumber 2x6',
    order_by_date: '2026-04-10',
    order_status: 'not_ordered',
    ...overrides,
  }
}

// @criterion: AC-OB-2
// AC-OB-2: order_by_date in past + not_ordered → red 'overdue' badge.
describe('materialDeadlineStatus — AC-OB-2 overdue', () => {
  it("returns 'overdue' when order_by_date is before today and not_ordered", () => {
    expect(
      materialDeadlineStatus(
        mat({ order_by_date: '2026-04-04', order_status: 'not_ordered' }),
        TODAY
      )
    ).toBe('overdue')
  })

  it("returns 'overdue' when order_by_date is far in the past", () => {
    expect(
      materialDeadlineStatus(
        mat({ order_by_date: '2025-12-01', order_status: 'not_ordered' }),
        TODAY
      )
    ).toBe('overdue')
  })

  it('does NOT return overdue when order_status is ordered (already handled)', () => {
    expect(
      materialDeadlineStatus(
        mat({ order_by_date: '2026-04-04', order_status: 'ordered' }),
        TODAY
      )
    ).toBeNull()
  })

  it('does NOT return overdue when order_status is delivered', () => {
    expect(
      materialDeadlineStatus(
        mat({ order_by_date: '2026-04-04', order_status: 'delivered' }),
        TODAY
      )
    ).toBeNull()
  })
})

// @criterion: AC-OB-3
// AC-OB-3: order_by_date within next 7 days + not_ordered → amber 'due soon' badge.
describe('materialDeadlineStatus — AC-OB-3 due soon', () => {
  it("returns 'due_soon' when order_by_date is exactly 7 days away", () => {
    expect(
      materialDeadlineStatus(
        mat({ order_by_date: '2026-04-12', order_status: 'not_ordered' }),
        TODAY
      )
    ).toBe('due_soon')
  })

  it("returns 'due_soon' when order_by_date is today", () => {
    expect(
      materialDeadlineStatus(
        mat({ order_by_date: TODAY, order_status: 'not_ordered' }),
        TODAY
      )
    ).toBe('due_soon')
  })

  it("returns 'due_soon' for a date 1 day out", () => {
    expect(
      materialDeadlineStatus(
        mat({ order_by_date: '2026-04-06', order_status: 'not_ordered' }),
        TODAY
      )
    ).toBe('due_soon')
  })

  it('returns null when order_by_date is 8 days away (outside window)', () => {
    expect(
      materialDeadlineStatus(
        mat({ order_by_date: '2026-04-13', order_status: 'not_ordered' }),
        TODAY
      )
    ).toBeNull()
  })

  it('returns null when order_by_date is null', () => {
    expect(
      materialDeadlineStatus(
        mat({ order_by_date: null, order_status: 'not_ordered' }),
        TODAY
      )
    ).toBeNull()
  })

  it('returns null when due soon but already ordered', () => {
    expect(
      materialDeadlineStatus(
        mat({ order_by_date: '2026-04-08', order_status: 'ordered' }),
        TODAY
      )
    ).toBeNull()
  })
})

// @criterion: AC-OB-4
// AC-OB-4: /briefing 'Upcoming Orders' lists materials with order_by_date
// within next 7 days, sorted ascending by order_by_date.
describe('selectUpcomingOrders — AC-OB-4', () => {
  it('returns materials with order_by_date in the 7-day window, sorted ascending', () => {
    const input: MaterialDeadlineInput[] = [
      mat({ id: 'a', order_by_date: '2026-04-11' }),
      mat({ id: 'b', order_by_date: '2026-04-06' }),
      mat({ id: 'c', order_by_date: '2026-04-09' }),
    ]
    const result = selectUpcomingOrders(input, TODAY)
    expect(result.map(m => m.id)).toEqual(['b', 'c', 'a'])
  })

  it('includes overdue not_ordered materials at the top (sorted ascending)', () => {
    const input: MaterialDeadlineInput[] = [
      mat({ id: 'future', order_by_date: '2026-04-09' }),
      mat({ id: 'overdue-old', order_by_date: '2026-03-20' }),
      mat({ id: 'overdue-recent', order_by_date: '2026-04-01' }),
    ]
    const result = selectUpcomingOrders(input, TODAY)
    expect(result.map(m => m.id)).toEqual(['overdue-old', 'overdue-recent', 'future'])
  })

  it('excludes materials beyond the 7-day window', () => {
    const input: MaterialDeadlineInput[] = [
      mat({ id: 'in', order_by_date: '2026-04-12' }),
      mat({ id: 'out', order_by_date: '2026-04-13' }),
    ]
    const result = selectUpcomingOrders(input, TODAY)
    expect(result.map(m => m.id)).toEqual(['in'])
  })

  it('excludes materials with null order_by_date', () => {
    const input: MaterialDeadlineInput[] = [
      mat({ id: 'a', order_by_date: null }),
      mat({ id: 'b', order_by_date: '2026-04-07' }),
    ]
    const result = selectUpcomingOrders(input, TODAY)
    expect(result.map(m => m.id)).toEqual(['b'])
  })

  it('excludes already-ordered and delivered materials', () => {
    const input: MaterialDeadlineInput[] = [
      mat({ id: 'ordered', order_by_date: '2026-04-08', order_status: 'ordered' }),
      mat({ id: 'delivered', order_by_date: '2026-04-09', order_status: 'delivered' }),
      mat({ id: 'pending', order_by_date: '2026-04-10', order_status: 'not_ordered' }),
    ]
    const result = selectUpcomingOrders(input, TODAY)
    expect(result.map(m => m.id)).toEqual(['pending'])
  })

  it('returns empty array when no materials match', () => {
    expect(selectUpcomingOrders([], TODAY)).toEqual([])
  })
})
