import { PrototypeBack } from "@/components/prototype-back";
import { getFolder } from "@/lib/folders";
import { getAllPrototypes } from "@/lib/prototypes";

export default function PrototypesLayout({ children }: LayoutProps<"/prototypes">) {
  const entries = Object.fromEntries(
    getAllPrototypes().flatMap((p) => {
      const folder = getFolder(p.meta.folder);
      return folder ? [[p.slug, { folderId: folder.id, folderTitle: folder.title, title: p.meta.title }]] : [];
    })
  );
  return (
    <div className="flex min-h-dvh flex-col">
      <PrototypeBack entries={entries} />
      <div className="flex flex-1 flex-col">{children}</div>
    </div>
  );
}
