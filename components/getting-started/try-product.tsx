"use client"

import { useState, type ReactNode } from "react"
import { CheckCircleIcon, CopyIcon } from "@phosphor-icons/react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { chooseProduct, createTestLink, markTried, type ProductId } from "@/lib/getting-started"
import { INR } from "./catalog"

/** The first step of an online product: try it with test money, before any paperwork. */
export function TryProductDialog({ product, open, onOpenChange }: { product: ProductId; open: boolean; onOpenChange: (open: boolean) => void }) {
  if (product === "payment-links") return <TestLinkDialog open={open} onOpenChange={onOpenChange} />
  if (product === "checkout") return <CheckoutPreviewDialog open={open} onOpenChange={onOpenChange} />
  return null
}

function finish(product: ProductId) {
  chooseProduct(product)
  markTried(product)
}

/** What a customer sees on their phone — the part merchants can't picture until they've seen it. */
function PhonePreview({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-[260px] rounded-[28px] border-4 border-foreground/80 bg-background p-4 shadow-sm">
      <div className="mx-auto mb-4 h-1 w-12 rounded-full bg-muted" aria-hidden="true" />
      {children}
    </div>
  )
}

function TestLinkDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [purpose, setPurpose] = useState("")
  const [amount, setAmount] = useState("")
  const [link, setLink] = useState<{ id: string; amount: number; purpose: string } | null>(null)
  const valid = purpose.trim().length > 1 && Number(amount) > 0 && Number(amount) <= 1_000_000

  function create() {
    if (!valid) return
    setLink(createTestLink(Number(amount), purpose))
    finish("payment-links")
  }

  function close(next: boolean) {
    onOpenChange(next)
    if (!next) { setLink(null); setPurpose(""); setAmount("") }
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle>{link ? "Here's what your customer sees" : "Create a test payment link"}</DialogTitle>
          <DialogDescription>
            {link ? "Share a link like this on WhatsApp, SMS or email. Your customer pays from their phone — no app or website needed." : "Test links use pretend money, so you can try this before verifying your business."}
          </DialogDescription>
        </DialogHeader>
        <div className="grid items-start gap-6 sm:grid-cols-2">
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="test-purpose">What is this payment for?</FieldLabel>
              <Input id="test-purpose" value={purpose} onChange={(event) => setPurpose(event.target.value)} placeholder="E.g. Cake order advance" disabled={Boolean(link)} />
            </Field>
            <Field>
              <FieldLabel htmlFor="test-amount">Amount (₹)</FieldLabel>
              <Input id="test-amount" inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value.replace(/[^\d.]/g, ""))} placeholder="500" disabled={Boolean(link)} />
            </Field>
            {link ? (
              <Field>
                <FieldLabel htmlFor="test-url">Your test link</FieldLabel>
                <div className="flex gap-2">
                  <Input id="test-url" readOnly value={`pay.pine.test/${link.id}`} />
                  <Button variant="outline" size="icon" aria-label="Copy test link" onClick={() => toast.success("Test link copied", { description: "It only accepts test payments." })}><CopyIcon /></Button>
                </div>
              </Field>
            ) : null}
          </FieldGroup>
          <PhonePreview>
            <p className="text-xs text-muted-foreground">Payment request from</p>
            <p className="text-sm font-semibold">Your business</p>
            <Separator className="my-3" />
            <p className="text-xs text-muted-foreground">{purpose.trim() || "What it's for"}</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">{amount ? INR.format(Number(amount)) : "₹0"}</p>
            <div className="mt-4 flex flex-col gap-2">
              {["UPI", "Card", "Netbanking"].map((method) => <div key={method} className="rounded-md border border-border px-3 py-2 text-xs">{method}</div>)}
            </div>
            {link ? <Badge variant="secondary" className="mt-3">Test mode</Badge> : null}
          </PhonePreview>
        </div>
        <DialogFooter>
          {link ? <Button onClick={() => close(false)}>Done</Button> : <>
            <Button variant="outline" onClick={() => close(false)}>Cancel</Button>
            <Button onClick={create} disabled={!valid}>Create test link</Button>
          </>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

const BRANDS = [
  { id: "forest", label: "Forest", color: "#3b5615" },
  { id: "ink", label: "Ink", color: "#1f2937" },
  { id: "plum", label: "Plum", color: "#6b2d5c" },
]

function CheckoutPreviewDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [brand, setBrand] = useState(BRANDS[0].id)
  const [paid, setPaid] = useState(false)
  const color = BRANDS.find((item) => item.id === brand)?.color ?? BRANDS[0].color

  function close(next: boolean) {
    onOpenChange(next)
    if (!next) setPaid(false)
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle>Preview your payment page</DialogTitle>
          <DialogDescription>This is the page customers see when they pay on your website or app. Try a test payment — no real money moves.</DialogDescription>
        </DialogHeader>
        <div className="grid items-start gap-6 sm:grid-cols-2">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium">Brand colour</p>
              <ToggleGroup type="single" variant="outline" size="sm" value={brand} onValueChange={(value) => value && setBrand(value)} aria-label="Brand colour">
                {BRANDS.map((item) => <ToggleGroupItem key={item.id} value={item.id}><span className="size-3 rounded-full" style={{ backgroundColor: item.color }} aria-hidden="true" />{item.label}</ToggleGroupItem>)}
              </ToggleGroup>
            </div>
            <p className="text-sm leading-6 text-muted-foreground">Works with Shopify, WooCommerce or your own site. You&apos;ll connect it after your business is verified.</p>
          </div>
          <PhonePreview>
            {paid ? (
              <div className="flex flex-col items-center gap-2 py-6 text-center">
                <CheckCircleIcon weight="fill" className="size-10 text-success" />
                <p className="text-sm font-semibold">Test payment successful</p>
                <p className="text-xs text-muted-foreground">In a live account this lands in Payments.</p>
              </div>
            ) : <>
              <p className="text-sm font-semibold">Your store</p>
              <p className="mt-1 text-xs text-muted-foreground">Order #1042</p>
              <p className="mt-3 text-2xl font-semibold tabular-nums">{INR.format(499)}</p>
              <div className="mt-4 flex flex-col gap-2">
                {["UPI", "Cards and EMI", "Wallets"].map((method) => <div key={method} className="rounded-md border border-border px-3 py-2 text-xs">{method}</div>)}
              </div>
              <button type="button" className="mt-4 w-full rounded-md py-2 text-xs font-medium text-white" style={{ backgroundColor: color }} onClick={() => { setPaid(true); finish("checkout") }}>
                Pay {INR.format(499)} (test)
              </button>
            </>}
          </PhonePreview>
        </div>
        <DialogFooter>
          <Button variant={paid ? "default" : "outline"} onClick={() => close(false)}>{paid ? "Done" : "Close"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
