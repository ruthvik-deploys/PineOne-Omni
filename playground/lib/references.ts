import type { Element, ElementContent, Root, Text } from "hast";
import { toString } from "hast-util-to-string";
import { visitParents } from "unist-util-visit-parents";
import type { Doc } from "./docs";

/**
 * Cross-references between the docs. The documents cite shared IDs (P1 persona, T3 task lens,
 * B04 behaviour, R02 merchant visit, G2 goal, R10 platform requirement, D4 decision) and each other
 * by full name. The glossary is built from where each ID is defined; `rehypeReferences` turns every
 * mention into a link carrying the definition, and marks the definition itself as the link target.
 */
export type Reference = {
  /** "B04", or "doc:<slug>" for a whole document. */
  key: string;
  label: string;
  name: string;
  definition: string;
  /** Document that defines it. */
  slug: string;
  docTitle: string;
  anchor: string | null;
};

export type Glossary = Map<string, Reference>;

const ID = String.raw`(?:P[1-5]|T[1-5]|B(?:0[1-9]|1[0-8])|R0[1-5]|R(?:1[0-5]|[1-9])|G[1-5]|D(?:1[01]|[1-9]))`;
const MAX_DEFINITION = 320;

function clean(md: string) {
  return md
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[*_`]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function clip(text: string) {
  return text.length > MAX_DEFINITION ? `${text.slice(0, MAX_DEFINITION).replace(/\s+\S*$/, "")}…` : text;
}

function cells(line: string) {
  return line.split("|").slice(1, -1).map((c) => clean(c));
}

/** First paragraph under a heading (for R visits, the findings paragraph reads better than the method). */
function paragraphAfter(body: string, headingLine: string, prefer?: RegExp) {
  const start = body.indexOf(headingLine);
  if (start < 0) return "";
  const rest = body.slice(start + headingLine.length);
  const section = rest.split(/\n#{1,6} /)[0];
  const paras = section.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  const pick = (prefer && paras.find((p) => prefer.test(p))) ?? paras[0] ?? "";
  return clip(clean(pick));
}

export function buildGlossary(docs: Doc[]): Glossary {
  const glossary: Glossary = new Map();
  const add = (ref: Reference) => {
    if (!glossary.has(ref.key)) glossary.set(ref.key, ref);
  };
  const headingRe = new RegExp(`^(#{1,6})\\s+(${ID})\\s+(.+)$`, "gm");
  const rowRe = new RegExp(`^\\|\\s*(?:\\*\\*)?(${ID})\\s+([^|]+?)(?:\\*\\*)?\\s*\\|.*\\|\\s*$`, "gm");
  const decisionRe = new RegExp(`^\\*\\*(D(?:1[01]|[1-9]))\\s+([^*]+?)\\*\\*\\s*(.*)$`, "gm");

  for (const doc of docs) {
    const base = { slug: doc.slug, docTitle: doc.meta.title };
    add({ ...base, key: `doc:${doc.slug}`, label: doc.meta.title, name: doc.meta.title, definition: doc.meta.description, anchor: null });

    for (const m of doc.body.matchAll(headingRe)) {
      const text = clean(`${m[2]} ${m[3]}`);
      const anchor = doc.headings.find((h) => h.text === text)?.id ?? null;
      add({ ...base, key: m[2], label: m[2], name: clean(m[3]), definition: paragraphAfter(doc.body, m[0], /^\*\*Context and findings/), anchor });
    }
    for (const m of doc.body.matchAll(rowRe)) {
      const [, ...rest] = cells(m[0]);
      const id = m[1];
      const definition =
        id.startsWith("T") ? `${rest[0]}. Usually adopted by ${rest[1]}. Needs: ${rest[2]}.`
        : id.startsWith("G") ? `${rest[0]}. Measured by: ${rest[1]}.`
        : `${rest[0]}. Priority ${rest[1]}.`;
      const kind = id.startsWith("R") ? "Requirement: " : "";
      add({ ...base, key: id, label: id, name: `${kind}${clean(m[2])}`, definition: clip(definition), anchor: `ref-${id.toLowerCase()}` });
    }
    for (const m of doc.body.matchAll(decisionRe)) {
      const [title, status] = clean(m[2]).replace(/\.$/, "").split(/\s+—\s+/);
      add({ ...base, key: m[1], label: m[1], name: title, definition: clip(`${status ? `${status[0].toUpperCase()}${status.slice(1)}. ` : ""}${clean(m[3])}`), anchor: `ref-${m[1].toLowerCase()}` });
    }
  }
  return glossary;
}

/** Full document names as written in the docs ("Pine One Refunds Design Document") → their keys. */
export function documentNames(docs: Doc[]) {
  const names = new Map<string, string>();
  for (const doc of docs) {
    const original = doc.meta.source?.split("/").pop()?.replace(/\.docx$/, "");
    if (original) names.set(original, `doc:${doc.slug}`);
  }
  return names;
}

const NO_LINKS = new Set(["a", "code", "pre", "h1", "h2", "h3", "h4", "h5", "h6"]);
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * rehype plugin: links every known ID and document name in running text, and gives the
 * definition sites (table rows, decision paragraphs) the ids those links point at.
 * A table cell holding only "P0"/"P1"/"P2" is a priority, not a persona, and stays plain.
 */
export function rehypeReferences({ glossary, names, slug }: { glossary: Glossary; names: Map<string, string>; slug: string }) {
  const nameAlternation = [...names.keys()].sort((a, b) => b.length - a.length).map(escape).join("|");
  const pattern = new RegExp(`${nameAlternation ? `(${nameAlternation})|` : "()"}\\b(${ID})\\b`, "g");

  return (tree: Root) => {
    visitParents(tree, "element", (node: Element) => {
      if (node.tagName === "tr") {
        const first = node.children.find((c): c is Element => c.type === "element");
        const m = first && new RegExp(`^(${ID})\\s`).exec(toString(first).trim());
        const ref = m && glossary.get(m[1]);
        if (ref && ref.slug === slug && ref.anchor?.startsWith("ref-")) node.properties = { ...node.properties, id: ref.anchor };
      }
      if (node.tagName === "p") {
        const first = node.children[0];
        const m = first?.type === "element" && first.tagName === "strong" && /^(D(?:1[01]|[1-9]))\s/.exec(toString(first));
        const ref = m && glossary.get(m[1]);
        if (ref && ref.slug === slug && ref.anchor) node.properties = { ...node.properties, id: ref.anchor };
      }
    });

    visitParents(tree, "text", (node: Text, ancestors) => {
      if (ancestors.some((a) => a.type === "element" && NO_LINKS.has(a.tagName))) return;
      const parent = ancestors[ancestors.length - 1];
      const cell = [...ancestors].reverse().find((a): a is Element => a.type === "element" && (a.tagName === "td" || a.tagName === "th"));
      const isPriority = cell && /^P\d(\s+proposed)?$/i.test(toString(cell).trim());

      const parts: ElementContent[] = [];
      let last = 0;
      for (const m of node.value.matchAll(pattern)) {
        const key = m[1] ? names.get(m[1]) : m[2];
        const ref = key && glossary.get(key);
        if (!ref || (isPriority && m[2]?.startsWith("P"))) continue;
        if (m.index > last) parts.push({ type: "text", value: node.value.slice(last, m.index) });
        parts.push({
          type: "element",
          tagName: "a",
          properties: { href: `/docs/${ref.slug}${ref.anchor ? `#${ref.anchor}` : ""}`, dataRef: ref.key },
          children: [{ type: "text", value: m[0] }],
        });
        last = m.index + m[0].length;
      }
      if (!parts.length || parent.type !== "element") return;
      if (last < node.value.length) parts.push({ type: "text", value: node.value.slice(last) });
      const i = parent.children.indexOf(node);
      parent.children.splice(i, 1, ...parts);
      return i + parts.length; // continue after what was inserted
    });
  };
}
