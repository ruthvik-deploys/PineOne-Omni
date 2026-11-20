"use client";

import { usePathname } from "next/navigation";
import { PageHeader } from "@/components/page-header";

/** The prototypes layout is shared by every slug, so it picks the folder to go back to from the URL. */
export function PrototypeBack({ folders }: { folders: Record<string, { id: string; title: string }> }) {
  const slug = usePathname().split("/")[2] ?? "";
  const folder = folders[slug];
  return folder ? <PageHeader href={`/folders/${folder.id}`} label={folder.title} /> : <PageHeader href="/" label="Playground" />;
}
