"use client";

import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import type { Prototype } from "@/lib/prototypes";
import { collectTags, filterPrototypes } from "./filter";
import { PrototypeCard } from "./prototype-card";

export function Gallery({ prototypes }: { prototypes: Prototype[] }) {
  const [query, setQuery] = useState("");
  const [tag, setTag] = useState<string | null>(null);
  const [showHidden, setShowHidden] = useState(false);

  const tags = useMemo(() => collectTags(prototypes, showHidden), [prototypes, showHidden]);
  const visible = useMemo(
    () => filterPrototypes(prototypes, { query, tag, showHidden }),
    [prototypes, query, tag, showHidden]
  );
  const hiddenCount = prototypes.filter((p) => p.meta.hidden).length;

  return (
    <div className="flex flex-col gap-4">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search"
          aria-label="Search prototypes"
          className="h-11 pl-9"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {(tags.length > 0 || hiddenCount > 0) && (
        <div className="flex flex-wrap items-center gap-2">
          {tags.map((t) => (
            <Button
              key={t}
              variant={tag === t ? "secondary" : "ghost"}
              className="h-11 sm:h-8"
              aria-pressed={tag === t}
              onClick={() => setTag(tag === t ? null : t)}
            >
              {t}
            </Button>
          ))}
          {hiddenCount > 0 && (
            <label className="ml-auto flex h-11 items-center gap-2 text-sm text-muted-foreground">
              Hidden
              <Switch checked={showHidden} onCheckedChange={setShowHidden} />
            </label>
          )}
        </div>
      )}

      {visible.length === 0 ? (
        <p className="py-16 text-center text-sm text-muted-foreground">Nothing matches.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {visible.map((p) => (
            <PrototypeCard key={p.slug} prototype={p} />
          ))}
        </div>
      )}
    </div>
  );
}
