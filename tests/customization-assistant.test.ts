import { describe, it, expect } from 'vitest'
import {
  suggestFromMessage,
  applySuggestion,
  type AssistantSuggestion,
  type CustomizationSnapshot,
} from '@/lib/customization/assistant'

const snapshot: CustomizationSnapshot = {
  stages: [
    { id: 's1', name: 'Foundations', color: '#8B5E3C', order_index: 0 },
    { id: 's2', name: 'Frame', color: '#6B8F3F', order_index: 1 },
  ],
  tasks: [
    { id: 't1', stage_id: 's1', name: 'Excavation', order_index: 0, duration_days: 4 },
    { id: 't2', stage_id: 's1', name: 'Pour concrete slab', order_index: 1, duration_days: 2 },
    { id: 't3', stage_id: 's2', name: 'Timber frame erection', order_index: 0, duration_days: 5 },
  ],
}

// @criterion: AC-TC-3
// AC-TC-3: AI assist panel — user describes intent, system suggests task/material additions or substitutions with accept/reject
describe('suggestFromMessage — AC-TC-3', () => {
  it('suggests an ICF substitution when user mentions ICF', () => {
    const s = suggestFromMessage('I am doing ICF foundation not traditional pour', snapshot)
    expect(s).not.toBeNull()
    expect(s!.title.toLowerCase()).toContain('icf')
    expect(s!.changes.length).toBeGreaterThan(0)
    // Should include a toggle-off for the slab pour
    const toggledOff = s!.changes.find(
      c => c.kind === 'toggle_off' && c.task_id === 't2'
    )
    expect(toggledOff).toBeDefined()
  })

  it('suggests a task addition for insulation when user mentions insulation', () => {
    const s = suggestFromMessage('we are adding extra insulation upgrade', snapshot)
    expect(s).not.toBeNull()
    const added = s!.changes.find(c => c.kind === 'add_task')
    expect(added).toBeDefined()
    if (added && added.kind === 'add_task') {
      expect(added.name.toLowerCase()).toContain('insulation')
    }
  })

  it('returns null for an empty or unrecognised message', () => {
    expect(suggestFromMessage('', snapshot)).toBeNull()
    expect(suggestFromMessage('hello world', snapshot)).toBeNull()
  })

  it('returns a stable-id suggestion (not random) for the same input', () => {
    const a = suggestFromMessage('ICF foundation', snapshot)
    const b = suggestFromMessage('ICF foundation', snapshot)
    expect(a?.id).toBe(b?.id)
  })
})

// @criterion: AC-TC-4
// AC-TC-4: Accepting a suggestion updates the draft plan; rejecting dismisses it
describe('applySuggestion — AC-TC-4', () => {
  it('adds tasks marked as add_task to the add set and preserves other changes', () => {
    const suggestion: AssistantSuggestion = {
      id: 'sug-1',
      title: 'Add rebar inspection',
      rationale: 'Code compliance',
      changes: [
        {
          kind: 'add_task',
          stage_id: 's1',
          name: 'Rebar inspection',
          duration_days: 1,
          notes: null,
        },
      ],
    }
    const result = applySuggestion(
      { toggledOffTaskIds: new Set(), addedTasks: [] },
      suggestion
    )
    expect(result.addedTasks).toHaveLength(1)
    expect(result.addedTasks[0].name).toBe('Rebar inspection')
    expect(result.addedTasks[0].stage_id).toBe('s1')
  })

  it('toggles off tasks from a suggestion', () => {
    const suggestion: AssistantSuggestion = {
      id: 'sug-2',
      title: 'Swap slab for ICF',
      rationale: 'User is doing ICF',
      changes: [{ kind: 'toggle_off', task_id: 't2' }],
    }
    const result = applySuggestion(
      { toggledOffTaskIds: new Set(), addedTasks: [] },
      suggestion
    )
    expect(result.toggledOffTaskIds.has('t2')).toBe(true)
  })

  it('merges with existing customization state', () => {
    const suggestion: AssistantSuggestion = {
      id: 'sug-3',
      title: 'Add one task',
      rationale: '—',
      changes: [
        {
          kind: 'add_task',
          stage_id: 's2',
          name: 'Roof underlay',
          duration_days: 1,
          notes: null,
        },
      ],
    }
    const result = applySuggestion(
      {
        toggledOffTaskIds: new Set(['t1']),
        addedTasks: [
          { stage_id: 's1', name: 'Survey', duration_days: 1, notes: null },
        ],
      },
      suggestion
    )
    expect(result.toggledOffTaskIds.has('t1')).toBe(true)
    expect(result.addedTasks).toHaveLength(2)
    expect(result.addedTasks.map(t => t.name)).toContain('Survey')
    expect(result.addedTasks.map(t => t.name)).toContain('Roof underlay')
  })
})
