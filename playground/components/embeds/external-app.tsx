import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Page for a prototype that is a separately deployed app too big to embed in a column. */
export function ExternalApp({
  title,
  description,
  url,
  note,
}: {
  title: string;
  description: string;
  url: string;
  note?: string;
}) {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 pt-10 pb-16">
      <h1 className="text-2xl font-semibold">{title}</h1>
      <p className="text-muted-foreground">{description}</p>
      {note && <p className="text-sm text-muted-foreground">{note}</p>}
      <div>
        <Button asChild className="h-11">
          <a href={url} target="_blank" rel="noreferrer">
            <ExternalLink />
            Open
          </a>
        </Button>
      </div>
    </main>
  );
}
