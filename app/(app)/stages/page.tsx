import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { StagesAccordionView } from '@/components/stages/StagesAccordionView'

type LooseClient = any // eslint-disable-line @typescript-eslint/no-explicit-any

type BlockRow = {
  id: string
  name: string
  attachment_type: string
  storeys: number
  order_index: number
}

type StageRow = {
  id: string
  block_id: string | null
  name: string
  color: string
  order_index: number
}

type TaskRow = {
  id: string
  stage_id: string
  name: string
  planned_start: string
  planned_end: string
  status: string
  trade_id: string | null
}

type TradeRow = {
  id: string
  name: string
}

export default async function StagesPage() {
  const supabase = (await createClient()) as unknown as LooseClient
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const projectRes = await supabase
    .from('projects')
    .select('id, name, status')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const project = projectRes.data as { id: string; name: string; status: string } | null
  if (!project || project.status === 'setup') redirect('/setup')

  // Fetch blocks, stages, tasks, and trades in parallel
  const [blocksRes, stagesRes, tasksRes, tradesRes] = await Promise.all([
    supabase
      .from('blocks')
      .select('id, name, attachment_type, storeys, order_index')
      .eq('project_id', project.id)
      .order('order_index', { ascending: true }),
    supabase
      .from('stages')
      .select('id, block_id, name, color, order_index')
      .eq('project_id', project.id)
      .order('order_index', { ascending: true }),
    supabase
      .from('tasks')
      .select('id, stage_id, name, planned_start, planned_end, status, trade_id')
      .eq('project_id', project.id)
      .order('planned_start', { ascending: true }),
    supabase
      .from('trades')
      .select('id, name')
      .eq('project_id', project.id),
  ])

  const blocks = (blocksRes.data ?? []) as BlockRow[]
  const stages = (stagesRes.data ?? []) as StageRow[]
  const tasks = (tasksRes.data ?? []) as TaskRow[]
  const trades = (tradesRes.data ?? []) as TradeRow[]

  // Build trade name lookup
  const tradeMap: Record<string, string> = {}
  for (const t of trades) tradeMap[t.id] = t.name

  // Compute task counts and completion per stage
  const stagesWithTasks = stages.map(stage => {
    const stageTasks = tasks.filter(t => t.stage_id === stage.id)
    const completedCount = stageTasks.filter(t => t.status === 'complete').length
    return {
      ...stage,
      tasks: stageTasks.map(t => ({
        ...t,
        trade_name: t.trade_id ? tradeMap[t.trade_id] || null : null,
      })),
      completed_count: completedCount,
      total_count: stageTasks.length,
    }
  })

  // Group stages by block
  const stagesByBlock = new Map<string, typeof stagesWithTasks>()
  for (const stage of stagesWithTasks) {
    const blockId = stage.block_id || 'unassigned'
    const existing = stagesByBlock.get(blockId) || []
    existing.push(stage)
    stagesByBlock.set(blockId, existing)
  }

  return (
    <div className="p-4 md:p-8 max-w-3xl">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-[#2B1F17]">Stages</h1>
        <p className="text-[#6B5D52] text-sm">{project.name}</p>
      </header>

      {stagesWithTasks.length === 0 ? (
        <div className="rounded-lg border border-dashed border-[#E8DFD3] bg-white p-8 text-center">
          <p className="text-sm text-[#6B5D52]">
            No stages yet. Complete setup to generate your build stages.
          </p>
        </div>
      ) : (
        <StagesAccordionView projectId={project.id} blocks={blocks} stagesByBlock={stagesByBlock} />
      )}
    </div>
  )
}
