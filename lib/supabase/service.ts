// WARNING: This client bypasses RLS. Only use in server-side trusted contexts
// (Route Handlers, Vercel Cron jobs). NEVER import from client components.
// @test: createServiceClient() uses SUPABASE_SERVICE_ROLE_KEY, not anon key
// @test: session auto-refresh is disabled (short-lived server context)

import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'

export function createServiceClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}
