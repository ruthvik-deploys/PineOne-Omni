import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import type { Prototype } from "@/lib/prototypes";
import { CARD_LINK } from "./card-styles";
import { Thumbnail } from "./thumbnail";

export function PrototypeCard({ prototype, variantOfTitle }: { prototype: Prototype; variantOfTitle?: string }) {
  const { meta } = prototype;
  return (
    <Link href={`/prototypes/${prototype.slug}`} className={CARD_LINK}>
      <Thumbnail prototype={prototype} />
      <div className="flex flex-col gap-1 p-4">
        <div className="flex items-center gap-2">
          <h4 className="truncate font-medium">{meta.title}</h4>
          {meta.public && <Badge variant="outline">Public</Badge>}
        </div>
        {variantOfTitle && <p className="text-sm text-muted-foreground">Variant of {variantOfTitle}</p>}
        <p className="line-clamp-2 text-sm text-muted-foreground">{meta.description}</p>
      </div>
    </Link>
  );
}
