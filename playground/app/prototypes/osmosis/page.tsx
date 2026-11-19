import { ExternalApp } from "@/components/embeds/external-app";
import meta from "./metadata.json";

export default function OsmosisPage() {
  return <ExternalApp meta={meta} />;
}
