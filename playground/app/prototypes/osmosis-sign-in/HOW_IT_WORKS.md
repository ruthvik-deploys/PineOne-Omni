# Osmosis web: Sign in

## What It Does
Log in with email and password or email OTP, sign up, SSO buttons, then pick a merchant profile. It's one flow of Osmosis, a separate Next.js app, linked here so it opens straight to `/auth/login`.

## Architecture
```
private GitHub repo "osmosis" (Next.js 16.1) ──► Vercel ──► pine-one.vercel.app/auth/login
                                                                   ▲
playground /prototypes/osmosis-sign-in ──link──────────────────────────────┘
```

## Frontend
- A static page: title, description, a one-line note and an Open button (44px).
- This is the sign-in flow itself, so the thumbnail is captured signed out.

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
osmosis-sign-in/
├── page.tsx
├── metadata.json
└── HOW_IT_WORKS.md
```

## Source
Private repo `osmosis` (access through the playground owner), commit `0071d81` (Nov 3, 2026). Routes: `app/auth/*`: login, login1, otp, signup, role-selector.
