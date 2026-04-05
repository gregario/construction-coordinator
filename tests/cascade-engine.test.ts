import { describe, it, expect } from 'vitest'
import {
  computeCascadeDelta,
  shiftTaskDates,
  buildCascadeSummary,
  type TaskMovement,
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
