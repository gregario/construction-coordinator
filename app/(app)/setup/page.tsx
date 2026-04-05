import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/supabase/types'
import { ProjectCreationForm } from '@/components/setup/ProjectCreationForm'
import { TemplateBrowser } from '@/components/setup/TemplateBrowser'
import {
  summarizeTemplate,
  type TemplateRecord,
  type TemplateSummary,
} from '@/lib/templates/apply'

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

  // Project in setup → show template browser (or template-applied placeholder)
  if (project && project.status === 'setup') {
    // If stages already exist for this project, the template was applied.
    // The customization step (next story) refines the tree; until then,
    // show a holding view rather than letting the user double-apply.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const loose = supabase as any
    const stageCountRes = await loose
      .from('stages')
      .select('id', { count: 'exact', head: true })
      .eq('project_id', project.id)

    const existingStageCount = (stageCountRes.count as number | null) ?? 0

    if (existingStageCount > 0) {
      return (
        <div className="p-4 md:p-8 max-w-2xl">
          <h1 className="text-2xl font-semibold text-[#2B1F17] mb-1">
            Template applied
          </h1>
          <p className="text-[#6B5D52] text-sm mb-6">
            {existingStageCount} {existingStageCount === 1 ? 'stage' : 'stages'} added to{' '}
            &ldquo;{project.name}&rdquo;. Customization coming next.
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

    // Load templates and build summaries on the server to keep the browser payload small.
    const tplRes = await loose
      .from('templates')
      .select('id, name, description, total_duration_days, stages')
      .order('name', { ascending: true })

    const templates = (tplRes.data ?? []) as TemplateRecord[]
    const summaries: TemplateSummary[] = templates.map(summarizeTemplate)

    return (
      <div className="p-4 md:p-8 max-w-5xl">
        <h1 className="text-2xl font-semibold text-[#2B1F17] mb-1">
          Choose a template
        </h1>
        <p className="text-[#6B5D52] text-sm mb-6">
          Pick a residential build template for &ldquo;{project.name}&rdquo;. You can
          customize it next.
        </p>
        {summaries.length === 0 ? (
          <div className="rounded-lg border border-[#E8DFD3] bg-white p-6">
            <p className="text-sm text-[#6B5D52]">No templates available yet.</p>
          </div>
        ) : (
          <TemplateBrowser projectId={project.id} summaries={summaries} />
        )}
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
