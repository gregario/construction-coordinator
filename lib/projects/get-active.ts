import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

const ACTIVE_PROJECT_COOKIE = 'active_project_id'

type ActiveProject = {
  id: string
  name: string
  status: string
  address: string | null
  start_date: string
  user_id: string
}

/**
 * Get the active project for the current user.
 * Checks the active_project_id cookie first, falls back to most recent project.
 * Returns null if no projects exist.
 */
export async function getActiveProject(userId: string): Promise<ActiveProject | null> {
  const supabase = await createClient()
  const cookieStore = await cookies()
  const cookieProjectId = cookieStore.get(ACTIVE_PROJECT_COOKIE)?.value

  // Try cookie project first
  if (cookieProjectId) {
    const { data } = await (supabase as any)
      .from('projects')
      .select('id, name, status, address, start_date, user_id')
      .eq('id', cookieProjectId)
      .eq('user_id', userId)
      .neq('status', 'archived')
      .maybeSingle()

    if (data) return data as ActiveProject
  }

  // Fallback: most recent non-archived project
  const { data } = await (supabase as any)
    .from('projects')
    .select('id, name, status, address, start_date, user_id')
    .eq('user_id', userId)
    .neq('status', 'archived')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return (data as ActiveProject | null) ?? null
}
