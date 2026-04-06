import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { GanttChart } from '@/components/schedule/GanttChart'
import type { GanttTask, GanttStage } from '@/lib/gantt/compute'
import type { TaskDetailData } from '@/components/schedule/GanttChart'

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

type TaskRow = {
  id: string
  stage_id: string
  name: string
  planned_start: string
  planned_end: string
  duration_days: number
  status: string
  actual_end: string | null
  order_index: number
  trade_id: string | null
}

type TaskDepRow = {
  task_id: string
  depends_on_task_id: string
}

type TradeRow = {
  id: string
  name: string
}

type MaterialRow = {
  id: string
  name: string
  task_id: string
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

  // Fetch blocks for filtering
  const blocksRes = await supabase
    .from('blocks')
    .select('id, name, order_index')
    .eq('project_id', project.id)
    .order('order_index', { ascending: true })
  const blocks = (blocksRes.data as { id: string; name: string; order_index: number }[] | null) ?? []

  const stagesRes = await supabase
    .from('stages')
    .select('id, name, color, order_index, block_id')
    .eq('project_id', project.id)
    .order('order_index', { ascending: true })

  const stages = (stagesRes.data as (StageRow & { block_id: string | null })[] | null) ?? []

  // Fetch tasks for Gantt chart
  const taskRes = await supabase
    .from('tasks')
    .select('id, stage_id, name, planned_start, planned_end, duration_days, status, actual_end, order_index, trade_id, delay_reason')
    .eq('project_id', project.id)
    .order('order_index', { ascending: true })

  const taskRows = (taskRes.data as (TaskRow & { delay_reason: string | null })[] | null) ?? []

  // Fetch task dependencies
  let depRows: TaskDepRow[] = []
  if (taskRows.length > 0) {
    const taskIds = taskRows.map(t => t.id)
    const depRes = await supabase
      .from('task_dependencies')
      .select('task_id, depends_on_task_id')
      .in('task_id', taskIds)

    depRows = (depRes.data as TaskDepRow[] | null) ?? []
  }

  // Fetch trades for task detail panel (AC-GE-3)
  const tradesRes = await supabase
    .from('trades')
    .select('id, name, phone')
    .eq('project_id', project.id)
  const tradeRows = (tradesRes.data as (TradeRow & { phone: string | null })[] | null) ?? []
  const tradeMap: Record<string, string> = {}
  const tradePhoneMap: Record<string, string | null> = {}
  for (const t of tradeRows) {
    tradeMap[t.id] = t.name
    tradePhoneMap[t.id] = t.phone ?? null
  }

  // Fetch materials for task detail panel (AC-GE-3)
  const materialsRes = await supabase
    .from('materials')
    .select('id, name, task_id, order_status, order_by_date')
    .eq('project_id', project.id)
  const materialRows = (materialsRes.data as (MaterialRow & { order_status: string; order_by_date: string | null })[] | null) ?? []
  const materialsByTask: Record<string, { id: string; name: string }[]> = {}
  const materialOverdueByTask: Record<string, number> = {}
  const today = new Date().toISOString().split('T')[0]
  for (const m of materialRows) {
    const list = materialsByTask[m.task_id] ?? []
    list.push({ id: m.id, name: m.name })
    materialsByTask[m.task_id] = list
    if (m.order_by_date && m.order_by_date < today && (m.order_status === 'not_quoted' || m.order_status === 'quoted')) {
      materialOverdueByTask[m.task_id] = (materialOverdueByTask[m.task_id] || 0) + 1
    }
  }

  // Fetch snag counts per stage
  const snagsRes = await supabase
    .from('snags')
    .select('stage_id, status')
    .eq('project_id', project.id)
    .neq('status', 'resolved')
  const snagRows = (snagsRes.data ?? []) as { stage_id: string | null; status: string }[]
  const openSnagsByStage: Record<string, number> = {}
  for (const s of snagRows) {
    if (s.stage_id) openSnagsByStage[s.stage_id] = (openSnagsByStage[s.stage_id] || 0) + 1
  }

  // Build dependency map
  const depsMap = new Map<string, string[]>()
  for (const dep of depRows) {
    const list = depsMap.get(dep.task_id) ?? []
    list.push(dep.depends_on_task_id)
    depsMap.set(dep.task_id, list)
  }

  // Assemble GanttTask objects
  const ganttTasks: GanttTask[] = taskRows.map(t => ({
    id: t.id,
    stage_id: t.stage_id,
    name: t.name,
    planned_start: t.planned_start,
    planned_end: t.planned_end,
    duration_days: t.duration_days,
    status: t.status as GanttTask['status'],
    actual_end: t.actual_end,
    order_index: t.order_index,
    depends_on: depsMap.get(t.id) ?? [],
  }))

  const ganttStages: GanttStage[] = stages.map(s => ({
    id: s.id,
    name: s.name,
    color: s.color,
    order_index: s.order_index,
  }))

  // Build task detail data for the Gantt detail panel (AC-GE-3)
  const taskDetailMap: Record<string, TaskDetailData> = {}
  for (const t of taskRows) {
    taskDetailMap[t.id] = {
      tradeName: t.trade_id ? (tradeMap[t.trade_id] ?? null) : null,
      tradePhone: t.trade_id ? (tradePhoneMap[t.trade_id] ?? null) : null,
      materials: materialsByTask[t.id] ?? [],
      materialOverdueCount: materialOverdueByTask[t.id] ?? 0,
      openSnagCount: openSnagsByStage[t.stage_id] ?? 0,
      delayReason: t.delay_reason ?? null,
    }
  }

  return (
    <div className="p-4 md:p-8">
      <header className="mb-4">
        <h1 className="text-2xl font-semibold text-[#2B1F17]">Schedule</h1>
        <p className="text-[#6B5D52] text-sm">{project.name}</p>
      </header>

      {/* Gantt Chart — visual dashboard (read-only, v0.3.1) */}
      <section>
        <GanttChart
          stages={ganttStages}
          tasks={ganttTasks}
          projectId={project.id}
          taskDetails={taskDetailMap}
        />
      </section>
    </div>
  )
}
