import { notFound } from "next/navigation";

// Every real prototype has its own static folder next to this one, which takes precedence.
// This catch-all only exists so a mistyped or deleted slug gets a clean 404.
export default function UnknownPrototype() {
  notFound();
}
