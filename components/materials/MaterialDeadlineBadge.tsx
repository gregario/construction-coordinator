import type { MaterialDeadlineBadge as BadgeKind } from '@/lib/materials/operations'

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
