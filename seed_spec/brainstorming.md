# Construction Manager — Brainstorming

## Persona

**Expert owner-builder** — managing a single residential new construction project. Not a professional GC, but knows the trades, reads drawings, coordinates subs directly. Currently juggling Google Sheets + WhatsApp + calendar + paper notes. Knows what needs to happen; struggles to keep track when things slip.

## Problem

Coordinating a house build across fragmented tools with no automatic cascade when things slip. When foundation slips 3 days, they manually re-walk every downstream task and material order-by date. Mental cost is high; mistakes happen (forgot to reorder lumber for new date, trade shows up to unready site).

## Emotional North Star

> From "let me check three apps and recalculate what shifted" to "I open one app and know exactly where my build stands."

## Killer Edge

**Material lead times + dependency cascade + mobile daily briefing** — combined. Competitors do 1 or 2; none combine all three for owner-builders.

## Scope Decisions (resolved during brainstorming)

| Question | Decision |
|---|---|
| Template vs blank canvas? | **Both (A+C)** — rich residential template + AI-assisted customization |
| Cascade sophistication? | **Simple for launch** — linear dependency recalc. Constraint-aware (weekends, inspector slots) as M2 |
| Material tracking depth? | **Light line items** — name, qty, lead time, order-by, status. No supplier ordering integration |
| Trade tracking? | **B (light)** — contact + one-per-task association. No availability/conflict detection |
| Daily vs weekly review? | **Both** — mobile daily briefing (tactical) + desktop weekly Gantt (strategic) |
| Primary device? | **Phone day-to-day; desktop for setup + weekly Gantt review** |

## Hierarchical Model

Project → Stages (foundation, frame, MEP, envelope, interior, finish, exterior) → Tasks (excavation, rebar, pour, cure) → Materials (concrete, rebar, forms). Dependencies at task level.

## Included Features (M1)

- Hierarchical task tree
- Rich template + AI-assisted setup
- Material tracking with lead times → order-by dates
- Dependency cascade engine
- Daily briefing (mobile-first)
- Weekly Gantt (desktop-first, interactive)
- Photo/document storage per task/stage
- Push notifications (Web Push via PWA)
- Trade contact association per task
- **Project data export (JSON, CSV, PDF Gantt)** — vendor-lock-in avoidance

## Deferred to M2

- Budget dashboard
- Sharing/collaboration (read-only link for bank/partner/inspector)
- Constraint-aware cascade (weekends, inspector slots, weather)

## Out of Scope

Trade availability/conflict detection, supplier ordering integration, weather integration, scenario modeling, email notifications, native mobile app.

## Human Approval

User approved this brainstorming output: **"Yes."**
