# Pine One Omni web

## What It Does
Links to the Pine One Omni merchant dashboard, the Next.js app at the repo root. It is deployed on its own to `pine-one-user-journey-v2.vercel.app`. It is a full multi-route desktop app, so it opens in its own tab instead of being embedded.

## Architecture
```
repo root (Next.js, ~30 routes) ──► Vercel project "pine-one-user-journey-v2"
                                          ▲
playground /prototypes/pine-one-web ──link┘
thumbnail script ──captures external.url directly (embed: "none")
```

## Frontend
- A static page: title, description and an Open button (44px).

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
pine-one-web/
├── page.tsx
├── metadata.json   includes external.url
└── HOW_IT_WORKS.md
```
