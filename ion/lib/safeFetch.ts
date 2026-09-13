import { lookup } from "node:dns/promises";

/**
 * The only way this codebase is allowed to fetch a user-supplied URL.
 *
 * Users hand us arbitrary URLs and our server fetches them, which is the
 * textbook shape of an SSRF hole: without this guard, `http://169.254.169.254/`
 * turns the product into a cloud-metadata reader. So: http(s) only, every
 * resolved address checked against the private ranges, every redirect hop
 * re-validated, and hard caps on time and bytes.
 */

export type FetchResult =
  | { ok: true; status: number; html: string; finalUrl: string }
  | {
      ok: false;
      code: "blocked_host" | "unreachable";
      message: string;
      status?: number;
      /** Raw failure text for the checks timeline. Developer-facing; never shown in the UI. */
      detail?: string;
    };

const DEFAULT_TIMEOUT_MS = Number(process.env.FETCH_TIMEOUT_MS ?? 15_000);
const MAX_BYTES = Number(process.env.MAX_RESPONSE_BYTES ?? 2_000_000);
const MAX_REDIRECTS = 3;
const REDIRECTS = new Set([301, 302, 303, 307, 308]);

// The demo page lives on the dev server itself, so a local build has to be able
// to watch http://localhost:3000/demo/job-board. Never in production.
const ALLOW_LOCALHOST = process.env.NODE_ENV !== "production";

function isBlockedIpv4(ip: string): boolean {
  const [a, b] = ip.split(".").map(Number);
  if (a === 0 || a === 127) return true; // this-network, loopback
  if (a === 10) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 169 && b === 254) return true; // link-local — cloud metadata
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
  return false;
}

function isBlockedIpv6(ip: string): boolean {
  const v = ip.toLowerCase().split("%")[0];
  const mapped = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/.exec(v);
  if (mapped) return isBlockedIpv4(mapped[1]); // ::ffff:127.0.0.1 is still loopback
  if (v === "::" || v === "::1") return true;
  const first = parseInt(v.split(":")[0], 16);
  if ((first & 0xfe00) === 0xfc00) return true; // fc00::/7 unique-local
  if ((first & 0xffc0) === 0xfe80) return true; // fe80::/10 link-local
  return false;
}

/**
 * Resolve the hostname and refuse anything that points inside our network.
 *
 * Note that `fetch` resolves the name a second time, so a DNS record that flips
 * between the two lookups (rebinding) could still get through. Closing that
 * needs a connection-level hook; for a polling monitor the window is not worth
 * the complexity.
 */
async function validateTarget(target: URL): Promise<FetchResult | null> {
  if (target.protocol !== "http:" && target.protocol !== "https:") {
    return { ok: false, code: "blocked_host", message: "Only http:// and https:// addresses can be watched." };
  }

  const host = target.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (ALLOW_LOCALHOST && (host === "localhost" || host === "127.0.0.1" || host === "::1")) return null;

  const blocked: FetchResult = {
    ok: false,
    code: "blocked_host",
    message: `${host} is on a private network, so we can't watch it.`,
  };
  if (host === "localhost" || host.endsWith(".local")) return blocked;

  let addresses: { address: string; family: number }[];
  try {
    addresses = await lookup(host, { all: true });
  } catch {
    return { ok: false, code: "unreachable", message: `We couldn't find a server at ${host}.` };
  }
  for (const { address, family } of addresses) {
    if (family === 6 ? isBlockedIpv6(address) : isBlockedIpv4(address)) return blocked;
  }
  return null;
}

/** Read the body up to the cap, then abort the transfer and keep what we have. */
async function readCapped(res: Response, controller: AbortController): Promise<string> {
  if (!res.body) return "";
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (total < MAX_BYTES) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    total += value.length;
  }
  if (total >= MAX_BYTES) controller.abort();
  return Buffer.concat(chunks, Math.min(total, MAX_BYTES)).toString("utf8");
}

export async function safeFetch(url: string, timeoutMs: number = DEFAULT_TIMEOUT_MS): Promise<FetchResult> {
  let target: URL;
  try {
    target = new URL(url);
  } catch {
    return { ok: false, code: "blocked_host", message: "That doesn't look like a web address." };
  }

  for (let hop = 0; ; hop++) {
    const rejected = await validateTarget(target);
    if (rejected) return rejected;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(target, {
        redirect: "manual",
        signal: controller.signal,
        headers: {
          "user-agent": process.env.USER_AGENT ?? "IonBot/1.0",
          accept: "text/html,application/xhtml+xml",
        },
      });

      if (REDIRECTS.has(res.status)) {
        const location = res.headers.get("location");
        if (!location) {
          return { ok: false, code: "unreachable", status: res.status, message: "The site redirected us nowhere." };
        }
        if (hop === MAX_REDIRECTS) {
          return { ok: false, code: "unreachable", status: res.status, message: "The site redirected too many times." };
        }
        target = new URL(location, target); // re-validated at the top of the next hop
        continue;
      }

      // A site that turns bots away is not a site that is down, and the user can
      // act on the difference — often another page on the same site lets us in.
      if (res.status === 403 || res.status === 429) {
        return {
          ok: false,
          code: "unreachable",
          status: res.status,
          message: `The site blocks automated visits (HTTP ${res.status}). It isn't down — another page there may work.`,
        };
      }

      if (res.status < 200 || res.status > 299) {
        return { ok: false, code: "unreachable", status: res.status, message: `The site answered with HTTP ${res.status}.` };
      }

      return { ok: true, status: res.status, html: await readCapped(res, controller), finalUrl: target.href };
    } catch (err) {
      if (controller.signal.aborted) {
        return {
          ok: false,
          code: "unreachable",
          message: `The site didn't respond within ${Math.round(timeoutMs / 1000)}s.`,
        };
      }
      // Whatever fetch threw reads like a stack trace ("Request cannot be
      // constructed from a URL that includes credentials: …"), so it goes to
      // the timeline as detail and the user gets a sentence.
      return {
        ok: false,
        code: "unreachable",
        message: "We couldn't reach the site. Check the address, then try opening the page in a browser.",
        detail: err instanceof Error ? err.message : String(err),
      };
    } finally {
      clearTimeout(timer);
    }
  }
}
