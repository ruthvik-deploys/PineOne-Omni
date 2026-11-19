"use client"

import { useEffect, useState } from "react"
import { QuestionIcon } from "@phosphor-icons/react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { rememberStartVariant, selectProducts, setVerificationReturn, useGettingStarted, type ProductId } from "@/lib/getting-started"
import { chosenProducts } from "@/lib/verification"
import { VERIFY_HREF } from "./catalog"
import { HelpMeChoose } from "./getting-started-home"
import { useJourneyRouter } from "./navigation"
import { ProductPicker } from "./product-picker"
import { onboardingSteps } from "./product-steps"
import { SetupFrame } from "./setup-frame"
import { StepMarker } from "./setup-ui"
import { themeClass } from "./online/fields"

/**
 * Onboarding starts here, straight after signup: choose products. The rail
 * shows the steps those products need and updates as boxes are ticked.
 * Continue goes straight into business verification.
 */
export function OnboardingStart() {
  const state = useGettingStarted()
  const router = useJourneyRouter()
  useEffect(() => rememberStartVariant("cards"), [])
  const [draft, setDraft] = useState<ProductId[] | null>(null)
  const [helpOpen, setHelpOpen] = useState(false)
  const products = draft ?? chosenProducts(state)
  const steps = onboardingSteps(state, products, false)

  function onContinue() {
    selectProducts(products)
    setVerificationReturn("/")
    router.push(VERIFY_HREF)
  }

  const rail = (
    <ol aria-label="Account setup" className="mt-6 flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
      {steps.map((step, index) => (
        <li key={step.id} aria-current={step.state === "current" ? "step" : undefined} className={cn("flex items-start gap-3 px-1 py-2 text-sm", step.state === "current" ? "font-medium text-foreground" : "text-muted-foreground")}>
          <StepMarker step={step} index={index} />
          <span className="flex flex-col">
            {step.title}
            {step.id === "products" && step.caption ? <span className="text-xs font-normal text-muted-foreground">{step.caption}</span> : null}
          </span>
        </li>
      ))}
    </ol>
  )

  return (
    <div className={themeClass}>
      <SetupFrame
        stepIndex={0}
        steps={steps.map((step) => step.title)}
        flow={{ label: "Setting up", title: "Your account", progress: `Step 1 of ${steps.length}`, header: "Choose your products" }}
        exit={{ href: "/", label: "Overview", onExit: () => { if (products.length) selectProducts(products) } }}
        rail={rail}
        title="How do your customers pay you?"
        subtitle="Pick one or more. We'll only ask for what these products need, and you can add more later."
        onContinue={onContinue}
        canContinue={products.length > 0}
        continueHint="Select at least one product to continue."
        footerExtra={<Button variant="ghost" size="lg" className="px-3" onClick={() => setHelpOpen(true)}><QuestionIcon data-icon="inline-start" />Help me choose</Button>}
      >
        <ProductPicker state={state} value={products} onChange={setDraft} />
      </SetupFrame>
      <HelpMeChoose open={helpOpen} onOpenChange={setHelpOpen} onPick={(picks) => { setDraft(picks); setHelpOpen(false) }} />
    </div>
  )
}
