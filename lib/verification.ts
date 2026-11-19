/**
 * Business verification is done once and shared by every product. It's made of
 * modules; each product lists the modules it needs, so adding a product only
 * asks for what's still missing. Any module except identity and agreement can
 * be left for later or handed to someone else, so one missing document never
 * blocks the rest.
 */
import {
  BUSINESS_TYPE_LABEL,
  businessTypeFromPan,
  canContinueOnline,
  createOnlineProfile,
  documentsFor,
  ONLINE_STEPS,
  type BusinessType,
  type OnlineProfile,
  type OnlineStepId,
} from "./online-onboarding.ts"
import type { GettingStartedState, ProductId } from "./getting-started.ts"

export type ModuleId = "identity" | "online-presence" | "documents" | "bank" | "owners" | "signatory" | "agreement"

export type ModuleSpec = {
  id: ModuleId
  label: string
  /** Short noun used in "2 things left: …" lists. */
  short: string
  steps: OnlineStepId[]
  canDefer: boolean
  /** Who usually has this, when the person onboarding doesn't. */
  delegateTo?: string
  time: string
}

export const MODULES: ModuleSpec[] = [
  { id: "identity", label: "Business identity", short: "PAN and GST", steps: ["pan", "gst"], canDefer: false, time: "2 min" },
  { id: "online-presence", label: "Website or app", short: "Website or app", steps: ["website"], canDefer: true, time: "1 min" },
  { id: "documents", label: "Business documents", short: "Business documents", steps: ["documents"], canDefer: true, delegateTo: "your accountant or company secretary", time: "3 min" },
  { id: "bank", label: "Settlement bank account", short: "Bank account", steps: ["bank"], canDefer: true, delegateTo: "your accountant", time: "2 min" },
  { id: "owners", label: "Business owners", short: "Business owners", steps: ["owners"], canDefer: true, time: "2 min" },
  { id: "signatory", label: "Authorised signatory and KYC", short: "Signatory KYC", steps: ["signatory", "political-exposure", "identity", "video-kyc"], canDefer: true, delegateTo: "the authorised signatory", time: "5 min" },
  { id: "agreement", label: "Review and sign", short: "Agreement", steps: ["review", "agreement"], canDefer: false, time: "2 min" },
]

export const MODULE_BY_ID = Object.fromEntries(MODULES.map((module) => [module.id, module])) as Record<ModuleId, ModuleSpec>

export const PRODUCT_REQUIREMENTS: Record<ProductId, ModuleId[]> = {
  "in-store": ["identity", "bank", "signatory", "agreement"],
  "payment-links": ["identity", "bank", "owners", "signatory", "agreement"],
  checkout: ["identity", "online-presence", "documents", "bank", "owners", "signatory", "agreement"],
}

export type VerificationState = {
  /** Step the merchant was last on inside the verification flow. */
  current: OnlineStepId
  deferred: ModuleId[]
  delegated: Partial<Record<ModuleId, { name: string; contact: string; sentAt: string }>>
  /** Modules sent for review and not yet approved. */
  inReview: ModuleId[]
  approved: ModuleId[]
  /** Products whose agreement addendum has been accepted. */
  agreedProducts: ProductId[]
  submittedAt: string | null
  /** The page verification was opened from — every exit goes back there. */
  returnTo?: string
}

export const INITIAL_VERIFICATION: VerificationState = {
  current: "pan", deferred: [], delegated: {}, inReview: [], approved: [], agreedProducts: [], submittedAt: null,
}

export function profileOf(state: GettingStartedState): OnlineProfile {
  return createOnlineProfile(state.onlineProfile ?? {})
}

/** Products the merchant has chosen: started, or brought in by their signup source. */
export function chosenProducts(state: GettingStartedState): ProductId[] {
  const ids: ProductId[] = ["in-store", "payment-links", "checkout"]
  const started = (id: ProductId) => state.journeys[id].stage !== "intro" || (id === "in-store" && state.cart.length > 0)
  if (state.selected) return ids.filter((id) => state.selected!.includes(id) || started(id))
  return ids.filter((id) => started(id) || state.source?.product === id)
}

