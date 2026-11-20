import Link from "next/link";
import type { DocSummary } from "@/lib/docs";
import { CARD_LINK } from "./card-styles";
import { formatDocDate } from "./format";

/** A document in the Docs folder or in search results. `snippet` shows where the text matched. */
export function DocRow({ doc, snippet }: { doc: DocSummary; snippet?: string | null }) {
  return (
    <Link href={`/docs/${doc.slug}`} className={CARD_LINK}>
      <div className="flex flex-col gap-1 p-4">
        <p className="text-sm text-muted-foreground">
          {doc.meta.kind} · {formatDocDate(doc.meta.date)}
        </p>
        <h4 className="font-medium">{doc.meta.title}</h4>
        <p className="line-clamp-2 text-sm text-muted-foreground">{snippet ?? doc.meta.description}</p>
      </div>
    </Link>
  );
}
