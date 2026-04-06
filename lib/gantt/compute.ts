// Pure computation functions for Gantt chart rendering.
// No DOM, no Supabase. Unit-testable without mocks.

export type GanttStage = {
  id: string
  name: string
  color: string
  order_index: number
}

export type GanttTask = {
  id: string
  stage_id: string
  name: string
  planned_start: string // ISO date
  planned_end: string   // ISO date
  duration_days: number
  status: 'not_started' | 'in_progress' | 'complete' | 'delayed'
  actual_end: string | null
  order_index: number
  depends_on: string[]
}

export type DateRange = {
  startDate: string // ISO date (1 day before first task)
  endDate: string   // ISO date (1 day after last task)
  totalDays: number
}

export type TaskBar = {
  taskId: string
  taskName: string
  stageId: string
  color: string
  startDay: number  // offset in days from range.startDate
  widthDays: number
  row: number       // vertical row index (global across stages)
  isComplete: boolean
  isDelayed: boolean
  delayDays: number
}

export type DependencyArrow = {
  fromTaskId: string
  toTaskId: string
  fromX: number // day offset (end of from-bar)
  fromRow: number
  toX: number   // day offset (start of to-bar)
  toRow: number
}

/** Count calendar days between two ISO date strings. Positive if b > a. */
export function daysBetween(a: string, b: string): number {
  const msPerDay = 86_400_000
  const da = new Date(a + 'T00:00:00Z')
  const db = new Date(b + 'T00:00:00Z')
  return Math.round((db.getTime() - da.getTime()) / msPerDay)
}

function addDays(iso: string, n: number): string {
  const d = new Date(iso + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

/** Compute the date range for the Gantt viewport, with 1-day buffer on each side. */
export function computeDateRange(tasks: GanttTask[]): DateRange {
  if (tasks.length === 0) {
    const today = new Date().toISOString().slice(0, 10)
    return { startDate: addDays(today, -1), endDate: addDays(today, 30), totalDays: 31 }
  }

  let minStart = tasks[0].planned_start
  let maxEnd = tasks[0].planned_end

  for (const t of tasks) {
    if (t.planned_start < minStart) minStart = t.planned_start
    if (t.planned_end > maxEnd) maxEnd = t.planned_end
  }

  const startDate = addDays(minStart, -1)
  const endDate = addDays(maxEnd, 1)
  const totalDays = daysBetween(startDate, endDate)

  return { startDate, endDate, totalDays }
}

/** Compute positioned task bars for rendering. Groups tasks under stages by order_index. */
export function computeTaskBars(
  tasks: GanttTask[],
  stages: GanttStage[],
  range: DateRange,
): TaskBar[] {
  const colorMap = new Map(stages.map(s => [s.id, s.color]))
  const sortedStages = [...stages].sort((a, b) => a.order_index - b.order_index)
  const stageOrder = new Map(sortedStages.map((s, i) => [s.id, i]))

  // Sort tasks: by stage order, then by order_index within stage
  const sorted = [...tasks].sort((a, b) => {
    const sa = stageOrder.get(a.stage_id) ?? 0
    const sb = stageOrder.get(b.stage_id) ?? 0
    if (sa !== sb) return sa - sb
    return a.order_index - b.order_index
  })

  // Assign rows: stage header row + task rows within each stage
  let currentRow = 0
  let lastStageId: string | null = null
  const bars: TaskBar[] = []

  for (const task of sorted) {
    if (task.stage_id !== lastStageId) {
      // Leave a row for the stage header
      currentRow = lastStageId === null ? 0 : currentRow + 1
      lastStageId = task.stage_id
    }

    const startDay = daysBetween(range.startDate, task.planned_start)
    const isComplete = task.status === 'complete'
    const isDelayed =
      task.actual_end !== null &&
      task.planned_end !== null &&
      task.actual_end > task.planned_end
    const delayDays = isDelayed
      ? daysBetween(task.planned_end, task.actual_end!)
      : 0

    bars.push({
      taskId: task.id,
      taskName: task.name,
      stageId: task.stage_id,
      color: colorMap.get(task.stage_id) ?? '#8B5E3C',
      startDay,
      widthDays: task.duration_days,
      row: currentRow,
      isComplete,
      isDelayed,
      delayDays,
    })

    currentRow++
  }

  return bars
}

/** Compute dependency arrows connecting task bars. */
export function computeDependencyArrows(
  tasks: GanttTask[],
  bars: TaskBar[],
): DependencyArrow[] {
  const barMap = new Map(bars.map(b => [b.taskId, b]))
  const arrows: DependencyArrow[] = []

  for (const task of tasks) {
    for (const depId of task.depends_on) {
      const fromBar = barMap.get(depId)
      const toBar = barMap.get(task.id)
      if (!fromBar || !toBar) continue

      arrows.push({
        fromTaskId: depId,
        toTaskId: task.id,
        fromX: fromBar.startDay + fromBar.widthDays,
        fromRow: fromBar.row,
        toX: toBar.startDay,
        toRow: toBar.row,
      })
    }
  }

  return arrows
}
