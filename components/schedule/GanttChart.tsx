'use client'

import { useMemo, useState } from 'react'
import {
  computeDateRange,
  computeTaskBars,
  computeDependencyArrows,
  daysBetween,
  type GanttTask,
  type GanttStage,
  type TaskBar,
  type DependencyArrow,
} from '@/lib/gantt/compute'

// ---------- constants ----------
const ROW_HEIGHT = 36
const STAGE_HEADER_HEIGHT = 32
const DAY_WIDTH = 28
const BAR_PADDING_Y = 4
const HEADER_HEIGHT = 48

type Props = {
  stages: GanttStage[]
  tasks: GanttTask[]
}

// ---------- sub-components ----------

function DateHeader({
  range,
  dayWidth,
}: {
  range: { startDate: string; totalDays: number }
  dayWidth: number
}) {
  const days: { label: string; dayOfMonth: number; isMonday: boolean }[] = []
  for (let i = 0; i < range.totalDays; i++) {
    const d = new Date(range.startDate + 'T00:00:00Z')
    d.setUTCDate(d.getUTCDate() + i)
    const dayOfMonth = d.getUTCDate()
    const isMonday = d.getUTCDay() === 1
    const label =
      dayOfMonth === 1 || i === 0
        ? d.toLocaleDateString('en-IE', { month: 'short', day: 'numeric', timeZone: 'UTC' })
        : String(dayOfMonth)
    days.push({ label, dayOfMonth, isMonday })
  }

  return (
    <div
      className="sticky top-0 z-10 flex border-b border-[#E8DFD3] bg-[#FAF7F2]"
      style={{ height: HEADER_HEIGHT }}
      data-testid="gantt-date-header"
    >
      {days.map((d, i) => (
        <div
          key={i}
          className={`flex shrink-0 items-end justify-center pb-1 text-[10px] text-[#6B5D52] ${
            d.isMonday ? 'border-l border-[#E8DFD3]' : ''
          }`}
          style={{ width: dayWidth }}
        >
          {d.label}
        </div>
      ))}
    </div>
  )
}

function TodayMarker({
  range,
  dayWidth,
  totalHeight,
}: {
  range: { startDate: string }
  dayWidth: number
  totalHeight: number
}) {
  const today = new Date().toISOString().slice(0, 10)
  const offset = daysBetween(range.startDate, today)
  if (offset < 0) return null

  return (
    <div
      className="pointer-events-none absolute z-20"
      style={{
        left: offset * dayWidth + dayWidth / 2,
        top: 0,
        width: 2,
        height: totalHeight,
        backgroundColor: '#B04A3C',
      }}
      data-testid="gantt-today-marker"
    >
      <span
        className="absolute -top-0.5 -translate-x-1/2 rounded bg-[#B04A3C] px-1 text-[9px] font-medium text-white"
        style={{ left: 1 }}
      >
        Today
      </span>
    </div>
  )
}

function TaskBarEl({ bar, dayWidth }: { bar: TaskBar; dayWidth: number }) {
  const left = bar.startDay * dayWidth
  const width = Math.max(bar.widthDays * dayWidth - 2, dayWidth * 0.5)
  const opacity = bar.isComplete ? 0.65 : 1

  return (
    <div
      className={`absolute flex items-center overflow-hidden rounded text-[10px] font-medium text-white ${
        bar.isDelayed ? 'ring-2 ring-red-500' : ''
      }`}
      style={{
        left,
        width,
        height: ROW_HEIGHT - BAR_PADDING_Y * 2,
        top: BAR_PADDING_Y,
        backgroundColor: bar.color,
        opacity,
      }}
      title={`${bar.taskName}${bar.isDelayed ? ` (+${bar.delayDays}d delay)` : ''}`}
      data-testid={`gantt-bar-${bar.taskId}`}
    >
      <span className="truncate px-1.5">
        {bar.isComplete && <span aria-label="Complete">✓ </span>}
        {bar.taskName}
      </span>
      {bar.isDelayed && (
        <span className="ml-auto shrink-0 pr-1 text-[9px] font-bold text-red-200">
          +{bar.delayDays}d
        </span>
      )}
    </div>
  )
}

