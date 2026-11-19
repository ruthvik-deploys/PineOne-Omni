import { ExternalApp } from "@/components/embeds/external-app";
import meta from "./metadata.json";

export default function PineOneWebPage() {
  return <ExternalApp meta={meta} />;
}
