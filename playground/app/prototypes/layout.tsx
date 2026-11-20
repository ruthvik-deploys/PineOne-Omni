import { PrototypeBack } from "@/components/prototype-back";
import { getFolder } from "@/lib/folders";
import { getAllPrototypes } from "@/lib/prototypes";

export default function PrototypesLayout({ children }: LayoutProps<"/prototypes">) {
  const folders = Object.fromEntries(
    getAllPrototypes().flatMap((p) => {
      const folder = getFolder(p.meta.folder);
      return folder ? [[p.slug, { id: folder.id, title: folder.title }]] : [];
    })
  );
  return (
    <div className="flex min-h-dvh flex-col">
      <PrototypeBack folders={folders} />
      <div className="flex flex-1 flex-col">{children}</div>
    </div>
  );
}
