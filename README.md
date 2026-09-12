# Watchtower

*HackWesTX 2026*

**Tell us what you're waiting for. We'll refresh the page for you.**

You're waiting on an internship to open, a course to free up a seat, a restock, a ticket drop. You don't know when it happens, so you refresh the page fifteen times a day and hope you aren't asleep when it does.

Watchtower watches instead. Give it a URL and describe the change in plain English. It polls the page, detects when the change actually happens, and emails you within a minute — with the exact sentence that changed and a link straight to it.

## How it works

Every check runs through a funnel of increasingly expensive filters:

1. **Fetch** the page through an SSRF-guarded client with a timeout and a size cap.
2. **Normalize** it — strip scripts, nav, ads, timestamps, counters, and every other thing that changes on its own — down to plain text.
3. **Hash** it. If the hash matches the last snapshot, we're done. This is ~95% of all checks, and it costs nothing.
4. **Diff** the change, and run it through a rule engine (keyword appeared, disappeared, regex, any change).
5. **Judge** it with Gemini — but only on ambiguous diffs or plain-English conditions, and it only ever sees the diff, never the page.
6. **Notify** by email, with a cooldown so one change never becomes ten emails.

The AI is the judge, not the scraper. That's what makes checking every minute affordable.

## Docs

| | |
|---|---|
| [Architecture](docs/ARCHITECTURE.md) | System diagram, the check pipeline, security model, risk table |
| [Data model](docs/DATA_MODEL.md) | Schema, indexes, the concurrency-safe claim query |
| [API contract](docs/API.md) | Endpoints and payload shapes — frozen early so we build in parallel |
| [Build plan](docs/PLAN.md) | Hour-by-hour 24h schedule, ownership split, priority order |
| [Demo plan](docs/DEMO.md) | The 3-minute script and the pre-flight checklist |
| [Decisions](docs/DECISIONS.md) | Why things are the way they are |

## Getting started

```bash
cp .env.example .env.local   # fill in DATABASE_URL, RESEND_API_KEY, GEMINI_API_KEY, AUTH_SECRET, CRON_SECRET
npm install
npm run db:migrate
npm run seed                 # a user, 5 watches, 200 checks of fake history
npm run dev
```

## Stack

Next.js (App Router, TypeScript) · Tailwind · Postgres (Neon) · Auth.js · Resend · Google Gemini · Vercel

## Team

Built in 24 hours at HackWesTX 2026.
