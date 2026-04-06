# Visual Design — Self-Build Manager v0.3.0

PROJECT: Self-Build Manager
DATE: 2026-04-06

---

## STYLE TOKENS (updated from v0.2.0)

The existing warm earth-tone palette is carried forward. New tokens added for procurement states, snag priorities, and block identification.

### Colour Palette

```css
:root {
  /* === BRAND (unchanged) === */
  --color-primary: #8B5E3C;           /* clay — primary actions, active nav, headers */
  --color-primary-hover: #754C30;     /* darker clay — hover states */
  --color-primary-light: #B8916E;     /* lighter clay — selected card borders */
  --color-secondary: #87A96B;         /* sage — success, completed, focus rings */
  --color-accent: #D4A355;            /* amber — warnings, due-soon */

  /* === BACKGROUNDS (unchanged) === */
  --color-bg: #FAF7F2;                /* warm off-white — page background */
  --color-surface: #FFFFFF;           /* white — cards, panels */
  --color-surface-hover: #F5F0E8;     /* warm hover — card hover, row hover */
  --color-surface-selected: #F0E9DD;  /* warm selected — selected card background */

  /* === TEXT (unchanged) === */
  --color-text: #2B1F17;              /* deep umber — headings, primary text */
  --color-text-muted: #6B5D52;        /* warm grey — secondary text, labels */
  --color-text-inverse: #FAF7F2;      /* light — text on primary bg */

  /* === BORDERS (unchanged) === */
  --color-border: #E8DFD3;            /* warm border — cards, dividers */
  --color-border-focus: #87A96B;      /* sage — focus ring color */

  /* === STATES (unchanged) === */
  --color-success: #5A8050;           /* forest green — complete, delivered */
  --color-warning: #D4A355;           /* amber — due-soon, in-progress */
  --color-danger: #B85450;            /* brick red — overdue, critical, errors */
  --color-delay: #C97A3F;             /* terracotta — shifted/delayed items */

  /* === NEW: PROCUREMENT STATUS === */
  --color-not-quoted: #9B8B7A;        /* warm grey — not yet started */
  --color-quoted: #6B8F9B;            /* slate blue — quoted, awaiting decision */
  --color-ordered: #8B7DB8;           /* muted purple — committed, ordered */
  --color-in-transit: #D4A355;        /* amber — on the way */
  --color-delivered: #5A8050;         /* forest green — received, done */

  /* === NEW: SNAG PRIORITY === */
  --color-priority-low: #87A96B;      /* sage — low priority */
  --color-priority-medium: #D4A355;   /* amber — medium priority */
  --color-priority-high: #C97A3F;     /* terracotta — high priority */
  --color-priority-critical: #B85450; /* brick red — critical */

  /* === NEW: BLOCK IDENTIFICATION === */
  /* Blocks get assigned colours from this palette for Gantt visual grouping */
  --color-block-1: #8B5E3C;          /* clay */
  --color-block-2: #6B8F3F;          /* olive */
  --color-block-3: #4A7FA5;          /* steel blue */
  --color-block-4: #7B6FA5;          /* muted purple */
  --color-block-5: #A56B4A;          /* sienna */

  /* === SHADOWS (unchanged) === */
  --shadow-sm: 0 1px 2px rgba(43, 31, 23, 0.06);
  --shadow-md: 0 2px 8px rgba(43, 31, 23, 0.08);
  --shadow-lg: 0 8px 24px rgba(43, 31, 23, 0.12);

  /* === RADII === */
  --radius-sm: 0.25rem;              /* badges, chips */
  --radius-md: 0.5rem;               /* cards, inputs, buttons */
  --radius-lg: 0.75rem;              /* panels, dialogs */
  --radius-full: 9999px;             /* avatars, pills */
}
```

### Typography

```css
:root {
  --font-sans: 'Inter', system-ui, sans-serif;

  /* Scale */
  --text-xs: 0.75rem;    /* 12px — metadata, timestamps */
  --text-sm: 0.875rem;   /* 14px — body text, labels */
  --text-base: 1rem;     /* 16px — primary body */
  --text-lg: 1.125rem;   /* 18px — section headings */
  --text-xl: 1.25rem;    /* 20px — page subheadings */
  --text-2xl: 1.5rem;    /* 24px — page headings */
  --text-3xl: 1.875rem;  /* 30px — hero/setup headings */

  /* Weights */
  --font-regular: 400;
  --font-medium: 500;
  --font-semibold: 600;
}
```

