'use client'

import { useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import {
  filterMaterialsByStatus,
  materialDeadlineStatus,
  nextStatusTransition,
  type MaterialDeadlineInput,
  type MaterialOrderStatusValue,
  type MaterialStatusFilter,
} from '@/lib/materials/operations'
import {
  MaterialDeadlineBadge,
  MaterialStatusBadge,
} from '@/components/materials/MaterialDeadlineBadge'
import { updateMaterialStatus } from '@/app/actions/materials'

export type MaterialsListRow = {
  id: string
  name: string
  quantity: string | null
  lead_time_days: number
  order_by_date: string | null
  order_status: MaterialOrderStatusValue
  task: { id: string; name: string } | null
}

type Props = {
  materials: MaterialsListRow[]
  today: string
  projectId?: string
}

type Tab = { value: MaterialStatusFilter; label: string }

const TABS: Tab[] = [
  { value: 'all', label: 'All' },
  { value: 'not_quoted', label: 'Not Quoted' },
  { value: 'ordered', label: 'Ordered' },
  { value: 'delivered', label: 'Delivered' },
]

export function MaterialsListView({ materials, today, projectId }: Props) {
  const [filter, setFilter] = useState<MaterialStatusFilter>('all')

  const counts = useMemo(() => {
    return {
      all: materials.length,
      not_quoted: materials.filter(m => m.order_status === 'not_quoted').length,
      ordered: materials.filter(m => m.order_status === 'ordered').length,
      delivered: materials.filter(m => m.order_status === 'delivered').length,
    } as Record<MaterialStatusFilter, number>
  }, [materials])

  const visible = useMemo(
    () => filterMaterialsByStatus(materials, filter),
    [materials, filter]
  )

  return (
    <div>
      <div
        role="tablist"
        aria-label="Filter materials by status"
        className="mb-4 flex flex-wrap gap-1 rounded-lg border border-[#E8DFD3] bg-white p-1"
      >
        {TABS.map(tab => {
          const active = filter === tab.value
          return (
            <button
              key={tab.value}
              role="tab"
              type="button"
              aria-selected={active}
              data-testid={`materials-filter-${tab.value}`}
              onClick={() => setFilter(tab.value)}
              className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition ${
                active
                  ? 'bg-[#2B1F17] text-white'
                  : 'text-[#6B5D52] hover:bg-[#FAF7F2]'
              }`}
            >
              {tab.label}
              <span
                className={`ml-1.5 text-[10px] ${
                  active ? 'text-white/70' : 'text-[#9A8B7E]'
                }`}
              >
                {counts[tab.value]}
              </span>
            </button>
          )
        })}
      </div>

      {visible.length === 0 ? (
        <div className="rounded-lg border border-[#E8DFD3] bg-white p-6 text-center">
          <p className="text-sm text-[#6B5D52]">
            {materials.length === 0
              ? 'No materials yet. Add materials from any task detail screen.'
              : 'No materials match this filter.'}
          </p>
        </div>
      ) : (
        <ul className="space-y-2" data-testid="materials-list">
          {visible.map(m => {
            const deadline =
              m.order_status === 'not_quoted'
                ? materialDeadlineStatus(
                    {
                      id: m.id,
                      name: m.name,
                      order_by_date: m.order_by_date,
                      order_status: m.order_status,
                    } satisfies MaterialDeadlineInput,
                    today
                  )
                : null
            return (
              <MaterialRow
                key={m.id}
                material={m}
                deadline={deadline}
                projectId={projectId}
              />
            )
          })}
        </ul>
      )}
    </div>
  )
}

function MaterialRow({
  material: m,
  deadline,
  projectId,
}: {
  material: MaterialsListRow
  deadline: ReturnType<typeof materialDeadlineStatus>
  projectId?: string
}) {
  const [expanded, setExpanded] = useState(false)
  const [pending, startTransition] = useTransition()
  const [localStatus, setLocalStatus] = useState(m.order_status)
  const transition = nextStatusTransition(localStatus)

  function handleAdvance() {
    if (!transition || !projectId) return
    startTransition(async () => {
      const result = await updateMaterialStatus({
        projectId,
        materialId: m.id,
        nextStatus: transition.nextStatus,
      })
      if (result.ok) {
        setLocalStatus(transition.nextStatus)
      }
    })
  }

  return (
    <li
      data-material-id={m.id}
      data-order-status={localStatus}
      className="rounded-lg border border-[#E8DFD3] bg-white overflow-hidden"
    >
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 text-left hover:bg-[#F5F0E8] transition-colors"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-[#2B1F17]">
              {m.name}
            </p>
            {m.task && (
              <span className="text-xs text-[#6B5D52]">{m.task.name}</span>
            )}
          </div>
          {localStatus === 'not_quoted' ? (
            <MaterialDeadlineBadge badge={deadline} />
          ) : (
            <MaterialStatusBadge status={localStatus} />
          )}
        </div>
        <div className="mt-2 flex items-center gap-3 text-xs text-[#6B5D52]">
          {m.order_by_date && <span>Order by {m.order_by_date}</span>}
          <span>· {m.lead_time_days}d lead</span>
          {m.quantity && <span>· {m.quantity}</span>}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-[#E8DFD3] px-4 py-3 bg-[#FAF7F2] space-y-2">
          <div className="flex items-center gap-2">
            {transition && projectId && (
              <button
                type="button"
                onClick={handleAdvance}
                disabled={pending}
                className="rounded-md bg-[#8B5E3C] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#754C30] disabled:opacity-50"
              >
                {pending ? 'Updating…' : transition.label}
              </button>
            )}
            {m.task && (
              <Link
                href={`/tasks/${m.task.id}`}
                className="text-xs text-[#8B5E3C] hover:underline"
              >
                View substage →
              </Link>
            )}
          </div>
          {localStatus === 'delivered' && (
            <p className="text-xs text-[#5A8050] font-medium">Delivered</p>
          )}
        </div>
      )}
    </li>
  )
}
