import { query, transaction } from "./db";
import type { Check, Watch, WatchDetail, WatchStatus } from "./types";

/**
 * Every read and write of a watch, its snapshots and its checks. Rows are
 * snake_case and full of Dates and numerics; nothing above this file sees one.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type WatchRow = {
  id: string;
  url: string;
  name: string;
  ai_prompt: string | null;
  email: string;
  status: string;
  interval_seconds: number;
  cooldown_seconds: number;
  robots_blocked: boolean;
  created_at: Date;
  next_check_at: Date;
  last_checked_at: Date | null;
  last_notified_at: Date | null;
  consecutive_failures: number;
};

type CheckRow = {
  id: string;
  created_at: Date;
  changed: boolean;
  matched: boolean;
  confidence: string | null; // numeric(3,2) arrives as a string
  ai_summary: string | null;
  ai_evidence: string | null;
  diff_added: string | null;
  diff_removed: string | null;
  status_code: number | null;
  duration_ms: number | null;
  error: string | null;
};

const WATCH_COLUMNS = `w.id, w.url, w.name, w.ai_prompt, w.status, w.interval_seconds,
    w.cooldown_seconds, w.robots_blocked, w.created_at, w.next_check_at, w.last_checked_at,
    w.last_notified_at, w.consecutive_failures, u.email`;

const CHECK_COLUMNS = `id, created_at, changed, matched, confidence, ai_summary, ai_evidence,
    diff_added, diff_removed, status_code, duration_ms, error`;

function toWatch(row: WatchRow): Watch {
  return {
    id: row.id,
    url: row.url,
    name: row.name,
    condition: row.ai_prompt ?? "",
    email: row.email,
    status: row.status as WatchStatus,
    intervalSeconds: row.interval_seconds,
    robotsBlocked: row.robots_blocked,
    createdAt: row.created_at.toISOString(),
    nextCheckAt: row.next_check_at.toISOString(),
    lastCheckedAt: row.last_checked_at?.toISOString() ?? null,
    lastNotifiedAt: row.last_notified_at?.toISOString() ?? null,
    consecutiveFailures: row.consecutive_failures,
  };
}

function toCheck(row: CheckRow): Check {
  const lines = (value: string | null): string[] => (value ? value.split("\n").filter(Boolean) : []);
  return {
    id: row.id,
    createdAt: row.created_at.toISOString(),
    changed: row.changed,
    matched: row.matched,
    confidence: row.confidence === null ? null : Number(row.confidence),
    aiSummary: row.ai_summary,
    aiEvidence: row.ai_evidence,
    diffAdded: lines(row.diff_added),
    diffRemoved: lines(row.diff_removed),
    statusCode: row.status_code,
    durationMs: row.duration_ms,
    error: row.error,
  };
}

/** A malformed id is a missing watch, not a database error. */
async function loadRow(id: string): Promise<WatchRow | null> {
  if (!UUID.test(id)) return null;
  const rows = await query<WatchRow>(
    `select ${WATCH_COLUMNS} from watches w join users u on u.id = w.user_id where w.id = $1`,
    [id],
  );
  return rows[0] ?? null;
}

export async function getWatch(id: string): Promise<Watch | null> {
  const row = await loadRow(id);
  return row && toWatch(row);
}

/** cooldown_seconds is not part of the Watch contract and only runCheck needs it. */
export async function getWatchForCheck(
  id: string,
): Promise<{ watch: Watch; cooldownSeconds: number } | null> {
  const row = await loadRow(id);
  return row && { watch: toWatch(row), cooldownSeconds: row.cooldown_seconds };
}

export async function getWatchDetail(id: string): Promise<WatchDetail | null> {
  const row = await loadRow(id);
  if (!row) return null;
  const [checks, snapshot] = await Promise.all([
    query<CheckRow>(
      `select ${CHECK_COLUMNS} from checks where watch_id = $1 order by created_at desc limit 50`,
      [id],
    ),
    getLatestSnapshot(id),
  ]);
  return { watch: toWatch(row), checks: checks.map(toCheck), latestText: snapshot?.text ?? null };
}

export async function setWatchStatus(id: string, status: WatchStatus): Promise<void> {
  await query(`update watches set status = $2 where id = $1`, [id, status]);
}

export async function getLatestSnapshot(
  watchId: string,
): Promise<{ hash: string; text: string } | null> {
  const rows = await query<{ content_hash: string; extracted_text: string }>(
    `select content_hash, extracted_text from snapshots
       where watch_id = $1 order by fetched_at desc limit 1`,
    [watchId],
  );
  return rows[0] ? { hash: rows[0].content_hash, text: rows[0].extracted_text } : null;
}

