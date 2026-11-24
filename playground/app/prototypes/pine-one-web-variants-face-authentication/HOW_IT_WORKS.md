# Pine One web: Face authentication: other designs

**Hypothesis / what it tried:** Design alternatives for one onboarding step, kept after a winner was picked so they can be compared.

## What It Does
The alternative designs tried for the face authentication step (variants B · C). The live flow uses the winner; switch between them with the pill at the bottom.

## Architecture
```
branch `exp/onboarding-variants` (archives from `prototype/ticket-*`, Aug 2026) ──► Vercel ──► https://pine-one-onboarding-variants.vercel.app/onboarding-variants/face-authentication
                     ▲
playground /prototypes/pine-one-web-variants-face-authentication ──link┘
```

## Frontend
- A page with an Open button; the flow opens in its own tab.
- Source: branch `exp/onboarding-variants` (archives from `prototype/ticket-*`, Aug 2026): `app/onboarding/face-authentication/_variant-*.tsx`, served at `/onboarding-variants/face-authentication` on the Vercel project `pine-one-onboarding-variants`

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
pine-one-web-variants-face-authentication/
├── page.tsx
├── metadata.json
└── HOW_IT_WORKS.md
```
