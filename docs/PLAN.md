# 24-hour build plan — 2 people

Hours are relative to kickoff (H0). **A** = frontend-leaning, **B** = backend-leaning. You will drift across the line; that is fine. What matters is that the schema and API contract are frozen in hour 1 so neither of you is ever blocked waiting on the other.

## The three milestones that matter

| By | Milestone | If you miss it |
|---|---|---|
| **H1** | Hello-world deployed to a public Vercel URL | Stop and fix. Deploying at hour 23 is how teams fail to submit. |
| **H10** | One real end-to-end alert: watch a page, change it, receive the email | Drop the AI layer to a stretch goal and get keyword matching working first. |
| **H19** | Feature freeze | Anything unfinished at H19 gets deleted, not finished. |

---

## H0–H1 · Foundation (both, together)

- `npx create-next-app@latest` — TypeScript, App Router, Tailwind.
- **Deploy to Vercel immediately.** Empty page, real URL. Do it now.
- Create TigerData Cloud service, Resend account, Gemini API key. Fill `.env.local` from `.env.example` and share the values in a private channel.
- Apply the schema: `cd ion && npm run db:migrate`, then `npm run db:verify`. The migrations live in `ion/db/*.sql`; `002_timescale.sql` adds the hypertable rollups and retention policy, which are what make this a TigerData project rather than a project that happens to store rows.
- Read `docs/API.md` out loud to each other. Change anything you disagree with **now**.
- Set up the external cron pinger (cron-job.org) pointing at `/api/cron/tick` — it can 404 for the next six hours, that's fine.

## H1–H3

**A** — Auth.js with the Resend magic-link provider. Signed-in layout shell, nav, empty dashboard. This also gives you verified emails for free.
**B** — `lib/extract.ts`: `fetch → cheerio → select region → normalize → sha256`. Pure function, no DB. Save 3 real HTML pages into `test/fixtures/` and write vitest tests against them. **This is the only code worth unit-testing; do it properly.**

## H3–H6

**A** — Create-watch form with live preview (calls `POST /api/preview`), dashboard list with status chips. Mock the data if B isn't done.
**B** — `POST/GET/PATCH/DELETE /api/watches`, `POST /api/preview`, `lib/diff.ts`, and the rule engine (`keyword_appears`, `keyword_disappears`, `regex`, `any_change`).

## H6–H8

**A** — Watch detail page: check-history timeline, colored added/removed diff, "Check now" button.
**B** — `/api/cron/tick`: the claim query, concurrency limit of 5, snapshot storage + pruning, failure counting and backoff. Verify two simultaneous ticks never double-process a watch.

## H8–H10 · 🎯 END TO END

**Both.** Wire Resend in. Write the alert email (subject = the summary, body = matched snippet + diff + button to the page + unsubscribe link). Create a watch on a page you control, change it, get the email. **Screenshot this the moment it works** — it is your submission's hero image and proof the thing is real.

## H10–H13 · The AI layer

**B** — `lib/judge.ts`: Gemini call with a response schema, temperature 0, diff truncation, delimiter-wrapped untrusted content, cache by `hash(condition+diff)`, graceful fallback to the rule engine on error.
**A** — Natural-language condition input in the create form ("Describe what you're waiting for…"), plus rendering `confidence` and `ai_summary` on the timeline. Showing the model's *evidence line* is what makes this feel intelligent rather than magic.

## H13–H15 · Hardening

**B** — SSRF guard (with redirect re-validation), robots.txt check, 15s timeout, 2MB cap, per-domain throttle, watch limits per user, pause-after-5-failures + notification email.
**A** — Every error state in the UI: blocked, failing, paused, empty extraction, cooldown. A dashboard that only renders the happy path looks unfinished.
**Sleep swap:** one of you naps H13–H16, the other H16–H19. Two exhausted people at H22 ship worse than one rested person.

## H15–H17 · Demo infrastructure

- `/demo/job-board` — a page in your own app that looks like a careers listing, with an admin toggle flipping "Applications closed" → **Apply Now**. This is how you trigger a live alert on stage. See `DEMO.md`.
- Seed script: a user, 5 watches, ~200 checks over 48h, one triggered alert in the history.
- A live "last checked N seconds ago" ticker on the dashboard. Cheap, and it makes the product feel awake.

## H17–H19 · Design pass

You cited cobalt.tools and monkeytype — both are dark, restrained, monospace-accented, and fast. Commit to that: one accent color, `ui-monospace` for URLs/hashes/diffs, generous spacing, no gradients, transitions under 150ms. Then: mobile layout, favicon, page titles, an actual landing page with a one-sentence pitch and a screenshot.

## H19 · FEATURE FREEZE

No new features. Bug-bash **on the deployed URL**, not localhost — that is where the demo happens and where env-var mistakes surface.

## H19–H22 · Submission

README with the architecture diagram, screenshots, and what each of you built. Devpost writeup. Make sure the public URL works in an incognito window — the classic failure is an app that only works while you're logged in on your own laptop.

## H22–H23 · Rehearse

Run the demo three times, out loud, with a timer. **Record a 2-minute screen capture as a backup** — if the venue wifi dies during judging, you play the video. Teams that do this never need it; teams that don't, do.

## H23–H24 · Buffer

Submit early. Something will go wrong.

---

## Priority order when time runs short

You said don't cut scope — but if something breaks at H18 you need to already know what to sacrifice. Defend in this order:

1. Create a watch → it checks on a schedule → you get an email. **Without this there is no product.**
2. Keyword rules + the diff timeline.
3. AI natural-language conditions. *(The differentiator — but it is worthless bolted onto a pipeline that doesn't run.)*
4. SSRF/robots hardening. *(Fast to build, disproportionately impressive to judges.)*
5. Polish, landing page, mobile.
6. Stretch: multi-channel notifications, shared/public watches, screenshot-on-change, browser-extension "watch this selector".

## Working agreement

- Branch per feature, PR into `main`, merge fast. Never work directly on `main` — one bad push at H20 with two people editing is unrecoverable.
- `main` must always deploy. If a preview build is red, fix it before moving on.
- Commit every ~30 minutes. Push before you nap.
- 15-minute rule: stuck for 15 minutes, say so out loud. Hackathons are lost to silent debugging.
- Two people, one AI agent each, one codebase: keep your file ownership roughly split along the A/B lines above so you aren't generating conflicting edits into the same files.
