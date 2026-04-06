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

  // Cast: lib/supabase/types.ts lacks Relationships[] — use loose client
  const loose = supabase as any
  const { data: newProject, error } = await loose
    .from('projects')
    .insert({
      user_id: user.id,
      name,
      address: address || null,
      start_date,
      status: 'setup',
    })
    .select('id')
    .single()

  if (error) {
    return { ok: false, error: error.message, field: 'server' }
  }

  // Auto-create default "Main Building" block
  if (newProject?.id) {
    await loose.from('blocks').insert({
      project_id: newProject.id,
      name: 'Main Building',
      attachment_type: 'attached',
      storeys: 2,
      order_index: 0,
    })
  }

  revalidatePath('/', 'layout')
  redirect('/setup')
}

export async function updateProjectDetails(
  projectId: string,
  data: { name: string; address: string | null }
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!data.name.trim()) {
    return { ok: false, error: 'Project name is required' }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Not authenticated' }

  const { error } = await (supabase as any)
    .from('projects')
    .update({ name: data.name.trim(), address: data.address })
    .eq('id', projectId)
    .eq('user_id', user.id)

  if (error) return { ok: false, error: error.message }

  revalidatePath('/', 'layout')
  return { ok: true }
}
