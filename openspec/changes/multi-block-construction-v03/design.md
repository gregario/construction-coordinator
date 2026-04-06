## Context

Self-Build Manager (v0.2.0) is a Next.js + Supabase PWA for owner-builders managing residential construction. The current data model is flat: `project → stages → tasks → materials`. It was built by the Rouge autonomous system with 3 monolithic Irish residential templates.

User feedback from an active owner-builder reveals the model doesn't match real construction: builds have multiple blocks/buildings, each with standard construction scheme categories (Foundation, Framing, 1st Fix, etc.), and the industry uses "stages and substages" not "tasks." The setup flow needs composable method selection instead of monolithic templates, and several views are unfinished placeholders.

Current schema: 12 tables (projects, stages, tasks, task_dependencies, materials, trades, photos, documents, push_subscriptions, notification_preferences, shift_alerts, templates). Cascade engine uses a PostgreSQL recursive CTE function. 525+ tests, deployed on Vercel.

## Goals / Non-Goals

**Goals:**
- Introduce blocks/buildings as a layer between projects and stages
- Replace monolithic templates with composable per-category method selection
- Support block-level scheduling (parallel vs sequential per stage category)
- Rename "tasks" to "substages" across all UI
- Build real Stages tab, Settings panels, snag list, building control photos, procurement workflow
- Migrate existing data and templates without breaking existing projects

**Non-Goals:**
- Multi-user collaboration (deferred to M2)
- Budget tracking (deferred to M2)
- Native mobile app
- Weather integration or constraint-aware cascade
- Trade availability/conflict detection
- Crowdsourced template generation from user data (future work)

## Decisions

### D1: Blocks table with nullable block_id on stages

Add a `blocks` table. Add `block_id UUID REFERENCES blocks(id)` to `stages` — nullable for backward compatibility with any existing projects that predate blocks.

**Migration strategy**: Create a default block ("Main Building") for existing projects and assign all their stages to it.

**Alternative considered**: Making block_id required immediately. Rejected because it complicates the migration and risks breaking the cascade engine mid-flight.

### D2: Composable templates as structured JSON per category

Replace the single `templates` table with a `construction_methods` table:
```
construction_methods (
  id, category TEXT, method_name TEXT, variant TEXT NULL,
  substages JSONB, default_duration_days INT
)
```

Categories: `foundation`, `structure`, `envelope_walls`, `envelope_roof`, `doors_windows`, `first_fix`, `second_fix`, `finishing`, `external`.

Each row is one method option (e.g., category=`structure`, method_name=`Timber Frame`, variant=`Off-Site Manufacture`).

The setup flow presents a picker per category. User selections are stored on the block as a `construction_scheme JSONB` column mapping category → method_id.

**Alternative considered**: Keeping a monolithic template system with more templates. Rejected because it creates combinatorial explosion (5 structures × 3 foundations × 4 envelopes = 60+ templates).

### D3: Block sequencing stored on stages

Add to stages: `scheduling_mode TEXT DEFAULT 'sequential'` (values: `parallel`, `sequential`) and `block_sequence INTEGER[]` (ordered array of block IDs for sequential mode). This lives at the stage-category level, scoped to the project.

Actually, sequencing is per stage category across blocks, not per individual stage. Better approach: a `stage_category_scheduling` table or a JSONB column on the project.

**Decision**: Add `scheduling_config JSONB` to `projects` table:
```json
{
  "foundation": { "mode": "parallel" },
  "framing": { "mode": "sequential", "block_order": ["block-uuid-1", "block-uuid-2"] }
}
```

This keeps it simple — one place to read/write, no extra table.

### D4: Snags as a first-class entity

New `snags` table:
```
snags (
  id, project_id, block_id NULL, stage_id NULL, trade_id NULL,
  title TEXT, description TEXT, priority TEXT CHECK (low/medium/high/critical),
  status TEXT CHECK (open/in_progress/resolved),
  resolved_at TIMESTAMPTZ NULL,
  created_at, updated_at
)
```

Snag photos use the existing `photos` table with a new nullable `snag_id` FK. This avoids a separate photo system for snags.

### D5: Procurement state machine expansion

Current material status: `not_ordered → ordered → delivered` (3 states).

New: `not_quoted → quoted → ordered → in_transit → delivered` (5 states). Add fields:
- `quoted_price NUMERIC(10,2)` — price from quote
- `quoted_at TIMESTAMPTZ` — when quote received
- `ordered_at TIMESTAMPTZ` — when ordered
- `delivered_at TIMESTAMPTZ` — when delivered
- `tracking_reference TEXT` — delivery tracking

**Breaking**: Existing `not_ordered` status maps to `not_quoted`. Migration updates existing rows.

### D6: Building control photo tags

Add `tag TEXT` column to photos with values like `building_control`, `progress`, `snag`, `general`. Add `inspection_stage TEXT` nullable column for building control photos (e.g., "foundation_inspection", "pre_plaster", "completion").

### D7: UI terminology — "substages" not "tasks"

All user-facing text changes from "task/tasks" to "substage/substages". The database column `tasks` table name stays as-is (renaming a table is high-risk for no user benefit). Only UI labels, navigation items, and component display text change.

### D8: Stages tab and schedule layout

The `/stages` page becomes the primary stage/substage browser:
- Groups by block, then by stage category
- Each stage expands to show substages with inline status and dates
- Inline editing for substage properties
- This replaces the current placeholder

On `/schedule`, the StageManager component moves above the GanttChart component (currently below). Stage category nav becomes a horizontal tab/filter bar above the Gantt.

## Risks / Trade-offs

- **Data migration complexity** → Mitigated by nullable `block_id` and a migration script that creates default blocks for existing projects. Rollback: revert migration, restore from Supabase point-in-time recovery.
- **Cascade engine changes** → The recursive CTE must now respect block boundaries and sequencing config. Risk of schedule calculation bugs. Mitigated by comprehensive test coverage of the cascade function.
- **Composable templates increase setup friction** → Users must make more choices. Mitigated by sensible defaults (pre-select most common Irish options) and "Apply same to all blocks" shortcut.
- **Terminology rename is pervasive** → Touching every component risks regressions. Mitigated by doing it as a focused sweep in Phase 1 before other changes, and running full test suite after.
- **Snag photos sharing the photos table** → Adding `snag_id` FK makes the photos table wider. Acceptable — it's one nullable column, and keeps photo storage unified.

## Migration Plan

1. **Database migration** (single Supabase migration file):
   - Create `blocks` table
   - Add `block_id` to `stages` (nullable)
   - Create `construction_methods` seed table
   - Create `snags` table
   - Add procurement columns to `materials`
   - Add photo tag columns
   - Add `scheduling_config` to `projects`
   - Data migration: create default block per existing project, assign stages

2. **Rollback**: Supabase point-in-time recovery to pre-migration state. Git revert to `ed387d7` (current v0.2.0).

3. **Deploy order**: Database migration first, then app deploy. The app changes are backwards-compatible during migration (nullable block_id means old data still works).

## Open Questions

1. Should "External" (the 8th stage category) have default substages, or is it always user-defined?
2. For block sequencing, should the Gantt chart visually group by block or by stage category? (Likely needs both views — toggle.)
3. Should snag priority affect scheduling (e.g., critical snag blocks stage completion)?
