"use client"

import { useState } from "react"
import { ClipboardTextIcon, HeadsetIcon, InfoIcon } from "@phosphor-icons/react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useGettingStarted, type ProductId } from "@/lib/getting-started"
import { PRODUCTS } from "./catalog"
import { CartSummary, DevicePicker } from "./product-setup"
import { productSteps } from "./product-steps"
import { chosenProducts } from "@/lib/verification"
import { SetupStepperCard, StepperLink, useStepActions } from "./setup-ui"

const MORE: Record<ProductId, Array<{ title: string; body: string }>> = {
  "in-store": [
    { title: "Choose a device and plan", body: "Compare terminals by how your store takes payments. Choose rent or buy and set the quantity before reviewing the full order total, including tax." },
    { title: "Follow your order", body: "Your order stays in In-store. Overview shows its latest status, from payment confirmation through delivery. When it arrives, the setup guide takes you through activation." },
    { title: "Know where your money is", body: "After setup, Payments shows customer payments taken on your terminals. Settlement shows when that money reaches your bank. Your hardware purchase is separate from these customer payments." },
  ],
  "payment-links": [
    { title: "Collect without a website", body: "Use a payment link for an order, invoice or booking. Choose an amount and description, then share the link with your customer." },
    { title: "Choose how links work", body: "Set expiry, accepted payment methods and reminders once. Business and bank details entered for another product are available here too." },
    { title: "Find links and payments", body: "Payment links is the home for links you create. Payments shows completed customer payments; Settlement tracks the money reaching your bank. Creating a link alone does not mean you have been paid." },
  ],
  checkout: [
    { title: "Verify your business", body: "Complete PAN, GST, document, bank and KYC verification. Website and app details can be explicitly skipped if you do not have them yet." },
    { title: "Use your own branding", body: "Preview your brand colour on the customer payment page. In a live account, you then connect your platform using its integration settings." },
    { title: "Manage it in Checkout", body: "Checkout is where your website integration and payment page settings belong. Payments and Settlement bring together activity from Checkout and any other products you activate." },
  ],
}

/**
 * A product before it's live: the same setup stepper as Overview, so progress
 * reads the same everywhere — steps already done show as done, each step's
 * progress sits under its name, and help sits under the list.
 */
export function ProductIntro({ product }: { product: ProductId }) {
  const meta = PRODUCTS[product]
  const state = useGettingStarted()
  const { run, dialogs } = useStepActions()
  const [howOpen, setHowOpen] = useState(false)
  const isInStore = product === "in-store"
  // A button that links to this same page adds nothing here.
  const steps = productSteps(state, product).map((step) =>
    step.primary?.kind === "href" && step.primary.href === meta.href ? { ...step, primary: undefined } : step)
  const products = Array.from(new Set([...chosenProducts(state), product]))

  return (
    <div className="mx-auto flex w-full max-w-[960px] flex-col gap-8 px-6 pb-16 pt-10">
      <header className="flex flex-col gap-2">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{meta.shortName}</p>
        <h1 className="font-heading text-[28px] font-medium leading-tight">{meta.headline}</h1>
        <p className="text-sm text-muted-foreground">{meta.pricing}</p>
      </header>
      <SetupStepperCard
        title={`Set up ${meta.shortName}`}
        steps={steps}
        onRun={run}
        collapsible={false}
        renderBody={(step) => isInStore && step.id === "devices" ? <DevicePicker cart={state.cart} />
          : isInStore && step.id === "order" && state.cart.length ? <CartSummary cart={state.cart} /> : null}
        extras={<>
          <StepperLink onClick={() => run({ kind: "checklist", label: "", products })}><ClipboardTextIcon aria-hidden="true" />What you&apos;ll need</StepperLink>
          <StepperLink onClick={() => setHowOpen(true)}><InfoIcon aria-hidden="true" />How it works</StepperLink>
          <StepperLink href="/support"><HeadsetIcon aria-hidden="true" />Get help</StepperLink>
        </>}
      />
      <HowItWorks product={product} open={howOpen} onOpenChange={setHowOpen} />
      {dialogs}
    </div>
  )
}

function HowItWorks({ product, open, onOpenChange }: { product: ProductId; open: boolean; onOpenChange: (open: boolean) => void }) {
  const meta = PRODUCTS[product]
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-[520px]">
        <DialogHeader><DialogTitle>How {meta.shortName.toLowerCase()} works</DialogTitle><DialogDescription>{meta.tagline}</DialogDescription></DialogHeader>
        <dl className="flex flex-col divide-y divide-border">{MORE[product].map((item) => <div key={item.title} className="py-4"><dt className="text-sm font-medium">{item.title}</dt><dd className="mt-1 text-sm leading-6 text-muted-foreground">{item.body}</dd></div>)}</dl>
      </DialogContent>
    </Dialog>
  )
}
