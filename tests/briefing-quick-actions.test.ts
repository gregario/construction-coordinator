import { describe, it, expect } from 'vitest'
import {
  computeToggleResult,
  selectTodayTasks,
  type BriefingTask,
} from '@/lib/briefing/operations'

// ---------- Helpers ----------

function makeTask(overrides: Partial<BriefingTask> = {}): BriefingTask {
  return {
    id: 'task-1',
    name: 'Excavation',
    planned_start: '2026-06-01',
    planned_end: '2026-06-07',
    status: 'not_started',
    stage_name: 'Foundation',
    stage_color: '#8B5E3C',
    ...overrides,
  }
}

const TODAY = '2026-06-05'

// ---------- computeToggleResult ----------

describe('computeToggleResult', () => {
  it('marks a not_started task as complete with actual_end = today (AC-QA-1)', () => {
    const result = computeToggleResult('not_started', TODAY)
    expect(result.newStatus).toBe('complete')
    expect(result.actualEnd).toBe(TODAY)
  })

  it('marks an in_progress task as complete with actual_end = today (AC-QA-1)', () => {
    const result = computeToggleResult('in_progress', TODAY)
    expect(result.newStatus).toBe('complete')
    expect(result.actualEnd).toBe(TODAY)
  })

  it('reverts a complete task to in_progress with actual_end cleared (AC-QA-2)', () => {
    const result = computeToggleResult('complete', TODAY)
    expect(result.newStatus).toBe('in_progress')
    expect(result.actualEnd).toBeNull()
  })

  it('marks a delayed task as complete with actual_end = today', () => {
    const result = computeToggleResult('delayed', TODAY)
    expect(result.newStatus).toBe('complete')
    expect(result.actualEnd).toBe(TODAY)
  })
})

// ---------- selectTodayTasks with completed tasks (AC-QA-2 support) ----------

describe('selectTodayTasks (quick-actions)', () => {
  it('includes complete tasks within date range for undo support (AC-QA-2)', () => {
    const tasks = [
      makeTask({ id: '1', status: 'complete' }),
      makeTask({ id: '2', status: 'in_progress' }),
    ]
    const result = selectTodayTasks(tasks, TODAY)
    expect(result).toHaveLength(2)
    // Incomplete before complete
    expect(result[0].id).toBe('2')
    expect(result[1].id).toBe('1')
  })

  it('a toggled-complete task remains in the briefing list', () => {
    const tasks = [
      makeTask({ id: '1', status: 'not_started' }),
    ]
    // Before toggle: visible
    expect(selectTodayTasks(tasks, TODAY)).toHaveLength(1)
    // After toggle: still visible (with new status)
    const toggled = [makeTask({ id: '1', status: 'complete' })]
    expect(selectTodayTasks(toggled, TODAY)).toHaveLength(1)
  })
})
