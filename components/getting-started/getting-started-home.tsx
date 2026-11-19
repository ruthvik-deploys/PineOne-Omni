"use client"

import { useState } from "react"
import { CaretRightIcon, ClipboardTextIcon, PlusIcon, QuestionIcon, XIcon } from "@phosphor-icons/react"
import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { cn } from "@/lib/utils"
import { dismissCrossSell, PRODUCT_IDS, selectProducts, type GettingStartedState, type ProductId, useGettingStarted } from "@/lib/getting-started"
import { chosenProducts } from "@/lib/verification"
import { INR, PRODUCTS } from "./catalog"
import { DeviceArt } from "./device-art"
import { crossSell, overviewPhase, productsConfirmed } from "./journey-logic"
import { JourneyLink as Link } from "./navigation"
import { onboardingSteps, type StepAction } from "./product-steps"
import { ProductPicker } from "./product-picker"
import { SetupStepperCard, StepperLink, useStepActions } from "./setup-ui"

function greeting() {
  const hour = new Date().getHours()
  return hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening"
}

/**
 * Overview follows Mercury Home: one setup card at the top (stepper + the
 * current step), then — once something is live — the greeting, quick actions
 * and pairs of equal cards. Before anything is chosen it's a short list of ways
 * to get paid (Shopify's "Sell in person" cards).
 */
export function GettingStartedHome() {
  const state = useGettingStarted()
  const phase = overviewPhase(state)
  const { run, dialogs } = useStepActions()

  return (
    <div className="mx-auto flex w-full max-w-[960px] flex-col gap-10 px-6 pb-16 pt-10">
      {phase === "live" ? <>
        <SetupCard state={state} onRun={run} />
        <CrossSellBanner state={state} onRun={run} />
        <LiveDashboard state={state} />
      </> : <>
        <PageTitle title={`${greeting()}, let's get started.`} />
        <SetupCard state={state} onRun={run} />
        {productsConfirmed(state) ? <WaysToGetPaid products={PRODUCT_IDS.filter((id) => !chosenProducts(state).includes(id))} onRun={run} heading="More ways to get paid" /> : null}
      </>}
      {dialogs}
    </div>
  )
}

function PageTitle({ title }: { title: string }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-3">
      <h1 className="font-heading text-[26px] font-medium leading-tight">{title}</h1>
      <p className="text-sm text-muted-foreground">Questions? <Link href="/support" className="font-medium text-foreground hover:underline">Get help</Link></p>
    </div>
  )
}

/* ---------- Setup ---------- */

/** One setup card for the whole account: choose products first, then only the steps they need. */
function SetupCard({ state, onRun }: { state: GettingStartedState; onRun: (action: StepAction) => void }) {
  const chosen = chosenProducts(state)
  const confirmed = productsConfirmed(state)
  const [draft, setDraft] = useState<ProductId[] | null>(null)
  const [editing, setEditing] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const picking = !confirmed || editing
  const products = picking ? draft ?? chosen : chosen
  const steps = onboardingSteps(state, products, !picking)
  if (!picking && chosen.every((id) => state.journeys[id].stage === "live")) return null // Nothing left to set up.

  function confirm() {
    selectProducts(products)
    setEditing(false)
    setDraft(null)
  }

  return <>
    <SetupStepperCard
      key={picking ? "picking" : "steps"}
      title="Set up your account"
      steps={steps}
      onRun={onRun}
      collapsible={!picking}
      extras={<>
        {picking ? <StepperLink onClick={() => setHelpOpen(true)}><QuestionIcon aria-hidden="true" />Help me choose</StepperLink> : null}
        {products.length ? <StepperLink onClick={() => onRun({ kind: "checklist", label: "", products })}><ClipboardTextIcon aria-hidden="true" />What you&apos;ll need</StepperLink> : null}
      </>}
      renderBody={(step) => step.id !== "products" ? null : picking ? (
        <div className="flex flex-col gap-5">
          <ProductPicker state={state} value={products} onChange={setDraft} />
          <div className="flex flex-wrap items-center gap-3">
            <Button size="lg" disabled={!products.length} onClick={confirm}>Continue</Button>
            {editing ? <Button size="lg" variant="ghost" onClick={() => { setEditing(false); setDraft(null) }}>Cancel</Button> : null}
            <span className="text-sm text-muted-foreground">{products.length ? `${products.length} selected` : "Select at least one"}</span>
          </div>
        </div>
      ) : (
        <Button variant="outline" size="lg" className="w-fit" onClick={() => { setDraft(chosen); setEditing(true) }}>Change products</Button>
      )}
    />
    <HelpMeChoose open={helpOpen} onOpenChange={setHelpOpen} onPick={(picks) => { setDraft(picks); setHelpOpen(false) }} />
  </>
}

