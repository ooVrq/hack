# Decision log

One line per decision, with the reason. When someone asks at hour 18 "why are we doing it this way," this file answers instead of a 20-minute argument.

| # | Decision | Why | Date |
|---|---|---|---|
| 1 | Next.js + Postgres, one repo | Two people, 24 hours. One language, one deploy, no CORS. | 2026-09-12 |
| 2 | Email only, via Resend | Twilio A2P 10DLC registration can take days; email works in 20 minutes. SMS is a post-hackathon feature. | 2026-09-12 |
| 3 | External cron pinger, not Vercel Cron | Vercel Hobby caps cron at once per day. We need 60-second granularity. | 2026-09-12 |
| 4 | Hash-first, AI-last pipeline | 95% of checks are no-change. Hashing makes them free; the model only ever sees a diff. | 2026-09-12 |
| 5 | Magic-link auth, no passwords | Verifies the email address (required before we send alerts) and removes password handling entirely. Two problems, one task. | 2026-09-12 |
| 6 | Store normalized text, not raw HTML | Free-tier database. Snapshots only on change, last 10 retained. | 2026-09-12 |
| 7 | Self-hosted `/demo/job-board` target | A live demo cannot depend on a third-party site changing on cue. | 2026-09-12 |

<!-- Add rows as you go. Cheap to write, expensive to reconstruct later. -->
