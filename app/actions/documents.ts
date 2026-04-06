'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { buildDocumentStoragePath } from '@/lib/documents/operations'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LooseClient = any

const BUCKET = 'documents'

export type DocumentRecord = {
  id: string
  project_id: string
  task_id: string | null
  stage_id: string | null
  storage_path: string
  file_name: string
  file_type: string
  file_size: number | null
  created_at: string
}

export type UploadDocumentResult =
  | { ok: true; document: DocumentRecord }
  | { ok: false; error: string }

export type DeleteDocumentResult =
  | { ok: true }
  | { ok: false; error: string }

export type DownloadDocumentResult =
  | { ok: true; signedUrl: string }
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
 * Upload a document to Supabase Storage and create a metadata row.
 * AC-DS-1: file uploads to 'documents' bucket, Document record created.
 */
export async function uploadDocument(formData: FormData): Promise<UploadDocumentResult> {
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
  const storagePath = buildDocumentStoragePath(projectId, entityId, file.name)

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
  const { data: document, error: insertError } = await supabase
    .from('documents')
    .insert({
      project_id: projectId,
      task_id: taskId,
      stage_id: stageId,
      storage_path: storagePath,
      file_name: file.name,
      file_type: file.type,
      file_size: file.size,
    })
    .select()
    .single()

  if (insertError) {
    // Clean up the uploaded file if metadata insert fails
    await supabase.storage.from(BUCKET).remove([storagePath])
    return { ok: false, error: `Failed to save document metadata: ${insertError.message}` }
  }

  // Revalidate affected pages
  if (taskId) revalidatePath(`/tasks/${taskId}`)
  if (stageId) revalidatePath(`/stages/${stageId}`)

  return { ok: true, document: document as DocumentRecord }
}

/**
 * Generate a signed download URL for a document.
 * AC-DS-3: signed URL valid for 60 seconds.
 */
export async function getDocumentDownloadUrl(
  projectId: string,
  documentId: string
): Promise<DownloadDocumentResult> {
  const supabase = (await createClient()) as unknown as LooseClient
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Not authenticated' }

  const isOwner = await verifyProjectOwnership(supabase, projectId, user.id)
  if (!isOwner) return { ok: false, error: 'Not authorized' }

  const { data: doc } = await supabase
    .from('documents')
    .select('storage_path')
    .eq('id', documentId)
    .eq('project_id', projectId)
    .maybeSingle()

  if (!doc) return { ok: false, error: 'Document not found' }

  const { data: urlData, error: urlError } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(doc.storage_path, 60)

  if (urlError || !urlData?.signedUrl) {
    return { ok: false, error: 'Failed to generate download URL' }
  }

  return { ok: true, signedUrl: urlData.signedUrl }
}

/**
 * Delete a document — removes both the storage object and the metadata row.
 */
export async function deleteDocument(
  projectId: string,
  documentId: string
): Promise<DeleteDocumentResult> {
  const supabase = (await createClient()) as unknown as LooseClient
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Not authenticated' }

  const isOwner = await verifyProjectOwnership(supabase, projectId, user.id)
  if (!isOwner) return { ok: false, error: 'Not authorized' }

  const { data: doc } = await supabase
    .from('documents')
    .select('id, storage_path, task_id, stage_id')
    .eq('id', documentId)
    .eq('project_id', projectId)
    .maybeSingle()

  if (!doc) return { ok: false, error: 'Document not found' }

  // Delete from storage first
  const { error: storageError } = await supabase.storage
    .from(BUCKET)
    .remove([doc.storage_path])

  if (storageError) {
    return { ok: false, error: `Failed to delete file: ${storageError.message}` }
  }

  // Delete metadata row
  const { error: deleteError } = await supabase
    .from('documents')
    .delete()
    .eq('id', documentId)

  if (deleteError) {
    return { ok: false, error: `Failed to delete document record: ${deleteError.message}` }
  }

  // Revalidate affected pages
  if (doc.task_id) revalidatePath(`/tasks/${doc.task_id}`)
  if (doc.stage_id) revalidatePath(`/stages/${doc.stage_id}`)

  return { ok: true }
}
