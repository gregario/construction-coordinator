import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/supabase/types'
import { ProjectCreationForm } from '@/components/setup/ProjectCreationForm'
import { TemplateBrowser } from '@/components/setup/TemplateBrowser'
import { CustomizationScreen } from '@/components/setup/CustomizationScreen'
import { BlockManager } from '@/components/setup/BlockManager'
import { MethodPicker } from '@/components/setup/MethodPicker'
import {
  summarizeTemplate,
  type TemplateRecord,
  type TemplateSummary,
} from '@/lib/templates/apply'
import type {
  CustomizationStage,
  CustomizationTask,
  TaskDependencyRow,
} from '@/lib/customization/tree'
import type { BlockRow } from '@/app/actions/blocks'

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

  // Project in setup → determine which step to show
  if (project && project.status === 'setup') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const loose = supabase as any

    // Step 2: Check if blocks exist for this project
    const blocksRes = await loose
      .from('blocks')
      .select('id, name, attachment_type, storeys, order_index, construction_scheme')
      .eq('project_id', project.id)
      .order('order_index', { ascending: true })
    const existingBlocks = (blocksRes.data ?? []) as BlockRow[]

    if (existingBlocks.length === 0) {
      // No blocks yet → show block manager (Step 2)
      return (
        <div className="p-4 md:p-8 max-w-2xl">
          <h1 className="text-2xl font-semibold text-[#2B1F17] mb-1">
            Add your buildings
          </h1>
          <p className="text-[#6B5D52] text-sm mb-6">
            Each block gets its own construction scheme. Add at least one block to continue.
          </p>
          <BlockManager projectId={project.id} initialBlocks={[]} />
          <div className="mt-6 flex justify-end">
            <span className="text-xs text-[#6B5D52]">
              Add a block above, then the construction scheme picker will appear.
            </span>
          </div>
        </div>
      )
    }

    // Check if stages exist (template/method applied)
    const stageCountRes = await loose
      .from('stages')
      .select('id', { count: 'exact', head: true })
      .eq('project_id', project.id)
    const existingStageCount = (stageCountRes.count as number | null) ?? 0

    if (existingStageCount > 0) {
      // Load stages, tasks, and dependencies for the customization screen
      const [stagesRes, tasksRes, depsRes] = await Promise.all([
        loose
          .from('stages')
          .select('id, name, color, order_index')
          .eq('project_id', project.id)
          .order('order_index', { ascending: true }),
        loose
          .from('tasks')
          .select('id, stage_id, name, order_index, duration_days, notes')
          .eq('project_id', project.id)
          .order('order_index', { ascending: true }),
        loose
          .from('task_dependencies')
          .select('task_id, depends_on_task_id'),
      ])

      const stages = (stagesRes.data ?? []) as CustomizationStage[]
      const tasks = (tasksRes.data ?? []) as CustomizationTask[]
      const taskIds = new Set(tasks.map(t => t.id))
      const deps = ((depsRes.data ?? []) as TaskDependencyRow[]).filter(
        d => taskIds.has(d.task_id) && taskIds.has(d.depends_on_task_id)
      )

      return (
        <div className="p-4 md:p-8 max-w-6xl">
          <h1 className="text-2xl font-semibold text-[#2B1F17] mb-1">
            Customize &ldquo;{project.name}&rdquo;
          </h1>
          <p className="text-[#6B5D52] text-sm mb-6">
            Toggle substages off that don&rsquo;t apply, or describe your build to the AI
            assistant for tailored suggestions.
          </p>
          <CustomizationScreen
            projectId={project.id}
            projectName={project.name}
            stages={stages}
            tasks={tasks}
            dependencies={deps}
          />
        </div>
      )
    }

    // Blocks exist but no stages → show construction method picker
    return (
      <div className="p-4 md:p-8 max-w-3xl">
        <h1 className="text-2xl font-semibold text-[#2B1F17] mb-1">
          Construction Scheme
        </h1>
        <p className="text-[#6B5D52] text-sm mb-6">
          Pick your construction methods for &ldquo;{project.name}&rdquo;. Each category
          generates substages for your schedule.
        </p>
        <div className="bg-white rounded-lg border border-[#E8DFD3] p-4 md:p-6">
          <MethodPicker
            projectId={project.id}
            blocks={existingBlocks}
            startDate={project.start_date ?? new Date().toISOString().split('T')[0]}
          />
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
