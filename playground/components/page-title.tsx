import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** The one title style for every page (home, folders, docs, prototypes): the document H1 size and weight. */
export const PAGE_TITLE = "text-3xl leading-[1.15] font-semibold tracking-tight text-balance sm:text-[2.5rem]";

export function PageTitle({ children, className }: { children: ReactNode; className?: string }) {
  return <h1 className={cn(PAGE_TITLE, className)}>{children}</h1>;
}
