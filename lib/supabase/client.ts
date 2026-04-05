// @test: createClient() returns the same singleton instance on repeated calls
// @test: singleton is not shared across SSR requests (module-level var is fine for browser only)

import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/lib/supabase/types'

let client: ReturnType<typeof createBrowserClient<Database>> | undefined

export function createClient() {
  if (client) return client
  client = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  return client
}
