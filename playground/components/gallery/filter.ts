import type { Prototype } from "@/lib/prototypes";

export type GalleryFilter = { query: string; tag: string | null; showHidden: boolean };

/** Pure: which prototypes match the search, tag and hidden toggle. Input order (newest first) is kept. */
export function filterPrototypes(prototypes: Prototype[], { query, tag, showHidden }: GalleryFilter) {
  const q = query.trim().toLowerCase();
  return prototypes.filter((p) => {
    if (p.meta.hidden && !showHidden) return false;
    if (tag && !p.meta.tags.includes(tag)) return false;
    if (!q) return true;
    return [p.meta.title, p.meta.description, p.slug, ...p.meta.tags].some((s) => s.toLowerCase().includes(q));
  });
}

/** Tags across visible prototypes, most used first. */
export function collectTags(prototypes: Prototype[], showHidden: boolean) {
  const counts = new Map<string, number>();
  for (const p of prototypes) {
    if (p.meta.hidden && !showHidden) continue;
    for (const t of p.meta.tags) counts.set(t, (counts.get(t) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([t]) => t);
}
