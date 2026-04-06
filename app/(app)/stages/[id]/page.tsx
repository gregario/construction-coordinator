import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import {
  StageTasksManager,
  type TaskRow,
  type TaskDependencyRow,
  type TradeRow,
  type ProjectTaskOption,
} from '@/components/tasks/StageTasksManager'
import { removeStaleDependencies, type DependencyEdge } from '@/lib/tasks/dependency-graph'

// lib/supabase/types.ts lacks Relationships[] (foundation-eval finding);
// cast at the call site — same pattern as /setup and /schedule pages.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LooseClient = any

interface Props {
  params: Promise<{ id: string }>
}

export default async function StageDetailPage({ params }: Props) {
  const supabase = (await createClient()) as unknown as LooseClient
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { id: stageId } = await params

  // Load the stage + project ownership in one query.
  const stageRes = await supabase
    .from('stages')
    .select('id, name, color, project_id')
    .eq('id', stageId)
    .maybeSingle()
  const stage = stageRes.data as
    | { id: string; name: string; color: string; project_id: string }
    | null
  if (!stage) {
    return (
      <main className="p-4">
        <h1 className="text-xl font-semibold text-[#2B1F17]">Stage not found</h1>
        <p className="mt-2 text-sm text-[#6B5D52]">
          This stage no longer exists.{' '}
          <Link href="/schedule" className="underline">
            Back to Schedule
          </Link>
        </p>
      </main>
    )
  }

  const projectRes = await supabase
    .from('projects')
    .select('id, name, user_id')
    .eq('id', stage.project_id)
    .single()
  const project = projectRes.data as
    | { id: string; name: string; user_id: string }
    | null
  if (!project || project.user_id !== user.id) {
    redirect('/schedule')
  }

  const tasksRes = await supabase
    .from('tasks')
    .select(
      'id, stage_id, name, duration_days, planned_start, planned_end, trade_id, notes'
    )
    .eq('stage_id', stageId)
    .order('planned_start', { ascending: true })
  const initialTasks = (tasksRes.data as TaskRow[] | null) ?? []

  const tradesRes = await supabase
    .from('trades')
    .select('id, name')
    .eq('project_id', project.id)
    .order('name', { ascending: true })
  const trades = (tradesRes.data as TradeRow[] | null) ?? []

  // Every other task in the project is a candidate dependency.
  const allTasksRes = await supabase
    .from('tasks')
    .select('id, name, stage_id')
    .eq('project_id', project.id)
  const allProjectTasks =
    (allTasksRes.data as Array<{ id: string; name: string; stage_id: string }> | null) ?? []

  // Map stage ids → names for the dependency picker.
  const allStagesRes = await supabase
    .from('stages')
    .select('id, name')
    .eq('project_id', project.id)
  const stageNameById = new Map<string, string>(
    ((allStagesRes.data as Array<{ id: string; name: string }> | null) ?? []).map(
      s => [s.id, s.name]
    )
  )

  // All project tasks available as dependency targets (the UI excludes the
  // task-being-edited from its own list via filter).
  const availableTasks: ProjectTaskOption[] = allProjectTasks
    .map(t => ({
      id: t.id,
      name: t.name,
      stage_name: stageNameById.get(t.stage_id) ?? 'Stage',
    }))

  // Dependencies involving this stage's tasks.
  // AC-DV-2: Auto-remove stale dependency IDs on load.
  const validProjectTaskIds = new Set(allProjectTasks.map(t => t.id))
  let initialDependencies: TaskDependencyRow[] = []
  if (initialTasks.length > 0) {
    const depsRes = await supabase
      .from('task_dependencies')
      .select('task_id, depends_on_task_id')
      .in(
        'task_id',
        initialTasks.map(t => t.id)
      )
    const rawDeps = (depsRes.data as DependencyEdge[] | null) ?? []

    // Filter out stale edges referencing deleted tasks.
    const { cleaned, removed } = removeStaleDependencies(rawDeps, validProjectTaskIds)
    initialDependencies = cleaned

    // Delete stale edges from the DB (fire-and-forget, best effort).
    if (removed.length > 0) {
      for (const edge of removed) {
        await supabase
          .from('task_dependencies')
          .delete()
          .eq('task_id', edge.task_id)
          .eq('depends_on_task_id', edge.depends_on_task_id)
      }
    }
  }

  return (
    <main className="mx-auto max-w-2xl p-4 md:p-8">
      <header className="mb-6">
        <Link
          href="/schedule"
          className="text-xs text-[#6B5D52] underline-offset-2 hover:underline"
        >
          ← Schedule
        </Link>
        <div className="mt-2 flex items-center gap-3">
          <span
            aria-hidden="true"
            className="h-6 w-1.5 rounded-full"
            style={{ backgroundColor: stage.color }}
          />
          <h1 className="text-2xl font-semibold text-[#2B1F17]">{stage.name}</h1>
        </div>
        <p className="text-sm text-[#6B5D52]">{project.name}</p>
      </header>

      <StageTasksManager
        projectId={project.id}
        stageId={stage.id}
        stageName={stage.name}
        initialTasks={initialTasks}
        initialDependencies={initialDependencies}
        availableTasks={availableTasks}
        trades={trades}
      />
    </main>
  )
}