/**
 * Hand out the watches that are due, one runner at a time.
 *
 * next_check_at moves forward at claim time, not after the check finishes, so a
 * runner that dies mid-check cannot wedge its watch into a hot loop; the
 * locked_at clause reclaims anything orphaned more than five minutes ago.
 */
export async function claimDueWatches(limit: number): Promise<string[]> {
  const rows = await query<{ id: string }>(
    `update watches w
        set locked_at = now(),
            next_check_at = now() + (interval_seconds || ' seconds')::interval
       from (
         select id from watches
          where status in ('active','warming','failing')
            and next_check_at <= now()
            and (locked_at is null or locked_at < now() - interval '5 minutes')
          order by next_check_at
          limit $1
          for update skip locked
       ) due
      where w.id = due.id
      returning w.id`,
    [limit],
  );
  return rows.map((row) => row.id);
}

export async function createWatch(input: {
  url: string;
  condition: string;
  email: string;
  robotsBlocked: boolean;
  text: string;
  hash: string;
  statusCode: number;
}): Promise<string> {
  return transaction(async (client) => {
    // No accounts: the email is an address, not an identity, so it is upserted.
    const user = await client.query<{ id: string }>(
      `insert into users (email) values ($1)
         on conflict (email) do update set email = excluded.email
       returning id`,
      [input.email],
    );

    const watch = await client.query<{ id: string }>(
      `insert into watches
         (user_id, name, url, rule_type, ai_prompt, interval_seconds, status,
          next_check_at, last_checked_at, robots_blocked)
       values ($1, $2, $3, 'ai', $4, 60, 'active',
          now() + interval '60 seconds', now(), $5)
       returning id`,
      [user.rows[0].id, new URL(input.url).hostname, input.url, input.condition, input.robotsBlocked],
    );

    // The baseline the first real check diffs against.
    await client.query(
      `insert into snapshots (watch_id, content_hash, extracted_text, status_code)
       values ($1, $2, $3, $4)`,
      [watch.rows[0].id, input.hash, input.text, input.statusCode],
    );

    return watch.rows[0].id;
  });
}

export type CheckRecord = {
  watchId: string;
  changed: boolean;
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

export type WatchUpdate = {
  status: WatchStatus;
  consecutiveFailures: number;
  nextCheckInSeconds: number;
  /** Queue an email. Nothing is sent here; a notification row is the outbox. */
  notify: { recipient: string; subject: string } | null;
  /** Only set when the hash moved — snapshots are the storage cost of this app. */
  snapshot: { hash: string; text: string } | null;
};

/** Everything one check run writes, in a single short transaction. */
export async function recordCheck(check: CheckRecord, update: WatchUpdate): Promise<Check> {
  return transaction(async (client) => {
    if (update.snapshot) {
      await client.query(
        `insert into snapshots (watch_id, content_hash, extracted_text, status_code)
         values ($1, $2, $3, $4)`,
        [check.watchId, update.snapshot.hash, update.snapshot.text, check.statusCode],
      );
      await client.query(
        `delete from snapshots
          where watch_id = $1
            and id not in (
              select id from snapshots where watch_id = $1 order by fetched_at desc limit 10
            )`,
        [check.watchId],
      );
    }

    const inserted = await client.query<CheckRow>(
      `insert into checks
         (watch_id, changed, matched, confidence, ai_summary, ai_evidence,
          diff_added, diff_removed, status_code, duration_ms, error)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       returning ${CHECK_COLUMNS}`,
      [
        check.watchId,
        check.changed,
        check.matched,
        check.confidence,
        check.aiSummary,
        check.aiEvidence,
        check.diffAdded.join("\n") || null,
        check.diffRemoved.join("\n") || null,
        check.statusCode,
        check.durationMs,
        check.error,
      ],
    );
    const result = toCheck(inserted.rows[0]);

    if (update.notify) {
      await client.query(
        `insert into notifications (watch_id, check_id, channel, recipient, subject, status)
         values ($1, $2, 'email', $3, $4, 'queued')`,
        [check.watchId, result.id, update.notify.recipient, update.notify.subject],
      );
    }

    await client.query(
      `update watches
          set status = $2,
              consecutive_failures = $3,
              next_check_at = now() + make_interval(secs => $4::int),
              last_checked_at = now(),
              locked_at = null,
              last_notified_at = case when $5 then now() else last_notified_at end
        where id = $1`,
      [
        check.watchId,
        update.status,
        update.consecutiveFailures,
        update.nextCheckInSeconds,
        update.notify !== null,
      ],
    );

    return result;
  });
}
