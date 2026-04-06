// Pure functions for document operations — no DB or storage calls.

const MAX_FILE_SIZE = 25 * 1024 * 1024 // 25 MB

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
])

export type DocumentValidationError = {
  field: 'file'
  message: string
}

export type DocumentValidationResult =
  | { valid: true }
  | { valid: false; error: DocumentValidationError }

/**
 * Validate a file before upload.
 * Checks MIME type and file size against the documents bucket constraints.
 * AC-DS-4: rejects files > 25 MB with the exact spec message.
 */
export function validateDocumentFile(
  file: { type: string; size: number; name: string }
): DocumentValidationResult {
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return {
      valid: false,
      error: {
        field: 'file',
        message: `Unsupported file type "${file.type}". Accepted: PDF, JPEG, PNG, DOCX, XLSX.`,
      },
    }
  }
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: {
        field: 'file',
        message: 'Files must be under 25 MB — consider compressing the document',
      },
    }
  }
  return { valid: true }
}

/**
 * Build the storage path for a document.
 * Convention: {project_id}/{entity_id}/{timestamp}-{sanitized_name}
 * Same convention as photos — reuses the sanitization logic.
 */
export function buildDocumentStoragePath(
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
 * Re-exported — same logic as photos/operations.
 */
export function formatFileSize(bytes: number | null): string {
  if (bytes === null || bytes <= 0) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/**
 * Format upload date for display.
 */
export function formatUploadDate(isoDate: string | null): string {
  if (!isoDate) return ''
  const d = new Date(isoDate)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-IE', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

/**
 * Map a MIME type to a file type icon category.
 * Used by the UI to render the appropriate icon per document row (AC-DS-2).
 */
export function fileTypeIcon(
  mimeType: string
): 'pdf' | 'word' | 'excel' | 'image' | 'file' {
  if (mimeType === 'application/pdf') return 'pdf'
  if (mimeType.includes('wordprocessingml')) return 'word'
  if (mimeType.includes('spreadsheetml')) return 'excel'
  if (mimeType.startsWith('image/')) return 'image'
  return 'file'
}
