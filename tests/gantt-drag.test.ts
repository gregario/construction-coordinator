import { describe, it, expect } from 'vitest'
import {
  dayFromPixel,
  dateFromDayOffset,
  computeResizeResult,
  computeMoveResult,
  computeMinStartDay,
  validateTaskDrop,
} from '@/lib/gantt/drag'
import type { GanttTask, DateRange } from '@/lib/gantt/compute'

// ---------- helpers ----------
function makeRange(overrides: Partial<DateRange> = {}): DateRange {
  return {
    startDate: '2026-03-31',
    endDate: '2026-04-21',
    totalDays: 21,
    ...overrides,
  }
}

function makeTask(overrides: Partial<GanttTask> = {}): GanttTask {
  return {
    id: 'task-1',
    stage_id: 'stage-1',
    name: 'Pour concrete',
    planned_start: '2026-04-01',
    planned_end: '2026-04-05',
    duration_days: 5,
    status: 'not_started',
    actual_end: null,
    order_index: 0,
    depends_on: [],
    ...overrides,
  }
}

// ---------- dayFromPixel ----------
describe('dayFromPixel', () => {
  it('converts pixel offset to day index at dayWidth=28', () => {
    expect(dayFromPixel(0, 28)).toBe(0)
    expect(dayFromPixel(27, 28)).toBe(0)
    expect(dayFromPixel(28, 28)).toBe(1)
    expect(dayFromPixel(56, 28)).toBe(2)
  })

  it('floors partial days', () => {
    expect(dayFromPixel(40, 28)).toBe(1)
    expect(dayFromPixel(55, 28)).toBe(1)
  })
})

// ---------- dateFromDayOffset ----------
describe('dateFromDayOffset', () => {
  it('converts day 0 to range start date', () => {
    const range = makeRange({ startDate: '2026-04-01' })
    expect(dateFromDayOffset(range, 0)).toBe('2026-04-01')
  })

  it('converts day offset to correct date', () => {
    const range = makeRange({ startDate: '2026-04-01' })
    expect(dateFromDayOffset(range, 5)).toBe('2026-04-06')
  })

  it('handles month boundaries', () => {
    const range = makeRange({ startDate: '2026-03-30' })
    expect(dateFromDayOffset(range, 2)).toBe('2026-04-01')
  })
})

// ---------- computeResizeResult (AC-GE-1) ----------
describe('computeResizeResult — AC-GE-1', () => {
  const range = makeRange({ startDate: '2026-03-31' })
  const dayWidth = 28

  it('computes new duration from dragging right edge rightward', () => {
    // Bar starts at day 1 (April 1), originally 5 days wide
    const bar = { startDay: 1 }
    // Drag right edge to pixel 224 = day 8 → duration = 8 - 1 + 1 = 8
    const result = computeResizeResult(bar, 224, dayWidth, range)
    expect(result.newDurationDays).toBe(8)
    expect(result.newEndDate).toBe('2026-04-08')
  })

  it('computes new duration when shrinking (drag left)', () => {
    const bar = { startDay: 1 }
    // Drag right edge to pixel 84 = day 3 → duration = 3 - 1 + 1 = 3
    const result = computeResizeResult(bar, 84, dayWidth, range)
    expect(result.newDurationDays).toBe(3)
    expect(result.newEndDate).toBe('2026-04-03')
  })

  it('clamps to minimum 1 day duration', () => {
    const bar = { startDay: 5 }
    // Drag to before the bar start → should clamp to 1 day
    const result = computeResizeResult(bar, 0, dayWidth, range)
    expect(result.newDurationDays).toBe(1)
  })
})

// ---------- computeMoveResult (AC-GE-2) ----------
describe('computeMoveResult — AC-GE-2', () => {
  const range = makeRange({ startDate: '2026-03-31' })
  const dayWidth = 28

  it('computes new dates when dragging bar rightward', () => {
    // Bar starts at day 1, duration 5
    const bar = { startDay: 1, widthDays: 5 }
    // Drag 3 days to the right (84px)
    const result = computeMoveResult(bar, 84, dayWidth, range)
    expect(result.deltaDays).toBe(3)
    expect(result.newStartDate).toBe('2026-04-04')
    expect(result.newEndDate).toBe('2026-04-08')
  })

  it('computes new dates when dragging bar leftward', () => {
    const bar = { startDay: 5, widthDays: 3 }
    // Drag 2 days to the left (-56px)
    const result = computeMoveResult(bar, -56, dayWidth, range)
    expect(result.deltaDays).toBe(-2)
    expect(result.newStartDate).toBe('2026-04-03')
    expect(result.newEndDate).toBe('2026-04-05')
  })

  it('preserves duration (widthDays unchanged)', () => {
    const bar = { startDay: 1, widthDays: 5 }
    const result = computeMoveResult(bar, 56, dayWidth, range)
    // end - start + 1 should equal widthDays
    const daysInResult =
      (new Date(result.newEndDate + 'T00:00:00Z').getTime() -
        new Date(result.newStartDate + 'T00:00:00Z').getTime()) /
        86400000 +
      1
    expect(daysInResult).toBe(5)
  })

  it('returns deltaDays=0 for sub-day pixel moves', () => {
    const bar = { startDay: 1, widthDays: 5 }
    const result = computeMoveResult(bar, 10, dayWidth, range)
    expect(result.deltaDays).toBe(0)
  })
})

