# Component Mapping — Self-Build Manager v0.3.0

PROJECT: Self-Build Manager
DATE: 2026-04-06
STACK: shadcn/ui + Tailwind CSS + Radix UI + Recharts + Lucide React

---

## SCREEN: Setup Wizard — Step 2: Blocks

URL: /setup (Step 2)

### REGIONS

```
┌─────────────────────────────────────────────────────────┐
│ HEADER                                                   │
│  SetupStepper (Step 2 of 5 — "Blocks")                 │
│  Heading: "Add your buildings"                           │
│  Subtext: "Each block gets its own construction scheme"  │
├─────────────────────────────────────────────────────────┤
│ BLOCK LIST                                               │
│ ┌─────────────────────────────────────────────────┐     │
│ │ Card: "Main Building"                            │     │
│ │  Badge: "Attached" | "Detached"                  │     │
│ │  Text: "2 storeys"                               │     │
│ │  IconButton: Edit (Pencil) | Delete (Trash2)     │     │
│ └─────────────────────────────────────────────────┘     │
│ ┌─────────────────────────────────────────────────┐     │
│ │ Card: "Garage" (if added)                        │     │
│ │  ...same structure...                             │     │
│ └─────────────────────────────────────────────────┘     │
│                                                          │
│ [+ Add Block] — Button variant=outline, full-width      │
├─────────────────────────────────────────────────────────┤
│ ADD/EDIT BLOCK FORM (inline, appears below Add button)   │
│  Input: Block name                                       │
│  ToggleGroup: Attached | Detached                        │
│  NumberStepper: Storeys (1-5)                            │
│  [Cancel] [Save Block]                                   │
├─────────────────────────────────────────────────────────┤
│ FOOTER                                                   │
│  [← Back]  [Next →]                                      │
└─────────────────────────────────────────────────────────┘
```

### COMPONENTS

| Region | Component | Data | Interactions |
|--------|-----------|------|-------------|
| Header | Custom SetupStepper | step=2, total=5 | Visual only |
| Block List | Card + Badge + text | block.name, attachment, storeys | Edit/delete icon buttons |
| Add Form | Input + ToggleGroup + custom NumberStepper | form state | Save/cancel |
| Footer | Button × 2 | — | Navigate steps |

### 5-STATE DESIGN

| State | Behavior |
|-------|----------|
| Empty | Cannot happen — default "Main Building" always present |
| Loading | Skeleton: 1 card placeholder |
| Populated | Block cards, add button |
| Error | Toast if save fails, form stays open |
| Overflow | >5 blocks: scrollable list (rare, but handle gracefully) |

### ICONS
- `building-2` (18px) — block card icon
- `pencil` (16px) — edit block
- `trash-2` (16px) — delete block (destructive, red on hover)
- `plus` (16px) — add block button
- `arrow-left` / `arrow-right` (16px) — step navigation

---

## SCREEN: Setup Wizard — Step 3: Construction Scheme

URL: /setup (Step 3)

### REGIONS

```
┌─────────────────────────────────────────────────────────┐
│ HEADER                                                   │
│  SetupStepper (Step 3 of 5 — "Construction Scheme")     │
│  Subheading: "Setting up: Main Building"                 │
│  CategoryProgress: "Foundation (1 of 8)"                 │
├─────────────────────────────────────────────────────────┤
│ METHOD CARDS (grid: 2 cols desktop, 1 col mobile)        │
│ ┌────────────────┐  ┌────────────────┐                  │
│ │ ◉ Strip w/ Slab │  │ ○ Floated Slab │                  │
│ │ Traditional     │  │ Insulated raft  │                  │
│ │ strip footings  │  │ on grade        │                  │
│ │ with poured     │  │                 │                  │
│ │ slab            │  │                 │                  │
│ └────────────────┘  └────────────────┘                  │
│ ┌────────────────┐  ┌────────────────┐                  │
│ │ ○ Passiv Slab  │  │ ○ Other        │                  │
│ │ High-perf      │  │ [Text input]   │                  │
│ │ insulated slab │  │                 │                  │
│ └────────────────┘  └────────────────┘                  │
├─────────────────────────────────────────────────────────┤
│ VARIANT PICKER (conditional — e.g., Timber Frame)        │
│  RadioGroup: "Off-Site Manufacture" | "On-Site Fab"      │
├─────────────────────────────────────────────────────────┤
│ FOOTER                                                   │
│  [← Previous Category]  [Next Category →]                │
│  (or [Done for Main Building] on last category)          │
└─────────────────────────────────────────────────────────┘
```

