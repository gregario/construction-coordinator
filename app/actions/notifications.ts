'use server'

import { createClient } from '@/lib/supabase/server'

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
