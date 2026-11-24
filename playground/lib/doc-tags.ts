/** Filter tags on the Docs folder: the channels a doc covers (from `topics`) and the personas it cites. Client-safe. */
export const TAG_GROUPS = [
  { label: "Channel", tags: ["In-store", "Online"] },
  { label: "Persona", tags: ["Business owner", "Store manager", "Cashier", "Finance & ops", "Access admin"] },
] as const;

export const DOC_TAGS = TAG_GROUPS.flatMap((g) => g.tags);

export const PERSONA_TAGS: Record<string, string> = {
  P1: "Business owner",
  P2: "Store manager",
  P3: "Cashier",
  P4: "Finance & ops",
  P5: "Access admin",
};
