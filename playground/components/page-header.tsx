import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";

/** Back link (label shows from `sm:` up) and the theme toggle, for every page below home. */
export function PageHeader({ href, label }: { href: string; label: string }) {
  return (
    <header className="flex items-center justify-between px-2 pt-2">
      <Button asChild variant="ghost" className="h-11 px-3">
        <Link href={href} aria-label={`Back to ${label}`}>
          <ArrowLeft />
          <span className="hidden sm:inline">{label}</span>
        </Link>
      </Button>
      <ThemeToggle />
    </header>
  );
}
