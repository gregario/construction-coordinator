'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { validateWarningDays, type PreferenceKey } from '@/lib/notifications/preferences'

export interface NotificationPreferences {
  order_deadlines: boolean
  overdue_tasks: boolean
  cascade_summaries: boolean
  order_warning_days: number
}

const DEFAULTS: NotificationPreferences = {
  order_deadlines: true,
  overdue_tasks: true,
  cascade_summaries: true,
  order_warning_days: 3,
}

const BOOLEAN_KEYS: ReadonlySet<string> = new Set(['order_deadlines', 'overdue_tasks', 'cascade_summaries'])

/**
 * Ensure a notification_preferences row exists for the authenticated user.
 * Returns the current preferences (creating with defaults if missing).
 */
export async function ensureNotificationPreferences(): Promise<NotificationPreferences> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existing } = await (supabase.from('notification_preferences') as any)
    .select('order_deadlines, overdue_tasks, cascade_summaries, order_warning_days')
    .eq('user_id', user.id)
    .single()

  if (existing) {
    return {
      order_deadlines: existing.order_deadlines,
      overdue_tasks: existing.overdue_tasks,
      cascade_summaries: existing.cascade_summaries,
      order_warning_days: existing.order_warning_days,
    }
  }

  // Insert defaults
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('notification_preferences') as any)
    .insert({
      user_id: user.id,
      ...DEFAULTS,
    })

  if (error) {
    // Race condition: another request inserted first — read it back
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: retry } = await (supabase.from('notification_preferences') as any)
      .select('order_deadlines, overdue_tasks, cascade_summaries, order_warning_days')
      .eq('user_id', user.id)
      .single()

    if (retry) return retry as NotificationPreferences
    throw new Error('Failed to create notification preferences')
  }

  return DEFAULTS
}

/**
 * Toggle a boolean notification preference.
 * Returns the new value after toggle.
 */
export async function toggleNotificationPreference(key: PreferenceKey): Promise<{ ok: boolean; value: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, value: false, error: 'Unauthorized' }

  if (!BOOLEAN_KEYS.has(key)) {
    return { ok: false, value: false, error: 'Invalid preference key' }
  }

  // Ensure row exists first
  await ensureNotificationPreferences()

  // Read current value
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: current } = await (supabase.from('notification_preferences') as any)
    .select(key)
    .eq('user_id', user.id)
    .single()

  if (!current) return { ok: false, value: false, error: 'Preferences not found' }

  const newValue = !current[key]

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('notification_preferences') as any)
    .update({ [key]: newValue })
    .eq('user_id', user.id)

  if (error) return { ok: false, value: current[key], error: error.message }

  revalidatePath('/settings')
  return { ok: true, value: newValue }
}

/**
 * Update the order_warning_days preference.
 * Validates input is integer 1–14 before persisting.
 */
export async function updateOrderWarningDays(days: number): Promise<{ ok: boolean; value: number; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, value: days, error: 'Unauthorized' }

  const validation = validateWarningDays(days)
  if (!validation.ok) {
    return { ok: false, value: days, error: validation.error! }
  }

  // Ensure row exists first
  await ensureNotificationPreferences()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('notification_preferences') as any)
    .update({ order_warning_days: validation.value })
    .eq('user_id', user.id)

  if (error) return { ok: false, value: days, error: error.message }

  revalidatePath('/settings')
  return { ok: true, value: validation.value }
}
