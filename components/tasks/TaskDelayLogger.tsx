'use client'

import { useState, useTransition, useEffect, useRef } from 'react'
import { logTaskDelay } from '@/app/actions/tasks'
import { previewCascade, type CascadePreview } from '@/app/actions/tasks'
import { formatCascadeSummaryMessage } from '@/lib/tasks/delay'
import type { CascadeSummary, MaterialMovement } from '@/lib/cascade/engine'

type Props = {
  projectId: string
  taskId: string
  taskName: string
  currentPlannedStart: string
  currentPlannedEnd: string
  durationDays: number
}

type Overlay = {
  summary: CascadeSummary
  materialsMoved: number
  materialMovements: MaterialMovement[]
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().split('T')[0]
}

export function TaskDelayLogger({
  projectId,
  taskId,
  taskName,
  currentPlannedStart,
  currentPlannedEnd,
  durationDays,
}: Props) {
  const [open, setOpen] = useState(false)
  const [delayDays, setDelayDays] = useState(1)
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const [overlay, setOverlay] = useState<Overlay | null>(null)
  const [preview, setPreview] = useState<CascadePreview | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const newEnd = addDays(currentPlannedEnd, delayDays)

  // Live preview: fetch cascade impact when delayDays changes
  useEffect(() => {
    if (!open || delayDays < 1) {
      setPreview(null)
      return
    }

    setPreviewLoading(true)

    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      const result = await previewCascade(taskId, delayDays)
      if (result.ok) {
        setPreview(result.preview)
      }
      setPreviewLoading(false)
    }, 300)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [open, delayDays, taskId])

  function handleOpen() {
    setDelayDays(1)
    setReason('')
    setError(null)
    setPreview(null)
    setOpen(true)
  }

  function handleCancel() {
    setOpen(false)
    setError(null)
    setPreview(null)
  }

  function handleApply() {
    if (!reason.trim()) {
      setError('Please provide a reason for the delay')
      return
    }
    setError(null)
    startTransition(async () => {
      const newPlannedEnd = addDays(currentPlannedEnd, delayDays)
      const res = await logTaskDelay({
        projectId,
        taskId,
        newPlannedEnd,
        reason: reason.trim(),
      })
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

  return (
    <section className="mt-6 rounded-lg border border-[#E8DFD3] bg-white p-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-[#2B1F17]">Reschedule</h2>
          <p className="mt-1 text-xs text-[#6B5D52]">
            Push this substage&apos;s end date out. Downstream substages and material
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
            Reschedule
          </button>
        )}
      </div>

      {open && (
        <div className="mt-4 space-y-4" data-testid="delay-picker">
          {/* Current dates context */}
          <div className="rounded-md bg-[#FAF7F2] px-3 py-2">
            <div className="text-xs text-[#6B5D52]">Current schedule</div>
            <div className="text-sm font-medium text-[#2B1F17]">
              {currentPlannedStart} → {currentPlannedEnd} ({durationDays} days)
            </div>
          </div>

          {/* Delay stepper */}
          <div>
            <label className="block text-xs font-medium text-[#2B1F17] mb-1">
              Delay by
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setDelayDays(Math.max(1, delayDays - 1))}
                disabled={delayDays <= 1 || pending}
                className="rounded-md border border-[#E8DFD3] bg-white w-9 h-9 flex items-center justify-center text-lg font-medium text-[#2B1F17] hover:bg-[#F5F0E8] disabled:opacity-30"
                aria-label="Decrease delay"
              >
                −
              </button>
              <input
                type="number"
                value={delayDays}
                onChange={e => setDelayDays(Math.max(1, parseInt(e.target.value) || 1))}
                min={1}
                disabled={pending}
                data-testid="delay-days-input"
                className="w-16 text-center rounded-md border border-[#E8DFD3] px-2 py-1.5 text-sm font-medium"
              />
              <button
                type="button"
                onClick={() => setDelayDays(delayDays + 1)}
                disabled={pending}
                className="rounded-md border border-[#E8DFD3] bg-white w-9 h-9 flex items-center justify-center text-lg font-medium text-[#2B1F17] hover:bg-[#F5F0E8] disabled:opacity-30"
                aria-label="Increase delay"
              >
                +
              </button>
              <span className="text-sm text-[#6B5D52]">
                {delayDays === 1 ? 'day' : 'days'}
              </span>
            </div>
            <div className="mt-1.5 text-xs text-[#6B5D52]">
              New end date: <span className="font-medium text-[#2B1F17]">{newEnd}</span>
            </div>
          </div>

          {/* Reason field */}
          <label className="block">
            <span className="text-xs font-medium text-[#2B1F17]">
              Reason <span className="text-[#B85450]">*</span>
            </span>
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="e.g. Timber delivery delayed by supplier"
              maxLength={500}
              rows={2}
              disabled={pending}
              className="mt-1 w-full rounded-md border border-[#E8DFD3] px-3 py-2 text-sm resize-none"
            />
          </label>

          {/* Live impact preview */}
          {(preview || previewLoading) && (
            <div className="rounded-md border border-[#D4A355]/30 bg-[#D4A355]/5 p-3">
              <div className="text-xs font-semibold text-[#2B1F17] mb-1">Impact preview</div>
              {previewLoading ? (
                <div className="text-xs text-[#6B5D52] animate-pulse">Calculating impact...</div>
              ) : preview ? (
                <div className="space-y-1">
                  <div className="text-xs text-[#2B1F17]">
                    {preview.total_tasks} substage{preview.total_tasks !== 1 ? 's' : ''} will shift +{delayDays} day{delayDays !== 1 ? 's' : ''}
                  </div>
                  {preview.total_materials > 0 && (
                    <div className="text-xs text-[#2B1F17]">
                      {preview.total_materials} material order-by date{preview.total_materials !== 1 ? 's' : ''} will move
                    </div>
                  )}
                  {preview.overdue_materials > 0 && (
                    <div className="text-xs font-medium text-[#B85450]">
                      ⚠ {preview.overdue_materials} material{preview.overdue_materials !== 1 ? 's' : ''} will become overdue
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          )}

          {error && (
            <p role="alert" className="text-xs text-[#B85450]">{error}</p>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleApply}
              disabled={pending || delayDays < 1}
              data-testid="delay-apply-button"
              className="rounded-md bg-[#2B1F17] px-4 py-2 text-xs font-medium text-white disabled:opacity-50"
            >
              {pending ? 'Applying…' : 'Apply Delay'}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              disabled={pending}
              className="rounded-md border border-[#E8DFD3] px-3 py-2 text-xs font-medium text-[#2B1F17] disabled:opacity-50"
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
            <h3 id="cascade-summary-title" className="text-sm font-semibold text-[#2B1F17]">
              Delay applied
            </h3>
            <p data-testid="cascade-summary-message" className="mt-2 text-sm text-[#2B1F17]">
              {formatCascadeSummaryMessage(
                overlay.summary.movements.length,
                overlay.materialsMoved
              )}
            </p>
            <p className="mt-1 text-xs text-[#6B5D52]">
              Moved {overlay.summary.delta_days > 0 ? '+' : ''}{overlay.summary.delta_days}{' '}
              {Math.abs(overlay.summary.delta_days) === 1 ? 'day' : 'days'}
            </p>
            <ul className="mt-3 space-y-1.5" data-testid="cascade-summary-list">
              {overlay.summary.movements.map(m => (
                <li key={m.task_id} className="rounded-md border border-[#EFE8DD] bg-[#FAF7F2] p-2 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate font-medium text-[#2B1F17]">
                      {m.task_name}
                      {m.is_trigger && <span className="ml-1 text-[#6B5D52]">(delayed)</span>}
                    </span>
                    <span className="shrink-0 text-[#6B5D52]">
                      {m.delta_days > 0 ? '+' : ''}{m.delta_days}d
                    </span>
                  </div>
                  <div className="mt-0.5 text-[#6B5D52]">
                    {m.old_planned_end} → {m.new_planned_end}
                  </div>
                </li>
              ))}
            </ul>
            {overlay.materialMovements.some(m => m.delta_days !== 0 && m.delta_days !== null) && (
              <>
                <h4 className="mt-4 text-xs font-semibold text-[#2B1F17]">
                  Material order-by dates moved
                </h4>
                <ul className="mt-2 space-y-1.5" data-testid="cascade-material-list">
                  {overlay.materialMovements
                    .filter(m => m.delta_days !== 0 && m.delta_days !== null)
                    .map(m => (
                      <li key={m.material_id} className="rounded-md border border-[#EFE8DD] bg-[#FAF7F2] p-2 text-xs">
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate font-medium text-[#2B1F17]">{m.material_name}</span>
                          <span className="shrink-0 text-[#6B5D52]">
                            {(m.delta_days ?? 0) > 0 ? '+' : ''}{m.delta_days}d
                          </span>
                        </div>
                        <div className="mt-0.5 text-[#6B5D52]">
                          {m.old_order_by_date ?? '—'} → {m.new_order_by_date ?? '—'} · {m.task_name}
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
