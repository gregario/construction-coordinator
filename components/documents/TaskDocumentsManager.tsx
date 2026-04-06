'use client'

import { useState, useTransition, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  validateDocumentFile,
  formatFileSize,
  formatUploadDate,
  fileTypeIcon,
} from '@/lib/documents/operations'
import {
  uploadDocument,
  deleteDocument,
  getDocumentDownloadUrl,
} from '@/app/actions/documents'

export type DocumentListItem = {
  id: string
  storage_path: string
  file_name: string
  file_type: string
  file_size: number | null
  created_at: string
}

type Props = {
  projectId: string
  entityId: string
  entityType: 'task' | 'stage'
  stageId: string | null
  initialDocuments: DocumentListItem[]
}

const FILE_TYPE_ICONS: Record<ReturnType<typeof fileTypeIcon>, React.ReactNode> = {
  pdf: (
    <svg data-testid="icon-pdf" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#C0392B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  ),
  word: (
    <svg data-testid="icon-word" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2B579A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  ),
  excel: (
    <svg data-testid="icon-excel" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#217346" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <rect x="8" y="12" width="8" height="6" rx="1" />
    </svg>
  ),
  image: (
    <svg data-testid="icon-image" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6B5D52" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  ),
  file: (
    <svg data-testid="icon-file" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6B5D52" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  ),
}

export function TaskDocumentsManager({
  projectId,
  entityId,
  entityType,
  stageId,
  initialDocuments,
}: Props) {
  const [documents, setDocuments] = useState(initialDocuments)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null)

    const validation = validateDocumentFile({
      type: file.type,
      size: file.size,
      name: file.name,
    })
    if (!validation.valid) {
      setError(validation.error.message)
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    const formData = new FormData()
    formData.append('file', file)
    formData.append('projectId', projectId)
    if (entityType === 'task') {
      formData.append('taskId', entityId)
      if (stageId) formData.append('stageId', stageId)
    } else {
      formData.append('stageId', entityId)
    }

    startTransition(async () => {
      const result = await uploadDocument(formData)
      if (result.ok) {
        setDocuments(prev => [
          {
            id: result.document.id,
            storage_path: result.document.storage_path,
            file_name: result.document.file_name,
            file_type: result.document.file_type,
            file_size: result.document.file_size,
            created_at: result.document.created_at,
          },
          ...prev,
        ])
        router.refresh()
      } else {
        setError(result.error)
      }
      if (fileInputRef.current) fileInputRef.current.value = ''
    })
  }

  function handleDownload(docId: string, fileName: string) {
    setError(null)
    startTransition(async () => {
      const result = await getDocumentDownloadUrl(projectId, docId)
      if (result.ok) {
        // Open signed URL in new tab to trigger download
        const a = globalThis.document.createElement('a')
        a.href = result.signedUrl
        a.download = fileName
        a.target = '_blank'
        a.rel = 'noopener noreferrer'
        a.click()
      } else {
        setError(result.error)
      }
    })
  }

  function handleDelete(docId: string) {
    setError(null)
    startTransition(async () => {
      const result = await deleteDocument(projectId, docId)
      if (result.ok) {
        setDocuments(prev => prev.filter(d => d.id !== docId))
        router.refresh()
      } else {
        setError(result.error)
      }
    })
  }

  return (
    <section
      className="mt-6 rounded-lg border border-[#E8DFD3] bg-white p-4"
      data-testid="task-documents"
    >
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-[#2B1F17]">
          Documents{' '}
          {documents.length > 0 && (
            <span className="font-normal text-[#6B5D52]">({documents.length})</span>
          )}
        </h2>
        <label
          className={`cursor-pointer rounded-md px-3 py-1.5 text-xs font-medium text-white transition-colors ${
            isPending
              ? 'bg-[#C4A882] cursor-not-allowed'
              : 'bg-[#8B5E3C] hover:bg-[#745032]'
          }`}
        >
          {isPending ? 'Uploading…' : '+ Attach Document'}
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.docx,.xlsx"
            className="sr-only"
            onChange={handleFileSelect}
            disabled={isPending}
            data-testid="document-file-input"
          />
        </label>
      </div>

      {error && (
        <p className="mb-3 text-xs text-red-600" role="alert" data-testid="document-error">
          {error}
        </p>
      )}

      {documents.length === 0 ? (
        <p className="text-sm text-[#6B5D52]">
          No documents yet. Tap + Attach Document to upload plans, contracts, or specs.
        </p>
      ) : (
        <div className="space-y-2">
          {documents.map(doc => {
            const iconType = fileTypeIcon(doc.file_type)
            return (
              <div
                key={doc.id}
                className="flex items-center gap-3 rounded-lg border border-[#E8DFD3] bg-[#FAF7F2] px-3 py-2"
                data-testid="document-row"
              >
                <div className="flex-shrink-0">{FILE_TYPE_ICONS[iconType]}</div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-[#2B1F17]">
                    {doc.file_name}
                  </p>
                  <p className="text-xs text-[#6B5D52]">
                    {formatUploadDate(doc.created_at)}
                    {doc.file_size ? ` · ${formatFileSize(doc.file_size)}` : ''}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleDownload(doc.id, doc.file_name)}
                  disabled={isPending}
                  className="flex-shrink-0 rounded-md px-2 py-1 text-xs font-medium text-[#8B5E3C] hover:bg-[#F0E8DC] transition-colors"
                  aria-label={`Download ${doc.file_name}`}
                >
                  Download
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(doc.id)}
                  disabled={isPending}
                  className="flex-shrink-0 rounded-md p-1 text-[#6B5D52] hover:text-red-600 hover:bg-red-50 transition-colors"
                  aria-label={`Delete ${doc.file_name}`}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
