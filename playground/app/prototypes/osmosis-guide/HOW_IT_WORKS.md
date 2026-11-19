# Osmosis web: Guide assistant

## What It Does
AI assistant panel that opens beside any page: suggested questions, chat with answer cards, voice input, history and feedback.

## Architecture
```
osmosis repo ──► Vercel ──► https://pine-one.vercel.app/?guide=open
                                    ▲
playground /prototypes/osmosis-guide ──link─┘
```

## Frontend
- A static page: title, description, optional note and an Open button (44px). The app opens in its own tab.
- Osmosis's biggest experiment: an always-available assistant (`components/guide/*`) instead of a separate AI page. `?guide=<anything>` opens it on load; `guide=support` focuses it on support.

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
osmosis-guide/
├── page.tsx
├── metadata.json
└── HOW_IT_WORKS.md
```

## Source
Private repo `osmosis` (access through the playground owner), commit `0071d81`. Linked Nov 19, 2026.
