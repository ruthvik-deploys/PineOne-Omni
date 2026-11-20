import type { DocSummary } from "@/lib/docs";
import { FOLDERS, type Folder } from "@/lib/folders";
import type { Prototype } from "@/lib/prototypes";

/** Pure helpers for the home page and folder pages. No React. */

export type DocHit = { doc: DocSummary; snippet: string | null };

/** Ranked document search, shared by the home search and the Docs folder. */
export function searchDocs(query: string, docs: DocSummary[]): DocHit[] {
  const terms = words(query);
  if (!terms.length) return docs.map((doc) => ({ doc, snippet: null }));
  return docs
    .flatMap((doc) => {
      const head = [doc.meta.title, doc.meta.description, doc.meta.kind, ...doc.meta.topics];
      if (!matchesAll([...head, doc.text], terms)) return [];
      return [{ hit: { doc, snippet: matchesAll(head, terms) ? null : snippet(doc.text, terms, query) }, score: score(doc, terms, query) }];
    })
    .sort((a, b) => b.score - a.score)
    .map(({ hit }) => hit);
}
export type FolderHits = { folder: Folder; prototypes: Prototype[]; docs: DocHit[] };

const SNIPPET_RADIUS = 70;

function words(query: string) {
  return query.trim().toLowerCase().split(/\s+/).filter(Boolean);
}

/** Every word has to appear somewhere in the item's fields. */
function matchesAll(fields: string[], terms: string[]) {
  const haystack = fields.join(" ").toLowerCase();
  return terms.every((t) => haystack.includes(t));
}

function count(haystack: string, needle: string) {
  let n = 0;
  for (let i = haystack.indexOf(needle); i >= 0; i = haystack.indexOf(needle, i + needle.length)) n += 1;
  return n;
}

/** Title hits first, then the exact phrase, then how often each word appears. */
function score(doc: DocSummary, terms: string[], query: string) {
  const title = doc.meta.title.toLowerCase();
  const head = [doc.meta.description, ...doc.meta.topics].join(" ").toLowerCase();
  const text = doc.text.toLowerCase();
  const phrase = query.trim().toLowerCase();
  return (
    terms.filter((t) => title.includes(t)).length * 1000 +
    terms.filter((t) => head.includes(t)).length * 100 +
    Math.min(count(text, phrase), 20) * 10 +
    terms.reduce((sum, t) => sum + Math.min(count(text, t), 50), 0)
  );
}

/** A window of text around the exact phrase if it appears, otherwise around the first word that does. */
function snippet(text: string, terms: string[], query: string) {
  const lower = text.toLowerCase();
  const phraseAt = lower.indexOf(query.trim().toLowerCase());
  const at = phraseAt >= 0 ? phraseAt : terms.map((t) => lower.indexOf(t)).filter((i) => i >= 0).sort((a, b) => a - b)[0];
  if (at === undefined) return null;
  const start = Math.max(0, at - SNIPPET_RADIUS);
  const end = Math.min(text.length, at + SNIPPET_RADIUS * 2);
  return `${start > 0 ? "…" : ""}${text.slice(start, end).trim()}${end < text.length ? "…" : ""}`;
}

/**
 * Search across every folder: prototypes by title, description, group, tags and folder name;
 * documents by their front matter and full text (with a snippet when the hit is in the text).
 * Hidden prototypes are left out unless `showHidden`. Folders without hits are dropped; folder order is kept.
 */
export function searchAll(query: string, prototypes: Prototype[], docs: DocSummary[]): FolderHits[] {
  const terms = words(query);
  if (!terms.length) return [];
  return FOLDERS.map((folder) => {
    const protoHits = prototypes.filter(
      (p) =>
        p.meta.folder === folder.id &&
        matchesAll([p.meta.title, p.meta.description, p.slug, p.meta.group ?? "", folder.title, ...p.meta.tags], terms)
    );
    const docHits: DocHit[] =
      folder.id !== "docs" ? [] : searchDocs(query, docs);
    return { folder, prototypes: protoHits, docs: docHits };
  }).filter((h) => h.prototypes.length + h.docs.length > 0);
}
