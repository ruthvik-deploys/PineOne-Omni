"use client"

import { useEffect, useState, type ReactNode } from "react"
import { CheckIcon, GlobeIcon, MinusIcon, PlusIcon, QuestionIcon, StorefrontIcon } from "@phosphor-icons/react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { cn } from "@/lib/utils"
import { rememberStartVariant, selectProducts, setVerificationReturn, useGettingStarted, type CartLine, type ProductId } from "@/lib/getting-started"
import { chosenProducts } from "@/lib/verification"
import { DEVICES, INR, PRODUCTS, VERIFY_HREF, type Device, type DeviceId } from "./catalog"
import { DeviceArt } from "./device-art"
import { HelpMeChoose } from "./getting-started-home"
import { useJourneyRouter } from "./navigation"
import { setCart } from "./product-setup"
import { onboardingSteps } from "./product-steps"
import { SetupFrame } from "./setup-frame"
import { StepMarker } from "./setup-ui"
import { themeClass } from "./online/fields"

type Filter = "all" | "in-store" | "online"
type OnlineId = Exclude<ProductId, "in-store">

const SECTIONS: Array<{ title: string; filter: Exclude<Filter, "all">; items: Array<{ device: DeviceId } | { product: OnlineId }> }> = [
  { title: "Swipe machines", filter: "in-store", items: [{ device: "touch-a910" }, { device: "mini-m50" }] },
  { title: "QR devices", filter: "in-store", items: [{ device: "qr-soundbox" }] },
  { title: "Online payments", filter: "online", items: [{ product: "payment-links" }, { product: "checkout" }] },
]

const AUDIENCE: Record<DeviceId | OnlineId, string> = {
  "touch-a910": "Medium & large businesses",
  "mini-m50": "On the move",
  "qr-soundbox": "Small businesses",
  "payment-links": "WhatsApp & phone orders",
  checkout: "Websites & apps",
}

const ONLINE_FEATURES: Record<OnlineId, string> = {
  "payment-links": "Share on WhatsApp, SMS or email • UPI, cards and netbanking • No website needed",
  checkout: "Payment page for your site or app • UPI, cards, wallets and EMI • Plugins for popular platforms",
}

/**
 * Variant B of onboarding step 1 (Figma "Choose products that fit your business
 * needs"): a catalogue of devices and online products with filters, grouped
 * sections and Add buttons, instead of three product checkboxes. Adding a device
 * selects In-store and fills the cart; the rest of onboarding is the same.
 */
