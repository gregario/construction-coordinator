import { describe, it, expect } from 'vitest'
import {
  buildTaskShiftAlerts,
  buildMaterialShiftAlerts,
  type ShiftAlertInsert,
} from '@/lib/briefing/shift-alerts'
import type { TaskMovement, MaterialMovement } from '@/lib/cascade/engine'

const PROJECT_ID = 'proj-1'
const USER_ID = 'user-1'

// @criterion: AC-SA-1
// AC-SA-1: buildTaskShiftAlerts and buildMaterialShiftAlerts convert cascade movements into ShiftAlertInsert rows
describe('buildTaskShiftAlerts', () => {
  it('creates a date_moved alert for each non-trigger task movement', () => {
    const movements: TaskMovement[] = [
      {
        task_id: 't1',
        task_name: 'Excavation',
        old_planned_start: '2026-06-01',
        old_planned_end: '2026-06-05',
        new_planned_start: '2026-06-01',
        new_planned_end: '2026-06-08',
        delta_days: 3,
        is_trigger: true,
      },
      {
        task_id: 't2',
        task_name: 'Footings',
        old_planned_start: '2026-06-06',
        old_planned_end: '2026-06-10',
        new_planned_start: '2026-06-09',
        new_planned_end: '2026-06-13',
        delta_days: 3,
        is_trigger: false,
      },
      {
        task_id: 't3',
        task_name: 'Slab',
        old_planned_start: '2026-06-11',
        old_planned_end: '2026-06-15',
        new_planned_start: '2026-06-14',
        new_planned_end: '2026-06-18',
        delta_days: 3,
        is_trigger: false,
      },
    ]

    const alerts = buildTaskShiftAlerts(movements, PROJECT_ID, USER_ID)

    // Trigger task is included — the user needs to see what moved
    expect(alerts).toHaveLength(3)

    // Check trigger alert
    expect(alerts[0]).toMatchObject({
      project_id: PROJECT_ID,
      user_id: USER_ID,
      entity_type: 'task',
      entity_id: 't1',
      entity_name: 'Excavation',
      change_type: 'date_moved',
      old_value: '2026-06-05',
      new_value: '2026-06-08',
    })

    // Check downstream alerts — old_value/new_value are planned_end dates
    expect(alerts[1]).toMatchObject({
      entity_id: 't2',
      entity_name: 'Footings',
      change_type: 'date_moved',
      old_value: '2026-06-10',
      new_value: '2026-06-13',
    })
    expect(alerts[2]).toMatchObject({
      entity_id: 't3',
      entity_name: 'Slab',
      old_value: '2026-06-15',
      new_value: '2026-06-18',
    })
  })

  it('skips tasks with zero delta (dates unchanged)', () => {
    const movements: TaskMovement[] = [
      {
        task_id: 't1',
        task_name: 'Excavation',
        old_planned_start: '2026-06-01',
        old_planned_end: '2026-06-05',
        new_planned_start: '2026-06-01',
        new_planned_end: '2026-06-05',
        delta_days: 0,
        is_trigger: true,
      },
    ]
    expect(buildTaskShiftAlerts(movements, PROJECT_ID, USER_ID)).toHaveLength(0)
  })

  it('returns empty array for empty movements', () => {
    expect(buildTaskShiftAlerts([], PROJECT_ID, USER_ID)).toEqual([])
  })
})

// ---------- buildMaterialShiftAlerts ----------

describe('buildMaterialShiftAlerts', () => {
  it('creates a date_moved alert for each material with non-zero delta', () => {
    const movements: MaterialMovement[] = [
      {
        material_id: 'm1',
        material_name: 'Ready Mix Concrete',
        task_id: 't1',
        task_name: 'Footings',
        lead_time_days: 3,
        old_order_by_date: '2026-06-03',
        new_order_by_date: '2026-06-06',
        delta_days: 3,
      },
      {
        material_id: 'm2',
        material_name: 'Timber Frame Kit',
        task_id: 't2',
        task_name: 'Frame',
        lead_time_days: 70,
        old_order_by_date: '2026-04-01',
        new_order_by_date: '2026-04-04',
        delta_days: 3,
      },
    ]

    const alerts = buildMaterialShiftAlerts(movements, PROJECT_ID, USER_ID)
    expect(alerts).toHaveLength(2)
    expect(alerts[0]).toMatchObject({
      project_id: PROJECT_ID,
      user_id: USER_ID,
      entity_type: 'material',
      entity_id: 'm1',
      entity_name: 'Ready Mix Concrete',
      change_type: 'date_moved',
      old_value: '2026-06-03',
      new_value: '2026-06-06',
    })
  })

  it('skips materials with zero delta', () => {
    const movements: MaterialMovement[] = [
      {
        material_id: 'm1',
        material_name: 'Concrete',
        task_id: 't1',
        task_name: 'X',
        lead_time_days: 3,
        old_order_by_date: '2026-06-03',
        new_order_by_date: '2026-06-03',
        delta_days: 0,
      },
    ]
    expect(buildMaterialShiftAlerts(movements, PROJECT_ID, USER_ID)).toHaveLength(0)
  })

  it('skips materials with null delta (missing old date)', () => {
    const movements: MaterialMovement[] = [
      {
        material_id: 'm1',
        material_name: 'Concrete',
        task_id: 't1',
        task_name: 'X',
        lead_time_days: 3,
        old_order_by_date: null,
        new_order_by_date: '2026-06-06',
        delta_days: null,
      },
    ]
    expect(buildMaterialShiftAlerts(movements, PROJECT_ID, USER_ID)).toHaveLength(0)
  })

  it('returns empty for empty array', () => {
    expect(buildMaterialShiftAlerts([], PROJECT_ID, USER_ID)).toEqual([])
  })
})