### COMPONENTS

| Region | Component | Data | Interactions |
|--------|-----------|------|-------------|
| Header | SetupStepper + text | step, block name, category index | Visual only |
| Method Cards | RadioGroup of Card components | methods[]: {name, description, variant?} | Click to select. Border highlight on selected. |
| Variant | RadioGroup | variants[] | Only shown if selected method has variants |
| Footer | Button × 2 | — | Category navigation |

### 5-STATE DESIGN

| State | Behavior |
|-------|----------|
| Empty | Cannot happen — methods are seeded |
| Loading | Skeleton: 4 card placeholders in grid |
| Populated | Method cards with pre-selected default (first method) |
| Error | Toast if method load fails, retry button |
| Overflow | N/A — max 5 methods per category |

### PROGRESSIVE DISCLOSURE
- Variant picker: hidden unless selected method has variants
- "Other" card: expands inline text input when selected
- Description text: truncated to 2 lines on mobile, full on desktop

---

## SCREEN: Setup Wizard — Step 4: Block Sequencing

URL: /setup (Step 4)

### REGIONS

```
┌─────────────────────────────────────────────────────────┐
│ HEADER                                                   │
│  SetupStepper (Step 4 of 5 — "Scheduling")              │
│  Subtext: "Choose how blocks are built per category"     │
├─────────────────────────────────────────────────────────┤
│ CATEGORY SEQUENCING LIST                                 │
│ ┌─────────────────────────────────────────────────┐     │
│ │ Foundation                                       │     │
│ │  [Parallel ←→ Sequential] toggle                 │     │
│ │  If Sequential:                                  │     │
│ │   1. Main Building  [drag handle]                │     │
│ │   2. Garage          [drag handle]               │     │
│ └─────────────────────────────────────────────────┘     │
│ ┌─────────────────────────────────────────────────┐     │
│ │ Framing                                          │     │
│ │  [Parallel ←→ Sequential] toggle                 │     │
│ │  ...                                             │     │
│ └─────────────────────────────────────────────────┘     │
│ (repeat for all 8 categories)                            │
├─────────────────────────────────────────────────────────┤
│ FOOTER                                                   │
│  [← Back]  [Next →]                                      │
└─────────────────────────────────────────────────────────┘
```

### COMPONENTS

| Region | Component | Data | Interactions |
|--------|-----------|------|-------------|
| Category rows | Card with Toggle + sortable list | category name, mode, block order | Toggle parallel/sequential. Drag to reorder blocks. |
| Block order | Sortable list (dnd-kit or native) | block names | Drag handle to reorder |
| Footer | Button × 2 | — | Navigate steps |

### 5-STATE DESIGN

| State | Behavior |
|-------|----------|
| Empty | Cannot happen — categories derived from scheme picks |
| Loading | Skeleton: 8 rows |
| Populated | Category cards with toggles |
| Error | Toast if save fails |
| Overflow | N/A — max 8 categories |

Note: If project has only 1 block, this step is skipped entirely (sequencing is meaningless with 1 block).

---

## SCREEN: Stages (Browser)

URL: /stages

### REGIONS

