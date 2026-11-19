import type { Prototype } from "@/lib/prototypes";

export type Surface = "web" | "mobile";
export type GalleryFilter = { query: string; tag: string | null; showHidden: boolean; surface?: Surface | null };

/** Pure: which prototypes match the search, tag and hidden toggle. Input order (newest first) is kept. */
export function filterPrototypes(prototypes: Prototype[], { query, tag, showHidden, surface = null }: GalleryFilter) {
  const q = query.trim().toLowerCase();
  return prototypes.filter((p) => {
    if (p.meta.hidden && !showHidden) return false;
    if (tag && !p.meta.tags.includes(tag)) return false;
    if (surface && p.meta.surface !== surface) return false;
    if (!q) return true;
    return [p.meta.title, p.meta.description, p.slug, p.meta.group ?? "", ...p.meta.tags].some((s) => s.toLowerCase().includes(q));
  });
}

/** Tags shared by at least two visible prototypes, most used first. One-off tags stay searchable but don't get a chip. */
export function collectTags(prototypes: Prototype[], showHidden: boolean) {
  const counts = new Map<string, number>();
  for (const p of prototypes) {
    if (p.meta.hidden && !showHidden) continue;
    for (const t of p.meta.tags) counts.set(t, (counts.get(t) ?? 0) + 1);
  }
  return [...counts.entries()]
    .filter(([, n]) => n >= 2)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([t]) => t);
}

export type GalleryGroup = { title: string | null; items: Prototype[] };
export type GallerySection = { id: "web" | "mobile" | "other"; title: string; groups: GalleryGroup[] };

const SECTIONS: { id: GallerySection["id"]; title: string }[] = [
  { id: "web", title: "Web" },
  { id: "mobile", title: "Mobile app" },
  { id: "other", title: "Prototypes" },
];

/**
 * Pure: split prototypes into Web / Mobile app / Prototypes sections, then by `group`.
 * Groups sort alphabetically so a product's groups sit together ("Pine One", "Pine One onboarding");
 * items keep their input order (newest first). Empty sections are dropped.
 */
export function groupPrototypes(prototypes: Prototype[]): GallerySection[] {
  return SECTIONS.map(({ id, title }) => {
    const items = prototypes.filter((p) => (p.meta.surface ?? "other") === id);
    const byGroup = new Map<string, Prototype[]>();
    for (const p of items) {
      const key = p.meta.group ?? "";
      byGroup.set(key, [...(byGroup.get(key) ?? []), p]);
    }
    const groups = [...byGroup.entries()]
      .sort(([a], [b]) => (a === "" ? 1 : b === "" ? -1 : a.localeCompare(b)))
      .map(([key, list]) => ({ title: key || null, items: list }));
    return { id, title, groups };
  }).filter((s) => s.groups.length > 0);
}
