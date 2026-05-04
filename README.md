# Construction Coordinator

Project management for owner-builders. Know exactly where your build stands — material lead times, dependency cascade, and daily briefing in one app.

Built with [The Rouge](https://github.com/gregario/the-rouge) — an autonomous AI product factory.

## Features

- **Material Tracking** — lead times, delivery dates, what's blocking what
- **Dependency Management** — automatic cascade when materials are delayed
- **Daily Briefing** — mobile-optimized summary of what's ready to start today
- **Progress Tracking** — visual timeline, completion status, critical path

## Tech Stack

- **Frontend:** Next.js 15, React 19, TypeScript, Tailwind CSS
- **Backend:** Supabase (database + auth + realtime)
- **Notifications:** Web Push (VAPID), cron-scheduled briefings
- **Deployment:** Vercel

## Setup

```bash
git clone https://github.com/gregario/construction-coordinator.git
cd construction-coordinator
npm install
cp .env.example .env
# Fill in your Supabase credentials and VAPID keys in .env
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

## Environment Variables

See `.env.example` for required configuration. You'll need:
- Supabase project (database + auth)
- VAPID keypair (for push notifications)
- CRON_SECRET (random string for webhook auth)

Generate VAPID keys:
```bash
npx web-push generate-vapid-keys
```

## License

MIT