```
┌─────────────────────────────────────────────────────────┐
│ HEADER                                                   │
│  Heading: "Stages"                                       │
│  Block filter: [All ▾] or [Main Building ▾] Select      │
├─────────────────────────────────────────────────────────┤
│ BLOCK SECTION (repeat per block if "All" selected)       │
│  Block name heading + metadata (2 storeys, attached)     │
│                                                          │
│ ┌─────────────────────────────────────────────────┐     │
│ │ Accordion: Foundation  ▸  [3/5 complete]         │     │
│ │ (expanded)                                       │     │
│ │  ┌───────────────────────────────────────────┐   │     │
│ │  │ Marking Out      Jun 1-3    ✓ Complete    │   │     │
│ │  │ Excavation       Jun 4-8    ◐ In Progress │   │     │
│ │  │ Services         Jun 9-10   ○ Not Started │   │     │
│ │  │ Steels & Memb    Jun 11-12  ○ Not Started │   │     │
│ │  │ Concrete Pour    Jun 13-14  ○ Not Started │   │     │
│ │  │ [+ Add Substage]                          │   │     │
│ │  └───────────────────────────────────────────┘   │     │
│ └─────────────────────────────────────────────────┘     │
│ ┌─────────────────────────────────────────────────┐     │
│ │ Accordion: Framing  ▸  [0/3 complete]            │     │
│ │ (collapsed)                                      │     │
│ └─────────────────────────────────────────────────┘     │
│ (repeat per stage category)                              │
└─────────────────────────────────────────────────────────┘
```

### COMPONENTS

| Region | Component | Data | Interactions |
|--------|-----------|------|-------------|
| Block filter | Select (shadcn) | block names + "All" | Filter stages by block |
| Block section | Heading + text | block.name, storeys, attachment | Visual grouping |
| Stage accordion | Accordion (Radix) + Badge | stage.name, completion count | Expand/collapse |
| Substage row | Custom row: text + date range + status badge | substage data | Click row → inline edit sheet OR navigate to /stages/:id |
| Status badge | Badge (shadcn) | status | Color-coded: green=complete, amber=in-progress, muted=not-started |
| Add substage | Button variant=ghost | — | Opens inline form below list |

### 5-STATE DESIGN

| State | Behavior |
|-------|----------|
| Empty | EmptyState: "No stages yet. Complete setup to generate your build stages." + link to /setup |
| Loading | Skeleton: 3 accordion rows per block section |
| Populated | Accordion list with first active stage expanded |
| Error | Alert with retry: "Failed to load stages" |
| Overflow | >20 stages per block: all collapsed by default, search/filter bar appears |

### PROGRESSIVE DISCLOSURE
- Stage accordions: collapsed by default. First stage with in-progress substages auto-expanded.
- Substage detail: click row opens inline edit (dates, trade, notes). Full edit links to /stages/:id.
- Stage edit controls (rename, reorder, delete): icon buttons in accordion header, visible on hover/focus.

---

## SCREEN: Schedule (Revised)

URL: /schedule

### REGIONS

```
┌─────────────────────────────────────────────────────────┐
│ HEADER                                                   │
│  Heading: "Schedule"                                     │
│  Project name subtitle                                   │
├─────────────────────────────────────────────────────────┤
│ CONTROLS BAR                                             │
│  Block filter: [All ▾] Select                            │
│  Stage tabs: [All] [Foundation] [Framing] [Envelope] ... │
│  Zoom: [Week] [Month] [Full]  [↗ Today]                │
├─────────────────────────────────────────────────────────┤
│ GANTT CHART (existing, enhanced)                         │
│  Left panel: block headers → stage labels → substage rows│
│  Right panel: timeline with bars, dependency arrows,     │
│               today-line, block separators               │
│  Drag-to-resize/move → cascade preview panel             │
├─────────────────────────────────────────────────────────┤
│ CASCADE PREVIEW (slide-in from right, contextual)        │
│  Impact summary + detail list + confirm/cancel           │
└─────────────────────────────────────────────────────────┘
```

### COMPONENTS

