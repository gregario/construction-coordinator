'use client'

import { useState, useTransition, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { validatePhotoFile, formatFileSize, formatPhotoDate } from '@/lib/photos/operations'
import { uploadPhoto, deletePhoto } from '@/app/actions/photos'

export type PhotoListItem = {
  id: string
  storage_path: string
  file_name: string
  file_size: number | null
  taken_at: string | null
  created_at: string
}

type Props = {
  projectId: string
  taskId: string
  stageId: string | null
  initialPhotos: PhotoListItem[]
  signedUrls: Record<string, string>
}

export function TaskPhotosManager({
  projectId,
  taskId,
  stageId,
  initialPhotos,
  signedUrls,
}: Props) {
  const [photos, setPhotos] = useState(initialPhotos)
  const [urls, setUrls] = useState(signedUrls)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null)

    const validation = validatePhotoFile({ type: file.type, size: file.size, name: file.name })
    if (!validation.valid) {
      setError(validation.error.message)
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    const formData = new FormData()
    formData.append('file', file)
    formData.append('projectId', projectId)
    formData.append('taskId', taskId)
    if (stageId) formData.append('stageId', stageId)

    startTransition(async () => {
      const result = await uploadPhoto(formData)
      if (result.ok) {
        setPhotos(prev => [
          {
            id: result.photo.id,
            storage_path: result.photo.storage_path,
            file_name: result.photo.file_name,
            file_size: result.photo.file_size,
            taken_at: result.photo.taken_at,
            created_at: result.photo.created_at,
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

  function handleDelete(photoId: string) {
    setError(null)
    startTransition(async () => {
      const result = await deletePhoto(projectId, photoId)
      if (result.ok) {
        setPhotos(prev => prev.filter(p => p.id !== photoId))
        setUrls(prev => {
          const next = { ...prev }
          delete next[photoId]
          return next
        })
        router.refresh()
      } else {
        setError(result.error)
      }
    })
  }

  return (
    <section className="mt-6 rounded-lg border border-[#E8DFD3] bg-white p-4" data-testid="task-photos">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-[#2B1F17]">
          Photos {photos.length > 0 && <span className="font-normal text-[#6B5D52]">({photos.length})</span>}
        </h2>
        <label
          className={`cursor-pointer rounded-md px-3 py-1.5 text-xs font-medium text-white transition-colors ${
            isPending
              ? 'bg-[#C4A882] cursor-not-allowed'
              : 'bg-[#8B5E3C] hover:bg-[#745032]'
          }`}
        >
          {isPending ? 'Uploading…' : '+ Add Photo'}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic"
            capture="environment"
            className="sr-only"
            onChange={handleFileSelect}
            disabled={isPending}
            data-testid="photo-file-input"
          />
        </label>
      </div>

      {error && (
        <p className="mb-3 text-xs text-red-600" role="alert" data-testid="photo-error">
          {error}
        </p>
      )}

      {photos.length === 0 ? (
        <p className="text-sm text-[#6B5D52]">No photos yet. Tap + Add Photo to capture site progress.</p>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {photos.map(photo => (
            <div
              key={photo.id}
              className="group relative overflow-hidden rounded-lg border border-[#E8DFD3] bg-[#FAF7F2]"
              data-testid="photo-thumb"
            >
              {urls[photo.id] ? (
                <img
                  src={urls[photo.id]}
                  alt={photo.file_name}
                  className="aspect-square w-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="flex aspect-square w-full items-center justify-center bg-[#FAF7F2]">
                  <span className="text-xs text-[#6B5D52]">No preview</span>
                </div>
              )}
              <div className="p-1.5">
                <p className="truncate text-xs font-medium text-[#2B1F17]">{photo.file_name}</p>
                <p className="text-[10px] text-[#6B5D52]">
                  {formatPhotoDate(photo.taken_at || photo.created_at)}
                  {photo.file_size ? ` · ${formatFileSize(photo.file_size)}` : ''}
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleDelete(photo.id)}
                disabled={isPending}
                className="absolute right-1 top-1 hidden rounded-full bg-black/50 p-1 text-white opacity-0 transition-opacity group-hover:block group-hover:opacity-100 focus:block focus:opacity-100"
                aria-label={`Delete ${photo.file_name}`}
                data-testid="photo-delete-btn"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
