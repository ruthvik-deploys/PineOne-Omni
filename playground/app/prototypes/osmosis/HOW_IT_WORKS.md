# Osmosis web: Home

## What It Does
Merchant home: today's transactions and settlements, refunds, pinned reports and the Ask Guide panel. It's one flow of Osmosis, a separate Next.js app, linked here so it opens straight to `/`.

## Architecture
```
private GitHub repo "osmosis" (Next.js 16.1) ──► Vercel ──► pine-one.vercel.app/
                                                                   ▲
playground /prototypes/osmosis ──link──────────────────────────────┘
```

## Frontend
- A static page: title, description, a one-line note and an Open button (44px).
- The app's login is a client-side mock stored in localStorage (`osmosis.auth-flow.v1`). Until someone has signed in once in their browser, the link redirects to `/auth/login`. The thumbnail script seeds that key (`external.seedLocalStorage`, merchant GD Electronics) so the card shows the real screen.

## Key Dependencies
- `@/components/embeds/external-app`
- `metadata.json → external` (url, note, seedLocalStorage)

## Component Tree
```
page.tsx
└── ExternalApp
```

## Error Handling
- None needed. If the deployment or the route goes away, the link fails in its own tab. Re-check the routes when Osmosis changes.

## File Structure
```
osmosis/
├── page.tsx
├── metadata.json
└── HOW_IT_WORKS.md
```

## Source
Private repo `osmosis` (access through the playground owner), commit `0071d81` (Nov 3, 2026). Routes: Home dashboard (`app/page.tsx`).