| Region | Component | Data | Interactions |
|--------|-----------|------|-------------|
| Block filter | Select | blocks + "All" | Filters Gantt rows |
| Stage tabs | Custom TabBar (horizontal scroll) | stage categories | Filters Gantt to one category |
| Zoom | ToggleGroup (3 options) | zoom level | Changes time scale |
| Jump to Today | Button variant=ghost | — | Scrolls timeline |
| Gantt | Custom GanttChart (existing) | stages, tasks, deps | Drag bars, click for detail, hover for tooltip |
| Cascade panel | Custom slide-in panel | cascade results | Confirm/cancel cascade |

### 5-STATE DESIGN

| State | Behavior |
|-------|----------|
| Empty | EmptyState: "No substages scheduled. Complete setup first." + link to /setup |
| Loading | Skeleton: timeline grid with 8 row placeholders |
| Populated | Full Gantt with block headers as visual separators |
| Error | Alert replacing chart area with retry |
| Overflow | >200 substages: virtualized rows, stage tab filtering essential |

### GANTT BLOCK VISUAL GROUPING
When "All" blocks selected, the Gantt left panel shows:
```
▸ Main Building          ← block header row (bold, bg slightly darker)
    Foundation
      Marking Out         ← substage bar
      Excavation          ← substage bar
    Framing
      ...
▸ Garage                  ← block header row
    Foundation
      ...
```
Block headers are collapsible. When a stage tab is active, only that category's substages shown per block.

---

## SCREEN: Snag List

URL: /snags

### REGIONS

```
┌─────────────────────────────────────────────────────────┐
│ HEADER                                                   │
│  Heading: "Snags"                                        │
│  Subtitle: "5 open · 2 in progress · 12 resolved"       │
│  [+ New Snag] button (desktop)                           │
├─────────────────────────────────────────────────────────┤
│ FILTER BAR                                               │
│  Block: [All ▾]  Stage: [All ▾]  Trade: [All ▾]        │
│  Priority: [All ▾]                                       │
├─────────────────────────────────────────────────────────┤
│ OPEN SNAGS                                               │
│ ┌─────────────────────────────────────────────────┐     │
│ │ Card: "Leaking waste pipe under bath"            │     │
│ │  Badge: HIGH (red)  Trade: Murphy Plumbing       │     │
│ │  Block: Main Building  Stage: 2nd Fix            │     │
│ │  📷 2 photos  Created: Apr 3                      │     │
│ └─────────────────────────────────────────────────┘     │
│ (repeat per snag)                                        │
├─────────────────────────────────────────────────────────┤
│ IN PROGRESS                                              │
│ (same card format, slightly muted)                       │
├─────────────────────────────────────────────────────────┤
│ RESOLVED (collapsed accordion)                           │
│  "12 resolved snags" → expand to see list                │
├─────────────────────────────────────────────────────────┤
│ FAB: [+ New Snag] (mobile only, bottom-right)            │
└─────────────────────────────────────────────────────────┘
```

### COMPONENTS

| Region | Component | Data | Interactions |
|--------|-----------|------|-------------|
| Header | Heading + text + Button | counts | "New Snag" → /snags/new or dialog |
| Filter bar | 4 × Select | blocks, stages, trades, priorities | Filter snag list |
| Snag card | Card + Badge + text + Avatar(photo count) | snag data | Click → /snags/:id |
| Status sections | Visual grouping (heading + divider) | — | Open/In-Progress visible, Resolved collapsed |
| FAB | Fixed Button (mobile) | — | Same as header button |

### 5-STATE DESIGN

| State | Behavior |
|-------|----------|
| Empty | EmptyState: illustration (clipboard with checkmark), "No snags yet — that's a good sign!", "Add your first snag" button |
| Loading | Skeleton: 3 card placeholders |
| Populated | Cards grouped by status |
| Error | Alert with retry |
| Overflow | >50 snags: paginated or "Load more" at bottom per section |

---

## SCREEN: Snag Detail

URL: /snags/:id

### REGIONS

