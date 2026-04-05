// Domain-level TypeScript types for Construction Manager
// These align with the actual database schema in supabase/migrations/
// Note: task dependencies use a join table (task_dependencies), not an array column.

export type ProjectStatus = 'setup' | 'active' | 'complete'
export type TaskStatus = 'not_started' | 'in_progress' | 'complete' | 'delayed'
export type MaterialOrderStatus = 'not_ordered' | 'ordered' | 'delivered'
export type EntityType = 'task' | 'material'
export type ChangeType = 'date_moved' | 'status_changed'

export interface Project {
  id: string
  user_id: string
  name: string
  address: string | null
  start_date: string // ISO date
  status: ProjectStatus
  created_at: string
  updated_at: string
}

export interface Stage {
  id: string
  project_id: string
  name: string
  color: string
  order_index: number
  created_at: string
  updated_at: string
}

export interface Task {
  id: string
  stage_id: string
  project_id: string
  trade_id: string | null
  name: string
  duration_days: number
  planned_start: string // ISO date (NOT NULL in DB)
  planned_end: string   // ISO date (NOT NULL in DB)
  actual_end: string | null
  status: TaskStatus
  order_index: number
  notes: string | null
  created_at: string
  updated_at: string
}

// Join-table record — dependencies are stored separately, not as an array on Task
export interface TaskDependency {
  task_id: string
  depends_on_task_id: string
}

// Task enriched with its dependency IDs (assembled in application layer)
export interface TaskWithDeps extends Task {
  depends_on: string[] // populated by joining task_dependencies
}

export interface Material {
  id: string
  task_id: string
  name: string
  quantity: string | null // freeform: "50 sheets", "3 pallets"
  lead_time_days: number
  order_by_date: string | null // ISO date (computed: task.planned_start - lead_time_days)
  order_status: MaterialOrderStatus
  estimated_cost: number | null
  supplier_name: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface Trade {
  id: string
  project_id: string
  name: string
  specialty: string | null
  phone: string | null
  email: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface Photo {
  id: string
  project_id: string
  task_id: string | null
  stage_id: string | null
  storage_path: string // path in Supabase Storage "photos" bucket
  file_name: string
  file_size: number | null
  taken_at: string | null
  created_at: string
}

export interface Document {
  id: string
  project_id: string
  task_id: string | null
  stage_id: string | null
  storage_path: string // path in Supabase Storage "documents" bucket
  file_name: string
  file_type: string
  file_size: number | null
  created_at: string
}

export interface PushSubscription {
  id: string
  user_id: string
  endpoint: string
  p256dh: string
  auth_key: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface NotificationPreferences {
  user_id: string
  order_deadlines: boolean
  overdue_tasks: boolean
  cascade_summaries: boolean
  order_warning_days: number // 1–14, default 3
  updated_at: string
}

export interface ShiftAlert {
  id: string
  project_id: string
  user_id: string
  entity_type: EntityType
  entity_id: string
  entity_name: string
  change_type: ChangeType
  old_value: string | null
  new_value: string | null
  dismissed: boolean
  created_at: string
}

// ============================================================
// Cascade engine return type (mirrors the SQL function output)
// ============================================================
export interface CascadeResult {
  task_id: string
  task_name: string
  old_planned_start: string
  old_planned_end: string
  new_planned_start: string
  new_planned_end: string
}
