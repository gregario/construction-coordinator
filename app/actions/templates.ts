'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import {
  buildTemplateInsertPlan,
  type TemplateStageDef,
} from '@/lib/templates/apply'

export type ApplyTemplateResult =
  | { ok: true }
  | { ok: false; error: string }

// Untyped view of the Supabase client. lib/supabase/types.ts lacks Relationships[]
// and the templates table, so typed queries resolve to `never`. Cast at call sites
// per the foundation-eval finding; feature code imports domain types from
// @/types/database for safety.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LooseClient = any

export async function applyTemplate(
  templateId: string,
  projectId: string
): Promise<ApplyTemplateResult> {
  if (!templateId || !projectId) {
    return { ok: false, error: 'Template and project are required' }
  }

  const supabase = (await createClient()) as unknown as LooseClient

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'You must be signed in' }

  // 1. Verify the project belongs to this user and is still in setup
  const projectRes = await supabase
    .from('projects')
    .select('id, user_id, start_date, status')
    .eq('id', projectId)
    .single()

  if (projectRes.error || !projectRes.data) {
    return { ok: false, error: 'Project not found' }
  }
  const project = projectRes.data as {
    id: string
    user_id: string
    start_date: string
    status: string
  }
  if (project.user_id !== user.id) {
    return { ok: false, error: 'Project not found' }
  }
  if (project.status !== 'setup') {
    return { ok: false, error: 'Template can only be applied during project setup' }
  }

  // 2. Load the template
  const tplRes = await supabase
    .from('templates')
    .select('id, name, stages')
    .eq('id', templateId)
    .single()

  if (tplRes.error || !tplRes.data) {
    return { ok: false, error: 'Template not found' }
  }
  const templateRow = tplRes.data as { id: string; name: string; stages: TemplateStageDef[] }

  // 3. Build the insert plan using pure logic
  const plan = buildTemplateInsertPlan(
    templateRow.stages,
    project.id,
    project.start_date
  )

  if (plan.stages.length === 0) {
    return { ok: false, error: 'Template has no stages to apply' }
  }

  // 4. Insert stages → get back real ids keyed by order_index (= _localId 's{N}')
  const stageRows = plan.stages.map(s => ({
    project_id: s.project_id,
    name: s.name,
    color: s.color,
    order_index: s.order_index,
  }))

  const stageInsert = await supabase
    .from('stages')
    .insert(stageRows)
    .select('id, order_index')

  if (stageInsert.error || !stageInsert.data) {
    return { ok: false, error: `Failed to insert stages: ${stageInsert.error?.message ?? 'unknown'}` }
  }

  const stageIdByLocalId = new Map<string, string>()
  for (const row of stageInsert.data as Array<{ id: string; order_index: number }>) {
    stageIdByLocalId.set(`s${row.order_index}`, row.id)
  }

  // 5. Insert tasks with resolved stage_id
  const taskIdByLocalId = new Map<string, string>()
  if (plan.tasks.length > 0) {
    const taskRows = plan.tasks.map(t => ({
      project_id: t.project_id,
      stage_id: stageIdByLocalId.get(t._stageLocalId),
      name: t.name,
      duration_days: t.duration_days,
      planned_start: t.planned_start,
      planned_end: t.planned_end,
      notes: t.notes,
      order_index: t.order_index,
      status: t.status,
    }))

    const taskInsert = await supabase
      .from('tasks')
      .insert(taskRows)
      .select('id, stage_id, order_index')

    if (taskInsert.error || !taskInsert.data) {
      return { ok: false, error: `Failed to insert tasks: ${taskInsert.error?.message ?? 'unknown'}` }
    }

    // Invert the stage map once for efficient lookup
    const stageLocalByRealId = new Map<string, string>()
    for (const [localId, realId] of stageIdByLocalId.entries()) {
      stageLocalByRealId.set(realId, localId)
    }

    for (const row of taskInsert.data as Array<{ id: string; stage_id: string; order_index: number }>) {
      const stageLocal = stageLocalByRealId.get(row.stage_id)
      if (!stageLocal) continue
      const stageIdx = Number(stageLocal.slice(1))
      taskIdByLocalId.set(`t${stageIdx}-${row.order_index}`, row.id)
    }
  }

  // 6. Insert materials with resolved task_id
  if (plan.materials.length > 0) {
    const materialRows = plan.materials
      .map(m => {
        const taskId = taskIdByLocalId.get(m._taskLocalId)
        if (!taskId) return null
        return {
          task_id: taskId,
          name: m.name,
          quantity: m.quantity,
          lead_time_days: m.lead_time_days,
          order_by_date: m.order_by_date,
          order_status: m.order_status,
          supplier_name: m.supplier_name,
          notes: m.notes,
          estimated_cost: m.estimated_cost,
        }
      })
      .filter((r): r is NonNullable<typeof r> => r !== null)

    if (materialRows.length > 0) {
      const matInsert = await supabase.from('materials').insert(materialRows)
      if (matInsert.error) {
        return { ok: false, error: `Failed to insert materials: ${matInsert.error.message}` }
      }
    }
  }

  revalidatePath('/setup')
  revalidatePath('/', 'layout')
  redirect('/setup')
}
