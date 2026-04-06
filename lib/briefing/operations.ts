// Pure logic for daily briefing — task filtering, shift alert formatting.
// No Supabase, no DOM.

import type { TaskStatus, EntityType, ChangeType } from '@/types/database'

// ---------- Today's Tasks (AC-DB-2) ----------

export type BriefingTask = {
  id: string
  name: string
  planned_start: string // ISO date
  planned_end: string   // ISO date
  status: TaskStatus
  stage_name: string
  stage_color: string
}

/**
 * Filter tasks for today's briefing: planned_start <= today <= planned_end
 * AND status IN ('not_started', 'in_progress', 'complete').
 * Complete tasks are included so the user can undo completion (AC-QA-2)
 * without the task disappearing from the list.
 * Returns sorted by: incomplete first, then planned_start ASC, then name ASC.
 */
export function selectTodayTasks(
  tasks: BriefingTask[],
  today: string
): BriefingTask[] {
  return tasks
    .filter(
      (t) =>
        (t.status === 'not_started' ||
          t.status === 'in_progress' ||
          t.status === 'complete') &&
        t.planned_start <= today &&
        t.planned_end >= today
    )
    .sort((a, b) => {
      // Incomplete tasks sort before complete ones
      const aComplete = a.status === 'complete' ? 1 : 0
      const bComplete = b.status === 'complete' ? 1 : 0
      if (aComplete !== bComplete) return aComplete - bComplete
      const d = a.planned_start.localeCompare(b.planned_start)
      if (d !== 0) return d
      return a.name.localeCompare(b.name)
    })
}

// ---------- Next Task Date (AC-DB-3) ----------

/**
 * When no tasks are active today, find the earliest future task start date.
 * Returns ISO date string or null if no future tasks exist.
 */
export function nextTaskStartDate(
  tasks: BriefingTask[],
  today: string
): string | null {
  let earliest: string | null = null
  for (const t of tasks) {
    if (
      (t.status === 'not_started' || t.status === 'in_progress') &&
      t.planned_start > today
    ) {
      if (earliest === null || t.planned_start < earliest) {
        earliest = t.planned_start
      }
    }
  }
  return earliest
}

// ---------- Shift Alerts (AC-DB-1 — section presence) ----------

export type BriefingShiftAlert = {
  id: string
  entity_type: EntityType
  entity_id: string
  entity_name: string
  change_type: ChangeType
  old_value: string | null
  new_value: string | null
  created_at: string
}

/**
 * Format a shift alert into a human-readable string.
 * e.g., "Excavation moved from 2026-06-01 to 2026-06-08"
 */
export function formatShiftAlert(alert: BriefingShiftAlert): string {
  if (alert.change_type === 'date_moved') {
    return `${alert.entity_name} moved from ${alert.old_value ?? '(unset)'} to ${alert.new_value ?? '(unset)'}`
  }
  return `${alert.entity_name} status changed to ${alert.new_value ?? 'unknown'}`
}

/**
 * Build the link target for a shift alert.
 * Tasks → /tasks/:id, Materials → /materials
 */
export function shiftAlertHref(alert: BriefingShiftAlert): string {
  if (alert.entity_type === 'task') {
    return `/tasks/${alert.entity_id}`
  }
  return '/materials'
}

// ---------- Task Quick Actions (AC-QA-1, AC-QA-2) ----------

export type ToggleResult = {
  newStatus: TaskStatus
  actualEnd: string | null
}

/**
 * Compute the new status and actual_end for a task toggle.
 * - not_started / in_progress / delayed → complete (actual_end = today)
 * - complete → in_progress (actual_end = null)
 */
export function computeToggleResult(
  currentStatus: TaskStatus,
  today: string
): ToggleResult {
  if (currentStatus === 'complete') {
    return { newStatus: 'in_progress', actualEnd: null }
  }
  return { newStatus: 'complete', actualEnd: today }
}
