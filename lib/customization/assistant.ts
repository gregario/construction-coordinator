// Keyword-matched suggestion engine. This is a deliberate stub for the
// LLM-backed AI Assist described in AC-TC-3: the vision declares "Requires
// LLM integration (Claude API or similar)" but the project has no Anthropic
// SDK or API key wired up yet. A rule-based suggester demonstrates the
// accept/reject flow end-to-end, keeps the story shippable, and can be
// swapped for a real LLM call behind the same interface later.
//
// See factory_decisions in cycle_context.json for the divergence rationale.

import type { CustomizationStage, CustomizationTask } from './tree'

export type CustomizationSnapshot = {
  stages: CustomizationStage[]
  tasks: CustomizationTask[]
}

export type AddTaskChange = {
  kind: 'add_task'
  stage_id: string
  name: string
  duration_days: number
  notes: string | null
}

export type ToggleOffChange = {
  kind: 'toggle_off'
  task_id: string
}

export type SuggestionChange = AddTaskChange | ToggleOffChange

export type AssistantSuggestion = {
  id: string
  title: string
  rationale: string
  changes: SuggestionChange[]
}

export type CustomizationDraft = {
  toggledOffTaskIds: Set<string>
  addedTasks: Array<{
    stage_id: string
    name: string
    duration_days: number
    notes: string | null
  }>
}

function findTaskByKeyword(
  tasks: CustomizationTask[],
  keywords: string[]
): CustomizationTask | null {
  const lower = keywords.map(k => k.toLowerCase())
  for (const t of tasks) {
    const name = t.name.toLowerCase()
    if (lower.some(k => name.includes(k))) return t
  }
  return null
}

function findStageByKeyword(
  stages: CustomizationStage[],
  keywords: string[]
): CustomizationStage | null {
  const lower = keywords.map(k => k.toLowerCase())
  for (const s of stages) {
    const name = s.name.toLowerCase()
    if (lower.some(k => name.includes(k))) return s
  }
  return null
}

// Deterministic id for a message + snapshot shape — same input gives same id,
// so repeated queries don't spam the chat with duplicates.
function suggestionId(prefix: string, message: string): string {
  // Simple, stable hash — sufficient for deduping suggestions in a chat log.
  let h = 0
  for (let i = 0; i < message.length; i++) {
    h = (h * 31 + message.charCodeAt(i)) | 0
  }
  return `${prefix}-${Math.abs(h).toString(36)}`
}

export function suggestFromMessage(
  message: string,
  snapshot: CustomizationSnapshot
): AssistantSuggestion | null {
  const text = message.trim().toLowerCase()
  if (text.length === 0) return null

  // ICF substitution: toggle off slab/pour tasks, add ICF wall task
  if (text.includes('icf')) {
    const slabTask = findTaskByKeyword(snapshot.tasks, ['slab', 'pour concrete', 'pour slab'])
    const foundations = findStageByKeyword(snapshot.stages, ['foundation', 'foundations'])
    const changes: SuggestionChange[] = []
    if (slabTask) {
      changes.push({ kind: 'toggle_off', task_id: slabTask.id })
    }
    if (foundations) {
      changes.push({
        kind: 'add_task',
        stage_id: foundations.id,
        name: 'ICF wall assembly',
        duration_days: 5,
        notes: 'Insulated concrete form blocks — replaces traditional slab pour',
      })
    }
    if (changes.length === 0) return null
    return {
      id: suggestionId('icf', text),
      title: 'Switch to ICF foundation',
      rationale:
        'Replaces traditional poured-slab tasks with ICF wall assembly. ICF combines formwork, insulation, and structural concrete in one step.',
      changes,
    }
  }

  // Insulation upgrade: add an extra insulation task to the frame stage
  if (text.includes('insulation')) {
    const frame =
      findStageByKeyword(snapshot.stages, ['frame', 'insulation', 'envelope']) ??
      snapshot.stages[snapshot.stages.length - 1] ??
      null
    if (!frame) return null
    return {
      id: suggestionId('insulation', text),
      title: 'Add insulation upgrade',
      rationale:
        'Adds a dedicated insulation upgrade task with extra lead time for higher-spec materials.',
      changes: [
        {
          kind: 'add_task',
          stage_id: frame.id,
          name: 'Extra insulation upgrade',
          duration_days: 2,
          notes: 'Higher R-value insulation per user request',
        },
      ],
    }
  }

  // Solar / PV add-on
  if (text.includes('solar') || text.includes('pv ')) {
    const last = snapshot.stages[snapshot.stages.length - 1]
    if (!last) return null
    return {
      id: suggestionId('solar', text),
      title: 'Add rooftop solar installation',
      rationale: 'Adds PV installation as a late-stage task.',
      changes: [
        {
          kind: 'add_task',
          stage_id: last.id,
          name: 'Rooftop solar PV installation',
          duration_days: 3,
          notes: 'Panel + inverter install, MCS-certified installer',
        },
      ],
    }
  }

  return null
}

export function applySuggestion(
  draft: CustomizationDraft,
  suggestion: AssistantSuggestion
): CustomizationDraft {
  const toggled = new Set(draft.toggledOffTaskIds)
  const added = draft.addedTasks.slice()

  for (const change of suggestion.changes) {
    if (change.kind === 'toggle_off') {
      toggled.add(change.task_id)
    } else if (change.kind === 'add_task') {
      added.push({
        stage_id: change.stage_id,
        name: change.name,
        duration_days: change.duration_days,
        notes: change.notes,
      })
    }
  }

  return { toggledOffTaskIds: toggled, addedTasks: added }
}
