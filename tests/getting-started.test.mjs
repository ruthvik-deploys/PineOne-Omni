import assert from "node:assert/strict"
import { beforeEach, test } from "node:test"
import * as onboarding from "../lib/getting-started.ts"

// The prototype's browser persistence boundary; all transitions below use real model functions.
const storage = new Map()
const browser = new EventTarget()
browser.localStorage = {
  getItem: (key) => storage.get(key) ?? null,
  setItem: (key, value) => storage.set(key, value),
}
globalThis.window = browser
beforeEach(() => storage.clear())

test("a new merchant sees no activity sections before a product is live", () => {
  assert.deepEqual(onboarding.visibleSectionIds(onboarding.readGettingStarted()), [])
})

test("starting another product keeps shared verification and signed consent; only its addendum is new", () => {
  onboarding.updateGettingStarted((state) => ({ ...state,
    onlineProfile: { version: 1, pan: "ABCDE1234F", panVerified: true, agreementAccepted: true, submittedAt: "2026-11-10" },
    verification: { ...state.verification, agreedProducts: ["payment-links"] },
  }))
  onboarding.startProductSetup("checkout")
  const state = onboarding.readGettingStarted()
  assert.equal(state.onlineProfile.panVerified, true)
  assert.equal(state.onlineProfile.agreementAccepted, true)
  assert.deepEqual(state.verification.agreedProducts, ["payment-links"])
  assert.equal(state.journeys.checkout.stage, "setup")
  assert.equal(state.journeys["in-store"].stage, "intro")
})

test("activation introduces only Payments and Settlement until more tools are requested", () => {
  onboarding.activateProduct("payment-links")
  const state = onboarding.readGettingStarted()
  assert.equal(state.journeys["payment-links"].stage, "live")
  assert.equal(state.pendingIntroduction, "payment-links")
  assert.deepEqual(onboarding.visibleSectionIds(state), ["payments", "settlements"])
  onboarding.enableMoreTools()
  assert.deepEqual(onboarding.visibleSectionIds(onboarding.readGettingStarted()), ["payments", "settlements", "refunds", "disputes", "reports"])
})

test("saving a draft preserves other products and survives a fresh storage read", () => {
  const business = { legalName: "Test Store", pan: "ABCDE1234F", businessType: "Sole proprietorship", gstin: "" }
  onboarding.saveSetupDraft("payment-links", "business", business)
  onboarding.saveSetupDraft("checkout", "website", { website: "example.com", platform: "custom" })
  const state = onboarding.readGettingStarted()
  assert.deepEqual(state.drafts["payment-links"].business, business)
  assert.equal(state.drafts.checkout.website.platform, "custom")
})

test("link settings and the first created link survive resumption without duplicate creation", () => {
  const defaults = { expiry: "24 hours", methods: ["UPI"], reminders: false }
  onboarding.updateGettingStarted((state) => ({ ...state, linkDefaults: defaults }))
  const first = onboarding.createFirstPaymentLink(500, "Test order")
  const second = onboarding.createFirstPaymentLink(500, "Test order")
  const state = onboarding.readGettingStarted()
  assert.equal(first.id, second.id)
  assert.equal(state.paymentLinks.length, 1)
  assert.equal(state.firstLinkId, first.id)
  assert.deepEqual(state.linkDefaults, defaults)
})

test("terminals wait at packed until In-store verification is approved", () => {
  onboarding.updateJourney("in-store", { stage: "shipping" })
  onboarding.updateGettingStarted((state) => ({ ...state, order: {
    id: "ORD-TEST", placedAt: "2026-11-10T10:00:00Z", status: "placed", history: {},
    lines: [], amountPaid: 0, paidWith: "Demo UPI", courier: "Demo courier", awb: "TEST",
  } }))
  for (let index = 0; index < 4; index++) onboarding.advanceOrder()
  assert.equal(onboarding.readGettingStarted().order.status, "packed")
})

test("delivery opens installation, without unlocking payment sections before activation", () => {
  onboarding.updateJourney("in-store", { stage: "shipping" })
  onboarding.updateGettingStarted((state) => ({ ...state, verification: { ...state.verification,
    approved: ["identity", "bank", "signatory", "agreement"], agreedProducts: ["in-store"] } }))
  onboarding.updateGettingStarted((state) => ({ ...state, order: {
    id: "ORD-TEST", placedAt: "2026-11-10T10:00:00Z", status: "placed", history: {},
    lines: [], amountPaid: 0, paidWith: "Demo UPI", courier: "Demo courier", awb: "TEST",
  } }))
  for (let index = 0; index < 4; index++) onboarding.advanceOrder()
  const state = onboarding.readGettingStarted()
  assert.equal(state.order.status, "delivered")
  assert.equal(state.journeys["in-store"].stage, "install")
  assert.deepEqual(onboarding.visibleSectionIds(state), [])
})

test("older saved progress receives new defaults without losing its journey", () => {
  browser.localStorage.setItem("pine-one-getting-started.v1", JSON.stringify({
    journeys: { checkout: { stage: "setup", step: 2, guideDone: [] } },
  }))
  const state = onboarding.readGettingStarted()
  assert.equal(state.journeys.checkout.step, 2)
  assert.deepEqual(state.drafts, {})
  assert.equal(state.linkDefaults.expiry, "7 days")
  assert.equal(state.moreToolsEnabled, false)
})

test("a soundbox-only order gets QR instructions rather than card-terminal actions", () => {
  const guide = onboarding.getInstallationGuide([{ deviceId: "qr-soundbox", plan: "rental", qty: 1 }])
  const copy = guide.map((item) => item.body).join(" ")
  assert.match(copy, /QR/)
  assert.match(copy, /UPI/)
  assert.doesNotMatch(copy, /Tap Sale|paper roll|own card/)
})

test("a mixed order explains both terminal and soundbox setup", () => {
  const guide = onboarding.getInstallationGuide([
    { deviceId: "qr-soundbox", plan: "rental", qty: 1 },
    { deviceId: "touch-a910", plan: "lifetime", qty: 1 },
  ])
  const copy = guide.map((item) => item.body).join(" ")
  assert.match(copy, /QR/)
  assert.match(copy, /terminal/)
})
