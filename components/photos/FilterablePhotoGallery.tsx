'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { PhotoTagFilter, INSPECTION_LABELS, type PhotoTag } from './PhotoTagFilter'
import { formatFileSize, formatPhotoDate } from '@/lib/photos/operations'

type PhotoWithTag = {
  id: string
  storage_path: string
  file_name: string
  file_size: number | null
  taken_at: string | null
  created_at: string
  task_id: string | null
  stage_id: string | null
  tag: string
  inspection_stage: string | null
}

interface FilterablePhotoGalleryProps {
  photos: PhotoWithTag[]
  signedUrls: Record<string, string>
}

export function FilterablePhotoGallery({ photos, signedUrls }: FilterablePhotoGalleryProps) {
  const [activeTag, setActiveTag] = useState<PhotoTag>('all')

  // Compute tag counts
  const tagCounts: Record<string, number> = {}
  for (const photo of photos) {
    const tag = photo.tag || 'general'
    tagCounts[tag] = (tagCounts[tag] || 0) + 1
  }

  // Filter photos
  const filtered = activeTag === 'all'
    ? photos
    : photos.filter(p => (p.tag || 'general') === activeTag)

  // For Building Control tab, group by inspection stage
  const isBCView = activeTag === 'building_control'
  const bcGroups = isBCView
    ? groupByInspectionStage(filtered)
    : null

  return (
    <div className="space-y-4">
      <PhotoTagFilter
        tagCounts={tagCounts}
        activeTag={activeTag}
        onTagChange={setActiveTag}
      />

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-[#E8DFD3] bg-white p-6 text-center">
          <p className="text-sm text-[#6B5D52]">No photos with this tag.</p>
        </div>
      ) : isBCView && bcGroups ? (
        <div className="space-y-6">
          {bcGroups.map(group => (
            <section key={group.stage} className="rounded-lg border border-[#E8DFD3] bg-white p-4">
              <h2 className="text-sm font-semibold text-[#2B1F17] mb-3">
                {INSPECTION_LABELS[group.stage] || group.stage || 'Untagged'}
                <span className="ml-1.5 font-normal text-[#6B5D52]">({group.photos.length})</span>
              </h2>
              <PhotoGrid photos={group.photos} signedUrls={signedUrls} />
            </section>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-[#E8DFD3] bg-white p-4">
          <PhotoGrid photos={filtered} signedUrls={signedUrls} />
        </div>
      )}
    </div>
  )
}

function PhotoGrid({
  photos,
  signedUrls,
}: {
  photos: PhotoWithTag[]
  signedUrls: Record<string, string>
}) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
      {photos.map(photo => (
        <Link
          key={photo.id}
          href={photo.task_id ? `/tasks/${photo.task_id}` : '#'}
          className="group overflow-hidden rounded-lg border border-[#E8DFD3] bg-[#FAF7F2] transition-shadow hover:shadow-md"
        >
          {signedUrls[photo.id] ? (
            <div className="relative aspect-square w-full">
              <Image
                src={signedUrls[photo.id]}
                alt={photo.file_name}
                fill
                sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw"
                className="object-cover"
                loading="lazy"
              />
            </div>
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
        </Link>
      ))}
    </div>
  )
}

function groupByInspectionStage(photos: PhotoWithTag[]) {
  const groups = new Map<string, PhotoWithTag[]>()
  for (const photo of photos) {
    const stage = photo.inspection_stage || 'untagged'
    const existing = groups.get(stage) || []
    existing.push(photo)
    groups.set(stage, existing)
  }
  // Sort by a sensible order
  const order = ['foundation_inspection', 'structural', 'pre_plaster', 'insulation_airtightness', 'completion', 'other', 'untagged']
  return order
    .filter(s => groups.has(s))
    .map(s => ({ stage: s, photos: groups.get(s)! }))
}
