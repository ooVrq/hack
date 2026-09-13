import { notFound } from "next/navigation";
import Link from "next/link";
import { getWatchDetail } from "@/lib/watches";
import type { Check, WatchStatus } from "@/lib/types";
import { RelativeTime } from "./relative-time";
import { NextCheck } from "./next-check";
import { WatchActions } from "./watch-actions";
import { RefreshOnInterval } from "./refresh-on-interval";

export const dynamic = "force-dynamic";

function StatusPill({ status }: { status: WatchStatus }) {
  const color =
    status === "active"
      ? "text-accent"
      : status === "failing" || status === "blocked"
        ? "text-[#ff6b6b]"
        : "text-muted";

  return (
    <span
      className={`inline-block rounded-full border border-border px-3 py-1 font-mono text-xs ${color}`}
    >
      {status}
    </span>
  );
}

function CheckTag({ check }: { check: Check }) {
  if (check.error) return <span className="text-[#ff6b6b]">error</span>;
  if (check.matched) return <span className="font-bold text-accent">match</span>;
  if (check.changed) return <span className="text-foreground">changed</span>;
  return <span className="text-muted">no change</span>;
}

function OpenLink({ url, name, className }: { url: string; name: string; className: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={`text-accent underline underline-offset-4 transition-colors duration-150 hover:text-foreground ${className}`}
    >
      open {name} →
    </a>
  );
}

function CheckRow({ check, url, name }: { check: Check; url: string; name: string }) {
  const hasDiff = check.diffAdded.length > 0 || check.diffRemoved.length > 0;

  return (
    <li className="border-b border-border py-4 last:border-b-0">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="flex items-baseline gap-3 font-mono text-sm">
          <RelativeTime date={check.createdAt} />
          <span className="text-xs uppercase tracking-wide">
            <CheckTag check={check} />
          </span>
        </div>
        <div className="font-mono text-xs text-muted">
          {check.durationMs !== null ? `${check.durationMs}ms` : ""}
          {check.statusCode !== null ? ` · ${check.statusCode}` : ""}
        </div>
      </div>

      {check.aiSummary && <p className="mt-2 text-sm text-foreground">{check.aiSummary}</p>}
      {check.matched && <OpenLink url={url} name={name} className="mt-2 inline-block text-lg" />}
      {check.aiEvidence && (
        <p className="mt-1 font-mono text-xs text-muted">evidence: {check.aiEvidence}</p>
      )}
      {check.confidence !== null && (
        <p className="mt-1 font-mono text-xs text-muted">{check.confidence.toFixed(2)}</p>
      )}
      {check.error && <p className="mt-1 text-sm text-[#ff6b6b]">{check.error}</p>}

      {hasDiff && (
        <details className="mt-2">
          <summary className="cursor-pointer font-mono text-xs text-muted">show diff</summary>
          <div className="mt-2 whitespace-pre-wrap font-mono text-xs">
            {check.diffRemoved.map((line, i) => (
              <div key={`r${i}`} className="text-[#ff6b6b]">
                - {line}
              </div>
            ))}
            {check.diffAdded.map((line, i) => (
              <div key={`a${i}`} className="text-[#5fd19c]">
                + {line}
              </div>
            ))}
          </div>
        </details>
      )}
    </li>
  );
}

export default async function WatchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detail = await getWatchDetail(id);
  if (!detail) notFound();

  const { watch, checks, latestText } = detail;
  const latestMatch = checks.find((check) => check.matched);

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-10 px-6 py-16">
      <RefreshOnInterval />

      <header className="flex flex-col gap-3">
        <h1 className="text-2xl text-foreground">{watch.name}</h1>
        <div className="break-all font-mono text-sm text-muted">{watch.url}</div>
        <div className="font-mono text-sm text-foreground">“{watch.condition}”</div>
      </header>

      {latestMatch && (
        <section className="border border-accent px-6 py-5">
          <p className="font-mono text-xs uppercase tracking-wide text-accent">it happened</p>
          {latestMatch.aiSummary && (
            <p className="mt-2 text-sm text-foreground">{latestMatch.aiSummary}</p>
          )}
          <OpenLink url={watch.url} name={watch.name} className="mt-3 block text-3xl" />
          <p className="mt-3 font-mono text-xs text-muted">
            <RelativeTime date={latestMatch.createdAt} />
          </p>
        </section>
      )}

      <section className="flex flex-col gap-3 border-y border-border py-4">
        <div className="flex flex-wrap items-center gap-4 font-mono text-sm text-muted">
          <StatusPill status={watch.status} />
          <span>
            last checked <RelativeTime date={watch.lastCheckedAt} />
          </span>
          <span>
            next check{" "}
            <NextCheck
              key={`${watch.status}-${watch.nextCheckAt}`}
              date={watch.nextCheckAt}
              status={watch.status}
            />
          </span>
          <span>every {watch.intervalSeconds}s</span>
        </div>
        {watch.robotsBlocked && (
          <p className="text-sm text-muted">
            this site’s robots.txt disallows bots — you chose to watch it anyway.
          </p>
        )}
      </section>

      <WatchActions id={watch.id} status={watch.status} />

      <section className="flex flex-col">
        <h2 className="mb-2 font-mono text-xs uppercase tracking-wide text-muted">timeline</h2>
        {checks.length === 0 ? (
          <p className="text-sm text-muted">
            no checks yet — the first one runs within a minute, or check now.
          </p>
        ) : (
          <ul>
            {checks.map((check) => (
              <CheckRow key={check.id} check={check} url={watch.url} name={watch.name} />
            ))}
          </ul>
        )}
      </section>

      {latestText !== null && (
        <details>
          <summary className="cursor-pointer font-mono text-xs uppercase tracking-wide text-muted">
            what we see
          </summary>
          <div className="mt-3 max-h-96 overflow-auto whitespace-pre-wrap border border-border bg-surface p-4 font-mono text-sm text-muted">
            {latestText}
          </div>
        </details>
      )}

      <footer>
        <Link
          href="/"
          className="font-mono text-sm text-muted transition-colors duration-150 hover:text-foreground"
        >
          watch another page
        </Link>
      </footer>
    </main>
  );
}
