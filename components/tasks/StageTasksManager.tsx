'use client'

import { useMemo, useState, useTransition } from 'react'
import { validateTaskInput } from '@/lib/tasks/operations'
import {
  createTask,
  updateTaskDuration,
  deleteTask,
  addDependency,
  removeDependency,
} from '@/app/actions/tasks'

export type TaskRow = {
  id: string
  stage_id: string
  name: string
  duration_days: number
  planned_start: string
  planned_end: string
  trade_id: string | null
  notes: string | null
}

export type TaskDependencyRow = {
  task_id: string
  depends_on_task_id: string
}

export type TradeRow = {
  id: string
  name: string
}

export type ProjectTaskOption = {
  id: string
  name: string
  stage_name: string
}

type Props = {
  projectId: string
  stageId: string
  stageName: string
  initialTasks: TaskRow[]
  initialDependencies: TaskDependencyRow[]
  availableTasks: ProjectTaskOption[]
  trades: TradeRow[]
}

export function StageTasksManager({
  projectId,
  stageId,
  stageName,
  initialTasks,
  initialDependencies,
  availableTasks,
  trades,
}: Props) {
  const [tasks, setTasks] = useState<TaskRow[]>(initialTasks)
  const [dependencies, setDependencies] = useState<TaskDependencyRow[]>(initialDependencies)
  const [pending, startTransition] = useTransition()
  const [showAddModal, setShowAddModal] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  // Add form
  const [name, setName] = useState('')
  const [durationDays, setDurationDays] = useState('1')
  const [depIds, setDepIds] = useState<string[]>([])
  const [tradeId, setTradeId] = useState<string>('')
  const [notes, setNotes] = useState('')
  const [formErrors, setFormErrors] = useState<{
    name?: string
    duration_days?: string
    depends_on?: string
  }>({})

  // Edit duration modal
  const [editTarget, setEditTarget] = useState<TaskRow | null>(null)
  const [editDuration, setEditDuration] = useState('1')
  const [editError, setEditError] = useState<string | null>(null)

  // AC-DV-1: Edit dependencies modal
  const [depEditTarget, setDepEditTarget] = useState<TaskRow | null>(null)
  const [depEditError, setDepEditError] = useState<string | null>(null)

  const depsByTask = useMemo(() => {
    const map = new Map<string, string[]>()
    for (const d of dependencies) {
      const list = map.get(d.task_id) ?? []
      list.push(d.depends_on_task_id)
      map.set(d.task_id, list)
    }
    return map
  }, [dependencies])

  const taskNameById = useMemo(() => {
    const m = new Map<string, string>()
    for (const t of availableTasks) m.set(t.id, t.name)
    for (const t of tasks) m.set(t.id, t.name)
    return m
  }, [availableTasks, tasks])

  const tradeNameById = useMemo(() => {
    const m = new Map<string, string>()
    for (const t of trades) m.set(t.id, t.name)
    return m
  }, [trades])

  function resetAddForm() {
    setName('')
    setDurationDays('1')
    setDepIds([])
    setTradeId('')
    setNotes('')
    setFormErrors({})
    setServerError(null)
  }

  function handleOpenAdd() {
    resetAddForm()
    setShowAddModal(true)
  }

  function handleCancelAdd() {
    setShowAddModal(false)
    resetAddForm()
  }

  function handleToggleDep(id: string) {
    setDepIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  function handleSubmitAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setServerError(null)
    const durationNum = Number(durationDays)
    const validated = validateTaskInput({
      name,
      duration_days: durationDays,
      depends_on: depIds,
    })
    setFormErrors(validated.errors)
    if (!validated.ok) return

    startTransition(async () => {
      const res = await createTask({
        projectId,
        stageId,
        name: name.trim(),
        durationDays: durationNum,
        dependsOn: depIds,
        tradeId: tradeId || null,
        notes: notes.trim() || null,
      })
      if (!res.ok) {
        if (res.field) setFormErrors({ [res.field]: res.error })
        else setServerError(res.error)
        return
      }
      setTasks(prev => [...prev, res.task])
      if (depIds.length > 0) {
        setDependencies(prev => [
          ...prev,
          ...depIds.map(d => ({ task_id: res.task.id, depends_on_task_id: d })),
        ])
      }
      setShowAddModal(false)
      resetAddForm()
    })
  }

  function handleOpenEdit(task: TaskRow) {
    setEditTarget(task)
    setEditDuration(String(task.duration_days))
    setEditError(null)
  }

  function handleCancelEdit() {
    setEditTarget(null)
    setEditDuration('1')
    setEditError(null)
  }

  function handleOpenDepEdit(task: TaskRow) {
    setDepEditTarget(task)
    setDepEditError(null)
  }

  function handleCloseDepEdit() {
    setDepEditTarget(null)
    setDepEditError(null)
  }

  function handleToggleExistingDep(taskId: string, depTaskId: string, isCurrentlyDep: boolean) {
    setDepEditError(null)
    startTransition(async () => {
      if (isCurrentlyDep) {
        const res = await removeDependency(projectId, taskId, depTaskId)
        if (!res.ok) {
          setDepEditError(res.error)
          return
        }
        setDependencies(prev =>
          prev.filter(d => !(d.task_id === taskId && d.depends_on_task_id === depTaskId))
        )
      } else {
        const res = await addDependency({ projectId, taskId, dependsOnTaskId: depTaskId })
        if (!res.ok) {
          setDepEditError(res.error)
          return
        }
        setDependencies(prev => [
          ...prev,
          { task_id: taskId, depends_on_task_id: depTaskId },
        ])
      }
    })
  }

  function handleSubmitEdit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!editTarget) return
    setEditError(null)
    const durationNum = Number(editDuration)
    const validated = validateTaskInput({
      name: 'placeholder',
      duration_days: editDuration,
    })
    if (validated.errors.duration_days) {
      setEditError(validated.errors.duration_days)
      return
    }
    const targetId = editTarget.id
    startTransition(async () => {
      const res = await updateTaskDuration({
        projectId,
        taskId: targetId,
        durationDays: durationNum,
      })
      if (!res.ok) {
        setEditError(res.error)
        return
      }
      // Apply cascade changes to local state so the list shows the new dates.
      const changes = new Map(
        res.cascade_changes.map(c => [
          c.task_id,
          { planned_start: c.new_planned_start, planned_end: c.new_planned_end },
        ])
      )
      setTasks(prev =>
        prev.map(t => {
          if (t.id === targetId) {
            return {
              ...t,
              duration_days: res.task.duration_days,
              planned_start: res.task.planned_start,
              planned_end: res.task.planned_end,
            }
          }
          const ch = changes.get(t.id)
          if (ch) return { ...t, ...ch }
          return t
        })
      )
      handleCancelEdit()
    })
  }

  function handleDelete(task: TaskRow) {
    startTransition(async () => {
      const res = await deleteTask(projectId, task.id)
      if (!res.ok) {
        setServerError(res.error)
        return
      }
      setTasks(prev => prev.filter(t => t.id !== task.id))
      // AC-TM-6: remove deleted task from every dependency row that references it.
      setDependencies(prev =>
        prev.filter(
          d => d.task_id !== task.id && d.depends_on_task_id !== task.id
        )
      )
    })
  }

  const sortedTasks = useMemo(
    () => [...tasks].sort((a, b) => a.planned_start.localeCompare(b.planned_start)),
    [tasks]
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-[#2B1F17]">Substages</h2>
          <p className="text-xs text-[#6B5D52]">
            Work items in {stageName}. Set dependencies to chain substages in sequence.
          </p>
        </div>
        <button
          type="button"
          onClick={handleOpenAdd}
          disabled={pending}
          className="rounded-md bg-[#2B1F17] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#3A2A1E] disabled:opacity-50"
        >
          + Add Substage
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

      {sortedTasks.length === 0 ? (
        <div className="rounded-lg border border-dashed border-[#E8DFD3] bg-white p-6 text-center">
          <p className="text-sm text-[#6B5D52]">
            No substages yet. Add the first substage in this stage.
          </p>
        </div>
      ) : (
        <ul className="space-y-2" data-testid="task-list">
          {sortedTasks.map(task => {
            const deps = depsByTask.get(task.id) ?? []
            return (
              <li
                key={task.id}
                className="rounded-lg border border-[#E8DFD3] bg-white p-3"
                data-task-id={task.id}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-[#2B1F17]">{task.name}</div>
                    <div className="mt-1 text-xs text-[#6B5D52]">
                      {task.planned_start} → {task.planned_end} · {task.duration_days}d
                      {task.trade_id && tradeNameById.has(task.trade_id) && (
                        <> · {tradeNameById.get(task.trade_id)}</>
                      )}
                    </div>
                    {deps.length > 0 && (
                      <div className="mt-1 text-xs text-[#6B5D52]">
                        depends on:{' '}
                        {deps
                          .map(id => taskNameById.get(id) ?? id.slice(0, 8))
                          .join(', ')}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      aria-label={`Edit dependencies for ${task.name}`}
                      onClick={() => handleOpenDepEdit(task)}
                      disabled={pending}
                      className="rounded px-2 py-1 text-xs text-[#2B1F17] hover:bg-[#FAF7F2] disabled:opacity-30"
                    >
                      Deps
                    </button>
                    <button
                      type="button"
                      aria-label={`Edit duration for ${task.name}`}
                      onClick={() => handleOpenEdit(task)}
                      disabled={pending}
                      className="rounded px-2 py-1 text-xs text-[#2B1F17] hover:bg-[#FAF7F2] disabled:opacity-30"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      aria-label={`Delete ${task.name}`}
                      onClick={() => handleDelete(task)}
                      disabled={pending}
                      className="rounded p-1 text-red-700 hover:bg-red-50 disabled:opacity-30"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {showAddModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Add substage"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={handleCancelAdd}
        >
          <form
            onSubmit={handleSubmitAdd}
            onClick={e => e.stopPropagation()}
            className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl"
          >
            <h3 className="text-base font-semibold text-[#2B1F17]">Add Substage</h3>
            <p className="mt-1 text-xs text-[#6B5D52]">Adding a substage to {stageName}.</p>

            <label className="mt-4 block text-xs font-medium text-[#2B1F17]">
              Name
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                autoFocus
                maxLength={120}
                className={`mt-1 w-full rounded-md border px-3 py-2 text-sm ${
                  formErrors.name ? 'border-red-400' : 'border-[#E8DFD3]'
                }`}
                aria-invalid={!!formErrors.name}
              />
            </label>
            {formErrors.name && (
              <p className="mt-1 text-xs text-red-700">{formErrors.name}</p>
            )}

            <label className="mt-3 block text-xs font-medium text-[#2B1F17]">
              Duration (days)
              <input
                type="number"
                value={durationDays}
                onChange={e => setDurationDays(e.target.value)}
                min={1}
                step={1}
                className={`mt-1 w-full rounded-md border px-3 py-2 text-sm ${
                  formErrors.duration_days ? 'border-red-400' : 'border-[#E8DFD3]'
                }`}
                aria-invalid={!!formErrors.duration_days}
              />
            </label>
            {formErrors.duration_days && (
              <p className="mt-1 text-xs text-red-700">{formErrors.duration_days}</p>
            )}

            {availableTasks.length > 0 && (
              <fieldset className="mt-3">
                <legend className="text-xs font-medium text-[#2B1F17]">
                  Depends on
                </legend>
                <div className="mt-1 max-h-32 overflow-y-auto rounded-md border border-[#E8DFD3] p-2">
                  {availableTasks.map(opt => (
                    <label
                      key={opt.id}
                      className="flex items-center gap-2 py-1 text-xs text-[#2B1F17]"
                    >
                      <input
                        type="checkbox"
                        checked={depIds.includes(opt.id)}
                        onChange={() => handleToggleDep(opt.id)}
                      />
                      <span>
                        {opt.name}{' '}
                        <span className="text-[#6B5D52]">({opt.stage_name})</span>
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
            )}
            {formErrors.depends_on && (
              <p className="mt-1 text-xs text-red-700">{formErrors.depends_on}</p>
            )}

            {trades.length > 0 && (
              <label className="mt-3 block text-xs font-medium text-[#2B1F17]">
                Trade (optional)
                <select
                  value={tradeId}
                  onChange={e => setTradeId(e.target.value)}
                  className="mt-1 w-full rounded-md border border-[#E8DFD3] px-3 py-2 text-sm"
                >
                  <option value="">— None —</option>
                  {trades.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <label className="mt-3 block text-xs font-medium text-[#2B1F17]">
              Notes (optional)
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={2}
                maxLength={2000}
                className="mt-1 w-full rounded-md border border-[#E8DFD3] px-3 py-2 text-sm"
              />
            </label>

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
                {pending ? 'Saving…' : 'Save substage'}
              </button>
            </div>
          </form>
        </div>
      )}

      {editTarget && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Edit substage duration"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={handleCancelEdit}
        >
          <form
            onSubmit={handleSubmitEdit}
            onClick={e => e.stopPropagation()}
            className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl"
          >
            <h3 className="text-base font-semibold text-[#2B1F17]">Edit duration</h3>
            <p className="mt-1 text-xs text-[#6B5D52]">
              {editTarget.name} — changing this will shift downstream substages.
            </p>
            <label className="mt-4 block text-xs font-medium text-[#2B1F17]">
              Duration (days)
              <input
                type="number"
                value={editDuration}
                onChange={e => setEditDuration(e.target.value)}
                min={1}
                step={1}
                autoFocus
                className="mt-1 w-full rounded-md border border-[#E8DFD3] px-3 py-2 text-sm"
              />
            </label>
            {editError && (
              <p role="alert" className="mt-2 text-xs text-red-700">
                {editError}
              </p>
            )}
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={handleCancelEdit}
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
                {pending ? 'Saving…' : 'Save and cascade'}
              </button>
            </div>
          </form>
        </div>
      )}

      {depEditTarget && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Edit dependencies"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={handleCloseDepEdit}
        >
          <div
            onClick={e => e.stopPropagation()}
            className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl"
          >
            <h3 className="text-base font-semibold text-[#2B1F17]">Edit dependencies</h3>
            <p className="mt-1 text-xs text-[#6B5D52]">
              {depEditTarget.name} — check tasks this task depends on.
            </p>

            {depEditError && (
              <p
                role="alert"
                data-testid="dep-cycle-error"
                className="mt-3 rounded border border-red-200 bg-red-50 p-2 text-xs text-red-800"
              >
                {depEditError}
              </p>
            )}

            <div className="mt-3 max-h-48 overflow-y-auto rounded-md border border-[#E8DFD3] p-2">
              {availableTasks
                .filter(opt => opt.id !== depEditTarget.id)
                .map(opt => {
                  const isChecked = dependencies.some(
                    d =>
                      d.task_id === depEditTarget.id &&
                      d.depends_on_task_id === opt.id
                  )
                  return (
                    <label
                      key={opt.id}
                      className="flex items-center gap-2 py-1 text-xs text-[#2B1F17]"
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        disabled={pending}
                        onChange={() =>
                          handleToggleExistingDep(depEditTarget.id, opt.id, isChecked)
                        }
                      />
                      <span>
                        {opt.name}{' '}
                        <span className="text-[#6B5D52]">({opt.stage_name})</span>
                      </span>
                    </label>
                  )
                })}
            </div>

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={handleCloseDepEdit}
                className="rounded-md bg-[#2B1F17] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#3A2A1E]"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
