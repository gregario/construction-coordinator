'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { buildStoragePath } from '@/lib/photos/operations'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LooseClient = any

const BUCKET = 'photos'

export type PhotoRecord = {
  id: string
  project_id: string
  task_id: string | null
  stage_id: string | null
  storage_path: string
  file_name: string
  file_size: number | null
  taken_at: string | null
  created_at: string
}

export type UploadPhotoResult =
  | { ok: true; photo: PhotoRecord }
  | { ok: false; error: string }

export type DeletePhotoResult =
  | { ok: true }
  | { ok: false; error: string }

async function verifyProjectOwnership(
  supabase: LooseClient,
  projectId: string,
  userId: string
): Promise<boolean> {
  const { data } = await supabase
    .from('projects')
    .select('id')
    .eq('id', projectId)
    .eq('user_id', userId)
    .maybeSingle()
  return !!data
}

/**
 * Upload a photo to Supabase Storage and create a metadata row.
 * Called from the client with FormData containing the file + metadata.
 */
export async function uploadPhoto(formData: FormData): Promise<UploadPhotoResult> {
  const supabase = (await createClient()) as unknown as LooseClient
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Not authenticated' }

  const file = formData.get('file') as File | null
  const projectId = formData.get('projectId') as string | null
  const taskId = (formData.get('taskId') as string | null) || null
  const stageId = (formData.get('stageId') as string | null) || null

  if (!file || !projectId) {
    return { ok: false, error: 'Missing required fields' }
  }

  const isOwner = await verifyProjectOwnership(supabase, projectId, user.id)
  if (!isOwner) return { ok: false, error: 'Not authorized' }

  // Build storage path using entity context
  const entityId = taskId ?? stageId ?? 'project'
  const storagePath = buildStoragePath(projectId, entityId, file.name)

  // Upload to Supabase Storage
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, file, {
      contentType: file.type,
      upsert: false,
    })

  if (uploadError) {
    return { ok: false, error: `Upload failed: ${uploadError.message}` }
  }

  // Insert metadata row
  const { data: photo, error: insertError } = await supabase
    .from('photos')
    .insert({
      project_id: projectId,
      task_id: taskId,
      stage_id: stageId,
      storage_path: storagePath,
      file_name: file.name,
      file_size: file.size,
      taken_at: null,
    })
    .select()
    .single()

  if (insertError) {
    // Clean up the uploaded file if metadata insert fails
    await supabase.storage.from(BUCKET).remove([storagePath])
    return { ok: false, error: `Failed to save photo metadata: ${insertError.message}` }
  }

  // Revalidate affected pages
  if (taskId) revalidatePath(`/tasks/${taskId}`)
  if (stageId) revalidatePath(`/stages/${stageId}`)
  revalidatePath('/photos')

  return { ok: true, photo: photo as PhotoRecord }
}

/**
 * Delete a photo — removes both the storage object and the metadata row.
 */
export async function deletePhoto(
  projectId: string,
  photoId: string
): Promise<DeletePhotoResult> {
  const supabase = (await createClient()) as unknown as LooseClient
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Not authenticated' }

  const isOwner = await verifyProjectOwnership(supabase, projectId, user.id)
  if (!isOwner) return { ok: false, error: 'Not authorized' }

  // Fetch the photo to get storage_path and associated entity IDs
  const { data: photo } = await supabase
    .from('photos')
    .select('id, storage_path, task_id, stage_id')
    .eq('id', photoId)
    .eq('project_id', projectId)
    .maybeSingle()

  if (!photo) return { ok: false, error: 'Photo not found' }

  // Delete from storage first
  const { error: storageError } = await supabase.storage
    .from(BUCKET)
    .remove([photo.storage_path])

  if (storageError) {
    return { ok: false, error: `Failed to delete file: ${storageError.message}` }
  }

  // Delete metadata row
  const { error: deleteError } = await supabase
    .from('photos')
    .delete()
    .eq('id', photoId)

  if (deleteError) {
    return { ok: false, error: `Failed to delete photo record: ${deleteError.message}` }
  }

  // Revalidate affected pages
  if (photo.task_id) revalidatePath(`/tasks/${photo.task_id}`)
  if (photo.stage_id) revalidatePath(`/stages/${photo.stage_id}`)
  revalidatePath('/photos')

  return { ok: true }
}
