import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import {
  MaterialsListView,
  type MaterialsListRow,
} from '@/components/materials/MaterialsListView'
import { ProcurementPipeline } from '@/components/materials/ProcurementPipeline'
import type { MaterialOrderStatus } from '@/types/database'

// lib/supabase/types.ts lacks Relationships[] (foundation-eval finding).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LooseClient = any

type ProjectRow = { id: string; name: string; status: string; user_id: string }

type MaterialRow = {
  id: string
  name: string
  quantity: string | null
  lead_time_days: number
  order_by_date: string | null
  order_status: MaterialOrderStatus
  task_id: string
  tasks: { id: string; name: string } | null
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

export default async function MaterialsPage() {
  const supabase = (await createClient()) as unknown as LooseClient
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const projectRes = await supabase
    .from('projects')
    .select('id, name, status, user_id')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  const project = projectRes.data as ProjectRow | null
  if (!project) redirect('/setup')
  if (project.status === 'setup') redirect('/setup')

  const matRes = await supabase
    .from('materials')
    .select(
      'id, name, quantity, lead_time_days, order_by_date, order_status, task_id, tasks(id, name)'
    )
    .eq('tasks.project_id', project.id)
    .order('order_by_date', { ascending: true, nullsFirst: false })
  const materials = (matRes.data as MaterialRow[] | null) ?? []

  // RLS + the nested tasks(...) join return project-scoped rows only; the
  // second filter is belt-and-braces against mis-joined rows.
  const rows: MaterialsListRow[] = materials
    .filter(m => m.tasks != null)
    .map(m => ({
      id: m.id,
      name: m.name,
      quantity: m.quantity,
      lead_time_days: m.lead_time_days,
      order_by_date: m.order_by_date,
      order_status: m.order_status,
      task: m.tasks,
    }))

  // Compute procurement status counts
  const statusCounts: Record<string, number> = {}
  for (const row of rows) {
    statusCounts[row.order_status] = (statusCounts[row.order_status] || 0) + 1
  }

  // Count overdue materials (past order_by_date and not yet ordered/delivered)
  const today = todayIso()
  const overdueCount = rows.filter(
    r => r.order_by_date && r.order_by_date < today &&
    (r.order_status === 'not_quoted' || r.order_status === 'quoted')
  ).length

  return (
    <div className="mx-auto max-w-2xl p-4 md:p-8">
      <h1 className="mb-1 text-2xl font-semibold text-[#2B1F17]">Materials</h1>
      <p className="mb-4 text-sm text-[#6B5D52]">
        Procurement status and deadlines across all substages
      </p>

      {rows.length > 0 && (
        <div className="mb-6">
          <ProcurementPipeline counts={statusCounts} overdueCount={overdueCount} />
        </div>
      )}

      <MaterialsListView materials={rows} today={todayIso()} projectId={project.id} />
    </div>
  )
}
