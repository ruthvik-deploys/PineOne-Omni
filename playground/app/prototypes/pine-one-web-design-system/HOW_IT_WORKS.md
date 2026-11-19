# Pine One web: Design system docs

## What It Does
Foundations (colour tokens for light and dark), component previews and a standard desktop page shell for Pine One.

## Architecture
```
repo root web app ──► Vercel ──► https://pine-one-user-journey-v2.vercel.app/component-docs
                                    ▲
playground /prototypes/pine-one-web-design-system ──link─┘
```

## Frontend
- A static page: title, description, optional note and an Open button (44px). The app opens in its own tab.
- Route `app/component-docs` and `app/component-docs/[slug]`. Tokens are editable JSON that can be copied back into the theme.

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
pine-one-web-design-system/
├── page.tsx
├── metadata.json
└── HOW_IT_WORKS.md
```

## Source
This repo's root web app (Next.js), deployed to the Vercel project `pine-one-user-journey-v2`. Linked Nov 19, 2026.
