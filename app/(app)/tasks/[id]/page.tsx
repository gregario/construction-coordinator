import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import {
  TaskTradeAssigner,
  type AssignableTrade,
} from '@/components/tasks/TaskTradeAssigner'

// lib/supabase/types.ts lacks Relationships[] (foundation-eval finding).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LooseClient = any

interface Props {
  params: Promise<{ id: string }>
}

export default async function TaskDetailPage({ params }: Props) {
  const supabase = (await createClient()) as unknown as LooseClient
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { id: taskId } = await params

  const taskRes = await supabase
    .from('tasks')
    .select(
      'id, project_id, stage_id, name, duration_days, planned_start, planned_end, trade_id, notes'
    )
    .eq('id', taskId)
    .maybeSingle()
  const task = taskRes.data as
    | {
        id: string
        project_id: string
        stage_id: string | null
        name: string
        duration_days: number | null
        planned_start: string | null
        planned_end: string | null
        trade_id: string | null
        notes: string | null
      }
    | null
  if (!task) {
    return (
      <main className="p-4">
        <h1 className="text-xl font-semibold text-[#2B1F17]">Task not found</h1>
        <p className="mt-2 text-sm text-[#6B5D52]">
          This task no longer exists.{' '}
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
    .eq('id', task.project_id)
    .single()
  const project = projectRes.data as
    | { id: string; name: string; user_id: string }
    | null
  if (!project || project.user_id !== user.id) {
    redirect('/schedule')
  }

  const stageRes = task.stage_id
    ? await supabase
        .from('stages')
        .select('id, name')
        .eq('id', task.stage_id)
        .maybeSingle()
    : { data: null }
  const stage = (stageRes.data as { id: string; name: string } | null) ?? null

  const tradesRes = await supabase
    .from('trades')
    .select('id, name, phone')
    .eq('project_id', project.id)
    .order('name', { ascending: true })
  const trades = (tradesRes.data as AssignableTrade[] | null) ?? []

  return (
    <main className="mx-auto max-w-2xl p-4 md:p-8">
      <header className="mb-6">
        <Link
          href={stage ? `/stages/${stage.id}` : '/schedule'}
          className="text-xs text-[#6B5D52] underline-offset-2 hover:underline"
        >
          ← {stage ? stage.name : 'Schedule'}
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-[#2B1F17]">{task.name}</h1>
        {task.planned_start && task.planned_end && (
          <p className="mt-1 text-sm text-[#6B5D52]">
            {task.planned_start} → {task.planned_end}
            {task.duration_days ? ` · ${task.duration_days}d` : ''}
          </p>
        )}
      </header>

      {task.notes && (
        <section className="rounded-lg border border-[#E8DFD3] bg-white p-4">
          <h2 className="text-sm font-semibold text-[#2B1F17]">Notes</h2>
          <p className="mt-2 whitespace-pre-wrap text-sm text-[#2B1F17]">{task.notes}</p>
        </section>
      )}

      <TaskTradeAssigner
        projectId={project.id}
        taskId={task.id}
        trades={trades}
        initialTradeId={task.trade_id}
      />
    </main>
  )
}
