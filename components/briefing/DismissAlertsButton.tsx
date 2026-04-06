'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { dismissShiftAlerts } from '@/app/actions/briefing'

export function DismissAlertsButton({ projectId }: { projectId: string }) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleClear() {
    startTransition(async () => {
      await dismissShiftAlerts(projectId)
      router.refresh()
    })
  }

  return (
    <button
      type="button"
      onClick={handleClear}
      disabled={isPending}
      className="text-xs font-medium text-[#8B5E3C] hover:underline underline-offset-2 disabled:opacity-50"
      data-testid="dismiss-alerts-btn"
    >
      {isPending ? 'Clearing…' : 'Clear'}
    </button>
  )
}
