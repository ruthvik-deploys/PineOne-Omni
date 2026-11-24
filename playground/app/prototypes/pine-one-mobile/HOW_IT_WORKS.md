# Pine One app

## What It Does
Shows the Pine One merchant app (Expo / React Native) inside the playground. Its source lives in `/mobile` at the repo root and is deployed on its own to `pine-one-app.vercel.app`. This prototype embeds that live build.

## Architecture
```
/mobile (Expo Router) ──expo export -p web──► Vercel project "pine-one-app"
                                                   │
playground /prototypes/pine-one-mobile ──iframe────┘  (PhoneFrame: full screen on phones, 390×844 frame from sm)
```

## Frontend
- No local state apart from the iframe's loading spinner.
- On screens under `sm` the iframe fills the viewport. From `sm` up it is framed, with an "Open full screen" link.
- The app keeps its own theme (light). The playground theme only affects the frame.

## Key Dependencies
- `@/components/embeds/phone-frame`
- The deployment at `metadata.json → external.url`. To show a different build (e.g. a preview URL), change it there.

## Component Tree
```
page.tsx
└── PhoneFrame (iframe)
```

## Error Handling
- If the deployment is down, the iframe shows the browser's error page. The playground itself is unaffected.

## File Structure
```
pine-one-mobile/
├── page.tsx
├── metadata.json   includes external.url
└── HOW_IT_WORKS.md
```

## Updating
Changes to the app are made in `/mobile` and deployed from there. The playground picks them up automatically. Regenerate this prototype's thumbnails after visible changes to the app's first screen.

## Deployments
The playground uses `pine-one-app` (Vercel team tirthtrivedi17-gmailcom's projects), deployed from `mobile/` on Nov 19, 2026. The older `pineone-mobile` project belongs to another Vercel team and still serves the October build. Redeploy with:

```
cd mobile && VERCEL_ORG_ID=team_sioXMAvOYHLCBQhiP6GAo4L2 VERCEL_PROJECT_ID=prj_DmoVXHj0kwle5Z8czc7DmnTV9liu npx vercel@latest deploy --prod --yes
```

The env vars keep `mobile/.vercel` pointing at the old project untouched.