/* ---------- Ways to get paid (Shopify "Sell in person") ---------- */

export function ProductArt({ product, className }: { product: ProductId; className?: string }) {
  const Icon = PRODUCTS[product].icon
  return (
    <div className={cn("flex shrink-0 items-center justify-center rounded-lg bg-muted", className)}>
      {product === "in-store" ? <DeviceArt id="touch-a910" className="size-16" /> : <Icon className="size-8 text-muted-foreground" aria-hidden="true" />}
    </div>
  )
}

function WaysToGetPaid({ products, onRun, heading }: { products: ProductId[]; onRun: (action: StepAction) => void; heading: string }) {
  if (!products.length) return null
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-base font-medium">{heading}</h2>
      </div>
      <div className={cn("grid gap-3", products.length > 1 && "md:grid-cols-2")}>
        {products.map((id) => {
          const meta = PRODUCTS[id]
          return (
            <Card key={id} size="sm" className="flex-row items-center gap-4 px-3">
              <ProductArt product={id} className="size-24" />
              <div className="flex min-w-0 flex-1 flex-col gap-1 py-1">
                <p className="text-xs text-muted-foreground">{meta.shortName}</p>
                <p className="text-sm font-medium leading-5">{meta.situation}</p>
                <div className="mt-2 flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => onRun(id === "in-store" ? { kind: "href", label: "", href: meta.href } : { kind: "try", label: "", product: id })}>{meta.firstStep}</Button>
                  <Button asChild variant="ghost" size="sm"><Link href={meta.href}>Learn more</Link></Button>
                </div>
              </div>
            </Card>
          )
        })}
      </div>
    </section>
  )
}

const QUESTIONS = [
  { id: "counter", text: "Do customers pay you at a shop or counter?", product: "in-store" as const },
  { id: "chat", text: "Do you take orders on WhatsApp or phone?", product: "payment-links" as const },
  { id: "site", text: "Do you have a website or app?", product: "checkout" as const },
]

