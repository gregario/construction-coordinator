'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ChevronRight, ChevronDown } from 'lucide-react'

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
  blocks: BlockRow[]
  stagesByBlock: Map<string, StageWithTasks[]>
}

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  not_started: { bg: 'bg-[#E8DFD3]', text: 'text-[#6B5D52]', label: 'Not Started' },
  in_progress: { bg: 'bg-[#D4A355]/20', text: 'text-[#8B6F2F]', label: 'In Progress' },
  complete: { bg: 'bg-[#87A96B]/20', text: 'text-[#5A8050]', label: 'Complete' },
  delayed: { bg: 'bg-[#C97A3F]/20', text: 'text-[#A0603A]', label: 'Delayed' },
}

export function StagesAccordionView({ blocks, stagesByBlock }: StagesAccordionViewProps) {
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

  function toggleStage(stageId: string) {
    setExpandedStages(prev => {
      const next = new Set(prev)
      if (next.has(stageId)) {
        next.delete(stageId)
      } else {
        next.add(stageId)
      }
      return next
    })
  }

  return (
    <div className="space-y-8">
      {blocks.map(block => {
        const stages = stagesByBlock.get(block.id) || []
        if (stages.length === 0) return null

        return (
          <section key={block.id}>
            {/* Block header */}
            <div className="flex items-center gap-2 mb-3">
              <h2 className="text-lg font-semibold text-[#2B1F17]">{block.name}</h2>
              <span className="text-xs text-[#6B5D52]">
                {block.storeys} {block.storeys === 1 ? 'storey' : 'storeys'} · {block.attachment_type}
              </span>
            </div>

            {/* Stage accordions */}
            <div className="space-y-2">
              {stages.map(stage => {
                const isExpanded = expandedStages.has(stage.id)
                const allComplete = stage.total_count > 0 && stage.completed_count === stage.total_count
                return (
                  <div
                    key={stage.id}
                    className="rounded-lg border border-[#E8DFD3] bg-white overflow-hidden"
                  >
                    {/* Stage header / trigger */}
                    <button
                      type="button"
                      onClick={() => toggleStage(stage.id)}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-[#F5F0E8] transition-colors"
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
                      <span className="font-medium text-sm text-[#2B1F17] flex-1">
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

                    {/* Substage list */}
                    {isExpanded && (
                      <div className="border-t border-[#E8DFD3]">
                        {stage.tasks.length === 0 ? (
                          <div className="px-4 py-3 text-sm text-[#6B5D52]">
                            No substages in this stage.
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
                                    href={`/stages/${stage.id}`}
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
          </section>
        )
      })}

      {/* Unassigned stages (from legacy data without block_id) */}
      {stagesByBlock.has('unassigned') && (
        <section>
          <h2 className="text-lg font-semibold text-[#6B5D52] mb-3">Unassigned</h2>
          <p className="text-xs text-[#A89A8C]">
            These stages are not linked to a block.
          </p>
        </section>
      )}
    </div>
  )
}
