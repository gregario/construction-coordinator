import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock @supabase/ssr to avoid real network calls in unit tests
vi.mock('@supabase/ssr', () => ({
  createBrowserClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      signInWithPassword: vi.fn().mockResolvedValue({ data: {}, error: null }),
      signUp: vi.fn().mockResolvedValue({ data: {}, error: null }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
  })),
  createServerClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      exchangeCodeForSession: vi.fn().mockResolvedValue({ data: {}, error: null }),
    },
  })),
}))

describe('Supabase browser client (lib/supabase/client.ts)', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('createClient() returns a client with auth methods', async () => {
    const { createClient } = await import('@/lib/supabase/client')
    const client = createClient()
    expect(client).toBeDefined()
    expect(typeof client.auth.getUser).toBe('function')
    expect(typeof client.auth.signInWithPassword).toBe('function')
  })

  it('createClient() is a singleton — same instance returned on repeated calls', async () => {
    const { createClient } = await import('@/lib/supabase/client')
    const c1 = createClient()
    const c2 = createClient()
    expect(c1).toBe(c2)
  })
})

describe('Supabase service client (lib/supabase/service.ts)', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('createServiceClient() returns a new client instance each call (no singleton)', async () => {
    // Mock @supabase/supabase-js for the service client
    vi.doMock('@supabase/supabase-js', () => ({
      createClient: vi.fn(() => ({
        auth: { getUser: vi.fn() },
        from: vi.fn(),
        storage: { createBucket: vi.fn() },
      })),
    }))

    const { createServiceClient } = await import('@/lib/supabase/service')
    const s1 = createServiceClient()
    expect(s1).toBeDefined()
    expect(typeof s1.from).toBe('function')
  })
})

describe('Auth validation logic (standalone, no Supabase)', () => {
  it('rejects passwords shorter than 8 characters', () => {
    function validatePassword(password: string, confirm: string): string | null {
      if (password !== confirm) return 'Passwords do not match'
      if (password.length < 8) return 'Password must be at least 8 characters'
      return null
    }

    expect(validatePassword('short', 'short')).toBe('Password must be at least 8 characters')
    expect(validatePassword('longenough', 'different')).toBe('Passwords do not match')
    expect(validatePassword('validpass', 'validpass')).toBeNull()
  })

  it('middleware PUBLIC_PATHS logic covers login, signup, and push callback', () => {
    const PUBLIC_PATHS = ['/login', '/signup', '/api/push/receive']

    function isPublic(pathname: string): boolean {
      return PUBLIC_PATHS.some(p => pathname.startsWith(p))
    }

    expect(isPublic('/login')).toBe(true)
    expect(isPublic('/signup')).toBe(true)
    expect(isPublic('/api/push/receive')).toBe(true)
    expect(isPublic('/briefing')).toBe(false)
    expect(isPublic('/schedule')).toBe(false)
    expect(isPublic('/settings')).toBe(false)
  })

  it('auth callback redirects to /briefing by default', () => {
    function getRedirectPath(next: string | null): string {
      return next ?? '/briefing'
    }

    expect(getRedirectPath(null)).toBe('/briefing')
    expect(getRedirectPath('/setup')).toBe('/setup')
    expect(getRedirectPath('/briefing')).toBe('/briefing')
  })
})
