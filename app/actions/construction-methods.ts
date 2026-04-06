'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export type ConstructionMethod = {
  id: string
  category: string
  method_name: string
  variant: string | null
  description: string | null
  substages: SubstageTemplate[]
  default_duration_days: number
  display_order: number
}

export type SubstageTemplate = {
  name: string
  duration_days: number
  notes?: string
  materials?: {
    name: string
    quantity: string
    lead_time_days: number
    supplier_name?: string
  }[]
}

export const CATEGORY_ORDER = [
  'foundation',
  'structure',
  'doors_windows',
  'envelope_walls',
  'envelope_roof',
  'first_fix',
  'second_fix',
  'finishing',
  'external',
] as const

export const CATEGORY_LABELS: Record<string, string> = {
  foundation: 'Foundation',
  structure: 'Structure (Framing)',
  doors_windows: 'Doors & Windows',
  envelope_walls: 'Envelope — Walls',
  envelope_roof: 'Envelope — Roof',
  first_fix: '1st Fix',
  second_fix: '2nd Fix',
  finishing: 'Finishing',
  external: 'External',
}

export async function listMethodsByCategory(category: string): Promise<ConstructionMethod[]> {
  const supabase = await createClient()
  const { data } = await (supabase as any)
    .from('construction_methods')
    .select('*')
    .eq('category', category)
    .order('display_order', { ascending: true })
  return (data ?? []).map((row: any) => ({
    ...row,
    substages: Array.isArray(row.substages) ? row.substages : JSON.parse(row.substages || '[]'),
  })) as ConstructionMethod[]
}

export async function listAllMethods(): Promise<Record<string, ConstructionMethod[]>> {
  const supabase = await createClient()
  const { data } = await (supabase as any)
    .from('construction_methods')
    .select('*')
    .order('display_order', { ascending: true })

  const rows = (data ?? []) as any[]
  const byCategory: Record<string, ConstructionMethod[]> = {}
  for (const row of rows) {
    const cat = row.category
    if (!byCategory[cat]) byCategory[cat] = []
    byCategory[cat].push({
      ...row,
      substages: Array.isArray(row.substages) ? row.substages : JSON.parse(row.substages || '[]'),
    })
  }
  return byCategory
}

export type SchemeSelection = Record<string, string> // category → method_id

export async function applySchemeToBlock(
  blockId: string,
  projectId: string,
  selections: SchemeSelection,
  startDate: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Not authenticated' }

  // Verify ownership
  const { data: project } = await (supabase as any)
    .from('projects')
    .select('id, start_date')
    .eq('id', projectId)
    .eq('user_id', user.id)
    .maybeSingle()
  if (!project) return { ok: false, error: 'Project not found' }

  const effectiveStart = startDate || project.start_date

  // Load selected methods
  const methodIds = Object.values(selections)
  if (methodIds.length === 0) return { ok: false, error: 'No methods selected' }

  const { data: methods } = await (supabase as any)
    .from('construction_methods')
    .select('*')
    .in('id', methodIds)
  if (!methods || methods.length === 0) return { ok: false, error: 'Methods not found' }

  // Save the scheme on the block
  await (supabase as any)
    .from('blocks')
    .update({ construction_scheme: selections })
    .eq('id', blockId)

  // Delete existing stages for this block (re-apply)
  await (supabase as any)
    .from('stages')
    .delete()
    .eq('project_id', projectId)
    .eq('block_id', blockId)

  // Stage colors — one per category
  const STAGE_COLORS = [
    '#8B5E3C', '#6B8F3F', '#C17F3A', '#4A7FA5',
    '#7B6FA5', '#A56B4A', '#5A9A7A', '#9B7A6B', '#6B9A8F',
  ]

  // Generate stages and substages from selected methods
  let currentDate = new Date(effectiveStart + 'T00:00:00Z')
  let stageOrder = 0

  for (const category of CATEGORY_ORDER) {
    const methodId = selections[category]
    if (!methodId) continue

    const method = methods.find((m: any) => m.id === methodId)
    if (!method) continue

    const substages: SubstageTemplate[] = Array.isArray(method.substages)
      ? method.substages
      : JSON.parse(method.substages || '[]')

    // Create stage
    const stageName = CATEGORY_LABELS[category] || category
    const { data: stage } = await (supabase as any)
      .from('stages')
      .insert({
        project_id: projectId,
        block_id: blockId,
        name: stageName,
        color: STAGE_COLORS[stageOrder % STAGE_COLORS.length],
        order_index: stageOrder,
      })
      .select('id')
      .single()

    if (!stage) continue

    // Create substages (tasks in DB)
    let taskOrder = 0
    for (const sub of substages) {
      const plannedStart = currentDate.toISOString().split('T')[0]
      const endDate = new Date(currentDate)
      endDate.setUTCDate(endDate.getUTCDate() + (sub.duration_days - 1))
      const plannedEnd = endDate.toISOString().split('T')[0]

      const { data: task } = await (supabase as any)
        .from('tasks')
        .insert({
          project_id: projectId,
          stage_id: stage.id,
          name: sub.name,
          duration_days: sub.duration_days,
          planned_start: plannedStart,
          planned_end: plannedEnd,
          order_index: taskOrder,
          notes: sub.notes || null,
        })
        .select('id')
        .single()

      // Create materials if defined
      if (task && sub.materials) {
        for (const mat of sub.materials) {
          const orderByDate = new Date(currentDate)
          orderByDate.setUTCDate(orderByDate.getUTCDate() - mat.lead_time_days)
          await (supabase as any)
            .from('materials')
            .insert({
              task_id: task.id,
              name: mat.name,
              quantity: mat.quantity,
              lead_time_days: mat.lead_time_days,
              order_by_date: orderByDate.toISOString().split('T')[0],
              order_status: 'not_quoted',
              supplier_name: mat.supplier_name || null,
            })
        }
      }

      // Advance date for next substage
      currentDate = new Date(endDate)
      currentDate.setUTCDate(currentDate.getUTCDate() + 1)
      taskOrder++
    }

    stageOrder++
  }

  revalidatePath('/setup')
  return { ok: true }
}

export async function copySchemeToBlock(
  sourceBlockId: string,
  targetBlockId: string,
  projectId: string,
  startDate: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient()

  // Get source block's scheme
  const { data: sourceBlock } = await (supabase as any)
    .from('blocks')
    .select('construction_scheme')
    .eq('id', sourceBlockId)
    .single()

  if (!sourceBlock || !sourceBlock.construction_scheme) {
    return { ok: false, error: 'Source block has no scheme' }
  }

  return applySchemeToBlock(targetBlockId, projectId, sourceBlock.construction_scheme, startDate)
}
