"use client";

import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import type { Prototype } from "@/lib/prototypes";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { type Surface, collectTags, filterPrototypes, groupPrototypes } from "./filter";
import { PrototypeCard } from "./prototype-card";

export function Gallery({ prototypes }: { prototypes: Prototype[] }) {
  const [query, setQuery] = useState("");
  const [tag, setTag] = useState<string | null>(null);
  const [showHidden, setShowHidden] = useState(false);
  const [surface, setSurface] = useState<Surface | null>(null);

  const tags = useMemo(() => collectTags(prototypes, showHidden), [prototypes, showHidden]);
  const visible = useMemo(
    () => filterPrototypes(prototypes, { query, tag, showHidden, surface }),
    [prototypes, query, tag, showHidden, surface]
  );
  const sections = useMemo(() => groupPrototypes(visible), [visible]);
  const titles = useMemo(() => new Map(prototypes.map((p) => [p.slug, p.meta.title])), [prototypes]);
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

      {prototypes.some((p) => p.meta.surface) && (
        <ToggleGroup
          type="single"
          variant="outline"
          className="w-full"
          value={surface ?? "all"}
          onValueChange={(v) => v && setSurface(v === "all" ? null : (v as Surface))}
          spacing={0}
          aria-label="Show"
        >
          <ToggleGroupItem value="all" className="h-11 flex-1">All</ToggleGroupItem>
          <ToggleGroupItem value="web" className="h-11 flex-1">Web</ToggleGroupItem>
          <ToggleGroupItem value="mobile" className="h-11 flex-1">Mobile app</ToggleGroupItem>
        </ToggleGroup>
      )}

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
        <div className="flex flex-col gap-10 pt-2">
          {sections.map((section) => (
            <section key={section.id} aria-labelledby={`section-${section.id}`} className="flex flex-col gap-6">
              <h2 id={`section-${section.id}`} className="text-lg font-semibold">
                {section.title}
              </h2>
              {section.groups.map((group) => (
                <div key={group.title ?? "ungrouped"} className="flex flex-col gap-3">
                  {group.title && <h3 className="text-sm text-muted-foreground">{group.title}</h3>}
                  <div className="grid gap-4 sm:grid-cols-2">
                    {group.items.map((p) => (
                      <PrototypeCard
                        key={p.slug}
                        prototype={p}
                        variantOfTitle={p.meta.variantOf ? titles.get(p.meta.variantOf) : undefined}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
