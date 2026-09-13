import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { diffLines } from "../lib/diff";
import { extract } from "../lib/extract";

const fixture = (name: string): string =>
  readFileSync(new URL(`./fixtures/${name}`, import.meta.url), "utf8");

const CLOSED = fixture("careers-closed.html");
const OPEN = fixture("careers-open.html");

describe("extract", () => {
  it("keeps the listing and drops the page furniture", () => {
    const { text, title } = extract(CLOSED);

    expect(title).toBe("Careers — Northwind Systems");
    expect(text).toContain("Applications are currently closed.");
    expect(text).toContain("Location | Team | Duration");

    expect(text).not.toContain("Pricing"); // site header nav
    expect(text).not.toContain("Breadcrumb"); // nav inside main
    expect(text).not.toContain("cookies"); // .cookie-banner
    expect(text).not.toContain("Related roles"); // .related-roles
    expect(text).not.toContain("Privacy policy"); // footer
    expect(text).not.toContain("__NONCE__"); // script
  });

  it("drops timestamps and counters", () => {
    const { text } = extract(CLOSED);
    expect(text).not.toContain("2026-09-12");
    expect(text).not.toContain("14:03");
    expect(text).not.toContain("1,204");
  });

  it("hashes the same when only the timestamp moves", () => {
    const baseline = extract(CLOSED).hash;
    const laterClock = CLOSED.replace("2026-09-12 14:03", "2026-09-13 09:20");
    const moreViewers = CLOSED.replace("1,204 people", "8,675 people");

    expect(laterClock).not.toBe(CLOSED);
    expect(moreViewers).not.toBe(CLOSED);
    expect(extract(laterClock).hash).toBe(baseline);
    expect(extract(moreViewers).hash).toBe(baseline);
  });

  it("hashes differently when the listing opens, and the diff says why", () => {
    const before = extract(CLOSED);
    const after = extract(OPEN);
    expect(after.hash).not.toBe(before.hash);

    const { added, removed } = diffLines(before.text, after.text);
    expect(added).toContain("Apply Now — applications open.");
    expect(removed).toContain("Applications are currently closed.");
  });

  it("extracts nothing from a page that renders itself with JavaScript", () => {
    expect(extract(fixture("js-shell.html")).text).toBe("");
  });
});
