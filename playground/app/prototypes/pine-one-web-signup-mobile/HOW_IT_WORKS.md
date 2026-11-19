# Pine One onboarding web: Sign up, mobile first

## What It Does
Create an account from a mobile number and OTP, then set a password and continue into the getting-started home.

## Architecture
```
repo root web app ──► Vercel ──► https://pine-one-user-journey-v2.vercel.app/onboarding-demo
                                    ▲
playground /prototypes/pine-one-web-signup-mobile ──link─┘
```

## Frontend
- A static page: title, description, optional note and an Open button (44px). The app opens in its own tab.
- Route `app/onboarding-demo/[[...path]]`: phone → verify-phone → set-password → home and product setup. The product-first setup pages (`setup/start-catalog`) exist locally but aren't in the live deployment yet.

## Key Dependencies
- `@/components/embeds/external-app`
- `metadata.json → external`

## Component Tree
```
page.tsx
└── ExternalApp
```

## Error Handling
- None needed. If the deployment or route goes away, the link or frame shows the browser's error. Re-check routes when the source app changes.

## File Structure
```
pine-one-web-signup-mobile/
├── page.tsx
├── metadata.json
└── HOW_IT_WORKS.md
```

## Source
This repo's root web app (Next.js), deployed to the Vercel project `pine-one-user-journey-v2`. Linked Nov 19, 2026.
