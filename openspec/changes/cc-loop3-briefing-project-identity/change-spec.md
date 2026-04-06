# Change Spec: cc-loop3-briefing-project-identity

## Gap Evidence

### Quality Gap
- **Gap ID:** imp-project-identity
- **Category:** content_change
- **Severity:** low
- **Root Cause:** missing_context
- **Root Cause Evidence:** The spec (AC-DB-1) says "project-specific briefing sections" but never explicitly states project name in header. The context of "which project" wasn't called out. A different builder would likely make the same omission.

### Current State (What's Wrong)
- **Description:** The /briefing page header shows "Daily Briefing" as a standalone heading but does not display the project name. The user cannot confirm which project context they are operating in. The project name is already loaded in the RSC (`project.name`) but not rendered in the header.
- **PO Review Assessment:** "No project name shown on /briefing header — user cannot confirm which project the briefing is for. Code review: briefing/page.tsx header shows 'Daily Briefing' but not the project name. project.name is loaded but unused in the header."
- **Heuristics Failed:** Nielsen Heuristic 1 (Visibility of system status)
- **Affected Screens:** /briefing
- **Affected Journeys:** Daily Briefing View

### Previous Attempts (Do Not Repeat)
First attempt.

## Target State

### From Library Heuristics
- **Nielsen Heuristic 1 — Visibility of System Status:** The user must always know which project context they are operating in. Any project-scoped screen must visually identify the project. Measurement: the project name text is present in the page header region (verifiable via DOM query for the h1/header area containing the project name string).

### From Reference Products
Not applicable — this is a basic UX hygiene issue, not a competitive gap.

### Concrete Description
The /briefing page header should display the project name alongside the "Daily Briefing" title. The project name appears as a subtitle below "Daily Briefing" using the existing text hierarchy: the main title remains `text-2xl font-bold` and the project name appears below it as `text-sm text-muted-foreground` (matching the existing typographic scale). Example rendering:

```
Daily Briefing
O'Brien Timber Frame House
```

The project name is already available in the server component's query result. This is a one-line JSX addition — no new data fetching, no new components, no layout changes.

## Design Requirements

- **Requires Design Mode:** false
- **Design Mode Scope:** N/A
- **Design Direction:** Use existing text hierarchy. Project name as `text-sm text-muted-foreground` subtitle under the `text-2xl font-bold` main heading. No new visual elements needed.
- **Design Constraints:** The page layout, spacing, and all other elements on /briefing must remain unchanged. Only the header text content changes.

## Acceptance Criteria

AC-PI-1: Project name visible in briefing header
  GIVEN user is authenticated and has an active project
  WHEN user navigates to /briefing
  THEN the page header area contains the project name text
  MEASUREMENT: DOM query — h1 parent element (or header region) contains a text node matching the project's name string
  HEURISTIC: Nielsen Heuristic 1 (Visibility of system status)
  CLOSES_GAP: imp-project-identity

AC-PI-2: Project name renders below Daily Briefing title
  GIVEN user is authenticated and has an active project
  WHEN user navigates to /briefing
  THEN "Daily Briefing" appears as the primary heading and the project name appears as a secondary line below it
  MEASUREMENT: DOM structure — the project name element follows the "Daily Briefing" text element and uses a smaller font size (text-sm class or equivalent computed font-size < primary heading)
  CLOSES_GAP: imp-project-identity

AC-PI-3: Long project names do not break layout
  GIVEN user has a project with a long name (40+ characters)
  WHEN user navigates to /briefing
  THEN the project name renders without overflowing the header container or breaking the page layout
  MEASUREMENT: The header container does not show horizontal overflow; project name text is contained within max-w-2xl container
  CLOSES_GAP: imp-project-identity

## Scope

### In Scope
- The h1/header section of `app/(app)/briefing/page.tsx`
- Adding a subtitle line with `project.name`

### Out of Scope (Do Not Touch)
- All other content on /briefing (weather cards, task summaries, alerts, etc.)
- Any other pages or routes
- Data fetching logic (project is already loaded)
- Navigation or layout components

### Regression Risk
- Minimal — this is a text addition to an existing heading. Verify the briefing page still renders correctly at mobile widths (375px) and the subtitle doesn't cause layout shift.
- Existing acceptance criteria AC-DB-1 through AC-DB-5 should be re-verified after this change.

## Root Cause Context

- **Classification:** missing_context
- **What Went Wrong:** The spec (AC-DB-1) specified "project-specific briefing sections" but did not explicitly call out displaying the project name in the header. The builder implemented project-specific data correctly but had no direction to include the project name as a visible identifier. This is a spec gap, not a builder error.
- **Why Previous Approach Failed:** No previous approach — first attempt.
- **What's Different This Time:** The change spec explicitly calls out the project name display, the exact location (header subtitle), and the CSS classes to use. The builder cannot miss this.
