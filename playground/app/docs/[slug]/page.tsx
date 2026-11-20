import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { formatDocDate } from "@/components/library/format";
import { Markdown } from "@/components/library/markdown";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { getAllDocs, getDoc } from "@/lib/docs";

export const dynamicParams = false;

export function generateStaticParams() {
  return getAllDocs().map((d) => ({ slug: d.slug }));
}

export async function generateMetadata({ params }: PageProps<"/docs/[slug]">): Promise<Metadata> {
  const doc = getDoc((await params).slug);
  return doc ? { title: doc.meta.title, description: doc.meta.description } : {};
}

export default async function DocPage({ params }: PageProps<"/docs/[slug]">) {
  const doc = getDoc((await params).slug);
  if (!doc) notFound();
  const { meta, body } = doc;
  return (
    <div className="flex min-h-dvh flex-col">
      <PageHeader href="/folders/docs" label="Docs" />
      <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 pt-4 pb-16">
        <div className="flex flex-col gap-2">
          <p className="text-sm text-muted-foreground">
            {meta.kind} · {formatDocDate(meta.date)}
          </p>
          <h1 className="text-2xl font-semibold">{meta.title}</h1>
          <p className="text-muted-foreground">{meta.description}</p>
          {meta.topics.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {meta.topics.map((t) => (
                <Badge key={t} variant="outline">
                  {t}
                </Badge>
              ))}
            </div>
          )}
        </div>
        <article>
          <Markdown>{body}</Markdown>
        </article>
        {meta.source && <p className="text-sm text-muted-foreground">Converted from {meta.source}</p>}
      </main>
    </div>
  );
}
