'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import {
  validateTradeInput,
  normalizePhone,
  type TradeFormField,
} from '@/lib/trades/operations'

// lib/supabase/types.ts lacks Relationships[] on every table (foundation-eval
// finding). Cast at the call site — same pattern as stages.ts / tasks.ts.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LooseClient = any

export type TradeRecord = {
  id: string
  project_id: string
  name: string
  specialty: string | null
  phone: string | null
  email: string | null
  notes: string | null
}

export type CreateTradeInput = {
  projectId: string
  name: string
  specialty: string
  phone: string
  email: string
  notes?: string
}

export type UpdateTradeInput = {
  projectId: string
  tradeId: string
  name: string
  specialty: string
  phone: string
  email: string
  notes?: string
}

export type TradeMutationResult =
  | { ok: true; trade: TradeRecord }
  | { ok: false; error: string; field?: TradeFormField }

export type AssignTradeInput = {
  projectId: string
  taskId: string
  tradeId: string | null
}

export type AssignTradeResult =
  | { ok: true; trade_id: string | null }
  | { ok: false; error: string }

export type DeleteTradeOutcome =
  | { ok: true; deleted: true; requiresConfirmation: false }
  | { ok: true; deleted: false; requiresConfirmation: true; assignedTaskCount: number }
  | { ok: false; error: string }

async function verifyProjectOwnership(
  supabase: LooseClient,
  projectId: string,
  userId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const res = await supabase
    .from('projects')
    .select('id, user_id')
    .eq('id', projectId)
    .single()
  if (res.error || !res.data) return { ok: false, error: 'Project not found' }
  const p = res.data as { id: string; user_id: string }
  if (p.user_id !== userId) return { ok: false, error: 'Project not found' }
  return { ok: true }
}

function toInsertPayload(values: {
  name: string
  specialty: string
  phone: string
  email: string
  notes?: string
}) {
  return {
    name: values.name.trim(),
    specialty: values.specialty.trim() || null,
    phone: normalizePhone(values.phone),
    email: values.email.trim() || null,
    notes: values.notes?.trim() || null,
  }
}

// AC-TR-1: create a new trade contact on a project.
export async function createTrade(
  input: CreateTradeInput
): Promise<TradeMutationResult> {
  if (!input.projectId) return { ok: false, error: 'Project required' }

  const validated = validateTradeInput({
    name: input.name,
    specialty: input.specialty,
    phone: input.phone,
    email: input.email,
  })
  if (!validated.ok) {
    const firstField = (Object.keys(validated.errors) as TradeFormField[])[0]
    return {
      ok: false,
      error: validated.errors[firstField] ?? 'Invalid trade',
      field: firstField,
    }
  }

  const supabase = (await createClient()) as unknown as LooseClient
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'You must be signed in' }

  const owned = await verifyProjectOwnership(supabase, input.projectId, user.id)
  if (!owned.ok) return owned

  const ins = await supabase
    .from('trades')
    .insert({
      project_id: input.projectId,
      ...toInsertPayload(input),
    })
    .select('id, project_id, name, specialty, phone, email, notes')
    .single()

  if (ins.error || !ins.data) {
    return { ok: false, error: `Failed to create trade: ${ins.error?.message ?? 'unknown'}` }
  }

  revalidatePath('/trades')
  revalidatePath('/', 'layout')
  return { ok: true, trade: ins.data as TradeRecord }
}

// Update an existing trade (name, specialty, phone, email, notes).
export async function updateTrade(
  input: UpdateTradeInput
): Promise<TradeMutationResult> {
  if (!input.projectId || !input.tradeId) {
    return { ok: false, error: 'Project and trade required' }
  }

  const validated = validateTradeInput({
    name: input.name,
    specialty: input.specialty,
    phone: input.phone,
    email: input.email,
  })
  if (!validated.ok) {
    const firstField = (Object.keys(validated.errors) as TradeFormField[])[0]
    return {
      ok: false,
      error: validated.errors[firstField] ?? 'Invalid trade',
      field: firstField,
    }
  }

  const supabase = (await createClient()) as unknown as LooseClient
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'You must be signed in' }

  const owned = await verifyProjectOwnership(supabase, input.projectId, user.id)
  if (!owned.ok) return owned

  const existing = await supabase
    .from('trades')
    .select('id, project_id')
    .eq('id', input.tradeId)
    .single()
  if (existing.error || !existing.data) {
    return { ok: false, error: 'Trade not found' }
  }
  if ((existing.data as { project_id: string }).project_id !== input.projectId) {
    return { ok: false, error: 'Trade not found' }
  }

  const upd = await supabase
    .from('trades')
    .update(toInsertPayload(input))
    .eq('id', input.tradeId)
    .eq('project_id', input.projectId)
    .select('id, project_id, name, specialty, phone, email, notes')
    .single()

  if (upd.error || !upd.data) {
    return { ok: false, error: `Failed to update trade: ${upd.error?.message ?? 'unknown'}` }
  }

  revalidatePath('/trades')
  revalidatePath('/', 'layout')
  return { ok: true, trade: upd.data as TradeRecord }
}

