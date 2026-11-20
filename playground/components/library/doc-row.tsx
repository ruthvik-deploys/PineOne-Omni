import Link from "next/link";
import type { DocSummary } from "@/lib/docs";
import { CARD_LINK } from "./card-styles";
import { FileIcon } from "./file-icon";
import { formatDocDate } from "./format";

/** A document in search results: a small file icon, then where the text matched. */
export function DocRow({ doc, snippet }: { doc: DocSummary; snippet?: string | null }) {
  return (
    <Link href={`/docs/${doc.slug}`} className={CARD_LINK}>
      <div className="flex gap-4 p-4">
        <div className="w-9 shrink-0 pt-0.5">
          <FileIcon title={doc.meta.title} excerpt="" compact />
        </div>
        <div className="flex min-w-0 flex-col gap-1">
          <h4 className="font-medium">{doc.meta.title}</h4>
          <p className="text-xs text-muted-foreground">
            {doc.meta.kind} · {formatDocDate(doc.meta.date)} · {doc.minutes} min read
          </p>
          <p className="line-clamp-2 text-sm text-muted-foreground">{snippet ?? doc.meta.description}</p>
        </div>
      </div>
    </Link>
  );
}
