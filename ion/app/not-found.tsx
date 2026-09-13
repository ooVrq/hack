import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center gap-6 px-6 py-20 text-center">
      <p className="font-mono text-sm text-muted">nothing to see here</p>
      <Link
        href="/"
        className="font-mono text-sm text-foreground transition-colors duration-150 hover:text-accent"
      >
        ← back home
      </Link>
    </main>
  );
}