// AC-TR-4: delete a trade. If it's assigned to any tasks and confirmed=false,
// return the assignment count so the UI can prompt. On confirm (or if no
// assignments), null out task.trade_id for every assignment, then delete.
// Server re-counts independently — defense in depth against stale clients.
export async function deleteTrade(
  projectId: string,
  tradeId: string,
  confirmed: boolean
): Promise<DeleteTradeOutcome> {
  if (!projectId || !tradeId) {
    return { ok: false, error: 'Trade and project required' }
  }

  const supabase = (await createClient()) as unknown as LooseClient
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'You must be signed in' }

  const owned = await verifyProjectOwnership(supabase, projectId, user.id)
  if (!owned.ok) return owned

  const tradeRes = await supabase
    .from('trades')
    .select('id, project_id')
    .eq('id', tradeId)
    .single()
  if (tradeRes.error || !tradeRes.data) {
    return { ok: false, error: 'Trade not found' }
  }
  if ((tradeRes.data as { project_id: string }).project_id !== projectId) {
    return { ok: false, error: 'Trade not found' }
  }

  const assignedRes = await supabase
    .from('tasks')
    .select('id', { count: 'exact', head: true })
    .eq('trade_id', tradeId)
    .eq('project_id', projectId)
  const assignedTaskCount = assignedRes.count ?? 0

  if (assignedTaskCount > 0 && !confirmed) {
    return {
      ok: true,
      deleted: false,
      requiresConfirmation: true,
      assignedTaskCount,
    }
  }

  // Null out trade_id on every assigned task first (so the FK-constrained
  // delete never fails and so task rows stay consistent with the UI).
  if (assignedTaskCount > 0) {
    const unassign = await supabase
      .from('tasks')
      .update({ trade_id: null })
      .eq('trade_id', tradeId)
      .eq('project_id', projectId)
    if (unassign.error) {
      return {
        ok: false,
        error: `Failed to unassign tasks: ${unassign.error.message}`,
      }
    }
  }

  const del = await supabase
    .from('trades')
    .delete()
    .eq('id', tradeId)
    .eq('project_id', projectId)
  if (del.error) {
    return { ok: false, error: `Failed to delete trade: ${del.error.message}` }
  }

  revalidatePath('/trades')
  revalidatePath('/', 'layout')
  return { ok: true, deleted: true, requiresConfirmation: false }
}

// AC-TR-2: assign (or unassign with tradeId=null) a trade to a task.
export async function assignTradeToTask(
  input: AssignTradeInput
): Promise<AssignTradeResult> {
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
    .select('id, project_id, stage_id')
    .eq('id', input.taskId)
    .single()
  if (taskRes.error || !taskRes.data) {
    return { ok: false, error: 'Task not found' }
  }
  const task = taskRes.data as {
    id: string
    project_id: string
    stage_id: string | null
  }
  if (task.project_id !== input.projectId) {
    return { ok: false, error: 'Task not found' }
  }

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

  const upd = await supabase
    .from('tasks')
    .update({ trade_id: input.tradeId })
    .eq('id', input.taskId)
    .eq('project_id', input.projectId)
  if (upd.error) {
    return { ok: false, error: `Failed to assign trade: ${upd.error.message}` }
  }

  revalidatePath(`/tasks/${input.taskId}`)
  if (task.stage_id) revalidatePath(`/stages/${task.stage_id}`)
  revalidatePath('/schedule')
  return { ok: true, trade_id: input.tradeId }
}
