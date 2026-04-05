'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import {
  validateTaskInput,
  computePlannedDates,
  type TaskDateRecord,
} from '@/lib/tasks/operations'

// lib/supabase/types.ts lacks Relationships[] on every table (foundation-eval
// finding). Cast at the call site — same pattern as stages.ts / projects.ts.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LooseClient = any

export type TaskFieldError = 'name' | 'duration_days' | 'depends_on'

export type CreateTaskInput = {
  projectId: string
  stageId: string
  name: string
  durationDays: number
  dependsOn?: string[]
  tradeId?: string | null
  notes?: string | null
}

export type TaskSummary = {
  id: string
  stage_id: string
  name: string
  duration_days: number
  planned_start: string
  planned_end: string
  trade_id: string | null
  notes: string | null
}

export type CreateTaskResult =
  | { ok: true; task: TaskSummary }
  | { ok: false; error: string; field?: TaskFieldError }

export type UpdateTaskDurationInput = {
  projectId: string
  taskId: string
  durationDays: number
}

export type CascadeChange = {
  task_id: string
  task_name: string
  old_planned_start: string
  old_planned_end: string
  new_planned_start: string
  new_planned_end: string
}

export type UpdateTaskDurationResult =
  | {
      ok: true
      task: { id: string; planned_start: string; planned_end: string; duration_days: number }
      cascade_changes: CascadeChange[]
    }
  | { ok: false; error: string; field?: TaskFieldError }

export type DeleteTaskResult = { ok: true } | { ok: false; error: string }

async function verifyProjectOwnership(
  supabase: LooseClient,
  projectId: string,
  userId: string
): Promise<
  | { ok: true; project: { id: string; start_date: string } }
  | { ok: false; error: string }
> {
  const res = await supabase
    .from('projects')
    .select('id, user_id, start_date')
    .eq('id', projectId)
    .single()
  if (res.error || !res.data) return { ok: false, error: 'Project not found' }
  const p = res.data as { id: string; user_id: string; start_date: string }
  if (p.user_id !== userId) return { ok: false, error: 'Project not found' }
  return { ok: true, project: { id: p.id, start_date: p.start_date } }
}

// AC-TM-1 + AC-TM-2/3/4: create a task with its planned dates computed from
// its dependencies (or the project start_date if no deps).
export async function createTask(input: CreateTaskInput): Promise<CreateTaskResult> {
  if (!input.projectId || !input.stageId) {
    return { ok: false, error: 'Project and stage required' }
  }

  const validated = validateTaskInput({
    name: input.name,
    duration_days: input.durationDays,
    depends_on: input.dependsOn,
    notes: input.notes ?? null,
  })
  if (!validated.ok) {
    const firstField = (Object.keys(validated.errors) as TaskFieldError[])[0]
    return {
      ok: false,
      error: validated.errors[firstField] ?? 'Invalid task',
      field: firstField,
    }
  }

  const supabase = (await createClient()) as unknown as LooseClient
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'You must be signed in' }

  const owned = await verifyProjectOwnership(supabase, input.projectId, user.id)
  if (!owned.ok) return owned

  // Verify stage belongs to this project
  const stageRes = await supabase
    .from('stages')
    .select('id, project_id')
    .eq('id', input.stageId)
    .single()
  if (stageRes.error || !stageRes.data) {
    return { ok: false, error: 'Stage not found' }
  }
  if ((stageRes.data as { project_id: string }).project_id !== input.projectId) {
    return { ok: false, error: 'Stage not found' }
  }

  // Load dependency task dates (must all belong to this project).
  const deps: TaskDateRecord[] = []
  const dependsOn = input.dependsOn ?? []
  if (dependsOn.length > 0) {
    const depRes = await supabase
      .from('tasks')
      .select('id, project_id, planned_start, planned_end')
      .in('id', dependsOn)
    if (depRes.error || !depRes.data) {
      return { ok: false, error: 'Failed to load dependencies' }
    }
    const rows = depRes.data as Array<{
      id: string
      project_id: string
      planned_start: string
      planned_end: string
    }>
    if (rows.length !== dependsOn.length) {
      return { ok: false, error: 'Unknown dependency', field: 'depends_on' }
    }
    for (const row of rows) {
      if (row.project_id !== input.projectId) {
        return { ok: false, error: 'Unknown dependency', field: 'depends_on' }
      }
      deps.push({
        id: row.id,
        planned_start: row.planned_start,
        planned_end: row.planned_end,
      })
    }
  }

  // Verify trade belongs to this project, if supplied.
  if (input.tradeId) {
    const tradeRes = await supabase
      .from('trades')
      .select('id, project_id')
      .eq('id', input.tradeId)
      .single()
    if (tradeRes.error || !tradeRes.data) {
      return { ok: false, error: 'Trade not found' }
    }
    if ((tradeRes.data as { project_id: string }).project_id !== input.projectId) {
      return { ok: false, error: 'Trade not found' }
    }
  }

  // AC-TM-2/3/4: computed dates
  const { planned_start, planned_end } = computePlannedDates({
    durationDays: input.durationDays,
    projectStartDate: owned.project.start_date,
    dependencies: deps,
  })

  // Append the new task to the end of the stage's task list.
  const maxOrderRes = await supabase
    .from('tasks')
    .select('order_index')
    .eq('stage_id', input.stageId)
    .order('order_index', { ascending: false })
    .limit(1)
  const currentMax =
    maxOrderRes.data && maxOrderRes.data.length > 0
      ? (maxOrderRes.data[0] as { order_index: number }).order_index
      : -1
  const nextIndex = currentMax + 1

  const ins = await supabase
    .from('tasks')
    .insert({
      project_id: input.projectId,
      stage_id: input.stageId,
      trade_id: input.tradeId ?? null,
      name: input.name.trim(),
      duration_days: Math.floor(input.durationDays),
      planned_start,
      planned_end,
      order_index: nextIndex,
      notes: input.notes ?? null,
    })
    .select('id, stage_id, name, duration_days, planned_start, planned_end, trade_id, notes')
    .single()

  if (ins.error || !ins.data) {
    return {
      ok: false,
      error: `Failed to create task: ${ins.error?.message ?? 'unknown'}`,
    }
  }
  const taskId = (ins.data as { id: string }).id

  // Persist dependencies (composite PK prevents duplicates within this insert).
  if (dependsOn.length > 0) {
    const depRows = dependsOn.map(d => ({ task_id: taskId, depends_on_task_id: d }))
    const depIns = await supabase.from('task_dependencies').insert(depRows)
    if (depIns.error) {
      // Rollback the task insert so the UI state stays consistent with DB.
      await supabase.from('tasks').delete().eq('id', taskId)
      return {
        ok: false,
        error: `Failed to save dependencies: ${depIns.error.message}`,
      }
    }
  }

  revalidatePath('/schedule')
  revalidatePath(`/stages/${input.stageId}`)
  revalidatePath(`/tasks/${taskId}`)

  return { ok: true, task: ins.data as TaskSummary }
}

