export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      projects: {
        Row: {
          id: string
          user_id: string
          name: string
          address: string | null
          start_date: string | null
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          address?: string | null
          start_date?: string | null
          status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          address?: string | null
          start_date?: string | null
          status?: string
          created_at?: string
          updated_at?: string
        }
      }
      stages: {
        Row: {
          id: string
          project_id: string
          name: string
          color: string | null
          order_index: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          name: string
          color?: string | null
          order_index?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          name?: string
          color?: string | null
          order_index?: number
          created_at?: string
          updated_at?: string
        }
      }
      trades: {
        Row: {
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
        Insert: {
          id?: string
          project_id: string
          name: string
          specialty?: string | null
          phone?: string | null
          email?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          name?: string
          specialty?: string | null
          phone?: string | null
          email?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      tasks: {
        Row: {
          id: string
          project_id: string
          stage_id: string | null
          trade_id: string | null
          name: string
          duration_days: number | null
          planned_start: string | null
          planned_end: string | null
          actual_end: string | null
          status: string
          order_index: number
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          stage_id?: string | null
          trade_id?: string | null
          name: string
          duration_days?: number | null
          planned_start?: string | null
          planned_end?: string | null
          actual_end?: string | null
          status?: string
          order_index?: number
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          stage_id?: string | null
          trade_id?: string | null
          name?: string
          duration_days?: number | null
          planned_start?: string | null
          planned_end?: string | null
          actual_end?: string | null
          status?: string
          order_index?: number
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      task_dependencies: {
        Row: {
          task_id: string
          depends_on_task_id: string
        }
        Insert: {
          task_id: string
          depends_on_task_id: string
        }
        Update: {
          task_id?: string
          depends_on_task_id?: string
        }
      }
      materials: {
        Row: {
          id: string
          task_id: string
          name: string
          quantity: number | null
          lead_time_days: number | null
          order_by_date: string | null
          order_status: string | null
          estimated_cost: number | null
          supplier_name: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          task_id: string
          name: string
          quantity?: number | null
          lead_time_days?: number | null
          order_by_date?: string | null
          order_status?: string | null
          estimated_cost?: number | null
          supplier_name?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          task_id?: string
          name?: string
          quantity?: number | null
          lead_time_days?: number | null
          order_by_date?: string | null
          order_status?: string | null
          estimated_cost?: number | null
          supplier_name?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      photos: {
        Row: {
          id: string
          project_id: string
          task_id: string | null
          stage_id: string | null
          storage_path: string
          file_name: string
          file_size: number | null
          taken_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          task_id?: string | null
          stage_id?: string | null
          storage_path: string
          file_name: string
          file_size?: number | null
          taken_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          task_id?: string | null
          stage_id?: string | null
          storage_path?: string
          file_name?: string
          file_size?: number | null
          taken_at?: string | null
          created_at?: string
        }
      }
      documents: {
        Row: {
          id: string
          project_id: string
          task_id: string | null
          stage_id: string | null
          storage_path: string
          file_name: string
          file_type: string | null
          file_size: number | null
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          task_id?: string | null
          stage_id?: string | null
          storage_path: string
          file_name: string
          file_type?: string | null
          file_size?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          task_id?: string | null
          stage_id?: string | null
          storage_path?: string
          file_name?: string
          file_type?: string | null
          file_size?: number | null
          created_at?: string
        }
      }
      push_subscriptions: {
        Row: {
          id: string
          user_id: string
          endpoint: string
          p256dh: string
          auth_key: string
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          endpoint: string
          p256dh: string
          auth_key: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          endpoint?: string
          p256dh?: string
          auth_key?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      notification_preferences: {
        Row: {
          user_id: string
          order_deadlines: boolean
          overdue_tasks: boolean
          cascade_summaries: boolean
          order_warning_days: number
          updated_at: string
        }
        Insert: {
          user_id: string
          order_deadlines?: boolean
          overdue_tasks?: boolean
          cascade_summaries?: boolean
          order_warning_days?: number
          updated_at?: string
        }
        Update: {
          user_id?: string
          order_deadlines?: boolean
          overdue_tasks?: boolean
          cascade_summaries?: boolean
          order_warning_days?: number
          updated_at?: string
        }
      }
      shift_alerts: {
        Row: {
          id: string
          project_id: string
          user_id: string
          entity_type: string
          entity_id: string
          entity_name: string
          change_type: string
          old_value: string | null
          new_value: string | null
          dismissed: boolean
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          user_id: string
          entity_type: string
          entity_id: string
          entity_name: string
          change_type: string
          old_value?: string | null
          new_value?: string | null
          dismissed?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          user_id?: string
          entity_type?: string
          entity_id?: string
          entity_name?: string
          change_type?: string
          old_value?: string | null
          new_value?: string | null
          dismissed?: boolean
          created_at?: string
        }
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}
