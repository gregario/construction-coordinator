'use client'

import { useRouter } from 'next/navigation'
import { useTransition } from 'react'

export function RefreshButton() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  return (
    <button
      onClick={() => startTransition(() => router.refresh())}
      disabled={isPending}
      className="inline-flex items-center gap-1.5 rounded-md border border-[#E8DFD3] bg-white px-3 py-1.5 text-xs font-medium text-[#6B5D52] transition-colors hover:bg-[#FAF7F2] disabled:opacity-50"
      aria-label="Refresh briefing"
    >
      <svg
        className={`h-3.5 w-3.5 ${isPending ? 'animate-spin' : ''}`}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
        />
      </svg>
      {isPending ? 'Refreshing…' : 'Refresh'}
    </button>
  )
}
