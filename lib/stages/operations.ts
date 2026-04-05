// Pure logic for stage management — validation, reorder, delete-confirmation.
// No Supabase, no DOM. Unit-testable without mocks.

export type StageRecord = {
  id: string
  name: string
  color: string
  order_index: number
}

export type StageFormValues = {
  name: string
  color: string
}

export type StageFormErrors = Partial<Record<'name' | 'color', string>>

export type ValidateResult = {
  ok: boolean
  errors: StageFormErrors
}

const DEFAULT_STAGE_COLOR = '#8B5E3C'
const HEX_COLOR_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/
const MAX_NAME_LEN = 80

export function validateStageInput(values: StageFormValues): ValidateResult {
  const errors: StageFormErrors = {}
  const trimmed = (values.name ?? '').trim()
  if (!trimmed) {
    errors.name = 'Name is required'
  } else if (trimmed.length > MAX_NAME_LEN) {
    errors.name = `Name must be ${MAX_NAME_LEN} characters or fewer`
  }
  if (!HEX_COLOR_RE.test(values.color ?? '')) {
    errors.color = 'Color must be a hex value like #8B5E3C'
  }
  return { ok: Object.keys(errors).length === 0, errors }
}

export function normalizeStageColor(color: string | null | undefined): string {
  if (typeof color !== 'string' || !HEX_COLOR_RE.test(color)) return DEFAULT_STAGE_COLOR
  return color
}

// Produce a new array with the stage identified by `movedId` placed at
// `targetIndex` (clamped to the array bounds). Every stage is renumbered with a
// dense 0-based order_index so the Gantt can render in one pass.
// Returns the input (sorted by order_index) unchanged if movedId is unknown.
export function reorderStages(
  stages: StageRecord[],
  movedId: string,
  targetIndex: number
): StageRecord[] {
  const sorted = stages.slice().sort((a, b) => a.order_index - b.order_index)
  const fromIndex = sorted.findIndex(s => s.id === movedId)
  if (fromIndex === -1) {
    return renumber(sorted)
  }
  const clamped = Math.max(0, Math.min(sorted.length - 1, targetIndex))
  if (clamped === fromIndex) {
    return renumber(sorted)
  }
  const next = sorted.slice()
  const [moved] = next.splice(fromIndex, 1)
  next.splice(clamped, 0, moved)
  return renumber(next)
}

function renumber(stages: StageRecord[]): StageRecord[] {
  return stages.map((s, i) => ({ ...s, order_index: i }))
}

export type DeleteWarning = {
  requiresConfirmation: boolean
  message: string | null
}

// AC-SM-3 / AC-SM-4: empty stages delete without confirmation; non-empty stages
// surface the exact task count in the warning copy.
export function buildDeleteWarning(stageName: string, taskCount: number): DeleteWarning {
  if (taskCount <= 0) {
    return { requiresConfirmation: false, message: null }
  }
  const noun = taskCount === 1 ? 'task' : 'tasks'
  return {
    requiresConfirmation: true,
    message: `"${stageName}" contains ${taskCount} ${noun} — deleting removes them all.`,
  }
}
