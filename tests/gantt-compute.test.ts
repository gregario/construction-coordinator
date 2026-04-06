import { describe, it, expect } from 'vitest'
import {
  computeDateRange,
  computeTaskBars,
  computeDependencyArrows,
  daysBetween,
  getZoomConfig,
  computeTodayOffset,
  type GanttTask,
  type GanttStage,
  type TaskBar,
  type DependencyArrow,
  type ZoomLevel,
} from '@/lib/gantt/compute'

// ---------- helpers ----------
function makeStage(overrides: Partial<GanttStage> = {}): GanttStage {
  return {
    id: 'stage-1',
    name: 'Foundations',
    color: '#8B5E3C',
    order_index: 0,
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

// ---------- daysBetween ----------
// @criterion: AC-GR-2
describe('daysBetween', () => {
  it('returns 0 for the same date', () => {
    expect(daysBetween('2026-04-01', '2026-04-01')).toBe(0)
  })

  it('returns positive days for later date', () => {
    expect(daysBetween('2026-04-01', '2026-04-05')).toBe(4)
  })

  it('returns negative days for earlier date', () => {
    expect(daysBetween('2026-04-05', '2026-04-01')).toBe(-4)
  })
})

// ---------- computeDateRange ----------
// @criterion: AC-GR-1
describe('computeDateRange — AC-GR-1', () => {
  it('computes min start and max end from tasks', () => {
    const tasks = [
      makeTask({ planned_start: '2026-04-01', planned_end: '2026-04-10' }),
      makeTask({ id: 'task-2', planned_start: '2026-04-05', planned_end: '2026-04-20' }),
    ]
    const range = computeDateRange(tasks)
    // Should include a buffer day on each side
    expect(range.startDate).toBe('2026-03-31')
    expect(range.endDate).toBe('2026-04-21')
    expect(range.totalDays).toBe(21)
  })

  it('handles a single task', () => {
    const tasks = [makeTask({ planned_start: '2026-06-01', planned_end: '2026-06-03' })]
    const range = computeDateRange(tasks)
    expect(range.startDate).toBe('2026-05-31')
    expect(range.endDate).toBe('2026-06-04')
    expect(range.totalDays).toBe(4)
  })

  it('returns a sensible default for empty tasks', () => {
    const range = computeDateRange([])
    expect(range.totalDays).toBeGreaterThan(0)
  })
})

// ---------- computeTaskBars ----------
// @criterion: AC-GR-2, AC-GR-4, AC-GR-5
describe('computeTaskBars — AC-GR-2, AC-GR-4, AC-GR-5', () => {
  const stages = [
    makeStage({ id: 'stage-1', order_index: 0 }),
    makeStage({ id: 'stage-2', name: 'Frame', color: '#6B8F3F', order_index: 1 }),
  ]

  it('positions bars by planned_start offset from range start', () => {
    const tasks = [
      makeTask({ planned_start: '2026-04-02', planned_end: '2026-04-06', duration_days: 5 }),
    ]
    const range = computeDateRange(tasks)
    const bars = computeTaskBars(tasks, stages, range)
    expect(bars).toHaveLength(1)
    // Bar should start at day offset from range.startDate
    expect(bars[0].startDay).toBeGreaterThanOrEqual(0)
    expect(bars[0].widthDays).toBe(5)
    expect(bars[0].color).toBe('#8B5E3C')
  })

  it('colors each bar by its stage color — AC-GR-2', () => {
    const tasks = [
      makeTask({ id: 'task-1', stage_id: 'stage-1' }),
      makeTask({ id: 'task-2', stage_id: 'stage-2' }),
    ]
    const range = computeDateRange(tasks)
    const bars = computeTaskBars(tasks, stages, range)
    const bar1 = bars.find(b => b.taskId === 'task-1')!
    const bar2 = bars.find(b => b.taskId === 'task-2')!
    expect(bar1.color).toBe('#8B5E3C')
    expect(bar2.color).toBe('#6B8F3F')
  })

  it('marks completed tasks — AC-GR-4', () => {
    const tasks = [
      makeTask({ status: 'complete', actual_end: '2026-04-04' }),
    ]
    const range = computeDateRange(tasks)
    const bars = computeTaskBars(tasks, stages, range)
    expect(bars[0].isComplete).toBe(true)
    expect(bars[0].isDelayed).toBe(false)
  })

  it('marks delayed tasks with delay amount — AC-GR-5', () => {
    const tasks = [
      makeTask({
        status: 'delayed',
        planned_end: '2026-04-05',
        actual_end: '2026-04-08',
      }),
    ]
    const range = computeDateRange(tasks)
    const bars = computeTaskBars(tasks, stages, range)
    expect(bars[0].isDelayed).toBe(true)
    expect(bars[0].delayDays).toBe(3)
  })

  it('does not mark on-time completed tasks as delayed', () => {
    const tasks = [
      makeTask({
        status: 'complete',
        planned_end: '2026-04-05',
        actual_end: '2026-04-04',
      }),
    ]
    const range = computeDateRange(tasks)
    const bars = computeTaskBars(tasks, stages, range)
    expect(bars[0].isDelayed).toBe(false)
    expect(bars[0].delayDays).toBe(0)
  })

  it('groups tasks by stage and assigns row indices', () => {
    const tasks = [
      makeTask({ id: 'task-1', stage_id: 'stage-1', order_index: 0 }),
      makeTask({ id: 'task-2', stage_id: 'stage-1', order_index: 1 }),
      makeTask({ id: 'task-3', stage_id: 'stage-2', order_index: 0 }),
    ]
    const range = computeDateRange(tasks)
    const bars = computeTaskBars(tasks, stages, range)
    const bar1 = bars.find(b => b.taskId === 'task-1')!
    const bar2 = bars.find(b => b.taskId === 'task-2')!
    const bar3 = bars.find(b => b.taskId === 'task-3')!
    // Tasks in stage-2 should have higher row than stage-1 tasks
    expect(bar3.row).toBeGreaterThan(bar1.row)
    expect(bar3.row).toBeGreaterThan(bar2.row)
    // Tasks within same stage ordered by order_index
    expect(bar2.row).toBeGreaterThan(bar1.row)
  })
})

// ---------- computeDependencyArrows ----------
// @criterion: AC-GR-3
describe('computeDependencyArrows — AC-GR-3', () => {
  const stages = [makeStage()]

  it('creates arrow from dependency end to dependent start', () => {
    const tasks = [
      makeTask({
        id: 'task-1',
        planned_start: '2026-04-01',
        planned_end: '2026-04-05',
        duration_days: 5,
        depends_on: [],
      }),
      makeTask({
        id: 'task-2',
        planned_start: '2026-04-06',
        planned_end: '2026-04-10',
        duration_days: 5,
        depends_on: ['task-1'],
        order_index: 1,
      }),
    ]
    const range = computeDateRange(tasks)
    const bars = computeTaskBars(tasks, stages, range)
    const arrows = computeDependencyArrows(tasks, bars)
    expect(arrows).toHaveLength(1)
    expect(arrows[0].fromTaskId).toBe('task-1')
    expect(arrows[0].toTaskId).toBe('task-2')
    // Arrow starts at end of task-1 bar
    expect(arrows[0].fromX).toBe(bars.find(b => b.taskId === 'task-1')!.startDay + bars.find(b => b.taskId === 'task-1')!.widthDays)
    // Arrow ends at start of task-2 bar
    expect(arrows[0].toX).toBe(bars.find(b => b.taskId === 'task-2')!.startDay)
  })

  it('creates multiple arrows for multiple dependencies', () => {
    const tasks = [
      makeTask({ id: 'task-1', depends_on: [] }),
      makeTask({ id: 'task-2', depends_on: [] }),
      makeTask({ id: 'task-3', depends_on: ['task-1', 'task-2'], order_index: 2 }),
    ]
    const range = computeDateRange(tasks)
    const bars = computeTaskBars(tasks, stages, range)
    const arrows = computeDependencyArrows(tasks, bars)
    expect(arrows).toHaveLength(2)
  })

  it('returns empty array for no dependencies', () => {
    const tasks = [makeTask({ depends_on: [] })]
    const range = computeDateRange(tasks)
    const bars = computeTaskBars(tasks, stages, range)
    const arrows = computeDependencyArrows(tasks, bars)
    expect(arrows).toHaveLength(0)
  })

  it('skips arrows for missing dependency tasks (graceful)', () => {
    const tasks = [
      makeTask({ id: 'task-1', depends_on: ['nonexistent-task'] }),
    ]
    const range = computeDateRange(tasks)
    const bars = computeTaskBars(tasks, stages, range)
    const arrows = computeDependencyArrows(tasks, bars)
    expect(arrows).toHaveLength(0)
  })
})

// ---------- getZoomConfig ----------
// @criterion: AC-GZ-1
describe('getZoomConfig — AC-GZ-1', () => {
  it('returns daily dayWidth for week zoom', () => {
    const config = getZoomConfig('week')
    expect(config.dayWidth).toBe(28)
    expect(config.headerMode).toBe('daily')
  })

  it('returns smaller dayWidth for month zoom (weekly grid)', () => {
    const config = getZoomConfig('month')
    expect(config.dayWidth).toBe(8)
    expect(config.headerMode).toBe('weekly')
  })

  it('returns smallest dayWidth for full zoom (monthly grid)', () => {
    const config = getZoomConfig('full')
    expect(config.dayWidth).toBe(3)
    expect(config.headerMode).toBe('monthly')
  })
})

// ---------- computeTodayOffset ----------
// @criterion: AC-GZ-4
describe('computeTodayOffset — AC-GZ-4', () => {
  it('returns pixel offset of today from range start', () => {
    const today = new Date().toISOString().slice(0, 10)
    const range = { startDate: today, endDate: today, totalDays: 1 }
    // Today is at offset 0 from startDate, center of day = 0 * dayWidth + dayWidth/2
    const offset = computeTodayOffset(range, 28)
    expect(offset).toBe(14) // 0 * 28 + 28/2
  })

  it('returns correct offset when today is several days in', () => {
    // Make range start 5 days before today
    const today = new Date()
    const fiveDaysAgo = new Date(today)
    fiveDaysAgo.setUTCDate(fiveDaysAgo.getUTCDate() - 5)
    const startDate = fiveDaysAgo.toISOString().slice(0, 10)
    const range = { startDate, endDate: today.toISOString().slice(0, 10), totalDays: 6 }
    const offset = computeTodayOffset(range, 28)
    expect(offset).toBe(5 * 28 + 14) // 5 days * 28px + half day
  })

  it('returns null when today is before range start', () => {
    const range = { startDate: '2099-01-01', endDate: '2099-02-01', totalDays: 31 }
    const offset = computeTodayOffset(range, 28)
    expect(offset).toBeNull()
  })
})
