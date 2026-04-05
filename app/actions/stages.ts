'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { validateStageInput, normalizeStageColor } from '@/lib/stages/operations'

// lib/supabase/types.ts lacks Relationships[] on every table (foundation-eval
// finding). Cast at the call site — same pattern as templates.ts / projects.ts.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LooseClient = any

export type CreateStageInput = {
  projectId: string
  name: string
  color: string
}

export type CreateStageResult =
  | { ok: true; stage: { id: string; name: string; color: string; order_index: number } }
  | { ok: false; error: string; field?: 'name' | 'color' }

export type StageActionResult =
  | { ok: true }
  | { ok: false; error: string }

export type DeleteStageOutcome =
  | { ok: true; deleted: boolean; requiresConfirmation: false }
  | { ok: true; deleted: false; requiresConfirmation: true; taskCount: number }
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

// AC-SM-1: Create a new stage on a project. The stage is appended to the end
// of the list unless an explicit order_index is supplied by the caller.
export async function createStage(input: CreateStageInput): Promise<CreateStageResult> {
  if (!input.projectId) return { ok: false, error: 'Project required' }

  const validated = validateStageInput({ name: input.name, color: input.color })
  if (!validated.ok) {
    const firstField = (Object.keys(validated.errors) as Array<'name' | 'color'>)[0]
    return {
      ok: false,
      error: validated.errors[firstField] ?? 'Invalid stage',
      field: firstField,
    }
  }

  const supabase = (await createClient()) as unknown as LooseClient
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'You must be signed in' }

  const owned = await verifyProjectOwnership(supabase, input.projectId, user.id)
  if (!owned.ok) return owned

  // Place the new stage at the end. We read the max(order_index) directly
  // rather than counting rows so a prior delete+reorder (gaps) still works.
  const maxRes = await supabase
    .from('stages')
    .select('order_index')
    .eq('project_id', input.projectId)
    .order('order_index', { ascending: false })
    .limit(1)
  const currentMax =
    maxRes.data && maxRes.data.length > 0
      ? (maxRes.data[0] as { order_index: number }).order_index
      : -1
  const nextIndex = currentMax + 1

  const ins = await supabase
    .from('stages')
    .insert({
      project_id: input.projectId,
      name: input.name.trim(),
      color: normalizeStageColor(input.color),
      order_index: nextIndex,
    })
    .select('id, name, color, order_index')
    .single()

  if (ins.error || !ins.data) {
    return { ok: false, error: `Failed to create stage: ${ins.error?.message ?? 'unknown'}` }
  }

  revalidatePath('/schedule')
  revalidatePath('/', 'layout')
  return {
    ok: true,
    stage: ins.data as { id: string; name: string; color: string; order_index: number },
  }
}

// AC-SM-2: Persist a reordered stage list. Caller passes the new ordering;
// we write each stage's new order_index. The pure reorderStages() helper
// produced the dense 0..N-1 sequence.
export async function reorderProjectStages(
  projectId: string,
  orderedStageIds: string[]
): Promise<StageActionResult> {
  if (!projectId) return { ok: false, error: 'Project required' }
  if (!Array.isArray(orderedStageIds) || orderedStageIds.length === 0) {
    return { ok: false, error: 'No stages to reorder' }
  }

  const supabase = (await createClient()) as unknown as LooseClient
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'You must be signed in' }

  const owned = await verifyProjectOwnership(supabase, projectId, user.id)
  if (!owned.ok) return owned

  // Verify every id belongs to this project before we mutate anything.
  const existing = await supabase
    .from('stages')
    .select('id')
    .eq('project_id', projectId)
  if (existing.error || !existing.data) {
    return { ok: false, error: 'Failed to load stages' }
  }
  const existingIds = new Set(
    (existing.data as Array<{ id: string }>).map(s => s.id)
  )
  if (orderedStageIds.length !== existingIds.size) {
    return { ok: false, error: 'Ordering must include every stage' }
  }
  for (const id of orderedStageIds) {
    if (!existingIds.has(id)) return { ok: false, error: 'Unknown stage in ordering' }
  }

  // Two-phase update to side-step any transient UNIQUE(project_id, order_index)
  // constraints: first push each stage to a negative tombstone, then write its
  // final slot. There's no unique constraint today, but the tombstone step
  // keeps this safe if one is added later.
  for (let i = 0; i < orderedStageIds.length; i++) {
    const tomb = await supabase
      .from('stages')
      .update({ order_index: -1 - i })
      .eq('id', orderedStageIds[i])
      .eq('project_id', projectId)
    if (tomb.error) {
      return { ok: false, error: `Failed to reorder: ${tomb.error.message}` }
    }
  }
  for (let i = 0; i < orderedStageIds.length; i++) {
    const upd = await supabase
      .from('stages')
      .update({ order_index: i })
      .eq('id', orderedStageIds[i])
      .eq('project_id', projectId)
    if (upd.error) {
      return { ok: false, error: `Failed to reorder: ${upd.error.message}` }
    }
  }

  revalidatePath('/schedule')
  return { ok: true }
}

// AC-SM-3 / AC-SM-4: Delete a stage. If the stage has tasks and `confirmed`
// is not set, return requiresConfirmation=true with the task count. If
// confirmed or empty, perform the delete (cascade removes tasks + materials).
export async function deleteStage(
  projectId: string,
  stageId: string,
  confirmed: boolean
): Promise<DeleteStageOutcome> {
  if (!projectId || !stageId) return { ok: false, error: 'Stage and project required' }

  const supabase = (await createClient()) as unknown as LooseClient
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'You must be signed in' }

  const owned = await verifyProjectOwnership(supabase, projectId, user.id)
  if (!owned.ok) return owned

  // Verify the stage belongs to this project
  const stageRes = await supabase
    .from('stages')
    .select('id, project_id')
    .eq('id', stageId)
    .single()
  if (stageRes.error || !stageRes.data) {
    return { ok: false, error: 'Stage not found' }
  }
  if ((stageRes.data as { project_id: string }).project_id !== projectId) {
    return { ok: false, error: 'Stage not found' }
  }

  const taskCountRes = await supabase
    .from('tasks')
    .select('id', { count: 'exact', head: true })
    .eq('stage_id', stageId)
  const taskCount = taskCountRes.count ?? 0

  if (taskCount > 0 && !confirmed) {
    return {
      ok: true,
      deleted: false,
      requiresConfirmation: true,
      taskCount,
    }
  }

  const del = await supabase
    .from('stages')
    .delete()
    .eq('id', stageId)
    .eq('project_id', projectId)
  if (del.error) {
    return { ok: false, error: `Failed to delete stage: ${del.error.message}` }
  }

  // Re-densify order_index on remaining stages so the list stays [0..N-1].
  const remaining = await supabase
    .from('stages')
    .select('id, order_index')
    .eq('project_id', projectId)
    .order('order_index', { ascending: true })
  if (!remaining.error && remaining.data) {
    const rows = remaining.data as Array<{ id: string; order_index: number }>
    for (let i = 0; i < rows.length; i++) {
      if (rows[i].order_index !== i) {
        await supabase
          .from('stages')
          .update({ order_index: i })
          .eq('id', rows[i].id)
          .eq('project_id', projectId)
      }
    }
  }

  revalidatePath('/schedule')
  revalidatePath('/', 'layout')
  return { ok: true, deleted: true, requiresConfirmation: false }
}