export function OnboardingStartCatalog() {
  const state = useGettingStarted()
  const router = useJourneyRouter()
  useEffect(() => rememberStartVariant("catalog"), [])
  const [filter, setFilter] = useState<Filter>("all")
  const [helpOpen, setHelpOpen] = useState(false)
  const [details, setDetails] = useState<{ device: DeviceId } | { product: OnlineId } | null>(null)
  const [devices, setDevices] = useState<Record<string, number> | null>(null)
  const [online, setOnline] = useState<OnlineId[] | null>(null)

  const qty = devices ?? Object.fromEntries(state.cart.filter((line) => line.plan === "lifetime").map((line) => [line.deviceId, line.qty]))
  const onlinePicked = online ?? chosenProducts(state).filter((id): id is OnlineId => id !== "in-store")
  const deviceCount = Object.values(qty).reduce((sum, count) => sum + count, 0)
  const products: ProductId[] = [...(deviceCount ? ["in-store" as const] : []), ...onlinePicked]
  const steps = onboardingSteps(state, products, false)

  function setQty(id: DeviceId, next: number) {
    setDevices({ ...qty, [id]: Math.max(0, Math.min(20, next)) })
  }
  function toggleOnline(id: OnlineId) {
    setOnline(onlinePicked.includes(id) ? onlinePicked.filter((item) => item !== id) : [...onlinePicked, id])
  }
  function save() {
    if (devices) {
      const rental = state.cart.filter((line) => line.plan === "rental")
      const bought: CartLine[] = Object.entries(qty).filter(([, count]) => count > 0).map(([deviceId, count]) => ({ deviceId, plan: "lifetime", qty: count }))
      setCart([...rental, ...bought])
    }
    if (products.length) selectProducts(products)
  }
  function onContinue() {
    save()
    setVerificationReturn("/")
    router.push(VERIFY_HREF)
  }

  const summary = [
    ...DEVICES.filter((device) => qty[device.id]).map((device) => `${device.name} × ${qty[device.id]}`),
    ...onlinePicked.map((id) => PRODUCTS[id].shortName),
  ]

  const rail = (
    <ol aria-label="Account setup" className="mt-6 flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
      {steps.map((step, index) => (
        <li key={step.id} aria-current={step.state === "current" ? "step" : undefined} className={cn("flex items-start gap-3 px-1 py-2 text-sm", step.state === "current" ? "font-medium text-foreground" : "text-muted-foreground")}>
          <StepMarker step={step} index={index} />
          <span className="flex flex-col">
            {step.id === "products" ? "Select products" : step.title}
            {step.id === "products" && step.caption ? <span className="text-xs font-normal text-muted-foreground">{step.caption}</span> : null}
          </span>
        </li>
      ))}
    </ol>
  )

  return (
    <div className={themeClass}>
      <SetupFrame
        wide
        stepIndex={0}
        steps={steps.map((step) => step.title)}
        flow={{ label: "Setting up", title: "Your account", progress: `Step 1 of ${steps.length}`, header: "Select products" }}
        exit={{ href: "/", label: "Overview", onExit: save }}
        rail={rail}
        title="Choose products that fit your business needs"
        onContinue={onContinue}
        continueLabel={products.length ? `Continue with ${summary.length} ${summary.length === 1 ? "item" : "items"}` : "Continue"}
        canContinue={products.length > 0}
        continueHint="Add at least one product to continue."
        footerExtra={<>
          {summary.length ? <span className="hidden max-w-[360px] truncate text-sm text-muted-foreground md:inline">{summary.join(" · ")}</span> : null}
          <Button variant="ghost" size="lg" className="px-3" onClick={() => setHelpOpen(true)}><QuestionIcon data-icon="inline-start" />Help me choose</Button>
        </>}
      >
        <div className="flex flex-col gap-8">
          <ToggleGroup type="single" variant="outline" size="sm" spacing={2} value={filter} onValueChange={(value) => value && setFilter(value as Filter)} aria-label="Filter products" className="flex-wrap">
            <ToggleGroupItem value="all">All products</ToggleGroupItem>
            <ToggleGroupItem value="in-store"><StorefrontIcon data-icon="inline-start" />In-store products</ToggleGroupItem>
            <ToggleGroupItem value="online"><GlobeIcon data-icon="inline-start" />Online payment solutions</ToggleGroupItem>
          </ToggleGroup>

          {SECTIONS.filter((section) => filter === "all" || section.filter === filter).map((section) => (
            <section key={section.title} className="flex flex-col gap-4">
              <h2 className="text-lg font-medium">{section.title}</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {section.items.map((item) => "device" in item ? (
                  <DeviceCard key={item.device} device={DEVICES.find((device) => device.id === item.device)!} count={qty[item.device] ?? 0} onCount={(next) => setQty(item.device, next)} onMore={() => setDetails(item)} />
                ) : (
                  <OnlineCard key={item.product} product={item.product} added={onlinePicked.includes(item.product)} onToggle={() => toggleOnline(item.product)} onMore={() => setDetails(item)} />
                ))}
              </div>
            </section>
          ))}
        </div>
      </SetupFrame>

      <KnowMore item={details} onOpenChange={(open) => { if (!open) setDetails(null) }} added={details ? ("device" in details ? (qty[details.device] ?? 0) > 0 : onlinePicked.includes(details.product)) : false}
        onAdd={() => { if (!details) return; if ("device" in details) setQty(details.device, Math.max(1, qty[details.device] ?? 0)); else if (!onlinePicked.includes(details.product)) toggleOnline(details.product); setDetails(null) }} />
      <HelpMeChoose open={helpOpen} onOpenChange={setHelpOpen} onPick={(picks) => {
        setOnline(picks.filter((id): id is OnlineId => id !== "in-store"))
        if (picks.includes("in-store") && !deviceCount) setQty("touch-a910", 1)
        setHelpOpen(false)
      }} />
    </div>
  )
}

