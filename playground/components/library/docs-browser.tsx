"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { DOC_TAGS } from "@/lib/doc-tags";
import type { DocSummary } from "@/lib/docs";
import { DocTile } from "./doc-tile";
import { plural } from "./format";
import { SearchBox } from "./search-box";
import { searchDocs } from "./search";

/**
 * The Docs folder: search (full text, ranked, with the matching passage) and tags
 * (channel and persona) on top, then every doc as a file with its page preview (A–Z, or ranked while searching).
 */
export function DocsBrowser({ docs, title, description }: { docs: DocSummary[]; title: string; description: string }) {
  const [query, setQuery] = useState("");
  const [tag, setTag] = useState<string | null>(null);
  const tagged = useMemo(() => (tag ? docs.filter((d) => d.tags.includes(tag)) : docs), [docs, tag]);
  const hits = useMemo(() => searchDocs(query, tagged), [query, tagged]);
  const searching = query.trim().length > 0;
  // Browsing: every doc, A–Z. Searching: ranked by relevance.
  const list = searching ? hits : [...hits].sort((a, b) => a.doc.meta.title.localeCompare(b.doc.meta.title));
  const tags = DOC_TAGS.filter((t) => docs.some((d) => d.tags.includes(t)));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <div className="flex items-baseline justify-between gap-4">
          <h1 className="text-2xl font-semibold">{title}</h1>
          <p className="shrink-0 text-sm text-muted-foreground tabular-nums" aria-live="polite">
            {plural(hits.length, "doc")}
          </p>
        </div>
        <p className="text-muted-foreground">{description}</p>
      </div>
      <div className="flex flex-col gap-3">
        <SearchBox value={query} onChange={setQuery} label="Search docs" />
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by tag">
          {tags.map((t) => (
            <Button
              key={t}
              variant={tag === t ? "secondary" : "outline"}
              className="h-11 rounded-full px-4 sm:h-8 sm:px-3"
              aria-pressed={tag === t}
              onClick={() => setTag(tag === t ? null : t)}
            >
              {t}
            </Button>
          ))}
        </div>
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
