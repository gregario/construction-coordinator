import { describe, it, expect } from 'vitest'
import {
  computeCascadeDelta,
  shiftTaskDates,
  buildCascadeSummary,
  computeMaterialMovements,
  type TaskMovement,
  type MaterialCascadeInput,
} from '@/lib/cascade/engine'
import type { CascadeResult } from '@/types/database'

// @criterion: AC-CE-1
// AC-CE-1: trigger task T moves planned_end from 2026-06-10 to 2026-06-15 (+5d);
// D1 depends on T → D1.planned_start shifts by 5 days; D2 depends on D1 → shifts by the same 5.
describe('computeCascadeDelta — AC-CE-1', () => {
  it('returns day-delta between old and new planned_end', () => {
    expect(computeCascadeDelta('2026-06-10', '2026-06-15')).toBe(5)
  })
  it('returns a negative delta when the task shrinks', () => {
    expect(computeCascadeDelta('2026-06-15', '2026-06-10')).toBe(-5)
  })
  it('returns 0 for a no-op date change', () => {
    expect(computeCascadeDelta('2026-06-10', '2026-06-10')).toBe(0)
  })
  it('handles month boundaries', () => {
    expect(computeCascadeDelta('2026-06-28', '2026-07-03')).toBe(5)
  })
})

describe('shiftTaskDates — AC-CE-1 delta propagation', () => {
  it('shifts a downstream task by the delta (+5 days)', () => {
    const shifted = shiftTaskDates(
      { planned_start: '2026-06-11', planned_end: '2026-06-12' },
      5
    )
    expect(shifted).toEqual({ planned_start: '2026-06-16', planned_end: '2026-06-17' })
  })
  it('shifts by a negative delta (shrink)', () => {
    const shifted = shiftTaskDates(
      { planned_start: '2026-06-20', planned_end: '2026-06-22' },
      -3
    )
    expect(shifted).toEqual({ planned_start: '2026-06-17', planned_end: '2026-06-19' })
  })
  it('shifts by 0 returns identical dates', () => {
    const shifted = shiftTaskDates(
      { planned_start: '2026-06-20', planned_end: '2026-06-22' },
      0
    )
    expect(shifted).toEqual({ planned_start: '2026-06-20', planned_end: '2026-06-22' })
  })
})

// @criterion: AC-CE-3
// AC-CE-3: response includes a summary listing ALL tasks that moved, with old and new dates.
// "All tasks" means the trigger task itself + every downstream task touched by the cascade.
describe('buildCascadeSummary — AC-CE-3 & AC-CE-4', () => {
  const trigger = {
    task_id: 't-trigger',
    task_name: 'Pour Foundation',
    old_planned_start: '2026-06-01',
    old_planned_end: '2026-06-10',
    new_planned_start: '2026-06-01',
    new_planned_end: '2026-06-15',
  }

  it('includes the trigger task as the first row of the summary', () => {
    const downstream: CascadeResult[] = []
    const summary = buildCascadeSummary(trigger, downstream)
    expect(summary.movements).toHaveLength(1)
    expect(summary.movements[0].task_id).toBe('t-trigger')
    expect(summary.movements[0].is_trigger).toBe(true)
  })

  // AC-CE-4: no downstream deps → only the trigger is in the summary, no cascade fanout.
  it('AC-CE-4: returns only the trigger when there are no downstream tasks', () => {
    const summary = buildCascadeSummary(trigger, [])
    expect(summary.movements).toHaveLength(1)
    expect(summary.downstream_count).toBe(0)
    expect(summary.delta_days).toBe(5)
  })

  it('AC-CE-3: includes trigger + every downstream task with old and new dates', () => {
    const downstream: CascadeResult[] = [
      {
        task_id: 'd1',
        task_name: 'Frame',
        old_planned_start: '2026-06-11',
        old_planned_end: '2026-06-13',
        new_planned_start: '2026-06-16',
        new_planned_end: '2026-06-18',
      },
      {
        task_id: 'd2',
        task_name: 'Roof',
        old_planned_start: '2026-06-14',
        old_planned_end: '2026-06-16',
        new_planned_start: '2026-06-19',
        new_planned_end: '2026-06-21',
      },
    ]
    const summary = buildCascadeSummary(trigger, downstream)
    expect(summary.movements).toHaveLength(3)
    expect(summary.downstream_count).toBe(2)
    expect(summary.delta_days).toBe(5)
    expect(summary.movements[0].is_trigger).toBe(true)
    expect(summary.movements[1].is_trigger).toBe(false)
    expect(summary.movements[1].task_id).toBe('d1')
    expect(summary.movements[2].task_id).toBe('d2')
  })

  it('every downstream row shows the same delta as the trigger', () => {
    const downstream: CascadeResult[] = [
      {
        task_id: 'd1',
        task_name: 'Frame',
        old_planned_start: '2026-06-11',
        old_planned_end: '2026-06-13',
        new_planned_start: '2026-06-16',
        new_planned_end: '2026-06-18',
      },
    ]
    const summary = buildCascadeSummary(trigger, downstream)
    for (const m of summary.movements) {
      expect(m.delta_days).toBe(5)
    }
  })

  it('AC-CE-1: end-of-chain task (D2 depending on D1) shifts by the same delta', () => {
    // T → D1 → D2. T shifts +5. Every downstream row carries the same delta.
    const downstream: CascadeResult[] = [
      {
        task_id: 'D1',
        task_name: 'D1',
        old_planned_start: '2026-06-11',
        old_planned_end: '2026-06-12',
        new_planned_start: '2026-06-16',
        new_planned_end: '2026-06-17',
      },
      {
        task_id: 'D2',
        task_name: 'D2',
        old_planned_start: '2026-06-13',
        old_planned_end: '2026-06-15',
        new_planned_start: '2026-06-18',
        new_planned_end: '2026-06-20',
      },
    ]
    const summary = buildCascadeSummary(trigger, downstream)
    const d2 = summary.movements.find(m => m.task_id === 'D2')!
    expect(d2.delta_days).toBe(5)
    expect(d2.new_planned_start).toBe('2026-06-18')
  })
})