function DependencyArrowsSvg({
  arrows,
  dayWidth,
  rowOffsets,
}: {
  arrows: DependencyArrow[]
  dayWidth: number
  rowOffsets: Map<number, number> // row -> y offset from grid top
}) {
  if (arrows.length === 0) return null

  return (
    <svg className="pointer-events-none absolute inset-0 z-10" data-testid="gantt-dependency-arrows">
      <defs>
        <marker
          id="arrowhead"
          markerWidth="8"
          markerHeight="6"
          refX="8"
          refY="3"
          orient="auto"
        >
          <path d="M 0 0 L 8 3 L 0 6 Z" fill="#6B5D52" />
        </marker>
      </defs>
      {arrows.map((arrow, i) => {
        const fromY = (rowOffsets.get(arrow.fromRow) ?? 0) + ROW_HEIGHT / 2
        const toY = (rowOffsets.get(arrow.toRow) ?? 0) + ROW_HEIGHT / 2
        const fromX = arrow.fromX * dayWidth
        const toX = arrow.toX * dayWidth

        // Simple right-angle path: horizontal from end, then vertical, then horizontal to start
        const midX = fromX + (toX - fromX) / 2
        const path = `M ${fromX} ${fromY} L ${midX} ${fromY} L ${midX} ${toY} L ${toX} ${toY}`

        return (
          <path
            key={i}
            d={path}
            fill="none"
            stroke="#6B5D52"
            strokeWidth={1.5}
            markerEnd="url(#arrowhead)"
            data-testid={`gantt-arrow-${arrow.fromTaskId}-${arrow.toTaskId}`}
          />
        )
      })}
    </svg>
  )
}

// ---------- Mobile view ----------

