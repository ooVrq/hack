# Decision log

One line per decision, with the reason. When someone asks at hour 18 "why are we doing it this way," this file answers instead of a 20-minute argument.

| # | Decision | Why | Date |
|---|---|---|---|
| 1 | Next.js + Postgres, one repo | Two people, 24 hours. One language, one deploy, no CORS. | 2026-09-12 |
| 2 | Email only, via Resend | Twilio A2P 10DLC registration can take days; email works in 20 minutes. SMS is a post-hackathon feature. | 2026-09-12 |
| 3 | External cron pinger, not Vercel Cron | Vercel Hobby caps cron at once per day. We need 60-second granularity. | 2026-09-12 |
| 4 | Hash-first, AI-last pipeline | 95% of checks are no-change. Hashing makes them free; the model only ever sees a diff. | 2026-09-12 |
| 5 | ~~Magic-link auth, no passwords~~ (superseded by 11) | Verifies the email address (required before we send alerts) and removes password handling entirely. Two problems, one task. | 2026-09-12 |
| 6 | Store normalized text, not raw HTML | Free-tier database. Snapshots only on change, last 10 retained. | 2026-09-12 |
| 7 | Self-hosted `/demo/job-board` target | A live demo cannot depend on a third-party site changing on cue. | 2026-09-12 |
| 8 | TigerData Cloud instead of Neon | Hackathon sponsor, and it is plain managed Postgres — the schema did not change. | 2026-09-12 |
| 9 | `checks` is a hypertable; `snapshots` is not | `checks` is real append-only time-series (288 rows/day/watch); `snapshots` only gets a row when the page actually changed. Hypertabling both would be ceremony. | 2026-09-12 |
| 10 | Retention policy replaces manual check cleanup | `add_retention_policy` is one line and self-maintaining; the continuous aggregate keeps the lifetime counts after the rows are dropped. | 2026-09-12 |
| 11 | No accounts — a watch is its own unguessable link | The form is url + condition + email. Magic-link auth would cost ~3h and block on email. The email is only the notification address; `users` is upserted by it. | 2026-09-12 |
| 12 | Every watch is AI-judged; fallback is any-change | The form only collects plain English. No keyword/regex engine. If Gemini is unavailable a changed hash counts as a match, labelled as such. | 2026-09-12 |
| 13 | 1-minute default interval | Demo feel over cost; the hash filter makes unchanged checks free anyway. | 2026-09-12 |
| 14 | robots.txt disallow = warn, user may override | Blocking outright could reject a demo target. The dialog states KeepAnIOn.tech is not responsible for rules broken; the watch is flagged `robots_blocked` and the status page says so. | 2026-09-12 |
| 15 | URL is fetched at submit; unreadable pages are rejected | JS-shell and 403 targets fail loudly in the form instead of silently never alerting. The fetch doubles as the baseline snapshot. | 2026-09-12 |
| 16 | Notifications are queued rows, not sent | Email is deliberately deferred; the pipeline inserts `notifications(status='queued')` so the email feature only has to drain that table. | 2026-09-12 |

<!-- Add rows as you go. Cheap to write, expensive to reconstruct later. -->
