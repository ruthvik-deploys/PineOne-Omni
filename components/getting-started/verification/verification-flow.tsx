"use client"

import { useEffect, useState } from "react"
import { ArrowRightIcon, CheckCircleIcon, ClipboardTextIcon, UserPlusIcon } from "@phosphor-icons/react"
import { toast } from "sonner"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import {
  deferModule,
  setVerificationStep,
  submitVerification,
  updateGettingStarted,
  useGettingStarted,
  useGettingStartedHydrated,
  type GettingStartedState,
  type ProductId,
  startHref,
} from "@/lib/getting-started"
import { canContinueOnline, createOnlineProfile, ONLINE_STEPS, updateOnlineProfile, type OnlineProfile, type OnlineStepId } from "@/lib/online-onboarding"
import {
  chosenProducts,
  flowSteps,
  MODULE_BY_ID,
  moduleOfStep,
  moduleStatus,
  nextOpenStep,
  outstandingModules,
  readyToSign,
  requiredModules,
  STATUS_LABEL,
  verificationPhase,
  verificationProgress,
  type ModuleId,
} from "@/lib/verification"
import { JourneyLink as Link, useJourneyRouter } from "../navigation"
import { PRODUCTS } from "../catalog"
import { SetupFrame } from "../setup-frame"
import { orderedProducts } from "../journey-logic"
import { onboardingSteps, productSteps } from "../product-steps"
import { StepMarker } from "../setup-ui"
import { PanDetails, GstDetails, WebsiteDetails, BusinessDocuments } from "../online/about-business"
import { BankDetails, Owners } from "../online/business-verification"
import { Signatory, PoliticalExposure, Identity, VideoKyc } from "../online/kyc"
import { ReviewDetails, Agreement } from "../online/review-and-sign"
import { themeClass } from "../online/fields"
import { DelegateDialog, ModuleStatusBadge, ReadyChecklist } from "./parts"
import { VerificationTimeline } from "./timeline"

const productList = (products: ProductId[]) => products.map((id) => PRODUCTS[id].shortName).join(", ")

/** Where "back" goes: the page verification was opened from, named for the breadcrumb. */
function returnTarget(state: GettingStartedState) {
  const href = state.verification.returnTo ?? "/"
  const product = (Object.keys(PRODUCTS) as ProductId[]).find((id) => PRODUCTS[id].href === href || href === `/onboarding/products/${id}`)
  return { href, label: product ? PRODUCTS[product].shortName : "Overview", product }
}

/** Leaving keeps everything; say what was saved and what's next, so the page they land on makes sense. */
function announceExit(state: GettingStartedState, products: ProductId[]) {
  const progress = verificationProgress(state, products)
  if (verificationPhase(state, products) === "in-review") return
  toast.success(`Verification saved · ${progress.done} of ${progress.total} done`, {
    description: progress.readyToSign ? "Everything's in. Review and sign when you're ready."
      : progress.next ? `Next: ${progress.next.label}${progress.waitingOn.length ? ` · waiting on ${progress.waitingOn.join(", ")}` : ""}`
      : progress.waitingOn.length ? `Waiting on ${progress.waitingOn.join(", ")}` : undefined,
  })
}

/**
 * One business verification for every product. The rail lists only the modules
 * the chosen products need; any of them can be opened in any order, left for
 * later, or handed to someone else.
 */
export function BusinessVerification() {
  const state = useGettingStarted()
  const hydrated = useGettingStartedHydrated()
  const router = useJourneyRouter()
  const products = chosenProducts(state)
  const phase = verificationPhase(state, products)

  useEffect(() => {
    if (hydrated && products.length === 0) router.replace("/")
  }, [hydrated, products.length, router])

  if (!hydrated || products.length === 0) return <div className="flex min-h-dvh items-center justify-center text-sm text-muted-foreground" role="status">Opening verification…</div>
  if (phase === "in-review" || phase === "approved") return <Frame state={state} products={products} step={null}><SubmittedView state={state} products={products} /></Frame>
  return <VerificationSteps state={state} products={products} />
}

