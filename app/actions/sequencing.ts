'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export type SequencingMode = 'parallel' | 'sequential'

export type CategorySequencing = {
  mode: SequencingMode
  block_order?: string[] // block IDs in sequence order
}

export type SchedulingConfig = Record<string, CategorySequencing>

export async function saveSchedulingConfig(
  projectId: string,
  config: SchedulingConfig
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Not authenticated' }

  const { error } = await (supabase as any)
    .from('projects')
    .update({ scheduling_config: config })
    .eq('id', projectId)
    .eq('user_id', user.id)

  if (error) return { ok: false, error: error.message }

  revalidatePath('/setup')
  revalidatePath('/schedule')
  return { ok: true }
}

export async function getSchedulingConfig(projectId: string): Promise<SchedulingConfig> {
  const supabase = await createClient()
  const { data } = await (supabase as any)
    .from('projects')
    .select('scheduling_config')
    .eq('id', projectId)
    .single()

  return (data?.scheduling_config || {}) as SchedulingConfig
}
