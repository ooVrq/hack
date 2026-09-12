import Link from "next/link";

const PIPELINE = [
  { step: "Fetch", detail: "SSRF-guarded, 15s timeout, 2MB cap" },
  { step: "Normalize", detail: "strip scripts, nav, ads, timestamps, counters" },
  { step: "Hash", detail: "unchanged hash means we stop, for free" },
  { step: "Diff + rules", detail: "keyword, regex, or any-change match" },
  { step: "Judge", detail: "Gemini reads only the diff, on ambiguous cases" },
  { step: "Notify", detail: "one email, then a cooldown" },
] as const;

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-24 px-6 py-24">
      <section className="flex flex-col gap-6">
        <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
          Tell us what you&apos;re waiting for.
          <br />
          We&apos;ll refresh the page for you.
        </h1>
        <p className="max-w-xl text-lg leading-8 text-muted">
          Give Watchtower a URL and describe the change in plain English. It
          polls the page, detects when the change actually happens, and
          emails you within a minute — with the exact sentence that changed
          and a link straight to it.
        </p>
        <div className="flex items-center gap-4">
          <Link
            href="/api/auth/signin"
            className="rounded-md bg-accent px-5 py-2.5 text-sm font-medium text-accent-foreground transition-opacity duration-150 hover:opacity-90"
          >
            Create a watch
          </Link>
          <a
            href="https://github.com"
            className="text-sm text-muted transition-colors duration-150 hover:text-foreground"
          >
            View the source
          </a>
        </div>
      </section>

      <section className="flex flex-col gap-6">
        <h2 className="font-mono text-sm uppercase tracking-wide text-muted">
          The check pipeline
        </h2>
        <ol className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {PIPELINE.map(({ step, detail }, i) => (
            <li
              key={step}
              className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-4"
            >
              <span className="font-mono text-xs text-accent">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="font-medium text-foreground">{step}</span>
              <span className="text-sm text-muted">{detail}</span>
            </li>
          ))}
        </ol>
      </section>
    </main>
  );
}
