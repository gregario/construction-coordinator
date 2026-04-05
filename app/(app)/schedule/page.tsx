import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { StageManager } from '@/components/schedule/StageManager'

// lib/supabase/types.ts lacks Relationships[] + templates table (foundation-eval
// finding); cast at the call site — same pattern as /setup/page.tsx.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LooseClient = any

type StageRow = {
  id: string
  name: string
  color: string
  order_index: number
}

type ProjectRow = {
  id: string
  name: string
  status: string
  user_id: string
}

export default async function SchedulePage() {
  const supabase = (await createClient()) as unknown as LooseClient
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Pick the most recent active project. If the user has no active project,
  // route them back to /setup to finish onboarding.
  const projectRes = await supabase
    .from('projects')
    .select('id, name, status, user_id')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const project = projectRes.data as ProjectRow | null
  if (!project) {
    redirect('/setup')
  }
  if (project.status === 'setup') {
    redirect('/setup')
  }

  const stagesRes = await supabase
    .from('stages')
    .select('id, name, color, order_index')
    .eq('project_id', project.id)
    .order('order_index', { ascending: true })

  const stages = (stagesRes.data as StageRow[] | null) ?? []

  // Task counts per stage — single query, group in memory.
  let stagesWithCounts: Array<StageRow & { task_count: number }> = stages.map(
    s => ({ ...s, task_count: 0 })
  )
  if (stages.length > 0) {
    const taskRes = await supabase
      .from('tasks')
      .select('stage_id')
      .eq('project_id', project.id)
    const rows = (taskRes.data as Array<{ stage_id: string }> | null) ?? []
    const counts = new Map<string, number>()
    for (const row of rows) {
      counts.set(row.stage_id, (counts.get(row.stage_id) ?? 0) + 1)
    }
    stagesWithCounts = stages.map(s => ({
      ...s,
      task_count: counts.get(s.id) ?? 0,
    }))
  }

  return (
    <div className="p-4 md:p-8 max-w-2xl">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-[#2B1F17]">Schedule</h1>
        <p className="text-[#6B5D52] text-sm">{project.name}</p>
      </header>

      <StageManager projectId={project.id} initialStages={stagesWithCounts} />
    </div>
  )
}
