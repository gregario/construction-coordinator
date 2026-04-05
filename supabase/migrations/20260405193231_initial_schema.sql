-- ============================================================
-- Construction Coordinator — Initial Schema
-- ============================================================

-- ============================================================
-- TABLES
-- ============================================================

-- projects: one per user (owner-builder)
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT,
  start_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'setup' CHECK (status IN ('setup', 'active', 'complete')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- stages: ordered phases of the build
CREATE TABLE stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#8B5E3C',
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- trades: subcontractor contacts
CREATE TABLE trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  specialty TEXT,
  phone TEXT,
  email TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- tasks: individual work items within a stage
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  stage_id UUID NOT NULL REFERENCES stages(id) ON DELETE CASCADE,
  trade_id UUID REFERENCES trades(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  duration_days INTEGER NOT NULL DEFAULT 1 CHECK (duration_days > 0),
  planned_start DATE NOT NULL,
  planned_end DATE NOT NULL,
  actual_end DATE,
  status TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'complete', 'delayed')),
  order_index INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- task_dependencies: DAG relationships between tasks
CREATE TABLE task_dependencies (
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  depends_on_task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  PRIMARY KEY (task_id, depends_on_task_id),
  CHECK (task_id != depends_on_task_id)
);

-- materials: items needed for a task, with lead times
CREATE TABLE materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  quantity TEXT,
  lead_time_days INTEGER NOT NULL DEFAULT 0 CHECK (lead_time_days >= 0),
  order_by_date DATE,
  order_status TEXT NOT NULL DEFAULT 'not_ordered' CHECK (order_status IN ('not_ordered', 'ordered', 'delivered')),
  estimated_cost NUMERIC(10,2),
  supplier_name TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- photos: site progress photos attached to task or stage
CREATE TABLE photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  stage_id UUID REFERENCES stages(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  taken_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- documents: PDFs and documents attached to task or stage
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  stage_id UUID REFERENCES stages(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- push_subscriptions: Web Push subscription objects per device
CREATE TABLE push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth_key TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- notification_preferences: per-user notification settings
CREATE TABLE notification_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  order_deadlines BOOLEAN NOT NULL DEFAULT true,
  overdue_tasks BOOLEAN NOT NULL DEFAULT true,
  cascade_summaries BOOLEAN NOT NULL DEFAULT true,
  order_warning_days INTEGER NOT NULL DEFAULT 3 CHECK (order_warning_days BETWEEN 1 AND 14),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- shift_alerts: tracks schedule changes since last briefing visit
CREATE TABLE shift_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('task', 'material')),
  entity_id UUID NOT NULL,
  entity_name TEXT NOT NULL,
  change_type TEXT NOT NULL CHECK (change_type IN ('date_moved', 'status_changed')),
  old_value TEXT,
  new_value TEXT,
  dismissed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX idx_stages_project_id ON stages(project_id);
CREATE INDEX idx_stages_order ON stages(project_id, order_index);
CREATE INDEX idx_tasks_project_id ON tasks(project_id);
CREATE INDEX idx_tasks_stage_id ON tasks(stage_id);
CREATE INDEX idx_tasks_status ON tasks(project_id, status);
CREATE INDEX idx_tasks_planned_start ON tasks(project_id, planned_start);
CREATE INDEX idx_materials_task_id ON materials(task_id);
CREATE INDEX idx_materials_order_by ON materials(order_by_date) WHERE order_status = 'not_ordered';
CREATE INDEX idx_photos_project ON photos(project_id);
CREATE INDEX idx_photos_task ON photos(task_id);
CREATE INDEX idx_photos_stage ON photos(stage_id);
CREATE INDEX idx_documents_task ON documents(task_id);
CREATE INDEX idx_shift_alerts_user ON shift_alerts(user_id, project_id, dismissed);
CREATE INDEX idx_push_subscriptions_user ON push_subscriptions(user_id);

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_stages_updated_at
  BEFORE UPDATE ON stages
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_trades_updated_at
  BEFORE UPDATE ON trades
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_materials_updated_at
  BEFORE UPDATE ON materials
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_push_subscriptions_updated_at
  BEFORE UPDATE ON push_subscriptions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_notification_preferences_updated_at
  BEFORE UPDATE ON notification_preferences
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_alerts ENABLE ROW LEVEL SECURITY;

-- projects: direct ownership check
CREATE POLICY "projects: owner select" ON projects FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "projects: owner insert" ON projects FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "projects: owner update" ON projects FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "projects: owner delete" ON projects FOR DELETE USING (user_id = auth.uid());

-- stages: join to projects
CREATE POLICY "stages: owner select" ON stages FOR SELECT USING (
  EXISTS (SELECT 1 FROM projects WHERE projects.id = stages.project_id AND projects.user_id = auth.uid())
);
CREATE POLICY "stages: owner insert" ON stages FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM projects WHERE projects.id = stages.project_id AND projects.user_id = auth.uid())
);
CREATE POLICY "stages: owner update" ON stages FOR UPDATE USING (
  EXISTS (SELECT 1 FROM projects WHERE projects.id = stages.project_id AND projects.user_id = auth.uid())
);
CREATE POLICY "stages: owner delete" ON stages FOR DELETE USING (
  EXISTS (SELECT 1 FROM projects WHERE projects.id = stages.project_id AND projects.user_id = auth.uid())
);

