import { createHash } from "node:crypto";
import * as cheerio from "cheerio";

/**
 * HTML in, stable text out. Pure: no network, no database, no clock.
 *
 * Everything downstream inherits this function's bugs — a hash that moves on
 * its own turns the product into a false-positive machine — so it is the one
 * file with fixture tests.
 */

/** Chrome, ads, and anything else that changes without the page changing. */
const DROP = [
  "script",
  "style",
  "noscript",
  "template",
  "svg",
  "iframe",
  "canvas",
  "video",
  "audio",
  "nav",
  "header",
  "footer",
  "form",
  '[aria-hidden="true"]',
  '[role="navigation"]',
  '[role="banner"]',
  '[role="contentinfo"]',
  '[role="complementary"]',
].join(", ");

const NOISE =
  /(^|[-_ ])(ad|ads|advert|banner|carousel|cookie|consent|chat|popup|modal|recommend|related|sidebar|social|share|newsletter|toast)([-_ ]|$)/i;

/** Elements that start their own line. Table cells are joined with " | " instead. */
const BLOCKS =
  "p, div, li, h1, h2, h3, h4, h5, h6, tr, dt, dd, section, article, blockquote, pre, br";

/**
 * A private separator injected at block boundaries before reading the text.
 * Splitting on this instead of on "\n" means source formatting — a paragraph
 * hard-wrapped across three lines in the HTML — cannot change the output.
 * U+241F survives HTML parsing (U+0000 does not) and never occurs in real text.
 */
const MARK = "␟";

/** Self-updating page furniture. Each of these would otherwise change every hash. */
const CLEANERS: RegExp[] = [
  /\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(:\d{2})?(\.\d+)?(Z|[+-]\d{2}:?\d{2})?/g,
  /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+\d{1,2}(st|nd|rd|th)?,?\s+\d{4}\b/gi,
  /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/g,
  /\b\d{4}-\d{2}-\d{2}\b/g,
  /\b\d{1,2}:\d{2}(:\d{2})?\s*([ap]\.?m\.?)?/gi,
  /\b\d+\s+(second|minute|hour|day|week|month)s?\s+ago\b/gi,
  /(updated|posted|published|last modified)\s*(on|at)?[:\s]+.*$/gi,
  /\d[\d,]*\s*(views?|likes?|comments?|shares?|people\s+(are\s+)?viewing)/gi,
  /[A-Za-z0-9_-]{24,}/g, // nonces, CSRF tokens, cache-busting ids
];

export function extract(html: string): { text: string; hash: string; title: string | null } {
  const $ = cheerio.load(html);
  const title = $("title").first().text().trim() || null;

  $(DROP).remove();
  $("[id], [class]").each((_, el) => {
    if (NOISE.test(`${$(el).attr("id") ?? ""} ${$(el).attr("class") ?? ""}`)) $(el).remove();
  });
  $("*")
    .contents()
    .filter((_, node) => node.type === "comment")
    .remove();

  const root =
    ["main", "article", '[role="main"]'].map((sel) => $(sel).first()).find((el) => el.length > 0) ??
    $("body");

  // Mark the boundaries, then read the region's text in one pass. Without the
  // marks "Apply Now" fuses with whatever sits next to it in the DOM.
  root.find(BLOCKS).each((_, el) => {
    $(el).before(MARK).after(MARK);
  });
  root.find("td, th").each((_, el) => {
    $(el).after(" | ");
  });

  const lines: string[] = [];
  for (const chunk of root.text().split(MARK)) {
    let line = chunk.replace(/\s+/g, " ").trim();
    for (const cleaner of CLEANERS) line = line.replace(cleaner, " ");
    line = line
      .replace(/(\s*\|\s*)+/g, " | ")
      .replace(/^\s*\|\s*|\s*\|\s*$/g, "")
      .replace(/\s+/g, " ")
      .trim();
    if (line.length < 2) continue;
    if (lines[lines.length - 1] === line) continue;
    lines.push(line);
  }

  const text = lines.join("\n");
  return { text, hash: createHash("sha256").update(text).digest("hex"), title };
}
