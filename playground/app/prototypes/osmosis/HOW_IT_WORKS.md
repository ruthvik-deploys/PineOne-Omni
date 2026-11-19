# Osmosis

## What It Does
Links to Osmosis, a Pine One merchant dashboard (auth, home, payments, settlements, refunds, transaction split, support and Pine AI conversational analytics). It's a separate Next.js app with its own API routes, so it opens in its own tab instead of being ported in.

## Architecture
```
private GitHub repo "osmosis" (Next.js 16.1, shadcn base-nova, Base UI) ──► Vercel ──► pine-one.vercel.app
                                                                                   ▲
playground /prototypes/osmosis ──link─────────────────────────────────────────────┘
thumbnail script ──captures external.url directly (embed: "none"), which lands on /auth/login
```

## Frontend
- A static page: title, description and an Open button (44px).
- The app's login is a client-side mock with no real accounts. Every route redirects to `/auth/login` first, so the thumbnail shows the login screen.

## Key Dependencies
- `@/components/embeds/external-app`
- `metadata.json → external.url`

## Component Tree
```
page.tsx
└── ExternalApp
```

## Error Handling
- None needed. If the deployment is down, the link fails in its own tab.

## File Structure
```
osmosis/
├── page.tsx
├── metadata.json   includes external.url
└── HOW_IT_WORKS.md
```

## Source
Private repo `osmosis` on GitHub (access through the playground owner). Imported Nov 19, 2026 at commit `0071d81` via path A (link the deployment). Changes are made in that repo and deployed from there, and the playground picks them up automatically.
