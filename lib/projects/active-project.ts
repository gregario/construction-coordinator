import { cookies } from 'next/headers'

const ACTIVE_PROJECT_COOKIE = 'active_project_id'

export async function getActiveProjectId(): Promise<string | null> {
  const cookieStore = await cookies()
  return cookieStore.get(ACTIVE_PROJECT_COOKIE)?.value ?? null
}

export async function setActiveProjectId(projectId: string): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.set(ACTIVE_PROJECT_COOKIE, projectId, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365, // 1 year
    sameSite: 'lax',
    httpOnly: false, // client-side readable for switcher
  })
}
