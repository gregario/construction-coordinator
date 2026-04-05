import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import {
  materialDeadlineStatus,
  type MaterialDeadlineInput,
} from '@/lib/materials/operations'
import { MaterialDeadlineBadge } from '@/components/materials/MaterialDeadlineBadge'
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
  const scoped = materials.filter(m => m.tasks != null)

  const today = todayIso()

  return (
    <div className="mx-auto max-w-2xl p-4 md:p-8">
      <h1 className="mb-1 text-2xl font-semibold text-[#2B1F17]">Materials</h1>
      <p className="mb-6 text-sm text-[#6B5D52]">
        Order-by deadlines across all tasks
      </p>

      {scoped.length === 0 ? (
        <div className="rounded-lg border border-[#E8DFD3] bg-white p-6 text-center">
          <p className="text-sm text-[#6B5D52]">
            No materials yet. Add materials from any task detail screen.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {scoped.map(m => {
            const badge = materialDeadlineStatus(
              {
                id: m.id,
                name: m.name,
                order_by_date: m.order_by_date,
                order_status: m.order_status,
              } satisfies MaterialDeadlineInput,
              today
            )
            return (
              <li
                key={m.id}
                className="rounded-lg border border-[#E8DFD3] bg-white p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-[#2B1F17]">
                      {m.name}
                    </p>
                    {m.tasks && (
                      <Link
                        href={`/tasks/${m.tasks.id}`}
                        className="text-xs text-[#6B5D52] underline-offset-2 hover:underline"
                      >
                        {m.tasks.name}
                      </Link>
                    )}
                  </div>
                  <MaterialDeadlineBadge badge={badge} />
                </div>
                <div className="mt-2 flex items-center gap-3 text-xs text-[#6B5D52]">
                  {m.order_by_date && (
                    <span>Order by {m.order_by_date}</span>
                  )}
                  <span>· {m.lead_time_days}d lead</span>
                  {m.quantity && <span>· {m.quantity}</span>}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
