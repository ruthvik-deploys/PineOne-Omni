"use client"

/**
 * Progressive onboarding for a merchant who has just signed up (phone → OTP →
 * password → dashboard). Nothing is set up yet, so the platform starts small —
 * Overview plus the three products — and grows as each product goes live.
 *
 * Each product moves through stages. In-store needs hardware, so it adds a
 * payment, an order to track and a setup guide before it can go live:
 *
 *   in-store:       intro → setup → payment → shipping → install → live
 *   payment-links:  intro → setup → live
 *   checkout:       intro → setup → live
 *
 * Business and bank details are shared: whichever product collects them first
 * fills them in for the others. Demo-only, kept in localStorage with the same
 * event pattern as business-profiles.ts.
 */

import { useState, useSyncExternalStore } from "react"
import { onboardingStorageKey } from "./onboarding-environment.js"
import { createOnlineProfile, type OnlineProfile } from "./online-onboarding.ts"
import { demoCompletion, INITIAL_VERIFICATION, PRODUCT_REQUIREMENTS, requiredModules, type ModuleId, type VerificationState } from "./verification.ts"

export const NEW_MERCHANT_PROFILE_ID = "new-merchant"

export type ProductId = "in-store" | "payment-links" | "checkout"
export const PRODUCT_IDS: ProductId[] = ["in-store", "payment-links", "checkout"]

export type JourneyStage = "intro" | "setup" | "payment" | "shipping" | "install" | "live"

export type OrderStatus = "placed" | "packed" | "shipped" | "out-for-delivery" | "delivered"
export const ORDER_STATUSES: OrderStatus[] = ["placed", "packed", "shipped", "out-for-delivery", "delivered"]

export type CartLine = { deviceId: string; plan: "lifetime" | "rental"; qty: number }

export type TerminalOrder = {
  id: string
  placedAt: string
  status: OrderStatus
  history: Partial<Record<OrderStatus, string>>
  lines: CartLine[]
  amountPaid: number
  paidWith: string
  courier: string
  awb: string
}

export type ProductJourney = {
  stage: JourneyStage
  /** Index of the current setup step (0-based) while in the "setup" stage. */
  step: number
  /** Setup guide items ticked off while in the "install" stage. */
  guideDone: string[]
  wentLiveAt?: string
  updatedAt?: string
}

export type BusinessDetails = { legalName: string; pan: string; businessType: string; gstin: string }
export type BankDetails = { holder: string; account: string; ifsc: string }
export type DeliveryDetails = { storeName: string; address: string; pincode: string; city: string; contact: string }
export type LinkDefaults = { expiry: string; methods: string[]; reminders: boolean }
export type SetupDrafts = {
  business: BusinessDetails
  bank: BankDetails
  delivery: DeliveryDetails
  linkDefaults: LinkDefaults
  firstLink: { amount: string; purpose: string }
  website: { website: string; platform: string }
  brand: string
}

/** Where the merchant came from — carries intent in, so we rarely need to ask. */
export type SignupSource = { from: "website" | "sales" | "migrated"; product?: ProductId }

export type GettingStartedState = {
  source: SignupSource | null
  /** Products picked in the first onboarding step. null until the merchant confirms a choice. */
  selected: ProductId[] | null
  verification: VerificationState
  /** Products whose first hands-on step (test link, sandbox, device choice) is done. */
  tried: ProductId[]
  /** One-time coachmarks already shown. */
  seenTips: string[]
  crossSellDismissed: Record<string, string>
  onlineProfile: OnlineProfile | null
  journeys: Record<ProductId, ProductJourney>
  business: BusinessDetails | null
  bank: BankDetails | null
  cart: CartLine[]
  delivery: DeliveryDetails | null
  order: TerminalOrder | null
  paymentLinks: Array<{ id: string; amount: number; purpose: string; createdAt: string; test?: boolean }>
  checkout: { website: string; platform: string; brandColor: string } | null
  /** Sections the merchant has already opened since they were unlocked (clears the "New" tag). */
  seenSections: string[]
  drafts: Partial<Record<ProductId, Partial<SetupDrafts>>>
  linkDefaults: LinkDefaults
  firstLinkId: string | null
  moreToolsEnabled: boolean
  pendingIntroduction: ProductId | null
}

