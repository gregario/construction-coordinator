'use client'

import { useState, useTransition } from 'react'
import { assignTradeToTask } from '@/app/actions/trades'
import { formatTelHref } from '@/lib/trades/operations'

export type AssignableTrade = {
  id: string
  name: string
  phone: string | null
}

type Props = {
  projectId: string
  taskId: string
  trades: AssignableTrade[]
  initialTradeId: string | null
}

export function TaskTradeAssigner({
  projectId,
  taskId,
  trades,
  initialTradeId,
}: Props) {
  const [tradeId, setTradeId] = useState<string | null>(initialTradeId)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const assigned = tradeId ? trades.find(t => t.id === tradeId) ?? null : null
  const telHref = assigned ? formatTelHref(assigned.phone) : null

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value || null
    const previous = tradeId
    setTradeId(next)
    setError(null)
    startTransition(async () => {
      const res = await assignTradeToTask({ projectId, taskId, tradeId: next })
      if (!res.ok) {
        setError(res.error)
        setTradeId(previous)
      }
    })
  }

  return (
    <section className="mt-6 rounded-lg border border-[#E8DFD3] bg-white p-4">
      <h2 className="text-sm font-semibold text-[#2B1F17]">Trade</h2>

      <label className="mt-3 block text-xs font-medium text-[#2B1F17]">
        Assigned trade
        <select
          value={tradeId ?? ''}
          onChange={handleChange}
          disabled={pending}
          className="mt-1 w-full rounded-md border border-[#E8DFD3] px-3 py-2 text-sm disabled:opacity-50"
        >
          <option value="">— Unassigned —</option>
          {trades.map(t => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </label>

      {error && (
        <p role="alert" className="mt-2 text-xs text-red-700">
          {error}
        </p>
      )}

      {assigned && (
        <div className="mt-3 text-xs text-[#6B5D52]">
          <div data-testid="assigned-trade-name" className="text-sm text-[#2B1F17]">
            {assigned.name}
          </div>
          {assigned.phone && telHref ? (
            <a
              href={telHref}
              data-testid="trade-tap-to-call"
              className="mt-1 inline-block text-[#2B1F17] underline underline-offset-2"
            >
              {assigned.phone}
            </a>
          ) : assigned.phone ? (
            <div className="mt-1">{assigned.phone}</div>
          ) : null}
        </div>
      )}
    </section>
  )
}
