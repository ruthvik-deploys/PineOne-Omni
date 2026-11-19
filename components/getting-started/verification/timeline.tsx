"use client"

import { CheckIcon } from "@phosphor-icons/react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { approveVerification, type GettingStartedState, type ProductId } from "@/lib/getting-started"
import { verificationPhase } from "@/lib/verification"
import { PRODUCTS } from "../catalog"

const WHEN_APPROVED: Record<ProductId, string> = {
  "in-store": "Your terminals ship. In-store goes live once they're set up.",
  "payment-links": "Payment links goes live — share real links.",
  checkout: "Checkout goes live — switch your site to live keys.",
}

function day(iso?: string | null) {
  return iso ? new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : ""
}

/** Mercury-style application timeline: Submitted → In review → Ready. */
export function VerificationTimeline({ state, products, compact = false }: { state: GettingStartedState; products: ProductId[]; compact?: boolean }) {
  const approved = verificationPhase(state, products) === "approved"
  const steps = [
    { title: "Details submitted", body: day(state.verification.submittedAt), done: true, current: false },
    { title: "In review", body: approved ? "Done" : "Usually 1 working day", done: approved, current: !approved },
    { title: "Ready", body: products.map((id) => WHEN_APPROVED[id]).join(" "), done: approved, current: false },
  ]
  return (
    <div className="flex flex-col gap-4">
      <ol className="flex flex-col">
        {steps.map((step, index) => (
          <li key={step.title} className="relative flex gap-3 pb-5 last:pb-0">
            {index < steps.length - 1 ? <span className={cn("absolute left-[9px] top-6 h-[calc(100%-20px)] w-px", step.done ? "bg-success" : "bg-border")} aria-hidden="true" /> : null}
            <span className={cn("mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full", step.done ? "bg-success text-white" : step.current ? "border-2 border-primary bg-background" : "border border-border bg-background")}>
              {step.done ? <CheckIcon weight="bold" className="size-3" /> : null}
            </span>
            <div className="min-w-0">
              <p className={cn("text-sm font-medium", !step.done && !step.current && "text-muted-foreground")}>{step.title}</p>
              {step.body && !compact ? <p className="mt-0.5 text-xs leading-5 text-muted-foreground">{step.body}</p> : null}
            </div>
          </li>
        ))}
      </ol>
      {!approved ? (
        <Button variant="outline" size="sm" className="w-fit" onClick={approveVerification}>
          Simulate approval (demo)
        </Button>
      ) : null}
      <p className="sr-only">Products covered: {products.map((id) => PRODUCTS[id].shortName).join(", ")}</p>
    </div>
  )
}
