import type { Icon } from "@phosphor-icons/react"
import { FileTextIcon, ShieldCheckIcon, WalletIcon } from "@phosphor-icons/react"
import { orderCanShip, type GettingStartedState, type ProductId } from "@/lib/getting-started"
import { chosenProducts, MODULE_BY_ID, moduleStatus, productVerified, requiredModules, STATUS_LABEL, verificationPhase, verificationProgress } from "@/lib/verification"
import { PRODUCTS, VERIFY_HREF } from "./catalog"
import { hasTried } from "./journey-logic"
import { ORDER_STATUS_COPY } from "./terminal-journey"

/** Something a step's button does. One shape so Overview and product pages run steps the same way. */
export type StepAction =
  | { kind: "href"; label: string; href: string }
  | { kind: "try"; label: string; product: ProductId }
  | { kind: "checklist"; label: string; products: ProductId[] }
  | { kind: "approve"; label: string }
  | { kind: "start-in-store"; label: string }

export type StepPoint = { icon: Icon; text: string; status?: string }

export type StepSpec = {
  id: string
  title: string
  state: "done" | "current" | "todo"
  /** Progress shown under the step's name in the stepper ("2 of 5 done", "In review"). */
  caption?: string
  time?: string
  /** One sentence: what this step is and why it matters. */
  summary: string
  points?: StepPoint[]
  primary?: StepAction
  secondary?: StepAction
}

const verifyPoints = (state: GettingStartedState, products: ProductId[]): StepPoint[] =>
  requiredModules(products).map((id) => {
    const status = moduleStatus(id, state, products)
    const delegate = state.verification.delegated[id]?.name
    return {
      icon: id === "bank" ? WalletIcon : id === "documents" ? FileTextIcon : ShieldCheckIcon,
      text: MODULE_BY_ID[id].label,
      status: status === "todo" ? MODULE_BY_ID[id].time : status === "delegated" && delegate ? `With ${delegate}` : STATUS_LABEL[status],
    }
  })

function verifyStep(state: GettingStartedState, product: ProductId, forProducts: ProductId[] = [product]): StepSpec {
  const products = Array.from(new Set([...chosenProducts(state), ...forProducts]))
  const phase = verificationPhase(state, products)
  const verified = forProducts.every((id) => productVerified(id, state))
  if (verified) return { id: "verify", title: "Verify your business", state: "done", summary: "Verified. Every product you add uses these details." }
  if (phase === "in-review") return {
    id: "verify", title: "Verify your business", state: "current", caption: "In review", time: "Usually 1 working day",
    summary: "We're reviewing your details. We'll message you when it's done.",
    secondary: { kind: "approve", label: "Simulate approval (demo)" },
  }
  const progress = verificationProgress(state, products)
  if (phase === "not-started") return {
    id: "verify", title: "Verify your business", state: "todo", time: "About 15 min",
    summary: "Needed for real payments. Done once, for every product.",
    primary: { kind: "href", label: "Start verification", href: VERIFY_HREF },
  }
  const waiting = progress.waitingOn.length ? ` Waiting on ${progress.waitingOn.join(", ")}.` : ""
  return {
    id: "verify", title: "Verify your business", state: "todo",
    caption: progress.readyToSign ? "Ready to sign" : `${progress.done} of ${progress.total} done`,
    summary: progress.readyToSign ? "Everything's in. Review and sign to finish." : `${progress.done} of ${progress.total} done.${waiting}`,
    points: verifyPoints(state, products),
    primary: { kind: "href", label: progress.readyToSign ? "Review and sign" : progress.next ? `Continue: ${progress.next.short}` : "Continue verification", href: VERIFY_HREF },
  }
}

/** The handful of steps that take one product from "never heard of it" to live. */
export function productSteps(state: GettingStartedState, product: ProductId): StepSpec[] {
  return withOneCurrent(rawProductSteps(state, product))
}

