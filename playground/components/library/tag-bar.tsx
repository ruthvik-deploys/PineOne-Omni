"use client";

import { X } from "lucide-react";
import { useLayoutEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { fitCount } from "./tag-fit";

const GAP = 8;
const CHIP = "h-11 shrink-0 rounded-full px-4 sm:h-8 sm:px-3";
const SELECTED_EXTRA = 22; // the ✕ icon and its gap on a selected chip

type Group = { label: string; tags: readonly string[] };

/**
 * Tags on one line. Selected tags come first (with ✕ to remove), then as many others as fit,
 * then More, a menu with the rest. Picking a tag in the menu moves it into the row;
 * removing it sends it back to the menu.
 */
export function TagBar({ groups, selected, onToggle }: { groups: readonly Group[]; selected: string[]; onToggle: (tag: string) => void }) {
  const all = groups.flatMap((g) => g.tags);
  const ordered = [...all.filter((t) => selected.includes(t)), ...all.filter((t) => !selected.includes(t))];
  const rowRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState(ordered.length);
  const key = ordered.join("|");

  useLayoutEffect(() => {
    const row = rowRef.current;
    const measure = measureRef.current;
    if (!row || !measure) return;
    const update = () => {
      const chips = [...measure.querySelectorAll<HTMLElement>("[data-tag]")];
      const width = (t: string) => (chips.find((c) => c.dataset.tag === t)?.offsetWidth ?? 0) + (selected.includes(t) ? SELECTED_EXTRA : 0);
      const more = measure.querySelector<HTMLElement>("[data-more]")?.offsetWidth ?? 0;
      setFit(fitCount(key.split("|").map(width), row.clientWidth, more, GAP));
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(row);
    return () => observer.disconnect();
  }, [key, selected]);

  const inRow = ordered.slice(0, fit);
  const inMenu = ordered.slice(fit);
  const hiddenSelected = inMenu.filter((t) => selected.includes(t)).length;

  return (
    <>
      <div ref={rowRef} className="relative flex gap-2 overflow-hidden" role="group" aria-label="Filter by tag">
        {inRow.map((t) => {
          const on = selected.includes(t);
          return (
            <Button key={t} variant={on ? "secondary" : "outline"} className={CHIP} aria-pressed={on} onClick={() => onToggle(t)}>
              {t}
              {on && <X aria-hidden className="size-3.5 text-muted-foreground" />}
            </Button>
          );
        })}
        {inMenu.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className={cn(CHIP, "text-muted-foreground")}>
                More{hiddenSelected > 0 ? ` · ${hiddenSelected} on` : ""}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-48">
              {groups.map((g, i) => {
                const tags = g.tags.filter((t) => inMenu.includes(t));
                if (!tags.length) return null;
                return (
                  <DropdownMenuGroup key={g.label}>
                    {i > 0 && groups.slice(0, i).some((p) => p.tags.some((t) => inMenu.includes(t))) && <DropdownMenuSeparator />}
                    <DropdownMenuLabel>{g.label}</DropdownMenuLabel>
                    {tags.map((t) => (
                      <DropdownMenuCheckboxItem
                        key={t}
                        className="min-h-11 sm:min-h-8"
                        checked={selected.includes(t)}
                        // Picking moves the tag into the row; the menu closes so you see where it went.
                        onCheckedChange={() => onToggle(t)}
                      >
                        {t}
                      </DropdownMenuCheckboxItem>
                    ))}
                  </DropdownMenuGroup>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Off-screen copies, only to measure chip widths. */}
        <div ref={measureRef} aria-hidden className="invisible absolute top-0 left-0 flex gap-2">
          {all.map((t) => (
            <span key={t} data-tag={t} className={cn("inline-flex items-center border text-sm font-medium whitespace-nowrap", CHIP)}>
              {t}
            </span>
          ))}
          <span data-more className={cn("inline-flex items-center text-sm font-medium whitespace-nowrap", CHIP)}>
            More · 9 on
          </span>
        </div>
      </div>

    </>
  );
}
