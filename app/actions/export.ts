'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { Project, Stage, Task, Material, Trade, Photo, Document } from '@/types/database'

export interface ExportPayload {
  project: Project
  stages: Stage[]
  tasks: Task[]
  materials: Material[]
  trades: Trade[]
  photos: Photo[]
  documents: Document[]
}

/**
 * Fetch all project data for export. Verifies ownership via auth.
 * Returns the raw data — formatting (JSON/CSV) happens client-side.
 */
export async function fetchExportData(): Promise<ExportPayload> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Get the user's active project — cast to `any` to work around missing Relationships[] in generated types
  const { data: project } = await (supabase.from('projects') as any)
    .select('*')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (!project) {
    throw new Error('No active project found')
  }

  // Fetch tasks first (needed for materials.task_id filter), then the rest in parallel
  const { data: taskRows } = await (supabase.from('tasks') as any).select('*').eq('project_id', project.id).order('order_index')
  const taskIds: string[] = (taskRows ?? []).map((t: any) => t.id)

  const [stagesResult, materialsResult, tradesResult, photosResult, documentsResult] = await Promise.all([
    (supabase.from('stages') as any).select('*').eq('project_id', project.id).order('order_index'),
    taskIds.length > 0
      ? (supabase.from('materials') as any).select('*').in('task_id', taskIds)
      : Promise.resolve({ data: [] }),
    (supabase.from('trades') as any).select('*').eq('project_id', project.id).order('name'),
    (supabase.from('photos') as any).select('*').eq('project_id', project.id).order('created_at'),
    (supabase.from('documents') as any).select('*').eq('project_id', project.id).order('created_at'),
  ])

  return {
    project: project as Project,
    stages: (stagesResult.data ?? []) as Stage[],
    tasks: (taskRows ?? []) as Task[],
    materials: (materialsResult.data ?? []) as Material[],
    trades: (tradesResult.data ?? []) as Trade[],
    photos: (photosResult.data ?? []) as Photo[],
    documents: (documentsResult.data ?? []) as Document[],
  }
}
