'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { validateProjectForm, hasBlockingErrors } from '@/lib/projects/validate'

export type CreateProjectResult =
  | { ok: true }
  | { ok: false; error: string; field?: 'name' | 'start_date' | 'auth' | 'server' }

export async function createProject(formData: FormData): Promise<CreateProjectResult> {
  const name = String(formData.get('name') ?? '').trim()
  const address = String(formData.get('address') ?? '').trim()
  const start_date = String(formData.get('start_date') ?? '').trim()
  const past_date_confirmed = formData.get('past_date_confirmed') === 'true'

  const { errors } = validateProjectForm(
    { name, address, start_date, past_date_confirmed },
    new Date()
  )
  if (hasBlockingErrors(errors)) {
    const firstField = (Object.keys(errors) as Array<'name' | 'start_date'>)[0]
    return { ok: false, error: errors[firstField] ?? 'Invalid form', field: firstField }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { ok: false, error: 'You must be signed in', field: 'auth' }
  }

  // Cast: lib/supabase/types.ts lacks Relationships[] on each table so the
  // typed insert path resolves to `never`. Foundation eval flagged this drift
  // and recommended casting at call sites until types are regenerated.
  const { error } = await (supabase.from('projects') as unknown as {
    insert: (row: Record<string, unknown>) => Promise<{ error: { message: string } | null }>
  }).insert({
    user_id: user.id,
    name,
    address: address || null,
    start_date,
    status: 'setup',
  })

  if (error) {
    return { ok: false, error: error.message, field: 'server' }
  }

  revalidatePath('/', 'layout')
  redirect('/setup')
}
