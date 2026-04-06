// Pure functions for photo operations — no DB or storage calls.

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
])

export type PhotoValidationError = {
  field: 'file'
  message: string
}

export type PhotoValidationResult =
  | { valid: true }
  | { valid: false; error: PhotoValidationError }

/**
 * Validate a file before upload.
 * Checks MIME type and file size against the storage bucket constraints.
 */
export function validatePhotoFile(
  file: { type: string; size: number; name: string }
): PhotoValidationResult {
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return {
      valid: false,
      error: {
        field: 'file',
        message: `Unsupported file type "${file.type}". Accepted: JPEG, PNG, WebP, HEIC.`,
      },
    }
  }
  if (file.size > MAX_FILE_SIZE) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(1)
    return {
      valid: false,
      error: {
        field: 'file',
        message: `File is ${sizeMB} MB — maximum is 10 MB.`,
      },
    }
  }
  return { valid: true }
}

/**
 * Build the storage path for a photo.
 * Convention: {project_id}/{entity_id}/{timestamp}-{sanitized_name}
 */
export function buildStoragePath(
  projectId: string,
  entityId: string,
  fileName: string,
  timestamp: number = Date.now()
): string {
  const sanitized = fileName
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_{2,}/g, '_')
    .toLowerCase()
  return `${projectId}/${entityId}/${timestamp}-${sanitized}`
}

/**
 * Format file size for display (e.g. "2.3 MB", "450 KB").
 */
export function formatFileSize(bytes: number | null): string {
  if (bytes === null || bytes <= 0) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/**
 * Format taken_at date for display.
 */
export function formatPhotoDate(isoDate: string | null): string {
  if (!isoDate) return ''
  const d = new Date(isoDate)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-IE', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export type PhotoListItem = {
  id: string
  storage_path: string
  file_name: string
  file_size: number | null
  taken_at: string | null
  created_at: string
  task_id: string | null
  stage_id: string | null
}

export type PhotosByStage = {
  stage_id: string
  stage_name: string
  stage_color: string
  photos: PhotoListItem[]
}

/**
 * Group photos by stage for the /photos gallery view.
 * Photos without a stage go into an "Unassigned" group.
 * Within each group, photos are sorted most-recent first by created_at.
 */
export function groupPhotosByStage(
  photos: PhotoListItem[],
  stages: Array<{ id: string; name: string; color: string; order_index: number }>
): PhotosByStage[] {
  const stageMap = new Map(stages.map(s => [s.id, s]))
  const groups = new Map<string, PhotoListItem[]>()

  for (const photo of photos) {
    const key = photo.stage_id ?? '__unassigned__'
    const existing = groups.get(key) ?? []
    existing.push(photo)
    groups.set(key, existing)
  }

  // Sort photos within each group: most recent first
  for (const items of groups.values()) {
    items.sort((a, b) => b.created_at.localeCompare(a.created_at))
  }

  // Build result: stages in order_index order, unassigned at the end
  const result: PhotosByStage[] = []

  for (const stage of stages.sort((a, b) => a.order_index - b.order_index)) {
    const stagePhotos = groups.get(stage.id)
    if (stagePhotos && stagePhotos.length > 0) {
      result.push({
        stage_id: stage.id,
        stage_name: stage.name,
        stage_color: stage.color,
        photos: stagePhotos,
      })
    }
  }

  const unassigned = groups.get('__unassigned__')
  if (unassigned && unassigned.length > 0) {
    result.push({
      stage_id: '__unassigned__',
      stage_name: 'Unassigned',
      stage_color: '#6B5D52',
      photos: unassigned,
    })
  }

  return result
}
