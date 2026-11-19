"use client"

import { useState, type ReactNode } from "react"
import { CaretDownIcon, CheckIcon, ClockIcon } from "@phosphor-icons/react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import { approveVerification, setVerificationReturn, startProductSetup, type ProductId } from "@/lib/getting-started"
import { JourneyLink as Link, useJourneyPathname, useJourneyRouter } from "./navigation"
import { VERIFY_HREF } from "./catalog"
import type { StepAction, StepSpec } from "./product-steps"
import { TryProductDialog } from "./try-product"
import { ReadyChecklist } from "./verification/parts"

/** Runs any step action and renders the dialogs those actions open. */
export function useStepActions() {
  const router = useJourneyRouter()
  const pathname = useJourneyPathname()
  const [trying, setTrying] = useState<ProductId | null>(null)
  const [checklist, setChecklist] = useState<ProductId[] | null>(null)

  function run(action: StepAction) {
    if (action.kind === "href") {
      if (action.href === VERIFY_HREF) setVerificationReturn(pathname)
      router.push(action.href)
    }
    else if (action.kind === "try") setTrying(action.product)
    else if (action.kind === "checklist") setChecklist(action.products)
    else if (action.kind === "start-in-store") { startProductSetup("in-store", 1); router.push("/onboarding/products/in-store") }
    else approveVerification()
  }

  const dialogs = <>
    {trying ? <TryProductDialog product={trying} open onOpenChange={(open) => { if (!open) setTrying(null) }} /> : null}
    <Dialog open={Boolean(checklist)} onOpenChange={(open) => { if (!open) setChecklist(null) }}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>Have these ready</DialogTitle>
          <DialogDescription>Missing something? Start anyway — add it later or ask someone else.</DialogDescription>
        </DialogHeader>
        {checklist ? <ReadyChecklist products={checklist} /> : null}
      </DialogContent>
    </Dialog>
  </>
  return { run, dialogs }
}

export function StepMarker({ step, index, size = "md" }: { step: StepSpec; index: number; size?: "md" | "lg" }) {
  return (
    <span className={cn(
      "flex shrink-0 items-center justify-center rounded-full text-xs font-medium",
      size === "lg" ? "size-6" : "size-5",
      step.state === "done" ? "bg-success/15 text-success" : step.state === "current" ? "bg-primary text-primary-foreground" : "border border-border text-muted-foreground",
    )}>
      {step.state === "done" ? <CheckIcon weight="bold" className="size-3" /> : index + 1}
    </span>
  )
}

function StepButtons({ step, onRun, primaryEmphasis = true }: { step: StepSpec; onRun: (action: StepAction) => void; primaryEmphasis?: boolean }) {
  if (!step.primary && !step.secondary) return null
  return (
    <div className="flex flex-wrap items-center gap-3">
      {step.primary ? <Button size="lg" variant={primaryEmphasis ? "default" : "outline"} onClick={() => onRun(step.primary!)}>{step.primary.label}</Button> : null}
      {step.secondary ? <Button size="lg" variant="ghost" onClick={() => onRun(step.secondary!)}>{step.secondary.label}</Button> : null}
      {step.time ? <span className="flex items-center gap-1.5 text-sm text-muted-foreground"><ClockIcon aria-hidden="true" />{step.time}</span> : null}
    </div>
  )
}

function StepPoints({ step }: { step: StepSpec }) {
  if (!step.points?.length) return null
  return (
    <ul className="flex flex-col gap-3">
      {step.points.map((point) => {
        const Icon = point.icon
        return (
          <li key={point.text} className="flex items-center gap-3 text-sm">
            <Icon className="shrink-0 text-muted-foreground" aria-hidden="true" />
            <span className="flex-1 text-foreground">{point.text}</span>
            {point.status ? <span className="text-xs text-muted-foreground">{point.status}</span> : null}
          </li>
        )
      })}
    </ul>
  )
}

/** Small links under the step list: what you'll need, how it works, help. */
export function StepperLink({ children, onClick, href }: { children: ReactNode; onClick?: () => void; href?: string }) {
  const className = "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground [&_svg]:size-4"
  return href ? <Link href={href} className={className}>{children}</Link> : <button type="button" onClick={onClick} className={className}>{children}</button>
}

/**
 * Mercury Home's setup card: vertical stepper on the left (with each step's
 * progress and a few helper links), the selected step's detail on the right.
 * Used on Overview and on each product's page, so progress looks the same in both.
 */