// AC-TM-5: edit duration_days → recalculate planned_end, cascade to all
// downstream tasks via the cascade_task_dates() RPC.
export async function updateTaskDuration(
  input: UpdateTaskDurationInput
): Promise<UpdateTaskDurationResult> {
  if (!input.projectId || !input.taskId) {
    return { ok: false, error: 'Project and task required' }
  }
  const validated = validateTaskInput({ name: 'placeholder', duration_days: input.durationDays })
  if (validated.errors.duration_days) {
    return { ok: false, error: validated.errors.duration_days, field: 'duration_days' }
  }

  const supabase = (await createClient()) as unknown as LooseClient
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'You must be signed in' }

  const owned = await verifyProjectOwnership(supabase, input.projectId, user.id)
  if (!owned.ok) return owned

  const taskRes = await supabase
    .from('tasks')
    .select('id, project_id, stage_id, planned_start, planned_end')
    .eq('id', input.taskId)
    .single()
  if (taskRes.error || !taskRes.data) {
    return { ok: false, error: 'Task not found' }
  }
  const task = taskRes.data as {
    id: string
    project_id: string
    stage_id: string
    planned_start: string
    planned_end: string
  }
  if (task.project_id !== input.projectId) {
    return { ok: false, error: 'Task not found' }
  }

  const duration = Math.floor(input.durationDays)
  const { planned_end } = computePlannedDates({
    durationDays: duration,
    projectStartDate: task.planned_start,
    dependencies: [],
  })

  // Call cascade_task_dates RPC to update this task AND all downstream tasks
  // atomically. The RPC returns the downstream changes it made.
  const cascadeRes = await supabase.rpc('cascade_task_dates', {
    p_task_id: input.taskId,
    p_new_planned_start: task.planned_start,
    p_new_planned_end: planned_end,
  })
  if (cascadeRes.error) {
    return { ok: false, error: `Cascade failed: ${cascadeRes.error.message}` }
  }

  // Persist the new duration_days separately — cascade_task_dates only updates
  // date columns, not duration (which is the source of truth for future edits).
  const durUpd = await supabase
    .from('tasks')
    .update({ duration_days: duration })
    .eq('id', input.taskId)
  if (durUpd.error) {
    return { ok: false, error: `Failed to save duration: ${durUpd.error.message}` }
  }

  revalidatePath('/schedule')
  revalidatePath(`/stages/${task.stage_id}`)
  revalidatePath(`/tasks/${input.taskId}`)

  const changes = (cascadeRes.data as CascadeChange[] | null) ?? []
  return {
    ok: true,
    task: {
      id: input.taskId,
      planned_start: task.planned_start,
      planned_end,
      duration_days: duration,
    },
    cascade_changes: changes,
  }
}

// AC-TM-6: delete a task. ON DELETE CASCADE on tasks(id) removes materials
// and every task_dependencies row that references this task — as the
// depends_on side OR the task side — so downstream tasks automatically have
// the deleted task removed from their depends_on list.
export async function deleteTask(
  projectId: string,
  taskId: string
): Promise<DeleteTaskResult> {
  if (!projectId || !taskId) return { ok: false, error: 'Project and task required' }

  const supabase = (await createClient()) as unknown as LooseClient
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'You must be signed in' }

  const owned = await verifyProjectOwnership(supabase, projectId, user.id)
  if (!owned.ok) return owned

  // Verify the task belongs to this project before deleting.
  const taskRes = await supabase
    .from('tasks')
    .select('id, project_id, stage_id')
    .eq('id', taskId)
    .single()
  if (taskRes.error || !taskRes.data) {
    return { ok: false, error: 'Task not found' }
  }
  const task = taskRes.data as { id: string; project_id: string; stage_id: string }
  if (task.project_id !== projectId) {
    return { ok: false, error: 'Task not found' }
  }

  const del = await supabase.from('tasks').delete().eq('id', taskId)
  if (del.error) {
    return { ok: false, error: `Failed to delete task: ${del.error.message}` }
  }

  revalidatePath('/schedule')
  revalidatePath(`/stages/${task.stage_id}`)
  return { ok: true }
}
