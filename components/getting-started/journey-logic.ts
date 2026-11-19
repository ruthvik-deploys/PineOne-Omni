import type { GettingStartedState, ProductId } from "@/lib/getting-started"
import { chosenProducts, verificationPhase } from "@/lib/verification"

export type OverviewPhase = "explore" | "start" | "waiting" | "live"

export function hasTried(state: GettingStartedState, product: ProductId) {
  return product === "in-store" ? state.cart.length > 0 || state.journeys["in-store"].stage !== "intro" : state.tried.includes(product)
}

/** The product the merchant came for (source) or chose first. */
export function primaryProduct(state: GettingStartedState): ProductId | null {
  const chosen = chosenProducts(state)
  if (state.source?.product && chosen.includes(state.source.product)) return state.source.product
  return [...chosen].sort((a, b) => (state.journeys[a].updatedAt ?? "9").localeCompare(state.journeys[b].updatedAt ?? "9"))[0] ?? null
}

export function orderedProducts(state: GettingStartedState): ProductId[] {
  const primary = primaryProduct(state)
  const chosen = chosenProducts(state)
  return primary ? [primary, ...chosen.filter((id) => id !== primary)] : chosen
}

/** The merchant has picked their products (first onboarding step), or already has one live. */
export function productsConfirmed(state: GettingStartedState) {
  return state.selected !== null || chosenProducts(state).some((id) => state.journeys[id].stage === "live")
}

export function overviewPhase(state: GettingStartedState): OverviewPhase {
  const chosen = chosenProducts(state)
  if (chosen.some((id) => state.journeys[id].stage === "live")) return "live"
  if (!chosen.length) return "explore"
  const inStore = state.journeys["in-store"].stage
  if (verificationPhase(state, chosen) === "in-review" || inStore === "shipping") return "waiting"
  return "start"
}

/** Suggest one more product, in the merchant's situation, once something is live. */
export function crossSell(state: GettingStartedState): { id: string; product: ProductId; title: string; body: string } | null {
  const live = (id: ProductId) => state.journeys[id].stage === "live"
  const untouched = (id: ProductId) => !chosenProducts(state).includes(id)
  const fresh = (id: string) => {
    const dismissed = state.crossSellDismissed[id]
    return !dismissed || Date.now() - new Date(dismissed).getTime() > 30 * 24 * 3600 * 1000
  }
  const options = [
    { id: "in-store>links", when: live("in-store") && untouched("payment-links"), product: "payment-links" as const, title: "Take advance payments before customers visit", body: "Send a payment link on WhatsApp for bookings and large orders. Your business is already verified, so it's ready in minutes." },
    { id: "links>checkout", when: live("payment-links") && untouched("checkout"), product: "checkout" as const, title: "Customers ordering from your website too?", body: "Checkout puts payment on your site or app. You only add your website details — everything else is already verified." },
    { id: "online>in-store", when: (live("payment-links") || live("checkout")) && untouched("in-store"), product: "in-store" as const, title: "Selling at a counter as well?", body: "Add In-store terminals. Same account, same verification, one settlement to your bank." },
  ]
  return options.find((option) => option.when && fresh(option.id)) ?? null
}
