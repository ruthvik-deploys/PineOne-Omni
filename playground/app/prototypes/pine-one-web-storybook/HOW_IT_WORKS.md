# Pine One web: Storybook

## What It Does
Every web portal component and pattern with live previews, props, code and light/dark: foundations, brand, layout, UI and composed blocks.

## Architecture
```
repo root stories ──static build──► Vercel "pine-one-storybook" ──► https://pine-one-storybook.vercel.app
                                                         ▲
playground /prototypes/pine-one-web-storybook ──link─────────────────────┘
```

## Frontend
- A page with an Open button; Storybook opens in its own tab (it needs the full width).
- Built from the repo root with `pnpm build-storybook` (`.storybook/`, stories in `components/**/*.stories.tsx`). `.storybook/preview-head.html` loads Inter Display, because Storybook doesn't run `app/layout.tsx`.

## Key Dependencies
- `@/components/embeds/external-app`

## Component Tree
```
page.tsx
└── ExternalApp
```

## Error Handling
- None needed. If the deployment is down, the link or frame shows the browser's error.

## File Structure
```
pine-one-web-storybook/
├── page.tsx
├── metadata.json
└── HOW_IT_WORKS.md
```

## Updating
Storybook isn't rebuilt automatically. After changing stories or components, rebuild and redeploy:

```
pnpm build-storybook -o /tmp/pine-storybook
cd /tmp/pine-storybook && VERCEL_ORG_ID=team_sioXMAvOYHLCBQhiP6GAo4L2 VERCEL_PROJECT_ID=prj_VwCJM0435jcCSDgxvTLrUBBPkLZD npx vercel@latest deploy --prod --yes
```
Then run `npm run thumbnails -- pine-one-web-storybook`.