export function HelpMeChoose({ open, onOpenChange, onPick }: { open: boolean; onOpenChange: (open: boolean) => void; onPick: (products: ProductId[]) => void }) {
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const picks = QUESTIONS.filter((question) => answers[question.id] === "yes").map((question) => question.product)
  const answered = QUESTIONS.every((question) => answers[question.id])
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>Which fits you?</DialogTitle>
          <DialogDescription>Answer three quick questions.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          {QUESTIONS.map((question) => (
            <div key={question.id} className="flex items-center justify-between gap-4">
              <p className="text-sm">{question.text}</p>
              <ToggleGroup type="single" variant="outline" size="sm" value={answers[question.id] ?? ""} onValueChange={(value) => value && setAnswers({ ...answers, [question.id]: value })} aria-label={question.text}>
                <ToggleGroupItem value="yes">Yes</ToggleGroupItem>
                <ToggleGroupItem value="no">No</ToggleGroupItem>
              </ToggleGroup>
            </div>
          ))}
        </div>
        {answered ? (
          <div className="flex items-center justify-between gap-3 rounded-lg bg-muted p-3 text-sm">
            <span>Suggested: <span className="font-medium">{(picks.length ? picks : ["payment-links" as const]).map((id) => PRODUCTS[id].shortName).join(", ")}</span></span>
            <Button size="sm" onClick={() => onPick(picks.length ? picks : ["payment-links"])}>Select these</Button>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

/* ---------- Live (Mercury Home) ---------- */

/** Mercury's promo banner: one suggestion, dismissible. */
function CrossSellBanner({ state, onRun }: { state: GettingStartedState; onRun: (action: StepAction) => void }) {
  const pitch = crossSell(state)
  if (!pitch) return null
  const meta = PRODUCTS[pitch.product]
  return (
    <Card className="flex-row items-center gap-6 bg-gradient-to-r from-muted/70 to-background px-6 py-5">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="text-lg font-medium leading-snug">{pitch.title}</p>
        <p className="text-sm text-muted-foreground">Your business is already verified.</p>
        <Button variant="link" className="mt-1 h-auto w-fit p-0" onClick={() => onRun(pitch.product === "in-store" ? { kind: "href", label: "", href: meta.href } : { kind: "try", label: "", product: pitch.product })}>
          {meta.firstStep}<CaretRightIcon data-icon="inline-end" />
        </Button>
      </div>
      <ProductArt product={pitch.product} className="hidden size-24 sm:flex" />
      <Button variant="ghost" size="icon-sm" className="self-start" aria-label="Not now" onClick={() => dismissCrossSell(pitch.id)}><XIcon /></Button>
    </Card>
  )
}

function Amount({ value }: { value: number }) {
  const [whole, paise] = INR.format(value).split(".")
  return <span className="text-[28px] font-medium tabular-nums leading-none">{whole}<sup className="ml-0.5 text-sm">{paise ?? "00"}</sup></span>
}

function LiveDashboard({ state }: { state: GettingStartedState }) {
  const live = PRODUCT_IDS.filter((id) => state.journeys[id].stage === "live")
  const links = state.paymentLinks.filter((link) => !link.test)
  const actions = [
    live.includes("payment-links") ? { label: "Create payment link", href: PRODUCTS["payment-links"].href } : null,
    live.includes("in-store") ? { label: "Order terminals", href: PRODUCTS["in-store"].href } : null,
    { label: "Payments", href: "/transactions" },
    { label: "Settlement", href: "/settlements" },
  ].filter(Boolean) as Array<{ label: string; href: string }>

  return (
    <section className="flex flex-col gap-6">
      <PageTitle title={greeting()} />
      <div className="flex flex-wrap gap-2">
        {actions.map((action, index) => (
          <Button key={action.label} asChild variant={index === 0 ? "default" : "outline"} size="sm" className="rounded-full px-3.5">
            <Link href={action.href}>{action.label}</Link>
          </Button>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardDescription>Payments today</CardDescription>
            <CardTitle><Amount value={0} /></CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex h-24 items-end border-b border-dashed border-border" aria-hidden="true" />
            <p className="mt-3 text-xs text-muted-foreground">Your first payment will show here.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Your products</CardTitle>
            <CardAction><Button asChild variant="ghost" size="icon-sm" aria-label="Add a product"><Link href={PRODUCTS[PRODUCT_IDS.find((id) => !live.includes(id)) ?? "checkout"].href}><PlusIcon /></Link></Button></CardAction>
          </CardHeader>
          <CardContent className="flex flex-col">
            {PRODUCT_IDS.filter((id) => chosenProducts(state).includes(id)).map((id) => {
              const Icon = PRODUCTS[id].icon
              const isLive = state.journeys[id].stage === "live"
              return (
                <Link key={id} href={PRODUCTS[id].href} className="flex items-center gap-3 rounded-md py-2.5 text-sm hover:bg-muted/50">
                  <span className="flex size-8 items-center justify-center rounded-full bg-muted"><Icon aria-hidden="true" /></span>
                  <span className="flex-1">{PRODUCTS[id].shortName}</span>
                  <span className={cn("text-xs", isLive ? "text-success" : "text-muted-foreground")}>{isLive ? "Live" : "Setting up"}</span>
                </Link>
              )
            })}
          </CardContent>
        </Card>
        <StatCard title="Settlement" href="/settlements" stats={[["Next", "—"], ["Last", "—"], ["Bank", state.bank ? `•• ${state.bank.account.slice(-4)}` : "—"]]} />
        {live.includes("payment-links")
          ? <StatCard title="Payment links" href={PRODUCTS["payment-links"].href} stats={[["Open", String(links.length)], ["Paid", "0"], ["Expired", "0"]]} />
          : live.includes("in-store")
            ? <StatCard title="Terminals" href={PRODUCTS["in-store"].href} stats={[["Active", String(state.order?.lines.reduce((sum, line) => sum + line.qty, 0) ?? 0)], ["Offline", "0"], ["On order", "0"]]} />
            : <StatCard title="Checkout" href={PRODUCTS.checkout.href} stats={[["Orders", "0"], ["Success rate", "—"], ["Mode", "Live"]]} />}
      </div>
    </section>
  )
}

/** Mercury's Bill Pay / Invoicing cards: three numbers and a way in. */
function StatCard({ title, href, stats }: { title: string; href: string; stats: Array<[string, string]> }) {
  return (
    <Card>
      <CardHeader><CardTitle className="text-sm font-medium">{title}</CardTitle></CardHeader>
      <CardContent className="grid grid-cols-3 gap-4">
        {stats.map(([label, value]) => (
          <div key={label} className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">{label}</span>
            <span className="text-sm tabular-nums">{value}</span>
          </div>
        ))}
      </CardContent>
      <CardFooter className="justify-end">
        <Button asChild variant="link" size="sm" className="h-auto p-0"><Link href={href}>View<CaretRightIcon data-icon="inline-end" /></Link></Button>
      </CardFooter>
    </Card>
  )
}
