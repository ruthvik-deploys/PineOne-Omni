"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";

const ORDER = ["dark", "light", "system"] as const;
const ICONS = { dark: Moon, light: Sun, system: Monitor };

/** Cycles dark → light → system. Icon renders after mount to avoid a hydration mismatch. */
export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  const current = (ORDER as readonly string[]).includes(theme ?? "") ? (theme as (typeof ORDER)[number]) : "dark";
  const next = ORDER[(ORDER.indexOf(current) + 1) % ORDER.length];
  const Icon = ICONS[current];

  return (
    <Button
      variant="ghost"
      size="icon"
      className="size-11"
      aria-label={mounted ? `Theme: ${current}. Switch to ${next}` : "Switch theme"}
      onClick={() => setTheme(next)}
    >
      {mounted ? <Icon /> : <span className="size-4" />}
    </Button>
  );
}