-- trades: join to projects
CREATE POLICY "trades: owner select" ON trades FOR SELECT USING (
  EXISTS (SELECT 1 FROM projects WHERE projects.id = trades.project_id AND projects.user_id = auth.uid())
);
CREATE POLICY "trades: owner insert" ON trades FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM projects WHERE projects.id = trades.project_id AND projects.user_id = auth.uid())
);
CREATE POLICY "trades: owner update" ON trades FOR UPDATE USING (
  EXISTS (SELECT 1 FROM projects WHERE projects.id = trades.project_id AND projects.user_id = auth.uid())
);
CREATE POLICY "trades: owner delete" ON trades FOR DELETE USING (
  EXISTS (SELECT 1 FROM projects WHERE projects.id = trades.project_id AND projects.user_id = auth.uid())
);

-- tasks: join to projects
CREATE POLICY "tasks: owner select" ON tasks FOR SELECT USING (
  EXISTS (SELECT 1 FROM projects WHERE projects.id = tasks.project_id AND projects.user_id = auth.uid())
);
CREATE POLICY "tasks: owner insert" ON tasks FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM projects WHERE projects.id = tasks.project_id AND projects.user_id = auth.uid())
);
CREATE POLICY "tasks: owner update" ON tasks FOR UPDATE USING (
  EXISTS (SELECT 1 FROM projects WHERE projects.id = tasks.project_id AND projects.user_id = auth.uid())
);
CREATE POLICY "tasks: owner delete" ON tasks FOR DELETE USING (
  EXISTS (SELECT 1 FROM projects WHERE projects.id = tasks.project_id AND projects.user_id = auth.uid())
);

-- task_dependencies: covered via tasks RLS, but enable RLS for completeness
CREATE POLICY "task_dependencies: owner select" ON task_dependencies FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM tasks
    JOIN projects ON projects.id = tasks.project_id
    WHERE tasks.id = task_dependencies.task_id AND projects.user_id = auth.uid()
  )
);
CREATE POLICY "task_dependencies: owner insert" ON task_dependencies FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM tasks
    JOIN projects ON projects.id = tasks.project_id
    WHERE tasks.id = task_dependencies.task_id AND projects.user_id = auth.uid()
  )
);
CREATE POLICY "task_dependencies: owner delete" ON task_dependencies FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM tasks
    JOIN projects ON projects.id = tasks.project_id
    WHERE tasks.id = task_dependencies.task_id AND projects.user_id = auth.uid()
  )
);

-- materials: join through tasks to projects
CREATE POLICY "materials: owner select" ON materials FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM tasks
    JOIN projects ON projects.id = tasks.project_id
    WHERE tasks.id = materials.task_id AND projects.user_id = auth.uid()
  )
);
CREATE POLICY "materials: owner insert" ON materials FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM tasks
    JOIN projects ON projects.id = tasks.project_id
    WHERE tasks.id = materials.task_id AND projects.user_id = auth.uid()
  )
);
CREATE POLICY "materials: owner update" ON materials FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM tasks
    JOIN projects ON projects.id = tasks.project_id
    WHERE tasks.id = materials.task_id AND projects.user_id = auth.uid()
  )
);
CREATE POLICY "materials: owner delete" ON materials FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM tasks
    JOIN projects ON projects.id = tasks.project_id
    WHERE tasks.id = materials.task_id AND projects.user_id = auth.uid()
  )
);

-- photos: join to projects
CREATE POLICY "photos: owner select" ON photos FOR SELECT USING (
  EXISTS (SELECT 1 FROM projects WHERE projects.id = photos.project_id AND projects.user_id = auth.uid())
);
CREATE POLICY "photos: owner insert" ON photos FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM projects WHERE projects.id = photos.project_id AND projects.user_id = auth.uid())
);
CREATE POLICY "photos: owner delete" ON photos FOR DELETE USING (
  EXISTS (SELECT 1 FROM projects WHERE projects.id = photos.project_id AND projects.user_id = auth.uid())
);

-- documents: join to projects
CREATE POLICY "documents: owner select" ON documents FOR SELECT USING (
  EXISTS (SELECT 1 FROM projects WHERE projects.id = documents.project_id AND projects.user_id = auth.uid())
);
CREATE POLICY "documents: owner insert" ON documents FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM projects WHERE projects.id = documents.project_id AND projects.user_id = auth.uid())
);
CREATE POLICY "documents: owner delete" ON documents FOR DELETE USING (
  EXISTS (SELECT 1 FROM projects WHERE projects.id = documents.project_id AND projects.user_id = auth.uid())
);

