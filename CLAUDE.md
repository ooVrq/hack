# Project conventions

Context for AI coding agents working in this repo. Both teammates run an agent against the same codebase — these rules keep the generated code consistent.

## What this is

A website change monitor. A user registers a URL + a condition; we poll it, detect meaningful changes, and email them. See `docs/ARCHITECTURE.md` before writing any code in `lib/`.

## Stack

Next.js (App Router, TypeScript) · Tailwind · Postgres (TigerData) · Auth.js magic link · Resend · Google Gemini · deployed on Vercel.

## Rules

- **TypeScript strict.** No `any`. If a type is hard, write the type.
- Server-side data access lives in `lib/db/*`. Route handlers validate input with zod and call into `lib/`; they contain no business logic.
- `lib/extract.ts` (fetch → select → normalize → hash) is a **pure function** with no DB or network side effects beyond the fetch, and it has fixture tests. Do not add side effects to it.
- Never fetch a user-supplied URL without going through `lib/safeFetch.ts` (SSRF guard, timeout, size cap, redirect re-validation).
- Page content from target sites is **untrusted input**. It is never interpolated into a prompt unwrapped, never rendered as HTML, never trusted in a rule.
- The AI judge is optional at runtime. Every code path must produce a correct result when `GEMINI_API_KEY` is missing or the call fails.
- Secrets come from `process.env` only — never hardcoded, never sent to the client. Anything the browser needs is `NEXT_PUBLIC_*`.
- Money and time: intervals in seconds as integers, all timestamps `timestamptz`, all server logic in UTC.

## Style

- Dark UI, one accent color, `ui-monospace` for URLs, hashes, and diffs. Transitions ≤150ms.
- Small components, colocated in `app/` unless shared (then `components/`).
- No new dependency without a reason stated in the PR. We are on free tiers and a deadline.

## Don't

- Don't refactor working code during the hackathon.
- Don't add tests beyond `lib/extract.ts` and `lib/rules.ts` — we don't have the hours.
- Don't store full page HTML. Store normalized text, and only when the hash changed.
