// Cascade engine — pure logic layer around the cascade_task_dates() PG function.
//
// The SQL function owns the transactional update + recursive CTE traversal
// (AC-CE-2, AC-CE-5). This module owns the summary shape: a single list of
// every task that moved (trigger + downstream) with old and new dates + delta,
// which server actions return to clients for toast/log rendering (AC-CE-3).
//
// Pure functions only — no Supabase, no I/O. Unit-testable without mocks.

import { diffDays, addDays } from '@/lib/tasks/operations'
import { computeOrderByDate } from '@/lib/materials/operations'
import type { CascadeResult } from '@/types/database'

export type CascadeTrigger = {
  task_id: string
  task_name: string
  old_planned_start: string
  old_planned_end: string
  new_planned_start: string
  new_planned_end: string
}

export type TaskMovement = {
  task_id: string
  task_name: string
  old_planned_start: string
  old_planned_end: string
  new_planned_start: string
  new_planned_end: string
  delta_days: number
  is_trigger: boolean
}

export type CascadeSummary = {
  delta_days: number
  downstream_count: number
  movements: TaskMovement[]
}

// AC-CE-1: the delta the cascade will apply to every downstream task is
// measured from the trigger task's planned_end change. End-to-end shift,
// not start-to-start, matches the SQL function's v_delta calculation.
export function computeCascadeDelta(oldEnd: string, newEnd: string): number {
  return diffDays(oldEnd, newEnd)
}

// AC-CE-1: downstream tasks shift by the same delta the trigger moved by.
// Mirrors the SQL `planned_start + v_delta, planned_end + v_delta` update.
export function shiftTaskDates(
  dates: { planned_start: string; planned_end: string },
  deltaDays: number
): { planned_start: string; planned_end: string } {
  return {
    planned_start: addDays(dates.planned_start, deltaDays),
    planned_end: addDays(dates.planned_end, deltaDays),
  }
}

// AC-CE-3 & AC-CE-4: assemble the single list the client renders.
// - First row is always the trigger task (is_trigger=true).
// - Zero downstream → movements has exactly one row (AC-CE-4).
// - Delta is computed once from the trigger and carried onto every row so the
//   UI can show "Moved +5 days" without recomputing per row.
export function buildCascadeSummary(
  trigger: CascadeTrigger,
  downstream: CascadeResult[]
): CascadeSummary {
  const delta = computeCascadeDelta(trigger.old_planned_end, trigger.new_planned_end)

  const movements: TaskMovement[] = [
    {
      task_id: trigger.task_id,
      task_name: trigger.task_name,
      old_planned_start: trigger.old_planned_start,
      old_planned_end: trigger.old_planned_end,
      new_planned_start: trigger.new_planned_start,
      new_planned_end: trigger.new_planned_end,
      delta_days: delta,
      is_trigger: true,
    },
    ...downstream.map(d => ({
      task_id: d.task_id,
      task_name: d.task_name,
      old_planned_start: d.old_planned_start,
      old_planned_end: d.old_planned_end,
      new_planned_start: d.new_planned_start,
      new_planned_end: d.new_planned_end,
      delta_days: delta,
      is_trigger: false,
    })),
  ]

  return {
    delta_days: delta,
    downstream_count: downstream.length,
    movements,
  }
}

// AC-CMS-1: when a cascade runs, every material attached to the trigger task
// or a downstream task has its order_by_date recomputed from the task's NEW
// planned_start. The SQL cascade_task_dates() function already writes the new
// value to the DB; this helper mirrors that math in TypeScript so callers can
// build the UI-facing MaterialMovement list without a second round-trip.
//
// planned_start − lead_time_days, identical to computeOrderByDate() so the
// client renders exactly what the DB stored.

export type MaterialCascadeInput = {
  material_id: string
  material_name: string
  task_id: string
  task_name: string
  lead_time_days: number
  old_order_by_date: string | null
}

export type MaterialMovement = {
  material_id: string
  material_name: string
  task_id: string
  task_name: string
  lead_time_days: number
  old_order_by_date: string | null
  new_order_by_date: string | null
  delta_days: number | null
}

// taskNewStarts: task_id → new planned_start for every task the cascade touched
// (trigger + downstream). Materials whose parent task is not in the map are
// skipped — the cascade didn't touch them.
export function computeMaterialMovements(
  materials: MaterialCascadeInput[],
  taskNewStarts: Record<string, string>
): MaterialMovement[] {
  const out: MaterialMovement[] = []
  for (const m of materials) {
    const newStart = taskNewStarts[m.task_id]
    if (!newStart) continue
    const new_order_by_date = computeOrderByDate(newStart, m.lead_time_days)
    const delta_days =
      m.old_order_by_date && new_order_by_date
        ? diffDays(m.old_order_by_date, new_order_by_date)
        : null
    out.push({
      material_id: m.material_id,
      material_name: m.material_name,
      task_id: m.task_id,
      task_name: m.task_name,
      lead_time_days: m.lead_time_days,
      old_order_by_date: m.old_order_by_date,
      new_order_by_date,
      delta_days,
    })
  }
  return out
}