function rawProductSteps(state: GettingStartedState, product: ProductId): StepSpec[] {
  const meta = PRODUCTS[product]
  const live = state.journeys[product].stage === "live"
  const tried = hasTried(state, product)
  let steps: StepSpec[]

  if (product === "in-store") {
    const { stage } = state.journeys["in-store"]
    const ordered = ["shipping", "install", "live"].includes(stage)
    const order = state.order
    const held = order?.status === "packed" && !orderCanShip(state)
    steps = [
      {
        id: "devices", title: "Choose your terminals", state: tried ? "done" : "todo", time: "2 min",
        caption: state.cart.length ? `${state.cart.reduce((sum, line) => sum + line.qty, 0)} selected` : undefined,
        summary: "Pick devices for your counter. Buy or rent.",
        primary: tried ? { kind: "start-in-store", label: "Continue to delivery and payment" } : { kind: "href", label: "Choose terminals", href: meta.href },
      },
      {
        id: "order", title: "Delivery and payment", state: ordered ? "done" : "todo", time: "3 min",
        caption: stage === "payment" ? "Payment pending" : stage === "setup" && state.journeys["in-store"].step > 0 ? "In progress" : undefined,
        summary: "Where to deliver, then pay. Ships once you're verified.",
        primary: !tried ? undefined
          : stage === "intro" || (stage === "setup" && state.journeys["in-store"].step === 0) ? { kind: "start-in-store", label: "Continue to delivery and payment" }
          : { kind: "href", label: stage === "payment" ? "Pay for your order" : "Continue your order", href: "/onboarding/products/in-store" },
      },
      verifyStep(state, product),
      {
        id: "install", title: "Delivery and setup", state: live ? "done" : "todo",
        caption: order && !live ? (held ? "Waiting on verification" : ORDER_STATUS_COPY[order.status].label) : undefined, time: stage === "install" ? "About 15 min" : order ? undefined : "3 to 5 days",
        summary: stage === "install" ? "They've arrived. Set them up and run a test payment." : held ? "Packed. Ships once you're verified." : order ? ORDER_STATUS_COPY[order.status].body : "Track it here, then set up with the guide.",
        primary: order ? { kind: "href", label: stage === "install" ? "Set up your terminals" : "Track order", href: "/onboarding/products/in-store" } : undefined,
      },
    ]
  } else {
    const isLinks = product === "payment-links"
    steps = [
      {
        id: "try", title: meta.firstStep, state: tried ? "done" : "todo", time: "1 min",
        summary: isLinks ? "See what your customer gets. Test money, nothing to fill in." : "See your payment page and try a test payment. Nothing to fill in.",
        primary: { kind: "try", label: meta.firstStep, product },
      },
      verifyStep(state, product),
      {
        id: "live", title: isLinks ? "Go live" : "Connect your site and go live", state: live ? "done" : "todo",
        summary: isLinks ? "Share real links. Money reaches your bank the next working day." : "Switch your site to live keys. Money reaches your bank the next working day.",
        primary: live ? { kind: "href", label: `Open ${meta.shortName}`, href: meta.href } : undefined,
      },
    ]
  }

  return steps
}

/** Exactly one current step: the first one that isn't done (unless a step marked itself current, e.g. "in review"). */
function withOneCurrent(steps: StepSpec[]): StepSpec[] {
  if (steps.some((step) => step.state === "current")) return steps
  const firstOpen = steps.findIndex((step) => step.state !== "done")
  return steps.map((step, index) => index === firstOpen ? { ...step, state: "current" } : step)
}

/**
 * Onboarding as one list: pick products, verify the business once for all of
 * them, then only the steps those products need (tries, In-store's order,
 * each product's go-live step).
 */
export function onboardingSteps(state: GettingStartedState, products: ProductId[], confirmed: boolean): StepSpec[] {
  const names = products.map((id) => PRODUCTS[id].shortName)
  const choose: StepSpec = {
    id: "products", title: "Choose your products", state: confirmed ? "done" : "current",
    caption: names.length ? names.join(", ") : "Pick one or more",
    summary: confirmed ? "You can add another product any time." : "Pick how your customers will pay you. We'll only ask for what those products need.",
  }
  if (!products.length) return [
    choose,
    { id: "verify", title: "Verify your business", state: "todo", summary: "Needed for real payments. Done once, for every product." },
    { id: "live", title: "Go live", state: "todo", summary: "Start taking real payments." },
  ]

  const per = Object.fromEntries(products.map((id) => [id, rawProductSteps(state, id)])) as Record<ProductId, StepSpec[]>
  const pick = (id: ProductId, stepId: string) => per[id].find((step) => step.id === stepId)
  const multi = products.length > 1
  const label = (step: StepSpec, id: ProductId) => ({ ...step, id: `${id}:${step.id}` })
  const tries = products.filter((id) => id !== "in-store").map((id) => label(pick(id, "try")!, id))
  const order = products.includes("in-store") ? [pick("in-store", "devices")!, pick("in-store", "order")!].map((step) => label(step, "in-store")) : []
  const verify = { ...verifyStep(state, products[0], products), id: "verify" }
  const live = products.map((id) => {
    const step = id === "in-store" ? pick(id, "install")! : pick(id, "live")!
    return label(id === "payment-links" && multi ? { ...step, title: "Go live with Payment links" } : step, id)
  })
  // In review keeps verification current only while nothing before it is still open.
  const steps = [choose, verify, ...tries, ...order, ...live].map((step) => ({ ...step, state: step.state === "current" && step.id !== "products" ? "todo" as const : step.state }))
  const reviewing = verificationPhase(state, products) === "in-review"
  const firstOpen = steps.findIndex((step) => step.state !== "done")
  return steps.map((step, index) => index === firstOpen || (reviewing && step.id === "verify" && steps.slice(0, index).every((prior) => prior.state === "done"))
    ? { ...step, state: "current" as const } : step)
}

/** Rough minutes left, for "About N min left" lines. */
export function stepsLeft(steps: StepSpec[]) {
  return steps.filter((step) => step.state !== "done").length
}
