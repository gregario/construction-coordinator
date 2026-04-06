'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { computeToggleResult } from '@/lib/briefing/operations'
import type { TaskStatus } from '@/types/database'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LooseClient = any

// AC-SA-3: Dismiss all shift alerts for the user's active project.
// Sets dismissed=true on all non-dismissed alerts. Only new alerts
// created after this point will appear on the next /briefing visit.
export type DismissShiftAlertsResult =
  | { ok: true; dismissed_count: number }
  | { ok: false; error: string }

export async function dismissShiftAlerts(
  projectId: string
): Promise<DismissShiftAlertsResult> {
  if (!projectId) return { ok: false, error: 'Project required' }

  const supabase = (await createClient()) as unknown as LooseClient
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'You must be signed in' }

  // Verify project ownership
  const projRes = await supabase
    .from('projects')
    .select('id, user_id')
    .eq('id', projectId)
    .single()
  if (projRes.error || !projRes.data) {
    return { ok: false, error: 'Project not found' }
  }
  if ((projRes.data as { user_id: string }).user_id !== user.id) {
    return { ok: false, error: 'Project not found' }
  }

  const upd = await supabase
    .from('shift_alerts')
    .update({ dismissed: true })
    .eq('project_id', projectId)
    .eq('user_id', user.id)
    .eq('dismissed', false)
    .select('id')

  if (upd.error) {
    return { ok: false, error: `Failed to dismiss alerts: ${upd.error.message}` }
  }

  const dismissed_count = (upd.data as Array<{ id: string }>)?.length ?? 0

  revalidatePath('/briefing')

  return { ok: true, dismissed_count }
}

export type ToggleTaskCompleteResult =
  | { ok: true; newStatus: TaskStatus; actualEnd: string | null }
  | { ok: false; error: string }

// AC-QA-1 + AC-QA-2: Toggle a task between complete and in_progress.
// Sets actual_end to today on completion, clears it on undo.
export async function toggleTaskComplete(
  projectId: string,
  taskId: string
): Promise<ToggleTaskCompleteResult> {
  if (!projectId || !taskId) {
    return { ok: false, error: 'Project and task required' }
  }

  const supabase = (await createClient()) as unknown as LooseClient
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'You must be signed in' }

  // Verify project ownership
  const projRes = await supabase
    .from('projects')
    .select('id, user_id')
    .eq('id', projectId)
    .single()
  if (projRes.error || !projRes.data) {
    return { ok: false, error: 'Project not found' }
  }
  if ((projRes.data as { user_id: string }).user_id !== user.id) {
    return { ok: false, error: 'Project not found' }
  }

  // Load task and verify it belongs to this project
  const taskRes = await supabase
    .from('tasks')
    .select('id, project_id, status')
    .eq('id', taskId)
    .single()
  if (taskRes.error || !taskRes.data) {
    return { ok: false, error: 'Task not found' }
  }
  const task = taskRes.data as { id: string; project_id: string; status: TaskStatus }
  if (task.project_id !== projectId) {
    return { ok: false, error: 'Task not found' }
  }

  const today = new Date().toISOString().slice(0, 10)
  const { newStatus, actualEnd } = computeToggleResult(task.status, today)

  const upd = await supabase
    .from('tasks')
    .update({ status: newStatus, actual_end: actualEnd })
    .eq('id', taskId)
  if (upd.error) {
    return { ok: false, error: `Failed to update task: ${upd.error.message}` }
  }

  // AC-QA-4: revalidate briefing so the RSC re-renders with updated status
  revalidatePath('/briefing')
  revalidatePath(`/tasks/${taskId}`)
  revalidatePath('/schedule')

  return { ok: true, newStatus, actualEnd }
}
