'use client'

import { useState, useTransition } from 'react'
import {
  validateMaterialInput,
  nextStatusTransition,
  type MaterialFormField,
  type MaterialFormValues,
  type MaterialOrderStatusValue,
} from '@/lib/materials/operations'
import {
  createMaterial,
  updateMaterial,
  deleteMaterial,
  updateMaterialStatus,
} from '@/app/actions/materials'
import { MaterialStatusBadge } from '@/components/materials/MaterialDeadlineBadge'

export type MaterialListItem = {
  id: string
  name: string
  quantity: string | null
  lead_time_days: number
  order_by_date: string | null
  order_status: MaterialOrderStatusValue
  estimated_cost: number | null
  supplier_name: string | null
  notes: string | null
}

type Props = {
  projectId: string
  taskId: string
  initialMaterials: MaterialListItem[]
}

const EMPTY_FORM: MaterialFormValues = {
  name: '',
  quantity: '',
  lead_time_days: '',
  estimated_cost: '',
  supplier_name: '',
  notes: '',
}

type FormMode = 'none' | 'add' | { kind: 'edit'; id: string }

function itemToForm(m: MaterialListItem): MaterialFormValues {
  return {
    name: m.name,
    quantity: m.quantity ?? '',
    lead_time_days: String(m.lead_time_days),
    estimated_cost: m.estimated_cost != null ? String(m.estimated_cost) : '',
    supplier_name: m.supplier_name ?? '',
    notes: m.notes ?? '',
  }
}

function formatCurrency(n: number | null): string | null {
  if (n == null) return null
  return n.toLocaleString(undefined, {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })
}

