'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import {
  validateMaterialInput,
  parseEstimatedCost,
  computeOrderByDate,
  type MaterialFormField,
  type MaterialFormValues,
  type MaterialOrderStatusValue,
} from '@/lib/materials/operations'

// lib/supabase/types.ts lacks Relationships[] — same cast pattern as the
// other action modules (trades.ts, tasks.ts, stages.ts).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LooseClient = any

export type MaterialRecord = {
  id: string
  task_id: string
  name: string
  quantity: string | null
  lead_time_days: number
  order_by_date: string | null
  order_status: MaterialOrderStatusValue
  estimated_cost: number | null
  supplier_name: string | null
  notes: string | null
}

export type MaterialMutationResult =
  | { ok: true; material: MaterialRecord }
  | { ok: false; error: string; field?: MaterialFormField }

export type DeleteMaterialResult =
  | { ok: true }
  | { ok: false; error: string }

export type CreateMaterialInput = {
  projectId: string
  taskId: string
} & MaterialFormValues

export type UpdateMaterialInput = {
  projectId: string
  materialId: string
} & MaterialFormValues

async function verifyTaskOwnership(
  supabase: LooseClient,
  projectId: string,
  taskId: string,
  userId: string
): Promise<
  | { ok: true; task: { id: string; project_id: string; planned_start: string | null } }
  | { ok: false; error: string }
> {
  const projRes = await supabase
    .from('projects')
    .select('id, user_id')
    .eq('id', projectId)
    .single()
  if (projRes.error || !projRes.data) return { ok: false, error: 'Project not found' }
  if ((projRes.data as { user_id: string }).user_id !== userId) {
    return { ok: false, error: 'Project not found' }
  }

  const taskRes = await supabase
    .from('tasks')
    .select('id, project_id, planned_start')
    .eq('id', taskId)
    .single()
  if (taskRes.error || !taskRes.data) return { ok: false, error: 'Task not found' }
  const task = taskRes.data as {
    id: string
    project_id: string
    planned_start: string | null
  }
  if (task.project_id !== projectId) return { ok: false, error: 'Task not found' }
  return { ok: true, task }
}

function toPayload(values: MaterialFormValues, leadTimeDays: number) {
  return {
    name: values.name.trim(),
    quantity: values.quantity.trim() || null,
    lead_time_days: leadTimeDays,
    estimated_cost: parseEstimatedCost(values.estimated_cost),
    supplier_name: values.supplier_name.trim() || null,
    notes: values.notes.trim() || null,
  }
}

function firstFieldError(
  errors: Record<string, string | undefined>
): MaterialFormField | undefined {
  return (Object.keys(errors) as MaterialFormField[])[0]
}

// AC-ML-1 / AC-ML-2: create a new material on a task.
export async function createMaterial(
  input: CreateMaterialInput
): Promise<MaterialMutationResult> {
  if (!input.projectId || !input.taskId) {
    return { ok: false, error: 'Project and task required' }
  }

  const validated = validateMaterialInput(input)
  if (!validated.ok) {
    const field = firstFieldError(validated.errors)
    return {
      ok: false,
      error: (field && validated.errors[field]) || 'Invalid material',
      field,
    }
  }

  const supabase = (await createClient()) as unknown as LooseClient
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'You must be signed in' }

  const owned = await verifyTaskOwnership(
    supabase,
    input.projectId,
    input.taskId,
    user.id
  )
  if (!owned.ok) return owned

  const leadTimeDays = Number(input.lead_time_days)
  const payload = toPayload(input, leadTimeDays)
  const order_by_date = computeOrderByDate(owned.task.planned_start, leadTimeDays)

  const ins = await supabase
    .from('materials')
    .insert({
      task_id: input.taskId,
      ...payload,
      order_by_date,
    })
    .select(
      'id, task_id, name, quantity, lead_time_days, order_by_date, order_status, estimated_cost, supplier_name, notes'
    )
    .single()

  if (ins.error || !ins.data) {
    return {
      ok: false,
      error: `Failed to create material: ${ins.error?.message ?? 'unknown'}`,
    }
  }

  revalidatePath(`/tasks/${input.taskId}`)
  revalidatePath('/materials')
  return { ok: true, material: ins.data as MaterialRecord }
}

