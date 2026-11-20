import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DocsBrowser } from "@/components/library/docs-browser";
import { FolderPrototypes } from "@/components/library/folder-prototypes";
import { PageHeader } from "@/components/page-header";
import { getDocSummaries } from "@/lib/docs";
import { FOLDERS, getFolder } from "@/lib/folders";
import { getAllPrototypes } from "@/lib/prototypes";

export const dynamicParams = false;

export function generateStaticParams() {
  return FOLDERS.map((f) => ({ folder: f.id }));
}

export async function generateMetadata({ params }: PageProps<"/folders/[folder]">): Promise<Metadata> {
  const folder = getFolder((await params).folder);
  return folder ? { title: folder.title } : {};
}

export default async function FolderPage({ params }: PageProps<"/folders/[folder]">) {
  const folder = getFolder((await params).folder);
  if (!folder) notFound();
  const all = getAllPrototypes();
  const docs = folder.id === "docs" ? getDocSummaries() : [];
  return (
    <div className="flex min-h-dvh flex-col">
      <PageHeader crumbs={[{ label: "Playground", href: "/" }, { label: folder.title }]} back={{ href: "/", label: "Playground" }} />
      <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 pt-6 pb-16">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold">{folder.title}</h1>
          <p className="text-muted-foreground">{folder.description}</p>
        </div>
        {folder.id === "docs" ? (
          <DocsBrowser docs={docs} />
        ) : (
          <FolderPrototypes
            prototypes={all.filter((p) => p.meta.folder === folder.id)}
            titles={Object.fromEntries(all.map((p) => [p.slug, p.meta.title]))}
          />
        )}
      </main>
    </div>
  );
}
