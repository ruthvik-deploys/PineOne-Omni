import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ThemeToggle } from "@/components/theme-toggle";
import { getAllPrototypes, getPublicPrototype } from "@/lib/prototypes";
import { SITE_URL } from "@/lib/site-url";

// Only public prototypes are built; any other slug (private, hidden or unknown) is a plain 404,
// never a login redirect, so private names don't leak.
export const dynamicParams = false;

export function generateStaticParams() {
  return getAllPrototypes()
    .filter((p) => p.meta.public)
    .map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps<"/p/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const entry = getPublicPrototype(slug);
  if (!entry) return {};
  const { meta, assets } = entry;
  const image = assets.ogImage ? `/og/${slug}.png` : undefined;
  const video = assets.ogVideo ? new URL(`/og/${slug}.${assets.ogVideo}`, SITE_URL).href : undefined;
  return {
    title: meta.title,
    description: meta.description,
    openGraph: {
      title: meta.title,
      description: meta.description,
      type: video ? "video.other" : "website",
      url: `/p/${slug}`,
      images: image ? [{ url: image, width: 1200, height: 630 }] : undefined,
      videos: video ? [{ url: video, width: 1200, height: 630, type: `video/${assets.ogVideo}` }] : undefined,
    },
    twitter: { card: "summary_large_image", title: meta.title, description: meta.description, images: image },
  };
}

export default async function PublicPrototype({ params }: PageProps<"/p/[slug]">) {
  const { slug } = await params;
  const entry = getPublicPrototype(slug);
  if (!entry) notFound();
  const { default: Prototype } = await entry.load();
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex justify-end px-2 pt-2">
        <ThemeToggle />
      </header>
      <div className="flex flex-1 flex-col">
        <Prototype />
      </div>
    </div>
  );
}
