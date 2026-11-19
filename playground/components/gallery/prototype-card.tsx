import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import type { Prototype } from "@/lib/prototypes";
import { Thumbnail } from "./thumbnail";

export function PrototypeCard({ prototype }: { prototype: Prototype }) {
  const { meta } = prototype;
  return (
    <Link
      href={`/prototypes/${prototype.slug}`}
      className="group block overflow-hidden rounded-xl bg-card ring-1 ring-border transition-shadow duration-200 ease-out hover:ring-foreground/20 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none active:ring-foreground/20"
    >
      <Thumbnail prototype={prototype} />
      <div className="flex flex-col gap-1 p-4">
        <div className="flex items-center gap-2">
          <h4 className="truncate font-medium">{meta.title}</h4>
          {meta.public && <Badge variant="outline">Public</Badge>}
          {meta.hidden && <Badge variant="outline">Hidden</Badge>}
        </div>
        <p className="line-clamp-2 text-sm text-muted-foreground">{meta.description}</p>
      </div>
    </Link>
  );
}
