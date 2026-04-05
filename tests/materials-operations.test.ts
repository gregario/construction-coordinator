import { describe, it, expect } from 'vitest'
import {
  validateMaterialInput,
  computeOrderByDate,
  parseEstimatedCost,
  type MaterialFormValues,
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
})
