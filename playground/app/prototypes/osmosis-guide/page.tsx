import { ExternalApp } from "@/components/embeds/external-app";
import meta from "./metadata.json";

export default function OsmosisGuidePage() {
  return <ExternalApp meta={meta} />;
}
