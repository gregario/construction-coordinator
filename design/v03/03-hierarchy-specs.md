# Information Hierarchy Specs — Self-Build Manager v0.3.0

PROJECT: Self-Build Manager
DATE: 2026-04-06

---

## SCREEN: Daily Briefing
URL: /briefing
PURPOSE: Show the owner-builder exactly where their build stands this morning — what's happening today, what's shifted, what needs ordering.

### CONTENT INVENTORY

| Element | Class | Rationale | Layout Implication |
|---------|-------|-----------|-------------------|
| Today's substages (checkable list with block labels) | PRIMARY | The reason they open the app. What do I need to do/check today? | Top of page, largest card, full width |
| Shift alerts (schedule changes since last visit) | PRIMARY | Things that moved without them knowing. High urgency. | Second card, amber/terracotta accents for attention |
| Upcoming material orders (next 7 days) | SECONDARY | Supports daily action — "do I need to call a supplier?" | Third card, below primaries |
| Open snag count (by priority) | SECONDARY | Quick awareness — "how many defects outstanding?" | Compact summary row beneath orders |
| Project name + date header | TERTIARY | Context, not actionable | Small text top of page |
| Greeting ("Good morning") | TERTIARY | Warmth, not information | Inline with header, small |
| Block filter (if >1 block) | TERTIARY | Power user — most check all blocks | Subtle toggle, top-right |

