# Pine One web: Website & app details: other designs

**Hypothesis / what it tried:** Design alternatives for one onboarding step, kept after a winner was picked so they can be compared.

## What It Does
The alternative designs tried for the website & app details step (variants B · C). The live flow uses the winner; switch between them with the pill at the bottom.

## Architecture
```
branch `exp/onboarding-variants` (archives from `prototype/ticket-*`, Aug 2026) ──► Vercel ──► https://pine-one-onboarding-variants.vercel.app/onboarding-variants/website-app-details
                     ▲
playground /prototypes/pine-one-web-variants-website-app-details ──link┘
```

## Frontend
- A page with an Open button; the flow opens in its own tab.
- Source: branch `exp/onboarding-variants` (archives from `prototype/ticket-*`, Aug 2026): `app/onboarding/website-app-details/_variant-*.tsx`, served at `/onboarding-variants/website-app-details` on the Vercel project `pine-one-onboarding-variants`

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
pine-one-web-variants-website-app-details/
├── page.tsx
├── metadata.json
└── HOW_IT_WORKS.md
```
