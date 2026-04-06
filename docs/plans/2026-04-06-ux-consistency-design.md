# v0.3.1 — UX Consistency & Multi-Project Design

**Date:** 2026-04-06
**Mode:** HOLD — Validate and tighten
**Base:** v0.3.0 deployed at construction-coordinator.vercel.app
**Branch:** TBD (feature/v031-ux-consistency)

## Context

v0.3.0 shipped multi-block construction model, composable templates, snags, building control photos, and 5-state procurement. Real user testing from an active owner-builder revealed consistency issues: the same entity navigates to different pages depending on where you click, the Gantt interaction model conflicts between viewing and editing, and single-project limits prevent testing the onboarding flow.

Product taste approved HOLD mode: tighten what exists, don't reimagine.

## Principles

1. **One entity, one destination.** Clicking a substage name → `/tasks/[id]` everywhere. Clicking a stage name → `/stages/[id]` everywhere. No exceptions.
2. **Gantt is a visual dashboard.** For SEEING the plan. Click to view details and link through. No dragging. Rescheduling happens via Log Delay on substage detail pages.
3. **Solve problems where you find them.** If a view shows a problem (overdue material, open snag), you should be able to act on it from that view.

## Changes

### 1. Fix cascade SQL bug (BLOCKING)

The `cascade_task_dates` PostgreSQL function uses ambiguous column references. Error: "column reference task_id is ambiguous." Fix by qualifying all column references with table aliases.

### 2. Gantt → read-only visual dashboard

**Remove:**
- All drag-to-move logic (handleMouseDown move mode, computeMoveResult, moveTaskDates calls)
- All drag-to-resize logic (handleMouseDown resize mode, computeResizeResult, updateTaskDuration calls)
- Grab/resize cursors
- DRAG_THRESHOLD_PX constant and hasDragged detection

**Keep:**
- Click to open TaskDetailPanel (sidebar)
- Zoom controls (Week/Month/Full)
- Jump to Today
- Dependency arrows
- Today line
- Stage color coding

**Change in TaskDetailPanel:**
- Rename "Edit Substage" → "View Details"
- Button navigates to `/tasks/[id]` (same as now, but label is clearer)
- Add brief summary: current dates, trade name, material count, status

### 3. Navigation consistency

**Stages accordion (`StagesAccordionView.tsx`):**
- Currently: substage row click → `/stages/[stageId]` (stage detail)
- Change to: substage row click → `/tasks/[substageId]` (substage detail)
- "Edit substages →" link at bottom stays → `/stages/[stageId]`

**Stage detail page (`/stages/[id]`):**
- Add "Details →" link on each substage card → `/tasks/[substageId]`
- Currently substage cards have no outbound link

**Briefing:** Already links to `/tasks/[id]`. No change needed.

### 4. Delay logger redesign

Since the Gantt is now read-only, Log Delay becomes THE way to reschedule. It must be exceptional.

**Current problems:**
- Asks for a date (user thinks in days)
- No preview before applying
- No reason field
- No context (current dates)

**New design:**

```
┌─────────────────────────────────────┐
│ Reschedule: [substage name]         │
│                                     │
│ Current: Jun 1 → Jun 10 (10 days)  │
│                                     │
│ Delay by: [-] [3] [+] days         │
│ New end:  Jun 13                    │
│                                     │
│ Reason: [________________________] │
│         (required)                  │
│                                     │
│ ⚡ Impact:                          │
│   8 substages shift +3 days        │
│   2 material order-by dates move   │
│   ⚠ 1 material becomes overdue    │
│                                     │
│ [Cancel]  [Apply Delay]             │
└─────────────────────────────────────┘
```

