import { describe, it, expect } from 'vitest'
import {
  validateTaskInput,
  computePlannedDates,
  durationFromDates,
  removeFromDependencies,
  addDays,
  diffDays,
  maxDate,
} from '@/lib/tasks/operations'

// @criterion: AC-TM-1
// AC-TM-1: Add Task within a stage — name required (max 120 chars), duration_days required (positive integer)
describe('validateTaskInput — AC-TM-1', () => {
  it('accepts a valid form', () => {
    const r = validateTaskInput({ name: 'Pour concrete', duration_days: 2 })
    expect(r.ok).toBe(true)
    expect(r.errors).toEqual({})
  })

  it('rejects empty name', () => {
    const r = validateTaskInput({ name: '   ', duration_days: 2 })
    expect(r.ok).toBe(false)
    expect(r.errors.name).toBeTruthy()
  })

  it('rejects name longer than 120 chars', () => {
    const r = validateTaskInput({ name: 'x'.repeat(121), duration_days: 1 })
    expect(r.ok).toBe(false)
    expect(r.errors.name).toBeTruthy()
  })

  it('rejects zero duration', () => {
    const r = validateTaskInput({ name: 'A', duration_days: 0 })
    expect(r.ok).toBe(false)
    expect(r.errors.duration_days).toBeTruthy()
  })

  it('rejects negative duration', () => {
    const r = validateTaskInput({ name: 'A', duration_days: -3 })
    expect(r.ok).toBe(false)
    expect(r.errors.duration_days).toBeTruthy()
  })

  it('rejects fractional duration', () => {
    const r = validateTaskInput({ name: 'A', duration_days: 1.5 })
    expect(r.ok).toBe(false)
    expect(r.errors.duration_days).toBeTruthy()
  })

  it('accepts string duration that parses to an int', () => {
    const r = validateTaskInput({ name: 'A', duration_days: '3' })
    expect(r.ok).toBe(true)
  })

  it('rejects duplicate dependency ids', () => {
    const r = validateTaskInput({
      name: 'A',
      duration_days: 1,
      depends_on: ['t1', 't1'],
    })
    expect(r.ok).toBe(false)
    expect(r.errors.depends_on).toBeTruthy()
  })

  it('accepts a unique depends_on list', () => {
    const r = validateTaskInput({
      name: 'A',
      duration_days: 1,
      depends_on: ['t1', 't2', 't3'],
    })
    expect(r.ok).toBe(true)
  })
})

// @criterion: AC-TM-2, AC-TM-3, AC-TM-4
// AC-TM-2: planned_end = planned_start + (duration_days − 1) (inclusive day semantics)
// AC-TM-3: No dependencies → planned_start = project.start_date
// AC-TM-4: Dependencies → planned_start = max(dep.planned_end) + 1 day
describe('computePlannedDates — AC-TM-2/3/4', () => {
  it('AC-TM-3: no dependencies → start = project.start_date', () => {
    const r = computePlannedDates({
      durationDays: 1,
      projectStartDate: '2026-06-01',
      dependencies: [],
    })
    expect(r.planned_start).toBe('2026-06-01')
    expect(r.planned_end).toBe('2026-06-01')
  })

  it('AC-TM-2: planned_end = start + (duration - 1) (inclusive days)', () => {
    const r = computePlannedDates({
      durationDays: 2,
      projectStartDate: '2026-06-01',
      dependencies: [],
    })
    // 2-day task starting 2026-06-01 ends 2026-06-02
    expect(r.planned_start).toBe('2026-06-01')
    expect(r.planned_end).toBe('2026-06-02')
  })

  it('AC-TM-2: 5-day task from 2026-06-01 ends 2026-06-05', () => {
    const r = computePlannedDates({
      durationDays: 5,
      projectStartDate: '2026-06-01',
      dependencies: [],
    })
    expect(r.planned_end).toBe('2026-06-05')
  })

  it('AC-TM-4: depends_on = single task → start = dep.planned_end + 1 day', () => {
    const r = computePlannedDates({
      durationDays: 3,
      projectStartDate: '2026-06-01',
      dependencies: [
        { id: 'A', planned_start: '2026-06-01', planned_end: '2026-06-03' },
      ],
    })
    expect(r.planned_start).toBe('2026-06-04')
    expect(r.planned_end).toBe('2026-06-06')
  })

  it('AC-TM-4: depends_on = [A, B] → start = max(A.end, B.end) + 1 day', () => {
    const r = computePlannedDates({
      durationDays: 1,
      projectStartDate: '2026-06-01',
      dependencies: [
        { id: 'A', planned_start: '2026-06-01', planned_end: '2026-06-03' },
        { id: 'B', planned_start: '2026-06-02', planned_end: '2026-06-07' },
      ],
    })
    expect(r.planned_start).toBe('2026-06-08')
    expect(r.planned_end).toBe('2026-06-08')
  })

  it('crosses a month boundary correctly', () => {
    const r = computePlannedDates({
      durationDays: 5,
      projectStartDate: '2026-06-01',
      dependencies: [
        { id: 'A', planned_start: '2026-06-25', planned_end: '2026-06-30' },
      ],
    })
    expect(r.planned_start).toBe('2026-07-01')
    expect(r.planned_end).toBe('2026-07-05')
  })

  it('floors fractional durations and honours a 1-day floor', () => {
    const r = computePlannedDates({
      durationDays: 0.5,
      projectStartDate: '2026-06-01',
      dependencies: [],
    })
    expect(r.planned_end).toBe('2026-06-01')
  })
})

