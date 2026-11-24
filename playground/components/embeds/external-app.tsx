import { ExternalLink } from "lucide-react";
import { PageTitle } from "@/components/page-title";
import { Button } from "@/components/ui/button";

type ExternalMeta = {
  title: string;
  description: string;
  surface?: string;
  group?: string;
  external: { url: string; note?: string };
};

const SURFACE_LABEL: Record<string, string> = { web: "Web", mobile: "Mobile app" };

/** Page for a prototype that is a separately deployed app too big to embed in a column. */
export function ExternalApp({ meta }: { meta: ExternalMeta }) {
  const eyebrow = [meta.group, meta.surface && SURFACE_LABEL[meta.surface]].filter(Boolean).join(" · ");
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 pt-10 pb-16">
      <div className="flex flex-col gap-1">
        {eyebrow && <p className="text-sm text-muted-foreground">{eyebrow}</p>}
        <PageTitle>{meta.title}</PageTitle>
      </div>
      <p className="text-muted-foreground">{meta.description}</p>
      {meta.external.note && <p className="text-sm text-muted-foreground">{meta.external.note}</p>}
      <div>
        <Button asChild className="h-11">
          <a href={meta.external.url} target="_blank" rel="noreferrer">
            <ExternalLink />
            Open
          </a>
        </Button>
      </div>
    </main>
  );
}