export function TaskMaterialsManager({
  projectId,
  taskId,
  initialMaterials,
}: Props) {
  const [materials, setMaterials] = useState<MaterialListItem[]>(initialMaterials)
  const [pending, startTransition] = useTransition()
  const [mode, setMode] = useState<FormMode>('none')
  const [form, setForm] = useState<MaterialFormValues>(EMPTY_FORM)
  const [formErrors, setFormErrors] = useState<
    Partial<Record<MaterialFormField, string>>
  >({})
  const [serverError, setServerError] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<MaterialListItem | null>(null)

  function resetForm() {
    setForm(EMPTY_FORM)
    setFormErrors({})
    setServerError(null)
  }

  function handleOpenAdd() {
    resetForm()
    setMode('add')
  }

  function handleOpenEdit(m: MaterialListItem) {
    setForm(itemToForm(m))
    setFormErrors({})
    setServerError(null)
    setMode({ kind: 'edit', id: m.id })
  }

  function handleCancelForm() {
    setMode('none')
    resetForm()
  }

  // Live-validate as the user types so the save button can disable itself
  // per AC-ML-3 ("save button is disabled" while lead_time is empty/negative).
  const liveValidation = validateMaterialInput(form)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setServerError(null)
    const validated = validateMaterialInput(form)
    setFormErrors(validated.errors)
    if (!validated.ok) return

    startTransition(async () => {
      if (mode === 'add') {
        const res = await createMaterial({ projectId, taskId, ...form })
        if (!res.ok) {
          if (res.field) setFormErrors({ [res.field]: res.error })
          else setServerError(res.error)
          return
        }
        setMaterials(prev => [...prev, res.material])
        setMode('none')
        resetForm()
      } else if (typeof mode === 'object' && mode.kind === 'edit') {
        const res = await updateMaterial({
          projectId,
          materialId: mode.id,
          ...form,
        })
        if (!res.ok) {
          if (res.field) setFormErrors({ [res.field]: res.error })
          else setServerError(res.error)
          return
        }
        setMaterials(prev =>
          prev.map(m => (m.id === mode.id ? res.material : m))
        )
        setMode('none')
        resetForm()
      }
    })
  }

  function handleAdvanceStatus(m: MaterialListItem) {
    const transition = nextStatusTransition(m.order_status)
    if (!transition) return
    setServerError(null)
    startTransition(async () => {
      const res = await updateMaterialStatus({
        projectId,
        materialId: m.id,
        nextStatus: transition.nextStatus,
      })
      if (!res.ok) {
        setServerError(res.error)
        return
      }
      setMaterials(prev =>
        prev.map(item =>
          item.id === m.id
            ? { ...item, order_status: res.material.order_status }
            : item
        )
      )
    })
  }

  function handleConfirmDelete() {
    if (!deleteTarget) return
    const targetId = deleteTarget.id
    startTransition(async () => {
      const res = await deleteMaterial(projectId, targetId)
      if (!res.ok) {
        setServerError(res.error)
        return
      }
      setMaterials(prev => prev.filter(m => m.id !== targetId))
      setDeleteTarget(null)
    })
  }

  const isFormOpen =
    mode === 'add' || (typeof mode === 'object' && mode.kind === 'edit')
  const saveDisabled = pending || !liveValidation.ok

  return (
    <section className="mt-6 rounded-lg border border-[#E8DFD3] bg-white p-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-[#2B1F17]">Materials</h2>
          <p className="text-xs text-[#6B5D52]">
            Items needed for this substage, with lead times.
          </p>
        </div>
        <button
          type="button"
          onClick={handleOpenAdd}
          disabled={pending || isFormOpen}
          className="rounded-md bg-[#2B1F17] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#3A2A1E] disabled:opacity-50"
        >
          + Add Material
        </button>
      </div>

      {serverError && (
        <div
          role="alert"
          className="mt-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800"
        >
          {serverError}
        </div>
      )}

      {materials.length === 0 && !isFormOpen ? (
        <div className="mt-3 rounded-md border border-dashed border-[#E8DFD3] p-4 text-center">
          <p className="text-sm text-[#6B5D52]">
            No materials yet. Add the first item needed for this substage.
          </p>
        </div>
      ) : (
        <ul className="mt-3 space-y-2" data-testid="material-list">
          {materials.map(m => {
            const cost = formatCurrency(m.estimated_cost)
            const transition = nextStatusTransition(m.order_status)
            return (
              <li
                key={m.id}
                className="rounded-md border border-[#E8DFD3] p-3"
                data-material-id={m.id}
                data-order-status={m.order_status}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 text-sm font-medium text-[#2B1F17]">
                      <span>{m.name}</span>
                      {m.quantity && (
                        <span className="font-normal text-[#6B5D52]">
                          · {m.quantity}
                        </span>
                      )}
                      <MaterialStatusBadge status={m.order_status} />
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#6B5D52]">
                      <span>
                        Lead time: {m.lead_time_days}{' '}
                        {m.lead_time_days === 1 ? 'day' : 'days'}
                      </span>
                      {m.order_by_date && (
                        <span>Order by: {m.order_by_date}</span>
                      )}
                      {cost && <span>{cost}</span>}
                      {m.supplier_name && <span>· {m.supplier_name}</span>}
                    </div>
                    {m.notes && (
                      <p className="mt-1 whitespace-pre-wrap text-xs text-[#6B5D52]">
                        {m.notes}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {transition && (
                      <button
                        type="button"
                        aria-label={`${transition.label} — ${m.name}`}
                        onClick={() => handleAdvanceStatus(m)}
                        disabled={pending}
                        className="rounded border border-[#A8C49A] bg-[#EAF2E3] px-2 py-1 text-xs font-medium text-[#3E5A2E] hover:bg-[#DCE8D1] disabled:opacity-40"
                      >
                        {transition.label}
                      </button>
                    )}
                    <button
                      type="button"
                      aria-label={`Edit ${m.name}`}
                      onClick={() => handleOpenEdit(m)}
                      disabled={pending}
                      className="rounded px-2 py-1 text-xs text-[#2B1F17] hover:bg-[#FAF7F2] disabled:opacity-30"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      aria-label={`Delete ${m.name}`}
                      onClick={() => setDeleteTarget(m)}
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

      {isFormOpen && (
        <form
          onSubmit={handleSubmit}
          className="mt-4 rounded-md border border-[#E8DFD3] bg-[#FAF7F2] p-4"
          aria-label={mode === 'add' ? 'Add material' : 'Edit material'}
        >
          <h3 className="text-sm font-semibold text-[#2B1F17]">
            {mode === 'add' ? 'Add material' : 'Edit material'}
          </h3>

          <label className="mt-3 block text-xs font-medium text-[#2B1F17]">
            Name
            <input
              type="text"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              autoFocus
              maxLength={200}
              className={`mt-1 w-full rounded-md border bg-white px-3 py-2 text-sm ${
                formErrors.name ? 'border-red-400' : 'border-[#E8DFD3]'
              }`}
              aria-invalid={!!formErrors.name}
            />
          </label>
          {formErrors.name && (
            <p className="mt-1 text-xs text-red-700">{formErrors.name}</p>
          )}

          <div className="mt-3 grid grid-cols-2 gap-3">
            <label className="block text-xs font-medium text-[#2B1F17]">
              Quantity
              <input
                type="text"
                value={form.quantity}
                onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))}
                maxLength={80}
                placeholder="e.g. 40 pieces"
                className={`mt-1 w-full rounded-md border bg-white px-3 py-2 text-sm ${
                  formErrors.quantity ? 'border-red-400' : 'border-[#E8DFD3]'
                }`}
                aria-invalid={!!formErrors.quantity}
              />
            </label>

            <label className="block text-xs font-medium text-[#2B1F17]">
              Lead time (days)
              <input
                type="number"
                inputMode="numeric"
                min={0}
                step={1}
                value={form.lead_time_days}
                onChange={e =>
                  setForm(f => ({ ...f, lead_time_days: e.target.value }))
                }
                className={`mt-1 w-full rounded-md border bg-white px-3 py-2 text-sm ${
                  formErrors.lead_time_days ? 'border-red-400' : 'border-[#E8DFD3]'
                }`}
                aria-invalid={!!formErrors.lead_time_days}
              />
            </label>
          </div>
          {formErrors.quantity && (
            <p className="mt-1 text-xs text-red-700">{formErrors.quantity}</p>
          )}
          {formErrors.lead_time_days && (
            <p className="mt-1 text-xs text-red-700">{formErrors.lead_time_days}</p>
          )}

          <div className="mt-3 grid grid-cols-2 gap-3">
            <label className="block text-xs font-medium text-[#2B1F17]">
              Estimated cost (optional)
              <input
                type="text"
                inputMode="decimal"
                value={form.estimated_cost}
                onChange={e =>
                  setForm(f => ({ ...f, estimated_cost: e.target.value }))
                }
                placeholder="e.g. 1200.50"
                className={`mt-1 w-full rounded-md border bg-white px-3 py-2 text-sm ${
                  formErrors.estimated_cost ? 'border-red-400' : 'border-[#E8DFD3]'
                }`}
                aria-invalid={!!formErrors.estimated_cost}
              />
            </label>

            <label className="block text-xs font-medium text-[#2B1F17]">
              Supplier (optional)
              <input
                type="text"
                value={form.supplier_name}
                onChange={e =>
                  setForm(f => ({ ...f, supplier_name: e.target.value }))
                }
                maxLength={200}
                placeholder="e.g. Acme Lumber"
                className={`mt-1 w-full rounded-md border bg-white px-3 py-2 text-sm ${
                  formErrors.supplier_name ? 'border-red-400' : 'border-[#E8DFD3]'
                }`}
                aria-invalid={!!formErrors.supplier_name}
              />
            </label>
          </div>
          {formErrors.estimated_cost && (
            <p className="mt-1 text-xs text-red-700">{formErrors.estimated_cost}</p>
          )}
          {formErrors.supplier_name && (
            <p className="mt-1 text-xs text-red-700">{formErrors.supplier_name}</p>
          )}

          <label className="mt-3 block text-xs font-medium text-[#2B1F17]">
            Notes (optional)
            <textarea
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              rows={2}
              maxLength={2000}
              className="mt-1 w-full rounded-md border border-[#E8DFD3] bg-white px-3 py-2 text-sm"
            />
          </label>

          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={handleCancelForm}
              disabled={pending}
              className="rounded-md border border-[#E8DFD3] bg-white px-3 py-1.5 text-xs font-medium text-[#2B1F17] hover:bg-[#FAF7F2] disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saveDisabled}
              className="rounded-md bg-[#2B1F17] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#3A2A1E] disabled:opacity-50"
            >
              {pending ? 'Saving…' : mode === 'add' ? 'Save material' : 'Save changes'}
            </button>
          </div>
        </form>
      )}

      {deleteTarget && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Confirm delete material"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setDeleteTarget(null)}
        >
          <div
            onClick={e => e.stopPropagation()}
            className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl"
          >
            <h3 className="text-base font-semibold text-[#2B1F17]">
              Delete material?
            </h3>
            <p className="mt-2 text-sm text-[#6B5D52]">
              &ldquo;{deleteTarget.name}&rdquo; will be removed from this task.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
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
                {pending ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
