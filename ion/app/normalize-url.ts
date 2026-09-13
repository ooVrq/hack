// People type `jobs.apple.com`, not `https://jobs.apple.com`, so add the scheme
// for them. The lookahead keeps `localhost:3000/…` from reading as a scheme
// called `localhost`, while `ftp://` and `javascript:` keep theirs and are then
// rejected as invalid by the form.
//
// Front-end affordance only: the API stays strict and still rejects a bare
// domain with invalid_url.

const HAS_SCHEME = /^[a-z][a-z0-9+.-]*:(?!\d)/i;
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1"]);

export function normalizeUrl(value: string): string {
  const trimmed = value.trim();
  if (trimmed === "" || HAS_SCHEME.test(trimmed)) return trimmed;
  // The demo page is served over plain http by the dev server.
  const host = trimmed.split(/[/?#:]/)[0].toLowerCase();
  return `${LOCAL_HOSTS.has(host) ? "http" : "https"}://${trimmed}`;
}
