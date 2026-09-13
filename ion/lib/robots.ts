import { safeFetch } from "./safeFetch";

/**
 * Does the site's robots.txt let us fetch this URL?
 *
 * Checked once, at watch creation. Anything that goes wrong — no robots.txt,
 * a 500, a timeout — means "allowed", which is what the standard says and also
 * the only sane default for a monitor.
 */

const ROBOTS_TIMEOUT_MS = 5_000;

/** "IonBot/1.0 (+https://…)" → "ionbot". */
const TOKEN = (process.env.USER_AGENT ?? "IonBot").split("/")[0].trim().toLowerCase();

type Rule = { allow: boolean; path: string };

/** Collect the Allow/Disallow rules of every group, keyed by lowercased agent token. */
function parse(body: string): Map<string, Rule[]> {
  const groups = new Map<string, Rule[]>();
  let agents: string[] = [];
  let inRules = false; // a rule line closes the group's agent list

  for (const raw of body.split(/\r?\n/)) {
    const line = raw.split("#")[0].trim();
    const colon = line.indexOf(":");
    if (colon < 0) continue;
    const field = line.slice(0, colon).trim().toLowerCase();
    const value = line.slice(colon + 1).trim();

    if (field === "user-agent") {
      if (inRules) {
        agents = [];
        inRules = false;
      }
      agents.push(value.toLowerCase());
    } else if (field === "allow" || field === "disallow") {
      inRules = true;
      if (!value) continue; // "Disallow:" with nothing after it allows everything
      for (const agent of agents) {
        const rules = groups.get(agent) ?? [];
        rules.push({ allow: field === "allow", path: value });
        groups.set(agent, rules);
      }
    }
  }
  return groups;
}

/** robots.txt patterns support `*` anywhere and `$` as an end anchor. */
function matches(pattern: string, path: string): boolean {
  const anchored = pattern.endsWith("$");
  const body = anchored ? pattern.slice(0, -1) : pattern;
  const source = body
    .split("*")
    .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join(".*");
  return new RegExp(`^${source}${anchored ? "$" : ""}`).test(path);
}

export async function robotsAllows(url: string): Promise<boolean> {
  const target = new URL(url);
  const res = await safeFetch(new URL("/robots.txt", target.origin).href, ROBOTS_TIMEOUT_MS);
  if (!res.ok) return true;

  const groups = parse(res.html);
  const rules = groups.get(TOKEN) ?? groups.get("*") ?? [];
  const path = target.pathname + target.search;

  // Longest matching pattern wins; on a tie the permissive rule does.
  let best: Rule | null = null;
  for (const rule of rules) {
    if (!matches(rule.path, path)) continue;
    if (!best || rule.path.length > best.path.length || (rule.path.length === best.path.length && rule.allow)) {
      best = rule;
    }
  }
  return best ? best.allow : true;
}
