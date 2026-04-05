import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/supabase/types'

type PushSubscriptionInsert = Database['public']['Tables']['push_subscriptions']['Insert']

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { endpoint, keys } = await request.json()

  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return NextResponse.json({ error: 'Invalid subscription data' }, { status: 400 })
  }

  const payload: PushSubscriptionInsert = {
    user_id: user.id,
    endpoint,
    p256dh: keys.p256dh,
    auth_key: keys.auth,
    is_active: true,
    updated_at: new Date().toISOString(),
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('push_subscriptions') as any).upsert(payload, { onConflict: 'endpoint' })

  if (error) {
    console.error('push_subscribe error:', JSON.stringify(error))
    return NextResponse.json({ error: 'Failed to save subscription' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

export async function DELETE(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { endpoint } = await request.json()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from('push_subscriptions') as any)
    .update({ is_active: false } as Database['public']['Tables']['push_subscriptions']['Update'])
    .eq('endpoint', endpoint)
    .eq('user_id', user.id)

  return NextResponse.json({ success: true })
}