function ProductCard({ art, audience, title, features, price, actions }: { art: ReactNode; audience: string; title: string; features: string; price: string; actions: ReactNode }) {
  return (
    <Card className="gap-0 py-0">
      <div className="relative m-3 mb-0 flex h-40 items-center justify-center rounded-lg bg-muted">
        {art}
        <Badge variant="secondary" className="absolute left-0 top-3 rounded-l-none font-normal">{audience}</Badge>
      </div>
      <CardHeader className="gap-1.5 px-4 pt-4">
        <CardTitle className="text-base font-medium">{title}</CardTitle>
        <CardDescription className="leading-5 text-foreground">{features}</CardDescription>
        <CardDescription className="text-xs">{price}</CardDescription>
      </CardHeader>
      <div className="mt-auto flex items-center justify-end gap-2 px-4 pb-4 pt-4">{actions}</div>
    </Card>
  )
}

function DeviceCard({ device, count, onCount, onMore }: { device: Device; count: number; onCount: (next: number) => void; onMore: () => void }) {
  return (
    <ProductCard
      art={<DeviceArt id={device.id} className="size-32" />}
      audience={AUDIENCE[device.id]}
      title={device.name}
      features={device.features}
      price={`${INR.format(device.lifetime)} or ${INR.format(device.rentalMonthly)}/month`}
      actions={<>
        <Button variant="link" size="sm" onClick={onMore}>Know more</Button>
        {count ? (
          <div className="flex items-center gap-1 rounded-md border" role="group" aria-label={`${device.name} quantity`}>
            <Button variant="ghost" size="icon-sm" aria-label="Remove one" onClick={() => onCount(count - 1)}><MinusIcon /></Button>
            <span className="w-6 text-center text-sm tabular-nums" aria-live="polite">{count}</span>
            <Button variant="ghost" size="icon-sm" aria-label="Add one" onClick={() => onCount(count + 1)}><PlusIcon /></Button>
          </div>
        ) : <Button variant="outline" onClick={() => onCount(1)}>Add</Button>}
      </>}
    />
  )
}

function OnlineCard({ product, added, onToggle, onMore }: { product: OnlineId; added: boolean; onToggle: () => void; onMore: () => void }) {
  const meta = PRODUCTS[product]
  const Icon = meta.icon
  return (
    <ProductCard
      art={<span className="flex size-20 items-center justify-center rounded-2xl bg-background"><Icon className="size-9 text-foreground" aria-hidden="true" /></span>}
      audience={AUDIENCE[product]}
      title={meta.shortName}
      features={ONLINE_FEATURES[product]}
      price={meta.pricing}
      actions={<>
        <Button variant="link" size="sm" onClick={onMore}>Know more</Button>
        <Button variant={added ? "secondary" : "outline"} onClick={onToggle} aria-pressed={added}>{added ? <><CheckIcon data-icon="inline-start" />Added</> : "Add"}</Button>
      </>}
    />
  )
}

function KnowMore({ item, added, onAdd, onOpenChange }: { item: { device: DeviceId } | { product: OnlineId } | null; added: boolean; onAdd: () => void; onOpenChange: (open: boolean) => void }) {
  const device = item && "device" in item ? DEVICES.find((entry) => entry.id === item.device)! : null
  const product = item && "product" in item ? item.product : null
  const title = device ? device.name : product ? PRODUCTS[product].shortName : ""
  const kind = device ? device.kind : product ? PRODUCTS[product].situation : ""
  const features = (device ? device.features : product ? ONLINE_FEATURES[product] : "").split(" • ")
  const facts: Array<[string, string]> = device
    ? [["Buy", INR.format(device.lifetime)], ["Rent", `${INR.format(device.rentalMonthly)}/month + ${INR.format(device.rentalSetup)} setup`], ["Tip", device.sizingHint]]
    : product ? [["Pricing", PRODUCTS[product].pricing], ["Time to start", PRODUCTS[product].time]] : []
  return (
    <Dialog open={Boolean(item)} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{kind}</DialogDescription>
        </DialogHeader>
        {device ? <div className="flex h-40 items-center justify-center rounded-lg bg-muted"><DeviceArt id={device.id} className="size-32" /></div> : null}
        <ul className="flex flex-col gap-2 text-sm">
          {features.map((feature) => <li key={feature} className="flex items-center gap-2"><CheckIcon className="text-success" aria-hidden="true" />{feature}</li>)}
        </ul>
        <dl className="flex flex-col gap-2 text-sm">
          {facts.map(([label, value]) => <div key={label} className="flex gap-4"><dt className="w-24 shrink-0 text-muted-foreground">{label}</dt><dd>{value}</dd></div>)}
        </dl>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          <Button onClick={onAdd} disabled={added}>{added ? "Added" : "Add"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
