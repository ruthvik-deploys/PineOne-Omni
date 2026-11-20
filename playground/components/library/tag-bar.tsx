"use client";

import { X } from "lucide-react";
import { useLayoutEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerFooter, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { cn } from "@/lib/utils";
import { fitCount } from "./tag-fit";

const GAP = 8;
const CHIP = "h-11 shrink-0 rounded-full px-4 sm:h-8 sm:px-3";
const SELECTED_EXTRA = 22; // the ✕ icon and its gap on a selected chip

type Group = { label: string; tags: readonly string[] };

/**
 * Tags on one line. Selected tags come first (with ✕ to remove), then as many others as fit,
 * then More, which opens a drawer with the rest. Picking a tag in the drawer moves it into the row;
 * removing it sends it back to the drawer.
 */
export function TagBar({ groups, selected, onToggle }: { groups: readonly Group[]; selected: string[]; onToggle: (tag: string) => void }) {
  const all = groups.flatMap((g) => g.tags);
  const ordered = [...all.filter((t) => selected.includes(t)), ...all.filter((t) => !selected.includes(t))];
  const rowRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState(ordered.length);
  const [open, setOpen] = useState(false);
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
  const inDrawer = ordered.slice(fit);
  const hiddenSelected = inDrawer.filter((t) => selected.includes(t)).length;

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
        {inDrawer.length > 0 && (
          <Button variant="ghost" className={cn(CHIP, "text-muted-foreground")} onClick={() => setOpen(true)}>
            More{hiddenSelected > 0 ? ` · ${hiddenSelected} on` : ""}
          </Button>
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

      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent>
          <div className="mx-auto w-full max-w-2xl">
            <DrawerHeader className="text-left">
              <DrawerTitle>More tags</DrawerTitle>
            </DrawerHeader>
            <div className="flex flex-col gap-5 px-4 pb-2">
              {groups.map((g) => {
                const tags = g.tags.filter((t) => inDrawer.includes(t));
                if (!tags.length) return null;
                return (
                  <section key={g.label} className="flex flex-col gap-2">
                    <h3 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">{g.label}</h3>
                    <div className="flex flex-wrap gap-2">
                      {tags.map((t) => {
                        const on = selected.includes(t);
                        return (
                          <Button key={t} variant={on ? "secondary" : "outline"} className={CHIP} aria-pressed={on} onClick={() => onToggle(t)}>
                            {t}
                            {on && <X aria-hidden className="size-3.5 text-muted-foreground" />}
                          </Button>
                        );
                      })}
                    </div>
                  </section>
                );
              })}
              {inDrawer.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">All tags are on the list.</p>}
            </div>
            <DrawerFooter className="pb-[max(1rem,env(safe-area-inset-bottom))]">
              <Button className="h-11" onClick={() => setOpen(false)}>
                Done
              </Button>
            </DrawerFooter>
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
