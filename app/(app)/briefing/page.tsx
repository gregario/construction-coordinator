import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import {
  selectUpcomingOrders,
  materialDeadlineStatus,
  type MaterialDeadlineInput,
} from '@/lib/materials/operations'
import { MaterialDeadlineBadge } from '@/components/materials/MaterialDeadlineBadge'
import type { MaterialOrderStatus } from '@/types/database'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LooseClient = any

type ProjectRow = { id: string; name: string; status: string; user_id: string }

type MaterialRow = {
  id: string
  name: string
  order_by_date: string | null
  order_status: MaterialOrderStatus
  task_id: string
  tasks: { id: string; name: string } | null
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

export default async function BriefingPage() {
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
    .select('id, name, order_by_date, order_status, task_id, tasks!inner(id, name, project_id)')
    .eq('tasks.project_id', project.id)
  const materials = (matRes.data as MaterialRow[] | null) ?? []

  const today = todayIso()
  const upcoming = selectUpcomingOrders(
    materials.map(m => ({
      id: m.id,
      name: m.name,
      order_by_date: m.order_by_date,
      order_status: m.order_status,
      _task: m.tasks,
    })),
    today
  )

  return (
    <div className="mx-auto max-w-2xl p-4 md:p-8">
      <h1 className="mb-1 text-2xl font-semibold text-[#2B1F17]">Daily Briefing</h1>
      <p className="mb-6 text-sm text-[#6B5D52]">
        Today&apos;s tasks, orders, and alerts
      </p>

      <section className="rounded-lg border border-[#E8DFD3] bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold text-[#2B1F17]">
          Upcoming Orders
        </h2>
        {upcoming.length === 0 ? (
          <p className="text-sm text-[#6B5D52]">
            No orders due in the next 7 days.
          </p>
        ) : (
          <ul className="space-y-2">
            {upcoming.map(m => {
              const badge = materialDeadlineStatus(
                m as unknown as MaterialDeadlineInput,
                today
              )
              const task = (m as unknown as { _task: { id: string; name: string } | null })._task
              return (
                <li
                  key={m.id}
                  className="flex items-start justify-between gap-3 rounded-md border border-[#EFE8DD] bg-[#FAF7F2] p-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-[#2B1F17]">
                      {m.name}
                    </p>
                    <div className="mt-1 flex items-center gap-2 text-xs text-[#6B5D52]">
                      <span>Order by {m.order_by_date}</span>
                      {task && (
                        <>
                          <span>·</span>
                          <Link
                            href={`/tasks/${task.id}`}
                            className="underline-offset-2 hover:underline"
                          >
                            {task.name}
                          </Link>
                        </>
                      )}
                    </div>
                  </div>
                  <MaterialDeadlineBadge badge={badge} />
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}
