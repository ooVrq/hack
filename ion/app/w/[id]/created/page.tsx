import { notFound } from "next/navigation";
import Link from "next/link";
import { getWatchDetail } from "@/lib/watches";

const BAR =
  "block w-full border border-border bg-transparent px-6 py-4 text-center font-mono text-base text-foreground transition-colors duration-150 hover:bg-foreground hover:text-background";

export default async function CreatedPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detail = await getWatchDetail(id);
  if (!detail) notFound();

  const { watch } = detail;

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center gap-10 px-6 py-20">
      <div className="flex flex-col gap-6 text-center">
        <h1 className="text-2xl text-foreground">
          we’re keeping an eye on <span className="text-accent">{watch.name}</span>
        </h1>

        <div className="border border-border bg-surface px-6 py-4 text-left font-mono text-sm">
          <div className="break-all text-foreground">{watch.url}</div>
          <div className="mt-2 text-muted">“{watch.condition}”</div>
        </div>

        <p className="text-sm text-muted">
          we’ve sent an email to{" "}
          <span className="text-foreground">{watch.email}</span> with a link to
          this page’s status. we’ll email again the moment the page changes the
          way you described.
        </p>
        <p className="text-sm text-muted">checking every minute.</p>
      </div>

      <div className="flex flex-col gap-4">
        <Link href={`/w/${watch.id}`} className={BAR}>
          view status →
        </Link>
        <Link
          href="/"
          className="text-center font-mono text-sm text-muted transition-colors duration-150 hover:text-foreground"
        >
          watch another page
        </Link>
      </div>
    </main>
  );
}
