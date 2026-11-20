import type { DocSummary } from "@/lib/docs";
import { FOLDERS, type Folder, type FolderId } from "@/lib/folders";
import type { Prototype } from "@/lib/prototypes";

/** Pure helpers for the home page and folder pages. No React. */

export type DocHit = { doc: DocSummary; snippet: string | null };
export type FolderHits = { folder: Folder; prototypes: Prototype[]; docs: DocHit[] };

const SNIPPET_RADIUS = 70;

/** Visible (not hidden) items per folder, for the folder cards. */
export function countByFolder(prototypes: Prototype[], docs: DocSummary[]): Record<FolderId, number> {
  const counts = Object.fromEntries(FOLDERS.map((f) => [f.id, 0])) as Record<FolderId, number>;
  for (const p of prototypes) if (!p.meta.hidden) counts[p.meta.folder] += 1;
  counts.docs = docs.length;
  return counts;
}

function words(query: string) {
  return query.trim().toLowerCase().split(/\s+/).filter(Boolean);
}

/** Every word has to appear somewhere in the item's fields. */
function matchesAll(fields: string[], terms: string[]) {
  const haystack = fields.join(" ").toLowerCase();
  return terms.every((t) => haystack.includes(t));
}

function snippet(text: string, terms: string[]) {
  const lower = text.toLowerCase();
  const at = terms.map((t) => lower.indexOf(t)).filter((i) => i >= 0).sort((a, b) => a - b)[0];
  if (at === undefined) return null;
  const start = Math.max(0, at - SNIPPET_RADIUS);
  const end = Math.min(text.length, at + SNIPPET_RADIUS * 2);
  return `${start > 0 ? "…" : ""}${text.slice(start, end).trim()}${end < text.length ? "…" : ""}`;
}

/**
 * Search across every folder: prototypes by title, description, group, tags and folder name;
 * documents by their front matter and full text (with a snippet when the hit is in the text).
 * Hidden prototypes are left out. Folders without hits are dropped; folder order is kept.
 */
export function searchAll(query: string, prototypes: Prototype[], docs: DocSummary[]): FolderHits[] {
  const terms = words(query);
  if (!terms.length) return [];
  return FOLDERS.map((folder) => {
    const protoHits = prototypes.filter(
      (p) =>
        p.meta.folder === folder.id &&
        !p.meta.hidden &&
        matchesAll([p.meta.title, p.meta.description, p.slug, p.meta.group ?? "", folder.title, ...p.meta.tags], terms)
    );
    const docHits: DocHit[] =
      folder.id !== "docs"
        ? []
        : docs.flatMap((doc) => {
            const head = [doc.meta.title, doc.meta.description, doc.meta.kind, ...doc.meta.topics];
            if (!matchesAll([...head, doc.text], terms)) return [];
            return [{ doc, snippet: matchesAll(head, terms) ? null : snippet(doc.text, terms) }];
          });
    return { folder, prototypes: protoHits, docs: docHits };
  }).filter((h) => h.prototypes.length + h.docs.length > 0);
}

export type FolderSection = { title: string | null; items: Prototype[] };

const SURFACE_LABEL = { web: "Web", mobile: "Mobile app" } as const;

/**
 * Inside a folder: one section per `group` when there are several groups, otherwise
 * Web / Mobile app when the folder mixes both, otherwise a single untitled list.
 * Items keep their input order (newest first).
 */
export function sectionsFor(prototypes: Prototype[]): FolderSection[] {
  const split = (key: (p: Prototype) => string, label: (k: string) => string) => {
    const map = new Map<string, Prototype[]>();
    for (const p of prototypes) map.set(key(p), [...(map.get(key(p)) ?? []), p]);
    return map.size > 1
      ? [...map.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([k, items]) => ({ title: label(k), items }))
      : null;
  };
  return (
    split((p) => p.meta.group ?? "", (k) => k || "Other") ??
    split((p) => p.meta.surface ?? "", (k) => (k ? SURFACE_LABEL[k as keyof typeof SURFACE_LABEL] : "Other")) ?? [
      { title: null, items: prototypes },
    ]
  );
}
