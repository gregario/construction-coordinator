## 1. Database Schema — Blocks & Core Tables

- [ ] 1.1 Create `blocks` table (id, project_id, name, attachment_type, storeys, order_index, created_at, updated_at) with RLS policies
- [ ] 1.2 Add `block_id UUID REFERENCES blocks(id)` nullable column to `stages` table
- [ ] 1.3 Create `snags` table (id, project_id, block_id, stage_id, trade_id, title, description, priority, status, resolved_at, created_at, updated_at) with RLS policies
- [ ] 1.4 Add `snag_id UUID REFERENCES snags(id)` nullable column to `photos` table
- [ ] 1.5 Add `tag TEXT DEFAULT 'general'` and `inspection_stage TEXT` columns to `photos` table
- [ ] 1.6 Add `scheduling_config JSONB DEFAULT '{}'` column to `projects` table

## 2. Database Schema — Procurement & Templates

- [ ] 2.1 Add procurement columns to `materials`: `quoted_price`, `quoted_at`, `ordered_at`, `delivered_at`, `tracking_reference`
- [ ] 2.2 Alter `materials.order_status` CHECK constraint to allow: `not_quoted`, `quoted`, `ordered`, `in_transit`, `delivered`
- [ ] 2.3 Migrate existing materials: `not_ordered` → `not_quoted`
- [ ] 2.4 Create `construction_methods` table (id, category, method_name, variant, substages JSONB, default_duration_days, created_at)
- [ ] 2.5 Seed construction methods for all categories: Foundation (4 methods), Structure (5 methods), Doors & Windows, Envelope Walls (4), Envelope Roof (3), 1st Fix, 2nd Fix, Finishing, External
- [ ] 2.6 Add `construction_scheme JSONB` column to `blocks` table for storing method selections per category

## 3. Data Migration — Existing Projects

- [ ] 3.1 Write migration script: create default "Main Building" block for each existing project
- [ ] 3.2 Assign all existing stages to their project's default block (set block_id)
- [ ] 3.3 Verify cascade engine still works with block_id present (run existing test suite)

## 4. Terminology Rename — UI Copy

- [ ] 4.1 Rename "Tasks" to "Substages" in AppShell navigation
- [ ] 4.2 Rename "task/tasks" to "substage/substages" in StageTasksManager component labels and buttons
- [ ] 4.3 Rename in GanttChart detail panel labels
- [ ] 4.4 Rename in DailyBriefing component ("Today's Substages")
- [ ] 4.5 Rename in CustomizationScreen and TemplateBrowser labels
- [ ] 4.6 Rename in all page headers and descriptions (/stages, /schedule, /tasks/[id])
- [ ] 4.7 Run full test suite and fix any broken assertions due to text changes

## 5. Block Management UI

- [ ] 5.1 Create BlockManager component (list blocks, add/edit/delete with name, attached/detached, storeys)
- [ ] 5.2 Create server actions for blocks CRUD (createBlock, updateBlock, deleteBlock)
- [ ] 5.3 Add block creation step to /setup flow (after project creation, before scheme selection)
- [ ] 5.4 Update /setup to create default "Main Building" block on project creation

## 6. Composable Template Setup Flow

- [ ] 6.1 Create MethodPicker component — step-through UI for each category showing available methods
- [ ] 6.2 Create server action to load construction methods by category
- [ ] 6.3 Create server action to apply selected methods to a block (generate stages + substages from method substages JSONB)
- [ ] 6.4 Replace TemplateBrowser with MethodPicker in /setup flow (after block creation)
- [ ] 6.5 Implement "Apply same scheme to other blocks" flow — copy selections and generated substages
- [ ] 6.6 Implement "Edit for this block" flow — pre-fill with previous block's selections as defaults
- [ ] 6.7 Remove or archive old monolithic templates table (keep migration backward-compatible)

## 7. Block Sequencing

