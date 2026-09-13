/**
 * A counting diff, not an LCS diff: which lines occur more often in one version
 * than the other. We never render a side-by-side view — the timeline and the
 * AI judge both only need "what appeared" and "what vanished" — and this cannot
 * be confused by a block of text moving up the page. Counting rather than set
 * membership matters on real pages: a job board already says "Apply now" on
 * every other listing, and a fourth one appearing is exactly the change we
 * are watching for.
 */
export function diffLines(before: string, after: string): { added: string[]; removed: string[] } {
  const count = (text: string): Map<string, number> => {
    const counts = new Map<string, number>();
    for (const line of text ? text.split("\n") : []) counts.set(line, (counts.get(line) ?? 0) + 1);
    return counts;
  };
  const beforeCounts = count(before);
  const afterCounts = count(after);
  const grew = (a: Map<string, number>, b: Map<string, number>): string[] =>
    [...a].filter(([line, n]) => n > (b.get(line) ?? 0)).map(([line]) => line);

  return { added: grew(afterCounts, beforeCounts), removed: grew(beforeCounts, afterCounts) };
}