function VerificationSteps({ state, products }: { state: GettingStartedState; products: ProductId[] }) {
  const steps = flowSteps(products)
  const profile = createOnlineProfile(state.onlineProfile ?? {})
  // Resume where they were, unless that section is finished (or signing isn't possible yet) — then jump to what's open.
  const saved = state.verification.current
  const savedModule = steps.includes(saved) ? moduleOfStep(saved) : null
  const resumable = savedModule !== null && (savedModule === "agreement"
    ? readyToSign(state, products) || saved === "review"
    : !["approved", "in-review", "done"].includes(moduleStatus(savedModule, state, products)))
  const step = resumable ? saved : nextOpenStep(state, products)
  const module = moduleOfStep(step)
  const spec = MODULE_BY_ID[module]
  const meta = ONLINE_STEPS.find((item) => item.id === step)!
  const [delegateOpen, setDelegateOpen] = useState(false)
  const router = useJourneyRouter()

  function patch(value: Partial<OnlineProfile>) {
    updateGettingStarted((current) => ({ ...current, onlineProfile: updateOnlineProfile(createOnlineProfile(current.onlineProfile ?? {}), value) }))
  }
  const go = (target: OnlineStepId) => setVerificationStep(target)

  /** After finishing, skipping or handing off a module, move to the next one that needs the merchant. */
  function moveOn(from: ModuleId, patchState?: (s: GettingStartedState) => GettingStartedState) {
    go(nextOpenStep(patchState ? patchState(state) : state, products, from))
  }

  function next() {
    if (step === "owners" && profile.ownersView === "declaration" && profile.hasOwners === "yes") { patch({ ownersView: "list" }); return }
    if (step === "agreement") {
      if (!readyToSign(state, products) || !profile.agreementAccepted) return
      submitVerification(products)
      return
    }
    if (step !== "review" && !canContinueOnline(step, profile)) return
    const inModule = spec.steps.filter((item) => steps.includes(item))
    const position = inModule.indexOf(step)
    if (position < inModule.length - 1) go(inModule[position + 1])
    else moveOn(module)
  }

  function previous() {
    const index = steps.indexOf(step)
    if (step === "owners" && profile.ownersView === "list") patch({ ownersView: "declaration" })
    else if (index > 0) go(steps[index - 1])
    // Account onboarding: the step before verification is choosing products.
    else if (!returnTarget(state).product) router.push(startHref())
    else { announceExit(state, products); router.push(returnTarget(state).href) }
  }

  function later() {
    deferModule(module)
    moveOn(module, (s) => ({ ...s, verification: { ...s.verification, deferred: [...s.verification.deferred, module] } }))
  }

  const props = { profile, patch }
  const content =
    step === "pan" ? <PanDetails {...props} />
    : step === "gst" ? <GstDetails {...props} />
    : step === "website" ? <WebsiteDetails {...props} />
    : step === "documents" ? <BusinessDocuments {...props} />
    : step === "bank" ? <BankDetails {...props} />
    : step === "owners" ? <Owners {...props} />
    : step === "signatory" ? <Signatory {...props} />
    : step === "political-exposure" ? <PoliticalExposure {...props} />
    : step === "identity" ? <Identity {...props} />
    : step === "video-kyc" ? <VideoKyc {...props} onComplete={() => moveOn("signatory")} />
    : step === "review" ? <ReviewStep state={state} products={products} profile={profile} onEdit={go} />
    : <AgreementStep state={state} products={products} {...props} />

  const ready = step === "owners" && profile.ownersView === "declaration" ? profile.hasOwners !== null
    : step === "review" ? readyToSign(state, products)
    : step === "agreement" ? readyToSign(state, products) && profile.agreementAccepted
    : canContinueOnline(step, profile)
  const status = moduleStatus(module, state, products)

  return (
    <Frame
      state={state}
      products={products}
      step={step}
      title={step === "agreement" ? "Sign once for every product" : meta.title}
      subtitle={step === "agreement" ? `Adds ${productList(products)} to your agreement.` : meta.description}
      eyebrow={`${spec.label} · about ${spec.time}`}
      onBack={previous}
      onContinue={step === "video-kyc" ? undefined : next}
      canContinue={ready}
      continueLabel={step === "agreement" ? "Sign and submit" : step === "review" ? "Continue to sign" : "Save & continue"}
      continueHint={step === "review" || step === "agreement" ? "Finish the items above before signing." : spec.canDefer ? "Complete the required details and verification to continue — or add this later." : "Complete the required details and verification to continue."}
      wide={["gst", "documents", "video-kyc", "review", "agreement"].includes(step)}
      footerExtra={status !== "done" && spec.canDefer ? <>
        <Button variant="ghost" size="lg" className="px-3" onClick={later}>I&apos;ll add this later</Button>
        {spec.delegateTo ? <Button variant="ghost" size="lg" className="px-3" onClick={() => setDelegateOpen(true)}><UserPlusIcon data-icon="inline-start" />Ask someone else</Button> : null}
      </> : null}
    >
      {content}
      {spec.delegateTo ? <DelegateDialog module={module} open={delegateOpen} onOpenChange={setDelegateOpen}
        onSent={() => moveOn(module, (s) => ({ ...s, verification: { ...s.verification, delegated: { ...s.verification.delegated, [module]: { name: "", contact: "", sentAt: "" } } } }))} /> : null}
    </Frame>
  )
}

