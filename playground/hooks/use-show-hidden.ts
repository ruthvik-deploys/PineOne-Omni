"use client";

import { useCallback, useSyncExternalStore } from "react";
import { readStored, writeStored } from "@/lib/storage";

// One switch on the home page decides whether hidden prototypes show anywhere (counts, folders, search).
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function read() {
  return readStored<boolean>("library", "show-hidden", false) === true;
}

export function useShowHidden() {
  const showHidden = useSyncExternalStore(subscribe, read, () => false);
  const setShowHidden = useCallback((value: boolean) => {
    writeStored("library", "show-hidden", value);
    listeners.forEach((l) => l());
  }, []);
  return [showHidden, setShowHidden] as const;
}