```
┌─────────────────────────────────────────────────────────┐
│ HEADER                                                   │
│  ← Snags (breadcrumb)                                   │
│  Title: "Leaking waste pipe under bath"                  │
│  Badge: HIGH  Status: OPEN                               │
├─────────────────────────────────────────────────────────┤
│ METADATA                                                 │
│  Block: Main Building                                    │
│  Stage: 2nd Fix                                          │
│  Trade: Murphy Plumbing (tap → phone/email)              │
│  Created: Apr 3, 2026                                    │
├─────────────────────────────────────────────────────────┤
│ DESCRIPTION                                              │
│  "Water leaking from waste joint behind bath panel..."   │
├─────────────────────────────────────────────────────────┤
│ PHOTOS                                                   │
│  [thumbnail] [thumbnail] [+ Add Photo]                   │
│  Tap thumbnail → full-screen lightbox                    │
├─────────────────────────────────────────────────────────┤
│ ACTIONS                                                  │
│  [Mark In Progress] or [Mark Resolved]                   │
│  [Edit Snag]                                             │
└─────────────────────────────────────────────────────────┘
```

### COMPONENTS

| Region | Component | Data | Interactions |
|--------|-----------|------|-------------|
| Header | Breadcrumb + Heading + Badge × 2 | title, priority, status | — |
| Metadata | Description list (dl/dt/dd) | block, stage, trade, date | Trade name → tel: / mailto: links |
| Description | Text block | description | — |
| Photos | Grid of Image (next/image) + Button | photo URLs | Tap → lightbox. Add → file input/camera |
| Actions | Button × 2 | current status | Status transition + edit link |

---

## SCREEN: Materials / Procurement (Revised)

URL: /materials

### REGIONS

```
┌─────────────────────────────────────────────────────────┐
│ HEADER                                                   │
│  Heading: "Materials"                                    │
├─────────────────────────────────────────────────────────┤
│ PROCUREMENT PIPELINE (horizontal status bar)             │
│  ┌──────┬────────┬─────────┬───────────┬───────────┐   │
│  │  3   │   5    │    2    │     1     │     8     │   │
│  │ Not  │ Quoted │ Ordered │ In Transit│ Delivered │   │
│  │Quoted│        │         │           │           │   │
│  └──────┴────────┴─────────┴───────────┴───────────┘   │
│  (clickable segments filter the table below)             │
├─────────────────────────────────────────────────────────┤
│ OVERDUE ALERT (conditional — only if overdue items)      │
│  Alert: "⚠ 2 materials are past their order-by date"    │
│  [View Overdue]                                          │
├─────────────────────────────────────────────────────────┤
│ STATUS TABS                                              │
│  [All] [Not Quoted] [Quoted] [Ordered] [In Transit]     │
│  [Delivered]                                             │
├─────────────────────────────────────────────────────────┤
│ MATERIAL TABLE                                           │
│  Columns: Name | Block | Substage | Qty | Status |      │
│           Order By | Quoted Price                        │
│  Sortable by each column                                 │
│  Row click → expand detail (tracking ref, timestamps)    │
├─────────────────────────────────────────────────────────┤
│ EXPANDED ROW (contextual)                                │
│  Procurement timeline: quoted_at → ordered_at →          │
│  delivered_at with dates                                 │
│  [Advance Status] button                                 │
│  [Edit] link                                             │
└─────────────────────────────────────────────────────────┘
```

### COMPONENTS

| Region | Component | Data | Interactions |
|--------|-----------|------|-------------|
| Pipeline | Custom ProcurementPipeline (segmented bar) | counts per status | Click segment → filter table |
| Overdue alert | Alert (shadcn) variant=destructive | overdue count | "View Overdue" → filter to overdue |
| Status tabs | Tabs (shadcn) | status values | Filter table |
| Table | DataTable (custom, sortable) | materials[] | Sort, click row to expand |
| Expanded row | Collapsible panel | timestamps, tracking | Advance status, edit |

### 5-STATE DESIGN

