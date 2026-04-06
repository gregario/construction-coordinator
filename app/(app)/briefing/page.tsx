import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import {
  selectUpcomingOrders,
  materialDeadlineStatus,
  type MaterialDeadlineInput,
} from '@/lib/materials/operations'
import {
  selectTodayTasks,
  nextTaskStartDate,
  formatShiftAlert,
  shiftAlertHref,
  type BriefingTask,
  type BriefingShiftAlert,
} from '@/lib/briefing/operations'
import { MaterialDeadlineBadge } from '@/components/materials/MaterialDeadlineBadge'
import { RefreshButton } from '@/components/briefing/RefreshButton'
import { BriefingTaskList } from '@/components/briefing/BriefingTaskList'
import type { MaterialOrderStatus, TaskStatus } from '@/types/database'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LooseClient = any

type ProjectRow = { id: string; name: string; status: string; user_id: string }

type TaskRow = {
  id: string
  name: string
  planned_start: string
  planned_end: string
  status: TaskStatus
  stages: { name: string; color: string } | null
}

type MaterialRow = {
  id: string
  name: string
  order_by_date: string | null
  order_status: MaterialOrderStatus
  task_id: string
  tasks: { id: string; name: string } | null
}

type ShiftAlertRow = {
  id: string
  entity_type: 'task' | 'material'
  entity_id: string
  entity_name: string
  change_type: 'date_moved' | 'status_changed'
  old_value: string | null
  new_value: string | null
  created_at: string
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

  const today = todayIso()

  // Parallel data fetches for performance (AC-DB-6)
  const [taskRes, matRes, alertRes] = await Promise.all([
    supabase
      .from('tasks')
      .select('id, name, planned_start, planned_end, status, stages!inner(name, color, project_id)')
      .eq('stages.project_id', project.id),
    supabase
      .from('materials')
      .select('id, name, order_by_date, order_status, task_id, tasks!inner(id, name, project_id)')
      .eq('tasks.project_id', project.id),
    supabase
      .from('shift_alerts')
      .select('id, entity_type, entity_id, entity_name, change_type, old_value, new_value, created_at')
      .eq('project_id', project.id)
      .eq('user_id', user.id)
      .eq('dismissed', false)
      .order('created_at', { ascending: false })
      .limit(20),
  ])

  const allTasks = (taskRes.data as TaskRow[] | null) ?? []
  const materials = (matRes.data as MaterialRow[] | null) ?? []
  const shiftAlerts = (alertRes.data as ShiftAlertRow[] | null) ?? []

  // Today's Tasks (AC-DB-2)
  const briefingTasks: BriefingTask[] = allTasks.map((t) => ({
    id: t.id,
    name: t.name,
    planned_start: t.planned_start,
    planned_end: t.planned_end,
    status: t.status,
    stage_name: t.stages?.name ?? '',
    stage_color: t.stages?.color ?? '#8B5E3C',
  }))
  const todayTasks = selectTodayTasks(briefingTasks, today)
  const nextStart = todayTasks.length === 0 ? nextTaskStartDate(briefingTasks, today) : null

  // Upcoming Orders (existing)
  const upcoming = selectUpcomingOrders(
    materials.map((m) => ({
      id: m.id,
      name: m.name,
      order_by_date: m.order_by_date,
      order_status: m.order_status,
      _task: m.tasks,
    })),
    today
  )

  // Shift Alerts (AC-DB-1)
  const alerts: BriefingShiftAlert[] = shiftAlerts.map((a) => ({
    id: a.id,
    entity_type: a.entity_type,
    entity_id: a.entity_id,
    entity_name: a.entity_name,
    change_type: a.change_type,
    old_value: a.old_value,
    new_value: a.new_value,
    created_at: a.created_at,
  }))

  return (
    <div className="mx-auto max-w-2xl p-4 md:p-8">
      {/* Header with refresh (AC-DB-5) */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="mb-1 text-2xl font-semibold text-[#2B1F17]">
            Daily Briefing
          </h1>
          <p className="text-sm text-[#6B5D52]">
            Today&apos;s tasks, orders, and alerts
          </p>
        </div>
        <RefreshButton />
      </div>

      {/* AC-DB-1 Section 1: Today's Tasks */}
      <section className="mb-4 rounded-lg border border-[#E8DFD3] bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold text-[#2B1F17]">
          Today&apos;s Tasks
        </h2>
        {todayTasks.length === 0 ? (
          /* AC-DB-3: empty state */
          <p className="text-sm text-[#6B5D52]">
            No tasks scheduled today
            {nextStart ? (
              <>
                {' — next task starts '}
                <Link
                  href="/schedule"
                  className="font-medium text-[#8B5E3C] underline-offset-2 hover:underline"
                >
                  {nextStart}
                </Link>
              </>
            ) : (
              <>
                .{' '}
                <Link
                  href="/schedule"
                  className="font-medium text-[#8B5E3C] underline-offset-2 hover:underline"
                >
                  View schedule
                </Link>
              </>
            )}
          </p>
        ) : (
          /* AC-QA-1/2/3/4: Interactive task list with toggle + quick actions */
          <BriefingTaskList tasks={todayTasks} projectId={project.id} />
        )}
      </section>

      {/* AC-DB-1 Section 2: Upcoming Orders */}
      <section className="mb-4 rounded-lg border border-[#E8DFD3] bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold text-[#2B1F17]">
          Upcoming Orders
        </h2>
        {upcoming.length === 0 ? (
          <p className="text-sm text-[#6B5D52]">
            No orders due in the next 7 days.
          </p>
        ) : (
          <ul className="space-y-2">
            {upcoming.map((m) => {
              const badge = materialDeadlineStatus(
                m as unknown as MaterialDeadlineInput,
                today
              )
              const task = (
                m as unknown as { _task: { id: string; name: string } | null }
              )._task
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

      {/* AC-DB-1 Section 3: Shift Alerts */}
      <section className="rounded-lg border border-[#E8DFD3] bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold text-[#2B1F17]">
          Shift Alerts
        </h2>
        {alerts.length === 0 ? (
          <p className="text-sm text-[#6B5D52]">
            No schedule changes since your last visit.
          </p>
        ) : (
          <ul className="space-y-2">
            {alerts.map((a) => (
              <li
                key={a.id}
                className="rounded-md border border-[#EFE8DD] bg-[#FAF7F2] p-3"
              >
                <Link
                  href={shiftAlertHref(a)}
                  className="block text-sm text-[#2B1F17] underline-offset-2 hover:underline"
                >
                  {formatShiftAlert(a)}
                </Link>
                <p className="mt-0.5 text-xs text-[#6B5D52]">
                  {a.entity_type === 'task' ? '📋' : '📦'}{' '}
                  {a.change_type === 'date_moved' ? 'Date shifted' : 'Status changed'}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
