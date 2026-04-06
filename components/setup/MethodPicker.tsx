'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight, Check, Copy } from 'lucide-react'
import { CATEGORY_ORDER, CATEGORY_LABELS } from '@/lib/construction/categories'
import {
  listMethodsByCategory,
  applySchemeToBlock,
  copySchemeToBlock,
  type ConstructionMethod,
  type SchemeSelection,
} from '@/app/actions/construction-methods'
import type { BlockRow } from '@/app/actions/blocks'

interface MethodPickerProps {
  projectId: string
  blocks: BlockRow[]
  startDate: string
}

export function MethodPicker({ projectId, blocks, startDate }: MethodPickerProps) {
  const router = useRouter()
  const [currentBlockIndex, setCurrentBlockIndex] = useState(0)
  const [categoryIndex, setCategoryIndex] = useState(0)
  const [methods, setMethods] = useState<ConstructionMethod[]>([])
  const [loading, setLoading] = useState(true)
  const [selections, setSelections] = useState<Record<string, SchemeSelection>>({})
  const [phase, setPhase] = useState<'picking' | 'copy-prompt' | 'applying'>('picking')
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const currentBlock = blocks[currentBlockIndex]
  const category = CATEGORY_ORDER[categoryIndex]
  const categoryLabel = CATEGORY_LABELS[category] || category
  const blockSelections = selections[currentBlock?.id] || {}
  const selectedMethodId = blockSelections[category] || null

  // Load methods for current category
  useEffect(() => {
    setLoading(true)
    listMethodsByCategory(category).then(data => {
      setMethods(data)
      setLoading(false)
      // Auto-select first method if none selected
      if (!blockSelections[category] && data.length > 0) {
        setSelections(prev => ({
          ...prev,
          [currentBlock.id]: {
            ...(prev[currentBlock.id] || {}),
            [category]: data[0].id,
          },
        }))
      }
    })
  }, [category, currentBlock?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  function selectMethod(methodId: string) {
    setSelections(prev => ({
      ...prev,
      [currentBlock.id]: {
        ...(prev[currentBlock.id] || {}),
        [category]: methodId,
      },
    }))
  }

  function handlePrevCategory() {
    if (categoryIndex > 0) {
      setCategoryIndex(categoryIndex - 1)
    }
  }

  function handleNextCategory() {
    if (categoryIndex < CATEGORY_ORDER.length - 1) {
      setCategoryIndex(categoryIndex + 1)
    } else {
      // Done with this block
      handleBlockComplete()
    }
  }

  function handleBlockComplete() {
    // If there are more blocks, show copy-prompt
    if (currentBlockIndex < blocks.length - 1) {
      setPhase('copy-prompt')
    } else {
      // All blocks done — apply all schemes
      applyAllSchemes()
    }
  }

  function handleApplySame() {
    const sourceBlock = blocks[currentBlockIndex]
    const nextBlock = blocks[currentBlockIndex + 1]
    // Copy source selections to next block
    setSelections(prev => ({
      ...prev,
      [nextBlock.id]: { ...(prev[sourceBlock.id] || {}) },
    }))
    moveToNextBlock(true)
  }

  function handleEditNext() {
    const sourceBlock = blocks[currentBlockIndex]
    const nextBlock = blocks[currentBlockIndex + 1]
    // Pre-fill next block with source selections as defaults
    setSelections(prev => ({
      ...prev,
      [nextBlock.id]: { ...(prev[sourceBlock.id] || {}) },
    }))
    moveToNextBlock(false)
  }

  function moveToNextBlock(applySame: boolean) {
    setCurrentBlockIndex(prev => prev + 1)
    setCategoryIndex(0)
    setPhase('picking')

    if (applySame && currentBlockIndex + 1 >= blocks.length - 1) {
      // This was the last block to apply to — go to final apply
      // Need a slight delay to let state update
      setTimeout(() => applyAllSchemes(), 100)
    } else if (applySame && currentBlockIndex + 2 < blocks.length) {
      // More blocks after this one — show copy prompt again
      setTimeout(() => setPhase('copy-prompt'), 100)
    }
  }

  function applyAllSchemes() {
    setPhase('applying')
    startTransition(async () => {
      for (const block of blocks) {
        const scheme = selections[block.id]
        if (!scheme || Object.keys(scheme).length === 0) continue

        const result = await applySchemeToBlock(block.id, projectId, scheme, startDate)
        if (!result.ok) {
          setError(`Failed to apply scheme to ${block.name}: ${result.error}`)
          setPhase('picking')
          return
        }
      }
      // All done — reload to show customization screen
      router.refresh()
    })
  }

  // Copy prompt between blocks
  if (phase === 'copy-prompt') {
    const nextBlock = blocks[currentBlockIndex + 1]
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-[#2B1F17]">
            Scheme complete for {currentBlock.name}
          </h2>
          <p className="text-sm text-[#6B5D52] mt-1">
            Apply the same construction scheme to {nextBlock.name}, or edit it separately?
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={handleApplySame}
            disabled={pending}
            className="flex items-center justify-center gap-2 rounded-lg border-2 border-[#8B5E3C] bg-white p-4 text-sm font-medium text-[#8B5E3C] hover:bg-[#8B5E3C] hover:text-white transition-colors disabled:opacity-50"
          >
            <Copy size={18} />
            Apply Same to {nextBlock.name}
          </button>
          <button
            type="button"
            onClick={handleEditNext}
            disabled={pending}
            className="flex items-center justify-center gap-2 rounded-lg border border-[#E8DFD3] bg-white p-4 text-sm font-medium text-[#6B5D52] hover:bg-[#F5F0E8] hover:text-[#2B1F17] transition-colors disabled:opacity-50"
          >
            <ChevronRight size={18} />
            Edit for {nextBlock.name}
          </button>
        </div>
      </div>
    )
  }

  // Applying state
  if (phase === 'applying') {
    return (
      <div className="text-center py-12">
        <div className="animate-pulse text-sm text-[#6B5D52]">
          Generating substages from your selections...
        </div>
      </div>
    )
  }

  // Main method picker
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-[#6B5D52]">
            Setting up: <span className="font-medium text-[#2B1F17]">{currentBlock.name}</span>
          </p>
          <h2 className="text-lg font-semibold text-[#2B1F17] mt-0.5">
            {categoryLabel}
          </h2>
        </div>
        <span className="text-xs text-[#6B5D52] bg-[#F5F0E8] px-2 py-1 rounded">
          {categoryIndex + 1} of {CATEGORY_ORDER.length}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-[#E8DFD3] rounded-full overflow-hidden">
        <div
          className="h-full bg-[#8B5E3C] rounded-full transition-all duration-300"
          style={{ width: `${((categoryIndex + 1) / CATEGORY_ORDER.length) * 100}%` }}
        />
      </div>

      {/* Method cards */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-[120px] bg-[#FAF7F2] rounded-lg animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {methods.map(method => {
            const isSelected = selectedMethodId === method.id
            const displayName = method.variant
              ? `${method.method_name} — ${method.variant}`
              : method.method_name
            return (
              <button
                key={method.id}
                type="button"
                onClick={() => selectMethod(method.id)}
                className={`relative text-left rounded-lg border-2 p-4 transition-all min-h-[100px] ${
                  isSelected
                    ? 'border-[#B8916E] bg-[#F0E9DD] shadow-md'
                    : 'border-[#E8DFD3] bg-white hover:bg-[#F5F0E8] hover:border-[#D4C5B3]'
                }`}
              >
                {isSelected && (
                  <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-[#8B5E3C] flex items-center justify-center">
                    <Check size={12} className="text-white" />
                  </div>
                )}
                <div className="font-medium text-sm text-[#2B1F17] pr-6">
                  {displayName}
                </div>
                {method.description && (
                  <p className="text-xs text-[#6B5D52] mt-1 line-clamp-2">
                    {method.description}
                  </p>
                )}
                <p className="text-xs text-[#A89A8C] mt-2">
                  {method.substages.length} substages · ~{method.default_duration_days} days
                </p>
              </button>
            )
          })}
        </div>
      )}

      {error && (
        <p role="alert" className="text-xs text-[#B85450]">{error}</p>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-2">
        <button
          type="button"
          onClick={handlePrevCategory}
          disabled={categoryIndex === 0 || pending}
          className="flex items-center gap-1 rounded-md border border-[#E8DFD3] bg-white px-3 py-2 text-xs font-medium text-[#2B1F17] hover:bg-[#FAF7F2] disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronLeft size={14} />
          Previous
        </button>
        <button
          type="button"
          onClick={handleNextCategory}
          disabled={!selectedMethodId || pending}
          className="flex items-center gap-1 rounded-md bg-[#2B1F17] px-4 py-2 text-xs font-medium text-white hover:bg-[#3A2A1E] disabled:opacity-50"
        >
          {categoryIndex < CATEGORY_ORDER.length - 1 ? (
            <>
              Next
              <ChevronRight size={14} />
            </>
          ) : (
            <>
              {blocks.length > 1 && currentBlockIndex < blocks.length - 1
                ? `Done for ${currentBlock.name}`
                : 'Apply Scheme'}
            </>
          )}
        </button>
      </div>
    </div>
  )
}
