import { getJobBoardOpen } from "@/lib/demo";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function JobBoardPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const admin = params.admin as string | undefined;
  const isAdmin = admin === process.env.CRON_SECRET;
  const jobBoardOpen = await getJobBoardOpen();

  const now = new Date().toISOString();
  // Server component runs server-side; random value changes per request
  // eslint-disable-next-line react-hooks/purity
  const viewerCount = Math.floor(Math.random() * 400) + 900; // 900-1300

  return (
    <div className="min-h-screen bg-white text-neutral-900 flex flex-col font-sans">
      {/* Header */}
      <header className="border-b border-neutral-200">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="text-2xl font-bold text-neutral-900">Acme Systems</div>
          <nav className="flex gap-8 text-sm">
            <a href="#" className="text-neutral-600 hover:text-neutral-900">
              Products
            </a>
            <a href="#" className="text-neutral-600 hover:text-neutral-900">
              Careers
            </a>
            <a href="#" className="text-neutral-600 hover:text-neutral-900">
              About
            </a>
            <a href="#" className="text-neutral-600 hover:text-neutral-900">
              Contact
            </a>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl mx-auto px-6 py-12 w-full">
        <h1 className="text-4xl font-bold text-neutral-900 mb-6">
          Careers at Acme Systems
        </h1>

        <p className="text-lg text-neutral-600 mb-12 max-w-2xl">
          We&apos;re building the future of enterprise software. Join our team and work alongside
          talented engineers solving complex problems at scale.
        </p>

        <section className="mb-12">
          <h2 className="text-2xl font-bold text-neutral-900 mb-8">Open positions</h2>

          <div className="space-y-6">
            {/* Dynamic Job Card */}
            <div className="border border-neutral-200 rounded-lg p-8 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-xl font-bold text-neutral-900">
                    Software Engineer Intern — Summer 2026
                  </h3>
                  <p className="text-neutral-600 mt-1">
                    Lubbock, TX · Remote friendly
                  </p>
                </div>
                {jobBoardOpen ? (
                  <span className="inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-800">
                    Apply now
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded-full bg-neutral-200 px-3 py-1 text-sm font-medium text-neutral-600">
                    Applications closed
                  </span>
                )}
              </div>

              <p className="text-neutral-600 mb-6">
                Help us build the next generation of cloud infrastructure. You&apos;ll work with modern
                tech stack including TypeScript, React, and Postgres, contributing real features
                to production software.
              </p>

              {jobBoardOpen ? (
                <>
                  <p className="text-neutral-600 mb-4">
                    Applications are open. Apply by March 1, 2026.
                  </p>
                  <a
                    href="#"
                    className="inline-block px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors font-medium"
                  >
                    Apply for this role
                  </a>
                </>
              ) : (
                <p className="text-neutral-600">
                  Applications for this role are currently closed. Check back soon.
                </p>
              )}
            </div>

            {/* Stable Job Card 1 */}
            <div className="border border-neutral-200 rounded-lg p-8 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-xl font-bold text-neutral-900">
                    Senior Backend Engineer
                  </h3>
                  <p className="text-neutral-600 mt-1">
                    San Francisco, CA · On-site
                  </p>
                </div>
                <span className="inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-800">
                  Apply now
                </span>
              </div>

              <p className="text-neutral-600 mb-6">
                Lead the design and implementation of our backend services. We&apos;re looking for
                experienced engineers who can mentor junior developers and architect scalable systems.
              </p>

              <p className="text-neutral-600 mb-4">
                Applications are open. Apply by March 15, 2026.
              </p>
              <a
                href="#"
                className="inline-block px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors font-medium"
              >
                Apply for this role
              </a>
            </div>

            {/* Stable Job Card 2 */}
            <div className="border border-neutral-200 rounded-lg p-8 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-xl font-bold text-neutral-900">
                    Product Designer
                  </h3>
                  <p className="text-neutral-600 mt-1">
                    Austin, TX · Remote friendly
                  </p>
                </div>
                <span className="inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-800">
                  Apply now
                </span>
              </div>

              <p className="text-neutral-600 mb-6">
                Shape the future of our product. Work cross-functionally with engineering and
                marketing to design interfaces that delight our users and solve real problems.
              </p>

              <p className="text-neutral-600 mb-4">
                Applications are open. Apply by March 10, 2026.
              </p>
              <a
                href="#"
                className="inline-block px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors font-medium"
              >
                Apply for this role
              </a>
            </div>
          </div>
        </section>

        <div className="mt-8 pt-8 border-t border-neutral-200">
          <p className="text-xs text-neutral-500">
            Page generated at {now}
          </p>
          <p className="text-xs text-neutral-500 mt-1">
            {viewerCount} people viewing this page
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-neutral-200 bg-neutral-50">
        <div className="max-w-6xl mx-auto px-6 py-8 flex items-center justify-between text-sm text-neutral-600">
          <div>© 2026 Acme Systems. All rights reserved.</div>
          <div className="flex gap-6">
            <a href="#" className="hover:text-neutral-900">
              Privacy
            </a>
            <a href="#" className="hover:text-neutral-900">
              Terms
            </a>
            <a href="#" className="hover:text-neutral-900">
              Contact
            </a>
          </div>
        </div>
      </footer>

      {/* Admin Control Bar */}
      {isAdmin && (
        <div className="fixed bottom-0 left-0 right-0 bg-neutral-900 text-white px-6 py-3 text-sm border-t border-neutral-700">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <div>
              demo control — listing is currently{" "}
              <span className="font-semibold">
                {jobBoardOpen ? "OPEN" : "CLOSED"}
              </span>
            </div>
            <form method="post" action="/api/demo/toggle">
              <input type="hidden" name="key" value={admin} />
              <input
                type="hidden"
                name="open"
                value={jobBoardOpen ? "false" : "true"}
              />
              <button
                type="submit"
                className="px-4 py-2 bg-white text-neutral-900 rounded-md hover:bg-neutral-100 transition-colors font-medium"
              >
                Flip to {jobBoardOpen ? "closed" : "open"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
