import Link from "next/link";

export function Header() {
  return (
    <header className="border-b border-border">
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-6">
        <Link
          href="/"
          className="font-mono text-sm font-medium tracking-tight text-foreground"
        >
          watchtower
        </Link>
        <nav className="flex items-center gap-6 text-sm text-muted">
          <Link
            href="/dashboard"
            className="transition-colors duration-150 hover:text-foreground"
          >
            Dashboard
          </Link>
          <Link
            href="/api/auth/signin"
            className="rounded-md bg-accent px-3 py-1.5 font-medium text-accent-foreground transition-opacity duration-150 hover:opacity-90"
          >
            Sign in
          </Link>
        </nav>
      </div>
    </header>
  );
}