const EMPTY_JOURNEY: ProductJourney = { stage: "intro", step: 0, guideDone: [] }

export const INITIAL_GETTING_STARTED: GettingStartedState = {
  source: null,
  selected: null,
  verification: INITIAL_VERIFICATION,
  tried: [],
  seenTips: [],
  crossSellDismissed: {},
  onlineProfile: null,
  journeys: { "in-store": EMPTY_JOURNEY, "payment-links": EMPTY_JOURNEY, checkout: EMPTY_JOURNEY },
  business: null,
  bank: null,
  cart: [],
  delivery: null,
  order: null,
  paymentLinks: [],
  checkout: null,
  seenSections: [],
  drafts: {},
  linkDefaults: { expiry: "7 days", methods: ["UPI", "Cards", "Netbanking"], reminders: true },
  firstLinkId: null,
  moreToolsEnabled: false,
  pendingIntroduction: null,
}

const STORAGE_KEY = "pine-one-getting-started.v1"
const CHANGED_EVENT = "getting-started-changed"

export function readGettingStarted(): GettingStartedState {
  if (typeof window === "undefined") return INITIAL_GETTING_STARTED
  try {
    const raw = window.localStorage.getItem(onboardingStorageKey(STORAGE_KEY))
    if (!raw) return INITIAL_GETTING_STARTED
    const parsed = JSON.parse(raw) as Partial<GettingStartedState>
    return {
      ...INITIAL_GETTING_STARTED,
      ...parsed,
      journeys: { ...INITIAL_GETTING_STARTED.journeys, ...parsed.journeys },
      verification: { ...INITIAL_VERIFICATION, ...parsed.verification },
    }
  } catch {
    return INITIAL_GETTING_STARTED
  }
}

function write(next: GettingStartedState) {
  window.localStorage.setItem(onboardingStorageKey(STORAGE_KEY), JSON.stringify(next))
  window.dispatchEvent(new Event(CHANGED_EVENT))
}

export function updateGettingStarted(update: (state: GettingStartedState) => GettingStartedState) {
  if (typeof window === "undefined") return
  write(update(readGettingStarted()))
}

export function updateJourney(product: ProductId, patch: Partial<ProductJourney>) {
  updateGettingStarted((state) => ({
    ...state,
    journeys: {
      ...state.journeys,
      [product]: { ...state.journeys[product], ...patch, updatedAt: new Date().toISOString() },
    },
  }))
}

/** Starting another product never resets shared verification — only its own addendum is missing. */
export function startProductSetup(product: ProductId, step = 0) {
  updateGettingStarted((state) => ({
    ...state,
    journeys: { ...state.journeys, [product]: { ...state.journeys[product], stage: "setup", step, updatedAt: new Date().toISOString() } },
  }))
}

export function resetGettingStarted() {
  if (typeof window === "undefined") return
  write(INITIAL_GETTING_STARTED)
}

let cachedRaw: string | null | undefined
let cachedKey: string | undefined
let cachedState = INITIAL_GETTING_STARTED

function snapshot() {
  const key = onboardingStorageKey(STORAGE_KEY)
  const raw = window.localStorage.getItem(key)
  if (key !== cachedKey || raw !== cachedRaw) {
    cachedKey = key
    cachedRaw = raw
    cachedState = readGettingStarted()
  }
  return cachedState
}

function subscribe(listener: () => void) {
  window.addEventListener(CHANGED_EVENT, listener)
  window.addEventListener("storage", listener)
  return () => {
    window.removeEventListener(CHANGED_EVENT, listener)
    window.removeEventListener("storage", listener)
  }
}

const emptySubscribe = () => () => {}
export function useGettingStartedHydrated() {
  return useSyncExternalStore(emptySubscribe, () => true, () => false)
}

export function useGettingStarted(): GettingStartedState {
  return useSyncExternalStore(subscribe, snapshot, () => INITIAL_GETTING_STARTED)
}

