# Pine One web: Overview scenarios

## What It Does
The Overview dashboard rendered for each role and data state (single store, multiple stores, empty, failures) on one page.

## Architecture
```
repo root web app ──► Vercel ──► https://pine-one-user-journey-v2.vercel.app/overview-scenarios
                                    ▲
playground /prototypes/pine-one-web-overview-scenarios ──link─┘
```

## Frontend
- A static page: title, description, optional note and an Open button (44px). The app opens in its own tab.
- Route `app/overview-scenarios`. A review page for checking every Overview state at once.

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
pine-one-web-overview-scenarios/
├── page.tsx
├── metadata.json
└── HOW_IT_WORKS.md
```

## Source
This repo's root web app (Next.js), deployed to the Vercel project `pine-one-user-journey-v2`. Linked Nov 19, 2026.
