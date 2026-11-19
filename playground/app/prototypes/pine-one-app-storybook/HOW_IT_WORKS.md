# Pine One app: Storybook

## What It Does
The mobile app's components and screens with Pine One's Material 3 theme, from React Native Storybook. Pick a story from the bar at the bottom.

## Architecture
```
mobile/ stories ──static build──► Vercel "pine-one-app-storybook" ──► https://pine-one-app-storybook.vercel.app
                                                         ▲
playground /prototypes/pine-one-app-storybook ──iframe─────────────────────┘
```

## Frontend
- Full screen on phones, a 390×844 frame from `sm` up.
- Built from `mobile/` with `STORYBOOK_ENABLED=true`, which swaps the app for `.rnstorybook` (stories in `src/**/*.stories.tsx`). Some stories predate the latest app layout.

## Key Dependencies
- `@/components/embeds/phone-frame`

## Component Tree
```
page.tsx
└── PhoneFrame (iframe)
```

## Error Handling
- None needed. If the deployment is down, the link or frame shows the browser's error.

## File Structure
```
pine-one-app-storybook/
├── page.tsx
├── metadata.json
└── HOW_IT_WORKS.md
```

## Updating
Storybook isn't rebuilt automatically. After changing stories or components, rebuild and redeploy:

```
cd mobile && STORYBOOK_ENABLED=true npx expo export -p web --clear --output-dir /tmp/pine-mobile-sb
cd /tmp/pine-mobile-sb && VERCEL_ORG_ID=team_sioXMAvOYHLCBQhiP6GAo4L2 VERCEL_PROJECT_ID=prj_YLZ0X2P5nuLcoVio3czlfCidOeDZ npx vercel@latest deploy --prod --yes
```
Then run `npm run thumbnails -- pine-one-app-storybook`.
