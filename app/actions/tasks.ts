'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import {
  validateTaskInput,
  computePlannedDates,
  type TaskDateRecord,
} from '@/lib/tasks/operations'
import { validateDelayDate } from '@/lib/tasks/delay'
import { computeOrderByDate } from '@/lib/materials/operations'
import {
  buildCascadeSummary,
  computeMaterialMovements,
  type CascadeSummary,
  type MaterialCascadeInput,
  type MaterialMovement,
} from '@/lib/cascade/engine'
import type { CascadeResult } from '@/types/database'
import {
  detectCycle,
  formatCyclePath,
  removeStaleDependencies,
  type DependencyEdge,
} from '@/lib/tasks/dependency-graph'
import {
  buildTaskShiftAlerts,
  buildMaterialShiftAlerts,
} from '@/lib/briefing/shift-alerts'

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
      cascade_summary: CascadeSummary
      material_movements: MaterialMovement[]
      materials_moved: number
    }
  | { ok: false; error: string; field?: TaskFieldError }

export type DeleteTaskResult = { ok: true } | { ok: false; error: string }

export type LogTaskDelayInput = {
  projectId: string
  taskId: string
  newPlannedEnd: string // ISO YYYY-MM-DD
}

export type LogTaskDelayResult =
  | {
      ok: true
      cascade_summary: CascadeSummary
      material_movements: MaterialMovement[]
      materials_moved: number
    }
  | { ok: false; error: string }

// AC-CMS-2: Load material metadata (name, lead_time, parent task) for every
// task the cascade touched. The order_by_date is derived from task starts
// with computeOrderByDate() — mirroring the SQL UPDATE materials math — so
// we can report both OLD and NEW values without a before/after read race.
type MaterialLite = {
  material_id: string
  material_name: string
  task_id: string
  task_name: string
  lead_time_days: number
}

async function loadCascadeMaterials(
  supabase: LooseClient,
  affectedTaskIds: string[],
  taskNameById: Record<string, string>
): Promise<MaterialLite[]> {
  if (affectedTaskIds.length === 0) return []
  const res = await supabase
    .from('materials')
    .select('id, name, lead_time_days, task_id')
    .in('task_id', affectedTaskIds)
  if (res.error || !res.data) return []
  const rows = res.data as Array<{
    id: string
    name: string
    lead_time_days: number
    task_id: string
  }>
  return rows.map(r => ({
    material_id: r.id,
    material_name: r.name,
    task_id: r.task_id,
    task_name: taskNameById[r.task_id] ?? '',
    lead_time_days: r.lead_time_days,
  }))
}

// AC-CMS-1 + AC-CMS-2: Given task old/new starts and material metadata,
// build the MaterialMovement list. Mirrors the SQL cascade's material math.
function buildMaterialMovements(
  materials: MaterialLite[],
  taskOldStarts: Record<string, string>,
  taskNewStarts: Record<string, string>
): MaterialMovement[] {
  const withOld: MaterialCascadeInput[] = materials.map(m => ({
    ...m,
    old_order_by_date: computeOrderByDate(
      taskOldStarts[m.task_id] ?? null,
      m.lead_time_days
    ),
  }))
  return computeMaterialMovements(withOld, taskNewStarts)
}

