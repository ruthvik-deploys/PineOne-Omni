import type { ComponentType } from "react";
import type { PrototypeFolderId } from "./folders";
import { registry } from "./prototype-registry.generated";

export type PrototypeMeta = {
  title: string;
  description: string;
  tags: string[];
  /** Home-page folder the prototype lives in (see lib/folders.ts). */
  folder: PrototypeFolderId;
  createdAt: string;
  updatedAt: string;
  hidden: boolean;
  public: boolean;
  /** Web or mobile. Splits a folder into Web / Mobile app when it holds both. */
  surface?: "web" | "mobile";
  /** Slug of the prototype this is a version or experiment of. The card shows "Variant of …". */
  variantOf?: string;
  /** Sub-heading inside the folder when the folder holds more than one group (e.g. "Osmosis agents"). */
  group?: string;
  /** Optional: the prototype is a separately deployed app. Thumbnails capture this URL when `embed` is "none". */
  external?: {
    url: string | null;
    embed: "phone" | "none";
    /** One line shown under the description, e.g. how to get past the app's own sign-in. */
    note?: string;
    /** localStorage entries the thumbnail script sets on the external origin before capturing (e.g. a mock sign-in). */
    seedLocalStorage?: Record<string, string>;
  };
};

export type RegistryEntry = {
  slug: string;
  meta: PrototypeMeta;
  assets: { thumbnails: boolean; ogImage: boolean; ogVideo: "mp4" | "webm" | null };
  load: () => Promise<{ default: ComponentType }>;
};

export type Prototype = Omit<RegistryEntry, "load">;

function byUpdatedDesc(a: Prototype, b: Prototype) {
  return Date.parse(b.meta.updatedAt) - Date.parse(a.meta.updatedAt);
}

/** Every prototype, newest first. Safe to pass to client components. */
export function getAllPrototypes(): Prototype[] {
  return registry.map(({ slug, meta, assets }) => ({ slug, meta, assets })).sort(byUpdatedDesc);
}

export function getPrototype(slug: string): RegistryEntry | undefined {
  return registry.find((p) => p.slug === slug);
}

/** Only prototypes explicitly flagged `"public": true`. Anything else must 404. */
export function getPublicPrototype(slug: string): RegistryEntry | undefined {
  const entry = getPrototype(slug);
  return entry?.meta.public ? entry : undefined;
}
