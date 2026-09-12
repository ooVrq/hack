import { WatchForm } from "./watch-form";

function EyeMark() {
  return (
    <svg
      viewBox="0 0 124 68"
      aria-hidden="true"
      className="w-32 text-foreground sm:w-44"
      fill="none"
      stroke="currentColor"
      strokeWidth={5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 35 C 30 9, 88 7, 114 33" />
      <path d="M114 33 C 92 57, 31 59, 6 35" />
      <circle cx="59" cy="33" r="9.5" strokeWidth={4} />
      <circle cx="55.5" cy="29.5" r="2" fill="currentColor" stroke="none" />
      <path
        d="M53 15 L50 6 M66 15 L68 6 M78 16 L84 9 M90 19 L98 14 M100 23 L109 20"
        strokeWidth={3.5}
      />
    </svg>
  );
}

function Wordmark() {
  return (
    <div className="flex items-center justify-center">
      <EyeMark />
      <span className="sr-only">iOn</span>
    </div>
  );
}

export default function Home() {
  return (
<<<<<<< HEAD:snitched/app/page.tsx
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center gap-16 px-6 py-20">
      <Wordmark />
      <WatchForm />
=======
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-24 px-6 py-24">
      <section className="flex flex-col gap-6">
        <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
          Tell us what you&apos;re waiting for.
          <br />
          We&apos;ll refresh the page for you.
        </h1>
        <p className="max-w-xl text-lg leading-8 text-muted">
          Give Ion a URL and describe the change in plain English. It
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
>>>>>>> 3465e71d1f178cfe399ff14086db44d2fe6d37c0:ion/app/page.tsx
    </main>
  );
}