// AC-SA-1: persist shift alert rows for every task and material that moved.
// Best-effort — a failed insert should not block the cascade result.
async function insertShiftAlerts(
  supabase: LooseClient,
  alerts: Array<{
    project_id: string
    user_id: string
    entity_type: string
    entity_id: string
    entity_name: string
    change_type: string
    old_value: string
    new_value: string
  }>
): Promise<void> {
  if (alerts.length === 0) return
  await supabase.from('shift_alerts').insert(alerts)
}

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
    .select('id, project_id, stage_id, name, planned_start, planned_end')
    .eq('id', input.taskId)
    .single()
  if (taskRes.error || !taskRes.data) {
    return { ok: false, error: 'Task not found' }
  }
  const task = taskRes.data as {
    id: string
    project_id: string
    stage_id: string
    name: string
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

  const changes = (cascadeRes.data as CascadeChange[] | null) ?? []

  // AC-CMS-1/AC-CMS-2: compute material movements for every task the cascade
  // touched so the duration-edit result shape matches logTaskDelay.
  const affectedTaskIds = [input.taskId, ...changes.map(c => c.task_id)]
  const taskOldStarts: Record<string, string> = {
    [input.taskId]: task.planned_start,
  }
  const taskNewStarts: Record<string, string> = {
    [input.taskId]: task.planned_start,
  }
  const taskNameById: Record<string, string> = { [input.taskId]: task.name }
  for (const c of changes) {
    taskOldStarts[c.task_id] = c.old_planned_start
    taskNewStarts[c.task_id] = c.new_planned_start
    taskNameById[c.task_id] = c.task_name
  }
  const materials = await loadCascadeMaterials(
    supabase,
    affectedTaskIds,
    taskNameById
  )
  const material_movements = buildMaterialMovements(
    materials,
    taskOldStarts,
    taskNewStarts
  )
  const materials_moved = material_movements.filter(
    m => m.delta_days !== 0 && m.delta_days !== null
  ).length

  // AC-CMS-3/AC-CMS-4: /materials and /briefing both render material
  // order_by_date — revalidate so the updated values appear immediately.
  revalidatePath('/schedule')
  revalidatePath('/briefing')
  revalidatePath('/materials')
  revalidatePath(`/stages/${task.stage_id}`)
  revalidatePath(`/tasks/${input.taskId}`)

  // AC-CE-3: assemble the unified cascade summary (trigger + downstream) so
  // callers have one list to render. cascade_task_dates() returns downstream
  // only — the trigger's before/after is known here from the original row +
  // the new planned_end we just wrote.
  const cascade_summary = buildCascadeSummary(
    {
      task_id: input.taskId,
      task_name: task.name,
      old_planned_start: task.planned_start,
      old_planned_end: task.planned_end,
      new_planned_start: task.planned_start,
      new_planned_end: planned_end,
    },
    changes as CascadeResult[]
  )

  // AC-SA-1: record shift alerts for every task + material that moved
  const taskAlerts = buildTaskShiftAlerts(cascade_summary.movements, input.projectId, user.id)
  const matAlerts = buildMaterialShiftAlerts(material_movements, input.projectId, user.id)
  await insertShiftAlerts(supabase, [...taskAlerts, ...matAlerts])

  return {
    ok: true,
    task: {
      id: input.taskId,
      planned_start: task.planned_start,
      planned_end,
      duration_days: duration,
    },
    cascade_changes: changes,
    cascade_summary,
    material_movements,
    materials_moved,
  }
}

