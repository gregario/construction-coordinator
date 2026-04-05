import { NextResponse } from 'next/server'
import webpush from 'web-push'

export async function POST(request: Request) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT!,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  )
  // Verify internal request (simple shared secret pattern)
  const authHeader = request.headers.get('Authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { subscriptions, notification } = await request.json()

  const results = await Promise.allSettled(
    subscriptions.map((sub: { endpoint: string; p256dh: string; auth_key: string }) =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth_key } },
        JSON.stringify(notification),
        { TTL: 86400 }
      )
    )
  )

  const failed = results.filter(r => r.status === 'rejected').length
  const sent = results.filter(r => r.status === 'fulfilled').length

  console.log(JSON.stringify({ event: 'push.send', sent, failed, total: subscriptions.length }))
  return NextResponse.json({ sent, failed })
}
