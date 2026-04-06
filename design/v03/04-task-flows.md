# Task Flows — Self-Build Manager v0.3.0

PROJECT: Self-Build Manager
DATE: 2026-04-06

Multi-step task flows with decision points and error recovery.

---

## FLOW 1: Setup Wizard (New Project)

```
START: User authenticated, no project exists
  │
  ▼
┌──────────────────────────────────┐
│ STEP 1: Project Details          │
│ Name*, Address, Start Date*      │
│ [localStorage draft persistence] │
└──────────┬───────────────────────┘
           │ "Next"
           ▼
┌──────────────────────────────────┐
│ STEP 2: Blocks                   │
│ Default "Main Building" shown    │
│ [+Add Block] inline form         │
│ Each: Name*, Attached/Detached,  │
│       Storeys (default 2)        │
└──────────┬───────────────────────┘
           │ "Next" (≥1 block required)
           ▼
┌──────────────────────────────────────┐
│ STEP 3: Construction Scheme          │
│ For Block 1:                         │
│   Category stepper (8 categories)    │
│   Each: show method cards, pick one  │
│   Defaults pre-selected              │
│                                      │
│ After Block 1 complete:              │
│  ┌─────────────────┐                 │
│  │ For each other   │                │
│  │ block:           │                │
│  │  ○ Apply Same    │───→ auto-fill  │
│  │  ○ Edit          │───→ stepper    │
│  └─────────────────┘                 │
└──────────┬───────────────────────────┘
           │ All blocks have schemes
           ▼
┌──────────────────────────────────────┐
│ STEP 4: Block Sequencing             │
│ Per stage category:                  │
│  [Parallel ⟷ Sequential] toggle     │
│  If Sequential: drag blocks to order │
│                                      │
│ Defaults: all Sequential in creation │
│ order                                │
└──────────┬───────────────────────────┘
           │ "Next"
           ▼
┌──────────────────────────────────────┐
│ STEP 5: Review & Activate            │
│ Summary:                             │
│  - Project: name, address, start     │
│  - Blocks: names + methods           │
│  - Sequencing config                 │
│  - Generated substage count          │
│                                      │
│ [← Edit] links back to relevant step │
│ [Activate Project] button            │
└──────────┬───────────────────────────┘
           │ "Activate Project"
           ▼
  Substages generated from method templates
  Dates calculated from start date + durations + sequencing
  Project status → 'active'
  Redirect → /briefing
  
END

ERROR RECOVERY:
  - Step 1: inline validation (name required, start date required)
  - Step 2: minimum 1 block enforced (can't delete last block)
  - Step 3: all categories have pre-selected defaults (impossible to skip)
  - Step 5: "Edit" links go back without losing other steps (wizard state persisted)
  - Any step: browser back works (steps are URL-param or state-based, not lost)
```

---

## FLOW 2: Delay Logging with Cascade

```
START: User is viewing a substage (on /stages/:id or /briefing)
  │
  ▼
┌────────────────────────────┐
│ Tap "Log Delay" button     │
└──────────┬─────────────────┘
           │
           ▼
┌────────────────────────────────────┐
│ DELAY SHEET (bottom sheet mobile,  │
│ dialog desktop)                    │
│                                    │
│ Delay by: [stepper, days]          │
│ Reason: [textarea]                 │
│                                    │
│ [Cancel]  [Save & Cascade]         │
└──────────┬─────────────────────────┘
           │ "Save & Cascade"
           ▼
┌────────────────────────────────────┐
│ CASCADE IMPACT PANEL               │
│                                    │
│ Summary: "12 substages shift,      │
│  2 material order-by dates move"   │
│                                    │
│ Detail list:                       │
│  ✦ Plasterboard: Jun 5 → Jun 8    │
│  ✦ Second fix elec: Jun 12 → Jun 15│
│  ✦ [Material] Board: order by      │
│    May 20 → May 23                 │
│                                    │
│ ⚠️ 1 material now overdue          │
│                                    │
│ [← Back]  [Confirm Cascade]        │
└──────────┬─────────────────────────┘
           │ "Confirm"
           ▼
  Cascade engine runs (Postgres function)
  Shift alerts created for affected items
  Toast: "12 substages rescheduled"
  
END: User sees updated dates

ERROR RECOVERY:
  - "Back" returns to delay sheet (data preserved)
  - If cascade would create scheduling conflict: warning shown, not blocked
  - Network error: retry button in toast
```

---

## FLOW 3: Snag Lifecycle