### HIERARCHY SUMMARY
Primary focus: Today's substage list (eye lands on checkboxes and block-tagged items)
Secondary band: Shift alerts + material orders (what needs attention beyond today's list)
Tertiary zone: Header, greeting, block filter (orientation, not action)

---

## SCREEN: Schedule
URL: /schedule
PURPOSE: Visual overview of the entire build timeline. Desktop planning surface for drag-editing dates and reviewing cascade impact.

### CONTENT INVENTORY

| Element | Class | Rationale | Layout Implication |
|---------|-------|-----------|-------------------|
| Gantt chart (bars, arrows, today-line) | PRIMARY | The reason they're on this page. Visual timeline. | Dominant, full width below nav, scrollable both axes |
| Stage category tabs (Foundation, Framing, ...) | PRIMARY | Filter/navigate the Gantt by construction phase | Horizontal tab bar directly above Gantt |
| Block filter (All / Block A / Garage / ...) | SECONDARY | Scope the view. Default "All". | Compact selector, left of stage tabs |
| Zoom controls (Week / Month / Full) | SECONDARY | Adjusts time scale | Small button group, right of stage tabs |
| Jump to Today button | TERTIARY | Quick navigation aid | Small button near zoom |
| Cascade impact panel (slide-in) | CONTEXTUAL | Only visible after a drag edit. Shows downstream shifts. | Right slide-in panel, overlays Gantt edge |

### HIERARCHY SUMMARY
Primary focus: Gantt bars — eye scans the timeline, locates today-line, reads bar positions
Secondary band: Stage tabs for filtering, block selector for scoping
Tertiary zone: Zoom, jump-to-today (tools, not content)

---

## SCREEN: Stages (Browser)
URL: /stages
PURPOSE: Browse and manage all stages and substages across blocks. Primary editing surface for substage properties.

### CONTENT INVENTORY

| Element | Class | Rationale | Layout Implication |
|---------|-------|-----------|-------------------|
| Block sections with stage accordions | PRIMARY | What they came to browse/edit. Grouped by block for orientation. | Full width, vertical stack. Block name as section header. |
| Substage list within expanded stage | PRIMARY | The actual items they edit (dates, status, trade) | Indented under stage accordion, table-like rows |
| Stage progress indicators (3/8 complete) | SECONDARY | Quick health check per stage | Right-aligned in stage header row |
| Block header (name, storeys, attached/detached) | SECONDARY | Context for which building | Section header with subtle metadata |
| Add substage button | SECONDARY | Action, but not the primary reason to visit | Bottom of substage list within each stage |
| Edit stage button (rename, reorder, delete) | TERTIARY | Infrequent action | Icon button in stage header, revealed on hover |

### HIERARCHY SUMMARY
Primary focus: Stage accordions → substage rows (scan blocks, expand stages, read/edit substages)
Secondary band: Progress indicators, block context, add buttons
Tertiary zone: Stage edit controls (hover-reveal)

---

## SCREEN: Setup — Construction Scheme Picker
URL: /setup (Step 3)
PURPOSE: Choose construction methods for each category of a block's build.

### CONTENT INVENTORY

| Element | Class | Rationale | Layout Implication |
|---------|-------|-----------|-------------------|
| Current category name + description | PRIMARY | What decision they're making right now | Top, large heading |
| Method option cards (2-5 per category) | PRIMARY | The choices. Each card = one method with name + brief description | Grid of cards, responsive 2-3 columns |
| Selected indicator (checkmark on card) | PRIMARY | Confirms current selection | Visual state on card, not a separate element |
| Category progress (Step 3 of 8) | SECONDARY | Orientation — how far through setup | Small breadcrumb/stepper above heading |
| Block name ("Setting up: Main Building") | SECONDARY | Which block this is for | Subtitle under heading |
| "Other" option with text input | SECONDARY | Escape hatch for unlisted methods | Last card in grid, expandable |
| Previous/Next navigation | TERTIARY | Navigation, not content | Bottom button bar, fixed |

### HIERARCHY SUMMARY
Primary focus: Method cards (eye scans options, reads descriptions, picks one)
Secondary band: Category context, block name, progress indicator
Tertiary zone: Navigation buttons (always there, not competing)

---

## SCREEN: Snag List
URL: /snags
PURPOSE: Track defects for subcontractors to fix. Evidence trail for quality control.

### CONTENT INVENTORY

| Element | Class | Rationale | Layout Implication |
|---------|-------|-----------|-------------------|
| Open snags list (title, priority badge, trade name, photo thumbnail) | PRIMARY | Active issues needing attention. Urgency drives this view. | Top section, largest. Cards or rows with priority color-coding |
| In-progress snags list | PRIMARY | Being worked on — user needs to follow up | Below open, same format, slightly less visual weight |
| Filter bar (block, stage, trade, priority) | SECONDARY | Power users managing many snags | Horizontal filter row below page header |
| Add Snag FAB (mobile) / button (desktop) | SECONDARY | Action trigger | FAB bottom-right (mobile), button top-right (desktop) |
| Resolved snags (collapsed by default) | TERTIARY | Historical record, not daily action | Collapsed accordion at bottom |
| Snag count summary ("5 open, 2 in progress, 12 resolved") | TERTIARY | Quick orientation | Subtitle under page header |

### HIERARCHY SUMMARY
Primary focus: Open + in-progress snag cards (scan titles, check priorities, see who's responsible)
Secondary band: Filters, add button
Tertiary zone: Resolved list (collapsed), count summary

---

## SCREEN: Materials / Procurement
URL: /materials
PURPOSE: Track procurement pipeline — what needs quoting, ordering, and when deliveries are due.

### CONTENT INVENTORY

| Element | Class | Rationale | Layout Implication |
|---------|-------|-----------|-------------------|
| Procurement pipeline summary (counts per status) | PRIMARY | Instant read on procurement health. "How many things need action?" | Top of page, horizontal status bar with counts |
| Overdue items (past order-by date, still not ordered) | PRIMARY | Urgent — these are blocking the schedule | Highlighted section below pipeline, red/amber badges |
| Material list (sortable table: name, substage, block, status, order-by date) | SECONDARY | Detailed view for review and action | Main content area, full-width table |
| Status filter tabs (All / Not Quoted / Quoted / Ordered / In Transit / Delivered) | SECONDARY | Narrow the view to one pipeline stage | Tab bar above table |
| Material detail (quoted price, tracking ref, timestamps) | CONTEXTUAL | Appears when a row is expanded/clicked | Expandable row or side panel |

### HIERARCHY SUMMARY
Primary focus: Pipeline counts + overdue alerts (eye hits the numbers first)
Secondary band: Full material table for detail work
Tertiary zone: Individual material details (on-demand)

---

## SCREEN: Photos
URL: /photos
PURPOSE: Visual record of the build, primarily for building control inspections.

### CONTENT INVENTORY

| Element | Class | Rationale | Layout Implication |
|---------|-------|-----------|-------------------|
| Photo grid (thumbnails) | PRIMARY | Visual browse. Thumbnails sized for quick scanning. | Grid layout, 3-4 columns desktop, 2-3 mobile |
| Tag filter tabs (All / Building Control / Progress / Snag) | PRIMARY | The key navigation — building control is the #1 use case | Tab bar directly below page header |
| Inspection stage groups (under Building Control tab) | SECONDARY | Groups photos by inspection stage when BC filter active | Section headers within grid |
| Upload button | SECONDARY | Action trigger | Top-right button (desktop), FAB (mobile) |
| Photo metadata (date, substage, block) | TERTIARY | On hover/tap, not always visible | Overlay on thumbnail hover |

### HIERARCHY SUMMARY
Primary focus: Photo grid (visual scanning) + filter tabs (which photos?)
Secondary band: Inspection stage groupings, upload action
Tertiary zone: Individual photo metadata

---

## SCREEN: Settings
URL: /settings
PURPOSE: Project configuration, account management, notification preferences, data export.

### CONTENT INVENTORY

| Element | Class | Rationale | Layout Implication |
|---------|-------|-----------|-------------------|
| Tab navigation (Project Details / Account / Notifications / Data) | PRIMARY | Choose what to configure | Horizontal tabs at top of page |
| Active tab content | PRIMARY | The configuration surface | Full width below tabs |
| Project Details: name, address, block summary | SECONDARY (within tab) | Editable fields + read-only summary | Form layout with edit buttons |
| Account: email, change password, sign out | SECONDARY (within tab) | Profile management | Simple form + action buttons |
| Notifications: toggles and preferences | SECONDARY (within tab) | Already exists, carry forward | Toggle list |
| Data: export buttons | SECONDARY (within tab) | Already exists, carry forward | Button group |

### HIERARCHY SUMMARY
Primary focus: Tab selection → active tab content
Secondary band: Individual settings within each tab
Tertiary zone: N/A (settings is inherently flat)