export function SetupStepperCard({ title, steps, onRun, switcher, collapsed: initiallyCollapsed = false, collapsible = true, extras, renderBody }: {
  title: string; steps: StepSpec[]; onRun: (action: StepAction) => void; switcher?: ReactNode; collapsed?: boolean
  collapsible?: boolean; extras?: ReactNode; renderBody?: (step: StepSpec) => ReactNode
}) {
  const current = Math.max(0, steps.findIndex((step) => step.state === "current"))
  const [selected, setSelected] = useState<number | null>(null)
  const [collapsed, setCollapsed] = useState(initiallyCollapsed)
  const index = selected ?? current
  const step = steps[index]
  const done = steps.filter((item) => item.state === "done").length

  return (
    <Card className="gap-0 py-0">
      <div className="flex items-center justify-between gap-4 px-6 py-4">
        <div className="flex min-w-0 items-center gap-4">
          <h2 className="truncate text-base font-medium">{title}</h2>
          {switcher}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">{done} of {steps.length} done</span>
          {collapsible ? (
            <Button variant="ghost" size="sm" onClick={() => setCollapsed(!collapsed)} aria-expanded={!collapsed}>
              {collapsed ? "Show" : "Hide"}<CaretDownIcon data-icon="inline-end" className={cn("transition-transform", !collapsed && "rotate-180")} />
            </Button>
          ) : null}
        </div>
      </div>
      {!collapsed ? <>
        <Separator />
        <div className="grid md:grid-cols-[250px_1fr]">
          <div className="flex flex-col gap-4 p-4 md:border-r">
            <ol className="flex flex-col gap-1">
              {steps.map((item, position) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => setSelected(position)}
                    aria-current={position === index ? "step" : undefined}
                    className={cn("flex w-full items-start gap-3 rounded-md px-2 py-2.5 text-left text-sm transition-colors hover:bg-muted/60", position === index && "bg-muted/60")}
                  >
                    <StepMarker step={item} index={position} />
                    <span className="flex min-w-0 flex-col">
                      <span className={cn(item.state === "done" ? "text-muted-foreground" : "text-foreground", position === index && "font-medium")}>{item.title}</span>
                      {item.caption && item.state !== "done" ? <span className="text-xs text-muted-foreground">{item.caption}</span> : null}
                    </span>
                  </button>
                </li>
              ))}
            </ol>
            {extras ? <><Separator /><div className="flex flex-col">{extras}</div></> : null}
          </div>
          <div className="flex min-w-0 flex-col gap-5 p-6">
            <p className="max-w-[480px] text-[15px] leading-6 text-foreground">{step.summary}</p>
            {renderBody?.(step)}
            <StepPoints step={step} />
            {step.state !== "done" || step.primary ? <StepButtons step={step} onRun={onRun} primaryEmphasis={step.state === "current"} /> : null}
          </div>
        </div>
      </> : null}
    </Card>
  )
}

/** Mercury "You're nearly there": numbered rows, the current one open with its detail and buttons. */
export function SetupChecklist({ steps, onRun, renderBody }: { steps: StepSpec[]; onRun: (action: StepAction) => void; renderBody?: (step: StepSpec) => ReactNode }) {
  const current = steps.findIndex((step) => step.state === "current")
  const [open, setOpen] = useState<number>(current)
  return (
    <ol className="flex flex-col">
      {steps.map((step, index) => {
        const expanded = index === open
        return (
          <li key={step.id} className="border-b border-border/70">
            <button type="button" onClick={() => setOpen(expanded ? -1 : index)} aria-expanded={expanded} className="flex w-full items-center gap-4 py-5 text-left">
              <StepMarker step={step} index={index} size="lg" />
              <span className={cn("flex-1 text-base", step.state === "done" ? "text-muted-foreground" : "text-foreground", expanded && "font-medium")}>{step.title}</span>
              {step.state === "done" ? <Badge variant="outline" className="font-normal text-muted-foreground">Done</Badge> : null}
            </button>
            {expanded ? (
              <div className="flex flex-col gap-5 pb-6 pl-10">
                <p className="text-[15px] leading-6 text-muted-foreground">{step.summary}</p>
                {renderBody?.(step)}
                {step.points?.length ? <Card size="sm" className="px-5 py-4"><StepPoints step={step} /></Card> : null}
                {step.state !== "done" ? <StepButtons step={step} onRun={onRun} primaryEmphasis={step.state === "current"} /> : null}
              </div>
            ) : null}
          </li>
        )
      })}
    </ol>
  )
}

/** Mercury's "Application timeline" side card: where things stand and how long the rest takes. */
export function TimelineCard({ title = "Timeline", items, footer }: { title?: string; items: Array<{ label: string; detail?: string; done: boolean; current?: boolean }>; footer?: ReactNode }) {
  return (
    <Card size="sm" className="gap-0 px-5 py-5">
      <p className="text-sm font-medium">{title}</p>
      <ol className="mt-4 flex flex-col">
        {items.map((item, index) => (
          <li key={item.label} className="relative flex gap-3 pb-4 last:pb-0">
            {index < items.length - 1 ? <span className={cn("absolute left-[3px] top-3 h-full w-px", item.done ? "bg-primary" : "bg-border")} aria-hidden="true" /> : null}
            <span className={cn("relative mt-1.5 size-[7px] shrink-0 rounded-full", item.done || item.current ? "bg-primary" : "bg-muted-foreground/40")} aria-hidden="true" />
            <span className="flex flex-col">
              <span className={cn("text-sm", !item.done && !item.current && "text-muted-foreground")}>{item.label}</span>
              {item.detail ? <span className="text-xs text-muted-foreground">{item.detail}</span> : null}
            </span>
          </li>
        ))}
      </ol>
      {footer ? <><Separator className="my-4" />{footer}</> : null}
    </Card>
  )
}

export function QuestionsBlock() {
  return (
    <div className="flex flex-col gap-1 text-sm">
      <p className="font-medium">Questions?</p>
      <p className="text-muted-foreground">Our team can help.</p>
      <Link href="/support" className="w-fit text-primary underline-offset-4 hover:underline">Get help</Link>
    </div>
  )
}
