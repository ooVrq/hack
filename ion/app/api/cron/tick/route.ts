import { runCheck } from "@/lib/check";
import { claimDueWatches } from "@/lib/watches";
import type { ApiError, TickResponse } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const BATCH = 25;
const CONCURRENCY = 5;

/**
 * The scheduler's entry point, pinged once a minute by cron-job.org.
 *
 * Stateless and idempotent: it claims a small batch with FOR UPDATE SKIP LOCKED,
 * so two overlapping ticks can never check the same watch, and whatever it does
 * not get to stays due for the next one.
 */
async function tick(request: Request): Promise<Response> {
  if (request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json(
      { error: { code: "unauthorized", message: "Missing or wrong cron secret." } } satisfies ApiError,
      { status: 401 },
    );
  }

  const startedAt = Date.now();
  const ids = await claimDueWatches(BATCH);
  const queue = [...ids];
  let checked = 0;
  let changed = 0;
  let matched = 0;
  let errors = 0;

  const worker = async (): Promise<void> => {
    for (let id = queue.shift(); id; id = queue.shift()) {
      const result = await runCheck(id).catch(() => null);
      if (!result) {
        errors++;
        continue;
      }
      checked++;
      if (result.check.error) errors++;
      if (result.check.changed) changed++;
      if (result.check.matched) matched++;
    }
  };
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, queue.length) }, worker));

  return Response.json({
    claimed: ids.length,
    checked,
    changed,
    matched,
    errors,
    durationMs: Date.now() - startedAt,
  } satisfies TickResponse);
}

export async function POST(request: Request): Promise<Response> {
  return tick(request);
}

// cron-job.org can be configured either way; both do the same thing.
export async function GET(request: Request): Promise<Response> {
  return tick(request);
}
