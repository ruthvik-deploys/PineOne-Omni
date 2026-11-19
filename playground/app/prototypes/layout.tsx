import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";

export default function PrototypesLayout({ children }: LayoutProps<"/prototypes">) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex items-center justify-between px-2 pt-2">
        <Button asChild variant="ghost" className="h-11 px-3">
          <Link href="/" aria-label="Back to playground">
            <ArrowLeft />
            <span className="hidden sm:inline">Playground</span>
          </Link>
        </Button>
        <ThemeToggle />
      </header>
      <div className="flex flex-1 flex-col">{children}</div>
    </div>
  );
}
