import { describe, it, expect } from 'vitest'
import type { SchedulingConfig, CategorySequencing } from '@/app/actions/sequencing'
import { CATEGORY_ORDER } from '@/app/actions/construction-methods'

describe('SchedulingConfig structure', () => {
  it('can represent all-sequential config', () => {
    const config: SchedulingConfig = {}
    const blockOrder = ['block-1', 'block-2', 'block-3']

    for (const cat of CATEGORY_ORDER) {
      config[cat] = { mode: 'sequential', block_order: [...blockOrder] }
    }

    expect(Object.keys(config)).toHaveLength(9)
    expect(config.foundation?.mode).toBe('sequential')
    expect(config.foundation?.block_order).toEqual(blockOrder)
  })

  it('can represent mixed parallel/sequential config', () => {
    const config: SchedulingConfig = {
      foundation: { mode: 'parallel' },
      structure: { mode: 'sequential', block_order: ['garage', 'block-a', 'block-c'] },
    }

    expect(config.foundation?.mode).toBe('parallel')
    expect(config.foundation?.block_order).toBeUndefined()
    expect(config.structure?.mode).toBe('sequential')
    expect(config.structure?.block_order).toEqual(['garage', 'block-a', 'block-c'])
  })

  it('parallel mode means no block ordering constraint', () => {
    const cat: CategorySequencing = { mode: 'parallel' }
    expect(cat.mode).toBe('parallel')
    // block_order is irrelevant for parallel — delays in one block don't affect others
  })

  it('sequential mode requires block_order for cascade', () => {
    const cat: CategorySequencing = {
      mode: 'sequential',
      block_order: ['block-a', 'block-b'],
    }
    expect(cat.block_order).toBeDefined()
    expect(cat.block_order!.length).toBe(2)
    expect(cat.block_order![0]).toBe('block-a') // block-a finishes before block-b starts
  })
})

describe('Block order reordering', () => {
  it('can move a block up in the order', () => {
    const order = ['block-a', 'block-b', 'block-c']
    const fromIndex = 2
    const toIndex = 1
    const newOrder = [...order]
    const [moved] = newOrder.splice(fromIndex, 1)
    newOrder.splice(toIndex, 0, moved)
    expect(newOrder).toEqual(['block-a', 'block-c', 'block-b'])
  })

  it('can move a block down in the order', () => {
    const order = ['block-a', 'block-b', 'block-c']
    const fromIndex = 0
    const toIndex = 1
    const newOrder = [...order]
    const [moved] = newOrder.splice(fromIndex, 1)
    newOrder.splice(toIndex, 0, moved)
    expect(newOrder).toEqual(['block-b', 'block-a', 'block-c'])
  })
})
