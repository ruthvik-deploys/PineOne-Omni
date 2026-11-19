import { ExternalApp } from "@/components/embeds/external-app";
import meta from "./metadata.json";

export default function OsmosisSnapshotAgentPage() {
  return <ExternalApp title={meta.title} description={meta.description} url={meta.external.url} note={meta.external.note} />;
}
