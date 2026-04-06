'use server'

import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

const ACTIVE_PROJECT_COOKIE = 'active_project_id'

export type ProjectListItem = {
  id: string
  name: string
  status: 'setup' | 'active' | 'complete'
  created_at: string
}

export async function listUserProjects(): Promise<ProjectListItem[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await (supabase as any)
    .from('projects')
    .select('id, name, status, created_at')
    .eq('user_id', user.id)
    .neq('status', 'archived')
    .order('created_at', { ascending: false })

  return (data ?? []) as ProjectListItem[]
}

export async function switchActiveProject(projectId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Not authenticated' }

  // Verify ownership
  const { data: project } = await (supabase as any)
    .from('projects')
    .select('id')
    .eq('id', projectId)
    .eq('user_id', user.id)
    .maybeSingle()
  if (!project) return { ok: false, error: 'Project not found' }

  const cookieStore = await cookies()
  cookieStore.set(ACTIVE_PROJECT_COOKIE, projectId, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
  })

  return { ok: true }
}

export async function getActiveProjectId(): Promise<string | null> {
  const cookieStore = await cookies()
  return cookieStore.get(ACTIVE_PROJECT_COOKIE)?.value ?? null
}

export async function archiveProject(projectId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Not authenticated' }

  const { error } = await (supabase as any)
    .from('projects')
    .update({ status: 'archived' })
    .eq('id', projectId)
    .eq('user_id', user.id)

  if (error) return { ok: false, error: error.message }
  return { ok: true }
}