// AC-DL-1/2/3: log a delay against a task. Moves the task's planned_end to a
// strictly later user-picked date, runs cascade_task_dates() to propagate the
// delta to every downstream task + material order-by date, and returns the
// unified cascade summary plus the count of materials whose order_by_date
// shifted (the PG function updates them via the same transaction).
//
// Offline-first (AC-DL-4): the client UI queues the action when offline; that
// queueing lives in the client component. This server action is the authoritative
// write path and is safe to replay — the cascade RPC is transactional and
// idempotent on identical input.
export async function logTaskDelay(
  input: LogTaskDelayInput
): Promise<LogTaskDelayResult> {
  if (!input.projectId || !input.taskId) {
    return { ok: false, error: 'Project and task required' }
  }

  const supabase = (await createClient()) as unknown as LooseClient
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'You must be signed in' }

  const owned = await verifyProjectOwnership(supabase, input.projectId, user.id)
  if (!owned.ok) return owned

  const taskRes = await supabase
    .from('tasks')
    .select('id, project_id, stage_id, name, planned_start, planned_end')
    .eq('id', input.taskId)
    .single()
  if (taskRes.error || !taskRes.data) {
    return { ok: false, error: 'Task not found' }
  }
  const task = taskRes.data as {
    id: string
    project_id: string
    stage_id: string
    name: string
    planned_start: string
    planned_end: string
  }
  if (task.project_id !== input.projectId) {
    return { ok: false, error: 'Task not found' }
  }

  const validated = validateDelayDate(task.planned_end, input.newPlannedEnd)
  if (!validated.ok) {
    return { ok: false, error: validated.error }
  }

  // cascade_task_dates holds planned_start and shifts planned_end forward. The
  // SQL function recalculates downstream dates + material order_by_dates in a
  // single transaction.
  const cascadeRes = await supabase.rpc('cascade_task_dates', {
    p_task_id: input.taskId,
    p_new_planned_start: task.planned_start,
    p_new_planned_end: input.newPlannedEnd,
  })
  if (cascadeRes.error) {
    return { ok: false, error: `Cascade failed: ${cascadeRes.error.message}` }
  }

  const changes = (cascadeRes.data as CascadeResult[] | null) ?? []

  // AC-CMS-1/AC-CMS-2: build the MaterialMovement list so the post-cascade
  // overlay can enumerate which materials moved (not just a count). The SQL
  // cascade already wrote the new order_by_date values; this mirrors that
  // math in JS using each task's old/new planned_start.
  const affectedTaskIds = [input.taskId, ...changes.map(c => c.task_id)]
  const taskOldStarts: Record<string, string> = {
    [input.taskId]: task.planned_start,
  }
  const taskNewStarts: Record<string, string> = {
    [input.taskId]: task.planned_start,
  }
  const taskNameById: Record<string, string> = { [input.taskId]: task.name }
  for (const c of changes) {
    taskOldStarts[c.task_id] = c.old_planned_start
    taskNewStarts[c.task_id] = c.new_planned_start
    taskNameById[c.task_id] = c.task_name
  }
  const materials = await loadCascadeMaterials(
    supabase,
    affectedTaskIds,
    taskNameById
  )
  const material_movements = buildMaterialMovements(
    materials,
    taskOldStarts,
    taskNewStarts
  )
  // Count only materials whose order_by_date actually shifted — the trigger
  // task's own materials are touched by the SQL UPDATE but their planned_start
  // is unchanged, so they contribute delta_days === 0 and don't "move".
  const materials_moved = material_movements.filter(
    m => m.delta_days !== 0 && m.delta_days !== null
  ).length

  // AC-CMS-3/AC-CMS-4: /materials and /briefing both render material
  // order_by_date — revalidate so the updated values appear immediately.
  revalidatePath('/schedule')
  revalidatePath('/briefing')
  revalidatePath('/materials')
  revalidatePath(`/stages/${task.stage_id}`)
  revalidatePath(`/tasks/${input.taskId}`)

  const cascade_summary = buildCascadeSummary(
    {
      task_id: input.taskId,
      task_name: task.name,
      old_planned_start: task.planned_start,
      old_planned_end: task.planned_end,
      new_planned_start: task.planned_start,
      new_planned_end: input.newPlannedEnd,
    },
    changes
  )

  // AC-SA-1: record shift alerts for every task + material that moved
  const taskAlerts = buildTaskShiftAlerts(cascade_summary.movements, input.projectId, user.id)
  const matAlerts = buildMaterialShiftAlerts(material_movements, input.projectId, user.id)
  await insertShiftAlerts(supabase, [...taskAlerts, ...matAlerts])

  return { ok: true, cascade_summary, material_movements, materials_moved }
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

// ---------------------------------------------------------------------------
// AC-DV-1: Add a dependency to an existing task with cycle detection.
// ---------------------------------------------------------------------------

export type AddDependencyInput = {
  projectId: string
  taskId: string
  dependsOnTaskId: string
}

export type AddDependencyResult =
  | { ok: true }
  | { ok: false; error: string; field?: 'depends_on' }

export async function addDependency(
  input: AddDependencyInput
): Promise<AddDependencyResult> {
  if (!input.projectId || !input.taskId || !input.dependsOnTaskId) {
    return { ok: false, error: 'Project, task, and dependency required' }
  }
  if (input.taskId === input.dependsOnTaskId) {
    return {
      ok: false,
      error: 'A task cannot depend on itself',
      field: 'depends_on',
    }
  }

  const supabase = (await createClient()) as unknown as LooseClient
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'You must be signed in' }

  const owned = await verifyProjectOwnership(supabase, input.projectId, user.id)
  if (!owned.ok) return owned

  // Verify both tasks belong to the project.
  const tasksRes = await supabase
    .from('tasks')
    .select('id, name, project_id, stage_id')
    .in('id', [input.taskId, input.dependsOnTaskId])
  if (tasksRes.error || !tasksRes.data) {
    return { ok: false, error: 'Task not found' }
  }
  const rows = tasksRes.data as Array<{
    id: string; name: string; project_id: string; stage_id: string
  }>
  if (rows.length !== 2) {
    return { ok: false, error: 'Task not found', field: 'depends_on' }
  }
  for (const row of rows) {
    if (row.project_id !== input.projectId) {
      return { ok: false, error: 'Task not found', field: 'depends_on' }
    }
  }

  // Build task name map for error message.
  const allTasksRes = await supabase
    .from('tasks')
    .select('id, name')
    .eq('project_id', input.projectId)
  const taskNames: Record<string, string> = {}
  for (const t of (allTasksRes.data ?? []) as Array<{ id: string; name: string }>) {
    taskNames[t.id] = t.name
  }

  // Load all project dependency edges for cycle detection.
  const projectTaskIds = Object.keys(taskNames)
  const allDepsRes = await supabase
    .from('task_dependencies')
    .select('task_id, depends_on_task_id')
    .in('task_id', projectTaskIds)
  const existingEdges: DependencyEdge[] = (allDepsRes.data ?? []) as DependencyEdge[]

  // AC-DV-1 + AC-DV-3: DFS cycle detection.
  const cycleResult = detectCycle(existingEdges, {
    taskId: input.taskId,
    newDependency: input.dependsOnTaskId,
  })
  if (cycleResult) {
    return {
      ok: false,
      error: formatCyclePath(cycleResult.cycle, taskNames),
      field: 'depends_on',
    }
  }

  // Check for duplicate edge (idempotent — don't error, just succeed).
  const existing = existingEdges.find(
    e => e.task_id === input.taskId && e.depends_on_task_id === input.dependsOnTaskId
  )
  if (existing) {
    return { ok: true }
  }

  const ins = await supabase.from('task_dependencies').insert({
    task_id: input.taskId,
    depends_on_task_id: input.dependsOnTaskId,
  })
  if (ins.error) {
    return { ok: false, error: `Failed to add dependency: ${ins.error.message}` }
  }

  const taskRow = rows.find(r => r.id === input.taskId)!
  revalidatePath('/schedule')
  revalidatePath(`/stages/${taskRow.stage_id}`)
  revalidatePath(`/tasks/${input.taskId}`)

  return { ok: true }
}

