// Pure computation functions for Gantt bar drag interactions.
// No DOM, no Supabase. Unit-testable without mocks.
//
// AC-GE-1: drag right edge → new duration
// AC-GE-2: drag middle → shift start+end
// AC-GE-4: dependency constraint validation

import { daysBetween } from './compute'
import type { GanttTask, DateRange } from './compute'

// ---------------------------------------------------------------------------
// Coordinate ↔ date conversion
// ---------------------------------------------------------------------------

/** Convert a pixel x-offset to a day index (floored). */
export function dayFromPixel(px: number, dayWidth: number): number {
  return Math.floor(px / dayWidth)
}

/** Convert a day offset from range.startDate to an ISO date string. */
export function dateFromDayOffset(range: DateRange, dayOffset: number): string {
  const d = new Date(range.startDate + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + dayOffset)
  return d.toISOString().slice(0, 10)
}

// ---------------------------------------------------------------------------
// Resize (AC-GE-1): drag right edge to change duration
// ---------------------------------------------------------------------------

export type ResizeResult = {
  newDurationDays: number
  newEndDate: string
}

/**
 * Compute new duration from dragging the right edge of a bar to a new pixel x.
 * Duration is clamped to a minimum of 1 day.
 */
export function computeResizeResult(
  bar: { startDay: number },
  newRightPx: number,
  dayWidth: number,
  range: DateRange,
): ResizeResult {
  const newEndDay = dayFromPixel(newRightPx, dayWidth)
  const newDuration = Math.max(1, newEndDay - bar.startDay + 1)
  const newEndDate = dateFromDayOffset(range, bar.startDay + newDuration - 1)
  return { newDurationDays: newDuration, newEndDate }
}

// ---------------------------------------------------------------------------
// Move (AC-GE-2): drag middle to shift start + end
// ---------------------------------------------------------------------------

export type MoveResult = {
  newStartDate: string
  newEndDate: string
  deltaDays: number
}

/**
 * Compute new start/end dates from dragging the entire bar by a pixel delta.
 */
export function computeMoveResult(
  bar: { startDay: number; widthDays: number },
  dragDeltaPx: number,
  dayWidth: number,
  range: DateRange,
): MoveResult {
  const deltaDays = Math.round(dragDeltaPx / dayWidth)
  const newStartDay = bar.startDay + deltaDays
  const newEndDay = newStartDay + bar.widthDays - 1
  const newStartDate = dateFromDayOffset(range, newStartDay)
  const newEndDate = dateFromDayOffset(range, newEndDay)
  return { newStartDate, newEndDate, deltaDays }
}

// ---------------------------------------------------------------------------
// Constraint validation (AC-GE-4)
// ---------------------------------------------------------------------------

/**
 * Compute the earliest allowed start day for a task based on its dependencies.
 * A task cannot start before all its dependencies end + 1 day.
 * Returns 0 (no constraint) if the task has no dependencies.
 */
export function computeMinStartDay(
  taskId: string,
  tasks: GanttTask[],
  range: DateRange,
): number {
  const task = tasks.find(t => t.id === taskId)
  if (!task || task.depends_on.length === 0) return 0

  let maxDepEndDay = -Infinity
  for (const depId of task.depends_on) {
    const dep = tasks.find(t => t.id === depId)
    if (!dep) continue
    const depEndDay = daysBetween(range.startDate, dep.planned_end)
    if (depEndDay > maxDepEndDay) maxDepEndDay = depEndDay
  }

  // Task can start the day after the latest dependency ends
  return maxDepEndDay === -Infinity ? 0 : maxDepEndDay + 1
}

export type DropValidation =
  | { valid: true }
  | { valid: false; reason: string }

/**
 * Validate whether dropping a task bar at a new position violates dependency
 * constraints. AC-GE-4: if the new start is before any dependency's end date,
 * the drop is invalid.
 */
export function validateTaskDrop(
  taskId: string,
  newStartDay: number,
  tasks: GanttTask[],
  range: DateRange,
): DropValidation {
  const minStart = computeMinStartDay(taskId, tasks, range)
  if (newStartDay < minStart) {
    return { valid: false, reason: 'Cannot start before dependency completes' }
  }
  return { valid: true }
}
