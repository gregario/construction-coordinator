import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { SnagList } from '@/components/snags/SnagList'
import { listSnags } from '@/app/actions/snags'

type LooseClient = any // eslint-disable-line @typescript-eslint/no-explicit-any

export default async function SnagsPage() {
  const supabase = (await createClient()) as unknown as LooseClient
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const projectRes = await supabase
    .from('projects')
    .select('id, name, status')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const project = projectRes.data as { id: string; name: string; status: string } | null
  if (!project || project.status === 'setup') redirect('/setup')

  const [snags, blocksRes, stagesRes, tradesRes] = await Promise.all([
    listSnags(project.id),
    supabase.from('blocks').select('id, name').eq('project_id', project.id).order('order_index'),
    supabase.from('stages').select('id, name').eq('project_id', project.id).order('order_index'),
    supabase.from('trades').select('id, name').eq('project_id', project.id).order('name'),
  ])

  return (
    <div className="p-4 md:p-8 max-w-2xl">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-[#2B1F17]">Snags</h1>
        <p className="text-[#6B5D52] text-sm">{project.name}</p>
      </header>

      <SnagList
        projectId={project.id}
        initialSnags={snags}
        blocks={(blocksRes.data ?? []) as { id: string; name: string }[]}
        stages={(stagesRes.data ?? []) as { id: string; name: string }[]}
        trades={(tradesRes.data ?? []) as { id: string; name: string }[]}
      />
    </div>
  )
}
