"use client";

import { ExternalLink } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

/**
 * Shows a separately deployed mobile web app. On phones it fills the screen (a frame inside a phone is
 * pointless); from `sm` up it sits in a 390×844 device frame. Only use this on a prototype's own page,
 * never in gallery cards.
 */
export function PhoneFrame({ src, title }: { src: string; title: string }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <div className="flex flex-1 flex-col items-center gap-3 sm:px-4 sm:pb-8">
      <div className="relative flex w-full flex-1 overflow-hidden bg-muted sm:h-[844px] sm:max-h-[calc(100dvh-8rem)] sm:w-[390px] sm:flex-none sm:rounded-[2.5rem] sm:ring-8 sm:ring-border">
        {!loaded && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Spinner />
          </div>
        )}
        <iframe
          src={src}
          title={title}
          onLoad={() => setLoaded(true)}
          className="size-full min-h-[calc(100dvh-3.5rem)] border-0 sm:min-h-0"
          allow="clipboard-write"
        />
      </div>
      <Button asChild variant="ghost" className="hidden h-11 sm:inline-flex">
        <a href={src} target="_blank" rel="noreferrer">
          <ExternalLink />
          Open full screen
        </a>
      </Button>
    </div>
  );
}
