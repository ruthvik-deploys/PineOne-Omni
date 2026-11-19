# Pine One app: Business profile

## What It Does
Business details, KYC and documents, bank accounts, paymodes and registered details, with change requests and bank edit verification. It deep-links into the Pine One mobile app's live web build at `/business-profile`.

## Architecture
```
/mobile (Expo Router) ──expo export -p web──► Vercel "pine-one-app" ──► https://pine-one-app.vercel.app/business-profile
                                                                ▲
playground /prototypes/pine-one-app-business-profile ──iframe (PhoneFrame)─────────────┘
```

## Frontend
- Full screen on phones, a 390×844 frame from `sm` up, with an Open full screen link.
- Source: `src/app/business-profile/*` (built to Figma 7961:21505).

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
pine-one-app-business-profile/
├── page.tsx
├── metadata.json
└── HOW_IT_WORKS.md
```

## Updating
Changes are made in `/mobile`. Redeploy `pine-one-app` (see `pine-one-mobile/HOW_IT_WORKS.md`), then run `npm run thumbnails -- pine-one-app-business-profile`.
