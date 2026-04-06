'use client'

import { useState, useTransition } from 'react'
import { GripVertical } from 'lucide-react'
import { CATEGORY_ORDER, CATEGORY_LABELS } from '@/lib/construction/categories'
import {
  saveSchedulingConfig,
  type SchedulingConfig as SchedulingConfigType,
  type CategorySequencing,
} from '@/app/actions/sequencing'
import type { BlockRow } from '@/app/actions/blocks'

interface SequencingConfigProps {
  projectId: string
  blocks: BlockRow[]
  initialConfig: SchedulingConfigType
  onComplete: () => void
}

export function SequencingConfig({ projectId, blocks, initialConfig, onComplete }: SequencingConfigProps) {
  const [config, setConfig] = useState<SchedulingConfigType>(() => {
    // Initialize with defaults: all sequential in block creation order
    const defaultBlockOrder = blocks.map(b => b.id)
    const initial: SchedulingConfigType = {}
    for (const cat of CATEGORY_ORDER) {
      initial[cat] = initialConfig[cat] || {
        mode: 'sequential',
        block_order: [...defaultBlockOrder],
      }
    }
    return initial
  })
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function toggleMode(category: string) {
    setConfig(prev => {
      const current = prev[category] || { mode: 'sequential', block_order: blocks.map(b => b.id) }
      return {
        ...prev,
        [category]: {
          ...current,
          mode: current.mode === 'parallel' ? 'sequential' : 'parallel',
        },
      }
    })
  }

  function moveBlock(category: string, fromIndex: number, toIndex: number) {
    if (fromIndex === toIndex) return
    setConfig(prev => {
      const current = prev[category]
      if (!current?.block_order) return prev
      const order = [...current.block_order]
      const [moved] = order.splice(fromIndex, 1)
      order.splice(toIndex, 0, moved)
      return {
        ...prev,
        [category]: { ...current, block_order: order },
      }
    })
  }

  function handleSave() {
    startTransition(async () => {
      const result = await saveSchedulingConfig(projectId, config)
      if (!result.ok) {
        setError(result.error)
        return
      }
      onComplete()
    })
  }

  const blockNameById = new Map(blocks.map(b => [b.id, b.name]))

  return (
    <div className="space-y-4">
      <p className="text-xs text-[#6B5D52]">
        For each category, choose whether blocks are built in parallel (simultaneously)
        or sequentially (one after another in order).
      </p>

      {CATEGORY_ORDER.map(category => {
        const catConfig: CategorySequencing = config[category] || { mode: 'sequential' }
        const isParallel = catConfig.mode === 'parallel'
        const blockOrder = catConfig.block_order || blocks.map(b => b.id)

        return (
          <div
            key={category}
            className="rounded-lg border border-[#E8DFD3] bg-white p-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-[#2B1F17]">
                {CATEGORY_LABELS[category] || category}
              </span>

              {/* Toggle */}
              <div className="flex rounded-md border border-[#E8DFD3] overflow-hidden">
                <button
                  type="button"
                  onClick={() => !isParallel || toggleMode(category)}
                  className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                    !isParallel
                      ? 'bg-[#8B5E3C] text-white'
                      : 'text-[#6B5D52] hover:bg-[#F5F0E8]'
                  }`}
                >
                  Sequential
                </button>
                <button
                  type="button"
                  onClick={() => isParallel || toggleMode(category)}
                  className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                    isParallel
                      ? 'bg-[#8B5E3C] text-white'
                      : 'text-[#6B5D52] hover:bg-[#F5F0E8]'
                  }`}
                >
                  Parallel
                </button>
              </div>
            </div>

            {/* Block order (only for sequential) */}
            {!isParallel && blocks.length > 1 && (
              <div className="mt-2 space-y-1">
                {blockOrder.map((blockId, index) => (
                  <div
                    key={blockId}
                    className="flex items-center gap-2 rounded bg-[#FAF7F2] px-2 py-1.5"
                  >
                    <GripVertical size={14} className="text-[#A89A8C] cursor-grab" aria-hidden />
                    <span className="text-xs text-[#6B5D52] w-4">{index + 1}.</span>
                    <span className="text-xs font-medium text-[#2B1F17]">
                      {blockNameById.get(blockId) || 'Unknown'}
                    </span>
                    {index > 0 && (
                      <button
                        type="button"
                        onClick={() => moveBlock(category, index, index - 1)}
                        className="ml-auto text-xs text-[#6B5D52] hover:text-[#2B1F17]"
                        aria-label={`Move ${blockNameById.get(blockId)} up`}
                      >
                        ↑
                      </button>
                    )}
                    {index < blockOrder.length - 1 && (
                      <button
                        type="button"
                        onClick={() => moveBlock(category, index, index + 1)}
                        className={`${index === 0 ? 'ml-auto' : ''} text-xs text-[#6B5D52] hover:text-[#2B1F17]`}
                        aria-label={`Move ${blockNameById.get(blockId)} down`}
                      >
                        ↓
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}

      {error && (
        <p role="alert" className="text-xs text-[#B85450]">{error}</p>
      )}

      <div className="flex justify-end pt-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={pending}
          className="rounded-md bg-[#2B1F17] px-4 py-2 text-xs font-medium text-white hover:bg-[#3A2A1E] disabled:opacity-50"
        >
          {pending ? 'Saving…' : 'Save & Continue'}
        </button>
      </div>
    </div>
  )
}
