import { describe, it, expect } from 'vitest'
import {
  buildCustomizationTree,
  applyToggles,
  tasksWithBrokenDependencies,
  diffToggles,
  type CustomizationStage,
  type CustomizationTask,
} from '@/lib/customization/tree'

const stages: CustomizationStage[] = [
  { id: 's1', name: 'Foundations', color: '#8B5E3C', order_index: 0 },
  { id: 's2', name: 'Frame', color: '#6B8F3F', order_index: 1 },
]

const tasks: CustomizationTask[] = [
  { id: 't1', stage_id: 's1', name: 'Excavation', order_index: 0, duration_days: 4 },
  { id: 't2', stage_id: 's1', name: 'Pour slab', order_index: 1, duration_days: 2 },
  { id: 't3', stage_id: 's2', name: 'Timber frame', order_index: 0, duration_days: 5 },
]

describe('buildCustomizationTree — AC-TC-1', () => {
  it('groups tasks under their stages sorted by order_index', () => {
    const tree = buildCustomizationTree(stages, tasks)
    expect(tree).toHaveLength(2)
    expect(tree[0].name).toBe('Foundations')
    expect(tree[0].tasks).toHaveLength(2)
    expect(tree[0].tasks[0].name).toBe('Excavation')
    expect(tree[0].tasks[1].name).toBe('Pour slab')
    expect(tree[1].tasks[0].name).toBe('Timber frame')
  })

  it('preserves stage.order_index ordering regardless of input order', () => {
    const reversed = [stages[1], stages[0]]
    const tree = buildCustomizationTree(reversed, tasks)
    expect(tree.map(s => s.name)).toEqual(['Foundations', 'Frame'])
  })

  it('sorts tasks within a stage by order_index', () => {
    const shuffled = [tasks[1], tasks[0], tasks[2]]
    const tree = buildCustomizationTree(stages, shuffled)
    expect(tree[0].tasks.map(t => t.name)).toEqual(['Excavation', 'Pour slab'])
  })

  it('returns empty stages array when there are no stages', () => {
    expect(buildCustomizationTree([], [])).toEqual([])
  })

  it('handles stages with no tasks', () => {
    const tree = buildCustomizationTree(stages, [])
    expect(tree[0].tasks).toEqual([])
    expect(tree[1].tasks).toEqual([])
  })
})

describe('applyToggles — AC-TC-2', () => {
  it('removes tasks whose ids are marked off', () => {
    const removed = applyToggles(tasks, new Set(['t2']))
    expect(removed.map(t => t.id)).toEqual(['t1', 't3'])
  })

  it('returns all tasks when no toggles are off', () => {
    const kept = applyToggles(tasks, new Set())
    expect(kept).toHaveLength(3)
  })

  it('can remove every task', () => {
    const removed = applyToggles(tasks, new Set(['t1', 't2', 't3']))
    expect(removed).toEqual([])
  })
})

describe('tasksWithBrokenDependencies — AC-TC-2', () => {
  // t2 depends on t1, t3 depends on t2
  const deps = [
    { task_id: 't2', depends_on_task_id: 't1' },
    { task_id: 't3', depends_on_task_id: 't2' },
  ]

  it('flags tasks whose dependency is toggled off', () => {
    const broken = tasksWithBrokenDependencies(tasks, deps, new Set(['t1']))
    expect(broken).toEqual(new Set(['t2']))
  })

  it('flags tasks whose dependency is removed (direct) — not transitive', () => {
    // Toggle off t2: t3 loses its direct dep t2, so it is flagged
    const broken = tasksWithBrokenDependencies(tasks, deps, new Set(['t2']))
    expect(broken).toEqual(new Set(['t3']))
  })

  it('returns empty set when no deps are broken', () => {
    const broken = tasksWithBrokenDependencies(tasks, deps, new Set())
    expect(broken).toEqual(new Set())
  })

  it('does not flag the toggled-off task itself', () => {
    const broken = tasksWithBrokenDependencies(tasks, deps, new Set(['t2']))
    expect(broken.has('t2')).toBe(false)
  })

  it('handles tasks with no dependency rows at all', () => {
    const broken = tasksWithBrokenDependencies(tasks, [], new Set(['t1']))
    expect(broken).toEqual(new Set())
  })
})

describe('diffToggles', () => {
  it('returns ids to delete and keep', () => {
    const diff = diffToggles(tasks, new Set(['t2']))
    expect(diff.toDelete).toEqual(['t2'])
    expect(diff.toKeep.map(t => t.id)).toEqual(['t1', 't3'])
  })

  it('empty removed set results in no deletions', () => {
    const diff = diffToggles(tasks, new Set())
    expect(diff.toDelete).toEqual([])
    expect(diff.toKeep).toHaveLength(3)
  })
})
