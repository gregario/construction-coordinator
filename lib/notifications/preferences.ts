// Pure helpers for notification preference validation and state management.

export type PreferenceKey = 'order_deadlines' | 'overdue_tasks' | 'cascade_summaries'

export interface NotificationPrefs {
  order_deadlines: boolean
  overdue_tasks: boolean
  cascade_summaries: boolean
  order_warning_days: number
}

export const PREFERENCE_LABELS: Record<PreferenceKey, { title: string; description: string }> = {
  order_deadlines: {
    title: 'Material order reminders',
    description: 'Alert before material order-by dates',
  },
  overdue_tasks: {
    title: 'Overdue task alerts',
    description: 'Daily notification when tasks pass their end date',
  },
  cascade_summaries: {
    title: 'Cascade summaries',
    description: 'Notify when schedule changes cascade to downstream tasks',
  },
}

export const WARNING_DAYS_MIN = 1
export const WARNING_DAYS_MAX = 14

export interface WarningDaysValidation {
  ok: boolean
  value: number
  error: string | null
}

/** Validate order_warning_days input. Must be integer 1–14. */
export function validateWarningDays(input: string | number): WarningDaysValidation {
  const num = typeof input === 'string' ? Number(input) : input

  if (!Number.isFinite(num) || !Number.isInteger(num) || num < WARNING_DAYS_MIN || num > WARNING_DAYS_MAX) {
    return {
      ok: false,
      value: typeof input === 'number' ? input : NaN,
      error: `Must be between ${WARNING_DAYS_MIN} and ${WARNING_DAYS_MAX} days`,
    }
  }

  return { ok: true, value: num, error: null }
}

/** Build the optimistic next state after toggling a boolean preference. */
export function togglePreference(prefs: NotificationPrefs, key: PreferenceKey): NotificationPrefs {
  return { ...prefs, [key]: !prefs[key] }
}

/** Build the optimistic next state after changing warning days. */
export function updateWarningDays(prefs: NotificationPrefs, days: number): NotificationPrefs {
  return { ...prefs, order_warning_days: days }
}
