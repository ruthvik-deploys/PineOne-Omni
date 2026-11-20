"use client";

import { useMemo, useState } from "react";
import { Switch } from "@/components/ui/switch";
import { useShowHidden } from "@/hooks/use-show-hidden";
import type { DocSummary } from "@/lib/docs";
import { FOLDERS } from "@/lib/folders";
import type { Prototype } from "@/lib/prototypes";
import { FolderCard } from "./folder-card";
import { SearchBox } from "./search-box";
import { SearchResults } from "./search-results";
import { searchAll } from "./search";

/** Home: one search across everything, and the folders. Typing swaps the folders for results. */
export function LibraryHome({ prototypes, docs }: { prototypes: Prototype[]; docs: DocSummary[] }) {
  const [query, setQuery] = useState("");
  const [showHidden, setShowHidden] = useShowHidden();
  const hiddenCount = prototypes.filter((p) => p.meta.hidden).length;
  const hits = useMemo(() => searchAll(query, prototypes, docs, showHidden), [query, prototypes, docs, showHidden]);
  const titles = useMemo(() => new Map(prototypes.map((p) => [p.slug, p.meta.title])), [prototypes]);
  const visible = useMemo(() => prototypes.filter((p) => showHidden || !p.meta.hidden), [prototypes, showHidden]);

  return (
    <div className="flex flex-col gap-6">
      <SearchBox value={query} onChange={setQuery} />
      {query.trim() ? (
        <SearchResults hits={hits} titles={titles} />
      ) : (
        <div className="grid grid-cols-3 gap-x-2 gap-y-5 sm:grid-cols-4">
          {FOLDERS.map((folder) => (
            <FolderCard key={folder.id} folder={folder} prototypes={visible.filter((p) => p.meta.folder === folder.id)} docs={docs} />
          ))}
        </div>
      )}
      {hiddenCount > 0 && (
        <label className="flex h-11 items-center justify-end gap-2 self-end text-sm text-muted-foreground">
          Show hidden ({hiddenCount})
          <Switch checked={showHidden} onCheckedChange={setShowHidden} />
        </label>
      )}
    </div>
  );
}
