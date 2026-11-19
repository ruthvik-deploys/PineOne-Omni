# Pine One web: Business verification (KYC)

## What It Does
Nine-step onboarding rail: verify business (DigiLocker or document upload), business basics, stores, website, banking, owners, signatory, face check, review and sign.

## Architecture
```
repo root web app ──► Vercel ──► https://pine-one-user-journey-v2.vercel.app/onboarding/business-verification
                                    ▲
playground /prototypes/pine-one-web-kyc ──link─┘
```

## Frontend
- A static page: title, description, optional note and an Open button (44px). The app opens in its own tab.
- Routes `app/onboarding/(rail)/*` (business-verification, business-basics, store-verification, website-app-details, banking-details, business-owners, authorised-signatory, face-authentication, review-and-sign), with a live Business Profile preview on the right.

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
pine-one-web-kyc/
├── page.tsx
├── metadata.json
└── HOW_IT_WORKS.md
```

## Source
This repo's root web app (Next.js), deployed to the Vercel project `pine-one-user-journey-v2`. Linked Nov 19, 2026.