// AC-ML-4: update a material. If lead_time_days changed, order_by_date is
// recalculated from the task's current planned_start.
export async function updateMaterial(
  input: UpdateMaterialInput
): Promise<MaterialMutationResult> {
  if (!input.projectId || !input.materialId) {
    return { ok: false, error: 'Project and material required' }
  }

  const validated = validateMaterialInput(input)
  if (!validated.ok) {
    const field = firstFieldError(validated.errors)
    return {
      ok: false,
      error: (field && validated.errors[field]) || 'Invalid material',
      field,
    }
  }

  const supabase = (await createClient()) as unknown as LooseClient
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'You must be signed in' }

  // Load the material + its task (to scope ownership and compute order_by_date).
  const matRes = await supabase
    .from('materials')
    .select('id, task_id, lead_time_days')
    .eq('id', input.materialId)
    .single()
  if (matRes.error || !matRes.data) {
    return { ok: false, error: 'Material not found' }
  }
  const existing = matRes.data as {
    id: string
    task_id: string
    lead_time_days: number
  }

  const owned = await verifyTaskOwnership(
    supabase,
    input.projectId,
    existing.task_id,
    user.id
  )
  if (!owned.ok) return owned

  const leadTimeDays = Number(input.lead_time_days)
  const payload = toPayload(input, leadTimeDays)
  // AC-ML-4: recompute order_by_date only when lead_time_days changed OR when
  // the stored order_by_date is missing. (The schema trigger keeps this fresh
  // on task-date cascades; here we only need to handle user-edited inputs.)
  const order_by_date = computeOrderByDate(owned.task.planned_start, leadTimeDays)

  const upd = await supabase
    .from('materials')
    .update({
      ...payload,
      order_by_date,
    })
    .eq('id', input.materialId)
    .select(
      'id, task_id, name, quantity, lead_time_days, order_by_date, order_status, estimated_cost, supplier_name, notes'
    )
    .single()

  if (upd.error || !upd.data) {
    return {
      ok: false,
      error: `Failed to update material: ${upd.error?.message ?? 'unknown'}`,
    }
  }

  revalidatePath(`/tasks/${existing.task_id}`)
  revalidatePath('/materials')
  return { ok: true, material: upd.data as MaterialRecord }
}

// AC-MS-1 / AC-MS-2: update a material's order_status.
// Valid transitions: not_quoted→ordered, ordered→delivered. Delivered is terminal.
// (Also accepts a no-op re-assert for idempotency.)
export type UpdateMaterialStatusInput = {
  projectId: string
  materialId: string
  nextStatus: MaterialOrderStatusValue
}

export type UpdateMaterialStatusResult =
  | {
      ok: true
      material: { id: string; task_id: string; order_status: MaterialOrderStatusValue }
    }
  | { ok: false; error: string }

function isValidTransition(
  current: MaterialOrderStatusValue,
  next: MaterialOrderStatusValue
): boolean {
  if (current === next) return true
  if (current === 'not_quoted' && next === 'quoted') return true
  if (current === 'quoted' && next === 'ordered') return true
  if (current === 'ordered' && next === 'in_transit') return true
  if (current === 'in_transit' && next === 'delivered') return true
  return false
}

export async function updateMaterialStatus(
  input: UpdateMaterialStatusInput
): Promise<UpdateMaterialStatusResult> {
  if (!input.projectId || !input.materialId) {
    return { ok: false, error: 'Project and material required' }
  }

  const supabase = (await createClient()) as unknown as LooseClient
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'You must be signed in' }

  const matRes = await supabase
    .from('materials')
    .select('id, task_id, order_status')
    .eq('id', input.materialId)
    .single()
  if (matRes.error || !matRes.data) {
    return { ok: false, error: 'Material not found' }
  }
  const existing = matRes.data as {
    id: string
    task_id: string
    order_status: MaterialOrderStatusValue
  }

  const owned = await verifyTaskOwnership(
    supabase,
    input.projectId,
    existing.task_id,
    user.id
  )
  if (!owned.ok) return owned

  if (!isValidTransition(existing.order_status, input.nextStatus)) {
    return {
      ok: false,
      error: `Cannot move from ${existing.order_status} to ${input.nextStatus}`,
    }
  }

  const upd = await supabase
    .from('materials')
    .update({ order_status: input.nextStatus })
    .eq('id', input.materialId)
    .select('id, task_id, order_status')
    .single()

  if (upd.error || !upd.data) {
    return {
      ok: false,
      error: `Failed to update status: ${upd.error?.message ?? 'unknown'}`,
    }
  }

  revalidatePath(`/tasks/${existing.task_id}`)
  revalidatePath('/materials')
  return {
    ok: true,
    material: upd.data as {
      id: string
      task_id: string
      order_status: MaterialOrderStatusValue
    },
  }
}

// AC-ML-5: delete a material after confirmation. Server re-verifies ownership
// via the task's project — defense in depth against stale clients.
export async function deleteMaterial(
  projectId: string,
  materialId: string
): Promise<DeleteMaterialResult> {
  if (!projectId || !materialId) {
    return { ok: false, error: 'Project and material required' }
  }

  const supabase = (await createClient()) as unknown as LooseClient
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'You must be signed in' }

  const matRes = await supabase
    .from('materials')
    .select('id, task_id')
    .eq('id', materialId)
    .single()
  if (matRes.error || !matRes.data) {
    return { ok: false, error: 'Material not found' }
  }
  const taskId = (matRes.data as { task_id: string }).task_id

  const owned = await verifyTaskOwnership(supabase, projectId, taskId, user.id)
  if (!owned.ok) return owned

  const del = await supabase.from('materials').delete().eq('id', materialId)
  if (del.error) {
    return { ok: false, error: `Failed to delete material: ${del.error.message}` }
  }

  revalidatePath(`/tasks/${taskId}`)
  revalidatePath('/materials')
  return { ok: true }
}
