'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export type BlockResult =
  | { ok: true; id: string }
  | { ok: false; error: string }

export async function createBlock(
  projectId: string,
  data: { name: string; attachment_type: 'attached' | 'detached'; storeys: number }
): Promise<BlockResult> {
  if (!data.name.trim()) {
    return { ok: false, error: 'Block name is required' }
  }
  if (data.storeys < 1 || data.storeys > 10) {
    return { ok: false, error: 'Storeys must be between 1 and 10' }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Not authenticated' }

  // Verify project ownership
  const { data: project } = await (supabase as any)
    .from('projects')
    .select('id')
    .eq('id', projectId)
    .eq('user_id', user.id)
    .maybeSingle()
  if (!project) return { ok: false, error: 'Project not found' }

  // Get next order_index
  const { data: existing } = await (supabase as any)
    .from('blocks')
    .select('order_index')
    .eq('project_id', projectId)
    .order('order_index', { ascending: false })
    .limit(1)
    .maybeSingle()
  const nextOrder = existing ? existing.order_index + 1 : 0

  const { data: block, error } = await (supabase as any)
    .from('blocks')
    .insert({
      project_id: projectId,
      name: data.name.trim(),
      attachment_type: data.attachment_type,
      storeys: data.storeys,
      order_index: nextOrder,
    })
    .select('id')
    .single()

  if (error) return { ok: false, error: error.message }

  revalidatePath('/setup')
  return { ok: true, id: block.id }
}

export async function updateBlock(
  blockId: string,
  data: { name?: string; attachment_type?: 'attached' | 'detached'; storeys?: number }
): Promise<BlockResult> {
  if (data.name !== undefined && !data.name.trim()) {
    return { ok: false, error: 'Block name is required' }
  }
  if (data.storeys !== undefined && (data.storeys < 1 || data.storeys > 10)) {
    return { ok: false, error: 'Storeys must be between 1 and 10' }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Not authenticated' }

  // Verify ownership via project join
  const { data: block } = await (supabase as any)
    .from('blocks')
    .select('id, project_id, projects!inner(user_id)')
    .eq('id', blockId)
    .maybeSingle()
  if (!block || block.projects?.user_id !== user.id) {
    return { ok: false, error: 'Block not found' }
  }

  const updates: Record<string, unknown> = {}
  if (data.name !== undefined) updates.name = data.name.trim()
  if (data.attachment_type !== undefined) updates.attachment_type = data.attachment_type
  if (data.storeys !== undefined) updates.storeys = data.storeys

  const { error } = await (supabase as any)
    .from('blocks')
    .update(updates)
    .eq('id', blockId)

  if (error) return { ok: false, error: error.message }

  revalidatePath('/setup')
  return { ok: true, id: blockId }
}

export async function deleteBlock(blockId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Not authenticated' }

  // Verify ownership and check it's not the last block
  const { data: block } = await (supabase as any)
    .from('blocks')
    .select('id, project_id')
    .eq('id', blockId)
    .maybeSingle()
  if (!block) return { ok: false, error: 'Block not found' }

  const { count } = await (supabase as any)
    .from('blocks')
    .select('id', { count: 'exact', head: true })
    .eq('project_id', block.project_id)
  if ((count ?? 0) <= 1) {
    return { ok: false, error: 'Cannot delete the last block' }
  }

  const { error } = await (supabase as any)
    .from('blocks')
    .delete()
    .eq('id', blockId)

  if (error) return { ok: false, error: error.message }

  revalidatePath('/setup')
  return { ok: true }
}

export type BlockRow = {
  id: string
  name: string
  attachment_type: 'attached' | 'detached'
  storeys: number
  order_index: number
  construction_scheme: Record<string, unknown>
}

export async function listBlocks(projectId: string): Promise<BlockRow[]> {
  const supabase = await createClient()
  const { data } = await (supabase as any)
    .from('blocks')
    .select('id, name, attachment_type, storeys, order_index, construction_scheme')
    .eq('project_id', projectId)
    .order('order_index', { ascending: true })
  return (data ?? []) as BlockRow[]
}
