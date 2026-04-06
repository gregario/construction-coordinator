## [0.2.0] - 2026-04-06

### Added

- **Gantt chart** on the Schedule screen with task bars, dependency arrows, zoom controls (Week / Month / Full Project), Jump to Today, and a click-through task detail panel
- **Gantt inline editing** — drag task bars to move or resize them; changes cascade dates downstream automatically
- **Photo storage** — capture and upload photos directly from task pages; gallery view on `/photos` with signed-URL thumbnails rendered via next/image for optimal loading
- **Document storage** — attach PDFs, spreadsheets, and Word documents to tasks and stages; per-file signed-URL downloads
- **Project data export** — download a full project bundle as JSON or CSV (zipped); print-to-PDF via browser print dialog for a visual snapshot

### Fixed

- Photo images now load via next/image, providing automatic WebP conversion, `srcSet`, and lazy loading with no layout shift
- File uploads now validated server-side for MIME type and size before reaching storage, preventing invalid files from being persisted

## [0.1.0] - 2026-04-05

### Added

- **Project creation** — create a new construction project with name, address, and start date; localStorage draft persistence so the form survives page refreshes
- **Template browser** — choose from three seeded Irish residential build templates (Standard Timber Frame, Slab-on-Grade Single Storey, ICF Two-Storey); preview shows stages, sample tasks, total duration, and stage/task counts
- **Template customisation** — toggle tasks on/off in a collapsible stage tree; AI assist panel suggests task additions and removals based on typed descriptions; accept or reject each suggestion individually
- **Stage management** — create, rename, reorder (drag-and-drop or up/down arrows), and delete stages on the Schedule screen; color-coded stage headers
- **Task management** — add, edit, and delete tasks within stages; set planned start/end dates and completion status; full dependency tracking
- **Trade contacts** — manage a directory of trades (name, specialty, phone, email); assign a trade to each task; tap-to-call and mailto links on the trades list
- **Material line items** — add materials to tasks with quantity, lead time, and planned start date; automatic order-by date calculation (planned start minus lead time)
- **Material status tracking** — one-way status transitions (Not Ordered → Ordered → Delivered) with inline status badges; filter the materials list by status
- **Order-by deadline badges** — overdue and due-soon visual indicators on materials not yet ordered; upcoming orders surfaced on the Daily Briefing
- **Cascade scheduling engine** — delaying a task automatically shifts all downstream task dates and recalculates material order-by dates across the project
- **Delay logging** — record the reason and number of days delayed directly on a task; triggers cascade recalculation with a material movements summary
- **Daily Briefing** — today's tasks, upcoming material orders (next 7 days), and shift alerts; manual refresh button; push notification support
- **Push notifications** — web push subscription toggle on Settings; daily 7am cron job sends reminders for overdue tasks and upcoming order deadlines
- **Notification preferences** — per-type toggles (overdue tasks, upcoming orders, shift alerts) and configurable warning-days stepper
- **PWA support** — installable web app with offline shell for Briefing and Materials screens; Web App Manifest with home-screen shortcuts
- **Supabase backend** — full schema with 12 tables, row-level security on all tables, cascade date trigger (PostgreSQL recursive CTE), and performance indexes; photos and documents stored in private Supabase Storage buckets
- **Warm earth-tone design** — consistent design tokens throughout: clay primary, sage secondary, amber accent, warm off-white background
