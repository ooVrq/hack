# API

What is actually deployed (2026-09-12). Errors are always `{ "error": { "code", "message" } }` with a message a person can read; codes are the `ApiErrorCode` union in `ion/lib/types.ts`, which is the source of truth for every shape below.

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/watches` | Create a watch. Fetches the page now (baseline snapshot), checks robots.txt. |
| `POST` | `/api/watches/:id/check` | **Check now** — runs the full pipeline synchronously, returns the check. |
| `PATCH` | `/api/watches/:id` | `{ "status": "paused" \| "active" }`. Resuming resets `next_check_at` to now + interval. |
| `POST`/`GET` | `/api/cron/tick` | Scheduler entry point. `Authorization: Bearer $CRON_SECRET`. Claims ≤25 due watches, concurrency 5. |
| `POST` | `/api/demo/toggle` | Form post `{ key, open }`; flips `/demo/job-board`. `key` must equal `CRON_SECRET`. |

There is no list endpoint and no auth: a watch's uuid is its only handle, and the pages at `/w/:id` and `/w/:id/created` are what the email will link to.

### `POST /api/watches`

```jsonc
// request
{ "url": "https://acme.com/careers", "condition": "the summer internship opens", "email": "me@example.com",
  "overrideRobots": false }        // set true after the user accepts the robots.txt warning

// 201
{ "id": "85031f64-…" }

// 400 invalid_url | invalid_condition | invalid_email
// 422 blocked_host  (private / link-local / localhost — SSRF guard, re-validated on every redirect)
// 422 unreachable   (network error, timeout, non-2xx)
// 422 empty_page    (loaded, but nothing readable — usually a JS-rendered shell)
// 409 robots_disallowed  → show the consent dialog, resend with overrideRobots: true
```

### `POST /api/watches/:id/check`

```jsonc
{ "check": { "id", "createdAt", "changed", "matched", "confidence", "aiSummary", "aiEvidence",
             "diffAdded": ["Apply now"], "diffRemoved": ["Applications closed"],
             "statusCode": 200, "durationMs": 3619, "error": null },
  "status": "active" }
```

A `matched` check also inserts a `notifications` row with `status = 'queued'` (the outbox — nothing sends yet) unless the watch is inside its cooldown.

### `POST /api/cron/tick`

```jsonc
{ "claimed": 1, "checked": 1, "changed": 0, "matched": 0, "errors": 0, "durationMs": 698 }
```

`next_check_at` is advanced when a watch is claimed (`FOR UPDATE SKIP LOCKED`), so overlapping ticks never double-check and a crashed runner cannot wedge a watch into a hot loop.
