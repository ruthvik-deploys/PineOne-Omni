"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import type { Reference } from "@/lib/references";

/**
 * A cross-reference inside a document. Hover (or keyboard focus) shows what it means;
 * tap or click goes to where it's defined. Dotted underline so it reads as a reference, not a web link.
 */
export function RefLink({ reference, href, children }: { reference: Reference; href: string; children: ReactNode }) {
  const isDoc = reference.key.startsWith("doc:");
  return (
    <HoverCard openDelay={120} closeDelay={80}>
      <HoverCardTrigger asChild>
        <Link
          href={href}
          className="rounded-sm font-medium text-foreground underline decoration-muted-foreground/60 decoration-dotted decoration-[1.5px] underline-offset-4 transition-colors duration-150 ease-out hover:bg-muted hover:decoration-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none active:bg-muted"
        >
          {children}
        </Link>
      </HoverCardTrigger>
      <HoverCardContent side="top" align="start" className="w-80 p-4">
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">{isDoc ? "Document" : reference.label}</p>
          <p className="leading-snug font-semibold">{reference.name}</p>
          <p className="text-sm leading-relaxed text-muted-foreground">{reference.definition}</p>
          {!isDoc && <p className="border-t border-border pt-2 text-xs text-muted-foreground">Defined in {reference.docTitle}</p>}
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}