```
START: User identifies defect on site
  │
  ▼
┌────────────────────────────┐
│ CREATE SNAG                │
│ /snags → "Add Snag"       │
│                            │
│ Title*                     │
│ Priority: Low/Med/High/Crit│
│ Block (optional)           │
│ Stage (optional)           │
│ Trade (optional)           │
│ Description (optional)     │
│ [📷 Add Photo]             │
│                            │
│ [Save]                     │
└──────────┬─────────────────┘
           │ Status: OPEN
           ▼
┌────────────────────────────┐
│ SNAG IS OPEN               │
│ Visible in:                │
│  - /snags (Open section)   │
│  - /briefing (snag count)  │
│  - /trades (trade's snags) │
│                            │
│ User can:                  │
│  - Edit details            │
│  - Add more photos         │
│  - Mark "In Progress"      │
└──────────┬─────────────────┘
           │ "Mark In Progress"
           ▼
┌────────────────────────────┐
│ SNAG IN PROGRESS           │
│ Trade is working on fix    │
│                            │
│ User can:                  │
│  - Add photos (fix proof)  │
│  - Mark "Resolved"         │
└──────────┬─────────────────┘
           │ "Mark Resolved"
           ▼
┌────────────────────────────┐
│ SNAG RESOLVED              │
│ resolved_at timestamp set  │
│ Moves to Resolved section  │
│                            │
│ TERMINAL STATE             │
│ (Cannot reopen — create    │
│  new snag if recurs)       │
└────────────────────────────┘

ERROR RECOVERY:
  - Title required validation (inline)
  - Photo upload failure: retry button, snag saved without photo
  - Accidental resolve: create new snag (by design — audit trail preserved)
```

---

## FLOW 4: Procurement Pipeline (Material Lifecycle)

```
START: Material created from construction method template
  │
  ▼
┌─────────────────────────────┐
│ NOT QUOTED                  │
│ order_by_date calculated    │
│ (planned_start - lead_time) │
│                             │
│ Actions: Request Quote      │
└──────────┬──────────────────┘
           │ Enter quoted_price
           ▼
┌─────────────────────────────┐
│ QUOTED                      │
│ quoted_at timestamp set     │
│ quoted_price visible        │
│                             │
│ Actions: Place Order        │
└──────────┬──────────────────┘
           │ Optional: tracking_reference
           ▼
┌─────────────────────────────┐
│ ORDERED                     │
│ ordered_at timestamp set    │
│                             │
│ Actions: Mark In Transit    │
└──────────┬──────────────────┘
           │
           ▼
┌─────────────────────────────┐
│ IN TRANSIT                  │
│ Delivery on its way         │
│                             │
│ Actions: Mark Delivered     │
└──────────┬──────────────────┘
           │
           ▼
┌─────────────────────────────┐
│ DELIVERED                   │
│ delivered_at timestamp set  │
│ TERMINAL STATE              │
└─────────────────────────────┘

WARNINGS:
  - If order_by_date passed AND status is NOT_QUOTED or QUOTED:
    → OVERDUE badge (red)
    → Appears in briefing alerts
    → Appears in procurement pipeline summary

  - 7 days before order_by_date AND status is NOT_QUOTED:
    → DUE SOON badge (amber)
    → Push notification if enabled
```

---

## FLOW 5: Add Block to Existing Project

```
START: User on /settings, Project Details tab
  │
  ▼
┌────────────────────────────────┐
│ Clicks "Edit Blocks"           │
│ Navigates to /setup (edit mode)│
│ Existing blocks shown          │
└──────────┬─────────────────────┘
           │ "Add Block"
           ▼
┌────────────────────────────────────┐
│ INLINE BLOCK FORM                  │
│ Name*, Attached/Detached, Storeys  │
│ [Save]                             │
└──────────┬─────────────────────────┘
           │ Block created
           ▼
┌──────────────────────────────────────┐
│ SCHEME PROMPT                        │
│ "Apply same as [Block A]?" or "Edit" │
└──────────┬───────────────────────────┘
           │
    ┌──────┴──────┐
    │             │
    ▼             ▼
  Apply Same    Edit (method picker
  (auto-fill)   with defaults from
                 existing block)
    │             │
    └──────┬──────┘
           │
           ▼
┌────────────────────────────────┐
│ UPDATE SEQUENCING?             │
│ New block needs position in    │
│ sequential categories          │
│ Auto-appended to end of order  │
│ User can adjust via toggle     │
└──────────┬─────────────────────┘
           │ "Done"
           ▼
  Substages generated for new block
  Dates calculated respecting sequencing
  Redirect → /settings
  
END
```
