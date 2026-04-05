'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

// See templates.ts for the same cast. lib/supabase/types.ts is still missing
// Relationships[] after the foundation-eval finding; feature code casts at
// call sites and imports domain types from @/types/database for safety.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LooseClient = any

export type ApplyCustomizationResult =
  | { ok: true }
  | { ok: false; error: string }

export type AddedTaskInput = {
  stage_id: string
  name: string
  duration_days: number
  notes: string | null
}

export type ApplyCustomizationInput = {
  projectId: string
  removedTaskIds: string[]
  addedTasks: AddedTaskInput[]
}

async function verifyProjectOwnership(
  supabase: LooseClient,
  projectId: string,
  userId: string
): Promise<
  | { ok: true; project: { id: string; start_date: string; status: string } }
  | { ok: false; error: string }
> {
  const res = await supabase
    .from('projects')
    .select('id, user_id, start_date, status')
    .eq('id', projectId)
    .single()
  if (res.error || !res.data) return { ok: false, error: 'Project not found' }
  const p = res.data as {
    id: string
    user_id: string
    start_date: string
    status: string
  }
  if (p.user_id !== userId) return { ok: false, error: 'Project not found' }
  return { ok: true, project: { id: p.id, start_date: p.start_date, status: p.status } }
}

export async function applyCustomization(
  input: ApplyCustomizationInput
): Promise<ApplyCustomizationResult> {
  if (!input.projectId) return { ok: false, error: 'Project required' }

  const supabase = (await createClient()) as unknown as LooseClient
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'You must be signed in' }

  const owned = await verifyProjectOwnership(supabase, input.projectId, user.id)
  if (!owned.ok) return owned
  if (owned.project.status !== 'setup') {
    return { ok: false, error: 'Customization can only be applied during setup' }
  }

  // 1. Delete toggled-off tasks (cascade removes their materials + dep rows)
  if (input.removedTaskIds.length > 0) {
    const del = await supabase
      .from('tasks')
      .delete()
      .in('id', input.removedTaskIds)
      .eq('project_id', input.projectId)
    if (del.error) {
      return { ok: false, error: `Failed to remove tasks: ${del.error.message}` }
    }
  }

  // 2. Insert added tasks with a conservative schedule (project.start_date + 1 day per task).
  //    The finalize step runs cascade_task_dates() which recomputes everything.
  if (input.addedTasks.length > 0) {
    // Find current max order_index per stage to place new tasks at the end
    const orderRes = await supabase
      .from('tasks')
      .select('stage_id, order_index')
      .eq('project_id', input.projectId)
    const orderByStage = new Map<string, number>()
    if (orderRes.data) {
      for (const row of orderRes.data as Array<{ stage_id: string; order_index: number }>) {
        const cur = orderByStage.get(row.stage_id) ?? -1
        if (row.order_index > cur) orderByStage.set(row.stage_id, row.order_index)
      }
    }

    const startDate = owned.project.start_date
    const taskRows = input.addedTasks.map(t => {
      const next = (orderByStage.get(t.stage_id) ?? -1) + 1
      orderByStage.set(t.stage_id, next)
      return {
        project_id: input.projectId,
        stage_id: t.stage_id,
        name: t.name,
        duration_days: t.duration_days,
        planned_start: startDate,
        planned_end: addDaysISO(startDate, t.duration_days),
        notes: t.notes,
        order_index: next,
        status: 'not_started' as const,
      }
    })

    const ins = await supabase.from('tasks').insert(taskRows)
    if (ins.error) {
      return { ok: false, error: `Failed to add tasks: ${ins.error.message}` }
    }
  }

  revalidatePath('/setup')
  return { ok: true }
}

export async function finalizeProject(projectId: string): Promise<
  { ok: false; error: string }
> {
  // NOTE: This action throws a Next.js redirect on success (which is how
  // server-action redirects work in Next 16). Only the error path returns.
  if (!projectId) return { ok: false, error: 'Project required' }

  const supabase = (await createClient()) as unknown as LooseClient
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'You must be signed in' }

  const owned = await verifyProjectOwnership(supabase, projectId, user.id)
  if (!owned.ok) return owned

  if (owned.project.status === 'active') {
    // Already active — just redirect
    redirect('/briefing')
  }
  if (owned.project.status !== 'setup') {
    return { ok: false, error: 'Project cannot be activated from this status' }
  }

  // Verify the project has at least one stage and one task before activating
  const stageCount = await supabase
    .from('stages')
    .select('id', { count: 'exact', head: true })
    .eq('project_id', projectId)
  if (!stageCount.count || stageCount.count === 0) {
    return { ok: false, error: 'Apply a template before creating the project' }
  }
  const taskCount = await supabase
    .from('tasks')
    .select('id', { count: 'exact', head: true })
    .eq('project_id', projectId)
  if (!taskCount.count || taskCount.count === 0) {
    return { ok: false, error: 'At least one task is required to create the project' }
  }

  const upd = await supabase
    .from('projects')
    .update({ status: 'active' })
    .eq('id', projectId)
  if (upd.error) {
    return { ok: false, error: `Failed to activate project: ${upd.error.message}` }
  }

  revalidatePath('/', 'layout')
  redirect('/briefing')
}

function addDaysISO(iso: string, days: number): string {
  const d = new Date(iso + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + days)
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
