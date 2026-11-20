import fs from "node:fs";
import path from "node:path";
import GithubSlugger from "github-slugger";

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

/** "Updated: 5 October 2026"-style lines at the top of a document, lifted into the title block. */
export type DocDetail = { label: string; value: string };
/** Heading ids match what rehype-slug gives the rendered headings (same slugger, same order). */
export type DocHeading = { depth: number; text: string; id: string };

export type Doc = { slug: string; meta: DocMeta; details: DocDetail[]; body: string; headings: DocHeading[]; minutes: number };
/** What the client needs for listing and search: no full Markdown. */
export type DocSummary = { slug: string; meta: DocMeta; text: string; minutes: number };

const WORDS_PER_MINUTE = 220;

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
    ...structure(match[2].trim()),
  };
}

/** Pulls the "Key: value" lines before the first heading out of the body, and lists the headings. */
function structure(markdown: string) {
  const firstHeading = markdown.search(/^#{1,6} /m);
  const intro = firstHeading < 0 ? markdown : markdown.slice(0, firstHeading);
  const rest = firstHeading < 0 ? "" : markdown.slice(firstHeading);
  const details: DocDetail[] = [];
  const kept = intro.split(/\n{2,}/).filter((para) => {
    const m = /^([A-Z][A-Za-z ,]{1,60}):\s+(\S[^\n]*)$/.exec(para.trim());
    if (!m) return true;
    details.push({ label: m[1] === "Design owner, product owner and launch milestone" ? "Owners" : m[1], value: m[2].trim() });
    return false;
  });
  const body = [kept.join("\n\n").trim(), rest].filter(Boolean).join("\n\n");
  const slugger = new GithubSlugger();
  const headings: DocHeading[] = [];
  let inFence = false;
  for (const line of body.split("\n")) {
    if (line.startsWith("```")) inFence = !inFence;
    const m = !inFence && /^(#{1,6})\s+(.+?)\s*#*$/.exec(line);
    if (!m) continue;
    const text = m[2].replace(/\[([^\]]*)\]\([^)]*\)/g, "$1").replace(/[*_`]/g, "").trim();
    headings.push({ depth: m[1].length, text, id: slugger.slug(text) });
  }
  const minutes = Math.max(1, Math.round(plain(body).split(" ").length / WORDS_PER_MINUTE));
  return { details, body, headings, minutes };
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
  return getAllDocs().map(({ slug, meta, body, minutes }) => ({ slug, meta, text: plain(body), minutes }));
}
