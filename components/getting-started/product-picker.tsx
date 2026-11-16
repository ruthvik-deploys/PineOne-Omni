"use client"

import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldContent, FieldDescription, FieldGroup, FieldLabel, FieldTitle } from "@/components/ui/field"
import { Badge } from "@/components/ui/badge"
import { PRODUCT_IDS, productStarted, type GettingStartedState, type ProductId } from "@/lib/getting-started"
import { PRODUCTS } from "./catalog"
import { ProductArt } from "./getting-started-home"

/**
 * First onboarding step: horizontal choice cards (art, the merchant's situation,
 * price) with a checkbox each. Products already in progress stay ticked.
 */
export function ProductPicker({ state, value, onChange }: { state: GettingStartedState; value: ProductId[]; onChange: (value: ProductId[]) => void }) {
  function toggle(id: ProductId, checked: boolean) {
    onChange(PRODUCT_IDS.filter((item) => item === id ? checked : value.includes(item)))
  }
  return (
    <FieldGroup className="gap-3">
      {PRODUCT_IDS.map((id) => {
        const meta = PRODUCTS[id]
        const locked = productStarted(state, id) && state.selected !== null
        return (
          <FieldLabel key={id} htmlFor={`pick-${id}`}>
            <Field orientation="horizontal" className="items-center gap-4">
              <ProductArt product={id} className="size-16" />
              <FieldContent className="gap-0.5">
                <FieldTitle>{meta.shortName}{locked ? <Badge variant="secondary" className="font-normal">Started</Badge> : null}</FieldTitle>
                <FieldDescription className="text-foreground">{meta.situation}</FieldDescription>
                <FieldDescription className="text-xs">{meta.pricing}</FieldDescription>
              </FieldContent>
              <Checkbox id={`pick-${id}`} checked={value.includes(id)} disabled={locked} onCheckedChange={(checked) => toggle(id, checked === true)} />
            </Field>
          </FieldLabel>
        )
      })}
    </FieldGroup>
  )
}
