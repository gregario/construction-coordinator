import { describe, it, expect } from 'vitest'
import {
  validateStageInput,
  reorderStages,
  buildDeleteWarning,
  normalizeStageColor,
  type StageRecord,
} from '@/lib/stages/operations'

describe('validateStageInput — AC-SM-1', () => {
  it('accepts a valid name + color', () => {
    const result = validateStageInput({ name: 'Foundations', color: '#8B5E3C' })
    expect(result.errors).toEqual({})
    expect(result.ok).toBe(true)
  })

  it('rejects empty name', () => {
    const result = validateStageInput({ name: '', color: '#8B5E3C' })
    expect(result.errors.name).toBeTruthy()
    expect(result.ok).toBe(false)
  })

  it('rejects whitespace-only name', () => {
    const result = validateStageInput({ name: '   ', color: '#8B5E3C' })
    expect(result.errors.name).toBeTruthy()
    expect(result.ok).toBe(false)
  })

  it('rejects name longer than 80 characters', () => {
    const result = validateStageInput({ name: 'x'.repeat(81), color: '#8B5E3C' })
    expect(result.errors.name).toBeTruthy()
    expect(result.ok).toBe(false)
  })

  it('rejects an invalid hex color', () => {
    const result = validateStageInput({ name: 'Frame', color: 'not-a-color' })
    expect(result.errors.color).toBeTruthy()
    expect(result.ok).toBe(false)
  })

  it('accepts 3-digit and 6-digit hex colors', () => {
    expect(validateStageInput({ name: 'A', color: '#fff' }).ok).toBe(true)
    expect(validateStageInput({ name: 'A', color: '#FFFFFF' }).ok).toBe(true)
  })
})

describe('normalizeStageColor', () => {
  it('defaults missing/invalid color to the brand default', () => {
    expect(normalizeStageColor(null)).toBe('#8B5E3C')
    expect(normalizeStageColor(undefined)).toBe('#8B5E3C')
    expect(normalizeStageColor('')).toBe('#8B5E3C')
    expect(normalizeStageColor('garbage')).toBe('#8B5E3C')
  })

  it('passes through valid hex colors', () => {
    expect(normalizeStageColor('#123456')).toBe('#123456')
    expect(normalizeStageColor('#abc')).toBe('#abc')
  })
})

describe('reorderStages — AC-SM-2', () => {
  const base: StageRecord[] = [
    { id: 's1', name: 'Foundations', color: '#8B5E3C', order_index: 0 },
    { id: 's2', name: 'Frame', color: '#6B8F3F', order_index: 1 },
    { id: 's3', name: 'Roof', color: '#2B1F17', order_index: 2 },
    { id: 's4', name: 'Finish', color: '#C48A3A', order_index: 3 },
  ]

  it('moves a stage from the end to the start and renumbers order_index', () => {
    const result = reorderStages(base, 's4', 0)
    expect(result.map(s => s.id)).toEqual(['s4', 's1', 's2', 's3'])
    expect(result.map(s => s.order_index)).toEqual([0, 1, 2, 3])
  })

  it('moves a stage from the start to the end', () => {
    const result = reorderStages(base, 's1', 3)
    expect(result.map(s => s.id)).toEqual(['s2', 's3', 's4', 's1'])
    expect(result.map(s => s.order_index)).toEqual([0, 1, 2, 3])
  })

  it('moves a middle stage forward', () => {
    const result = reorderStages(base, 's2', 2)
    expect(result.map(s => s.id)).toEqual(['s1', 's3', 's2', 's4'])
    expect(result.map(s => s.order_index)).toEqual([0, 1, 2, 3])
  })

  it('moves a middle stage backward', () => {
    const result = reorderStages(base, 's3', 0)
    expect(result.map(s => s.id)).toEqual(['s3', 's1', 's2', 's4'])
  })

  it('no-ops when moving to the same index', () => {
    const result = reorderStages(base, 's2', 1)
    expect(result.map(s => s.id)).toEqual(['s1', 's2', 's3', 's4'])
    expect(result.map(s => s.order_index)).toEqual([0, 1, 2, 3])
  })

  it('clamps an out-of-range target index', () => {
    const result = reorderStages(base, 's1', 99)
    expect(result.map(s => s.id)).toEqual(['s2', 's3', 's4', 's1'])
  })

  it('returns the original ordering if the id is unknown', () => {
    const result = reorderStages(base, 'missing', 0)
    expect(result.map(s => s.id)).toEqual(['s1', 's2', 's3', 's4'])
  })

  it('does not mutate the input array', () => {
    const snapshot = base.map(s => ({ ...s }))
    reorderStages(base, 's4', 0)
    expect(base).toEqual(snapshot)
  })

  it('tolerates input that is not already sorted', () => {
    const shuffled = [base[2], base[0], base[3], base[1]]
    const result = reorderStages(shuffled, 's1', 0)
    // Expected: sort input by order_index → [s1,s2,s3,s4], then move s1 to 0 (noop)
    expect(result.map(s => s.id)).toEqual(['s1', 's2', 's3', 's4'])
    expect(result.map(s => s.order_index)).toEqual([0, 1, 2, 3])
  })
})

describe('buildDeleteWarning — AC-SM-3 / AC-SM-4', () => {
  it('returns requiresConfirmation=false when the stage is empty', () => {
    const warning = buildDeleteWarning('Frame', 0)
    expect(warning.requiresConfirmation).toBe(false)
    expect(warning.message).toBeNull()
  })

  it('returns a confirmation warning quoting the task count (1 task)', () => {
    const warning = buildDeleteWarning('Frame', 1)
    expect(warning.requiresConfirmation).toBe(true)
    expect(warning.message).toContain('1 task')
    expect(warning.message).toContain('deleting removes them all')
  })

  it('pluralizes for multiple tasks', () => {
    const warning = buildDeleteWarning('Frame', 7)
    expect(warning.requiresConfirmation).toBe(true)
    expect(warning.message).toContain('7 tasks')
  })
})
