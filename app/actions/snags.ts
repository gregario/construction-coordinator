'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export type SnagPriority = 'low' | 'medium' | 'high' | 'critical'
export type SnagStatus = 'open' | 'in_progress' | 'resolved'

export type SnagRow = {
  id: string
  project_id: string
  block_id: string | null
  stage_id: string | null
  trade_id: string | null
  title: string
  description: string | null
  priority: SnagPriority
  status: SnagStatus
  resolved_at: string | null
  created_at: string
  updated_at: string
}

export type CreateSnagInput = {
  title: string
  description?: string
  priority: SnagPriority
  block_id?: string | null
  stage_id?: string | null
  trade_id?: string | null
}

export async function createSnag(
  projectId: string,
  input: CreateSnagInput
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  if (!input.title.trim()) {
    return { ok: false, error: 'Snag title is required' }
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

  const { data: snag, error } = await (supabase as any)
    .from('snags')
    .insert({
      project_id: projectId,
      title: input.title.trim(),
      description: input.description?.trim() || null,
      priority: input.priority,
      block_id: input.block_id || null,
      stage_id: input.stage_id || null,
      trade_id: input.trade_id || null,
      status: 'open',
    })
    .select('id')
    .single()

  if (error) return { ok: false, error: error.message }

  revalidatePath('/snags')
  revalidatePath('/briefing')
  return { ok: true, id: snag.id }
}

export async function updateSnagStatus(
  snagId: string,
  newStatus: SnagStatus
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Not authenticated' }

  // Get current snag
  const { data: snag } = await (supabase as any)
    .from('snags')
    .select('id, status')
    .eq('id', snagId)
    .maybeSingle()

  if (!snag) return { ok: false, error: 'Snag not found' }

  // Validate transition: open → in_progress → resolved (no backward)
  const validTransitions: Record<string, string[]> = {
    open: ['in_progress', 'resolved'],
    in_progress: ['resolved'],
    resolved: [],
  }

  if (!validTransitions[snag.status]?.includes(newStatus)) {
    return { ok: false, error: `Cannot change from ${snag.status} to ${newStatus}` }
  }

  const updates: Record<string, unknown> = { status: newStatus }
  if (newStatus === 'resolved') {
    updates.resolved_at = new Date().toISOString()
  }

  const { error } = await (supabase as any)
    .from('snags')
    .update(updates)
    .eq('id', snagId)

  if (error) return { ok: false, error: error.message }

  revalidatePath('/snags')
  revalidatePath('/briefing')
  return { ok: true }
}

export async function listSnags(projectId: string): Promise<SnagRow[]> {
  const supabase = await createClient()
  const { data } = await (supabase as any)
    .from('snags')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
  return (data ?? []) as SnagRow[]
}