export function requiredModules(products: ProductId[]): ModuleId[] {
  const needed = new Set(products.flatMap((id) => PRODUCT_REQUIREMENTS[id]))
  return MODULES.map((module) => module.id).filter((id) => needed.has(id))
}

export function moduleComplete(id: ModuleId, state: GettingStartedState, products = chosenProducts(state)): boolean {
  const profile = profileOf(state)
  if (id === "agreement") return products.every((product) => state.verification.agreedProducts.includes(product))
  return MODULE_BY_ID[id].steps.every((step) => canContinueOnline(step, profile))
}

export type ModuleStatus = "approved" | "in-review" | "done" | "delegated" | "later" | "todo"

export function moduleStatus(id: ModuleId, state: GettingStartedState, products = chosenProducts(state)): ModuleStatus {
  const v = state.verification
  if (v.approved.includes(id) && (id !== "agreement" || moduleComplete(id, state, products))) return "approved"
  if (v.inReview.includes(id) && (id !== "agreement" || moduleComplete(id, state, products))) return "in-review"
  if (moduleComplete(id, state, products)) return "done"
  if (v.delegated[id]) return "delegated"
  if (v.deferred.includes(id)) return "later"
  return "todo"
}

export const STATUS_LABEL: Record<ModuleStatus, string> = {
  approved: "Verified", "in-review": "In review", done: "Done", delegated: "With someone else", later: "Added later", todo: "To do",
}

/** Required modules that still need the merchant (or a delegate) to act. */
export function outstandingModules(state: GettingStartedState, products = chosenProducts(state)): ModuleId[] {
  return requiredModules(products).filter((id) => ["todo", "later", "delegated"].includes(moduleStatus(id, state, products)))
}

/** Everything but the agreement is in — the merchant can review and sign. */
export function readyToSign(state: GettingStartedState, products = chosenProducts(state)) {
  return requiredModules(products).filter((id) => id !== "agreement").every((id) => ["done", "in-review", "approved"].includes(moduleStatus(id, state, products)))
}

export function productVerified(product: ProductId, state: GettingStartedState) {
  return PRODUCT_REQUIREMENTS[product].every((id) => state.verification.approved.includes(id)) && state.verification.agreedProducts.includes(product)
}

export type VerificationPhase = "not-started" | "in-progress" | "in-review" | "approved"

export function verificationPhase(state: GettingStartedState, products = chosenProducts(state)): VerificationPhase {
  const required = requiredModules(products)
  if (required.length && required.every((id) => moduleStatus(id, state, products) === "approved")) return "approved"
  if (required.length && required.every((id) => ["approved", "in-review"].includes(moduleStatus(id, state, products)))) return "in-review"
  return state.onlineProfile ? "in-progress" : "not-started"
}

/** Steps the verification flow walks through for the chosen products, in order. */
export function flowSteps(products: ProductId[]): OnlineStepId[] {
  const modules = requiredModules(products)
  return ONLINE_STEPS.map((step) => step.id as OnlineStepId).filter((step) => modules.some((id) => MODULE_BY_ID[id].steps.includes(step)))
}

export function moduleOfStep(step: OnlineStepId): ModuleId {
  return MODULES.find((module) => module.steps.includes(step))!.id
}

/** First step of the next module that still needs attention, skipping deferred and delegated ones. */
export function nextOpenStep(state: GettingStartedState, products: ProductId[], after?: ModuleId): OnlineStepId {
  const modules = requiredModules(products)
  const start = after ? modules.indexOf(after) + 1 : 0
  const ordered = [...modules.slice(start), ...modules.slice(0, start)]
  const target = ordered.find((id) => moduleStatus(id, state, products) === "todo" && id !== "agreement")
    ?? (readyToSign(state, products) ? "agreement" : undefined)
  if (target === "agreement") return "review"
  if (!target) return "review"
  const profile = profileOf(state)
  return MODULE_BY_ID[target].steps.find((step) => !canContinueOnline(step, profile)) ?? MODULE_BY_ID[target].steps[0]
}

