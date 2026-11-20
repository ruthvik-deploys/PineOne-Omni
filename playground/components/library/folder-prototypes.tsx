"use client";

import { useMemo } from "react";
import type { Prototype } from "@/lib/prototypes";
import { PrototypeCard } from "./prototype-card";
import { sectionsFor } from "./search";

/** A prototype folder's contents, split into sections. */
export function FolderPrototypes({ prototypes, titles }: { prototypes: Prototype[]; titles: Record<string, string> }) {
  const sections = useMemo(() => sectionsFor(prototypes), [prototypes]);

  return (
    <div className="flex flex-col gap-6">
      {sections.every((s) => s.items.length === 0) ? (
        <p className="py-16 text-center text-sm text-muted-foreground">Nothing here yet.</p>
      ) : (
        sections.map((section) => (
          <section key={section.title ?? "all"} className="flex flex-col gap-3">
            {section.title && <h2 className="text-sm text-muted-foreground">{section.title}</h2>}
            <div className="grid gap-4 sm:grid-cols-2">
              {section.items.map((p) => (
                <PrototypeCard key={p.slug} prototype={p} variantOfTitle={p.meta.variantOf ? titles[p.meta.variantOf] : undefined} />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