export function saveSetupDraft<K extends keyof SetupDrafts>(product: ProductId, key: K, value: SetupDrafts[K]) {
  updateGettingStarted((state) => ({
    ...state,
    drafts: { ...state.drafts, [product]: { ...state.drafts[product], [key]: value } },
    journeys: { ...state.journeys, [product]: { ...state.journeys[product], updatedAt: new Date().toISOString() } },
  }))
}

export function useSetupDraft<K extends keyof SetupDrafts>(product: ProductId, key: K, initial: SetupDrafts[K]) {
  const [value, setValue] = useState<SetupDrafts[K]>(() => readGettingStarted().drafts[product]?.[key] ?? initial)
  return [value, (next: SetupDrafts[K]) => {
    setValue(next)
    saveSetupDraft(product, key, next)
  }] as const
}

export function visibleSectionIds(state: GettingStartedState): string[] {
  if (liveProducts(state).length === 0) return []
  return state.moreToolsEnabled
    ? ["payments", "settlements", "refunds", "disputes", "reports"]
    : ["payments", "settlements"]
}

export function activateProduct(product: ProductId) {
  const now = new Date().toISOString()
  updateGettingStarted((state) => ({
    ...state,
    journeys: { ...state.journeys, [product]: { ...state.journeys[product], stage: "live", wentLiveAt: now, updatedAt: now } },
    pendingIntroduction: product,
  }))
}

export function enableMoreTools() {
  updateGettingStarted((state) => ({ ...state, moreToolsEnabled: true }))
}

export function createFirstPaymentLink(amount: number, purpose: string) {
  const state = readGettingStarted()
  const existing = state.paymentLinks.find((link) => link.id === state.firstLinkId)
  if (existing) return existing
  const link = { id: `plink_${Math.random().toString(36).slice(2, 10)}`, amount, purpose: purpose.trim(), createdAt: new Date().toISOString() }
  updateGettingStarted((current) => ({ ...current, paymentLinks: [...current.paymentLinks, link], firstLinkId: link.id }))
  return link
}

/** The order is packed straight away but only ships once In-store's verification is approved. */
export function orderCanShip(state: GettingStartedState) {
  return PRODUCT_REQUIREMENTS["in-store"].every((id) => state.verification.approved.includes(id)) && state.verification.agreedProducts.includes("in-store")
}

/** Moves the demo order one status along — stands in for courier webhooks. */
export function advanceOrder() {
  updateGettingStarted((state) => {
    if (!state.order) return state
    if (state.order.status === "packed" && !orderCanShip(state)) return state
    const index = ORDER_STATUSES.indexOf(state.order.status)
    const status = ORDER_STATUSES[Math.min(index + 1, ORDER_STATUSES.length - 1)]
    const order = { ...state.order, status, history: { ...state.order.history, [status]: new Date().toISOString() } }
    const journeys =
      status === "delivered"
        ? { ...state.journeys, "in-store": { ...state.journeys["in-store"], stage: "install" as const, updatedAt: new Date().toISOString() } }
        : state.journeys
    return { ...state, order, journeys }
  })
}

export function isLive(state: GettingStartedState, product: ProductId) {
  return state.journeys[product].stage === "live"
}

export function liveProducts(state: GettingStartedState) {
  return PRODUCT_IDS.filter((id) => isLive(state, id))
}

/** The product the merchant touched most recently and hasn't finished — drives the Continue banner. */
export function activeJourney(state: GettingStartedState): ProductId | null {
  const open = PRODUCT_IDS.filter((id) => {
    const { stage } = state.journeys[id]
    return stage !== "intro" && stage !== "live"
  })
  if (open.length === 0) return null
  return open.sort((a, b) => (state.journeys[b].updatedAt ?? "").localeCompare(state.journeys[a].updatedAt ?? ""))[0]
}

export function markSectionSeen(section: string) {
  updateGettingStarted((state) =>
    state.seenSections.includes(section) ? state : { ...state, seenSections: [...state.seenSections, section] }
  )
}

