// Shared shapes between lib/, the API routes and the pages. Server code maps
// snake_case rows to these; the UI never sees a raw row.

export type WatchStatus = "warming" | "active" | "paused" | "failing" | "blocked";

export type Watch = {
  id: string;
  url: string;
  /** Hostname of url, shown as the watch's name. */
  name: string;
  /** The user's plain-English condition (watches.ai_prompt). */
  condition: string;
  email: string;
  status: WatchStatus;
  intervalSeconds: number;
  /** robots.txt disallowed this URL and the user chose to continue anyway. */
  robotsBlocked: boolean;
  createdAt: string;
  nextCheckAt: string;
  lastCheckedAt: string | null;
  lastNotifiedAt: string | null;
  consecutiveFailures: number;
};

export type Check = {
  id: string;
  createdAt: string;
  /** Normalized text hash differed from the previous snapshot. */
  changed: boolean;
  /** The condition was judged satisfied (and a notification was queued). */
  matched: boolean;
  confidence: number | null;
  aiSummary: string | null;
  aiEvidence: string | null;
  diffAdded: string[];
  diffRemoved: string[];
  statusCode: number | null;
  durationMs: number | null;
  error: string | null;
};

export type WatchDetail = {
  watch: Watch;
  /** Newest first. */
  checks: Check[];
  /** Normalized text of the latest snapshot, for the "what we see" panel. */
  latestText: string | null;
};

/* ---------- API contract ---------- */

export type CreateWatchInput = {
  url: string;
  condition: string;
  email: string;
  /** Set by the client after the user accepts the robots.txt warning. */
  overrideRobots?: boolean;
};

export type ApiErrorCode =
  | "invalid_url" // not http(s), malformed
  | "invalid_email"
  | "invalid_condition" // empty or > 500 chars
  | "blocked_host" // private / link-local / localhost
  | "robots_disallowed" // 409: robots.txt disallows; resend with overrideRobots
  | "unreachable" // network error, timeout, non-2xx
  | "empty_page" // fetched fine, but nothing readable was extracted
  | "not_found"
  | "unauthorized";

export type ApiError = { error: { code: ApiErrorCode; message: string } };

/** POST /api/watches → 201 */
export type CreateWatchResponse = { id: string };

/** POST /api/watches/:id/check → 200 */
export type CheckNowResponse = { check: Check; status: WatchStatus };

/** POST /api/cron/tick → 200 */
export type TickResponse = {
  claimed: number;
  checked: number;
  changed: number;
  matched: number;
  errors: number;
  durationMs: number;
};
