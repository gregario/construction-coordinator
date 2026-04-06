import { describe, it, expect } from 'vitest'
import {
  selectTodayTasks,
  nextTaskStartDate,
  formatShiftAlert,
  shiftAlertHref,
  type BriefingTask,
  type BriefingShiftAlert,
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

// @criterion: AC-DB-2
// AC-DB-2: selectTodayTasks filters tasks where planned_start<=today<=planned_end AND status IN (not_started,in_progress,complete)
describe('selectTodayTasks', () => {
  it('returns tasks where today is within planned_start..planned_end and status is not_started or in_progress', () => {
    const tasks = [
      makeTask({ id: '1', planned_start: '2026-06-01', planned_end: '2026-06-07', status: 'not_started' }),
      makeTask({ id: '2', planned_start: '2026-06-05', planned_end: '2026-06-05', status: 'in_progress' }),
    ]
    const result = selectTodayTasks(tasks, TODAY)
    expect(result).toHaveLength(2)
    expect(result[0].id).toBe('1')
    expect(result[1].id).toBe('2')
  })

  it('excludes delayed tasks but includes complete tasks (AC-QA-2 undo support)', () => {
    const tasks = [
      makeTask({ id: '1', status: 'complete' }),
      makeTask({ id: '2', status: 'delayed' }),
      makeTask({ id: '3', status: 'in_progress' }),
    ]
    const result = selectTodayTasks(tasks, TODAY)
    expect(result).toHaveLength(2)
    // Incomplete before complete
    expect(result[0].id).toBe('3')
    expect(result[1].id).toBe('1')
  })

  it('excludes tasks that ended before today', () => {
    const tasks = [
      makeTask({ planned_start: '2026-05-01', planned_end: '2026-06-04' }),
    ]
    expect(selectTodayTasks(tasks, TODAY)).toHaveLength(0)
  })

  it('excludes tasks that start after today', () => {
    const tasks = [
      makeTask({ planned_start: '2026-06-06', planned_end: '2026-06-10' }),
    ]
    expect(selectTodayTasks(tasks, TODAY)).toHaveLength(0)
  })

  it('includes tasks where today equals planned_start (boundary)', () => {
    const tasks = [
      makeTask({ planned_start: '2026-06-05', planned_end: '2026-06-10' }),
    ]
    expect(selectTodayTasks(tasks, TODAY)).toHaveLength(1)
  })

  it('includes tasks where today equals planned_end (boundary)', () => {
    const tasks = [
      makeTask({ planned_start: '2026-06-01', planned_end: '2026-06-05' }),
    ]
    expect(selectTodayTasks(tasks, TODAY)).toHaveLength(1)
  })

  it('returns empty array when no tasks match', () => {
    expect(selectTodayTasks([], TODAY)).toEqual([])
  })

  it('sorts incomplete before complete, then planned_start ASC, then name ASC', () => {
    const tasks = [
      makeTask({ id: '1', name: 'Zulu', planned_start: '2026-06-03', planned_end: '2026-06-07' }),
      makeTask({ id: '2', name: 'Alpha', planned_start: '2026-06-03', planned_end: '2026-06-07' }),
      makeTask({ id: '3', name: 'Mike', planned_start: '2026-06-01', planned_end: '2026-06-07' }),
      makeTask({ id: '4', name: 'Done', planned_start: '2026-06-01', planned_end: '2026-06-07', status: 'complete' }),
    ]
    const result = selectTodayTasks(tasks, TODAY)
    // Incomplete first (sorted by start then name), then complete
    expect(result.map(t => t.id)).toEqual(['3', '2', '1', '4'])
  })
})

// @criterion: AC-DB-3
// AC-DB-3: When no tasks match today, empty state shows 'No tasks scheduled today — next task starts [date]'
describe('nextTaskStartDate', () => {
  it('returns the earliest future planned_start', () => {
    const tasks = [
      makeTask({ planned_start: '2026-06-10', status: 'not_started' }),
      makeTask({ planned_start: '2026-06-07', status: 'not_started' }),
      makeTask({ planned_start: '2026-06-20', status: 'in_progress' }),
    ]
    expect(nextTaskStartDate(tasks, TODAY)).toBe('2026-06-07')
  })

  it('returns null when no future tasks exist', () => {
    const tasks = [
      makeTask({ planned_start: '2026-06-01', status: 'not_started' }),
    ]
    expect(nextTaskStartDate(tasks, TODAY)).toBeNull()
  })

  it('excludes complete and delayed tasks', () => {
    const tasks = [
      makeTask({ planned_start: '2026-06-10', status: 'complete' }),
      makeTask({ planned_start: '2026-06-10', status: 'delayed' }),
    ]
    expect(nextTaskStartDate(tasks, TODAY)).toBeNull()
  })

  it('returns null for empty array', () => {
    expect(nextTaskStartDate([], TODAY)).toBeNull()
  })

  it('excludes tasks starting today (not strictly future)', () => {
    const tasks = [
      makeTask({ planned_start: TODAY, status: 'not_started' }),
    ]
    expect(nextTaskStartDate(tasks, TODAY)).toBeNull()
  })
})

// @criterion: AC-SA-2
// AC-SA-2: formatShiftAlert formats "[name] moved from [old] to [new]"; shiftAlertHref routes task→/tasks/:id, material→/materials
describe('formatShiftAlert', () => {
  it('formats a date_moved alert', () => {
    const alert: BriefingShiftAlert = {
      id: 'a1',
      entity_type: 'task',
      entity_id: 't1',
      entity_name: 'Excavation',
      change_type: 'date_moved',
      old_value: '2026-06-01',
      new_value: '2026-06-08',
      created_at: '2026-06-05T10:00:00Z',
    }
    expect(formatShiftAlert(alert)).toBe('Excavation moved from 2026-06-01 to 2026-06-08')
  })

  it('handles null old_value in date_moved', () => {
    const alert: BriefingShiftAlert = {
      id: 'a2',
      entity_type: 'material',
      entity_id: 'm1',
      entity_name: 'Concrete',
      change_type: 'date_moved',
      old_value: null,
      new_value: '2026-06-15',
      created_at: '2026-06-05T10:00:00Z',
    }
    expect(formatShiftAlert(alert)).toBe('Concrete moved from (unset) to 2026-06-15')
  })

  it('formats a status_changed alert', () => {
    const alert: BriefingShiftAlert = {
      id: 'a3',
      entity_type: 'task',
      entity_id: 't2',
      entity_name: 'Roofing',
      change_type: 'status_changed',
      old_value: 'not_started',
      new_value: 'in_progress',
      created_at: '2026-06-05T10:00:00Z',
    }
    expect(formatShiftAlert(alert)).toBe('Roofing status changed to in_progress')
  })
})

// ---------- shiftAlertHref ----------

describe('shiftAlertHref', () => {
  it('returns /tasks/:id for task alerts', () => {
    const alert: BriefingShiftAlert = {
      id: 'a1',
      entity_type: 'task',
      entity_id: 'task-abc',
      entity_name: 'X',
      change_type: 'date_moved',
      old_value: null,
      new_value: null,
      created_at: '',
    }
    expect(shiftAlertHref(alert)).toBe('/tasks/task-abc')
  })

  it('returns /materials for material alerts', () => {
    const alert: BriefingShiftAlert = {
      id: 'a2',
      entity_type: 'material',
      entity_id: 'mat-xyz',
      entity_name: 'Y',
      change_type: 'date_moved',
      old_value: null,
      new_value: null,
      created_at: '',
    }
    expect(shiftAlertHref(alert)).toBe('/materials')
  })
})