export function getInstallationGuide(lines: CartLine[]) {
  const hasQr = lines.some((line) => line.deviceId === "qr-soundbox")
  const hasPos = lines.some((line) => line.deviceId !== "qr-soundbox")
  return [
    { id: "unbox", title: "Unbox and charge", body: "Charge each device using the cable supplied in its box. Keep the device near your payment counter." },
    { id: "connect", title: "Turn on and connect", body: hasPos ? "Turn on each terminal and follow its connection prompts. Use the included SIM or connect to store Wi-Fi where supported." : "Turn on your soundbox and check its network indicator. Keep it where the speaker can be heard at your counter." },
    { id: "activate", title: hasQr ? "Check your store and QR" : "Activate your terminal", body: hasQr
      ? `Check that the supplied QR displays your business name before placing it at the counter.${hasPos ? " Follow the activation prompts on each card terminal as well." : ""}`
      : "Follow the activation prompts on the terminal. Check that its store and settlement account match your details." },
    { id: "test", title: "Check a test payment", body: hasQr
      ? `Scan the supplied QR with a UPI app and confirm that the soundbox announces the payment.${hasPos ? " On card terminals, also try a small test sale." : ""} In this demo, mark this complete to simulate a successful test.`
      : "Use Sale on each terminal to try a small card or UPI payment. In this demo, mark this complete to simulate a successful test." },
  ]
}

/* ---------- Intent, first steps and teaching ---------- */

/** Mark a product as chosen. Online products have no separate setup — they wait on shared verification. */
export function chooseProduct(product: ProductId) {
  updateGettingStarted((state) => state.journeys[product].stage !== "intro" || product === "in-store" ? state : {
    ...state,
    selected: state.selected && !state.selected.includes(product) ? PRODUCT_IDS.filter((id) => id === product || state.selected!.includes(id)) : state.selected,
    journeys: { ...state.journeys, [product]: { ...state.journeys[product], stage: "setup", step: 0, updatedAt: new Date().toISOString() } },
  })
}

/** First onboarding step: the products the merchant wants. Products already in progress stay selected. */
export function selectProducts(products: ProductId[]) {
  updateGettingStarted((state) => {
    const started = PRODUCT_IDS.filter((id) => productStarted(state, id))
    return { ...state, selected: PRODUCT_IDS.filter((id) => products.includes(id) || started.includes(id)) }
  })
}

/** A product with real progress (order, test link, live) can't be unselected. */
export function productStarted(state: GettingStartedState, product: ProductId) {
  return state.journeys[product].stage !== "intro" || (product === "in-store" && state.cart.length > 0) || state.tried.includes(product)
}

export function markTried(product: ProductId) {
  updateGettingStarted((state) => state.tried.includes(product) ? state : { ...state, tried: [...state.tried, product] })
}

export function createTestLink(amount: number, purpose: string) {
  const link = { id: `plink_test_${Math.random().toString(36).slice(2, 8)}`, amount, purpose: purpose.trim(), createdAt: new Date().toISOString(), test: true }
  updateGettingStarted((state) => ({ ...state, paymentLinks: [...state.paymentLinks, link] }))
  return link
}

export function markTipSeen(id: string) {
  updateGettingStarted((state) => state.seenTips.includes(id) ? state : { ...state, seenTips: [...state.seenTips, id] })
}

export function dismissCrossSell(id: string) {
  updateGettingStarted((state) => ({ ...state, crossSellDismissed: { ...state.crossSellDismissed, [id]: new Date().toISOString() } }))
}

/* ---------- Shared verification ---------- */

function patchVerification(update: (v: VerificationState, state: GettingStartedState) => Partial<VerificationState>) {
  updateGettingStarted((state) => ({ ...state, verification: { ...state.verification, ...update(state.verification, state) } }))
}

export function setVerificationStep(current: VerificationState["current"]) {
  patchVerification(() => ({ current }))
}

export function setVerificationReturn(returnTo: string) {
  patchVerification(() => ({ returnTo }))
}

export function deferModule(id: ModuleId) {
  patchVerification((v) => ({ deferred: v.deferred.includes(id) ? v.deferred : [...v.deferred, id] }))
}

