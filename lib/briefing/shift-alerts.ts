// Pure logic for building shift_alert insert rows from cascade results.
// No Supabase, no DOM.

import type { TaskMovement, MaterialMovement } from '@/lib/cascade/engine'

export type ShiftAlertInsert = {
  project_id: string
  user_id: string
  entity_type: 'task' | 'material'
  entity_id: string
  entity_name: string
  change_type: 'date_moved'
  old_value: string
  new_value: string
}

/**
 * Build shift_alert rows for tasks that moved during a cascade.
 * Uses planned_end as the old/new values — that's the date the user cares about
 * ("when does this task finish?").
 * Skips tasks with zero delta (dates unchanged).
 */
export function buildTaskShiftAlerts(
  movements: TaskMovement[],
  projectId: string,
  userId: string
): ShiftAlertInsert[] {
  const alerts: ShiftAlertInsert[] = []
  for (const m of movements) {
    if (m.old_planned_end === m.new_planned_end) continue
    alerts.push({
      project_id: projectId,
      user_id: userId,
      entity_type: 'task',
      entity_id: m.task_id,
      entity_name: m.task_name,
      change_type: 'date_moved',
      old_value: m.old_planned_end,
      new_value: m.new_planned_end,
    })
  }
  return alerts
}

/**
 * Build shift_alert rows for materials whose order_by_date moved.
 * Skips materials with zero or null delta.
 */
export function buildMaterialShiftAlerts(
  movements: MaterialMovement[],
  projectId: string,
  userId: string
): ShiftAlertInsert[] {
  const alerts: ShiftAlertInsert[] = []
  for (const m of movements) {
    if (!m.delta_days || m.delta_days === 0) continue
    if (!m.old_order_by_date || !m.new_order_by_date) continue
    alerts.push({
      project_id: projectId,
      user_id: userId,
      entity_type: 'material',
      entity_id: m.material_id,
      entity_name: m.material_name,
      change_type: 'date_moved',
      old_value: m.old_order_by_date,
      new_value: m.new_order_by_date,
    })
  }
  return alerts
}
