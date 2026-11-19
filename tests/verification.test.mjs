import assert from "node:assert/strict"
import { beforeEach, test } from "node:test"
import * as onboarding from "../lib/getting-started.ts"
import * as verification from "../lib/verification.ts"
import { businessTypeFromPan, documentsFor } from "../lib/online-onboarding.ts"

const storage = new Map()
const browser = new EventTarget()
browser.localStorage = {
  getItem: (key) => storage.get(key) ?? null,
  setItem: (key, value) => storage.set(key, value),
  removeItem: (key) => storage.delete(key),
}
browser.location = { pathname: "/" }
globalThis.window = browser
beforeEach(() => storage.clear())

const read = () => onboarding.readGettingStarted()
const identity = { version: 1, pan: "ABCPK1234F", panVerified: true, phone: "9876543210", phoneVerified: true, gstin: "27ABCPK1234F1Z5", gstVerified: true }

test("each product asks only for the modules it needs", () => {
  assert.deepEqual(verification.requiredModules(["in-store"]), ["identity", "bank", "signatory", "agreement"])
  assert.deepEqual(verification.requiredModules(["payment-links"]), ["identity", "bank", "owners", "signatory", "agreement"])
  assert.ok(verification.requiredModules(["checkout"]).includes("documents"))
  assert.ok(!verification.requiredModules(["payment-links"]).includes("documents"))
})

test("adding a product after approval asks only for what's missing", () => {
  onboarding.chooseProduct("payment-links")
  onboarding.updateGettingStarted((state) => ({ ...state, verification: { ...state.verification,
    approved: verification.requiredModules(["payment-links"]), agreedProducts: ["payment-links"] } }))
  onboarding.chooseProduct("checkout")
  assert.deepEqual(verification.outstandingModules(read()), ["online-presence", "documents", "agreement"])
})

test("a deferred or delegated module doesn't block the rest, but does block signing", () => {
  onboarding.chooseProduct("payment-links")
  onboarding.updateGettingStarted((state) => ({ ...state, onlineProfile: identity }))
  onboarding.deferModule("bank")
  onboarding.delegateModule("signatory", "Rahul", "9812345678")
  const state = read()
  assert.equal(verification.moduleStatus("bank", state), "later")
  assert.equal(verification.moduleStatus("signatory", state), "delegated")
  assert.equal(verification.nextOpenStep(state, ["payment-links"], "identity"), "owners", "skips deferred and delegated modules")
  assert.equal(verification.readyToSign(state), false)
})

test("a delegate finishing their part clears the hand-off", () => {
  onboarding.chooseProduct("payment-links")
  onboarding.updateGettingStarted((state) => ({ ...state, onlineProfile: identity }))
  onboarding.delegateModule("bank", "Rahul", "9812345678")
  onboarding.completeDelegatedModule("bank")
  const state = read()
  assert.equal(verification.moduleStatus("bank", state), "done")
  assert.equal(state.verification.delegated.bank, undefined)
})

test("approval puts chosen online products live and lets In-store ship", () => {
  onboarding.chooseProduct("payment-links")
  onboarding.updateGettingStarted((state) => ({ ...state, cart: [{ deviceId: "touch-a910", plan: "lifetime", qty: 1 }] }))
  onboarding.submitVerification(["payment-links", "in-store"])
  assert.equal(verification.verificationPhase(read()), "in-review")
  assert.equal(onboarding.orderCanShip(read()), false)
  onboarding.approveVerification()
  const state = read()
  assert.equal(state.journeys["payment-links"].stage, "live")
  assert.equal(state.journeys["in-store"].stage, "intro", "In-store still needs delivery and installation")
  assert.equal(onboarding.orderCanShip(state), true)
})

test("documents and checklist are personalised by business type from PAN", () => {
  assert.equal(businessTypeFromPan("ABCPK1234F"), "proprietor")
  assert.equal(businessTypeFromPan("ABCFK1234F"), "partnership")
  assert.equal(businessTypeFromPan("ABCCK1234F"), "company")
  assert.deepEqual(documentsFor("proprietor").filter((doc) => !doc.optional).map((doc) => doc.id), ["proof"])
  assert.deepEqual(documentsFor("company").filter((doc) => !doc.optional).map((doc) => doc.id), ["moa", "aoa"])
  const labels = verification.readyChecklist("proprietor", ["checkout"]).map((item) => item.label).join(" | ")
  assert.match(labels, /Business proof/)
  assert.doesNotMatch(labels, /Memorandum/)
  assert.doesNotMatch(verification.readyChecklist("company", ["payment-links"]).map((item) => item.label).join(" "), /Memorandum/, "payment links needs no documents")
})

test("signup source carries intent in; plain visits clear a stale source", () => {
  onboarding.rememberSignupSource("?from=sales&product=in-store")
  onboarding.applySignupSource()
  let state = read()
  assert.deepEqual(state.source, { from: "sales", product: "in-store" })
  assert.equal(state.cart[0].qty, 2)
  assert.deepEqual(verification.chosenProducts(state), ["in-store"])
  onboarding.rememberSignupSource("?from=website&product=checkout")
  onboarding.rememberSignupSource("")
  assert.equal(onboarding.readSignupSource(), null)
})

test("a migrated merchant arrives with both old products live and verified", () => {
  onboarding.rememberSignupSource("?from=migrated")
  onboarding.applySignupSource()
  const state = read()
  assert.equal(state.journeys["in-store"].stage, "live")
  assert.equal(state.journeys["payment-links"].stage, "live")
  assert.equal(verification.verificationPhase(state), "approved")
})

test("leaving and returning: verification remembers its origin and summarises what's next", () => {
  onboarding.chooseProduct("payment-links")
  onboarding.setVerificationReturn("/payment-links")
  onboarding.updateGettingStarted((state) => ({ ...state, onlineProfile: identity }))
  onboarding.delegateModule("bank", "Rahul", "9812345678")
  const state = read()
  assert.equal(state.verification.returnTo, "/payment-links")
  const progress = verification.verificationProgress(state)
  assert.equal(progress.done, 1)
  assert.equal(progress.next.id, "owners")
  assert.deepEqual(progress.waitingOn, ["Rahul"])
  assert.equal(progress.readyToSign, false)
})

test("picking products drives what's chosen; started products can't be dropped", () => {
  assert.equal(read().selected, null)
  onboarding.selectProducts(["payment-links", "checkout"])
  assert.deepEqual(verification.chosenProducts(read()), ["payment-links", "checkout"])
  assert.ok(verification.requiredModules(verification.chosenProducts(read())).includes("documents"))
  onboarding.markTried("payment-links")
  onboarding.selectProducts(["in-store"])
  assert.deepEqual(verification.chosenProducts(read()), ["in-store", "payment-links"])
})
