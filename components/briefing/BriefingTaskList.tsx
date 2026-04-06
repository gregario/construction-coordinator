'use client'

import { useState, useTransition, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toggleTaskComplete } from '@/app/actions/briefing'
import type { TaskStatus } from '@/types/database'

export type BriefingTaskItem = {
  id: string
  name: string
  planned_start: string
  planned_end: string
  status: TaskStatus
  stage_name: string
  stage_color: string
}

type QuickActionsState = {
  taskId: string
  x: number
  y: number
} | null

export function BriefingTaskList({
  tasks,
  projectId,
}: {
  tasks: BriefingTaskItem[]
  projectId: string
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [optimisticStatuses, setOptimisticStatuses] = useState<
    Record<string, TaskStatus>
  >({})
  const [quickActions, setQuickActions] = useState<QuickActionsState>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  // Swipe tracking
  const touchStartX = useRef<Record<string, number>>({})
  const [swipedTaskId, setSwipedTaskId] = useState<string | null>(null)

  // Close quick actions on outside click
  useEffect(() => {
    if (!quickActions) return
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setQuickActions(null)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [quickActions])

  // Close swipe on outside tap
  useEffect(() => {
    if (!swipedTaskId) return
    function handleTouch() {
      setSwipedTaskId(null)
    }
    // Delay to avoid closing on the same touch that opened it
    const id = setTimeout(() => {
      document.addEventListener('touchstart', handleTouch, { once: true })
    }, 100)
    return () => {
      clearTimeout(id)
      document.removeEventListener('touchstart', handleTouch)
    }
  }, [swipedTaskId])

  const handleToggle = useCallback(
    (taskId: string, currentStatus: TaskStatus) => {
      // Optimistic update
      const newStatus: TaskStatus =
        currentStatus === 'complete' ? 'in_progress' : 'complete'
      setOptimisticStatuses((prev) => ({ ...prev, [taskId]: newStatus }))

      startTransition(async () => {
        const result = await toggleTaskComplete(projectId, taskId)
        if (result.ok) {
          // AC-QA-4: refresh RSC data in place without full reload
          router.refresh()
        }
        // Clear optimistic state — server truth takes over via RSC refresh
        setOptimisticStatuses((prev) => {
          const next = { ...prev }
          delete next[taskId]
          return next
        })
      })
    },
    [projectId, router, startTransition]
  )

  const handleKebab = useCallback(
    (e: React.MouseEvent, taskId: string) => {
      e.preventDefault()
      e.stopPropagation()
      if (quickActions?.taskId === taskId) {
        setQuickActions(null)
      } else {
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
        setQuickActions({
          taskId,
          x: rect.right,
          y: rect.bottom + 4,
        })
      }
    },
    [quickActions]
  )

  // AC-QA-3: Swipe left on mobile to reveal quick actions
  const handleTouchStart = useCallback(
    (e: React.TouchEvent, taskId: string) => {
      touchStartX.current[taskId] = e.touches[0].clientX
    },
    []
  )

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent, taskId: string) => {
      const startX = touchStartX.current[taskId]
      if (startX === undefined) return
      const endX = e.changedTouches[0].clientX
      const delta = startX - endX
      // Swipe left threshold: 60px
      if (delta > 60) {
        setSwipedTaskId(taskId)
        setQuickActions(null)
      } else if (delta < -60 && swipedTaskId === taskId) {
        // Swipe right to close
        setSwipedTaskId(null)
      }
      delete touchStartX.current[taskId]
    },
    [swipedTaskId]
  )

  return (
    <ul className="space-y-2">
      {tasks.map((t) => {
        const displayStatus = optimisticStatuses[t.id] ?? t.status
        const isComplete = displayStatus === 'complete'
        const isSwiped = swipedTaskId === t.id

        return (
          <li
            key={t.id}
            className="relative overflow-hidden rounded-md border border-[#EFE8DD]"
            onTouchStart={(e) => handleTouchStart(e, t.id)}
            onTouchEnd={(e) => handleTouchEnd(e, t.id)}
          >
            <div
              className="flex items-center gap-3 bg-[#FAF7F2] p-3 transition-transform duration-200"
              style={{
                transform: isSwiped ? 'translateX(-160px)' : 'translateX(0)',
              }}
            >
              {/* AC-QA-1 + AC-QA-2: Checkbox toggle */}
              <button
                onClick={() => handleToggle(t.id, displayStatus)}
                disabled={isPending}
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-colors ${
                  isComplete
                    ? 'border-[#87A96B] bg-[#87A96B] text-white'
                    : 'border-[#C4B8A8] bg-white hover:border-[#8B5E3C]'
                } disabled:opacity-50`}
                aria-label={
                  isComplete
                    ? `Mark ${t.name} as incomplete`
                    : `Mark ${t.name} as complete`
                }
              >
                {isComplete && (
                  <svg
                    className="h-3 w-3"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={3}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                )}
              </button>

              {/* Stage color dot */}
              <span
                className="h-3 w-3 shrink-0 rounded-full"
                style={{ backgroundColor: t.stage_color }}
                title={t.stage_name}
              />

              {/* Task info */}
              <div className="min-w-0 flex-1">
                <Link
                  href={`/tasks/${t.id}`}
                  className={`block truncate text-sm font-medium underline-offset-2 hover:underline ${
                    isComplete
                      ? 'text-[#A09585] line-through'
                      : 'text-[#2B1F17]'
                  }`}
                >
                  {t.name}
                </Link>
                <p className="mt-0.5 text-xs text-[#6B5D52]">
                  {t.stage_name}
                  {' · '}
                  {isComplete
                    ? 'Complete'
                    : displayStatus === 'in_progress'
                      ? 'In progress'
                      : 'Not started'}
                </p>
              </div>

              {/* AC-QA-3: Kebab menu (desktop) */}
              <button
                onClick={(e) => handleKebab(e, t.id)}
                className="hidden shrink-0 rounded p-1 text-[#6B5D52] transition-colors hover:bg-[#EFE8DD] md:block"
                aria-label={`Quick actions for ${t.name}`}
              >
                <svg
                  className="h-4 w-4"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <circle cx="12" cy="5" r="2" />
                  <circle cx="12" cy="12" r="2" />
                  <circle cx="12" cy="19" r="2" />
                </svg>
              </button>
            </div>

            {/* AC-QA-3: Swipe-revealed actions (mobile) */}
            {isSwiped && (
              <div
                className="absolute right-0 top-0 flex h-full items-stretch md:hidden"
                style={{ width: '160px' }}
              >
                <Link
                  href={`/tasks/${t.id}`}
                  className="flex flex-1 items-center justify-center bg-[#8B5E3C] text-xs font-medium text-white"
                >
                  Detail
                </Link>
                <Link
                  href={`/tasks/${t.id}#delay`}
                  className="flex flex-1 items-center justify-center bg-[#D4A355] text-xs font-medium text-white"
                >
                  Log Delay
                </Link>
                <Link
                  href={`/tasks/${t.id}#notes`}
                  className="flex flex-1 items-center justify-center bg-[#87A96B] text-xs font-medium text-white"
                >
                  Add Note
                </Link>
              </div>
            )}

            {/* AC-QA-3: Desktop dropdown menu */}
            {quickActions?.taskId === t.id && (
              <div
                ref={menuRef}
                className="absolute right-2 top-full z-10 mt-1 hidden w-40 rounded-md border border-[#E8DFD3] bg-white py-1 shadow-md md:block"
              >
                <Link
                  href={`/tasks/${t.id}`}
                  className="block px-3 py-2 text-sm text-[#2B1F17] hover:bg-[#FAF7F2]"
                  onClick={() => setQuickActions(null)}
                >
                  View Detail
                </Link>
                <Link
                  href={`/tasks/${t.id}#delay`}
                  className="block px-3 py-2 text-sm text-[#2B1F17] hover:bg-[#FAF7F2]"
                  onClick={() => setQuickActions(null)}
                >
                  Log Delay
                </Link>
                <Link
                  href={`/tasks/${t.id}#notes`}
                  className="block px-3 py-2 text-sm text-[#2B1F17] hover:bg-[#FAF7F2]"
                  onClick={() => setQuickActions(null)}
                >
                  Add Note
                </Link>
              </div>
            )}
          </li>
        )
      })}
    </ul>
  )
}