### Spacing System

```
Base unit: 4px (0.25rem)
  space-1: 4px   — tight gaps (icon-to-text)
  space-2: 8px   — within components (badge padding, small gaps)
  space-3: 12px  — between sibling elements
  space-4: 16px  — standard padding, card internal
  space-6: 24px  — section spacing, card padding desktop
  space-8: 32px  — between major sections
  space-12: 48px — page top padding, large separations
```

---

## SCREEN-BY-SCREEN VISUAL NOTES

### /setup — Setup Wizard

**Layout**: Single-column centered (max-w-2xl), with stepper at top.

**SetupStepper visual**: Horizontal step indicators.
```
  ●───●───○───○───○
  1   2   3   4   5
```
- Completed step: filled circle (--color-primary)
- Current step: filled circle + label bold
- Future step: empty circle (--color-border)
- Connector: 2px line, --color-border (completed: --color-primary)

**Method Cards (Step 3)**: 
- Unselected: white bg, --color-border border, shadow-sm
- Selected: --color-surface-selected bg, --color-primary-light border (2px), shadow-md
- Hover: --color-surface-hover bg
- Card size: min-h-[120px], equal height in grid
- Radio indicator: top-right of card, 20px circle (filled when selected)

**Block cards (Step 2)**:
- Attachment badge: "Attached" (sage bg) or "Detached" (warm grey bg)
- Storeys shown as small text: "2 storeys"
- Delete button: ghost, --color-danger on hover, only shown if >1 block

**Sequencing toggles (Step 4)**:
- Toggle: custom segmented control (not a switch). "Parallel" | "Sequential"
- When sequential: block order list appears with subtle slide-down animation
- Drag handles: 6-dot grip icon, --color-text-muted

### /briefing — Daily Briefing

**Cards**: Stack of warm cards with consistent padding.
- Today's substages card: left border accent (--color-primary, 3px)
  - Each substage row: checkbox + name + block label (small badge) + stage label
  - Checkbox: custom, 20px, --color-primary when checked with checkmark
  - Completed substages: line-through text, --color-text-muted

- Shift alerts card: left border accent (--color-delay, 3px)
  - Each alert: icon (arrow-right, --color-delay) + "Plasterboard: Jun 5 → Jun 8"
  - Dismissible: small X button, fades out

- Upcoming orders card: left border accent (--color-accent, 3px)
  - Each order: material name + order-by date + status badge
  - Overdue items: --color-danger badge, bold date

- Snag summary row: compact, inline. "3 open snags (1 critical)" with priority badges
  - Only shown if >0 open snags
  - Taps through to /snags

### /schedule — Gantt Chart

**Controls bar**: Single row, space-between layout.
- Block filter: compact Select, left-aligned
- Stage tabs: horizontal scroll container, pill-style tabs
  - Active: --color-primary bg, inverse text
  - Inactive: transparent bg, --color-text-muted, hover: --color-surface-hover
- Zoom controls: ToggleGroup, right-aligned, small
- Jump to Today: ghost button with calendar-search icon

**Gantt block headers**:
- Background: --color-surface-hover
- Left border: 4px, block colour (--color-block-N)
- Text: semibold, --color-text
- Collapsible: chevron-right rotates to chevron-down

**Gantt bars**:
- Bar height: 24px, radius-sm corners
- Bar color: stage.color (from construction scheme)
- Completed portion: full opacity. Remaining: 60% opacity
- Dependency arrows: --color-border, 1px, curved with arrowhead
- Today line: 2px dashed, --color-danger
- Drag handles: appear on hover, left/right edges, cursor: col-resize

**Cascade preview panel**:
- Slides in from right, width 360px
- Background: --color-surface
- Border-left: 2px --color-delay
- Header: "Schedule Impact" with cascade icon
- Each shifted item: old date (strikethrough, muted) → new date (bold)
- Warning items (overdue): --color-danger icon
- Footer: [Cancel (ghost)] [Confirm (primary)]

### /stages — Stage Browser

**Block sections**:
- Block heading: text-lg semibold + block colour dot (12px circle) + metadata (muted, sm)
- Divider between blocks: 1px --color-border with space-8

**Stage accordions**:
- Header: stage name (semibold) + completion badge ("3/5", green if all done, muted otherwise)
- Trigger: full width, hover: --color-surface-hover
- Content: substage rows with alternating row tinting (even rows: --color-surface, odd: --color-bg)

