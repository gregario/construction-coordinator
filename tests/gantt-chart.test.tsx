import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { GanttChart } from '@/components/schedule/GanttChart'
import type { GanttStage, GanttTask } from '@/lib/gantt/compute'

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

// Mock server actions (they import createClient which doesn't exist in test env)
vi.mock('@/app/actions/tasks', () => ({
  updateTaskDuration: vi.fn(async () => ({ ok: true })),
  moveTaskDates: vi.fn(async () => ({ ok: true })),
}))

// ---------- helpers ----------
function makeStage(overrides: Partial<GanttStage> = {}): GanttStage {
  return {
    id: 'stage-1',
    name: 'Foundations',
    color: '#8B5E3C',
    order_index: 0,
    ...overrides,
  }
}

function makeTask(overrides: Partial<GanttTask> = {}): GanttTask {
  return {
    id: 'task-1',
    stage_id: 'stage-1',
    name: 'Pour concrete',
    planned_start: '2026-04-01',
    planned_end: '2026-04-05',
    duration_days: 5,
    status: 'not_started',
    actual_end: null,
    order_index: 0,
    depends_on: [],
    ...overrides,
  }
}

const defaultStages: GanttStage[] = [
  makeStage({ id: 'stage-1', name: 'Foundations', color: '#8B5E3C', order_index: 0 }),
  makeStage({ id: 'stage-2', name: 'Frame', color: '#6B8F3F', order_index: 1 }),
]

const defaultTasks: GanttTask[] = [
  makeTask({ id: 'task-1', stage_id: 'stage-1', name: 'Excavation', order_index: 0 }),
  makeTask({ id: 'task-2', stage_id: 'stage-1', name: 'Pour footings', order_index: 1,
    planned_start: '2026-04-06', planned_end: '2026-04-10', duration_days: 5 }),
  makeTask({ id: 'task-3', stage_id: 'stage-2', name: 'Erect walls', order_index: 0,
    planned_start: '2026-04-11', planned_end: '2026-04-18', duration_days: 8,
    depends_on: ['task-2'] }),
]

// @criterion: AC-GR-1
describe('GanttChart desktop rendering — AC-GR-1', () => {
  it('renders a Gantt chart container with time axis and stage groups', () => {
    render(<GanttChart stages={defaultStages} tasks={defaultTasks} />)

    // Desktop view should exist (hidden via CSS on mobile, but in DOM)
    expect(screen.getByTestId('gantt-chart')).toBeInTheDocument()
    expect(screen.getByTestId('gantt-desktop')).toBeInTheDocument()
    expect(screen.getByTestId('gantt-date-header')).toBeInTheDocument()
  })

  it('renders stage headers with stage name', () => {
    render(<GanttChart stages={defaultStages} tasks={defaultTasks} />)

    expect(screen.getByTestId('gantt-stage-header-stage-1')).toBeInTheDocument()
    expect(screen.getByTestId('gantt-stage-header-stage-2')).toBeInTheDocument()
  })
})

// @criterion: AC-GR-2
describe('GanttChart task bars — AC-GR-2', () => {
  it('renders task bars colored by stage', () => {
    render(<GanttChart stages={defaultStages} tasks={defaultTasks} />)

    const bar1 = screen.getByTestId('gantt-bar-task-1')
    const bar3 = screen.getByTestId('gantt-bar-task-3')
    expect(bar1.style.backgroundColor).toBe('rgb(139, 94, 60)') // #8B5E3C
    expect(bar3.style.backgroundColor).toBe('rgb(107, 143, 63)') // #6B8F3F
  })

  it('shows task names on bars', () => {
    render(<GanttChart stages={defaultStages} tasks={defaultTasks} />)

    expect(screen.getByTestId('gantt-bar-task-1')).toHaveTextContent('Excavation')
    expect(screen.getByTestId('gantt-bar-task-3')).toHaveTextContent('Erect walls')
  })
})

// @criterion: AC-GR-3
describe('GanttChart dependency arrows — AC-GR-3', () => {
  it('renders SVG dependency arrows', () => {
    render(<GanttChart stages={defaultStages} tasks={defaultTasks} />)

    expect(screen.getByTestId('gantt-dependency-arrows')).toBeInTheDocument()
    expect(screen.getByTestId('gantt-arrow-task-2-task-3')).toBeInTheDocument()
  })
})

// @criterion: AC-GR-4
describe('GanttChart completed tasks — AC-GR-4', () => {
  it('renders completed task with checkmark and desaturated opacity', () => {
    const tasks = [
      makeTask({ status: 'complete', actual_end: '2026-04-04' }),
    ]
    render(<GanttChart stages={[defaultStages[0]]} tasks={tasks} />)

    const bar = screen.getByTestId('gantt-bar-task-1')
    expect(bar).toHaveTextContent('✓')
    expect(bar.style.opacity).toBe('0.65')
  })
})

