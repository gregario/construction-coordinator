# Sitemap — Self-Build Manager v0.3.0

PROJECT: Self-Build Manager
DATE: 2026-04-06
SCOPE: Multi-block construction management

---

## ENTRY POINTS

```
Direct URL bookmark  --> /briefing (authenticated) or /login (unauthenticated)
PWA home screen      --> /briefing
Push notification    --> /briefing or /snags/:id or /materials
Email (password reset) --> /forgot-password
First visit          --> /signup
```

## AUTH BOUNDARY

```
Public:
  /login
  /signup
  /forgot-password

Authenticated (all below require login):
  /setup/*
  /briefing
  /schedule
  /stages/*
  /materials
  /trades
  /snags/*
  /photos
  /settings
```

## SCREEN TREE

```
/ (redirect → /briefing if authenticated, /login if not)
│
├── AUTH
│   ├── /login                              Sign in (email + password)
│   ├── /signup                             Create account
│   └── /forgot-password                    Password reset flow
│
├── SETUP (wizard, desktop-first)
│   ├── /setup                              Router: dispatches to current setup step
│   │   Step 1: Project Details             Name, address, start date
│   │   Step 2: Blocks                      Add blocks (name, attached/detached, storeys)
│   │   Step 3: Construction Scheme         Per-block method picker (Foundation, Structure, Envelope...)
│   │   Step 4: Block Sequencing            Per-category parallel/sequential + block order
│   │   Step 5: Review & Activate           Summary → activate project → redirect /briefing
│   │
│   │   (Steps 3-4 repeat per block, with "Apply same" shortcut)
│
├── DAILY (mobile-first)
│   └── /briefing                           Today's substages, shift alerts, upcoming orders, snag summary
│       --> /stages/:id                     (tap substage → stage detail)
│       --> /materials                      (tap material order → materials)
│       --> /snags                          (tap snag count → snag list)
│
├── PLANNING (desktop-first)
│   ├── /schedule                           Gantt chart + stage nav + block filter
│   │   --> /stages/:id                     (click task bar → stage detail)
│   │
│   ├── /stages                             Stage/substage browser grouped by block
│   │   └── /stages/:id                     Stage detail: substage list, inline edit, documents
│   │       --> /stages                     (back → stages with parent expanded)
│   │
│   └── /materials                          Procurement dashboard: status pipeline, order-by dates
│       --> /stages/:id                     (click substage name → stage detail)
│
├── PEOPLE & QUALITY
│   ├── /trades                             Trade contact directory
│   │   --> /snags?trade=:id                (view trade's snags)
│   │
│   ├── /snags                              Snag list: grouped by status, filterable
│   │   └── /snags/:id                      Snag detail: description, photos, status, trade
│   │       --> /snags                      (back → snag list)
│   │
│   └── /photos                             Photo gallery with tag filters (Building Control, Progress, Snag)
│       --> /snags/:id                      (click snag photo → snag detail)
│
└── SETTINGS
    └── /settings                           Tabbed: Project Details | Account | Notifications | Data
        Project Details tab                 Edit name, address, block summary, link to /setup edit
        Account tab                         Email, change password, sign out
        Notifications tab                   Push toggle, preference types, warning days
        Data tab                            Export (JSON, CSV, PDF)
```

## NAVIGATION

```
DESKTOP SIDEBAR (≥768px):
  ┌─────────────────────┐
  │ 🏗 Self-Build Manager │  (brand)
  │                       │
  │  Briefing             │  (primary nav)
  │  Schedule             │
  │  Stages               │
  │  Materials            │
  │  Trades               │
  │  ─────────            │  (divider)
  │  Snags                │  (secondary nav)
  │  Photos               │
  │  Settings             │
  │                       │
  │  Sign out             │  (footer)
  └─────────────────────┘

MOBILE BOTTOM TAB BAR (<768px):
  ┌──────────────────────────────────────┐
  │ Briefing  Schedule  Materials  More  │
  └──────────────────────────────────────┘

  "More" opens a sheet with: Stages, Trades, Snags, Photos, Settings

BREADCRUMBS (contextual, not global):
  /stages/:id     →  Stages > [Stage Name]
  /snags/:id      →  Snags > [Snag Title]
  /setup (step N) →  Setup > Step N of 5
```

## KEY CHANGES FROM v0.2.0

1. **Setup wizard expanded**: 2 steps → 5 steps (blocks, scheme picker, sequencing added)
2. **Snags added**: New /snags route + /snags/:id detail in both sidebar and mobile "More"
3. **Stages promoted**: Now the primary substage management surface (was placeholder)
4. **Schedule restructured**: Stage nav above Gantt, block filter added
5. **Photos enhanced**: Tag filter tabs (Building Control, Progress, Snag, All)
6. **Settings tabbed**: 4 tabs replacing 2 placeholders + existing notifications
7. **Mobile "More"**: Added to accommodate new nav items without overcrowding bottom bar
