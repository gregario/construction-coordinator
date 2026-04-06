// Pure dependency graph validation — cycle detection (DFS), stale dep cleanup.
// No Supabase, no DOM. Unit-testable without mocks.

export type DependencyEdge = {
  task_id: string
  depends_on_task_id: string
}

export type CycleDetectionResult = {
  /** The task IDs forming the cycle, ending with the repeated node (e.g. ['A','B','C','A']). */
  cycle: string[]
}

export type ProposedEdge = {
  taskId: string
  newDependency: string
}

export type StaleCleanupResult = {
  /** Edges that reference only valid task IDs. */
  cleaned: DependencyEdge[]
  /** Edges removed because one side references a non-existent task. */
  removed: DependencyEdge[]
}

// ---------------------------------------------------------------------------
// AC-DV-1 + AC-DV-3: DFS-based cycle detection
// ---------------------------------------------------------------------------

/**
 * Detects whether adding a proposed dependency edge would create a cycle.
 *
 * Algorithm: Starting from the proposed dependency target (newDependency),
 * follow the "depends on" edges (i.e. who does newDependency depend on,
 * transitively). If we reach taskId, there's a cycle — because taskId would
 * depend on newDependency, and newDependency transitively depends on taskId.
 *
 * Equivalently: after adding taskId → newDependency, check if there's a path
 * from newDependency back to taskId via existing edges.
 *
 * Returns null if no cycle, or a CycleDetectionResult with the cycle path.
 */
export function detectCycle(
  edges: DependencyEdge[],
  proposed: ProposedEdge
): CycleDetectionResult | null {
  const { taskId, newDependency } = proposed

  // Self-dependency is always a cycle.
  if (taskId === newDependency) {
    return { cycle: [taskId, taskId] }
  }

  // Build adjacency list: task → [tasks it depends on]
  // "task_id depends on depends_on_task_id" means task_id has an edge TO depends_on_task_id.
  // But for cycle detection we need: who depends on X? i.e. reverse edges.
  // Actually — we need to check: can newDependency reach taskId via "who depends on me" edges?
  // No — let me think again.
  //
  // Edge semantics: (task_id, depends_on_task_id) means task_id depends on depends_on_task_id.
  // Proposed: taskId depends on newDependency.
  // Cycle exists if: newDependency can reach taskId by following "depends on" edges transitively.
  // i.e. newDependency depends on X, X depends on Y, ..., Z depends on taskId.
  //
  // But the edge direction in our data is: task_id → depends_on_task_id (the dependency target).
  // So we want: starting from newDependency, follow its depends_on edges (outgoing edges
  // from task_id matching newDependency), and see if we reach taskId.
  //
  // Wait — actually the reverse. If B depends on A, the edge is (B, A).
  // After adding (taskId, newDependency), we need to check: is there a path
  // from newDependency to taskId following the dependency direction?
  // That means: does newDependency (transitively) depend on taskId?
  //
  // Dependency direction: task_id depends on depends_on_task_id.
  // From newDependency, we follow: who does newDependency depend on? That's all edges
  // where task_id === newDependency, giving us depends_on_task_id values.
  // Then for each of those, who do THEY depend on? etc.
  // If we reach taskId, cycle confirmed.

  // Build adjacency: node → [nodes it depends on]
  const dependsOn = new Map<string, string[]>()
  for (const e of edges) {
    let list = dependsOn.get(e.task_id)
    if (!list) {
      list = []
      dependsOn.set(e.task_id, list)
    }
    list.push(e.depends_on_task_id)
  }

  // DFS from newDependency following dependsOn edges — can we reach taskId?
  const visited = new Set<string>()
  const stack: string[] = [newDependency]
  // Track parent for path reconstruction
  const parent = new Map<string, string>()
  parent.set(newDependency, taskId) // virtual edge: taskId → newDependency

  while (stack.length > 0) {
    const current = stack.pop()!
    if (current === taskId) {
      // Found a cycle — reconstruct path from taskId → ... → newDependency → taskId
      return { cycle: reconstructPath(parent, taskId, newDependency) }
    }
    if (visited.has(current)) continue
    visited.add(current)

    const neighbors = dependsOn.get(current)
    if (neighbors) {
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          if (!parent.has(neighbor)) {
            parent.set(neighbor, current)
          }
          stack.push(neighbor)
        }
      }
    }
  }

  return null
}

/**
 * Reconstruct the cycle path: taskId → newDependency → ... → taskId
 */
function reconstructPath(
  parent: Map<string, string>,
  target: string,
  start: string
): string[] {
  const path: string[] = [target]
  let current = start
  // Walk from start back to target using parent map, but build forward path
  const chain: string[] = []
  let cursor = target
  // We stored parent[newDependency] = taskId, parent[X] = who reached X.
  // The path from taskId to target (taskId) via the DFS is:
  // taskId --(proposed)--> newDependency --(existing)--> ... --(existing)--> taskId
  // parent map: newDependency→taskId, nextNode→newDependency, ...
  // Walk backwards from target:
  const reversePath: string[] = [target]
  cursor = target
  const seen = new Set<string>()
  while (parent.has(cursor) && !seen.has(cursor)) {
    seen.add(cursor)
    cursor = parent.get(cursor)!
    reversePath.push(cursor)
    if (cursor === target) break
  }
  // reversePath is [target, ..., taskId] but we want [taskId, ..., target, taskId]
  // Actually it's already ending with target if we found the cycle.
  // Let's reverse it to get taskId → ... → target
  reversePath.reverse()
  return reversePath
}

// ---------------------------------------------------------------------------
// AC-DV-1: Human-readable cycle path formatting
// ---------------------------------------------------------------------------

/**
 * Format a cycle path as a human-readable error message.
 * AC-DV-1 specifies: "This would create a circular dependency: A → B → A"
 */
export function formatCyclePath(
  cycle: string[],
  taskNames: Record<string, string>
): string {
  const named = cycle.map(id => taskNames[id] || id)
  return `This would create a circular dependency: ${named.join(' → ')}`
}

// ---------------------------------------------------------------------------
// AC-DV-2: Stale dependency removal
// ---------------------------------------------------------------------------

/**
 * Remove dependency edges that reference task IDs not in the valid set.
 * Both sides of the edge (task_id and depends_on_task_id) must be valid.
 */
export function removeStaleDependencies(
  deps: DependencyEdge[],
  validTaskIds: Set<string>
): StaleCleanupResult {
  const cleaned: DependencyEdge[] = []
  const removed: DependencyEdge[] = []

  for (const dep of deps) {
    if (validTaskIds.has(dep.task_id) && validTaskIds.has(dep.depends_on_task_id)) {
      cleaned.push(dep)
    } else {
      removed.push(dep)
    }
  }

  return { cleaned, removed }
}
