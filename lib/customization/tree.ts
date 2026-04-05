// Pure tree-building and toggle logic for the template-customization screen.
// No Supabase, no DOM. Consumed by both the client component and tests.

export type CustomizationStage = {
  id: string
  name: string
  color: string
  order_index: number
}

export type CustomizationTask = {
  id: string
  stage_id: string
  name: string
  order_index: number
  duration_days: number
  notes?: string | null
}

export type TaskDependencyRow = {
  task_id: string
  depends_on_task_id: string
}

export type CustomizationTreeNode = {
  id: string
  name: string
  color: string
  order_index: number
  tasks: CustomizationTask[]
}

export function buildCustomizationTree(
  stages: CustomizationStage[],
  tasks: CustomizationTask[]
): CustomizationTreeNode[] {
  const sortedStages = stages
    .slice()
    .sort((a, b) => a.order_index - b.order_index)

  return sortedStages.map(stage => ({
    id: stage.id,
    name: stage.name,
    color: stage.color,
    order_index: stage.order_index,
    tasks: tasks
      .filter(t => t.stage_id === stage.id)
      .slice()
      .sort((a, b) => a.order_index - b.order_index),
  }))
}

export function applyToggles(
  tasks: CustomizationTask[],
  toggledOff: Set<string>
): CustomizationTask[] {
  if (toggledOff.size === 0) return tasks.slice()
  return tasks.filter(t => !toggledOff.has(t.id))
}

// A task has a broken dependency when any task it directly depends_on
// is currently toggled off. We only surface direct deps — transitive breakage
// is implied by the warning cascading through the chain as the user toggles more.
export function tasksWithBrokenDependencies(
  tasks: CustomizationTask[],
  deps: TaskDependencyRow[],
  toggledOff: Set<string>
): Set<string> {
  const broken = new Set<string>()
  if (deps.length === 0 || toggledOff.size === 0) return broken

  for (const dep of deps) {
    if (toggledOff.has(dep.task_id)) continue // the dependent itself is off — don't flag
    if (toggledOff.has(dep.depends_on_task_id)) {
      broken.add(dep.task_id)
    }
  }
  return broken
}

export function diffToggles(
  tasks: CustomizationTask[],
  toggledOff: Set<string>
): { toDelete: string[]; toKeep: CustomizationTask[] } {
  const toDelete: string[] = []
  const toKeep: CustomizationTask[] = []
  for (const t of tasks) {
    if (toggledOff.has(t.id)) toDelete.push(t.id)
    else toKeep.push(t)
  }
  return { toDelete, toKeep }
}
