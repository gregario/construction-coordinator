import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/supabase/types'
import { ProjectCreationForm } from '@/components/setup/ProjectCreationForm'

type ProjectRow = Database['public']['Tables']['projects']['Row']

export default async function SetupPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const result = await supabase
    .from('projects')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const project = result.data as ProjectRow | null

  // Project already active — user shouldn't be on /setup
  if (project && project.status === 'active') redirect('/briefing')

  // Project in setup: show template browser placeholder (built in next story)
  if (project && project.status === 'setup') {
    return (
      <div className="p-4 md:p-8 max-w-2xl">
        <h1 className="text-2xl font-semibold text-[#2B1F17] mb-1">Choose a template</h1>
        <p className="text-[#6B5D52] text-sm mb-6">
          Project &ldquo;{project.name}&rdquo; created. Template browser coming next.
        </p>
        <div className="rounded-lg border border-[#E8DFD3] bg-white p-6">
          <p className="text-sm text-[#6B5D52]">
            Start date: {project.start_date}
            {project.address ? ` · ${project.address}` : ''}
          </p>
        </div>
      </div>
    )
  }

  // No project yet — show the creation form
  return (
    <div className="p-4 md:p-8 max-w-2xl">
      <h1 className="text-2xl font-semibold text-[#2B1F17] mb-1">Create your build project</h1>
      <p className="text-[#6B5D52] text-sm mb-6">
        Give your project a name and start date. You can refine the details after.
      </p>
      <div className="bg-white rounded-lg border border-[#E8DFD3] p-4 md:p-6">
        <ProjectCreationForm />
      </div>
    </div>
  )
}
