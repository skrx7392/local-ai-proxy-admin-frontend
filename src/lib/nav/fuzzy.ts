/**
 * Tiny fuzzy matcher for the topbar "Go to…" combobox (and other short,
 * static lists). Deliberately dependency-free: with ~10 nav labels a simple
 * banded subsequence score beats pulling in cmdk/fuse.
 *
 * Scoring bands (higher = better):
 * - 3000s — query is a prefix of the text (shorter text ranks higher)
 * - 2000s — query is a substring (earlier occurrence ranks higher)
 * - 1000s — query is a non-contiguous subsequence (tighter span, earlier
 *           start ranks higher)
 * - null  — not a match
 *
 * An empty/whitespace query matches everything with score 0 so callers can
 * show the full list in its canonical order.
 */
export function fuzzyScore(text: string, query: string): number | null {
  const t = text.toLowerCase();
  const q = query.trim().toLowerCase();
  if (q.length === 0) return 0;

  if (t.startsWith(q)) return 3000 - t.length;

  const at = t.indexOf(q);
  if (at !== -1) return 2000 - at;

  // Subsequence: every query char appears in order. Greedy left-to-right
  // match; penalize scattered matches (wide span) and late starts.
  let from = 0;
  let first = -1;
  let last = -1;
  for (const ch of q) {
    const idx = t.indexOf(ch, from);
    if (idx === -1) return null;
    if (first === -1) first = idx;
    last = idx;
    from = idx + 1;
  }
  const gaps = last - first + 1 - q.length;
  return 1000 - gaps - first;
}

/**
 * Filter + rank `items` by `fuzzyScore` of `getText(item)` against `query`.
 * Non-matches are dropped; ties keep the original item order (stable sort),
 * so an empty query returns the list unchanged.
 */
export function fuzzyFilter<T>(
  items: readonly T[],
  query: string,
  getText: (item: T) => string,
): T[] {
  const scored: Array<{ item: T; score: number }> = [];
  for (const item of items) {
    const score = fuzzyScore(getText(item), query);
    if (score !== null) scored.push({ item, score });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.map((entry) => entry.item);
}
