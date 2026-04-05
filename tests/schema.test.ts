import { describe, it, expect } from 'vitest'
import type {
  Project,
  Stage,
  Task,
  TaskDependency,
  Material,
  Trade,
  Photo,
  Document,
  PushSubscription,
  NotificationPreferences,
  ShiftAlert,
  CascadeResult,
} from '@/types/database'

describe('Database type shapes', () => {
  it('Project has required fields with correct status literals', () => {
    const project: Project = {
      id: 'uuid-1',
      user_id: 'uuid-user',
      name: 'O\'Brien Timber Frame House',
      address: '42 Laragh Lane, Wicklow',
      start_date: '2026-06-01',
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    expect(project.status).toBe('active')
    expect(project.name).toBeTruthy()
  })

  it('Project status enum covers all valid values', () => {
    const statuses: Project['status'][] = ['setup', 'active', 'complete']
    expect(statuses).toHaveLength(3)
    statuses.forEach(s => expect(s).toBeTruthy())
  })

  it('Stage has order_index (not order) matching actual schema', () => {
    const stage: Stage = {
      id: 'uuid-s1',
      project_id: 'uuid-1',
      name: 'Foundation',
      color: '#8B5E3C',
      order_index: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    expect(stage.order_index).toBe(0)
    expect(stage.color).toBe('#8B5E3C')
  })

  it('Task has order_index and does not have a depends_on array (use TaskDependency)', () => {
    const task: Task = {
      id: 'uuid-t1',
      stage_id: 'uuid-s1',
      project_id: 'uuid-1',
      trade_id: null,
      name: 'Pour Concrete Slab',
      duration_days: 3,
      planned_start: '2026-06-22',
      planned_end: '2026-06-24',
      actual_end: null,
      status: 'not_started',
      order_index: 3,
      notes: 'C25 reinforced slab. 28-day cure.',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    expect(task.duration_days).toBe(3)
    expect(task.status).toBe('not_started')
    // TaskDependency is the join table — Task itself has no depends_on property
    expect('depends_on' in task).toBe(false)
  })

  it('Task status enum covers all valid values', () => {
    const statuses: Task['status'][] = ['not_started', 'in_progress', 'complete', 'delayed']
    expect(statuses).toHaveLength(4)
  })

  it('TaskDependency models the join table correctly', () => {
    const dep: TaskDependency = {
      task_id: 'uuid-t2',
      depends_on_task_id: 'uuid-t1',
    }
    expect(dep.task_id).not.toBe(dep.depends_on_task_id)
  })

  it('Material order_status enum covers all values', () => {
    const statuses: Material['order_status'][] = ['not_ordered', 'ordered', 'delivered']
    expect(statuses).toHaveLength(3)
  })

  it('Material has order_by_date as ISO string or null', () => {
    const material: Material = {
      id: 'uuid-m1',
      task_id: 'uuid-t1',
      name: 'Ready Mix Concrete C25/30',
      quantity: '22 m³',
      lead_time_days: 3,
      order_by_date: '2026-06-19',
      order_status: 'not_ordered',
      estimated_cost: 2640,
      supplier_name: 'Roadstone Concrete',
      notes: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    expect(material.lead_time_days).toBe(3)
    expect(material.order_by_date).toBeTruthy()
  })

  it('Trade has all contact fields nullable', () => {
    const trade: Trade = {
      id: 'uuid-tr1',
      project_id: 'uuid-1',
      name: 'Murphy Groundworks Ltd',
      specialty: 'Groundworks & Foundations',
      phone: null,
      email: null,
      notes: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    expect(trade.phone).toBeNull()
    expect(trade.name).toBeTruthy()
  })

  it('Photo must reference project, with optional task/stage', () => {
    const photo: Photo = {
      id: 'uuid-ph1',
      project_id: 'uuid-1',
      task_id: 'uuid-t1',
      stage_id: null,
      storage_path: 'uuid-1/uuid-t1/progress-day1.jpg',
      file_name: 'progress-day1.jpg',
      file_size: 2048000,
      taken_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    }
    expect(photo.storage_path).toContain('uuid-1')
  })

  it('PushSubscription uses auth_key (not auth) matching actual DB schema', () => {
    const sub: PushSubscription = {
      id: 'uuid-ps1',
      user_id: 'uuid-user',
      endpoint: 'https://push.example.com/sub/xyz',
      p256dh: 'p256dh-key-value',
      auth_key: 'auth-token-value',
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    expect(sub.auth_key).toBeTruthy()
    expect(sub.is_active).toBe(true)
  })

  it('NotificationPreferences has per-type boolean flags and threshold', () => {
    const prefs: NotificationPreferences = {
      user_id: 'uuid-user',
      order_deadlines: true,
      overdue_tasks: true,
      cascade_summaries: false,
      order_warning_days: 5,
      updated_at: new Date().toISOString(),
    }
    expect(prefs.order_warning_days).toBe(5)
    expect(prefs.cascade_summaries).toBe(false)
  })

  it('ShiftAlert tracks entity date changes with dismissal state', () => {
    const alert: ShiftAlert = {
      id: 'uuid-sa1',
      project_id: 'uuid-1',
      user_id: 'uuid-user',
      entity_type: 'task',
      entity_id: 'uuid-t1',
      entity_name: 'Pour Concrete Slab',
      change_type: 'date_moved',
      old_value: '2026-06-22',
      new_value: '2026-06-29',
      dismissed: false,
      created_at: new Date().toISOString(),
    }
    expect(alert.entity_type).toBe('task')
    expect(alert.dismissed).toBe(false)
    expect(alert.old_value).not.toBe(alert.new_value)
  })

  it('ShiftAlert change_type enum covers all valid values', () => {
    const types: ShiftAlert['change_type'][] = ['date_moved', 'status_changed']
    expect(types).toHaveLength(2)
  })

  it('CascadeResult mirrors the SQL cascade_task_dates function return', () => {
    const result: CascadeResult = {
      task_id: 'uuid-t2',
      task_name: 'Timber Frame Delivery',
      old_planned_start: '2026-07-22',
      old_planned_end: '2026-07-26',
      new_planned_start: '2026-07-29',
      new_planned_end: '2026-08-02',
    }
    expect(new Date(result.new_planned_start) > new Date(result.old_planned_start)).toBe(true)
  })
})