**Implementation:**
- Replace date picker with number stepper (delay by N days, min 1)
- Compute new end date live: `currentPlannedEnd + N days`
- Add `reason` field (required, textarea, max 500 chars)
- Add `reason` column to tasks table (or a `delay_logs` table)
- Live impact preview: call a new `previewCascade` server action that returns the cascade effect WITHOUT applying it. Debounce 300ms on stepper change.
- Show warning badge if any material order-by date would become overdue
- Post-cascade receipt modal stays (it's the confirmation/audit trail)

**Rename section:** "Delay" → "Reschedule" (more accurate — you're rescheduling, not just logging)

### 5. Multi-project support

**Database:**
- No schema changes needed. Projects table already supports multiple projects per user. The app currently just picks the most recent one.

**Project switcher (AppShell):**
- Replace static project name with clickable dropdown
- Dropdown shows: all user projects (name + status badge), divider, "+ New Project", "Archive" link to settings
- Clicking a project sets it as active (store in cookie/localStorage)
- All page queries already filter by project_id — they just need to read the active project from the switcher state instead of always picking the latest

**New project flow:**
- "+ New Project" from switcher → `/setup` (which already handles no-project state)
- After setup completes → new project becomes active, redirects to `/briefing`

**Archive/delete:**
- In Settings → Project Details: add "Archive Project" button
- Archived projects don't appear in the switcher
- No hard delete for now (data preservation)

### 6. Nav reorder

**Mobile bottom bar:** Briefing, Schedule, Stages, More

**More sheet (bottom sheet on mobile):**
- Materials
- Snags
- Trades
- Photos
- Settings

**Desktop sidebar:** All items visible (same as current, but reordered):
- Primary: Briefing, Schedule, Stages, Materials, Trades
- Divider
- Secondary: Snags, Photos, Settings

### 7. Materials click-to-action

**Current:** Rows are read-only. The pipeline bar has hover states but does nothing on click.

**Change:**
- Clicking a material row expands it inline with:
  - Status advancement button ("Mark Quoted", "Mark Ordered", etc.)
  - Quoted price field (editable inline)
  - Tracking reference field (editable inline)
  - Link to parent substage → `/tasks/[substageId]`
- Pipeline bar segments become clickable filters for the table below
- Remove hover states from pipeline bar if not clickable (currently misleading)

### 8. Snag photos

**Snag creation form (`SnagList.tsx`):**
- Add camera/file input after the description field
- Photo uploaded to Supabase storage with `snag_id` set
- Show thumbnail preview before save

**Snag detail (when built):**
- Photo gallery section (reuse existing `TaskPhotosManager` pattern)
- "Add Photo" button

### 9. StageManager position on Schedule page

Move StageManager back BELOW the Gantt chart. The Gantt is the primary content — view first, manage second.

## Implementation Order

Dependency-ordered. Each group can be committed independently.

### Group 1: Bugs & foundations
- [ ] 1.1 Fix cascade SQL ambiguous column bug
- [ ] 1.2 Add `reason` column to tasks (or create `delay_logs` table)
- [ ] 1.3 Add `active_project_id` cookie/localStorage helper

### Group 2: Gantt read-only
- [ ] 2.1 Remove all drag logic from GanttChart.tsx (move + resize handlers, cursors, threshold)
- [ ] 2.2 Keep click-to-open-panel, update panel label to "View Details"
- [ ] 2.3 Move StageManager below Gantt in schedule page

### Group 3: Navigation consistency
- [ ] 3.1 StagesAccordionView: substage row click → `/tasks/[id]`
- [ ] 3.2 Stage detail page: add "Details →" link on each substage card
- [ ] 3.3 Update TaskDetailPanel "Edit Substage" → "View Details"

### Group 4: Delay logger redesign
- [ ] 4.1 Replace date picker with day stepper (delay by N days)
- [ ] 4.2 Show current dates context in the form
- [ ] 4.3 Add reason field (required)
- [ ] 4.4 Create `previewCascade` server action (returns effect without applying)
- [ ] 4.5 Live impact preview with debounced cascade preview call
- [ ] 4.6 Overdue material warning in preview
- [ ] 4.7 Rename section "Delay" → "Reschedule"
- [ ] 4.8 Update tests for new delay flow

### Group 5: Multi-project
- [ ] 5.1 Create project switcher component (dropdown in AppShell)
- [ ] 5.2 Active project state (cookie or localStorage)
- [ ] 5.3 Update all page queries to use active project from switcher (not "most recent")
- [ ] 5.4 "+ New Project" from switcher → setup flow
- [ ] 5.5 Archive project from Settings
- [ ] 5.6 Update briefing/setup routing for multi-project

### Group 6: Nav reorder
- [ ] 6.1 Reorder bottom bar: Briefing, Schedule, Stages, More
- [ ] 6.2 Create More sheet (bottom sheet component with secondary nav items)
- [ ] 6.3 Update desktop sidebar order

### Group 7: Materials + Snags
- [ ] 7.1 Expandable material rows with status advancement + inline fields
- [ ] 7.2 Pipeline bar segments as clickable filters
- [ ] 7.3 Snag photo upload on creation form
- [ ] 7.4 Snag photo gallery on detail view

### Group 8: Polish & test
- [ ] 8.1 Full test suite pass
- [ ] 8.2 Verify all navigation paths (substage click → same destination everywhere)
- [ ] 8.3 Deploy and verify