// @criterion: AC-GR-5
describe('GanttChart delayed tasks — AC-GR-5', () => {
  it('renders delayed task with red outline and delay days', () => {
    const tasks = [
      makeTask({
        status: 'delayed',
        planned_end: '2026-04-05',
        actual_end: '2026-04-08',
      }),
    ]
    render(<GanttChart stages={[defaultStages[0]]} tasks={tasks} />)

    const bar = screen.getByTestId('gantt-bar-task-1')
    expect(bar.className).toContain('ring-red-500')
    expect(bar).toHaveTextContent('+3d')
  })
})

// @criterion: AC-GR-6
describe('GanttChart mobile view — AC-GR-6', () => {
  it('renders stages-only view with expandable stages', () => {
    render(<GanttChart stages={defaultStages} tasks={defaultTasks} />)

    const mobileView = screen.getByTestId('gantt-mobile')
    expect(mobileView).toBeInTheDocument()

    // Stage buttons should be present
    const stageBtn = screen.getByTestId('gantt-mobile-stage-stage-1')
    expect(stageBtn).toBeInTheDocument()
    expect(stageBtn).toHaveAttribute('aria-expanded', 'false')
  })

  it('expands to show tasks when stage is tapped', () => {
    render(<GanttChart stages={defaultStages} tasks={defaultTasks} />)

    const stageBtn = screen.getByTestId('gantt-mobile-stage-stage-1')
    fireEvent.click(stageBtn)

    expect(stageBtn).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByTestId('gantt-mobile-tasks-stage-1')).toBeInTheDocument()
  })

  it('collapses tasks when tapped again', () => {
    render(<GanttChart stages={defaultStages} tasks={defaultTasks} />)

    const stageBtn = screen.getByTestId('gantt-mobile-stage-stage-1')
    fireEvent.click(stageBtn) // expand
    fireEvent.click(stageBtn) // collapse

    expect(stageBtn).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByTestId('gantt-mobile-tasks-stage-1')).not.toBeInTheDocument()
  })
})

// @criterion: AC-GR-1 (empty state)
describe('GanttChart empty state', () => {
  it('shows empty message when no tasks', () => {
    render(<GanttChart stages={defaultStages} tasks={[]} />)

    expect(screen.getByText(/No tasks to display/)).toBeInTheDocument()
  })
})

// @criterion: AC-GZ-1
describe('GanttChart zoom controls — AC-GZ-1', () => {
  it('renders Week, Month, Full zoom buttons', () => {
    render(<GanttChart stages={defaultStages} tasks={defaultTasks} />)

    expect(screen.getByTestId('gantt-zoom-week')).toBeInTheDocument()
    expect(screen.getByTestId('gantt-zoom-month')).toBeInTheDocument()
    expect(screen.getByTestId('gantt-zoom-full')).toBeInTheDocument()
  })

  it('Week button is active by default', () => {
    render(<GanttChart stages={defaultStages} tasks={defaultTasks} />)

    const weekBtn = screen.getByTestId('gantt-zoom-week')
    expect(weekBtn.getAttribute('aria-pressed')).toBe('true')
  })

  it('clicking Month button changes the active zoom level', () => {
    render(<GanttChart stages={defaultStages} tasks={defaultTasks} />)

    const monthBtn = screen.getByTestId('gantt-zoom-month')
    fireEvent.click(monthBtn)

    expect(monthBtn.getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByTestId('gantt-zoom-week').getAttribute('aria-pressed')).toBe('false')
  })

  it('zoom changes the chart width (month narrower than week)', () => {
    render(<GanttChart stages={defaultStages} tasks={defaultTasks} />)

    const chartContainer = screen.getByTestId('gantt-desktop')
    const weekWidth = chartContainer.firstElementChild!.getAttribute('style')

    fireEvent.click(screen.getByTestId('gantt-zoom-month'))
    const monthWidth = chartContainer.firstElementChild!.getAttribute('style')

    // Month zoom should produce a different (narrower) width
    expect(monthWidth).not.toBe(weekWidth)
  })
})

// @criterion: AC-GZ-2
describe('GanttChart today marker — AC-GZ-2', () => {
  it('renders today marker with "Today" label', () => {
    render(<GanttChart stages={defaultStages} tasks={defaultTasks} />)

    const marker = screen.getByTestId('gantt-today-marker')
    expect(marker).toBeInTheDocument()
    expect(marker).toHaveTextContent('Today')
  })
})

// @criterion: AC-GZ-3
describe('GanttChart horizontal scroll — AC-GZ-3', () => {
  it('desktop container has overflow-x-auto for native scroll', () => {
    render(<GanttChart stages={defaultStages} tasks={defaultTasks} />)

    const container = screen.getByTestId('gantt-desktop')
    expect(container.className).toContain('overflow-x-auto')
  })
})

