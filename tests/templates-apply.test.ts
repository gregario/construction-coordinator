import { describe, it, expect } from 'vitest'
import {
  buildTemplateInsertPlan,
  summarizeTemplate,
  type TemplateStageDef,
} from '@/lib/templates/apply'

const sampleStages: TemplateStageDef[] = [
  {
    name: 'Foundations',
    color: '#8B5E3C',
    order_index: 0,
    tasks: [
      { name: 'Excavation', duration_days: 4 },
      {
        name: 'Pour slab',
        duration_days: 2,
        materials: [
          { name: 'Ready-mix concrete', quantity: '60m³', lead_time_days: 3 },
        ],
      },
    ],
  },
  {
    name: 'Frame',
    color: '#6B8F3F',
    order_index: 1,
    tasks: [
      { name: 'Timber frame erection', duration_days: 5 },
    ],
  },
]

describe('buildTemplateInsertPlan — AC-TB-3', () => {
  const projectId = '00000000-0000-0000-0000-000000000001'

  it('creates one stage per template stage with correct ordering and color', () => {
    const plan = buildTemplateInsertPlan(sampleStages, projectId, '2026-06-01')

    expect(plan.stages).toHaveLength(2)
    expect(plan.stages[0]).toMatchObject({
      project_id: projectId,
      name: 'Foundations',
      color: '#8B5E3C',
      order_index: 0,
      _localId: 's0',
    })
    expect(plan.stages[1]).toMatchObject({
      name: 'Frame',
      order_index: 1,
      _localId: 's1',
    })
  })

  it('computes sequential task dates starting at project start_date', () => {
    const plan = buildTemplateInsertPlan(sampleStages, projectId, '2026-06-01')

    expect(plan.tasks).toHaveLength(3)
    // Excavation: starts 2026-06-01, 4 days duration → end 2026-06-05
    expect(plan.tasks[0]).toMatchObject({
      name: 'Excavation',
      duration_days: 4,
      planned_start: '2026-06-01',
      planned_end: '2026-06-05',
      order_index: 0,
      _stageLocalId: 's0',
    })
    // Pour slab: starts day after previous end → 2026-06-06, 2 days → end 2026-06-08
    expect(plan.tasks[1]).toMatchObject({
      name: 'Pour slab',
      planned_start: '2026-06-06',
      planned_end: '2026-06-08',
      order_index: 1,
      _stageLocalId: 's0',
    })
    // Timber frame erection: next stage, starts 2026-06-09, 5 days → end 2026-06-14
    expect(plan.tasks[2]).toMatchObject({
      name: 'Timber frame erection',
      planned_start: '2026-06-09',
      planned_end: '2026-06-14',
      order_index: 0,
      _stageLocalId: 's1',
    })
  })

  it('computes order_by_date = task.planned_start - lead_time_days for materials', () => {
    const plan = buildTemplateInsertPlan(sampleStages, projectId, '2026-06-01')

    expect(plan.materials).toHaveLength(1)
    expect(plan.materials[0]).toMatchObject({
      name: 'Ready-mix concrete',
      quantity: '60m³',
      lead_time_days: 3,
      // Pour slab starts 2026-06-06 minus 3 days = 2026-06-03
      order_by_date: '2026-06-03',
      _taskLocalId: 't0-1',
    })
  })

  it('handles tasks without materials and stages without tasks', () => {
    const plan = buildTemplateInsertPlan(
      [{ name: 'Empty', color: '#000', order_index: 0, tasks: [] }],
      projectId,
      '2026-06-01'
    )
    expect(plan.stages).toHaveLength(1)
    expect(plan.tasks).toHaveLength(0)
    expect(plan.materials).toHaveLength(0)
  })

  it('defaults duration_days to 1 when missing or invalid', () => {
    const plan = buildTemplateInsertPlan(
      [
        {
          name: 'S',
          color: '#000',
          order_index: 0,
          // @ts-expect-error simulating malformed template data
          tasks: [{ name: 'Unknown', duration_days: null }],
        },
      ],
      projectId,
      '2026-06-01'
    )
    expect(plan.tasks[0].duration_days).toBe(1)
    expect(plan.tasks[0].planned_start).toBe('2026-06-01')
    expect(plan.tasks[0].planned_end).toBe('2026-06-02')
  })

  it('assigns project_id to every stage, task, and material origin', () => {
    const plan = buildTemplateInsertPlan(sampleStages, projectId, '2026-06-01')
    for (const s of plan.stages) expect(s.project_id).toBe(projectId)
    for (const t of plan.tasks) expect(t.project_id).toBe(projectId)
  })
})

describe('summarizeTemplate — AC-TB-2', () => {
  it('returns stage count, task count, first-3 task names per stage, total duration', () => {
    const summary = summarizeTemplate({
      id: 'tpl-1',
      name: 'Test',
      description: 'desc',
      total_duration_days: 90,
      stages: sampleStages,
    })
    expect(summary.stage_count).toBe(2)
    expect(summary.task_count).toBe(3)
    expect(summary.total_duration_days).toBe(90)
    expect(summary.stages[0].sample_tasks).toEqual(['Excavation', 'Pour slab'])
    expect(summary.stages[1].sample_tasks).toEqual(['Timber frame erection'])
  })

  it('falls back to computed total duration when total_duration_days is missing', () => {
    const summary = summarizeTemplate({
      id: 'tpl-2',
      name: 'Computed',
      description: null,
      total_duration_days: null,
      stages: sampleStages,
    })
    // 4 + 2 + 5 = 11 days of work, but with 1-day gaps between sequential tasks
    // 2 inter-task gaps = 13. Matches buildTemplateInsertPlan rhythm.
    expect(summary.total_duration_days).toBe(13)
  })

  it('caps sample_tasks at 3 per stage', () => {
    const summary = summarizeTemplate({
      id: 'tpl-3',
      name: 'Many',
      description: null,
      total_duration_days: null,
      stages: [
        {
          name: 'Big stage',
          color: '#000',
          order_index: 0,
          tasks: [
            { name: 'A', duration_days: 1 },
            { name: 'B', duration_days: 1 },
            { name: 'C', duration_days: 1 },
            { name: 'D', duration_days: 1 },
            { name: 'E', duration_days: 1 },
          ],
        },
      ],
    })
    expect(summary.stages[0].sample_tasks).toEqual(['A', 'B', 'C'])
    expect(summary.stages[0].task_count).toBe(5)
  })
})