export function delegateModule(id: ModuleId, name: string, contact: string) {
  patchVerification((v) => ({ delegated: { ...v.delegated, [id]: { name: name.trim(), contact: contact.trim(), sentAt: new Date().toISOString() } } }))
}

/** Demo: the person a module was handed to finishes it. */
export function completeDelegatedModule(id: ModuleId) {
  updateGettingStarted((state) => {
    const profile = createOnlineProfile(state.onlineProfile ?? {})
    const { [id]: _done, ...delegated } = state.verification.delegated
    return {
      ...state,
      onlineProfile: { ...profile, ...demoCompletion(id, profile) },
      verification: { ...state.verification, delegated, deferred: state.verification.deferred.filter((item) => item !== id) },
    }
  })
}

/** Sign the agreement for these products and send everything not yet approved for review. */
export function submitVerification(products: ProductId[]) {
  updateGettingStarted((state) => {
    const pending = requiredModules(products).filter((id) => !state.verification.approved.includes(id))
    const profile = createOnlineProfile(state.onlineProfile ?? {})
    return {
      ...state,
      onlineProfile: { ...profile, agreementAccepted: true, submittedAt: new Date().toISOString() },
      business: { legalName: profile.legalName, pan: profile.pan, gstin: profile.gstin, businessType: "" },
      bank: profile.bankMethod === "manual" && profile.accountNumber ? { holder: profile.legalName, account: profile.accountNumber, ifsc: profile.ifsc } : state.bank,
      verification: {
        ...state.verification,
        inReview: Array.from(new Set([...state.verification.inReview, ...pending])),
        agreedProducts: Array.from(new Set([...state.verification.agreedProducts, ...products])),
        deferred: [],
        submittedAt: new Date().toISOString(),
      },
      journeys: Object.fromEntries(Object.entries(state.journeys).map(([id, journey]) =>
        [id, products.includes(id as ProductId) && id !== "in-store" && journey.stage === "intro" ? { ...journey, stage: "setup" } : journey])) as GettingStartedState["journeys"],
    }
  })
}

/** Demo: the review team approves. Online products go live; In-store's order can now ship. */
export function approveVerification() {
  const now = new Date().toISOString()
  updateGettingStarted((state) => {
    const approved = Array.from(new Set([...state.verification.approved, ...state.verification.inReview]))
    const verification = { ...state.verification, approved, inReview: [] }
    let pendingIntroduction = state.pendingIntroduction
    const journeys = { ...state.journeys }
    for (const id of ["payment-links", "checkout"] as ProductId[]) {
      const ready = PRODUCT_REQUIREMENTS[id].every((module) => approved.includes(module)) && verification.agreedProducts.includes(id)
      if (ready && journeys[id].stage === "setup") {
        journeys[id] = { ...journeys[id], stage: "live", wentLiveAt: now, updatedAt: now }
        pendingIntroduction = id
      }
    }
    if (state.journeys.checkout.stage === "setup" && journeys.checkout.stage === "live" && !state.checkout) {
      const profile = createOnlineProfile(state.onlineProfile ?? {})
      return { ...state, verification, journeys, pendingIntroduction, checkout: { website: profile.noWebsite ? profile.appLink : profile.website, platform: "custom", brandColor: "#3b5615" } }
    }
    return { ...state, verification, journeys, pendingIntroduction }
  })
}

/* ---------- Signup source ---------- */

const SOURCE_KEY = "pine-one-signup-source"

/** Stored on the first signup screen, applied once the account exists. */
const VARIANT_KEY = "pine-one-start-variant"

/** Which product-selection design signup leads into: the checkbox cards (default) or the catalogue (`?variant=catalog`). */
export function startHref() {
  if (typeof window === "undefined") return "/onboarding/products/start"
  return window.localStorage.getItem(onboardingStorageKey(VARIANT_KEY)) === "catalog" ? "/onboarding/products/start-catalog" : "/onboarding/products/start"
}

/** The picker the merchant last saw, so Back and "Change" from verification return to it. */
export function rememberStartVariant(variant: "cards" | "catalog") {
  if (typeof window === "undefined") return
  if (variant === "catalog") window.localStorage.setItem(onboardingStorageKey(VARIANT_KEY), "catalog")
  else window.localStorage.removeItem(onboardingStorageKey(VARIANT_KEY))
}