- [ ] 7.1 Create SequencingConfig component — per-category parallel/sequential toggle with drag-to-reorder block list
- [ ] 7.2 Create server action to save scheduling_config JSONB on project
- [ ] 7.3 Add sequencing step to /setup flow (after all blocks have schemes)
- [ ] 7.4 Update cascade engine function to respect block sequencing constraints (sequential mode: ensure block N finishes before block N+1 starts for that category)
- [ ] 7.5 Write tests for cascade engine with parallel and sequential block configurations

## 8. Stages Tab — Real Implementation

- [ ] 8.1 Rebuild /stages page: fetch stages grouped by block, with substage counts and status summaries
- [ ] 8.2 Create StageAccordion component — expandable stage showing substages with status, dates, trade
- [ ] 8.3 Add inline substage editing within StageAccordion (name, dates, trade assignment)
- [ ] 8.4 Add block selector/filter at top of stages page
- [ ] 8.5 Implement back-navigation: return from /stages/[id] to /stages with parent stage expanded (use URL params or scroll restoration)

## 9. Schedule Page Layout

- [ ] 9.1 Move StageManager above GanttChart in /schedule page layout
- [ ] 9.2 Convert stage navigation to horizontal tab/filter bar above Gantt
- [ ] 9.3 Add block filter to schedule view (view one block's Gantt or all blocks)
- [ ] 9.4 Update Gantt to visually separate blocks (block headers or color-coded grouping)

## 10. Settings — Project Details & Account

- [ ] 10.1 Create ProjectDetailsForm component (edit name, address, view block/scheme summary)
- [ ] 10.2 Create server actions for updateProject (name, address)
- [ ] 10.3 Replace project details placeholder in /settings with ProjectDetailsForm
- [ ] 10.4 Create AccountSection component (display email, sign out button, change password form)
- [ ] 10.5 Create server action for password change (Supabase auth.updateUser)
- [ ] 10.6 Replace account placeholder in /settings with AccountSection

## 11. Snag List

- [ ] 11.1 Create server actions for snags CRUD (createSnag, updateSnag, listSnags)
- [ ] 11.2 Create SnagList component — grouped by status (open, in_progress, resolved), with filters for block, stage, trade, priority
- [ ] 11.3 Create SnagDetail component — view/edit snag with photo gallery, status transition buttons
- [ ] 11.4 Create SnagForm component — create/edit snag (title, description, priority, block, stage, trade assignment)
- [ ] 11.5 Add snag photo upload (reuse existing photo upload, link via snag_id)
- [ ] 11.6 Add /snags route and navigation item in AppShell
- [ ] 11.7 Write tests for snag status workflow (open → in_progress → resolved, no backward transitions)

## 12. Building Control Photos

- [ ] 12.1 Add tag selector to photo upload flow (building_control, progress, snag, general)
- [ ] 12.2 Add inspection stage picker for building_control tagged photos
- [ ] 12.3 Add filter tabs to /photos page: All, Building Control, Progress, Snags
- [ ] 12.4 Group building control photos by inspection stage in the filtered view
- [ ] 12.5 Include photo tags and inspection stages in project data export

## 13. Procurement Workflow

- [ ] 13.1 Update MaterialStatusBadge component for 5 procurement states with distinct colors
- [ ] 13.2 Update material status transition UI (step-through: not_quoted → quoted → ordered → in_transit → delivered)
- [ ] 13.3 Add procurement fields to material edit form (quoted_price, tracking_reference)
- [ ] 13.4 Add procurement summary bar to /materials page (counts per status)
- [ ] 13.5 Update overdue warning logic: flag materials past order_by_date that are still not_quoted or quoted
- [ ] 13.6 Update daily briefing to show procurement status in material alerts
- [ ] 13.7 Write tests for procurement state transitions and overdue detection

## 14. Integration & Polish

- [ ] 14.1 Update project data export to include blocks, snags, procurement fields, and photo tags
- [ ] 14.2 Update daily briefing to scope by block when relevant
- [ ] 14.3 Verify push notifications work with new terminology and block context
- [ ] 14.4 Run full test suite — fix any regressions
- [ ] 14.5 Manual QA: walk through complete setup flow (create project → blocks → schemes → sequencing → active project)