function MobileGanttView({ stages, tasks }: Props) {
  const [expandedStage, setExpandedStage] = useState<string | null>(null)
  const tasksByStage = useMemo(() => {
    const map = new Map<string, GanttTask[]>()
    for (const t of tasks) {
      const list = map.get(t.stage_id) ?? []
      list.push(t)
      map.set(t.stage_id, list)
    }
    // Sort within each stage
    for (const [, list] of map) {
      list.sort((a, b) => a.order_index - b.order_index)
    }
    return map
  }, [tasks])

  const range = useMemo(() => computeDateRange(tasks), [tasks])
  const allBars = useMemo(
    () => computeTaskBars(tasks, stages, range),
    [tasks, stages, range],
  )

  const sortedStages = [...stages].sort((a, b) => a.order_index - b.order_index)

  return (
    <div className="space-y-2" data-testid="gantt-mobile">
      {sortedStages.map(stage => {
        const isExpanded = expandedStage === stage.id
        const stageTasks = tasksByStage.get(stage.id) ?? []
        const stageRange = stageTasks.length > 0
          ? {
              start: stageTasks.reduce(
                (min, t) => (t.planned_start < min ? t.planned_start : min),
                stageTasks[0].planned_start,
              ),
              end: stageTasks.reduce(
                (max, t) => (t.planned_end > max ? t.planned_end : max),
                stageTasks[0].planned_end,
              ),
            }
          : null

        return (
          <div key={stage.id} className="rounded-lg border border-[#E8DFD3] bg-white">
            <button
              type="button"
              className="flex w-full items-center gap-3 p-3 text-left"
              onClick={() => setExpandedStage(isExpanded ? null : stage.id)}
              aria-expanded={isExpanded}
              data-testid={`gantt-mobile-stage-${stage.id}`}
            >
              <span
                className="h-6 w-1.5 shrink-0 rounded-full"
                style={{ backgroundColor: stage.color }}
              />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-[#2B1F17] truncate">{stage.name}</div>
                {stageRange && (
                  <div className="text-[10px] text-[#6B5D52]">
                    {stageRange.start} → {stageRange.end}
                  </div>
                )}
              </div>
              <span className="text-xs text-[#6B5D52]">
                {stageTasks.length} task{stageTasks.length !== 1 ? 's' : ''}
              </span>
              <span className="text-[#6B5D52]">{isExpanded ? '▾' : '▸'}</span>
            </button>

            {isExpanded && (
              <div className="overflow-x-auto border-t border-[#E8DFD3] p-2" data-testid={`gantt-mobile-tasks-${stage.id}`}>
                <div
                  className="relative"
                  style={{
                    width: range.totalDays * DAY_WIDTH,
                    minWidth: '100%',
                  }}
                >
                  {stageTasks.map((task, idx) => {
                    const bar = allBars.find(b => b.taskId === task.id)
                    if (!bar) return null
                    return (
                      <div
                        key={task.id}
                        className="relative"
                        style={{ height: ROW_HEIGHT }}
                      >
                        <TaskBarEl bar={{ ...bar, row: idx }} dayWidth={DAY_WIDTH} />
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ---------- Desktop view ----------

function DesktopGanttView({ stages, tasks }: Props) {
  const range = useMemo(() => computeDateRange(tasks), [tasks])
  const bars = useMemo(
    () => computeTaskBars(tasks, stages, range),
    [tasks, stages, range],
  )
  const arrows = useMemo(
    () => computeDependencyArrows(tasks, bars),
    [tasks, bars],
  )

  const sortedStages = [...stages].sort((a, b) => a.order_index - b.order_index)
  const tasksByStage = useMemo(() => {
    const map = new Map<string, GanttTask[]>()
    for (const t of tasks) {
      const list = map.get(t.stage_id) ?? []
      list.push(t)
      map.set(t.stage_id, list)
    }
    for (const [, list] of map) list.sort((a, b) => a.order_index - b.order_index)
    return map
  }, [tasks])

  // Compute row y-offsets for arrows
  const rowOffsets = useMemo(() => {
    const map = new Map<number, number>()
    let y = 0
    for (const stage of sortedStages) {
      y += STAGE_HEADER_HEIGHT // stage header
      const stageTasks = tasksByStage.get(stage.id) ?? []
      for (const task of stageTasks) {
        const bar = bars.find(b => b.taskId === task.id)
        if (bar) map.set(bar.row, y)
        y += ROW_HEIGHT
      }
    }
    return map
  }, [sortedStages, tasksByStage, bars])

  const chartWidth = range.totalDays * DAY_WIDTH
  // Total height: sum of stage headers + task rows
  let totalHeight = 0
  for (const stage of sortedStages) {
    totalHeight += STAGE_HEADER_HEIGHT
    totalHeight += (tasksByStage.get(stage.id) ?? []).length * ROW_HEIGHT
  }

  if (tasks.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-[#E8DFD3] bg-white p-8 text-center">
        <p className="text-sm text-[#6B5D52]">
          No tasks to display. Add tasks to your stages to see the Gantt chart.
        </p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-[#E8DFD3] bg-white" data-testid="gantt-desktop">
      <div style={{ width: chartWidth, minWidth: '100%' }} className="relative">
        <DateHeader range={range} dayWidth={DAY_WIDTH} />

        <div className="relative" style={{ height: totalHeight }}>
          <TodayMarker range={range} dayWidth={DAY_WIDTH} totalHeight={totalHeight} />
          <DependencyArrowsSvg arrows={arrows} dayWidth={DAY_WIDTH} rowOffsets={rowOffsets} />

          {/* Stage rows */}
          {sortedStages.map(stage => {
            const stageTasks = tasksByStage.get(stage.id) ?? []
            return (
              <div key={stage.id}>
                {/* Stage header */}
                <div
                  className="flex items-center gap-2 border-b border-[#F0EAE0] bg-[#FAF7F2] px-3"
                  style={{ height: STAGE_HEADER_HEIGHT }}
                  data-testid={`gantt-stage-header-${stage.id}`}
                >
                  <span
                    className="h-3 w-3 shrink-0 rounded-sm"
                    style={{ backgroundColor: stage.color }}
                  />
                  <span className="text-xs font-semibold text-[#2B1F17] truncate">
                    {stage.name}
                  </span>
                  <span className="text-[10px] text-[#6B5D52]">
                    {stageTasks.length} task{stageTasks.length !== 1 ? 's' : ''}
                  </span>
                </div>
                {/* Task rows */}
                {stageTasks.map(task => {
                  const bar = bars.find(b => b.taskId === task.id)
                  if (!bar) return null
                  return (
                    <div
                      key={task.id}
                      className="relative border-b border-[#F5F0EA]"
                      style={{ height: ROW_HEIGHT }}
                    >
                      <TaskBarEl bar={bar} dayWidth={DAY_WIDTH} />
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ---------- Main component ----------

export function GanttChart({ stages, tasks }: Props) {
  return (
    <>
      {/* Desktop: visible >= 1024px */}
      <div className="hidden lg:block" data-testid="gantt-chart">
        <DesktopGanttView stages={stages} tasks={tasks} />
      </div>

      {/* Mobile + Tablet (< 1024px): stages-only view with expand */}
      <div className="block lg:hidden" data-testid="gantt-mobile-wrapper">
        <p className="mb-2 hidden md:block text-xs text-[#6B5D52]">
          For the full Gantt chart view, use a wider screen.
        </p>
        <MobileGanttView stages={stages} tasks={tasks} />
      </div>
    </>
  )
}