// ---------------------------------------------------------------------------
// AC-DV-1: Remove a dependency from an existing task.
// ---------------------------------------------------------------------------

export type RemoveDependencyResult =
  | { ok: true }
  | { ok: false; error: string }

export async function removeDependency(
  projectId: string,
  taskId: string,
  dependsOnTaskId: string
): Promise<RemoveDependencyResult> {
  if (!projectId || !taskId || !dependsOnTaskId) {
    return { ok: false, error: 'Project, task, and dependency required' }
  }

  const supabase = (await createClient()) as unknown as LooseClient
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'You must be signed in' }

  const owned = await verifyProjectOwnership(supabase, projectId, user.id)
  if (!owned.ok) return owned

  // Verify task belongs to project.
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

  const del = await supabase
    .from('task_dependencies')
    .delete()
    .eq('task_id', taskId)
    .eq('depends_on_task_id', dependsOnTaskId)
  if (del.error) {
    return { ok: false, error: `Failed to remove dependency: ${del.error.message}` }
  }

  revalidatePath('/schedule')
  revalidatePath(`/stages/${task.stage_id}`)
  revalidatePath(`/tasks/${taskId}`)

  return { ok: true }
}

// ---------------------------------------------------------------------------
// AC-DV-2: Clean stale dependencies for a set of tasks (remove edges
// referencing task IDs that no longer exist). Called on page load.
// ---------------------------------------------------------------------------

export type CleanStaleDepsResult =
  | { ok: true; removed_count: number }
  | { ok: false; error: string }

export async function cleanStaleDependencies(
  projectId: string
): Promise<CleanStaleDepsResult> {
  if (!projectId) return { ok: false, error: 'Project required' }

  const supabase = (await createClient()) as unknown as LooseClient
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'You must be signed in' }

  const owned = await verifyProjectOwnership(supabase, projectId, user.id)
  if (!owned.ok) return owned

  // Load all project task IDs.
  const tasksRes = await supabase
    .from('tasks')
    .select('id')
    .eq('project_id', projectId)
  if (tasksRes.error) return { ok: false, error: 'Failed to load tasks' }
  const validTaskIds = new Set(
    (tasksRes.data as Array<{ id: string }>).map(t => t.id)
  )

  // Load all dependency edges for these tasks.
  const depsRes = await supabase
    .from('task_dependencies')
    .select('task_id, depends_on_task_id')
    .in('task_id', [...validTaskIds])
  if (depsRes.error) return { ok: false, error: 'Failed to load dependencies' }

  const allEdges: DependencyEdge[] = (depsRes.data ?? []) as DependencyEdge[]
  const { removed } = removeStaleDependencies(allEdges, validTaskIds)

  if (removed.length === 0) return { ok: true, removed_count: 0 }

  // Delete stale edges one by one (composite PK, no batch delete by PK pair).
  for (const edge of removed) {
    await supabase
      .from('task_dependencies')
      .delete()
      .eq('task_id', edge.task_id)
      .eq('depends_on_task_id', edge.depends_on_task_id)
  }

  revalidatePath('/schedule')
  return { ok: true, removed_count: removed.length }
}