// @criterion: AC-GZ-4
describe('GanttChart jump to today — AC-GZ-4', () => {
  it('renders a Jump to Today button', () => {
    render(<GanttChart stages={defaultStages} tasks={defaultTasks} />)

    expect(screen.getByTestId('gantt-jump-today')).toBeInTheDocument()
    expect(screen.getByTestId('gantt-jump-today')).toHaveTextContent(/today/i)
  })
})

// @criterion: AC-GE-1
describe('GanttChart resize handle — AC-GE-1', () => {
  it('renders resize handle on each task bar when projectId is provided', () => {
    render(
      <GanttChart stages={defaultStages} tasks={defaultTasks} projectId="proj-1" />
    )

    expect(screen.getByTestId('gantt-resize-handle-task-1')).toBeInTheDocument()
    expect(screen.getByTestId('gantt-resize-handle-task-2')).toBeInTheDocument()
    expect(screen.getByTestId('gantt-resize-handle-task-3')).toBeInTheDocument()
  })

  it('resize handle has ew-resize cursor', () => {
    render(
      <GanttChart stages={defaultStages} tasks={defaultTasks} projectId="proj-1" />
    )

    const handle = screen.getByTestId('gantt-resize-handle-task-1')
    expect(handle.style.cursor || handle.className).toContain('ew-resize')
  })
})

// @criterion: AC-GE-3
describe('GanttChart click → detail panel — AC-GE-3', () => {
  const taskDetails = {
    'task-1': { tradeName: 'Concrete Ltd', materials: [{ id: 'm1', name: 'Portland Cement' }] },
    'task-2': { tradeName: null, materials: [] },
    'task-3': { tradeName: null, materials: [] },
  }

  it('opens task detail panel when a task bar is clicked (mousedown+mouseup without drag)', () => {
    render(
      <GanttChart
        stages={defaultStages}
        tasks={defaultTasks}
        projectId="proj-1"
        taskDetails={taskDetails}
      />
    )

    const bar = screen.getByTestId('gantt-bar-task-1')
    // Simulate a click: mousedown then immediate mouseup without moving
    fireEvent.mouseDown(bar, { clientX: 100 })
    fireEvent.mouseUp(document)

    expect(screen.getByTestId('task-detail-panel')).toBeInTheDocument()
    expect(screen.getByTestId('task-detail-name')).toHaveTextContent('Excavation')
  })

  it('shows task dates and duration in detail panel', () => {
    render(
      <GanttChart
        stages={defaultStages}
        tasks={defaultTasks}
        projectId="proj-1"
        taskDetails={taskDetails}
      />
    )

    const bar = screen.getByTestId('gantt-bar-task-1')
    fireEvent.mouseDown(bar, { clientX: 100 })
    fireEvent.mouseUp(document)

    expect(screen.getByTestId('task-detail-duration')).toHaveTextContent('5 days')
  })

  it('shows trade and materials in detail panel', () => {
    render(
      <GanttChart
        stages={defaultStages}
        tasks={defaultTasks}
        projectId="proj-1"
        taskDetails={taskDetails}
      />
    )

    const bar = screen.getByTestId('gantt-bar-task-1')
    fireEvent.mouseDown(bar, { clientX: 100 })
    fireEvent.mouseUp(document)

    expect(screen.getByTestId('task-detail-trade')).toHaveTextContent('Concrete Ltd')
    expect(screen.getByTestId('task-detail-materials')).toBeInTheDocument()
    expect(screen.getByText('Portland Cement')).toBeInTheDocument()
  })

  it('closes detail panel when close button is clicked', () => {
    render(
      <GanttChart
        stages={defaultStages}
        tasks={defaultTasks}
        projectId="proj-1"
        taskDetails={taskDetails}
      />
    )

    const bar = screen.getByTestId('gantt-bar-task-1')
    fireEvent.mouseDown(bar, { clientX: 100 })
    fireEvent.mouseUp(document)

    expect(screen.getByTestId('task-detail-panel')).toBeInTheDocument()

    fireEvent.click(screen.getByTestId('task-detail-close'))
    expect(screen.queryByTestId('task-detail-panel')).not.toBeInTheDocument()
  })

  it('renders Edit Task button in detail panel', () => {
    render(
      <GanttChart
        stages={defaultStages}
        tasks={defaultTasks}
        projectId="proj-1"
        taskDetails={taskDetails}
      />
    )

    const bar = screen.getByTestId('gantt-bar-task-1')
    fireEvent.mouseDown(bar, { clientX: 100 })
    fireEvent.mouseUp(document)

    expect(screen.getByTestId('task-detail-edit')).toBeInTheDocument()
    expect(screen.getByTestId('task-detail-edit')).toHaveTextContent('Edit Substage')
  })
})
