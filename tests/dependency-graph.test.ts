import { describe, it, expect } from 'vitest'
import {
  detectCycle,
  removeStaleDependencies,
  formatCyclePath,
  type DependencyEdge,
} from '@/lib/tasks/dependency-graph'

// ---------------------------------------------------------------------------
// AC-DV-1: Cycle detection — reject circular dependencies with clear error
// ---------------------------------------------------------------------------
describe('detectCycle — AC-DV-1', () => {
  it('returns null for an empty graph', () => {
    const result = detectCycle([], { taskId: 'A', newDependency: 'B' })
    expect(result).toBeNull()
  })

  it('detects a direct cycle (A depends on B, B depends on A)', () => {
    // Existing: B → A (B depends on A)
    // Proposed: A → B (A depends on B) → cycle: A → B → A
    const edges: DependencyEdge[] = [{ task_id: 'B', depends_on_task_id: 'A' }]
    const result = detectCycle(edges, { taskId: 'A', newDependency: 'B' })
    expect(result).not.toBeNull()
    expect(result!.cycle).toContain('A')
    expect(result!.cycle).toContain('B')
  })

  it('detects a transitive cycle (A → B → C → A)', () => {
    // Existing: B → A, C → B
    // Proposed: A → C → cycle: A → C → B → A
    const edges: DependencyEdge[] = [
      { task_id: 'B', depends_on_task_id: 'A' },
      { task_id: 'C', depends_on_task_id: 'B' },
    ]
    const result = detectCycle(edges, { taskId: 'A', newDependency: 'C' })
    expect(result).not.toBeNull()
    expect(result!.cycle.length).toBeGreaterThanOrEqual(3)
  })

  it('returns null when no cycle exists', () => {
    // Linear chain: C → B → A. Proposed: D → C — no cycle.
    const edges: DependencyEdge[] = [
      { task_id: 'B', depends_on_task_id: 'A' },
      { task_id: 'C', depends_on_task_id: 'B' },
    ]
    const result = detectCycle(edges, { taskId: 'D', newDependency: 'C' })
    expect(result).toBeNull()
  })

  it('detects a self-dependency', () => {
    const result = detectCycle([], { taskId: 'A', newDependency: 'A' })
    expect(result).not.toBeNull()
    expect(result!.cycle).toEqual(['A', 'A'])
  })

  it('handles multiple dependencies per task without false positives', () => {
    // A → B, A → C, D → A — no cycles
    const edges: DependencyEdge[] = [
      { task_id: 'A', depends_on_task_id: 'B' },
      { task_id: 'A', depends_on_task_id: 'C' },
      { task_id: 'D', depends_on_task_id: 'A' },
    ]
    const result = detectCycle(edges, { taskId: 'B', newDependency: 'D' })
    // B → D → A → B is a cycle
    expect(result).not.toBeNull()
  })

  it('returns null for a wide fan-out with no cycles', () => {
    // Hub: X depends on A, B, C, D, E. No reverse edges.
    const edges: DependencyEdge[] = [
      { task_id: 'X', depends_on_task_id: 'A' },
      { task_id: 'X', depends_on_task_id: 'B' },
      { task_id: 'X', depends_on_task_id: 'C' },
      { task_id: 'X', depends_on_task_id: 'D' },
      { task_id: 'X', depends_on_task_id: 'E' },
    ]
    const result = detectCycle(edges, { taskId: 'F', newDependency: 'X' })
    expect(result).toBeNull()
  })

  it('detects a long chain cycle (depth 5)', () => {
    // Chain: B→A, C→B, D→C, E→D. Proposed: A→E → cycle A→E→D→C→B→A
    const edges: DependencyEdge[] = [
      { task_id: 'B', depends_on_task_id: 'A' },
      { task_id: 'C', depends_on_task_id: 'B' },
      { task_id: 'D', depends_on_task_id: 'C' },
      { task_id: 'E', depends_on_task_id: 'D' },
    ]
    const result = detectCycle(edges, { taskId: 'A', newDependency: 'E' })
    expect(result).not.toBeNull()
  })
})

// ---------------------------------------------------------------------------
// AC-DV-1: formatCyclePath — human-readable cycle description
// ---------------------------------------------------------------------------
describe('formatCyclePath — AC-DV-1', () => {
  it('formats a direct cycle with task names', () => {
    const names: Record<string, string> = { A: 'Pour Foundation', B: 'Frame Walls' }
    const msg = formatCyclePath(['A', 'B', 'A'], names)
    expect(msg).toBe(
      'This would create a circular dependency: Pour Foundation → Frame Walls → Pour Foundation'
    )
  })

  it('falls back to IDs when names are missing', () => {
    const msg = formatCyclePath(['X', 'Y', 'X'], {})
    expect(msg).toBe('This would create a circular dependency: X → Y → X')
  })

  it('formats a 3-node cycle', () => {
    const names: Record<string, string> = { A: 'Task A', B: 'Task B', C: 'Task C' }
    const msg = formatCyclePath(['A', 'B', 'C', 'A'], names)
    expect(msg).toBe(
      'This would create a circular dependency: Task A → Task B → Task C → Task A'
    )
  })
})

