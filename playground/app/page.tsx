import { LibraryHome } from "@/components/library/library-home";
import { ThemeToggle } from "@/components/theme-toggle";
import { getDocSummaries } from "@/lib/docs";
import { getAllPrototypes } from "@/lib/prototypes";

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 pt-6 pb-16">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Playground</h1>
        <ThemeToggle />
      </header>
      <LibraryHome prototypes={getAllPrototypes()} docs={getDocSummaries()} />
    </main>
  );
}