-- push_subscriptions: direct user ownership
CREATE POLICY "push_subscriptions: owner select" ON push_subscriptions FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "push_subscriptions: owner insert" ON push_subscriptions FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "push_subscriptions: owner update" ON push_subscriptions FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "push_subscriptions: owner delete" ON push_subscriptions FOR DELETE USING (user_id = auth.uid());

-- notification_preferences: direct user ownership
CREATE POLICY "notification_preferences: owner select" ON notification_preferences FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "notification_preferences: owner insert" ON notification_preferences FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "notification_preferences: owner update" ON notification_preferences FOR UPDATE USING (user_id = auth.uid());

-- shift_alerts: direct user ownership
CREATE POLICY "shift_alerts: owner select" ON shift_alerts FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "shift_alerts: owner insert" ON shift_alerts FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "shift_alerts: owner update" ON shift_alerts FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "shift_alerts: owner delete" ON shift_alerts FOR DELETE USING (user_id = auth.uid());

-- ============================================================
-- CASCADE ENGINE
-- ============================================================

CREATE OR REPLACE FUNCTION cascade_task_dates(
  p_task_id UUID,
  p_new_planned_start DATE,
  p_new_planned_end DATE
) RETURNS TABLE(
  task_id UUID,
  task_name TEXT,
  old_planned_start DATE,
  old_planned_end DATE,
  new_planned_start DATE,
  new_planned_end DATE
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_delta INTEGER;
BEGIN
  v_delta := p_new_planned_end - (SELECT planned_end FROM tasks WHERE id = p_task_id);

  -- If no change in end date, just update start and return
  IF v_delta = 0 THEN
    UPDATE tasks SET
      planned_start = p_new_planned_start,
      updated_at = NOW()
    WHERE id = p_task_id;
    RETURN;
  END IF;

  -- Return the downstream tasks that will be affected (before update)
  RETURN QUERY
  WITH RECURSIVE downstream AS (
    -- Seed: direct dependents of the changed task
    SELECT td.task_id AS t_id
    FROM task_dependencies td
    WHERE td.depends_on_task_id = p_task_id

    UNION

    -- Recurse: dependents of dependents
    SELECT td.task_id
    FROM task_dependencies td
    JOIN downstream d ON td.depends_on_task_id = d.t_id
  ),
  changes AS (
    SELECT
      t.id,
      t.name,
      t.planned_start AS old_start,
      t.planned_end AS old_end,
      (t.planned_start + v_delta) AS new_start,
      (t.planned_end + v_delta) AS new_end
    FROM tasks t
    WHERE t.id IN (SELECT t_id FROM downstream)
  )
  SELECT
    c.id,
    c.name,
    c.old_start,
    c.old_end,
    c.new_start,
    c.new_end
  FROM changes c;

  -- Update the trigger task itself
  UPDATE tasks SET
    planned_start = p_new_planned_start,
    planned_end = p_new_planned_end,
    updated_at = NOW()
  WHERE id = p_task_id;

  -- Update all downstream tasks
  UPDATE tasks SET
    planned_start = planned_start + v_delta,
    planned_end = planned_end + v_delta,
    updated_at = NOW()
  WHERE id IN (
    SELECT t_id FROM (
      WITH RECURSIVE downstream AS (
        SELECT td.task_id AS t_id
        FROM task_dependencies td
        WHERE td.depends_on_task_id = p_task_id
        UNION
        SELECT td.task_id
        FROM task_dependencies td
        JOIN downstream d ON td.depends_on_task_id = d.t_id
      )
      SELECT t_id FROM downstream
    ) sub
  );

  -- Recalculate material order_by_dates for all affected tasks
  UPDATE materials SET
    order_by_date = (
      SELECT t.planned_start - materials.lead_time_days
      FROM tasks t WHERE t.id = materials.task_id
    ),
    updated_at = NOW()
  WHERE task_id IN (
    SELECT t_id FROM (
      WITH RECURSIVE downstream AS (
        SELECT td.task_id AS t_id
        FROM task_dependencies td
        WHERE td.depends_on_task_id = p_task_id
        UNION
        SELECT td.task_id
        FROM task_dependencies td
        JOIN downstream d ON td.depends_on_task_id = d.t_id
      )
      SELECT t_id FROM downstream
    ) sub
  );

  -- Also recalculate order_by_date for the trigger task's own materials
  UPDATE materials SET
    order_by_date = p_new_planned_start - materials.lead_time_days,
    updated_at = NOW()
  WHERE task_id = p_task_id;

END;
$$;