function Frame({ state, products, step, children, ...frame }: {
  state: GettingStartedState; products: ProductId[]; step: OnlineStepId | null; children: React.ReactNode
} & Partial<Parameters<typeof SetupFrame>[0]>) {
  const modules = requiredModules(products)
  const done = modules.filter((id) => ["done", "in-review", "approved"].includes(moduleStatus(id, state, products))).length
  const currentModule = step ? moduleOfStep(step) : null
  const profile = createOnlineProfile(state.onlineProfile ?? {})
  const back = returnTarget(state)
  const router = useJourneyRouter()

  // The product's overall steps, with verification's sections nested under its step.
  // From a product page: that product's steps. From onboarding or Overview: the whole account's steps.
  const product = back.product ?? orderedProducts(state)[0] ?? products[0]
  const outer = back.product ? productSteps(state, product) : onboardingSteps(state, chosenProducts(state), true)
  const outerIndex = outer.findIndex((item) => item.id === "verify")

  const sections = (
    <ol aria-label="Verification sections" className="ml-[11px] mt-1 flex flex-col gap-0.5 border-l border-border pl-3">
      {modules.map((id) => {
        const spec = MODULE_BY_ID[id]
        const status = moduleStatus(id, state, products)
        const active = id === currentModule
        const target = spec.steps.find((item) => !canContinueOnline(item, profile)) ?? spec.steps[0]
        const locked = !step || (id === "agreement" && !readyToSign(state, products))
        const finished = ["done", "approved", "in-review"].includes(status)
        return (
          <li key={id}>
            <button
              type="button"
              disabled={locked}
              aria-current={active ? "step" : undefined}
              onClick={() => setVerificationStep(id === "agreement" ? "review" : target)}
              className={cn("flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors disabled:cursor-default", active ? "bg-sidebar-accent" : "hover:bg-sidebar-accent/60")}
            >
              {finished ? <CheckCircleIcon weight="fill" className="mt-0.5 shrink-0 text-success" aria-label="Completed" /> : <span className={cn("mt-1.5 size-1.5 shrink-0 rounded-full", active ? "bg-foreground" : "bg-muted-foreground/40")} aria-hidden="true" />}
              <span className="flex min-w-0 flex-col">
                <span className={cn(finished ? "text-muted-foreground" : "text-foreground", active && "font-medium")}>{spec.label}</span>
                {!finished && status !== "todo" ? <span className="text-xs text-muted-foreground">{status === "delegated" ? `With ${state.verification.delegated[id]?.name}` : STATUS_LABEL[status]}</span> : null}
              </span>
            </button>
          </li>
        )
      })}
    </ol>
  )

  const rail = (
    <ol aria-label={back.product ? `${PRODUCTS[product].shortName} setup` : "Account setup"} className="mt-6 flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
      {outer.map((item, index) => (
        <li key={item.id}>
          {item.id === "products" ? (
            <button type="button" onClick={() => router.push(startHref())} className="flex w-full items-start gap-3 rounded-md px-1 py-2 text-left text-sm text-muted-foreground hover:text-foreground">
              <StepMarker step={item} index={index} />
              <span className="flex flex-col">{item.title}<span className="text-xs">{item.caption} · Change</span></span>
            </button>
          ) : (
            <div className={cn("flex items-start gap-3 px-1 py-2 text-sm", item.id === "verify" ? "font-medium text-foreground" : "text-muted-foreground")}>
              <StepMarker step={item.id === "verify" ? { ...item, state: item.state === "done" ? "done" : "current" } : item} index={index} />
              <span className="flex flex-col">
                {item.title}
                {item.id === "verify" ? <span className="text-xs font-normal text-muted-foreground">{done} of {modules.length} done</span> : null}
              </span>
            </div>
          )}
          {item.id === "verify" ? sections : null}
        </li>
      ))}
    </ol>
  )

  return (
    <div className={themeClass}>
      <SetupFrame
        stepIndex={0}
        steps={modules.map((id) => MODULE_BY_ID[id].label)}
        flow={{ label: "Setting up", title: back.product ? PRODUCTS[product].name : "Your account", progress: `Step ${outerIndex + 1} of ${outer.length}`, header: "Verify your business" }}
        exit={{ ...back, onExit: () => announceExit(state, products) }}
        rail={rail}
        railFooter={<NeedHelpDialog products={products} />}
        title=""
        {...frame}
      >
        {children}
      </SetupFrame>
    </div>
  )
}

