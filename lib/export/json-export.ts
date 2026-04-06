// Pure functions for generating JSON export of a project
import type { Project, Stage, Task, Material, Trade, Photo, Document } from '@/types/database'

export interface ProjectExportData {
  project: Project
  stages: Stage[]
  tasks: Task[]
  materials: Material[]
  trades: Trade[]
  photos: Pick<Photo, 'id' | 'file_name' | 'storage_path' | 'task_id' | 'stage_id' | 'taken_at' | 'created_at'>[]
  documents: Pick<Document, 'id' | 'file_name' | 'file_type' | 'storage_path' | 'task_id' | 'stage_id' | 'created_at'>[]
  exported_at: string
}

/**
 * Assemble a full project export object from its constituent data.
 * Photo/Document entries include metadata (URLs/paths) but not binary data.
 */
export function buildJsonExport(
  project: Project,
  stages: Stage[],
  tasks: Task[],
  materials: Material[],
  trades: Trade[],
  photos: Photo[],
  documents: Document[],
  exportedAt: string
): ProjectExportData {
  return {
    project,
    stages,
    tasks,
    materials,
    trades,
    photos: photos.map(p => ({
      id: p.id,
      file_name: p.file_name,
      storage_path: p.storage_path,
      task_id: p.task_id,
      stage_id: p.stage_id,
      taken_at: p.taken_at,
      created_at: p.created_at,
    })),
    documents: documents.map(d => ({
      id: d.id,
      file_name: d.file_name,
      file_type: d.file_type,
      storage_path: d.storage_path,
      task_id: d.task_id,
      stage_id: d.stage_id,
      created_at: d.created_at,
    })),
    exported_at: exportedAt,
  }
}

/** Serialize the export data to a JSON string */
export function serializeJsonExport(data: ProjectExportData): string {
  return JSON.stringify(data, null, 2)
}
