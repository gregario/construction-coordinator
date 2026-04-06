'use client'

import { useState } from 'react'

export type PhotoTag = 'all' | 'building_control' | 'progress' | 'snag' | 'general'

const TAG_LABELS: Record<PhotoTag, string> = {
  all: 'All',
  building_control: 'Building Control',
  progress: 'Progress',
  snag: 'Snag',
  general: 'General',
}

const INSPECTION_LABELS: Record<string, string> = {
  foundation_inspection: 'Foundation Inspection',
  pre_plaster: 'Pre-Plaster',
  structural: 'Structural',
  insulation_airtightness: 'Insulation & Airtightness',
  completion: 'Completion',
  other: 'Other',
}

interface PhotoTagFilterProps {
  tagCounts: Record<string, number>
  activeTag: PhotoTag
  onTagChange: (tag: PhotoTag) => void
}

export function PhotoTagFilter({ tagCounts, activeTag, onTagChange }: PhotoTagFilterProps) {
  const tags: PhotoTag[] = ['all', 'building_control', 'progress', 'snag', 'general']

  return (
    <div className="flex gap-1 overflow-x-auto pb-1">
      {tags.map(tag => {
        const count = tag === 'all'
          ? Object.values(tagCounts).reduce((a, b) => a + b, 0)
          : tagCounts[tag] || 0
        const isActive = activeTag === tag
        return (
          <button
            key={tag}
            type="button"
            onClick={() => onTagChange(tag)}
            className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              isActive
                ? 'bg-[#8B5E3C] text-white'
                : 'bg-white text-[#6B5D52] hover:bg-[#F5F0E8]'
            }`}
          >
            {TAG_LABELS[tag]} ({count})
          </button>
        )
      })}
    </div>
  )
}

export { INSPECTION_LABELS }