function NeedHelpDialog({ products }: { products: ProductId[] }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="mt-4 w-fit"><ClipboardTextIcon data-icon="inline-start" />What you&apos;ll need</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Have these ready</DialogTitle>
          <DialogDescription>For {productList(products)}. Missing something? Add it later or ask someone else.</DialogDescription>
        </DialogHeader>
        <ReadyChecklist products={products} />
      </DialogContent>
    </Dialog>
  )
}

function OutstandingAlert({ state, products, onGo }: { state: GettingStartedState; products: ProductId[]; onGo: (step: OnlineStepId) => void }) {
  const left = outstandingModules(state, products).filter((id) => id !== "agreement")
  if (!left.length) return null
  const profile = createOnlineProfile(state.onlineProfile ?? {})
  return (
    <Alert className="mb-6">
      <AlertTitle>{left.length === 1 ? "1 thing left before you can sign" : `${left.length} things left before you can sign`}</AlertTitle>
      <AlertDescription>
        <ul className="mt-2 flex w-full flex-col gap-2">
          {left.map((id) => {
            const spec = MODULE_BY_ID[id]
            const delegate = state.verification.delegated[id]
            return (
              <li key={id} className="flex flex-wrap items-center justify-between gap-2">
                <span className="flex items-center gap-2 text-foreground">{spec.label}<ModuleStatusBadge status={moduleStatus(id, state, products)} delegate={delegate?.name} /></span>
                {!delegate ? <Button variant="outline" size="sm" onClick={() => onGo(spec.steps.find((item) => !canContinueOnline(item, profile)) ?? spec.steps[0])}>Add now</Button> : null}
              </li>
            )
          })}
        </ul>
      </AlertDescription>
    </Alert>
  )
}

function ReviewStep({ state, products, profile, onEdit }: { state: GettingStartedState; products: ProductId[]; profile: OnlineProfile; onEdit: (step: OnlineStepId) => void }) {
  return <>
    <OutstandingAlert state={state} products={products} onGo={onEdit} />
    <ReviewDetails profile={profile} include={flowSteps(products)} onEdit={(index) => onEdit(ONLINE_STEPS[index].id as OnlineStepId)} />
  </>
}

function AgreementStep({ state, products, ...props }: { state: GettingStartedState; products: ProductId[]; profile: OnlineProfile; patch: (value: Partial<OnlineProfile>) => void }) {
  return <>
    <OutstandingAlert state={state} products={products} onGo={setVerificationStep} />
    <Agreement {...props} />
  </>
}

/** Mercury "You're all set": what happens now, how long, and what to do meanwhile. */
function SubmittedView({ state, products }: { state: GettingStartedState; products: ProductId[] }) {
  const approved = verificationPhase(state, products) === "approved"
  return (
    <div className="mx-auto flex max-w-[560px] flex-col gap-8 py-4">
      <div className="flex flex-col gap-2">
        <h1 className="font-heading text-2xl font-semibold leading-tight">{approved ? "Your business is verified" : "You're all set — we're reviewing your details"}</h1>
        <p className="text-sm leading-6 text-muted-foreground">
          {approved
            ? `${productList(products)} can use these details. You won't be asked again when you add another product.`
            : "This usually takes 1 working day. We'll message you when it's done, or if we need anything else."}
        </p>
      </div>
      <VerificationTimeline state={state} products={products} />
      <Button asChild size="lg" className="w-fit">
        <Link href={returnTarget(state).href}>Back to {returnTarget(state).label}<ArrowRightIcon data-icon="inline-end" /></Link>
      </Button>
    </div>
  )
}
