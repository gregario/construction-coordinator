'use client'

import { useMemo, useState, useTransition } from 'react'
import {
  validateTradeInput,
  buildTradeDeleteWarning,
  formatTelHref,
  type TradeFormField,
} from '@/lib/trades/operations'
import { createTrade, updateTrade, deleteTrade } from '@/app/actions/trades'

export type TradeListItem = {
  id: string
  name: string
  specialty: string | null
  phone: string | null
  email: string | null
  notes: string | null
  assigned_task_count: number
}

type Props = {
  projectId: string
  initialTrades: TradeListItem[]
}

type FormValues = {
  name: string
  specialty: string
  phone: string
  email: string
  notes: string
}

const EMPTY_FORM: FormValues = {
  name: '',
  specialty: '',
  phone: '',
  email: '',
  notes: '',
}

export function TradesManager({ projectId, initialTrades }: Props) {
  const [trades, setTrades] = useState<TradeListItem[]>(initialTrades)
  const [pending, startTransition] = useTransition()
  const [mode, setMode] = useState<'none' | 'add' | { kind: 'edit'; id: string }>('none')
  const [form, setForm] = useState<FormValues>(EMPTY_FORM)
  const [formErrors, setFormErrors] =
    useState<Partial<Record<TradeFormField, string>>>({})
  const [serverError, setServerError] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<TradeListItem | null>(null)

  const sortedTrades = useMemo(
    () => [...trades].sort((a, b) => a.name.localeCompare(b.name)),
    [trades]
  )

  function resetForm() {
    setForm(EMPTY_FORM)
    setFormErrors({})
    setServerError(null)
  }

  function handleOpenAdd() {
    resetForm()
    setMode('add')
  }

  function handleOpenEdit(trade: TradeListItem) {
    setForm({
      name: trade.name,
      specialty: trade.specialty ?? '',
      phone: trade.phone ?? '',
      email: trade.email ?? '',
      notes: trade.notes ?? '',
    })
    setFormErrors({})
    setServerError(null)
    setMode({ kind: 'edit', id: trade.id })
  }

  function handleCancelForm() {
    setMode('none')
    resetForm()
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setServerError(null)
    const validated = validateTradeInput(form)
    setFormErrors(validated.errors)
    if (!validated.ok) return

    startTransition(async () => {
      if (mode === 'add') {
        const res = await createTrade({ projectId, ...form })
        if (!res.ok) {
          if (res.field) setFormErrors({ [res.field]: res.error })
          else setServerError(res.error)
          return
        }
        setTrades(prev => [
          ...prev,
          {
            id: res.trade.id,
            name: res.trade.name,
            specialty: res.trade.specialty,
            phone: res.trade.phone,
            email: res.trade.email,
            notes: res.trade.notes,
            assigned_task_count: 0,
          },
        ])
        setMode('none')
        resetForm()
      } else if (typeof mode === 'object' && mode.kind === 'edit') {
        const res = await updateTrade({ projectId, tradeId: mode.id, ...form })
        if (!res.ok) {
          if (res.field) setFormErrors({ [res.field]: res.error })
          else setServerError(res.error)
          return
        }
        setTrades(prev =>
          prev.map(t =>
            t.id === mode.id
              ? {
                  ...t,
                  name: res.trade.name,
                  specialty: res.trade.specialty,
                  phone: res.trade.phone,
                  email: res.trade.email,
                  notes: res.trade.notes,
                }
              : t
          )
        )
        setMode('none')
        resetForm()
      }
    })
  }

  function handleAttemptDelete(trade: TradeListItem) {
    setServerError(null)
    const warning = buildTradeDeleteWarning(trade.name, trade.assigned_task_count)
    if (!warning.requiresConfirmation) {
      // AC-TR-4: trades with zero assignments delete immediately.
      startTransition(async () => {
        const res = await deleteTrade(projectId, trade.id, true)
        if (!res.ok) {
          setServerError(res.error)
          return
        }
        setTrades(prev => prev.filter(t => t.id !== trade.id))
      })
      return
    }
    setDeleteTarget(trade)
  }

  function handleConfirmDelete() {
    if (!deleteTarget) return
    const targetId = deleteTarget.id
    startTransition(async () => {
      const res = await deleteTrade(projectId, targetId, true)
      if (!res.ok) {
        setServerError(res.error)
        return
      }
      setTrades(prev => prev.filter(t => t.id !== targetId))
      setDeleteTarget(null)
    })
  }

  const isFormOpen = mode === 'add' || (typeof mode === 'object' && mode.kind === 'edit')
  const deleteWarning = deleteTarget
    ? buildTradeDeleteWarning(deleteTarget.name, deleteTarget.assigned_task_count)
    : null

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-[#2B1F17]">Contacts</h2>
          <p className="text-xs text-[#6B5D52]">
            Subcontractors and tradespeople on this project.
          </p>
        </div>
        <button
          type="button"
          onClick={handleOpenAdd}
          disabled={pending || isFormOpen}
          className="rounded-md bg-[#2B1F17] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#3A2A1E] disabled:opacity-50"
        >
          + Add Trade
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

      {sortedTrades.length === 0 && !isFormOpen ? (
        <div className="rounded-lg border border-dashed border-[#E8DFD3] bg-white p-6 text-center">
          <p className="text-sm text-[#6B5D52]">
            No trade contacts yet. Add your first subcontractor.
          </p>
        </div>
      ) : (
        <ul className="space-y-2" data-testid="trade-list">
          {sortedTrades.map(trade => {
            const telHref = formatTelHref(trade.phone)
            return (
              <li
                key={trade.id}
                className="rounded-lg border border-[#E8DFD3] bg-white p-3"
                data-trade-id={trade.id}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-[#2B1F17]">{trade.name}</div>
                    {trade.specialty && (
                      <div className="mt-0.5 text-xs text-[#6B5D52]">{trade.specialty}</div>
                    )}
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                      {trade.phone && telHref && (
                        <a
                          href={telHref}
                          className="text-[#2B1F17] underline underline-offset-2"
                        >
                          {trade.phone}
                        </a>
                      )}
                      {trade.email && (
                        <a
                          href={`mailto:${trade.email}`}
                          className="text-[#2B1F17] underline underline-offset-2"
                        >
                          {trade.email}
                        </a>
                      )}
                      {trade.assigned_task_count > 0 && (
                        <span className="text-[#6B5D52]">
                          · {trade.assigned_task_count}{' '}
                          {trade.assigned_task_count === 1 ? 'task' : 'tasks'}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      aria-label={`Edit ${trade.name}`}
                      onClick={() => handleOpenEdit(trade)}
                      disabled={pending}
                      className="rounded px-2 py-1 text-xs text-[#2B1F17] hover:bg-[#FAF7F2] disabled:opacity-30"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      aria-label={`Delete ${trade.name}`}
                      onClick={() => handleAttemptDelete(trade)}
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
        <div
          role="dialog"
          aria-modal="true"
          aria-label={mode === 'add' ? 'Add trade' : 'Edit trade'}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={handleCancelForm}
        >
          <form
            onSubmit={handleSubmit}
            onClick={e => e.stopPropagation()}
            className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl"
          >
            <h3 className="text-base font-semibold text-[#2B1F17]">
              {mode === 'add' ? 'Add trade' : 'Edit trade'}
            </h3>

            <label className="mt-4 block text-xs font-medium text-[#2B1F17]">
              Name
              <input
                type="text"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
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
              Specialty (optional)
              <input
                type="text"
                value={form.specialty}
                onChange={e => setForm(f => ({ ...f, specialty: e.target.value }))}
                maxLength={80}
                placeholder="e.g. Framing, Plumbing, Electrical"
                className={`mt-1 w-full rounded-md border px-3 py-2 text-sm ${
                  formErrors.specialty ? 'border-red-400' : 'border-[#E8DFD3]'
                }`}
                aria-invalid={!!formErrors.specialty}
              />
            </label>
            {formErrors.specialty && (
              <p className="mt-1 text-xs text-red-700">{formErrors.specialty}</p>
            )}

            <label className="mt-3 block text-xs font-medium text-[#2B1F17]">
              Phone (optional)
              <input
                type="tel"
                value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                maxLength={40}
                placeholder="e.g. 087 123 4567"
                className={`mt-1 w-full rounded-md border px-3 py-2 text-sm ${
                  formErrors.phone ? 'border-red-400' : 'border-[#E8DFD3]'
                }`}
                aria-invalid={!!formErrors.phone}
              />
            </label>
            {formErrors.phone && (
              <p className="mt-1 text-xs text-red-700">{formErrors.phone}</p>
            )}

            <label className="mt-3 block text-xs font-medium text-[#2B1F17]">
              Email (optional)
              <input
                type="email"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                maxLength={200}
                placeholder="e.g. joe@example.com"
                className={`mt-1 w-full rounded-md border px-3 py-2 text-sm ${
                  formErrors.email ? 'border-red-400' : 'border-[#E8DFD3]'
                }`}
                aria-invalid={!!formErrors.email}
              />
            </label>
            {formErrors.email && (
              <p className="mt-1 text-xs text-red-700">{formErrors.email}</p>
            )}

            <label className="mt-3 block text-xs font-medium text-[#2B1F17]">
              Notes (optional)
              <textarea
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
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
                onClick={handleCancelForm}
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
                {pending ? 'Saving…' : mode === 'add' ? 'Save trade' : 'Save changes'}
              </button>
            </div>
          </form>
        </div>
      )}

      {deleteTarget && deleteWarning && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Confirm delete trade"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setDeleteTarget(null)}
        >
          <div
            onClick={e => e.stopPropagation()}
            className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl"
          >
            <h3 className="text-base font-semibold text-[#2B1F17]">Delete trade?</h3>
            <p className="mt-2 text-sm text-[#6B5D52]">{deleteWarning.message}</p>
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
                {pending ? 'Deleting…' : 'Delete and unassign'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
