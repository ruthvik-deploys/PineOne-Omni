import assert from "node:assert/strict"
import { test } from "node:test"
import * as catalog from "../components/getting-started/catalog.ts"

test("unfinished In-store stages have a dedicated destination; online products stay on their page and verify once", () => {
  for (const stage of ["setup", "payment", "shipping", "install"]) {
    assert.equal(catalog.productJourneyHref("in-store", stage, 1), "/onboarding/products/in-store")
  }
  for (const product of ["payment-links", "checkout"]) {
    assert.equal(catalog.productJourneyHref(product, "setup", 3), catalog.PRODUCTS[product].href)
  }
  assert.equal(catalog.VERIFY_HREF, "/onboarding/products/verify")
})

test("In-store device selection happens on its product page before dedicated onboarding", () => {
  assert.equal(catalog.productJourneyHref("in-store", "intro", 0), catalog.PRODUCTS["in-store"].href)
  assert.equal(catalog.productJourneyHref("in-store", "setup", 0), catalog.PRODUCTS["in-store"].href)
  assert.equal(catalog.productJourneyHref("in-store", "setup", 1), "/onboarding/products/in-store")
})

test("the In-store onboarding rail starts at delivery after device selection", () => {
  const progress = catalog.productSetupProgress("in-store", 1)
  assert.equal(progress.index, 0)
  assert.equal(progress.steps[0], "Delivery address")
  assert.equal(progress.steps.length, 2)
  assert.equal(catalog.productSetupProgress("in-store", 2).index, 1)
  assert.equal(catalog.productSetupProgress("in-store", 4).index, 1, "older saves at the removed business/bank steps land on review")
  assert.equal(catalog.productSetupProgress("payment-links", 0).steps[0], "About business")
  assert.equal(catalog.productSetupProgress("checkout", 9).index, 2)
})

test("education and activated products return to their normal product pages", () => {
  for (const product of ["in-store", "payment-links", "checkout"]) {
    for (const stage of ["intro", "live"]) {
      assert.equal(catalog.productJourneyHref(product, stage), catalog.PRODUCTS[product].href)
    }
  }
})
