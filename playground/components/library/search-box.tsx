"use client";

import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

export function SearchBox({ value, onChange, label = "Search prototypes and docs" }: { value: string; onChange: (value: string) => void; label?: string }) {
  return (
    <div className="relative">
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="search"
        placeholder={label}
        aria-label={label}
        className="h-11 pl-9"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
