# Pine One web: Choose your products

## What It Does
Product-first onboarding: right after sign-up, pick In-store, Payment links and/or Checkout as checkbox cards; the steps that follow come from the picks.

## Architecture
```
repo root ──► Vercel ──► https://pine-one-user-journey-v2.vercel.app/onboarding-demo/setup/start-catalog
                     ▲
playground /prototypes/pine-one-web-choose-products ──link┘
```

## Frontend
- A page with an Open button; the flow opens in its own tab.
- Source: repo root: `app/onboarding-demo/[[...path]]` → `components/getting-started/onboarding-start-catalog.tsx`; logic in `docs/flows/progressive-onboarding-logic.md`

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
pine-one-web-choose-products/
├── page.tsx
├── metadata.json
└── HOW_IT_WORKS.md
```
