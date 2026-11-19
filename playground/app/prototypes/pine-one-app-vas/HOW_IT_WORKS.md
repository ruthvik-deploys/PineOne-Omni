# Pine One app: Value Added Services

## What It Does
Enable and track services like EMI, Same-Day and On-Demand settlement, with request status on each card. It deep-links into the Pine One mobile app's live web build at `/value-added-services`.

## Architecture
```
/mobile (Expo Router) ──expo export -p web──► Vercel "pine-one-app" ──► https://pine-one-app.vercel.app/value-added-services
                                                                ▲
playground /prototypes/pine-one-app-vas ──iframe (PhoneFrame)─────────────┘
```

## Frontend
- Full screen on phones, a 390×844 frame from `sm` up, with an Open full screen link.
- Source: `src/app/value-added-services.tsx`, data in `src/data/value-added-services.ts`.

## Key Dependencies
- `@/components/embeds/phone-frame`
- `metadata.json → external.url`

## Component Tree
```
page.tsx
└── PhoneFrame (iframe)
```

## Error Handling
- If the deployment is down, the frame shows the browser's error page.

## File Structure
```
pine-one-app-vas/
├── page.tsx
├── metadata.json
└── HOW_IT_WORKS.md
```

## Updating
Changes are made in `/mobile`. Redeploy `pine-one-app` (see `pine-one-mobile/HOW_IT_WORKS.md`), then run `npm run thumbnails -- pine-one-app-vas`.
