'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { MaterialDeadlineBadge } from '@/components/materials/MaterialDeadlineBadge'
import { updateMaterialStatus } from '@/app/actions/materials'
import type { MaterialDeadlineBadge as BadgeKind } from '@/lib/materials/operations'

export type UpcomingOrderCard = {
  id: string
  name: string
  order_by_date: string | null
  task_id: string
  task_name: string
  days_remaining: number | null
  badge: BadgeKind | null
  supplier_name: string | null
  quantity: string | null
  estimated_cost_formatted: string | null
  lead_time_days: number
  notes: string | null
}

type Props = {
  cards: UpcomingOrderCard[]
  projectId: string
}

function daysLabel(days: number | null): string {
  if (days === null) return ''
  if (days < 0) return `${Math.abs(days)}d overdue`
  if (days === 0) return 'Due today'
  return `${days}d left`
}

export function UpcomingOrderCards({ cards, projectId }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  function toggle(id: string) {
    setExpandedId((prev) => (prev === id ? null : id))
  }

  function handleMarkOrdered(materialId: string) {
    startTransition(async () => {
      await updateMaterialStatus({
        projectId,
        materialId,
        nextStatus: 'ordered',
      })
      router.refresh()
    })
  }

  return (
    <>
      {/* AC-UO-1: horizontal scroll on mobile, grid on desktop */}
      <div className="flex gap-3 overflow-x-auto pb-2 md:grid md:grid-cols-2 md:overflow-x-visible lg:grid-cols-3">
        {cards.map((card) => {
          const isExpanded = expandedId === card.id
          return (
            <div
              key={card.id}
              className="min-w-[220px] shrink-0 md:min-w-0 md:shrink"
            >
              {/* AC-UO-2: card summary — name, task, days remaining, supplier */}
              <button
                type="button"
                onClick={() => toggle(card.id)}
                className="w-full rounded-lg border border-[#EFE8DD] bg-[#FAF7F2] p-3 text-left transition-colors hover:border-[#D4A355]"
                aria-expanded={isExpanded}
                data-testid={`order-card-${card.id}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="truncate text-sm font-medium text-[#2B1F17]">
                    {card.name}
                  </p>
                  <MaterialDeadlineBadge badge={card.badge} />
                </div>
                <p className="mt-1 truncate text-xs text-[#6B5D52]">
                  {card.task_name}
                </p>
                <div className="mt-1 flex items-center gap-2 text-xs text-[#6B5D52]">
                  {card.days_remaining !== null && (
                    <span
                      className={
                        card.days_remaining < 0
                          ? 'font-medium text-[#8B2E1F]'
                          : card.days_remaining <= 2
                            ? 'font-medium text-[#7A5212]'
                            : ''
                      }
                    >
                      {daysLabel(card.days_remaining)}
                    </span>
                  )}
                  {card.supplier_name && (
                    <>
                      {card.days_remaining !== null && <span>·</span>}
                      <span className="truncate">{card.supplier_name}</span>
                    </>
                  )}
                </div>
              </button>

              {/* AC-UO-3: expanded detail */}
              {isExpanded && (
                <div
                  className="mt-1 rounded-b-lg border border-t-0 border-[#EFE8DD] bg-white p-3"
                  data-testid={`order-detail-${card.id}`}
                >
                  <dl className="space-y-1 text-xs text-[#6B5D52]">
                    {card.quantity && (
                      <div className="flex justify-between">
                        <dt>Quantity</dt>
                        <dd className="font-medium text-[#2B1F17]">
                          {card.quantity}
                        </dd>
                      </div>
                    )}
                    {card.estimated_cost_formatted && (
                      <div className="flex justify-between">
                        <dt>Est. cost</dt>
                        <dd className="font-medium text-[#2B1F17]">
                          {card.estimated_cost_formatted}
                        </dd>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <dt>Lead time</dt>
                      <dd className="font-medium text-[#2B1F17]">
                        {card.lead_time_days} day{card.lead_time_days !== 1 ? 's' : ''}
                      </dd>
                    </div>
                    {card.notes && (
                      <div className="pt-1">
                        <dt className="sr-only">Notes</dt>
                        <dd className="text-[#6B5D52]">{card.notes}</dd>
                      </div>
                    )}
                  </dl>
                  <button
                    type="button"
                    onClick={() => handleMarkOrdered(card.id)}
                    disabled={pending}
                    className="mt-3 w-full rounded-md border border-[#A8C49A] bg-[#EAF2E3] px-3 py-1.5 text-xs font-medium text-[#3E5A2E] transition-colors hover:bg-[#D8E8CE] disabled:opacity-50"
                    data-testid={`mark-ordered-${card.id}`}
                  >
                    {pending ? 'Updating...' : 'Mark Ordered'}
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </>
  )
}
