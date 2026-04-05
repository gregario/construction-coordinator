import type {
  MaterialDeadlineBadge as BadgeKind,
  MaterialOrderStatusValue,
} from '@/lib/materials/operations'

type Props = { badge: BadgeKind | null }

// AC-OB-2 / AC-OB-3: overdue (red) / due_soon (amber) pill.
export function MaterialDeadlineBadge({ badge }: Props) {
  if (!badge) return null
  if (badge === 'overdue') {
    return (
      <span
        data-testid="material-badge-overdue"
        className="inline-flex items-center rounded-full border border-[#E8B4A8] bg-[#FBE4DF] px-2 py-0.5 text-xs font-medium text-[#8B2E1F]"
      >
        overdue
      </span>
    )
  }
  return (
    <span
      data-testid="material-badge-due-soon"
      className="inline-flex items-center rounded-full border border-[#E8C78F] bg-[#FBF0D6] px-2 py-0.5 text-xs font-medium text-[#7A5212]"
    >
      due soon
    </span>
  )
}

// AC-MS-1 / AC-MS-2: ordered (green outline) / delivered (solid green) pills.
// Shown in place of the deadline badge once a material leaves not_ordered.
export function MaterialStatusBadge({
  status,
}: {
  status: MaterialOrderStatusValue
}) {
  if (status === 'ordered') {
    return (
      <span
        data-testid="material-badge-ordered"
        className="inline-flex items-center rounded-full border border-[#A8C49A] bg-[#EAF2E3] px-2 py-0.5 text-xs font-medium text-[#3E5A2E]"
      >
        ordered
      </span>
    )
  }
  if (status === 'delivered') {
    return (
      <span
        data-testid="material-badge-delivered"
        className="inline-flex items-center rounded-full border border-[#3E5A2E] bg-[#3E5A2E] px-2 py-0.5 text-xs font-medium text-white"
      >
        delivered
      </span>
    )
  }
  return null
}
