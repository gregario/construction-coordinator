'use client'

import { useState, useTransition } from 'react'
import { logTaskDelay } from '@/app/actions/tasks'
import { validateDelayDate, formatCascadeSummaryMessage } from '@/lib/tasks/delay'
import type { CascadeSummary, MaterialMovement } from '@/lib/cascade/engine'

type Props = {
  projectId: string
  taskId: string
  currentPlannedEnd: string
}

type Overlay = {
  summary: CascadeSummary
  materialsMoved: number
  materialMovements: MaterialMovement[]
}

// AC-DL-1: 'Log Delay' opens a date picker prefilled with the current
// planned_end. AC-DL-2: pick a later date + Apply → cascade runs.
// AC-DL-3: post-cascade overlay with "N tasks shifted, M materials moved"
// and a list of affected tasks.
export function TaskDelayLogger({ projectId, taskId, currentPlannedEnd }: Props) {
  const [open, setOpen] = useState(false)
  const [newDate, setNewDate] = useState(currentPlannedEnd)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const [overlay, setOverlay] = useState<Overlay | null>(null)

  function handleOpen() {
    setNewDate(currentPlannedEnd)
    setError(null)
    setOpen(true)
  }

  function handleCancel() {
    setOpen(false)
    setError(null)
  }

  function handleApply() {
    setError(null)
    const check = validateDelayDate(currentPlannedEnd, newDate)
    if (!check.ok) {
      setError(check.error)
      return
    }
    startTransition(async () => {
      const res = await logTaskDelay({ projectId, taskId, newPlannedEnd: newDate })
      if (!res.ok) {
        setError(res.error)
        return
      }
      setOpen(false)
      setOverlay({
        summary: res.cascade_summary,
        materialsMoved: res.materials_moved,
        materialMovements: res.material_movements,
      })
    })
  }

  const liveValidation = validateDelayDate(currentPlannedEnd, newDate)
  const applyDisabled = pending || !liveValidation.ok

  return (
    <section className="mt-6 rounded-lg border border-[#E8DFD3] bg-white p-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-[#2B1F17]">Delay</h2>
          <p className="mt-1 text-xs text-[#6B5D52]">
            Push this task&apos;s end date out. Downstream tasks and material
            order-by dates will shift to match.
          </p>
        </div>
        {!open && (
          <button
            type="button"
            onClick={handleOpen}
            data-testid="log-delay-button"
            className="shrink-0 rounded-md border border-[#E8DFD3] bg-[#FAF7F2] px-3 py-1.5 text-xs font-medium text-[#2B1F17] hover:bg-[#F3ECDF]"
          >
            Log Delay
          </button>
        )}
      </div>

      {open && (
        <div className="mt-3 space-y-3" data-testid="delay-picker">
          <label className="block text-xs font-medium text-[#2B1F17]">
            New end date
            <input
              type="date"
              value={newDate}
              min={currentPlannedEnd}
              onChange={e => setNewDate(e.target.value)}
              disabled={pending}
              data-testid="delay-date-input"
              className="mt-1 w-full rounded-md border border-[#E8DFD3] px-3 py-2 text-sm disabled:opacity-50"
            />
          </label>
          {error && (
            <p role="alert" className="text-xs text-red-700">
              {error}
            </p>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleApply}
              disabled={applyDisabled}
              data-testid="delay-apply-button"
              className="rounded-md bg-[#2B1F17] px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
            >
              {pending ? 'Applying…' : 'Apply'}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              disabled={pending}
              className="rounded-md border border-[#E8DFD3] px-3 py-1.5 text-xs font-medium text-[#2B1F17] disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {overlay && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="cascade-summary-title"
          data-testid="cascade-summary-overlay"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
        >
          <div className="max-h-[85vh] w-full max-w-md overflow-auto rounded-lg border border-[#E8DFD3] bg-white p-5 shadow-lg">
            <h3
              id="cascade-summary-title"
              className="text-sm font-semibold text-[#2B1F17]"
            >
              Delay applied
            </h3>
            <p
              data-testid="cascade-summary-message"
              className="mt-2 text-sm text-[#2B1F17]"
            >
              {formatCascadeSummaryMessage(
                overlay.summary.movements.length,
                overlay.materialsMoved
              )}
            </p>
            <p className="mt-1 text-xs text-[#6B5D52]">
              Moved{' '}
              {overlay.summary.delta_days > 0 ? '+' : ''}
              {overlay.summary.delta_days}{' '}
              {Math.abs(overlay.summary.delta_days) === 1 ? 'day' : 'days'}
            </p>
            <ul className="mt-3 space-y-1.5" data-testid="cascade-summary-list">
              {overlay.summary.movements.map(m => (
                <li
                  key={m.task_id}
                  className="rounded-md border border-[#EFE8DD] bg-[#FAF7F2] p-2 text-xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate font-medium text-[#2B1F17]">
                      {m.task_name}
                      {m.is_trigger && (
                        <span className="ml-1 text-[#6B5D52]">(delayed)</span>
                      )}
                    </span>
                    <span className="shrink-0 text-[#6B5D52]">
                      {m.delta_days > 0 ? '+' : ''}
                      {m.delta_days}d
                    </span>
                  </div>
                  <div className="mt-0.5 text-[#6B5D52]">
                    {m.old_planned_end} → {m.new_planned_end}
                  </div>
                </li>
              ))}
            </ul>
            {overlay.materialMovements.some(
              m => m.delta_days !== 0 && m.delta_days !== null
            ) && (
              <>
                <h4 className="mt-4 text-xs font-semibold text-[#2B1F17]">
                  Material order-by dates moved
                </h4>
                <ul
                  className="mt-2 space-y-1.5"
                  data-testid="cascade-material-list"
                >
                  {overlay.materialMovements
                    .filter(m => m.delta_days !== 0 && m.delta_days !== null)
                    .map(m => (
                      <li
                        key={m.material_id}
                        className="rounded-md border border-[#EFE8DD] bg-[#FAF7F2] p-2 text-xs"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate font-medium text-[#2B1F17]">
                            {m.material_name}
                          </span>
                          <span className="shrink-0 text-[#6B5D52]">
                            {(m.delta_days ?? 0) > 0 ? '+' : ''}
                            {m.delta_days}d
                          </span>
                        </div>
                        <div className="mt-0.5 text-[#6B5D52]">
                          {m.old_order_by_date ?? '—'} →{' '}
                          {m.new_order_by_date ?? '—'} · {m.task_name}
                        </div>
                      </li>
                    ))}
                </ul>
              </>
            )}
            <button
              type="button"
              onClick={() => setOverlay(null)}
              data-testid="cascade-summary-close"
              className="mt-4 w-full rounded-md bg-[#2B1F17] px-3 py-2 text-xs font-medium text-white"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