// ---------------------------------------------------------------------------
// AC-DV-2: Stale dependency removal
// ---------------------------------------------------------------------------
describe('removeStaleDependencies — AC-DV-2', () => {
  it('removes depends_on IDs that are not in the valid set', () => {
    const deps: DependencyEdge[] = [
      { task_id: 'A', depends_on_task_id: 'B' },
      { task_id: 'A', depends_on_task_id: 'DELETED' },
      { task_id: 'C', depends_on_task_id: 'D' },
    ]
    const validTaskIds = new Set(['A', 'B', 'C', 'D'])
    const result = removeStaleDependencies(deps, validTaskIds)
    expect(result.cleaned).toEqual([
      { task_id: 'A', depends_on_task_id: 'B' },
      { task_id: 'C', depends_on_task_id: 'D' },
    ])
    expect(result.removed).toEqual([
      { task_id: 'A', depends_on_task_id: 'DELETED' },
    ])
  })

  it('returns empty removed array when all deps are valid', () => {
    const deps: DependencyEdge[] = [
      { task_id: 'A', depends_on_task_id: 'B' },
    ]
    const validTaskIds = new Set(['A', 'B'])
    const result = removeStaleDependencies(deps, validTaskIds)
    expect(result.cleaned).toEqual(deps)
    expect(result.removed).toEqual([])
  })

  it('handles empty dependencies', () => {
    const result = removeStaleDependencies([], new Set(['A']))
    expect(result.cleaned).toEqual([])
    expect(result.removed).toEqual([])
  })

  it('removes deps where the task_id side is also stale', () => {
    const deps: DependencyEdge[] = [
      { task_id: 'GONE', depends_on_task_id: 'B' },
    ]
    const validTaskIds = new Set(['B'])
    const result = removeStaleDependencies(deps, validTaskIds)
    expect(result.cleaned).toEqual([])
    expect(result.removed).toEqual([
      { task_id: 'GONE', depends_on_task_id: 'B' },
    ])
  })
})

// ---------------------------------------------------------------------------
// AC-DV-3: Performance — cycle detection under 500ms for 100+ tasks
// ---------------------------------------------------------------------------
describe('detectCycle performance — AC-DV-3', () => {
  it('runs cycle detection on 100-task linear chain in under 500ms', () => {
    // Build a linear chain: t1 → t0, t2 → t1, ..., t99 → t98
    const edges: DependencyEdge[] = []
    for (let i = 1; i < 100; i++) {
      edges.push({ task_id: `t${i}`, depends_on_task_id: `t${i - 1}` })
    }
    // Proposed: t0 → t99 — creates a full-chain cycle
    const start = performance.now()
    const result = detectCycle(edges, { taskId: 't0', newDependency: 't99' })
    const elapsed = performance.now() - start

    expect(result).not.toBeNull()
    expect(elapsed).toBeLessThan(500)
  })

  it('runs cycle detection on 200-task graph with fan-out in under 500ms', () => {
    // Create a graph with moderate fan-out: each task depends on 2 predecessors
    const edges: DependencyEdge[] = []
    for (let i = 2; i < 200; i++) {
      edges.push({ task_id: `t${i}`, depends_on_task_id: `t${i - 1}` })
      edges.push({ task_id: `t${i}`, depends_on_task_id: `t${i - 2}` })
    }
    // Proposed edge that does NOT create a cycle
    const start = performance.now()
    const result = detectCycle(edges, { taskId: 't200', newDependency: 't199' })
    const elapsed = performance.now() - start

    expect(result).toBeNull()
    expect(elapsed).toBeLessThan(500)
  })

  it('runs cycle detection on 500-task graph in under 500ms', () => {
    const edges: DependencyEdge[] = []
    for (let i = 1; i < 500; i++) {
      edges.push({ task_id: `t${i}`, depends_on_task_id: `t${i - 1}` })
    }
    const start = performance.now()
    const result = detectCycle(edges, { taskId: 't500', newDependency: 't499' })
    const elapsed = performance.now() - start

    expect(result).toBeNull()
    expect(elapsed).toBeLessThan(500)
  })
})
