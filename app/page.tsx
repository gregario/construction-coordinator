import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/supabase/types'

type ProjectRow = Database['public']['Tables']['projects']['Row']

export default async function Home() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Check if user has a project that has moved past setup
  const result = await supabase
    .from('projects')
    .select('*')
    .eq('user_id', user!.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const project = result.data as ProjectRow | null

  if (!project || project.status === 'setup') redirect('/setup')

  redirect('/briefing')
}
