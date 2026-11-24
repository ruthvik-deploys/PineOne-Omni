"use client";

import { useMemo, useState } from "react";
import { PageTitle } from "@/components/page-title";
import { TAG_GROUPS } from "@/lib/doc-tags";
import type { DocSummary } from "@/lib/docs";
import { DocTile } from "./doc-tile";
import { plural } from "./format";
import { SearchBox } from "./search-box";
import { searchDocs } from "./search";
import { TagBar } from "./tag-bar";

/**
 * The Docs folder: search (full text, ranked, with the matching passage) and tags
 * (channel and persona) on top, then every doc as a file with its page preview (A–Z, or ranked while searching).
 */
export function DocsBrowser({ docs, title }: { docs: DocSummary[]; title: string }) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  // Several tags narrow the list: a doc has to carry every selected tag.
  const tagged = useMemo(() => docs.filter((d) => selected.every((t) => d.tags.includes(t))), [docs, selected]);
  const hits = useMemo(() => searchDocs(query, tagged), [query, tagged]);
  const searching = query.trim().length > 0;
  // Browsing: every doc, A–Z. Searching: ranked by relevance.
  const list = searching ? hits : [...hits].sort((a, b) => a.doc.meta.title.localeCompare(b.doc.meta.title));
  const groups = TAG_GROUPS.map((g) => ({ label: g.label, tags: g.tags.filter((t) => docs.some((d) => d.tags.includes(t))) }));
  const toggle = (t: string) => setSelected((s) => (s.includes(t) ? s.filter((x) => x !== t) : [...s, t]));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-baseline justify-between gap-4">
        <PageTitle>{title}</PageTitle>
        <p className="shrink-0 text-sm text-muted-foreground tabular-nums" aria-live="polite">
          {plural(hits.length, "doc")}
        </p>
      </div>
      <div className="flex flex-col gap-3">
        <SearchBox value={query} onChange={setQuery} label="Search docs" />
        <TagBar groups={groups} selected={selected} onToggle={toggle} />
      </div>

      {hits.length === 0 ? (
        <p className="py-16 text-center text-sm text-muted-foreground">Nothing matches.</p>
      ) : (
        <div className="grid grid-cols-3 gap-x-2 gap-y-6 sm:grid-cols-4">
          {list.map(({ doc }) => (
            <DocTile key={doc.slug} doc={doc} />
          ))}
        </div>
      )}
    </div>
  );
}