// ---------- computeMinStartDay (AC-GE-4) ----------
describe('computeMinStartDay — AC-GE-4', () => {
  const range = makeRange({ startDate: '2026-03-31' })

  it('returns 0 for tasks with no dependencies', () => {
    const tasks = [makeTask({ id: 'task-1', depends_on: [] })]
    expect(computeMinStartDay('task-1', tasks, range)).toBe(0)
  })

  it('returns day after dependency end for single dep', () => {
    const tasks = [
      makeTask({
        id: 'dep-1',
        planned_start: '2026-04-01',
        planned_end: '2026-04-05',
        depends_on: [],
      }),
      makeTask({
        id: 'task-1',
        planned_start: '2026-04-06',
        depends_on: ['dep-1'],
      }),
    ]
    // dep-1 ends at day offset daysBetween('2026-03-31', '2026-04-05') = 5
    // So min start = 5 + 1 = 6
    expect(computeMinStartDay('task-1', tasks, range)).toBe(6)
  })

  it('returns day after latest dependency for multiple deps', () => {
    const tasks = [
      makeTask({
        id: 'dep-1',
        planned_end: '2026-04-05',
        depends_on: [],
      }),
      makeTask({
        id: 'dep-2',
        planned_end: '2026-04-10',
        depends_on: [],
        order_index: 1,
      }),
      makeTask({
        id: 'task-1',
        planned_start: '2026-04-11',
        depends_on: ['dep-1', 'dep-2'],
        order_index: 2,
      }),
    ]
    // dep-2 ends at day 10 (offset from Mar 31), so min start = 11
    expect(computeMinStartDay('task-1', tasks, range)).toBe(11)
  })

  it('returns 0 for unknown task', () => {
    expect(computeMinStartDay('nonexistent', [], range)).toBe(0)
  })
})

// ---------- validateTaskDrop (AC-GE-4) ----------
describe('validateTaskDrop — AC-GE-4', () => {
  const range = makeRange({ startDate: '2026-03-31' })

  it('returns valid for no-dep tasks at any position', () => {
    const tasks = [makeTask({ id: 'task-1', depends_on: [] })]
    const result = validateTaskDrop('task-1', 0, tasks, range)
    expect(result.valid).toBe(true)
  })

  it('returns valid when drop is after dependency end', () => {
    const tasks = [
      makeTask({ id: 'dep-1', planned_end: '2026-04-05', depends_on: [] }),
      makeTask({
        id: 'task-1',
        depends_on: ['dep-1'],
        order_index: 1,
      }),
    ]
    // Min start is day 6. Drop at day 6 → valid
    const result = validateTaskDrop('task-1', 6, tasks, range)
    expect(result.valid).toBe(true)
  })

  it('returns invalid when drop is before dependency end', () => {
    const tasks = [
      makeTask({ id: 'dep-1', planned_end: '2026-04-05', depends_on: [] }),
      makeTask({
        id: 'task-1',
        depends_on: ['dep-1'],
        order_index: 1,
      }),
    ]
    // Min start is day 6. Drop at day 3 → invalid
    const result = validateTaskDrop('task-1', 3, tasks, range)
    expect(result.valid).toBe(false)
    if (!result.valid) {
      expect(result.reason).toBe('Cannot start before dependency completes')
    }
  })

  it('returns invalid when drop is ON dependency end (same day)', () => {
    const tasks = [
      makeTask({ id: 'dep-1', planned_end: '2026-04-05', depends_on: [] }),
      makeTask({
        id: 'task-1',
        depends_on: ['dep-1'],
        order_index: 1,
      }),
    ]
    // dep-1 ends at day 5. Min start = 6. Drop at day 5 → invalid (overlaps)
    const result = validateTaskDrop('task-1', 5, tasks, range)
    expect(result.valid).toBe(false)
  })
})
