"use client";

import { usePathname } from "next/navigation";
import { PageHeader } from "@/components/page-header";

type Entry = { folderId: string; folderTitle: string; title: string };

/** The prototypes layout is shared by every slug, so it reads the slug from the URL. */
export function PrototypeBack({ entries }: { entries: Record<string, Entry> }) {
  const slug = usePathname().split("/")[2] ?? "";
  const entry = entries[slug];
  if (!entry) return <PageHeader crumbs={[{ label: "Playground" }]} back={{ href: "/", label: "Playground" }} />;
  return (
    <PageHeader
      crumbs={[{ label: "Playground", href: "/" }, { label: entry.folderTitle, href: `/folders/${entry.folderId}` }, { label: entry.title }]}
      back={{ href: `/folders/${entry.folderId}`, label: entry.folderTitle }}
    />
  );
}
