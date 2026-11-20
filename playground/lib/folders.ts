/**
 * The playground's top-level folders, in the order the home page shows them.
 * Every prototype names one in `metadata.json → folder`; the registry rejects anything else.
 * `docs` holds the research documents in `docs/*.md`, not prototypes.
 */
export const FOLDERS = [
  { id: "docs", title: "Docs", description: "Merchant research, user journeys and other reference documents" },
  { id: "design-system", title: "Design system", description: "Storybooks and design system docs for web and the app" },
  { id: "pine-one", title: "Pine One", description: "Pine One web dashboard" },
  { id: "pine-one-app", title: "Pine One app", description: "Pine One mobile app and its flows" },
  { id: "pine-omni", title: "Pine Omni", description: "Pine Omni web pages and agents" },
  { id: "pine-omni-app", title: "Pine Omni app", description: "Pine Omni mobile app" },
  { id: "onboarding", title: "Onboarding", description: "Sign-up, KYC and onboarding flows, with other designs per step" },
] as const;

export type FolderId = (typeof FOLDERS)[number]["id"];
export type PrototypeFolderId = Exclude<FolderId, "docs">;
export type Folder = (typeof FOLDERS)[number];

export function getFolder(id: string): Folder | undefined {
  return FOLDERS.find((f) => f.id === id);
}