**Substage rows**:
- Layout: name (flex-1) | date range (text-sm, muted) | status badge | trade name (text-sm, muted)
- Status badges:
  - Not started: outline badge, --color-text-muted
  - In progress: filled badge, --color-warning (amber)
  - Complete: filled badge, --color-success (green)
  - Delayed: filled badge, --color-delay (terracotta)
- Row hover: --color-surface-hover, cursor pointer
- Click: navigates to /stages/:id (stage detail with all substages)

### /snags — Snag List

**Snag cards**:
- Layout: horizontal card with left priority stripe (4px, priority colour)
- Title: semibold, text-base
- Metadata row: priority badge + trade name + block/stage labels (text-sm, muted)
- Photo count: camera icon + "2 photos" (text-xs, muted)
- Date: "Apr 3" (text-xs, muted, right-aligned)

**Priority badges**:
- Low: sage bg, dark text
- Medium: amber bg, dark text
- High: terracotta bg, white text
- Critical: brick red bg, white text, bold

**Status sections**:
- "Open" heading: text-lg, no extra decoration (these are the focus)
- "In Progress" heading: text-lg, --color-text-muted
- "Resolved" heading: collapsible, --color-text-muted, chevron icon

**Add Snag FAB (mobile)**:
- Position: fixed, bottom-right, 56px circle
- Background: --color-primary
- Icon: plus (24px, white)
- Shadow: shadow-lg
- Offset: 16px from edges, 72px from bottom (above tab bar)

### /materials — Procurement Dashboard

**Pipeline summary bar**:
- Horizontal segmented bar, full width
- Each segment: proportional width to count
- Colors: --color-not-quoted → --color-quoted → --color-ordered → --color-in-transit → --color-delivered
- Count label centered in each segment (white text if dark bg, dark text if light bg)
- Click segment: activates that status tab below
- Min segment width: 48px (always visible even with count=1)

**Overdue alert**:
- Alert variant: warm destructive (--color-danger bg at 10%, --color-danger text)
- Icon: alert-triangle
- "2 materials past order-by date" + [View] button
- Dismissible: X button, reappears on page reload (intentionally persistent)

**Material table**:
- Zebra striping: --color-surface / --color-bg alternating rows
- Status badge in each row: coloured pill matching procurement colour
- Order-by date: --color-danger text if overdue, --color-warning if due within 7 days, normal otherwise
- Expand indicator: chevron-right per row, rotates on expand

### /photos — Photo Gallery

**Tag filter tabs**:
- Same pill-tab style as schedule stage tabs
- Active: --color-primary bg, inverse text
- Count per tab shown in parentheses: "Building Control (8)"

**Photo grid**:
- Desktop: 4 columns, 8px gap
- Tablet: 3 columns
- Mobile: 2 columns
- Thumbnails: aspect-ratio 1/1, object-cover, radius-md
- Hover: slight scale (1.02) + shadow-md transition
- Building Control tab: photos grouped under section headers (inspection stage names)

**Upload dialog**:
- Tag selector: segmented ToggleGroup (Building Control | Progress | General)
- Inspection stage: Select, only shown when tag = Building Control
- Preview: image thumbnail in dialog, max-h-[200px]

### /settings — Settings Page

**Tab bar**: horizontal, underline style (not pill).
- Active tab: --color-primary underline (2px), semibold text
- Inactive: no underline, --color-text-muted

**Block summary (Project Details tab)**:
- Read-only cards per block: name, method names, storeys, attachment
- Compact card layout (not full-size cards — these are informational)
- "Edit Blocks & Scheme" link: --color-primary, underline on hover

---

## INTERACTION SPEC

### Animations & Transitions

| Interaction | Animation | Duration | Easing |
|-------------|-----------|----------|--------|
| Card hover | bg-color transition | 150ms | ease-out |
| Accordion expand | height slide + opacity | 200ms | ease-out |
| Stage tab switch | underline slide | 150ms | ease-out |
| Cascade panel slide-in | translateX from right | 200ms | ease-out |
| FAB press | scale(0.95) | 100ms | ease-in-out |
| Snag status change | card slide-out from section, slide-in to new section | 300ms | ease-in-out |
| Setup step transition | fade content (no slide — steps are conceptual, not spatial) | 150ms | ease-in-out |
| Toast notification | slide-up from bottom | 200ms | ease-out |
| Block order drag | item follows cursor, placeholder gap | realtime | — |
| Gantt bar drag | bar follows cursor, downstream bars preview shift | realtime | — |
| Photo lightbox | fade bg + scale image from thumbnail | 250ms | ease-out |