describe('durationFromDates', () => {
  it('single-day task has duration 1', () => {
    expect(durationFromDates('2026-06-01', '2026-06-01')).toBe(1)
  })
  it('two-day task has duration 2', () => {
    expect(durationFromDates('2026-06-01', '2026-06-02')).toBe(2)
  })
  it('crosses month boundary', () => {
    expect(durationFromDates('2026-06-28', '2026-07-03')).toBe(6)
  })
})

// @criterion: AC-TM-5
// AC-TM-5: Editing duration_days → planned_end recalculates; cascade_task_dates() propagates to downstream tasks
// Pure part: new planned_end = planned_start + (new_duration − 1). Cascade is SQL-side (cascade_task_dates RPC).
describe('AC-TM-5: duration edit recalculates planned_end', () => {
  it('editing from 5d to 3d shortens planned_end by 2 days', () => {
    // Current: start=2026-06-01, duration=5 → end=2026-06-05
    // Edited:  start=2026-06-01, duration=3 → end=2026-06-03
    const updated = computePlannedDates({
      durationDays: 3,
      projectStartDate: '2026-06-01',
      dependencies: [],
    })
    expect(updated.planned_start).toBe('2026-06-01')
    expect(updated.planned_end).toBe('2026-06-03')
  })

  it('editing from 2d to 10d extends planned_end by 8 days', () => {
    const updated = computePlannedDates({
      durationDays: 10,
      projectStartDate: '2026-06-01',
      dependencies: [],
    })
    expect(updated.planned_start).toBe('2026-06-01')
    expect(updated.planned_end).toBe('2026-06-10')
  })

  it('a 1-day task has planned_start === planned_end after edit', () => {
    const updated = computePlannedDates({
      durationDays: 1,
      projectStartDate: '2026-07-15',
      dependencies: [],
    })
    expect(updated.planned_start).toBe('2026-07-15')
    expect(updated.planned_end).toBe('2026-07-15')
  })
})

// @criterion: AC-TM-6
// AC-TM-6: Deleting a task removes its rows from task_dependencies (ON DELETE CASCADE) and updates client state
describe('removeFromDependencies — AC-TM-6', () => {
  it('removes rows where depends_on_task_id matches the deleted task', () => {
    const deps = [
      { task_id: 'B', depends_on_task_id: 'A' },
      { task_id: 'C', depends_on_task_id: 'A' },
      { task_id: 'C', depends_on_task_id: 'B' },
    ]
    const out = removeFromDependencies(deps, 'A')
    expect(out).toEqual([{ task_id: 'C', depends_on_task_id: 'B' }])
  })

  it('returns an empty array if nothing depends on the deleted task', () => {
    const deps = [{ task_id: 'B', depends_on_task_id: 'C' }]
    const out = removeFromDependencies(deps, 'A')
    expect(out).toEqual(deps)
  })
})

describe('date helpers', () => {
  it('addDays handles positive deltas across months', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01')
    expect(addDays('2026-02-28', 1)).toBe('2026-03-01')
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
  })
  it('addDays handles negative deltas', () => {
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
  })
  it('diffDays counts inclusive days between', () => {
    expect(diffDays('2026-06-01', '2026-06-01')).toBe(0)
    expect(diffDays('2026-06-01', '2026-06-02')).toBe(1)
    expect(diffDays('2026-06-01', '2026-07-01')).toBe(30)
  })
  it('maxDate picks the latest ISO string', () => {
    expect(maxDate(['2026-06-05', '2026-06-01', '2026-07-10'])).toBe('2026-07-10')
  })
  it('maxDate throws on empty input', () => {
    expect(() => maxDate([])).toThrow()
  })
})