/** Demo stand-in for a delegate finishing their part. */
export function demoCompletion(id: ModuleId, profile: OnlineProfile): Partial<OnlineProfile> {
  const file = (name: string) => ({ name, size: 120_000, type: "application/pdf" })
  switch (id) {
    case "documents": {
      const documents = { ...profile.documents }
      for (const doc of documentsFor(businessTypeFromPan(profile.pan))) if (!doc.optional) documents[doc.id] = file(`${doc.id}.pdf`)
      return { documents, documentsAuthentic: true }
    }
    case "bank": return { bankMethod: "manual", accountNumber: "50100234567890", confirmAccountNumber: "50100234567890", ifsc: "HDFC0001234" }
    case "signatory": return {
      signatoryName: profile.signatoryName || "Demo Signatory", signatoryPan: profile.signatoryPan || "ABCPS1234K", signatoryPanVerified: true,
      designation: profile.designation || "Director", politicalExposure: "none", identityVerified: true, videoKycVerified: true,
    }
    case "owners": return { hasOwners: "no", ownersView: "declaration" }
    case "online-presence": return { noWebsite: true, noApp: true }
    default: return {}
  }
}

export type ChecklistItem = { label: string; where: string; module: ModuleId }

/** "Have these ready" — what the chosen products need, personalised by business type. */
export function readyChecklist(type: BusinessType, products: ProductId[]): ChecklistItem[] {
  const modules = requiredModules(products)
  const items: ChecklistItem[] = [
    { module: "identity", label: "Business PAN and the mobile number linked to it", where: "On the PAN card. The OTP goes to the linked mobile." },
    { module: "identity", label: "GSTIN (if registered)", where: "On your GST certificate. We fetch it from your PAN." },
    { module: "bank", label: "Bank account number and IFSC, or a cancelled cheque", where: "On a cheque leaf or your net-banking profile." },
    { module: "owners", label: "PAN of anyone owning more than 10%", where: type === "proprietor" ? "Usually just you as the proprietor." : "From your shareholding or partnership records." },
    { module: "signatory", label: "Signatory's PAN, plus 5 minutes of their time for Video KYC", where: "The person allowed to sign for the business. They can do it from their phone." },
    { module: "online-presence", label: "Website or app link (or tell us you don't have one)", where: "The address customers use to buy from you." },
    ...documentsFor(type).filter((doc) => !doc.optional).map((doc) => ({ module: "documents" as const, label: doc.label, where: doc.where })),
  ]
  return items.filter((item) => modules.includes(item.module))
}

export function businessTypeLabel(state: GettingStartedState) {
  return BUSINESS_TYPE_LABEL[businessTypeFromPan(state.onlineProfile?.pan ?? "")]
}

/** "3 of 5 done · Next: Bank account" — shown when leaving verification and on the product page. */
export function verificationProgress(state: GettingStartedState, products = chosenProducts(state)) {
  const modules = requiredModules(products)
  const done = modules.filter((id) => ["done", "in-review", "approved"].includes(moduleStatus(id, state, products))).length
  const open = outstandingModules(state, products).filter((id) => id !== "agreement")
  const next = open.find((id) => moduleStatus(id, state, products) === "todo") ?? open.find((id) => moduleStatus(id, state, products) === "later")
  const waitingOn = open.filter((id) => moduleStatus(id, state, products) === "delegated").map((id) => state.verification.delegated[id]?.name).filter(Boolean) as string[]
  return { done, total: modules.length, next: next ? MODULE_BY_ID[next] : null, waitingOn, readyToSign: readyToSign(state, products) }
}
