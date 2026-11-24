import Link from "next/link";
import type { DocSummary } from "@/lib/docs";
import { FileIcon } from "./file-icon";

/** A document in the Docs folder, Finder icon-view style: the file, its name, then kind and length. */
export function DocTile({ doc }: { doc: DocSummary }) {
  return (
    <Link
      href={`/docs/${doc.slug}`}
      className="group flex flex-col items-center gap-2.5 rounded-xl p-2 text-center transition-colors duration-150 ease-out hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none active:bg-muted"
    >
      <div className="w-full max-w-28 transition-transform duration-200 ease-out group-hover:-translate-y-0.5 motion-reduce:transition-none">
        <FileIcon title={doc.meta.title} excerpt={doc.text.slice(0, 420)} />
      </div>
      <div className="flex flex-col gap-0.5">
        <h3 className="line-clamp-3 text-sm leading-tight font-medium text-balance sm:line-clamp-2">{doc.meta.title}</h3>
        <p className="text-xs text-muted-foreground">{doc.minutes} min read</p>
      </div>
    </Link>
  );
}
