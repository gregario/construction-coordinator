# User Journey Maps — Self-Build Manager v0.3.0

PROJECT: Self-Build Manager
DATE: 2026-04-06
ACTOR: Expert owner-builder (has building experience, managing subcontractors)

---

## JOURNEY 1: First-Run Setup (New User → Active Project)

GOAL: Create a project with multiple blocks, pick construction methods, configure sequencing, reach the daily briefing.
STARTING STATE: User has signed up and landed on /setup.

### HAPPY PATH

| Step | Click# | Action | Screen | Notes |
|------|--------|--------|--------|-------|
| 1 | — | Lands on /setup Step 1 | Project Details form | Name, address, start date. Pre-filled draft from localStorage |
| 2 | 1 | Fills form, clicks "Next" | Step 2: Blocks | |
| 3 | — | Sees default "Main Building" block | Block list | Pre-created, editable. Shows add button |
| 4 | 2 | Clicks "Add Block", enters "Garage", detached, 1 storey | Block list (2 items) | Inline form, no modal |
| 5 | 3 | Clicks "Next" | Step 3: Construction Scheme (Block 1) | |
| 6 | — | Sees category picker: Foundation | Method cards | Sensible default pre-selected (Strip with Slab) |
| 7 | 4 | Picks "Passiv Insulated Slab", clicks next category | Structure methods | |
| 8 | 5 | Picks "Timber Frame — Off-Site", clicks next category | Doors & Windows | |
| 9 | 6-9 | Picks methods for remaining categories | Envelope, 1st Fix, 2nd Fix, Finishing, External | Each is one click + next. Defaults pre-selected. |
| 10 | 10 | Clicks "Done for Main Building" | Scheme summary | Shows all picks. "Apply same to Garage?" prompt |
| 11 | 11 | Clicks "Apply Same" | Step 3 complete for both blocks | Garage gets same scheme |
| 12 | 12 | Clicks "Next" | Step 4: Block Sequencing | |
| 13 | — | Sees category list with parallel/sequential toggles | Sequencing config | Defaults to sequential |
| 14 | 13 | Toggles Foundation to "Parallel" | Updated | |
| 15 | 14 | Clicks "Next" | Step 5: Review & Activate | |
| 16 | — | Sees project summary (2 blocks, methods, sequencing) | Review screen | |
| 17 | 15 | Clicks "Activate Project" | /briefing | Project status → active. First briefing loads |

TOTAL CLICKS: 15
3-CLICK RULE: EXCEEDED — justified. This is a one-time setup wizard for a complex construction project. 15 clicks is efficient for configuring 2 blocks × 8 categories + sequencing. The "Apply Same" shortcut saves ~8 clicks per additional block. A real user will spend 3-5 minutes here, not 30 seconds.

### DECISION POINTS

At Step 4 (adding blocks):
- Add more blocks → repeats Step 4 inline (no page change)
- Skip (single building) → proceed with default block only

At Step 10 (scheme complete for Block 1):
- "Apply Same to [Block 2]" → copies scheme, skips Block 2 setup (saves ~8 clicks)
- "Edit for [Block 2]" → opens Step 3 for Block 2 with Block 1's picks as defaults

At Step 14 (sequencing):
- Leave defaults (all sequential) → proceed
- Configure per-category → toggle + drag to reorder blocks

### ERROR RECOVERY

At Step 1, if project name empty:
→ Inline validation: "Project name is required"
→ 0 extra clicks (field highlighted, focus set)

At Step 3, if no method selected for a category:
→ Pre-selected default means this can't happen
→ "Other" is always available as an escape hatch

---

## JOURNEY 2: Daily Check-In (Morning Briefing)

GOAL: See what's happening today, mark substages complete, check material orders.
STARTING STATE: User opens PWA from home screen. Lands on /briefing.

### HAPPY PATH

| Step | Click# | Action | Screen | Notes |
|------|--------|--------|--------|-------|
| 1 | — | Sees briefing cards | /briefing | Today's substages, shift alerts, upcoming orders, snag count |
| 2 | 1 | Taps checkbox on a substage | /briefing | Substage marked complete. Toast confirms |
| 3 | — | Sees "2 orders due this week" card | /briefing | Material order-by dates |
| 4 | 2 | Taps "View Materials" | /materials | Filtered to upcoming orders |

TOTAL CLICKS: 2
3-CLICK RULE: PASS

### DECISION POINTS

At Step 2 (substage in briefing):
- Tap checkbox → mark complete (1 click)
- Tap substage name → navigate to /stages/:id for detail
- Tap "Log Delay" → sheet opens for delay entry

At Step 3 (material orders):
- Tap material → navigate to /materials with that item highlighted
- Tap "View All" → /materials (no filter)

---

## JOURNEY 3: Log a Delay (In-Field)

GOAL: Record that framing is delayed by 3 days, see cascade impact.
STARTING STATE: User is on /briefing or /stages/:id on mobile.

### HAPPY PATH

