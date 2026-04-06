# Construction Manager — Design Artifact

**Output of DESIGN discipline (3-pass: structure → visual → interaction).**

---

## Pass 1: Structure

### Sitemap

```
/ (redirects to /briefing when authenticated, /login otherwise)
├── /login, /signup, /forgot-password          (auth)
├── /setup                                      (project creation + template browser + AI customize)
├── /briefing                                   (daily tactical view — mobile-first)
├── /schedule                                   (Gantt chart — desktop-first)
├── /stages                                     (stages index)
│   └── /stages/:id                            (stage detail with tasks)
├── /tasks/:id                                  (task detail: materials, deps, trade, photos, docs)
├── /materials                                  (materials index with order-by dates + status)
├── /trades                                     (trade contacts index)
├── /photos                                     (project photo gallery)
└── /settings                                   (notifications, export, account)
```

### Entity Model

- **Project** (1) → **Stage** (N) → **Task** (N) → **Material** (N)
- **Task** ↔ **Task** (depends_on, many-to-many, DAG)
- **Task** → **Trade** (one trade per task, nullable)
- **Task/Stage** → **Photo** (N)
- **Task/Stage** → **Document** (N)

### Primary Journeys

1. **First-run setup** (desktop): Sign up → Create project → Browse template → Customize (AI assist) → Land on /briefing
2. **Daily check-in** (mobile, 30s): Open app → /briefing → See today's tasks + upcoming order-by dates + shift alerts → Mark task done / log delay
3. **Weekly replan** (desktop, 15min): Open /schedule → Scan Gantt → Drag-edit dates → Cascade recalculates → Review impact
4. **Material ordering** (mobile, opportunistic): /materials → See upcoming order-bys → Tap item → Mark "ordered" → Status updates
5. **Delay logging** (mobile, in-field): /tasks/:id → Tap "log delay" → Enter new date + reason → Cascade fires → See downstream shifts

### Component Inventory (shadcn/ui)

Card, Button, Input, Select, Dialog, Sheet, Tabs, Table, Badge, Avatar, DropdownMenu, Toast, Toggle, Calendar, Popover, Command, Skeleton, Alert, Form, Label, Textarea, Separator, ScrollArea. Custom: GanttChart, DailyBriefingCard, TaskCard, MaterialRow, DependencyGraph, StageTimeline, PhotoGrid, CascadeImpactPanel.

### Navigation

- **Mobile (<768px):** Bottom tab bar — Briefing, Schedule, Materials, Trades, More (Settings, Photos, Export)
- **Desktop (≥768px):** Left sidebar — Briefing, Schedule, Stages, Tasks, Materials, Trades, Photos, Settings

---

## Pass 2: Visual

### Style Tokens

```css
/* Colors — warm earth tones (NOT blue-grey enterprise) */
--color-primary: #8B5E3C;           /* clay */
--color-primary-hover: #754C30;
--color-secondary: #87A96B;         /* sage */
--color-accent: #D4A355;            /* amber */
--color-bg: #FAF7F2;                /* warm off-white */
--color-surface: #FFFFFF;
--color-text: #2B1F17;              /* deep umber */
--color-text-muted: #6B5D52;
--color-border: #E8DFD3;
--color-success: #5A8050;
--color-warning: #D4A355;
--color-danger: #B85450;
--color-delay: #C97A3F;             /* terracotta — for shifted items */

/* Typography — Inter */
--font-sans: 'Inter', system-ui, sans-serif;
--text-xs: 0.75rem; --text-sm: 0.875rem; --text-base: 1rem;
--text-lg: 1.125rem; --text-xl: 1.25rem; --text-2xl: 1.5rem; --text-3xl: 1.875rem;

/* Spacing */
--space-1: 0.25rem; --space-2: 0.5rem; --space-3: 0.75rem;
--space-4: 1rem; --space-6: 1.5rem; --space-8: 2rem; --space-12: 3rem;

/* Radii */
--radius-sm: 0.25rem; --radius-md: 0.5rem; --radius-lg: 0.75rem;

/* Shadows — warm, soft */
--shadow-sm: 0 1px 2px rgba(43, 31, 23, 0.06);
--shadow-md: 0 2px 8px rgba(43, 31, 23, 0.08);
--shadow-lg: 0 8px 24px rgba(43, 31, 23, 0.12);
```

