/** Filter tags on the Docs folder: the channels a doc covers (from `topics`) and the personas it cites. Client-safe. */
export const DOC_TAGS = ["In-store", "Online", "Business owner", "Store manager", "Cashier", "Finance & ops", "Access admin"] as const;

export const PERSONA_TAGS: Record<string, string> = {
  P1: "Business owner",
  P2: "Store manager",
  P3: "Cashier",
  P4: "Finance & ops",
  P5: "Access admin",
};