| State | Behavior |
|-------|----------|
| Empty | EmptyState: "No materials tracked yet. Materials are added from substages." |
| Loading | Skeleton: pipeline bar + 5 table rows |
| Populated | Pipeline counts + table |
| Error | Alert replacing table with retry |
| Overflow | >100 materials: paginated (20 per page) with page controls |

---

## SCREEN: Photos (Revised)

URL: /photos

### REGIONS

```
┌─────────────────────────────────────────────────────────┐
│ HEADER                                                   │
│  Heading: "Photos"                                       │
│  [Upload Photo] button                                   │
├─────────────────────────────────────────────────────────┤
│ TAG FILTER TABS                                          │
│  [All] [Building Control] [Progress] [Snag]              │
├─────────────────────────────────────────────────────────┤
│ BUILDING CONTROL VIEW (when BC tab active)               │
│  Section: "Foundation Inspection" (3 photos)             │
│  [thumb] [thumb] [thumb]                                 │
│  Section: "Pre-Plaster" (5 photos)                       │
│  [thumb] [thumb] [thumb] [thumb] [thumb]                │
│                                                          │
│ ALL / PROGRESS / SNAG VIEW (chronological grid)          │
│  [thumb] [thumb] [thumb] [thumb]                         │
│  [thumb] [thumb] [thumb] [thumb]                         │
└─────────────────────────────────────────────────────────┘
```

### COMPONENTS

| Region | Component | Data | Interactions |
|--------|-----------|------|-------------|
| Tag tabs | Tabs (shadcn) | tag values | Filter photos |
| Photo grid | CSS Grid + next/image | photo URLs | Click → lightbox |
| Section headers | Heading (under BC tab) | inspection_stage | Visual grouping |
| Upload | Button → file input | — | Opens camera/picker. Tag + inspection stage selectors in upload dialog. |

### UPLOAD DIALOG

```
┌────────────────────────────────────────┐
│ Upload Photo                            │
│                                         │
│ [photo preview]                         │
│                                         │
│ Tag: [Building Control ▾]               │
│ Inspection Stage: [Foundation ▾]        │
│   (only shown if tag = Building Control)│
│ Link to: [Substage ▾] (optional)        │
│                                         │
│ [Cancel]  [Upload]                      │
└────────────────────────────────────────┘
```

---

## SCREEN: Settings (Revised)

URL: /settings

### REGIONS

```
┌─────────────────────────────────────────────────────────┐
│ HEADER                                                   │
│  Heading: "Settings"                                     │
├─────────────────────────────────────────────────────────┤
│ TABS                                                     │
│  [Project Details] [Account] [Notifications] [Data]      │
├─────────────────────────────────────────────────────────┤
│ PROJECT DETAILS TAB                                      │
│  Form: Name [input]                                      │
│        Address [input]                                   │
│  Block Summary (read-only):                              │
│    Main Building: Timber Frame, Passiv Slab, 2 storeys  │
│    Garage: Timber Frame, Strip+Slab, 1 storey            │
│  [Edit Blocks & Scheme] → navigates to /setup edit mode │
│  [Save Changes]                                          │
├─────────────────────────────────────────────────────────┤
│ ACCOUNT TAB                                              │
│  Email: greg@example.com (read-only display)             │
│  [Change Password] → expands inline form:                │
│    Current password [input]                              │
│    New password [input]                                   │
│    Confirm [input]                                        │
│    [Update Password]                                      │
│  Separator                                               │
│  [Sign Out] — Button variant=outline, destructive        │
├─────────────────────────────────────────────────────────┤
│ NOTIFICATIONS TAB (existing, unchanged)                  │
│  Push toggle + preference types + warning days stepper   │
├─────────────────────────────────────────────────────────┤
│ DATA TAB (existing, enhanced)                            │
│  Export: [JSON] [CSV] [Print PDF]                        │
│  Now includes blocks, snags, procurement fields, photo   │
│  tags in export                                          │
└─────────────────────────────────────────────────────────┘
```