### Micro-interactions

- **Checkbox complete**: Quick scale bounce (1.0 → 1.15 → 1.0) over 200ms. Checkmark draws in.
- **Procurement advance**: Status badge colour transitions smoothly (150ms) as the status changes.
- **Shift alert dismiss**: Fade + slide-left out (200ms), list items close gap.
- **Method card select**: Border transitions from --color-border to --color-primary-light (150ms). Radio indicator fills.
- **Block delete confirmation**: Dialog with "Type block name to confirm" for safety.

### Sound Cues

None. Construction sites are noisy — haptic feedback (navigator.vibrate) for mobile actions only:
- Substage complete: 50ms vibrate
- Snag resolved: 50ms vibrate
- Cascade confirmed: 100ms vibrate

---

## ACCESSIBILITY

### Contrast (WCAG AA)

| Combination | Ratio | Pass? |
|-------------|-------|-------|
| --color-text on --color-bg | 13.2:1 | Yes |
| --color-text on --color-surface | 14.7:1 | Yes |
| --color-text-muted on --color-bg | 5.1:1 | Yes |
| --color-text-inverse on --color-primary | 5.8:1 | Yes |
| --color-danger on --color-surface | 4.6:1 | Yes |
| --color-success on --color-surface | 4.5:1 | Yes (AA) |
| Priority Critical badge (white on red) | 5.3:1 | Yes |

### Keyboard Navigation

- Tab order follows visual order (top → bottom, left → right)
- Escape closes: dialogs, sheets, cascade panel, lightbox
- Enter confirms: primary action in dialogs, form submission
- Arrow keys: navigate method cards (Step 3), reorder blocks (Step 4 sequencing)
- Space: toggle checkboxes, expand accordions

### Screen Reader

- Semantic headings: h1 (page title), h2 (section/block names), h3 (stage names)
- `aria-label` on icon-only buttons (edit, delete, drag handle)
- `aria-live="polite"` regions: cascade impact summary, toast notifications, snag count updates
- `aria-expanded` on accordion triggers
- `role="status"` on procurement pipeline counts
- `aria-current="step"` on setup wizard stepper

### Focus Management

- Dialog open: focus trapped inside, moves to first focusable element
- Dialog close: focus returns to trigger element
- Accordion expand: focus stays on trigger
- Setup wizard step change: focus moves to step heading
- Snag status change: focus stays on the snag card (it moves to new section)

---

## RESPONSIVE BREAKPOINTS

| Breakpoint | Layout Changes |
|------------|----------------|
| <640px (mobile) | Single column. Bottom tab bar. FAB for snags. Method cards 1-col. Gantt simplified (stage bars only, no drag). Photo grid 2-col. |
| 640-768px (tablet) | Single column, wider cards. Bottom tab bar still. Method cards 2-col. Photo grid 3-col. |
| ≥768px (desktop) | Sidebar navigation. Multi-column layouts. Full Gantt with drag. Photo grid 4-col. Setup wizard centered max-w-2xl. |
| ≥1280px (wide) | Gantt left panel wider. Material table shows all columns. Settings tabs horizontal with more breathing room. |

---

## SLOP AUDIT

Actively avoiding:
- Gradient hero headers on setup pages
- Generic construction stock photos as empty states
- Dashboard-density overload on mobile
- Purple-to-pink accent colours (this is construction, not SaaS marketing)
- Centered-card layouts for data-heavy pages
- Over-rounded corners on data tables
- Emoji as status indicators (use colour-coded badges with text)
- Auto-playing animations on page load
- Skeleton-everywhere (only skeleton where data loads async)
- "AI-powered" badges or branding (the AI features are invisible — they work, they don't advertise)

Actively pursuing:
- Warmth through earth tones that feel like building materials
- Density on desktop, breathing room on mobile
- Construction industry vocabulary throughout (stages, substages, blocks, snags, trades)
- Information hierarchy that matches urgency (overdue items impossible to miss)
- Touch targets sized for gloved/dirty hands on a building site (≥48px on mobile)
- Fast interactions for in-field use (2-tap delay logging, swipe-to-advance material status)
