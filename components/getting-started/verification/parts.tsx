"use client"

import { useState } from "react"
import { CheckIcon, PaperPlaneTiltIcon } from "@phosphor-icons/react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { cn } from "@/lib/utils"
import { delegateModule, useGettingStarted, type ProductId } from "@/lib/getting-started"
import { BUSINESS_TYPE_LABEL, businessTypeFromPan, type BusinessType } from "@/lib/online-onboarding"
import { MODULE_BY_ID, readyChecklist, STATUS_LABEL, type ModuleId, type ModuleStatus } from "@/lib/verification"

const DOT: Record<ModuleStatus, string> = {
  approved: "bg-success", "in-review": "bg-primary", done: "bg-success", delegated: "bg-warning", later: "bg-warning", todo: "bg-muted-foreground/40",
}

export function ModuleStatusBadge({ status, delegate }: { status: ModuleStatus; delegate?: string }) {
  return (
    <Badge variant="outline" className="gap-1.5 font-normal text-muted-foreground">
      <span className={cn("size-1.5 rounded-full", DOT[status])} aria-hidden="true" />
      {status === "delegated" && delegate ? `With ${delegate}` : STATUS_LABEL[status]}
    </Badge>
  )
}

const TYPES: BusinessType[] = ["proprietor", "partnership", "company"]

/**
 * "Have these ready" — what the chosen products need, personalised by business
 * type. The type comes from the PAN once entered; before that, the merchant picks it.
 */
export function ReadyChecklist({ products, compact = false }: { products: ProductId[]; compact?: boolean }) {
  const state = useGettingStarted()
  const fromPan = businessTypeFromPan(state.onlineProfile?.pan ?? "")
  const [picked, setPicked] = useState<BusinessType>("proprietor")
  const type = fromPan === "unknown" ? picked : fromPan
  const items = readyChecklist(type, products)

  return (
    <div className="flex flex-col gap-4">
      {fromPan === "unknown" ? (
        <div className="flex flex-col gap-2">
          <p className="text-xs text-muted-foreground">Your business is a</p>
          <ToggleGroup type="single" variant="outline" size="sm" spacing={1} className="flex-wrap" value={type} onValueChange={(value) => value && setPicked(value as BusinessType)} aria-label="Business type">
            {TYPES.map((item) => <ToggleGroupItem key={item} value={item}>{BUSINESS_TYPE_LABEL[item]}</ToggleGroupItem>)}
          </ToggleGroup>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">For a {BUSINESS_TYPE_LABEL[type].toLowerCase()}, based on your PAN</p>
      )}
      <ul className="flex flex-col gap-3">
        {items.map((item) => (
          <li key={item.label} className="flex gap-2.5 text-sm">
            <CheckIcon className="mt-0.5 shrink-0 text-muted-foreground" aria-hidden="true" />
            <span className="min-w-0">
              <span className="block leading-5 text-foreground">{item.label}</span>
              {!compact ? <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">{item.where}</span> : null}
            </span>
          </li>
        ))}
      </ul>
      <p className="text-xs leading-5 text-muted-foreground">Don&apos;t have something yet? Start anyway — you can add it later or ask someone else to.</p>
      <Button variant="outline" size="sm" className="w-fit" onClick={() => toast.success("Checklist sent to your WhatsApp", { description: "Demo only — nothing was sent." })}>
        <PaperPlaneTiltIcon data-icon="inline-start" />
        Send me this list
      </Button>
    </div>
  )
}

/** Hand one module to the person who has the details — accountant, signatory, partner. */
export function DelegateDialog({ module, open, onOpenChange, onSent }: { module: ModuleId; open: boolean; onOpenChange: (open: boolean) => void; onSent?: () => void }) {
  const spec = MODULE_BY_ID[module]
  const [name, setName] = useState("")
  const [contact, setContact] = useState("")
  const valid = name.trim().length > 1 && (/^[6-9]\d{9}$/.test(contact.replace(/\D/g, "")) || /^\S+@\S+\.\S+$/.test(contact.trim()))

  function send() {
    if (!valid) return
    delegateModule(module, name, contact)
    toast.success(`Sent to ${name.trim()}`, { description: `They'll get a secure link to fill in ${spec.short.toLowerCase()} only. Demo only — nothing was sent.` })
    onOpenChange(false)
    setName("")
    setContact("")
    onSent?.()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>Ask someone else to add {spec.short.toLowerCase()}</DialogTitle>
          <DialogDescription>
            Usually {spec.delegateTo}. They get a secure link for this part only, and can&apos;t see anything else. You can carry on with the rest meanwhile.
          </DialogDescription>
        </DialogHeader>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="delegate-name">Their name</FieldLabel>
            <Input id="delegate-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="E.g. Rahul (accountant)" />
          </Field>
          <Field>
            <FieldLabel htmlFor="delegate-contact">WhatsApp number or email</FieldLabel>
            <Input id="delegate-contact" value={contact} onChange={(event) => setContact(event.target.value)} placeholder="98765 43210 or name@business.com" />
            <FieldDescription>We&apos;ll remind them after a day if it&apos;s still pending.</FieldDescription>
          </Field>
        </FieldGroup>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={send} disabled={!valid}>Send link</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
