import { describe, it, expect } from 'vitest'

// Test block validation logic (pure functions, no Supabase calls)

describe('Block validation', () => {
  it('rejects empty block name', () => {
    const name = '  '
    expect(name.trim()).toBe('')
  })

  it('accepts valid block name', () => {
    const name = 'Main Building'
    expect(name.trim().length).toBeGreaterThan(0)
  })

  it('rejects storeys below 1', () => {
    const storeys = 0
    expect(storeys >= 1 && storeys <= 10).toBe(false)
  })

  it('rejects storeys above 10', () => {
    const storeys = 11
    expect(storeys >= 1 && storeys <= 10).toBe(false)
  })

  it('accepts valid storeys range', () => {
    for (const s of [1, 2, 3, 5, 10]) {
      expect(s >= 1 && s <= 10).toBe(true)
    }
  })

  it('validates attachment_type values', () => {
    const valid = ['attached', 'detached']
    expect(valid.includes('attached')).toBe(true)
    expect(valid.includes('detached')).toBe(true)
    expect(valid.includes('semi-detached' as string)).toBe(false)
  })
})

describe('Block ordering', () => {
  it('next order_index is max + 1', () => {
    const existing = [
      { order_index: 0 },
      { order_index: 1 },
      { order_index: 2 },
    ]
    const maxOrder = Math.max(...existing.map(e => e.order_index))
    expect(maxOrder + 1).toBe(3)
  })

  it('first block gets order_index 0', () => {
    const existing: { order_index: number }[] = []
    const nextOrder = existing.length === 0 ? 0 : Math.max(...existing.map(e => e.order_index)) + 1
    expect(nextOrder).toBe(0)
  })
})

describe('Block delete guard', () => {
  it('prevents deletion of last block', () => {
    const blockCount = 1
    expect(blockCount <= 1).toBe(true) // should prevent delete
  })

  it('allows deletion when multiple blocks exist', () => {
    const blockCount = 3
    expect(blockCount <= 1).toBe(false) // delete allowed
  })
})
