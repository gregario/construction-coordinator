'use client'

import { useEffect, useRef } from 'react'
import type { GanttTask } from '@/lib/gantt/compute'

type Props = {
  task: GanttTask
  stageName: string
  stageColor: string
  tradeName: string | null
  materials: { id: string; name: string }[]
  onClose: () => void
  onEditClick: () => void
}

/**
 * AC-GE-3: Detail panel that slides in from the right when a task bar is clicked.
 * Shows task name, dates, duration, materials, trade, and edit button.
 */
export function TaskDetailPanel({
  task,
  stageName,
  stageColor,
  tradeName,
  materials,
  onClose,
  onEditClick,
}: Props) {
  const panelRef = useRef<HTMLDivElement>(null)

  // Close on Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  // Close on click outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    // Delay to avoid immediate close from the click that opened the panel
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClick)
    }, 100)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('mousedown', handleClick)
    }
  }, [onClose])

  const formatDate = (iso: string) => {
    const d = new Date(iso + 'T00:00:00Z')
    return d.toLocaleDateString('en-IE', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC',
    })
  }

  return (
    <div
      ref={panelRef}
      className="fixed right-0 top-0 z-50 flex h-full w-80 max-w-[90vw] flex-col border-l border-[#E8DFD3] bg-white shadow-xl animate-slide-in-right"
      data-testid="task-detail-panel"
      role="dialog"
      aria-label={`Substage details: ${task.name}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#E8DFD3] px-4 py-3">
        <h2 className="text-sm font-semibold text-[#2B1F17] truncate">
          Substage Details
        </h2>
        <button
          type="button"
          onClick={onClose}
          className="rounded p-1 text-[#6B5D52] hover:bg-[#F5F0EA]"
          aria-label="Close panel"
          data-testid="task-detail-close"
        >
          ✕
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* Task name */}
        <div>
          <h3
            className="text-base font-semibold text-[#2B1F17]"
            data-testid="task-detail-name"
          >
            {task.name}
          </h3>
          <div className="mt-1 flex items-center gap-2">
            <span
              className="h-3 w-3 rounded-sm shrink-0"
              style={{ backgroundColor: stageColor }}
            />
            <span className="text-xs text-[#6B5D52]">{stageName}</span>
          </div>
        </div>

        {/* Dates */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-[#6B5D52]">Start</span>
            <span className="font-medium text-[#2B1F17]" data-testid="task-detail-start">
              {formatDate(task.planned_start)}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-[#6B5D52]">End</span>
            <span className="font-medium text-[#2B1F17]" data-testid="task-detail-end">
              {formatDate(task.planned_end)}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-[#6B5D52]">Duration</span>
            <span className="font-medium text-[#2B1F17]" data-testid="task-detail-duration">
              {task.duration_days} day{task.duration_days !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-[#6B5D52]">Status</span>
            <span
              className={`text-xs font-medium rounded-full px-2 py-0.5 ${
                task.status === 'complete'
                  ? 'bg-green-100 text-green-700'
                  : task.status === 'delayed'
                    ? 'bg-red-100 text-red-700'
                    : task.status === 'in_progress'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-gray-100 text-gray-600'
              }`}
              data-testid="task-detail-status"
            >
              {task.status.replace('_', ' ')}
            </span>
          </div>
        </div>

        {/* Trade */}
        <div>
          <h4 className="text-xs font-semibold text-[#6B5D52] uppercase tracking-wide mb-1">
            Trade
          </h4>
          <p className="text-sm text-[#2B1F17]" data-testid="task-detail-trade">
            {tradeName ?? 'Unassigned'}
          </p>
        </div>

        {/* Materials */}
        <div>
          <h4 className="text-xs font-semibold text-[#6B5D52] uppercase tracking-wide mb-1">
            Materials
          </h4>
          {materials.length === 0 ? (
            <p className="text-sm text-[#6B5D52]" data-testid="task-detail-materials-empty">
              No materials attached
            </p>
          ) : (
            <ul className="space-y-1" data-testid="task-detail-materials">
              {materials.map(m => (
                <li key={m.id} className="text-sm text-[#2B1F17]">
                  {m.name}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Dependencies */}
        {task.depends_on.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-[#6B5D52] uppercase tracking-wide mb-1">
              Dependencies
            </h4>
            <p className="text-sm text-[#2B1F17]">
              {task.depends_on.length} substage{task.depends_on.length !== 1 ? 's' : ''}
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-[#E8DFD3] px-4 py-3">
        <button
          type="button"
          onClick={onEditClick}
          className="w-full rounded-md bg-[#8B5E3C] px-3 py-2 text-sm font-medium text-white hover:bg-[#7A5234] transition-colors"
          data-testid="task-detail-edit"
        >
          Edit Substage
        </button>
      </div>
    </div>
  )
}
