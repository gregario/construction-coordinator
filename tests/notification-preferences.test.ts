import { describe, it, expect } from 'vitest'
import {
  validateWarningDays,
  togglePreference,
  updateWarningDays,
  PREFERENCE_LABELS,
  WARNING_DAYS_MIN,
  WARNING_DAYS_MAX,
  type NotificationPrefs,
} from '@/lib/notifications/preferences'

const DEFAULT_PREFS: NotificationPrefs = {
  order_deadlines: true,
  overdue_tasks: true,
  cascade_summaries: true,
  order_warning_days: 3,
}

// ---------- validateWarningDays ----------

describe('validateWarningDays', () => {
  it('accepts valid integer within range (1)', () => {
    const result = validateWarningDays(1)
    expect(result).toEqual({ ok: true, value: 1, error: null })
  })

  it('accepts valid integer within range (14)', () => {
    const result = validateWarningDays(14)
    expect(result).toEqual({ ok: true, value: 14, error: null })
  })

  it('accepts valid integer within range (7)', () => {
    const result = validateWarningDays(7)
    expect(result).toEqual({ ok: true, value: 7, error: null })
  })

  it('accepts string number input', () => {
    const result = validateWarningDays('5')
    expect(result).toEqual({ ok: true, value: 5, error: null })
  })

  it('rejects zero', () => {
    const result = validateWarningDays(0)
    expect(result.ok).toBe(false)
    expect(result.error).toContain('between')
  })

  it('rejects negative', () => {
    const result = validateWarningDays(-1)
    expect(result.ok).toBe(false)
  })

  it('rejects above max (15)', () => {
    const result = validateWarningDays(15)
    expect(result.ok).toBe(false)
  })

  it('rejects non-integer (2.5)', () => {
    const result = validateWarningDays(2.5)
    expect(result.ok).toBe(false)
  })

  it('rejects non-numeric string', () => {
    const result = validateWarningDays('abc')
    expect(result.ok).toBe(false)
    expect(result.value).toBeNaN()
  })

  it('rejects empty string', () => {
    const result = validateWarningDays('')
    expect(result.ok).toBe(false)
  })

  it('rejects NaN', () => {
    const result = validateWarningDays(NaN)
    expect(result.ok).toBe(false)
  })

  it('rejects Infinity', () => {
    const result = validateWarningDays(Infinity)
    expect(result.ok).toBe(false)
  })
})

// ---------- togglePreference ----------

describe('togglePreference', () => {
  it('toggles order_deadlines from true to false', () => {
    const result = togglePreference(DEFAULT_PREFS, 'order_deadlines')
    expect(result.order_deadlines).toBe(false)
    expect(result.overdue_tasks).toBe(true) // others unchanged
    expect(result.cascade_summaries).toBe(true)
    expect(result.order_warning_days).toBe(3)
  })

  it('toggles overdue_tasks from true to false', () => {
    const result = togglePreference(DEFAULT_PREFS, 'overdue_tasks')
    expect(result.overdue_tasks).toBe(false)
    expect(result.order_deadlines).toBe(true)
  })

  it('toggles cascade_summaries from true to false', () => {
    const result = togglePreference(DEFAULT_PREFS, 'cascade_summaries')
    expect(result.cascade_summaries).toBe(false)
  })

  it('toggles from false to true', () => {
    const prefs = { ...DEFAULT_PREFS, order_deadlines: false }
    const result = togglePreference(prefs, 'order_deadlines')
    expect(result.order_deadlines).toBe(true)
  })

  it('does not mutate the original object', () => {
    const original = { ...DEFAULT_PREFS }
    togglePreference(original, 'order_deadlines')
    expect(original.order_deadlines).toBe(true) // unchanged
  })
})

// ---------- updateWarningDays ----------

describe('updateWarningDays', () => {
  it('updates order_warning_days', () => {
    const result = updateWarningDays(DEFAULT_PREFS, 7)
    expect(result.order_warning_days).toBe(7)
    expect(result.order_deadlines).toBe(true) // others unchanged
  })

  it('does not mutate the original object', () => {
    const original = { ...DEFAULT_PREFS }
    updateWarningDays(original, 10)
    expect(original.order_warning_days).toBe(3)
  })
})

// ---------- PREFERENCE_LABELS ----------

describe('PREFERENCE_LABELS', () => {
  it('has entries for all three preference keys', () => {
    expect(Object.keys(PREFERENCE_LABELS)).toEqual(['order_deadlines', 'overdue_tasks', 'cascade_summaries'])
  })

  it('each entry has title and description', () => {
    for (const key of Object.keys(PREFERENCE_LABELS) as Array<keyof typeof PREFERENCE_LABELS>) {
      expect(PREFERENCE_LABELS[key].title).toBeTruthy()
      expect(PREFERENCE_LABELS[key].description).toBeTruthy()
    }
  })
})

// ---------- Constants ----------

describe('warning days bounds', () => {
  it('min is 1', () => {
    expect(WARNING_DAYS_MIN).toBe(1)
  })

  it('max is 14', () => {
    expect(WARNING_DAYS_MAX).toBe(14)
  })
})