// @criterion: AC-CMS-1
// AC-CMS-1: a cascade that moves a task's planned_start must sync every
// material attached to that task — new order_by_date = new planned_start
// − lead_time_days. Mirrors the SQL cascade_task_dates() UPDATE materials
// branch. Client-side mirror so the post-cascade overlay can enumerate
// exactly which materials moved.
describe('computeMaterialMovements — AC-CMS-1', () => {
  const materials: MaterialCascadeInput[] = [
    {
      material_id: 'm1',
      material_name: 'Timber frame kit',
      task_id: 't-frame',
      task_name: 'Frame',
      lead_time_days: 70,
      old_order_by_date: '2026-04-02',
    },
    {
      material_id: 'm2',
      material_name: 'Bangor Blue slate',
      task_id: 't-roof',
      task_name: 'Roof',
      lead_time_days: 21,
      old_order_by_date: '2026-06-01',
    },
  ]

  it('recomputes order_by_date as planned_start − lead_time_days', () => {
    // Frame was planned_start 2026-06-11 → now 2026-06-16 (+5 days shift)
    const moves = computeMaterialMovements(materials, {
      't-frame': '2026-06-16',
      't-roof': '2026-06-22',
    })
    const frame = moves.find(m => m.material_id === 'm1')!
    expect(frame.new_order_by_date).toBe('2026-04-07')
    expect(frame.old_order_by_date).toBe('2026-04-02')
    expect(frame.delta_days).toBe(5)
  })

  it('surfaces every affected material with name, task name, lead time', () => {
    const moves = computeMaterialMovements(materials, {
      't-frame': '2026-06-16',
      't-roof': '2026-06-22',
    })
    expect(moves).toHaveLength(2)
    const roof = moves.find(m => m.material_id === 'm2')!
    expect(roof.material_name).toBe('Bangor Blue slate')
    expect(roof.task_name).toBe('Roof')
    expect(roof.lead_time_days).toBe(21)
    // 2026-06-22 − 21 = 2026-06-01 (no net change: trigger & roof both
    // happen to yield the same date given inputs)
    expect(roof.new_order_by_date).toBe('2026-06-01')
    expect(roof.delta_days).toBe(0)
  })

  it('skips materials whose parent task was not touched by the cascade', () => {
    const moves = computeMaterialMovements(materials, {
      't-frame': '2026-06-16',
      // t-roof intentionally absent — its task was not in the cascade
    })
    expect(moves).toHaveLength(1)
    expect(moves[0].material_id).toBe('m1')
  })

  it('returns an empty list when no tasks were touched', () => {
    expect(computeMaterialMovements(materials, {})).toEqual([])
    expect(computeMaterialMovements([], { 't-frame': '2026-06-16' })).toEqual([])
  })

  it('handles a material whose prior order_by_date was null', () => {
    const input: MaterialCascadeInput[] = [
      {
        material_id: 'm3',
        material_name: 'Fresh material',
        task_id: 't-frame',
        task_name: 'Frame',
        lead_time_days: 10,
        old_order_by_date: null,
      },
    ]
    const moves = computeMaterialMovements(input, { 't-frame': '2026-06-16' })
    expect(moves).toHaveLength(1)
    expect(moves[0].new_order_by_date).toBe('2026-06-06')
    expect(moves[0].delta_days).toBeNull()
  })

  it('reports a negative delta when the cascade pulls a material in', () => {
    const input: MaterialCascadeInput[] = [
      {
        material_id: 'm4',
        material_name: 'Concrete',
        task_id: 't-slab',
        task_name: 'Slab',
        lead_time_days: 3,
        old_order_by_date: '2026-06-10',
      },
    ]
    // Task pulled back by 4 days → 2026-06-13 → new order_by = 2026-06-10 ... wait need earlier
    const moves = computeMaterialMovements(input, { 't-slab': '2026-06-09' })
    // new = 2026-06-09 − 3 = 2026-06-06, delta = -4
    expect(moves[0].new_order_by_date).toBe('2026-06-06')
    expect(moves[0].delta_days).toBe(-4)
  })

  it('zero lead_time_days → order_by_date equals planned_start', () => {
    const input: MaterialCascadeInput[] = [
      {
        material_id: 'm5',
        material_name: 'On-demand',
        task_id: 't-x',
        task_name: 'X',
        lead_time_days: 0,
        old_order_by_date: '2026-06-10',
      },
    ]
    const moves = computeMaterialMovements(input, { 't-x': '2026-06-15' })
    expect(moves[0].new_order_by_date).toBe('2026-06-15')
    expect(moves[0].delta_days).toBe(5)
  })
})

describe('TaskMovement shape — AC-CE-3', () => {
  it('row carries old AND new dates + delta + trigger flag', () => {
    const row: TaskMovement = {
      task_id: 't',
      task_name: 'X',
      old_planned_start: '2026-06-01',
      old_planned_end: '2026-06-05',
      new_planned_start: '2026-06-03',
      new_planned_end: '2026-06-07',
      delta_days: 2,
      is_trigger: false,
    }
    expect(row.delta_days).toBe(2)
    expect(row.is_trigger).toBe(false)
  })
})
