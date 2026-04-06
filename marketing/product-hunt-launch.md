# Construction Manager -- Product Hunt Launch Copy

## Title

Construction Manager

## Tagline

Dynamic build scheduling for expert owner-builders

## Description

If you've ever managed your own home build, you know the pain: a single material delay cascades through your entire schedule, and you're stuck recalculating across Google Sheets, a task app, and your phone contacts.

Construction Manager is a scheduling and coordination tool built specifically for owner-builders managing residential new construction.

**What it does:**

- **Material lead time tracking** -- enter lead times for every material; the app calculates "order by" dates and warns you before a late order creates a delay
- **Cascade scheduling engine** -- when any task slips, every downstream dependency recalculates automatically. No more manual spreadsheet updates.
- **Daily briefing** -- open the app each morning and see what's due today, what's at risk this week, and which materials need ordering. Designed for the job site, not the office.
- **Hierarchical task management** -- stages break into tasks, tasks link to materials, trades, and documents
- **Interactive Gantt chart** -- visual timeline on desktop with dependency links
- **Photo and document storage** -- inspection reports, progress photos, and spec sheets attached directly to their tasks
- **Your data stays yours** -- export as JSON, CSV, or PDF at any time

**Who it's for:**

Expert owner-builders who already understand construction sequencing. You don't need the tool to teach you how to build -- you need it to track what's happening and what shifted.

**Why it exists:**

Buildertrend ($339+/mo) and Procore ($10K+/yr) are built for general contractors managing commercial projects. HBApp and similar tools lack a real scheduling engine. Nobody combines material intelligence, cascade scheduling, and a daily briefing for the individual managing their own build.

Construction Manager is a web app (PWA) -- installs on your phone like a native app, works on any browser. Built with Next.js, Supabase, and Vercel.

## Maker Comment

I built Construction Manager because I watched my father-in-law manage his owner-build across five different tools and a legal pad. He understood every trade, every dependency, every material lead time -- the knowledge wasn't the problem. The problem was that no single tool could hold all of it and keep the schedule current when things changed.

The core of Construction Manager is the cascade engine. Update one date, and every downstream task adjusts. Add a material lead time, and the "order by" date appears automatically. The daily briefing pulls it all together so you start each morning knowing exactly where the build stands.

This is for experienced owner-builders -- the kind of person who can walk a framing inspection but doesn't want to spend Sunday evening recalculating a Gantt chart in Google Sheets.

We'd appreciate your feedback, especially from anyone who's managed (or is currently managing) their own build.

## Suggested Visuals

1. **Hero screenshot:** Daily briefing view on a mobile device, showing today's tasks, at-risk items, and materials to order -- clean, scannable, job-site-ready
2. **Desktop screenshot:** Interactive Gantt chart with dependency arrows and a cascade highlight showing how one task's delay ripples through downstream tasks
3. **Side-by-side:** The "before" (spreadsheet Gantt + task app + phone contacts) vs "after" (single Construction Manager screen) comparison
4. **Short video (30s):** Update a task completion date and watch the cascade engine recalculate the downstream schedule in real time
5. **Mobile install:** Phone home screen showing Construction Manager as an installed PWA alongside native apps
