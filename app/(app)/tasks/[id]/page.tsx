import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

interface Props {
  params: Promise<{ id: string }>
}

export default async function TaskDetailPage({ params }: Props) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { id } = await params

  return (
    <main className="p-4">
      <h1 className="text-xl font-semibold text-gray-900">Task</h1>
      <p className="text-sm text-gray-500 mt-1">Task ID: {id} — Foundation ready — feature build coming next.</p>
    </main>
  )
}
