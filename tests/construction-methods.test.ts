import { describe, it, expect } from 'vitest'
import { CATEGORY_ORDER, CATEGORY_LABELS } from '@/app/actions/construction-methods'

describe('CATEGORY_ORDER', () => {
  it('has 9 categories', () => {
    expect(CATEGORY_ORDER).toHaveLength(9)
  })

  it('starts with foundation and ends with external', () => {
    expect(CATEGORY_ORDER[0]).toBe('foundation')
    expect(CATEGORY_ORDER[CATEGORY_ORDER.length - 1]).toBe('external')
  })

  it('includes all standard construction categories', () => {
    const expected = [
      'foundation', 'structure', 'doors_windows',
      'envelope_walls', 'envelope_roof',
      'first_fix', 'second_fix', 'finishing', 'external',
    ]
    expect(CATEGORY_ORDER).toEqual(expected)
  })

  it('has no duplicates', () => {
    const unique = new Set(CATEGORY_ORDER)
    expect(unique.size).toBe(CATEGORY_ORDER.length)
  })
})

describe('CATEGORY_LABELS', () => {
  it('has a label for every category in CATEGORY_ORDER', () => {
    for (const cat of CATEGORY_ORDER) {
      expect(CATEGORY_LABELS[cat]).toBeDefined()
      expect(typeof CATEGORY_LABELS[cat]).toBe('string')
      expect(CATEGORY_LABELS[cat].length).toBeGreaterThan(0)
    }
  })

  it('uses human-readable names', () => {
    expect(CATEGORY_LABELS.foundation).toBe('Foundation')
    expect(CATEGORY_LABELS.structure).toBe('Structure (Framing)')
    expect(CATEGORY_LABELS.doors_windows).toBe('Doors & Windows')
    expect(CATEGORY_LABELS.first_fix).toBe('1st Fix')
    expect(CATEGORY_LABELS.second_fix).toBe('2nd Fix')
  })
})

describe('SchemeSelection type contract', () => {
  it('maps category to method_id', () => {
    const selection: Record<string, string> = {
      foundation: 'uuid-1',
      structure: 'uuid-2',
    }
    expect(Object.keys(selection)).toContain('foundation')
    expect(typeof selection.foundation).toBe('string')
  })
})