### Five-State Coverage (every screen)

1. **Empty** — illustrative icon, explanatory copy, primary CTA
2. **Loading** — skeleton matching final layout (no spinners)
3. **Populated** — real data, primary case
4. **Error** — recoverable message + retry action
5. **Edge** — long strings, many items, zero deps, offline

### Screen-by-Screen Visual Notes

- **/briefing (mobile)**: Vertical stack of cards. Header: greeting + date + project name. Card 1: Today's tasks (3-5). Card 2: Shift alerts (what moved since last check). Card 3: Upcoming orders (next 14 days). Card 4: Quick complete. Pull-to-refresh.
- **/schedule (desktop)**: Full-width Gantt. Left panel: stage/task tree. Right: timeline with bars, dependency arrows, today-line, zoom (day/week/month). Drag to reschedule. Cascade preview panel slides in on edit.
- **/schedule (mobile)**: Custom stages-only Gantt variant — stage bars span timeline, tap a stage to expand its tasks inline (accordion). Horizontal scroll for timeline, vertical scroll for stage list. Inline drag-edit deferred to desktop; mobile Gantt is read-primarily, with edits via /tasks/:id detail.
- **/setup**: Three-step wizard: Project name/dates → Template browser (cards with stage counts) → AI customize (chat-style: "remove excavation", "add insulation phase"). Progress indicator top.
- **/tasks/:id**: Header (name, status, dates). Tabs: Overview, Materials, Dependencies, Trade, Photos, Docs. Inline edit.
- **/materials**: Sortable table — name, task, quantity, lead time, order-by, status badge. Filter bar: status, stage, date-range.

### Slop Audit

Avoiding: gradient hero headers, rounded-full everything, emoji-as-icon, centered-card signup, purple-to-pink gradients, skeleton-of-everything, generic stock "collaboration" illustrations, placeholder Lorem, aspirational dashboard density without information hierarchy, 47-field forms.

---

## Pass 3: Interaction

### Key Interactions

- **Cascade preview**: When user edits a task date in Gantt or task detail, a side panel shows "N downstream tasks will shift" with delta, before save. User confirms → cascade fires → toast "12 tasks rescheduled."
- **Delay logging**: 2-tap flow: log delay button → sheet with new date picker + reason textarea → save → cascade runs → impact toast with "view changes" link.
- **Material status**: Swipe-action on row (mobile) or status dropdown (desktop): pending → ordered → delivered. Order-by date turns green when marked ordered.
- **Template customization**: Chat-style AI input beneath template preview. "Remove the landscaping stage" → AI emits diff → user approves → template updates.
- **Gantt inline edit**: Hover bar → drag endpoint → live preview → release → cascade preview modal.
- **Offline**: Service worker caches /briefing, /materials, /tasks/:id. Writes queued in IndexedDB, synced on reconnect. Banner: "Offline — changes will sync."
- **Push notifications**: Browser prompt on first /briefing visit after 2 sessions. Trigger categories: material order-by today, task starts tomorrow, cascade shifted your schedule.

### Touch Targets

All tappable elements ≥44×44px on mobile. Bottom tab bar 56px tall. Primary CTAs full-width on mobile.

### Performance Targets

- /briefing LCP <2s on 4G
- Gantt render 100 tasks <500ms
- Cascade recalc 100 tasks <200ms
- Service worker precache <500KB

### Accessibility

- WCAG AA contrast on all text
- Keyboard nav: tab order matches visual, Esc closes modals, Enter confirms
- Screen reader: semantic headings, aria-labels on icon buttons, live regions for cascade/toast
- Focus rings: 2px sage outline, not removed

---

## PO Checks (passed)

- ✅ Every entity has CRUD surface
- ✅ Every journey has 5 states designed
- ✅ Mobile-first routes (`/briefing`) sized for thumb-reach
- ✅ Desktop-first routes (`/schedule`, `/setup`) use horizontal space
- ✅ 3-click rule: briefing → task → log delay = 2 clicks
- ✅ No dead-ends: every error state has recovery action
- ✅ Killer edge is prominent: cascade impact surfaced in briefing + on every edit
