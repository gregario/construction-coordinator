# Product Taste Brief: UX Consistency & Multi-Project

**Date:** 2026-04-06
**Pipeline stage:** Product Taste (pre-spec)
**Mode:** HOLD — Validate and tighten
**Verdict:** Approved

## Sharpened Brief

Owner-builders like Declan manage complex residential builds across fragmented tools, and Self-Build Manager gives them one app to see their schedule, track materials, manage snags, and prove compliance. v0.3.0 shipped the multi-block data model and composable templates, but user testing revealed that the views don't connect consistently — the same substage leads to different pages depending on where you click, the Gantt chart's click-vs-drag interaction confuses rather than empowers, and single-project limits prevent testing the onboarding flow.

This redesign (HOLD mode — tighten, don't reimagine) establishes three principles: (1) **One entity, one destination** — clicking a substage name anywhere always goes to `/tasks/[id]`, clicking a stage name always goes to `/stages/[id]`; (2) **Gantt as visual dashboard** — the schedule page is for SEEING the plan, not editing it. Click bars to view details and link through. Rescheduling happens via the existing Log Delay flow on substage detail pages, which already has cascade preview and confirmation; (3) **Multi-project via switcher** — project selector in the sidebar, everything per-project, create/archive from the switcher.

Additionally: fix the cascade SQL bug, make materials rows actionable (advance procurement status inline), add photo upload to snag creation, and reorder the mobile bottom bar to [Briefing, Schedule, Stages, More] reflecting actual usage frequency.

This aligns with the 12-month vision: consistency is prerequisite to adoption, multi-project is prerequisite to template growth, and a read-only Gantt is better for the "show the bank/inspector" use case that sits on the roadmap.

## Key Decisions

- **Gantt is read-only.** Click to view details + link through. No dragging. Rescheduling via Log Delay on substage detail pages.
- **One entity, one destination.** Substage click → `/tasks/[id]` everywhere. Stage click → `/stages/[id]` everywhere.
- **Multi-project is per-project.** Simple switcher in sidebar. No cross-project views. Briefing shows active project only.
- **Nav reorder.** Bottom bar: Briefing, Schedule, Stages, More. Materials, Snags, Trades, Photos, Settings in More sheet.
- **Photos stays as a view** for building control browsing/presentation. Primary photo capture is from substage/snag detail pages.
- **Snag photos added.** Photo upload on snag creation and detail.
- **Materials click-to-action.** Advance procurement status inline from the materials list.
- **Delay logger redesign.** Since the Gantt is now read-only and Log Delay becomes THE way to reschedule, it must be exceptional. Current flow asks for a date (user thinks in days, not dates), has no preview before applying, no reason field, and no context. Redesign: "delay by N days" stepper, live-computed new end date, reason field (required), live impact preview showing cascade effects BEFORE confirmation, overdue warnings. Post-cascade receipt modal stays.
- **Three-modes framework kept as internal design principle** (Reading/Planning/Managing) but no user-facing mode switching.
