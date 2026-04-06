'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { ChevronRight, ChevronDown, ArrowUp, ArrowDown, Trash2, Plus } from 'lucide-react'
import {
  validateStageInput,
  reorderStages,
  buildDeleteWarning,
  type StageRecord,
} from '@/lib/stages/operations'
import {
  createStage,
  reorderProjectStages,
  deleteStage,
} from '@/app/actions/stages'

type BlockRow = {
  id: string
  name: string
  attachment_type: string
  storeys: number
  order_index: number
}

type StageTask = {
  id: string
  stage_id: string
  name: string
  planned_start: string
  planned_end: string
  status: string
  trade_id: string | null
  trade_name: string | null
}

type StageWithTasks = {
  id: string
  block_id: string | null
  name: string
  color: string
  order_index: number
  tasks: StageTask[]
  completed_count: number
  total_count: number
}

interface StagesAccordionViewProps {
  projectId: string
  blocks: BlockRow[]
  stagesByBlock: Map<string, StageWithTasks[]>
}

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  not_started: { bg: 'bg-[#E8DFD3]', text: 'text-[#6B5D52]', label: 'Not Started' },
  in_progress: { bg: 'bg-[#D4A355]/20', text: 'text-[#8B6F2F]', label: 'In Progress' },
  complete: { bg: 'bg-[#87A96B]/20', text: 'text-[#5A8050]', label: 'Complete' },
  delayed: { bg: 'bg-[#C97A3F]/20', text: 'text-[#A0603A]', label: 'Delayed' },
}

const STAGE_COLORS = [
  '#8B5E3C', '#6B8F3F', '#C48A3A', '#2B1F17', '#4F6C8C', '#B04A3C',
]

