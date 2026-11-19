"use client";

import { SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";

/**
 * Subject + control panel. Desktop (lg+): panel in a side column that never covers the subject.
 * Mobile: a Controls button opens the same panel in a bottom sheet.
 */
export function ControlsLayout({ panel, children }: { panel: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col lg:flex-row">
      <div className="relative flex min-h-[60dvh] flex-1 flex-col">{children}</div>

      <aside className="hidden w-80 shrink-0 border-l border-border p-6 lg:block">
        <div className="sticky top-6">{panel}</div>
      </aside>

      <Drawer>
        <DrawerTrigger asChild>
          <Button
            variant="secondary"
            className="fixed right-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-40 size-11 shadow-md sm:w-auto sm:px-4 lg:hidden"
            aria-label="Controls"
          >
            <SlidersHorizontal />
            <span className="hidden sm:inline">Controls</span>
          </Button>
        </DrawerTrigger>
        <DrawerContent>
          <DrawerHeader className="sr-only">
            <DrawerTitle>Controls</DrawerTitle>
            <DrawerDescription>Tune the prototype</DrawerDescription>
          </DrawerHeader>
          <div className="overflow-y-auto px-4 pt-2 pb-[max(1.5rem,env(safe-area-inset-bottom))]">{panel}</div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
