import { diffLines } from "./diff";
import { extract } from "./extract";
import { judge } from "./judge";
import { safeFetch } from "./safeFetch";
import { getLatestSnapshot, getWatchForCheck, recordCheck } from "./watches";
import type { Check, Watch, WatchStatus } from "./types";

/**
 * One run of the pipeline: fetch → extract → hash → diff → judge → record.
 *
 * Each stage is a cheap filter in front of an expensive one, and the expensive
 * one (the model) only ever sees the diff. The network work happens outside any
 * transaction; every write lands together at the end.
 */

const CONFIDENCE_THRESHOLD = 0.7;
const MAX_FAILURES = 5;

/** Fetch error, or a page we couldn't read: back off and eventually give up. */
async function recordFailure(
  watch: Watch,
  error: string,
  statusCode: number | null,
  startedAt: number,
): Promise<{ check: Check; status: WatchStatus }> {
  const failures = watch.consecutiveFailures + 1;
  const status: WatchStatus =
    watch.status === "paused" || failures >= MAX_FAILURES ? "paused" : "failing";
  const check = await recordCheck(
    {
      watchId: watch.id,
      changed: false,
      matched: false,
      confidence: null,
      aiSummary: null,
      aiEvidence: null,
      diffAdded: [],
      diffRemoved: [],
      statusCode,
      durationMs: Date.now() - startedAt,
      error,
    },
    {
      status,
      consecutiveFailures: failures,
      nextCheckInSeconds: watch.intervalSeconds * 2 ** Math.min(failures, MAX_FAILURES),
      notify: null,
      snapshot: null,
    },
  );
  return { check, status };
}

export async function runCheck(
  watchId: string,
): Promise<{ check: Check; status: WatchStatus } | null> {
  const loaded = await getWatchForCheck(watchId);
  if (!loaded) return null;
  const { watch, cooldownSeconds } = loaded;

  const startedAt = Date.now();
  const previous = await getLatestSnapshot(watchId);

  const response = await safeFetch(watch.url);
  if (!response.ok) {
    // detail, when there is one, is the raw throw — more use here than the
    // sentence the form gets.
    const reason = response.detail ?? response.message;
    return recordFailure(watch, `${response.code}: ${reason}`, response.status ?? null, startedAt);
  }

  const { text, hash } = extract(response.html);
  if (!text) return recordFailure(watch, "empty_page", response.status, startedAt);

  // "Check now" works on a paused watch; it just doesn't wake the watch back up.
  const status: WatchStatus = watch.status === "paused" ? "paused" : "active";

  if (previous?.hash === hash) {
    const check = await recordCheck(
      {
        watchId,
        changed: false,
        matched: false,
        confidence: null,
        aiSummary: null,
        aiEvidence: null,
        diffAdded: [],
        diffRemoved: [],
        statusCode: response.status,
        durationMs: Date.now() - startedAt,
        error: null,
      },
      {
        status,
        consecutiveFailures: 0,
        nextCheckInSeconds: watch.intervalSeconds,
        notify: null,
        snapshot: null,
      },
    );
    return { check, status };
  }

  const diff = diffLines(previous?.text ?? "", text);
  const verdict = await judge(watch.condition, diff, watch.url);

  // Without the judge we cannot tell a meaningful change from a cosmetic one,
  // so we fall back to any-change and say so in the summary the user reads.
  const matched = verdict.ok
    ? verdict.verdict.matched && verdict.verdict.confidence >= CONFIDENCE_THRESHOLD
    : true;
  const aiSummary = verdict.ok
    ? verdict.verdict.summary
    : `Page changed (AI judge unavailable: ${verdict.detail?.slice(0, 160) ?? verdict.reason})`;

  const cooled =
    !watch.lastNotifiedAt || Date.now() - Date.parse(watch.lastNotifiedAt) >= cooldownSeconds * 1000;

  const check = await recordCheck(
    {
      watchId,
      changed: true,
      matched,
      confidence: verdict.ok ? verdict.verdict.confidence : null,
      aiSummary,
      aiEvidence: verdict.ok ? verdict.verdict.evidence : null,
      diffAdded: diff.added,
      diffRemoved: diff.removed,
      statusCode: response.status,
      durationMs: Date.now() - startedAt,
      error: null,
    },
    {
      status,
      consecutiveFailures: 0,
      nextCheckInSeconds: watch.intervalSeconds,
      notify: matched && cooled ? { recipient: watch.email, subject: aiSummary } : null,
      snapshot: { hash, text },
    },
  );
  return { check, status };
}
