# Pine One web: Progressive onboarding, Nov 10 version

**Hypothesis / what it tried:** Products as separate onboarding tracks behind one shared setup layout, entered after sign-up.

## What It Does
The first cut of progressive web onboarding with a shared product setup layout, before the product-first step was added.

## Architecture
```
branch `codex/progressive-onboarding` (commit d997573, 10 Nov 2026), Vercel preview of `pine-one-user-journey-v2` ──► Vercel ──► https://pine-one-user-journey-v2-byg0wt42v-tirths-projects-7c07a569.vercel.app/onboarding-demo
                     ▲
playground /prototypes/pine-one-web-onboarding-nov-10 ──link┘
```

## Frontend
- A page with an Open button; the flow opens in its own tab.
- Source: branch `codex/progressive-onboarding` (commit d997573, 10 Nov 2026), Vercel preview of `pine-one-user-journey-v2`

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
pine-one-web-onboarding-nov-10/
├── page.tsx
├── metadata.json
└── HOW_IT_WORKS.md
```