export function StagesAccordionView({ projectId, blocks, stagesByBlock }: StagesAccordionViewProps) {
  // Find the first stage with in-progress tasks to auto-expand
  const firstActiveStageId = (() => {
    for (const stages of stagesByBlock.values()) {
      for (const stage of stages) {
        if (stage.tasks.some(t => t.status === 'in_progress')) return stage.id
      }
    }
    return null
  })()

  const [expandedStages, setExpandedStages] = useState<Set<string>>(
    firstActiveStageId ? new Set([firstActiveStageId]) : new Set()
  )
  const [localStages, setLocalStages] = useState(stagesByBlock)
  const [showAddForBlock, setShowAddForBlock] = useState<string | null>(null)
  const [addName, setAddName] = useState('')
  const [addColor, setAddColor] = useState(STAGE_COLORS[0])
  const [addError, setAddError] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<{ stage: StageWithTasks; blockId: string } | null>(null)
  const [pending, startTransition] = useTransition()

  function toggleStage(stageId: string) {
    setExpandedStages(prev => {
      const next = new Set(prev)
      if (next.has(stageId)) next.delete(stageId)
      else next.add(stageId)
      return next
    })
  }

  function handleAddStage(blockId: string) {
    if (!addName.trim()) { setAddError('Stage name is required'); return }
    const validated = validateStageInput({ name: addName, color: addColor })
    if (!validated.ok) { setAddError(validated.errors.name || 'Invalid'); return }

    startTransition(async () => {
      const res = await createStage({ projectId, name: addName.trim(), color: addColor, blockId })
      if (!res.ok) { setAddError(res.error); return }

      const newStage: StageWithTasks = {
        ...res.stage,
        block_id: blockId,
        tasks: [],
        completed_count: 0,
        total_count: 0,
      }

      setLocalStages(prev => {
        const next = new Map(prev)
        const existing = next.get(blockId) || []
        next.set(blockId, [...existing, newStage])
        return next
      })
      setShowAddForBlock(null)
      setAddName('')
      setAddColor(STAGE_COLORS[0])
      setAddError(null)
    })
  }

  function handleMoveStage(blockId: string, stageId: string, direction: -1 | 1) {
    const stages = localStages.get(blockId)
    if (!stages) return
    const idx = stages.findIndex(s => s.id === stageId)
    const target = idx + direction
    if (target < 0 || target >= stages.length) return

    const asRecords = stages.map(s => ({ id: s.id, name: s.name, color: s.color, order_index: s.order_index }))
    const reordered = reorderStages(asRecords, stageId, target)
    const newStages = reordered.map(r => {
      const original = stages.find(s => s.id === r.id)!
      return { ...original, order_index: r.order_index }
    })

    setLocalStages(prev => {
      const next = new Map(prev)
      next.set(blockId, newStages)
      return next
    })

    startTransition(async () => {
      await reorderProjectStages(projectId, newStages.map(s => s.id))
    })
  }

  function handleDeleteStage(stage: StageWithTasks, blockId: string) {
    const warning = buildDeleteWarning(stage.name, stage.total_count)
    if (warning.requiresConfirmation) {
      setDeleteTarget({ stage, blockId })
      return
    }
    performDelete(stage.id, blockId)
  }

  function performDelete(stageId: string, blockId: string) {
    startTransition(async () => {
      const res = await deleteStage(projectId, stageId, true)
      if (!res.ok) return
      setLocalStages(prev => {
        const next = new Map(prev)
        const existing = (next.get(blockId) || []).filter(s => s.id !== stageId)
        next.set(blockId, existing)
        return next
      })
      setDeleteTarget(null)
    })
  }

  return (
    <div className="space-y-8">
      {blocks.map(block => {
        const stages = localStages.get(block.id) || []

        return (
          <section key={block.id}>
            {/* Block header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-[#2B1F17]">{block.name}</h2>
                <span className="text-xs text-[#6B5D52]">
                  {block.storeys} {block.storeys === 1 ? 'storey' : 'storeys'} · {block.attachment_type}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowAddForBlock(showAddForBlock === block.id ? null : block.id)
                  setAddName('')
                  setAddError(null)
                }}
                disabled={pending}
                className="flex items-center gap-1 rounded-md border border-[#E8DFD3] bg-white px-2.5 py-1.5 text-xs font-medium text-[#6B5D52] hover:bg-[#F5F0E8] hover:text-[#2B1F17] disabled:opacity-50"
              >
                <Plus size={14} /> Add Stage
              </button>
            </div>

            {/* Add stage inline form */}
            {showAddForBlock === block.id && (
              <div className="mb-3 rounded-lg border border-[#8B5E3C]/30 bg-[#FAF7F2] p-3 space-y-2">
                <input
                  type="text"
                  value={addName}
                  onChange={e => setAddName(e.target.value)}
                  placeholder="Stage name"
                  autoFocus
                  maxLength={80}
                  className="w-full rounded-md border border-[#E8DFD3] bg-white px-3 py-2 text-sm"
                />
                <div className="flex items-center gap-1.5">
                  {STAGE_COLORS.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setAddColor(c)}
                      className={`w-6 h-6 rounded-full border-2 ${addColor === c ? 'border-[#2B1F17]' : 'border-transparent'}`}
                      style={{ backgroundColor: c }}
                      aria-label={`Color ${c}`}
                    />
                  ))}
                </div>
                {addError && <p className="text-xs text-[#B85450]">{addError}</p>}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleAddStage(block.id)}
                    disabled={pending}
                    className="rounded-md bg-[#2B1F17] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#3A2A1E] disabled:opacity-50"
                  >
                    {pending ? 'Adding…' : 'Add'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddForBlock(null)}
                    className="rounded-md border border-[#E8DFD3] bg-white px-3 py-1.5 text-xs font-medium text-[#2B1F17]"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Stage accordions */}
            {stages.length === 0 && showAddForBlock !== block.id ? (
              <div className="rounded-lg border border-dashed border-[#E8DFD3] bg-white p-6 text-center">
                <p className="text-sm text-[#6B5D52]">No stages for this block yet.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {stages.map((stage, idx) => {
                  const isExpanded = expandedStages.has(stage.id)
                  const allComplete = stage.total_count > 0 && stage.completed_count === stage.total_count
                  return (
                    <div
                      key={stage.id}
                      className="rounded-lg border border-[#E8DFD3] bg-white overflow-hidden"
                    >
                      {/* Stage header */}
                      <div className="flex items-center">
                        <button
                          type="button"
                          onClick={() => toggleStage(stage.id)}
                          className="flex flex-1 items-center gap-3 px-4 py-3 text-left hover:bg-[#F5F0E8] transition-colors min-w-0"
                          aria-expanded={isExpanded}
                        >
                          <span
                            className="h-5 w-1.5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: stage.color }}
                            aria-hidden
                          />
                          {isExpanded ? (
                            <ChevronDown size={16} className="text-[#6B5D52] flex-shrink-0" />
                          ) : (
                            <ChevronRight size={16} className="text-[#6B5D52] flex-shrink-0" />
                          )}
                          <span className="font-medium text-sm text-[#2B1F17] truncate flex-1">
                            {stage.name}
                          </span>
                          <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                            allComplete
                              ? 'bg-[#87A96B]/20 text-[#5A8050]'
                              : 'bg-[#E8DFD3] text-[#6B5D52]'
                          }`}>
                            {stage.completed_count}/{stage.total_count}
                          </span>
                        </button>

                        {/* Stage actions (reorder + delete) */}
                        <div className="flex items-center gap-0.5 pr-2">
                          <button
                            type="button"
                            onClick={() => handleMoveStage(block.id, stage.id, -1)}
                            disabled={idx === 0 || pending}
                            className="rounded p-1 text-[#A89A8C] hover:text-[#2B1F17] hover:bg-[#F5F0E8] disabled:opacity-20"
                            aria-label={`Move ${stage.name} up`}
                          >
                            <ArrowUp size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveStage(block.id, stage.id, 1)}
                            disabled={idx === stages.length - 1 || pending}
                            className="rounded p-1 text-[#A89A8C] hover:text-[#2B1F17] hover:bg-[#F5F0E8] disabled:opacity-20"
                            aria-label={`Move ${stage.name} down`}
                          >
                            <ArrowDown size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteStage(stage, block.id)}
                            disabled={pending}
                            className="rounded p-1 text-[#A89A8C] hover:text-[#B85450] hover:bg-[#B85450]/10 disabled:opacity-20"
                            aria-label={`Delete ${stage.name}`}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>

                      {/* Substage list */}
                      {isExpanded && (
                        <div className="border-t border-[#E8DFD3]">
                          {stage.tasks.length === 0 ? (
                            <div className="px-4 py-3 text-sm text-[#6B5D52]">
                              No substages. <Link href={`/stages/${stage.id}`} className="text-[#8B5E3C] hover:underline">Add substages →</Link>
                            </div>
                          ) : (
                            <ul>
                              {stage.tasks.map((task, i) => {
                                const style = STATUS_STYLES[task.status] || STATUS_STYLES.not_started
                                return (
                                  <li
                                    key={task.id}
                                    className={`flex items-center gap-3 px-4 py-2.5 text-sm ${
                                      i % 2 === 0 ? 'bg-white' : 'bg-[#FAF7F2]'
                                    } hover:bg-[#F5F0E8] transition-colors`}
                                  >
                                    <Link
                                      href={`/tasks/${task.id}`}
                                      className="flex-1 min-w-0 text-[#2B1F17] hover:underline truncate"
                                    >
                                      {task.name}
                                    </Link>
                                    <span className="text-xs text-[#6B5D52] whitespace-nowrap hidden sm:inline">
                                      {task.planned_start} – {task.planned_end}
                                    </span>
                                    <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${style.bg} ${style.text} whitespace-nowrap`}>
                                      {style.label}
                                    </span>
                                    {task.trade_name && (
                                      <span className="text-xs text-[#A89A8C] whitespace-nowrap hidden md:inline">
                                        {task.trade_name}
                                      </span>
                                    )}
                                  </li>
                                )
                              })}
                            </ul>
                          )}
                          <div className="border-t border-[#E8DFD3] px-4 py-2">
                            <Link
                              href={`/stages/${stage.id}`}
                              className="text-xs font-medium text-[#8B5E3C] hover:underline"
                            >
                              Edit substages →
                            </Link>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </section>
        )
      })}

      {/* Delete confirmation dialog */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="rounded-lg bg-white p-5 shadow-lg max-w-sm w-full">
            <h3 className="text-sm font-semibold text-[#2B1F17]">Delete {deleteTarget.stage.name}?</h3>
            <p className="mt-2 text-xs text-[#6B5D52]">
              This stage has {deleteTarget.stage.total_count} substage{deleteTarget.stage.total_count !== 1 ? 's' : ''}.
              Deleting it will remove all substages, materials, and dependencies within it.
            </p>
            <div className="mt-4 flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="rounded-md border border-[#E8DFD3] bg-white px-3 py-1.5 text-xs font-medium text-[#2B1F17]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => performDelete(deleteTarget.stage.id, deleteTarget.blockId)}
                disabled={pending}
                className="rounded-md bg-[#B85450] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#A04440] disabled:opacity-50"
              >
                {pending ? 'Deleting…' : 'Delete Stage'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
