// Pure logic for applying a residential construction template to a project.
// Given the template's stages JSONB and the project's start_date, produce
// a plan of stages/tasks/materials to insert. No Supabase, no DOM.

export type TemplateTaskMaterial = {
  name: string
  quantity?: string | null
  lead_time_days?: number | null
  supplier_name?: string | null
  notes?: string | null
  estimated_cost?: number | null
}

export type TemplateTaskDef = {
  name: string
  duration_days: number
  notes?: string | null
  materials?: TemplateTaskMaterial[]
}

export type TemplateStageDef = {
  name: string
  color: string
  order_index: number
  tasks: TemplateTaskDef[]
}

export type TemplateRecord = {
  id: string
  name: string
  description: string | null
  total_duration_days: number | null
  stages: TemplateStageDef[]
}

export type StageInsert = {
  project_id: string
  name: string
  color: string
  order_index: number
  _localId: string
}

export type TaskInsert = {
  project_id: string
  name: string
  duration_days: number
  planned_start: string
  planned_end: string
  notes: string | null
  order_index: number
  status: 'not_started'
  _stageLocalId: string
  _localId: string
}

export type MaterialInsert = {
  name: string
  quantity: string | null
  lead_time_days: number
  order_by_date: string | null
  order_status: 'not_ordered'
  supplier_name: string | null
  notes: string | null
  estimated_cost: number | null
  _taskLocalId: string
}

export type TemplateInsertPlan = {
  stages: StageInsert[]
  tasks: TaskInsert[]
  materials: MaterialInsert[]
}

// Parse an ISO date 'YYYY-MM-DD' as UTC midnight so day math is stable
// across time zones. Returns null if the string is invalid.
function parseISODate(s: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null
  const d = new Date(s + 'T00:00:00Z')
  return Number.isNaN(d.getTime()) ? null : d
}

function formatISODate(d: Date): string {
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function addDays(d: Date, days: number): Date {
  const copy = new Date(d.getTime())
  copy.setUTCDate(copy.getUTCDate() + days)
  return copy
}

function sanitizeDuration(n: unknown): number {
  const v = typeof n === 'number' && Number.isFinite(n) && n > 0 ? Math.floor(n) : 1
  return v
}

export function buildTemplateInsertPlan(
  templateStages: TemplateStageDef[],
  projectId: string,
  projectStartDate: string
): TemplateInsertPlan {
  const plan: TemplateInsertPlan = { stages: [], tasks: [], materials: [] }
  const start = parseISODate(projectStartDate)
  if (!start) {
    throw new Error(`Invalid projectStartDate: ${projectStartDate}`)
  }

  // Cursor walks day by day across all stages. Each task consumes duration_days,
  // and the next task starts one day after the previous task's planned_end.
  let cursor = start

  templateStages
    .slice()
    .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))
    .forEach((stage, stageIdx) => {
      const stageLocalId = `s${stageIdx}`
      plan.stages.push({
        project_id: projectId,
        name: stage.name,
        color: stage.color,
        order_index: stageIdx,
        _localId: stageLocalId,
      })

      const tasks = Array.isArray(stage.tasks) ? stage.tasks : []
      tasks.forEach((task, taskIdx) => {
        const duration = sanitizeDuration(task.duration_days)
        const plannedStart = cursor
        const plannedEnd = addDays(plannedStart, duration)
        const taskLocalId = `t${stageIdx}-${taskIdx}`

        plan.tasks.push({
          project_id: projectId,
          name: task.name,
          duration_days: duration,
          planned_start: formatISODate(plannedStart),
          planned_end: formatISODate(plannedEnd),
          notes: task.notes ?? null,
          order_index: taskIdx,
          status: 'not_started',
          _stageLocalId: stageLocalId,
          _localId: taskLocalId,
        })

        // Next task: one day after this task's planned_end
        cursor = addDays(plannedEnd, 1)

        const materials = Array.isArray(task.materials) ? task.materials : []
        materials.forEach(m => {
          const leadTime = typeof m.lead_time_days === 'number' && m.lead_time_days >= 0
            ? Math.floor(m.lead_time_days)
            : 0
          const orderByDate = leadTime > 0
            ? formatISODate(addDays(plannedStart, -leadTime))
            : formatISODate(plannedStart)
          plan.materials.push({
            name: m.name,
            quantity: m.quantity ?? null,
            lead_time_days: leadTime,
            order_by_date: orderByDate,
            order_status: 'not_ordered',
            supplier_name: m.supplier_name ?? null,
            notes: m.notes ?? null,
            estimated_cost: m.estimated_cost ?? null,
            _taskLocalId: taskLocalId,
          })
        })
      })
    })

  return plan
}

export type TemplateSummary = {
  id: string
  name: string
  description: string | null
  total_duration_days: number
  stage_count: number
  task_count: number
  stages: Array<{
    name: string
    color: string
    task_count: number
    sample_tasks: string[]
  }>
}

export function summarizeTemplate(tpl: TemplateRecord): TemplateSummary {
  const stages = Array.isArray(tpl.stages) ? tpl.stages : []
  const stagesSorted = stages
    .slice()
    .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))

  const stageSummaries = stagesSorted.map(s => {
    const tasks = Array.isArray(s.tasks) ? s.tasks : []
    return {
      name: s.name,
      color: s.color,
      task_count: tasks.length,
      sample_tasks: tasks.slice(0, 3).map(t => t.name),
    }
  })

  const taskCount = stageSummaries.reduce((sum, s) => sum + s.task_count, 0)

  // Fall back to the sequential-schedule span if the template doesn't declare one.
  let totalDuration = tpl.total_duration_days
  if (typeof totalDuration !== 'number' || totalDuration <= 0) {
    let days = 0
    let taskN = 0
    for (const s of stagesSorted) {
      const tasks = Array.isArray(s.tasks) ? s.tasks : []
      for (const t of tasks) {
        days += sanitizeDuration(t.duration_days)
        taskN += 1
      }
    }
    // One-day gap between consecutive tasks (planned_start = prev planned_end + 1)
    totalDuration = days + Math.max(0, taskN - 1)
  }

  return {
    id: tpl.id,
    name: tpl.name,
    description: tpl.description,
    total_duration_days: totalDuration,
    stage_count: stageSummaries.length,
    task_count: taskCount,
    stages: stageSummaries,
  }
}
