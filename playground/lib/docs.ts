import fs from "node:fs";
import path from "node:path";

/**
 * Research documents: one Markdown file per document in `playground/docs/`, with front matter.
 * Read on the server at build time. `docs/README.md` (the guide for people and agents) isn't a document.
 */
export type DocMeta = {
  title: string;
  description: string;
  /** What sort of document, e.g. "Merchant research", "User journey", "Interview notes". */
  kind: string;
  /** YYYY-MM-DD: when the research happened or the document was written. */
  date: string;
  /** Products, modules or themes it covers. Searchable, and how agents find the relevant docs. */
  topics: string[];
  /** Original file it was converted from, if any. */
  source?: string;
};

export type Doc = { slug: string; meta: DocMeta; body: string };
/** What the client needs for listing and search: no full Markdown. */
export type DocSummary = { slug: string; meta: DocMeta; text: string };

const DOCS_DIR = path.join(process.cwd(), "docs");
const SKIP = new Set(["README.md"]);

function parseValue(raw: string): string | string[] {
  const v = raw.trim();
  if (v.startsWith("[") && v.endsWith("]"))
    return v.slice(1, -1).split(",").map((s) => unquote(s.trim())).filter(Boolean);
  return unquote(v);
}

function unquote(s: string) {
  return /^(["']).*\1$/.test(s) ? s.slice(1, -1) : s;
}

function parse(slug: string, file: string): Doc {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(file);
  if (!match) throw new Error(`docs/${slug}.md: missing front matter (--- title, description, kind, date ---)`);
  const fields: Record<string, string | string[]> = {};
  for (const line of match[1].split(/\r?\n/)) {
    const i = line.indexOf(":");
    if (i > 0) fields[line.slice(0, i).trim()] = parseValue(line.slice(i + 1));
  }
  const str = (key: string) => {
    const v = fields[key];
    if (typeof v !== "string" || !v) throw new Error(`docs/${slug}.md: front matter needs "${key}"`);
    return v;
  };
  const date = str("date");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error(`docs/${slug}.md: date must be YYYY-MM-DD`);
  const topics = fields.topics ?? [];
  return {
    slug,
    meta: {
      title: str("title"),
      description: str("description"),
      kind: str("kind"),
      date,
      topics: Array.isArray(topics) ? topics : [topics],
      source: typeof fields.source === "string" && fields.source ? fields.source : undefined,
    },
    body: match[2].trim(),
  };
}

/** Every document, newest first. */
export function getAllDocs(): Doc[] {
  if (!fs.existsSync(DOCS_DIR)) return [];
  return fs
    .readdirSync(DOCS_DIR)
    .filter((name) => name.endsWith(".md") && !SKIP.has(name))
    .map((name) => {
      const slug = name.slice(0, -3);
      if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) throw new Error(`docs/${name}: file name must be kebab-case`);
      return parse(slug, fs.readFileSync(path.join(DOCS_DIR, name), "utf8"));
    })
    .sort((a, b) => b.meta.date.localeCompare(a.meta.date) || a.meta.title.localeCompare(b.meta.title));
}

export function getDoc(slug: string): Doc | undefined {
  return getAllDocs().find((d) => d.slug === slug);
}

/** Markdown → plain text, good enough for search and snippets. */
function plain(md: string) {
  return md
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/^[#>\-*+|\s]+/gm, "")
    .replace(/[*_`|]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function getDocSummaries(): DocSummary[] {
  return getAllDocs().map(({ slug, meta, body }) => ({ slug, meta, text: plain(body) }));
}
