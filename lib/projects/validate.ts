// Pure validation helpers for project creation.
// These are deterministic and testable without touching Supabase or the DOM.

export type ProjectFormValues = {
  name: string
  address: string
  start_date: string // ISO date string "YYYY-MM-DD"
  past_date_confirmed?: boolean
}

export type ProjectFormErrors = Partial<Record<'name' | 'start_date', string>>

export type ProjectFormWarnings = Partial<Record<'start_date', string>>

export function validateProjectForm(
  values: ProjectFormValues,
  today: Date = new Date()
): { errors: ProjectFormErrors; warnings: ProjectFormWarnings } {
  const errors: ProjectFormErrors = {}
  const warnings: ProjectFormWarnings = {}

  if (!values.name || values.name.trim().length === 0) {
    errors.name = 'Project name is required'
  }

  if (!values.start_date || values.start_date.trim().length === 0) {
    errors.start_date = 'Start date is required'
  } else {
    const parsed = new Date(values.start_date + 'T00:00:00')
    if (Number.isNaN(parsed.getTime())) {
      errors.start_date = 'Start date is not a valid date'
    } else {
      // Compare against today at midnight (local). Past = strictly before today.
      const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate())
      if (parsed < todayMidnight && !values.past_date_confirmed) {
        warnings.start_date = 'Start date is in the past — continue anyway?'
      }
    }
  }

  return { errors, warnings }
}

export function hasBlockingErrors(errors: ProjectFormErrors): boolean {
  return Object.values(errors).some(Boolean)
}

// localStorage persistence keys + helpers (used by the client form).
export const PROJECT_FORM_STORAGE_KEY = 'cm:project-creation-draft:v1'

export function readDraft(): Partial<ProjectFormValues> | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(PROJECT_FORM_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<ProjectFormValues>
    return parsed
  } catch {
    return null
  }
}

export function writeDraft(values: Partial<ProjectFormValues>): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(PROJECT_FORM_STORAGE_KEY, JSON.stringify(values))
  } catch {
    // Quota exceeded or private mode — fail silently, form still works.
  }
}

export function clearDraft(): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(PROJECT_FORM_STORAGE_KEY)
  } catch {
    // ignore
  }
}
