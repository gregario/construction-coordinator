'use client'

import { useState, useTransition } from 'react'
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

type StageWithCount = StageRecord & { task_count: number }

type Props = {
  projectId: string
  initialStages: StageWithCount[]
}

const STAGE_COLOR_SWATCHES = [
  '#8B5E3C', // earth brown (default)
  '#6B8F3F', // frame green
  '#C48A3A', // ochre
  '#2B1F17', // ink
  '#4F6C8C', // slate blue
  '#B04A3C', // brick red
]

export function StageManager({ projectId, initialStages }: Props) {
  const [stages, setStages] = useState<StageWithCount[]>(
    [...initialStages].sort((a, b) => a.order_index - b.order_index)
  )
  const [showModal, setShowModal] = useState(false)
  const [formName, setFormName] = useState('')
  const [formColor, setFormColor] = useState(STAGE_COLOR_SWATCHES[0])
  const [formErrors, setFormErrors] = useState<{ name?: string; color?: string }>({})
  const [serverError, setServerError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const [deleteTarget, setDeleteTarget] = useState<
    | { stage: StageWithCount; taskCount: number }
    | null
  >(null)
  const [dragId, setDragId] = useState<string | null>(null)

  function resetForm() {
    setFormName('')
    setFormColor(STAGE_COLOR_SWATCHES[0])
    setFormErrors({})
    setServerError(null)
  }

  function handleOpenAdd() {
    resetForm()
    setShowModal(true)
  }

  function handleCancelAdd() {
    setShowModal(false)
    resetForm()
  }

  function handleSubmitAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setServerError(null)
    const validated = validateStageInput({ name: formName, color: formColor })
    setFormErrors(validated.errors)
    if (!validated.ok) return

    startTransition(async () => {
      const res = await createStage({
        projectId,
        name: formName.trim(),
        color: formColor,
      })
      if (!res.ok) {
        if (res.field) setFormErrors({ [res.field]: res.error })
        else setServerError(res.error)
        return
      }
      setStages(prev => [...prev, { ...res.stage, task_count: 0 }])
      setShowModal(false)
      resetForm()
    })
  }

  function commitReorder(nextOrder: StageWithCount[]) {
    setStages(nextOrder)
    startTransition(async () => {
      const res = await reorderProjectStages(
        projectId,
        nextOrder.map(s => s.id)
      )
      if (!res.ok) {
        setServerError(res.error)
      }
    })
  }

  function handleDragStart(id: string) {
    setDragId(id)
  }

  function handleDragOver(e: React.DragEvent, overId: string) {
    e.preventDefault()
    if (!dragId || dragId === overId) return
  }

  function handleDrop(e: React.DragEvent, targetId: string) {
    e.preventDefault()
    if (!dragId || dragId === targetId) {
      setDragId(null)
      return
    }
    const targetIndex = stages.findIndex(s => s.id === targetId)
    if (targetIndex === -1) {
      setDragId(null)
      return
    }
    const reordered = reorderStages(stages, dragId, targetIndex)
    // reorderStages returns StageRecord — re-attach task_count from current state
    const countById = new Map(stages.map(s => [s.id, s.task_count]))
    const withCounts = reordered.map(s => ({
      ...s,
      task_count: countById.get(s.id) ?? 0,
    }))
    setDragId(null)
    commitReorder(withCounts)
  }

  function handleMove(id: string, direction: -1 | 1) {
    const idx = stages.findIndex(s => s.id === id)
    if (idx === -1) return
    const target = idx + direction
    if (target < 0 || target >= stages.length) return
    const reordered = reorderStages(stages, id, target)
    const countById = new Map(stages.map(s => [s.id, s.task_count]))
    const withCounts = reordered.map(s => ({
      ...s,
      task_count: countById.get(s.id) ?? 0,
    }))
    commitReorder(withCounts)
  }

  function handleDeleteClick(stage: StageWithCount) {
    const warning = buildDeleteWarning(stage.name, stage.task_count)
    if (!warning.requiresConfirmation) {
      // AC-SM-4: empty stage deletes immediately
      startTransition(async () => {
        const res = await deleteStage(projectId, stage.id, false)
        if (!res.ok) {
          setServerError(res.error)
          return
        }
        setStages(prev =>
          prev
            .filter(s => s.id !== stage.id)
            .map((s, i) => ({ ...s, order_index: i }))
        )
      })
      return
    }
    // AC-SM-3: populated stage → open confirm dialog
    setDeleteTarget({ stage, taskCount: stage.task_count })
  }

  function handleConfirmDelete() {
    if (!deleteTarget) return
    const stageId = deleteTarget.stage.id
    startTransition(async () => {
      const res = await deleteStage(projectId, stageId, true)
      if (!res.ok) {
        setServerError(res.error)
        return
      }
      setStages(prev =>
        prev
          .filter(s => s.id !== stageId)
          .map((s, i) => ({ ...s, order_index: i }))
      )
      setDeleteTarget(null)
    })
  }

  function handleCancelDelete() {
    setDeleteTarget(null)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-[#2B1F17]">Stages</h2>
          <p className="text-xs text-[#6B5D52]">
            Drag to reorder. Stages group your tasks on the Gantt.
          </p>
        </div>
        <button
          type="button"
          onClick={handleOpenAdd}
          disabled={pending}
          className="rounded-md bg-[#2B1F17] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#3A2A1E] disabled:opacity-50"
        >
          + Add Stage
        </button>
      </div>

      {serverError && (
        <div
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800"
        >
          {serverError}
        </div>
      )}

      {stages.length === 0 ? (
        <div className="rounded-lg border border-dashed border-[#E8DFD3] bg-white p-6 text-center">
          <p className="text-sm text-[#6B5D52]">
            No stages yet. Add your first stage to start building the schedule.
          </p>
        </div>
      ) : (
        <ul className="space-y-2" data-testid="stage-list">
          {stages.map((stage, idx) => (
            <li
              key={stage.id}
              draggable
              onDragStart={() => handleDragStart(stage.id)}
              onDragOver={e => handleDragOver(e, stage.id)}
              onDrop={e => handleDrop(e, stage.id)}
              onDragEnd={() => setDragId(null)}
              className={`flex items-center gap-3 rounded-lg border border-[#E8DFD3] bg-white p-3 ${
                dragId === stage.id ? 'opacity-50' : ''
              }`}
              data-stage-id={stage.id}
            >
              <span
                aria-hidden="true"
                className="h-8 w-1.5 shrink-0 rounded-full"
                style={{ backgroundColor: stage.color }}
              />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-[#2B1F17] truncate">
                  {stage.name}
                </div>
                <div className="text-xs text-[#6B5D52]">
                  {stage.task_count === 0
                    ? 'No tasks'
                    : stage.task_count === 1
                    ? '1 task'
                    : `${stage.task_count} tasks`}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  aria-label={`Move ${stage.name} up`}
                  onClick={() => handleMove(stage.id, -1)}
                  disabled={pending || idx === 0}
                  className="rounded p-1 text-[#6B5D52] hover:bg-[#FAF7F2] disabled:opacity-30"
                >
                  ↑
                </button>
                <button
                  type="button"
                  aria-label={`Move ${stage.name} down`}
                  onClick={() => handleMove(stage.id, 1)}
                  disabled={pending || idx === stages.length - 1}
                  className="rounded p-1 text-[#6B5D52] hover:bg-[#FAF7F2] disabled:opacity-30"
                >
                  ↓
                </button>
                <button
                  type="button"
                  aria-label={`Delete ${stage.name}`}
                  onClick={() => handleDeleteClick(stage)}
                  disabled={pending}
                  className="rounded p-1 text-red-700 hover:bg-red-50 disabled:opacity-30"
                >
                  ✕
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {showModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Add stage"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={handleCancelAdd}
        >
          <form
            onSubmit={handleSubmitAdd}
            onClick={e => e.stopPropagation()}
            className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl"
          >
            <h3 className="text-base font-semibold text-[#2B1F17]">Add Stage</h3>
            <p className="mt-1 text-xs text-[#6B5D52]">
              Stages group related tasks (e.g. Foundations, Frame, Roof).
            </p>

            <label className="mt-4 block text-xs font-medium text-[#2B1F17]">
              Name
              <input
                type="text"
                value={formName}
                onChange={e => setFormName(e.target.value)}
                autoFocus
                maxLength={80}
                className={`mt-1 w-full rounded-md border px-3 py-2 text-sm ${
                  formErrors.name ? 'border-red-400' : 'border-[#E8DFD3]'
                }`}
                aria-invalid={!!formErrors.name}
              />
            </label>
            {formErrors.name && (
              <p className="mt-1 text-xs text-red-700">{formErrors.name}</p>
            )}

            <fieldset className="mt-4">
              <legend className="text-xs font-medium text-[#2B1F17]">Color</legend>
              <div className="mt-2 flex gap-2">
                {STAGE_COLOR_SWATCHES.map(c => (
                  <button
                    type="button"
                    key={c}
                    onClick={() => setFormColor(c)}
                    aria-label={`Color ${c}`}
                    aria-pressed={formColor === c}
                    className={`h-7 w-7 rounded-full border-2 ${
                      formColor === c ? 'border-[#2B1F17]' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
              {formErrors.color && (
                <p className="mt-1 text-xs text-red-700">{formErrors.color}</p>
              )}
            </fieldset>

            {serverError && (
              <p
                role="alert"
                className="mt-3 rounded border border-red-200 bg-red-50 p-2 text-xs text-red-800"
              >
                {serverError}
              </p>
            )}

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={handleCancelAdd}
                disabled={pending}
                className="rounded-md border border-[#E8DFD3] bg-white px-3 py-1.5 text-xs font-medium text-[#2B1F17] hover:bg-[#FAF7F2] disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={pending}
                className="rounded-md bg-[#2B1F17] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#3A2A1E] disabled:opacity-50"
              >
                {pending ? 'Saving…' : 'Save stage'}
              </button>
            </div>
          </form>
        </div>
      )}

      {deleteTarget && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Confirm delete stage"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={handleCancelDelete}
        >
          <div
            onClick={e => e.stopPropagation()}
            className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl"
          >
            <h3 className="text-base font-semibold text-[#2B1F17]">Delete stage</h3>
            <p className="mt-2 text-sm text-[#6B5D52]">
              {buildDeleteWarning(deleteTarget.stage.name, deleteTarget.taskCount).message}
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={handleCancelDelete}
                disabled={pending}
                className="rounded-md border border-[#E8DFD3] bg-white px-3 py-1.5 text-xs font-medium text-[#2B1F17] hover:bg-[#FAF7F2] disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={pending}
                className="rounded-md bg-red-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-800 disabled:opacity-50"
              >
                {pending ? 'Deleting…' : 'Delete stage and tasks'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
