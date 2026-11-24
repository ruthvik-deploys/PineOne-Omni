# Pine One web: Request access: other designs

**Hypothesis / what it tried:** Design alternatives for one onboarding step, kept after a winner was picked so they can be compared.

## What It Does
The alternative designs tried for the request access step (variants A · B · C). The live flow uses the winner; switch between them with the pill at the bottom.

## Architecture
```
branch `exp/onboarding-variants` (archives from `prototype/ticket-*`, Aug 2026) ──► Vercel ──► https://pine-one-onboarding-variants.vercel.app/onboarding-variants/request-access-existing-merchant
                     ▲
playground /prototypes/pine-one-web-variants-request-access-existing-merchant ──link┘
```

## Frontend
- A page with an Open button; the flow opens in its own tab.
- Source: branch `exp/onboarding-variants` (archives from `prototype/ticket-*`, Aug 2026): `app/onboarding/request-access-existing-merchant/_variant-*.tsx`, served at `/onboarding-variants/request-access-existing-merchant` on the Vercel project `pine-one-onboarding-variants`

## Key Dependencies
- `@/components/embeds/external-app`

## Component Tree
```
page.tsx
└── ExternalApp
```

## Error Handling
- None needed. If the deployment goes away, the link fails in its own tab.

## File Structure
```
pine-one-web-variants-request-access-existing-merchant/
├── page.tsx
├── metadata.json
└── HOW_IT_WORKS.md
```
