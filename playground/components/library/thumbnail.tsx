import type { Prototype } from "@/lib/prototypes";
import { cn } from "@/lib/utils";

/**
 * Static light + dark screenshots, swapped with CSS (`dark:`) so there is no flash on load.
 * Never replace this with a live iframe: one booted app per card crashes mobile browsers.
 */
export function Thumbnail({ prototype, className }: { prototype: Prototype; className?: string }) {
  const version = Date.parse(prototype.meta.updatedAt);
  if (!prototype.assets.thumbnails) {
    return (
      <div className={cn("flex aspect-[16/10] items-center justify-center bg-muted text-sm text-muted-foreground", className)}>
        No preview yet
      </div>
    );
  }
  const src = (mode: "light" | "dark") => `/thumbnails/${prototype.slug}-${mode}.png?v=${version}`;
  return (
    <div className={cn("aspect-[16/10] overflow-hidden bg-muted", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src("light")} alt="" loading="lazy" decoding="async" className="size-full object-cover object-top dark:hidden" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src("dark")} alt="" loading="lazy" decoding="async" className="hidden size-full object-cover object-top dark:block" />
    </div>
  );
}
