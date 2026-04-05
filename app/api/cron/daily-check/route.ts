import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import webpush from 'web-push'

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
)

// This route is called by Vercel Cron — verify the cron secret
export async function GET(request: Request) {
  const authHeader = request.headers.get('Authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Use service role for cron — no user session
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const today = new Date().toISOString().split('T')[0]

  // Get active subscriptions with user notification preferences
  const { data: subscriptions } = await supabase
    .from('push_subscriptions')
    .select('*, notification_preferences!inner(*)')
    .eq('is_active', true)

  if (!subscriptions?.length) return NextResponse.json({ sent: 0 })

  let totalSent = 0

  for (const sub of subscriptions) {
    const prefs = sub.notification_preferences
    const notifications: object[] = []

    if (prefs.order_deadlines) {
      const warningDate = new Date(Date.now() + prefs.order_warning_days * 24 * 60 * 60 * 1000)
        .toISOString().split('T')[0]

      const { data: upcomingMaterials } = await supabase
        .from('materials')
        .select('name, order_by_date, tasks!inner(project_id)')
        .eq('order_status', 'not_ordered')
        .lte('order_by_date', warningDate)
        .gte('order_by_date', today)

      if (upcomingMaterials?.length) {
        notifications.push({
          title: 'Upcoming Material Orders',
          body: `${upcomingMaterials.length} material${upcomingMaterials.length > 1 ? 's' : ''} need ordering soon`,
          url: '/materials',
          tag: 'material-orders',
        })
      }
    }

    if (prefs.overdue_tasks) {
      const { data: projectRow } = await supabase
        .from('projects')
        .select('id')
        .eq('user_id', sub.user_id)
        .single()

      if (projectRow?.id) {
        const { data: overdueTasks } = await supabase
          .from('tasks')
          .select('name, planned_end')
          .lt('planned_end', today)
          .not('status', 'eq', 'complete')
          .eq('project_id', projectRow.id)

        if (overdueTasks?.length) {
          notifications.push({
            title: 'Overdue Tasks',
            body: `${overdueTasks.length} task${overdueTasks.length > 1 ? 's are' : ' is'} overdue`,
            url: '/briefing',
            tag: 'overdue-tasks',
          })
        }
      }
    }

    for (const notification of notifications) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth_key } },
          JSON.stringify(notification),
          { TTL: 86400 }
        )
        totalSent++
      } catch (err: unknown) {
        if (err && typeof err === 'object' && 'statusCode' in err && (err as { statusCode: number }).statusCode === 410) {
          // Subscription expired — mark inactive
          await supabase.from('push_subscriptions').update({ is_active: false }).eq('endpoint', sub.endpoint)
        }
        console.error('push send error:', err)
      }
    }
  }

  return NextResponse.json({ sent: totalSent })
}
