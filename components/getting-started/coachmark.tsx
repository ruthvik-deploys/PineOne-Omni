"use client"

import { useEffect, useState, type ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverAnchor, PopoverContent, PopoverDescription, PopoverHeader, PopoverTitle } from "@/components/ui/popover"
import { markTipSeen, type GettingStartedState } from "@/lib/getting-started"
import { chosenProducts } from "@/lib/verification"
import { PRODUCTS } from "./catalog"
import { orderedProducts } from "./journey-logic"

export type Tip = { id: string; anchor: string; title: string; body: string; step?: string }

/**
 * Teaching happens one thing at a time, at the moment it matters, pointing at
 * the real menu item (Mercury). Tips are queued and each is shown once.
 */
export function tipQueue(state: GettingStartedState): Tip[] {
  const live = chosenProducts(state).filter((id) => state.journeys[id].stage === "live")
  if (state.source?.from === "migrated") {
    const tour: Tip[] = [
      { id: "tour-in-store", anchor: "In-store", title: "Your terminals are here", body: "Everything from the old in-store platform — devices, orders and their status — now lives under In-store." },
      { id: "tour-links", anchor: "Payment links", title: "Your payment links are here", body: "Links you created on the old online platform are under Payment links, next to In-store." },
      { id: "tour-payments", anchor: "Payments", title: "All payments, in one list", body: "Payments from your terminals and your links now show together. Filter by product when you need to." },
      { id: "tour-settlement", anchor: "Settlement", title: "One settlement view", body: "Money from every product reaches the same bank account, tracked here." },
    ]
    return tour.map((tip, index) => ({ ...tip, step: `${index + 1} of ${tour.length}` }))
  }
  const tips: Tip[] = orderedProducts(state).map((id) => ({
    id: `nav-${id}`,
    anchor: PRODUCTS[id].shortName,
    title: `${PRODUCTS[id].shortName} lives here`,
    body: `Come back here any time to see where ${PRODUCTS[id].shortName} stands. Your progress is always saved.`,
  }))
  if (live.length) {
    tips.push(
      { id: "nav-payments", anchor: "Payments", title: "Every payment lands here", body: "Payments from all your products — at the counter and online — show in one list." },
      { id: "nav-settlement", anchor: "Settlement", title: "When the money reaches your bank", body: "Usually the next working day, after applicable fees." },
    )
  }
  return tips
}

export function activeTip(state: GettingStartedState, anchors: string[]): Tip | null {
  if (state.pendingIntroduction) return null
  return tipQueue(state).find((tip) => !state.seenTips.includes(tip.id) && anchors.includes(tip.anchor)) ?? null
}

/** Tips wait while any dialog is open, so they never compete with the task at hand. */
function useDialogOpen() {
  const [open, setOpen] = useState(false)
  useEffect(() => {
    const check = () => setOpen(Boolean(document.querySelector('[data-slot="dialog-content"], [data-slot="alert-dialog-content"], [data-slot="sheet-content"]')))
    check()
    const observer = new MutationObserver(check)
    observer.observe(document.body, { childList: true, subtree: true })
    return () => observer.disconnect()
  }, [])
  return open
}

export function Coachmark({ tip, children }: { tip: Tip | null; children: ReactNode }) {
  const dialogOpen = useDialogOpen()
  if (!tip || dialogOpen) return <>{children}</>
  return (
    <Popover open>
      <PopoverAnchor asChild>{children}</PopoverAnchor>
      <PopoverContent side="right" align="start" sideOffset={12} className="w-72" onOpenAutoFocus={(event) => event.preventDefault()}>
        <PopoverHeader>
          {tip.step ? <p className="text-xs text-muted-foreground">{tip.step}</p> : null}
          <PopoverTitle>{tip.title}</PopoverTitle>
          <PopoverDescription>{tip.body}</PopoverDescription>
        </PopoverHeader>
        <div className="flex justify-end pt-1">
          <Button size="sm" onClick={() => markTipSeen(tip.id)}>{tip.step && tip.step.split(" of ")[0] !== tip.step.split(" of ")[1] ? "Next" : "Got it"}</Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
