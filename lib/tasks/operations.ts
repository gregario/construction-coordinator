// Pure logic for task management — validation, date computation, dep cleanup.
// No Supabase, no DOM. Unit-testable without mocks.

export type TaskFormValues = {
  name: string
  duration_days: number | string
  depends_on?: string[]
  trade_id?: string | null
  notes?: string | null
}

export type TaskFormErrors = Partial<
  Record<'name' | 'duration_days' | 'depends_on', string>
>

export type ValidateTaskResult = {
  ok: boolean
  errors: TaskFormErrors
}

const MAX_NAME_LEN = 120
const MAX_NOTES_LEN = 2000
const MAX_DURATION_DAYS = 3650 // 10 years — a sanity cap, not a business rule.

export function validateTaskInput(values: TaskFormValues): ValidateTaskResult {
  const errors: TaskFormErrors = {}

  const trimmed = (values.name ?? '').trim()
  if (!trimmed) {
    errors.name = 'Name is required'
  } else if (trimmed.length > MAX_NAME_LEN) {
    errors.name = `Name must be ${MAX_NAME_LEN} characters or fewer`
  }

  const duration = coerceInt(values.duration_days)
  if (duration === null) {
    errors.duration_days = 'Duration must be a whole number'
  } else if (duration < 1) {
    errors.duration_days = 'Duration must be at least 1 day'
  } else if (duration > MAX_DURATION_DAYS) {
    errors.duration_days = `Duration must be ${MAX_DURATION_DAYS} days or fewer`
  }

  if (values.depends_on) {
    const seen = new Set<string>()
    for (const id of values.depends_on) {
      if (!id || typeof id !== 'string') {
        errors.depends_on = 'Invalid dependency'
        break
      }
      if (seen.has(id)) {
        errors.depends_on = 'Duplicate dependency'
        break
      }
      seen.add(id)
    }
  }

  if (values.notes != null && values.notes.length > MAX_NOTES_LEN) {
    // Note: notes overflow is rare; surface via name field if it ever triggers.
    errors.name = errors.name ?? `Notes must be ${MAX_NOTES_LEN} characters or fewer`
  }

  return { ok: Object.keys(errors).length === 0, errors }
}

function coerceInt(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined || value === '') return null
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(n) || !Number.isInteger(n)) return null
  return n
}

// ---------------------------------------------------------------------------
// Date computation (AC-TM-2, AC-TM-3, AC-TM-4)
// ---------------------------------------------------------------------------

// Task records carry ISO date strings (YYYY-MM-DD) to match Postgres DATE.
export type TaskDateRecord = {
  id: string
  planned_start: string
  planned_end: string
}

export type ComputePlannedDatesInput = {
  durationDays: number
  projectStartDate: string
  dependencies: TaskDateRecord[]
}

export type PlannedDates = {
  planned_start: string
  planned_end: string
}

// AC-TM-2: planned_end = planned_start + (duration_days - 1). duration of 1
// day means a task starting on 2026-06-01 ends 2026-06-01, not 2026-06-02.
// This keeps the inclusive-day semantics the schema expects (planned_start
// and planned_end are the first and last working day of the task).
//
// AC-TM-3: no deps → planned_start = project.start_date
// AC-TM-4: multiple deps → planned_start = max(dep.planned_end) + 1 day
export function computePlannedDates(input: ComputePlannedDatesInput): PlannedDates {
  const { dependencies, projectStartDate, durationDays } = input
  const duration = Math.max(1, Math.floor(durationDays))

  let planned_start: string
  if (dependencies.length === 0) {
    planned_start = projectStartDate
  } else {
    const latestEnd = maxDate(dependencies.map(d => d.planned_end))
    planned_start = addDays(latestEnd, 1)
  }
  const planned_end = addDays(planned_start, duration - 1)
  return { planned_start, planned_end }
}

// Inclusive-day semantics: planned_end - planned_start = duration - 1
export function durationFromDates(planned_start: string, planned_end: string): number {
  return diffDays(planned_start, planned_end) + 1
}

// ---------------------------------------------------------------------------
// Delete dependencies cleanup (AC-TM-6)
// ---------------------------------------------------------------------------

// task_dependencies has ON DELETE CASCADE on depends_on_task_id, so the DB
// clears rows automatically. This pure helper models the same behaviour for
// callers that hold an in-memory dependency list (e.g. the UI after delete).
export function removeFromDependencies<T extends { depends_on_task_id: string }>(
  dependencies: T[],
  deletedTaskId: string
): T[] {
  return dependencies.filter(d => d.depends_on_task_id !== deletedTaskId)
}

// ---------------------------------------------------------------------------
// Date helpers (ISO YYYY-MM-DD, UTC-anchored to avoid TZ drift)
// ---------------------------------------------------------------------------

export function addDays(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split('-').map(Number)
  const date = new Date(Date.UTC(y, m - 1, d))
  date.setUTCDate(date.getUTCDate() + days)
  return formatIso(date)
}

export function diffDays(fromIso: string, toIso: string): number {
  const [y1, m1, d1] = fromIso.split('-').map(Number)
  const [y2, m2, d2] = toIso.split('-').map(Number)
  const from = Date.UTC(y1, m1 - 1, d1)
  const to = Date.UTC(y2, m2 - 1, d2)
  return Math.round((to - from) / 86_400_000)
}

export function maxDate(dates: string[]): string {
  if (dates.length === 0) throw new Error('maxDate requires at least one date')
  let max = dates[0]
  for (let i = 1; i < dates.length; i++) {
    if (dates[i] > max) max = dates[i]
  }
  return max
}

function formatIso(date: Date): string {
  const y = date.getUTCFullYear()
  const m = String(date.getUTCMonth() + 1).padStart(2, '0')
  const d = String(date.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}
