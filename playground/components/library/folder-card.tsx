import Link from "next/link";
import type { DocSummary } from "@/lib/docs";
import type { Folder } from "@/lib/folders";
import type { Prototype } from "@/lib/prototypes";
import { CARD_LINK } from "./card-styles";
import { plural } from "./format";
import { Thumbnail } from "./thumbnail";

const COVER = "aspect-[16/10] bg-muted";

/**
 * A folder on the home page: a cover (the four newest thumbnails, or the newest document titles
 * for Docs), then its name and how many things are inside.
 */
export function FolderCard({ folder, prototypes, docs }: { folder: Folder; prototypes: Prototype[]; docs: DocSummary[] }) {
  const isDocs = folder.id === "docs";
  const count = isDocs ? plural(docs.length, "document") : plural(prototypes.length, "prototype");
  return (
    <Link href={`/folders/${folder.id}`} className={CARD_LINK}>
      {isDocs ? <DocsCover docs={docs} /> : <Mosaic prototypes={prototypes.filter((p) => p.assets.thumbnails).slice(0, 4)} />}
      <div className="flex flex-col gap-0.5 p-3 sm:gap-1 sm:p-4">
        <h3 className="font-medium">{folder.title}</h3>
        <p className="text-sm text-muted-foreground">{count}</p>
      </div>
    </Link>
  );
}

function Mosaic({ prototypes }: { prototypes: Prototype[] }) {
  if (prototypes.length === 0) return <div className={COVER} />;
  if (prototypes.length === 1) return <Thumbnail prototype={prototypes[0]} />;
  return (
    <div className={`grid grid-cols-2 gap-px ${prototypes.length === 2 ? "grid-rows-1" : "grid-rows-2"} ${COVER}`}>
      {prototypes.map((p) => (
        <Thumbnail key={p.slug} prototype={p} className="aspect-auto h-full min-h-0" />
      ))}
      {prototypes.length === 3 && <div className="bg-muted" />}
    </div>
  );
}

function DocsCover({ docs }: { docs: DocSummary[] }) {
  return (
    <div className={`flex flex-col justify-end gap-1.5 p-3 sm:gap-2 sm:p-4 ${COVER}`}>
      {docs.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nothing here yet</p>
      ) : (
        docs.slice(0, 3).map((d) => (
          <p key={d.slug} className="truncate rounded-md bg-card px-2 py-1 text-xs ring-1 ring-border sm:px-3 sm:py-2 sm:text-sm">
            {d.meta.title}
          </p>
        ))
      )}
    </div>
  );
}
