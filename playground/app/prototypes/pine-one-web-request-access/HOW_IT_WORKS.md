# Pine One web: Request access (existing merchant)

## What It Does
Conversational, chat-style flow for an existing Pine Labs merchant to find their business and request access.

## Architecture
```
repo root web app ──► Vercel ──► https://pine-one-user-journey-v2.vercel.app/onboarding/request-access-existing-merchant
                                    ▲
playground /prototypes/pine-one-web-request-access ──link─┘
```

## Frontend
- A static page: title, description, optional note and an Open button (44px). The app opens in its own tab.
- Route `app/onboarding/request-access-existing-merchant`. A chat-led form, unlike the other onboarding flows.

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
pine-one-web-request-access/
├── page.tsx
├── metadata.json
└── HOW_IT_WORKS.md
```

## Source
This repo's root web app (Next.js), deployed to the Vercel project `pine-one-user-journey-v2`. Linked Nov 19, 2026.