export function rememberSignupSource(search: string) {
  if (typeof window === "undefined") return
  const params = new URLSearchParams(search)
  if (params.get("variant") === "catalog") window.localStorage.setItem(onboardingStorageKey(VARIANT_KEY), "catalog")
  else window.localStorage.removeItem(onboardingStorageKey(VARIANT_KEY))
  const from = params.get("from")
  const product = params.get("product")
  if (from !== "website" && from !== "sales" && from !== "migrated") {
    window.localStorage.removeItem(onboardingStorageKey(SOURCE_KEY))
    return
  }
  const valid = PRODUCT_IDS.includes(product as ProductId) ? (product as ProductId) : undefined
  window.localStorage.setItem(onboardingStorageKey(SOURCE_KEY), JSON.stringify({ from, product: valid }))
}

export function readSignupSource(): SignupSource | null {
  if (typeof window === "undefined") return null
  try { return JSON.parse(window.localStorage.getItem(onboardingStorageKey(SOURCE_KEY)) ?? "null") } catch { return null }
}

export function applySignupSource() {
  const source = readSignupSource()
  if (!source) return
  window.localStorage.removeItem(onboardingStorageKey(SOURCE_KEY))
  const now = new Date().toISOString()
  updateGettingStarted((state) => {
    if (source.from === "migrated") return migratedMerchantState(now)
    const next = { ...state, source }
    if (source.product === "in-store" && source.from === "sales") next.cart = [{ deviceId: "touch-a910", plan: "lifetime", qty: 2 }]
    if (source.product && source.product !== "in-store") {
      next.journeys = { ...state.journeys, [source.product]: { ...state.journeys[source.product], stage: "setup", step: 0, updatedAt: now } }
    }
    return next
  })
}

/** A merchant from the old separate platforms: terminals and links already live. */
function migratedMerchantState(now: string): GettingStartedState {
  const profile = createOnlineProfile({
    pan: "ABCCD1234E", panVerified: true, legalName: "Demo Business Private Limited", phone: "9876543210", phoneVerified: true,
    gstin: "27ABCCD1234E1Z5", gstVerified: true, registeredAddress: "12, Business Park, MG Road, Bengaluru, Karnataka 560001",
    bankMethod: "manual", accountNumber: "50100234567890", confirmAccountNumber: "50100234567890", ifsc: "HDFC0001234",
    hasOwners: "no", signatoryName: "Demo Signatory", signatoryPan: "ABCPS1234K", signatoryPanVerified: true, designation: "Director",
    politicalExposure: "none", identityVerified: true, videoKycVerified: true, agreementAccepted: true, submittedAt: now,
  })
  const live = { stage: "live" as const, step: 0, guideDone: [], wentLiveAt: now, updatedAt: now }
  return {
    ...INITIAL_GETTING_STARTED,
    source: { from: "migrated" },
    selected: ["in-store", "payment-links"],
    onlineProfile: profile,
    business: { legalName: profile.legalName, pan: profile.pan, gstin: profile.gstin, businessType: "" },
    bank: { holder: profile.legalName, account: profile.accountNumber, ifsc: profile.ifsc },
    verification: { ...INITIAL_VERIFICATION, approved: requiredModules(["in-store", "payment-links"]), agreedProducts: ["in-store", "payment-links"], submittedAt: now },
    journeys: { "in-store": live, "payment-links": live, checkout: EMPTY_JOURNEY },
    tried: ["in-store", "payment-links"],
    cart: [{ deviceId: "touch-a910", plan: "lifetime", qty: 2 }],
    delivery: { storeName: "Demo Store", address: "12, MG Road", pincode: "560001", city: "Bengaluru", contact: "9876543210" },
    order: { id: "ORD-MIGRATED", placedAt: now, status: "delivered", history: { delivered: now }, lines: [{ deviceId: "touch-a910", plan: "lifetime", qty: 2 }], amountPaid: 0, paidWith: "Existing account", courier: "—", awb: "—" },
  }
}