| Step | Click# | Action | Screen | Notes |
|------|--------|--------|--------|-------|
| 1 | 1 | Taps substage "Panel erection" | /stages/:id | Stage detail with substage list |
| 2 | 2 | Taps "Log Delay" button | Delay sheet (bottom sheet) | Date picker + reason textarea |
| 3 | — | Sets 3 days, types reason | Delay sheet | |
| 4 | 3 | Taps "Save & Cascade" | Cascade impact panel | Shows "8 substages shifted, 2 material order-by dates moved" |
| 5 | — | Reviews impact | Impact panel | List of affected items with old → new dates |
| 6 | 4 | Taps "Confirm" | /stages/:id | Toast: "8 substages rescheduled". Dates updated |

TOTAL CLICKS: 4
3-CLICK RULE: EXCEEDED (by 1) — justified. Cascade preview is a safety net — showing impact before confirming prevents accidental schedule disruption. Skipping the preview would save 1 click but risk costly mistakes.

### ERROR RECOVERY

At Step 3, if delay days = 0:
→ Validation: "Delay must be at least 1 day"
→ 0 extra clicks

---

## JOURNEY 4: Record a Snag (On-Site)

GOAL: Photograph a defect, create a snag for the plumber to fix.
STARTING STATE: User is on site, opens app on mobile.

### HAPPY PATH

| Step | Click# | Action | Screen | Notes |
|------|--------|--------|--------|-------|
| 1 | 1 | Taps "Snags" in More menu | /snags | Snag list (empty or populated) |
| 2 | 2 | Taps "Add Snag" FAB | Snag form (full screen) | Title, priority, block, stage, trade |
| 3 | — | Types "Leaking waste pipe under bath" | Snag form | |
| 4 | 3 | Selects priority "High", trade "Murphy Plumbing" | Snag form | Dropdowns |
| 5 | 4 | Taps camera icon, takes photo | Camera → preview | Native camera via file input |
| 6 | 5 | Taps "Save Snag" | /snags | Snag created, appears in "Open" section |

TOTAL CLICKS: 5
3-CLICK RULE: EXCEEDED — justified. Snag creation requires structured data (title, priority, trade, photo) that can't be compressed further without losing information. 5 clicks for a complete defect record with photo evidence is efficient.

### DECISION POINTS

At Step 4 (trade selection):
- Select existing trade → dropdown pick
- "Add New Trade" → inline form within dropdown (name, phone, specialty)

At Step 5 (photo):
- Take photo → camera opens
- Choose from gallery → file picker
- Skip photo → allowed (can add later)

---

## JOURNEY 5: Weekly Replan (Desktop)

GOAL: Review schedule, adjust dates on Gantt, check procurement status.
STARTING STATE: User is at desktop, navigates to /schedule.

### HAPPY PATH

| Step | Click# | Action | Screen | Notes |
|------|--------|--------|--------|-------|
| 1 | — | Sees Gantt chart with block filter | /schedule | Stage nav tabs above Gantt. All blocks shown by default |
| 2 | 1 | Clicks "Block A" filter | /schedule | Gantt filters to Block A substages only |
| 3 | 2 | Drags "Plasterboard & skim" bar 5 days right | Gantt (live preview) | Bar moves, downstream bars preview shift |
| 4 | 3 | Releases drag | Cascade preview panel | Shows impact: "4 substages shift, 1 material order-by moves" |
| 5 | 4 | Clicks "Confirm" | /schedule | Cascade applied. Gantt re-renders |
| 6 | 5 | Clicks "Materials" in sidebar | /materials | Procurement dashboard |
| 7 | — | Sees procurement pipeline summary | /materials | "3 not quoted, 5 quoted, 2 ordered, 8 delivered" |

TOTAL CLICKS: 5
3-CLICK RULE: N/A — this is an exploration/editing session, not a goal-directed task.

---

## JOURNEY 6: Setup a Second Block (Edit Existing Project)

GOAL: Add a shed block to an existing active project.
STARTING STATE: User is in /settings, Project Details tab.

### HAPPY PATH

| Step | Click# | Action | Screen | Notes |
|------|--------|--------|--------|-------|
| 1 | 1 | Clicks "Edit Blocks" in Project Details | /setup (block editor mode) | Shows existing blocks + add button |
| 2 | 2 | Clicks "Add Block", enters "Shed", detached, 1 storey | Block list | |
| 3 | 3 | Clicks "Set Up Scheme" | Step 3 for Shed only | |
| 4 | — | "Apply same as Main Building?" prompt | | |
| 5 | 4 | Clicks "Edit" (shed is simpler) | Method picker | Main Building picks as defaults |
| 6 | 5-8 | Adjusts categories (removes some, simplifies) | Method picker | |
| 7 | 9 | Clicks "Done" | /settings | Shed added with substages |

TOTAL CLICKS: 9
3-CLICK RULE: EXCEEDED — justified. Adding a block to an existing project is a significant configuration change. 9 clicks for full block + scheme setup is efficient.
