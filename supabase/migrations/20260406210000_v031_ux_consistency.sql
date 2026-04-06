-- ============================================================
-- v0.3.1 — UX Consistency & Multi-Project
-- ============================================================

-- ============================================================
-- 1. FIX: cascade_task_dates ambiguous column reference
-- Qualify all column references to avoid ambiguity between
-- function return columns (task_id) and table columns (td.task_id).
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
  v_delta := p_new_planned_end - (SELECT t.planned_end FROM tasks t WHERE t.id = p_task_id);

  IF v_delta = 0 THEN
    UPDATE tasks t SET
      planned_start = p_new_planned_start,
      updated_at = NOW()
    WHERE t.id = p_task_id;
    RETURN;
  END IF;

  RETURN QUERY
  WITH RECURSIVE downstream AS (
    SELECT dep.task_id AS t_id
    FROM task_dependencies dep
    WHERE dep.depends_on_task_id = p_task_id

    UNION

    SELECT dep2.task_id AS t_id
    FROM task_dependencies dep2
    JOIN downstream d ON dep2.depends_on_task_id = d.t_id
  ),
  changes AS (
    SELECT
      t.id AS c_id,
      t.name AS c_name,
      t.planned_start AS c_old_start,
      t.planned_end AS c_old_end,
      (t.planned_start + v_delta) AS c_new_start,
      (t.planned_end + v_delta) AS c_new_end
    FROM tasks t
    WHERE t.id IN (SELECT ds.t_id FROM downstream ds)
  )
  SELECT
    c.c_id,
    c.c_name,
    c.c_old_start,
    c.c_old_end,
    c.c_new_start,
    c.c_new_end
  FROM changes c;

  -- Update the trigger task
  UPDATE tasks t SET
    planned_start = p_new_planned_start,
    planned_end = p_new_planned_end,
    updated_at = NOW()
  WHERE t.id = p_task_id;

  -- Update all downstream tasks
  UPDATE tasks t SET
    planned_start = t.planned_start + v_delta,
    planned_end = t.planned_end + v_delta,
    updated_at = NOW()
  WHERE t.id IN (
    WITH RECURSIVE downstream AS (
      SELECT dep.task_id AS t_id
      FROM task_dependencies dep
      WHERE dep.depends_on_task_id = p_task_id
      UNION
      SELECT dep2.task_id AS t_id
      FROM task_dependencies dep2
      JOIN downstream d ON dep2.depends_on_task_id = d.t_id
    )
    SELECT ds.t_id FROM downstream ds
  );

  -- Recalculate material order_by_dates for downstream tasks
  UPDATE materials m SET
    order_by_date = (
      SELECT t.planned_start - m.lead_time_days
      FROM tasks t WHERE t.id = m.task_id
    ),
    updated_at = NOW()
  WHERE m.task_id IN (
    WITH RECURSIVE downstream AS (
      SELECT dep.task_id AS t_id
      FROM task_dependencies dep
      WHERE dep.depends_on_task_id = p_task_id
      UNION
      SELECT dep2.task_id AS t_id
      FROM task_dependencies dep2
      JOIN downstream d ON dep2.depends_on_task_id = d.t_id
    )
    SELECT ds.t_id FROM downstream ds
  );

  -- Recalculate order_by_date for the trigger task's own materials
  UPDATE materials m SET
    order_by_date = p_new_planned_start - m.lead_time_days,
    updated_at = NOW()
  WHERE m.task_id = p_task_id;

END;
$$;

-- ============================================================
-- 2. ADD delay_reason column to tasks
-- ============================================================

ALTER TABLE tasks ADD COLUMN delay_reason TEXT;

-- ============================================================
-- 3. CASCADE PREVIEW function (read-only, no side effects)
-- Returns what WOULD happen if a task's end date shifted,
-- without actually applying any changes.
-- ============================================================

CREATE OR REPLACE FUNCTION preview_cascade(
  p_task_id UUID,
  p_delay_days INTEGER
) RETURNS TABLE(
  affected_task_id UUID,
  affected_task_name TEXT,
  current_planned_start DATE,
  current_planned_end DATE,
  new_planned_start DATE,
  new_planned_end DATE,
  delta_days INTEGER
)
LANGUAGE plpgsql
STABLE  -- no side effects
AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE downstream AS (
    SELECT dep.task_id AS t_id
    FROM task_dependencies dep
    WHERE dep.depends_on_task_id = p_task_id
    UNION
    SELECT dep2.task_id AS t_id
    FROM task_dependencies dep2
    JOIN downstream d ON dep2.depends_on_task_id = d.t_id
  )
  -- Include the trigger task itself
  SELECT
    t.id,
    t.name,
    t.planned_start,
    t.planned_end,
    (t.planned_start + p_delay_days),
    (t.planned_end + p_delay_days),
    p_delay_days
  FROM tasks t
  WHERE t.id = p_task_id

  UNION ALL

  SELECT
    t.id,
    t.name,
    t.planned_start,
    t.planned_end,
    (t.planned_start + p_delay_days),
    (t.planned_end + p_delay_days),
    p_delay_days
  FROM tasks t
  WHERE t.id IN (SELECT ds.t_id FROM downstream ds);
END;
$$;
