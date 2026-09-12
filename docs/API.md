# API contract

Freeze this in hour 1. Frontend builds against these shapes with mock JSON; backend fills them in. Nobody blocks.

All responses are JSON. Errors: `{ "error": { "code": "string", "message": "human readable" } }`.

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/auth/signin` | Magic-link request (Auth.js handles the rest) |
| `GET` | `/api/watches` | List the signed-in user's watches |
| `POST` | `/api/watches` | Create a watch (runs a validation fetch first) |
| `GET` | `/api/watches/:id` | One watch + recent checks |
| `PATCH` | `/api/watches/:id` | Update name/condition/interval/status |
| `DELETE` | `/api/watches/:id` | Delete watch and its history |
| `POST` | `/api/watches/:id/check` | **Check now** — runs the pipeline synchronously |
| `GET` | `/api/watches/:id/checks` | Paginated check history |
| `POST` | `/api/preview` | Given url + selector, return extracted text (live preview in the create form) |
| `POST` | `/api/cron/tick` | Scheduler entry point, `Authorization: Bearer $CRON_SECRET` |
| `GET` | `/api/unsubscribe` | Token-based, no login required |

### `POST /api/watches`

```jsonc
// request
{
  "name": "SWE Internship — Acme",
  "url": "https://acme.com/careers",
  "cssSelector": "#job-listings",      // optional
  "ruleType": "keyword_appears",       // any_change | keyword_appears | keyword_disappears | regex | ai
  "keywords": ["Apply Now", "Open"],   // for keyword_* rules
  "aiPrompt": null,                    // required when ruleType = "ai"
  "intervalSeconds": 300
}
```

```jsonc
// 201
{
  "id": "8f1c…",
  "status": "warming",
  "preview": "Software Engineer Intern — applications closed…",  // what we extracted, so the user can sanity-check the selector
  "nextCheckAt": "2026-09-12T18:04:00Z"
}
```

Validate hard at creation: run the fetch immediately and return the extracted text. If extraction is empty, return `422 EMPTY_EXTRACTION` — telling the user "we couldn't read anything at that selector" on the create form is worth more than any amount of backend cleverness.

### `POST /api/watches/:id/check`

Returns the full result of one pipeline run. This powers both the **Check now** button and your demo.

```jsonc
{
  "checkId": "c12…",
  "changed": true,
  "matched": true,
  "confidence": 0.94,
  "summary": "The listing changed from 'Applications closed' to 'Apply Now'.",
  "diff": { "added": ["Apply Now"], "removed": ["Applications closed"] },
  "notified": true,
  "durationMs": 842
}
```

### `POST /api/cron/tick`

```jsonc
// 200
{ "claimed": 12, "checked": 12, "changed": 2, "matched": 1, "notified": 1, "errors": 0, "durationMs": 3120 }
```

Must return in under 10s (Hobby function limit). Claim ≤25 watches, run with concurrency 5, and let the next tick pick up the rest.

## Status codes

`400` bad input · `401` not signed in · `403` not your watch · `404` · `409` duplicate URL for this user · `422` unusable page (empty extraction, SSRF-blocked host, robots.txt disallow) · `429` rate limited · `502` target site unreachable.
