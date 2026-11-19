# Osmosis app: Market Agent

## What It Does
Phone-first agent marketplace page and setup for Google Ads campaigns: what the agent does, stats, Start setup and View campaigns.

## Architecture
```
osmosis repo ──► Vercel ──► https://pine-one.vercel.app/pine-ai/agents/local-ads
                                    ▲
playground /prototypes/osmosis-app-market-agent ──iframe─┘
```

## Frontend
- Full screen on phones, a 390×844 frame from `sm` up, with an Open full screen link.
- The embedded app keeps its own storage inside the frame, so it asks to sign in once there.
- Built phone-first (commit "Market Agent: phone-first marketplace, setup and ad creation", Oct 29). Inside the phone frame, sign in once with any email and password.

## Key Dependencies
- `@/components/embeds/phone-frame`
- `metadata.json → external`

## Component Tree
```
page.tsx
└── PhoneFrame (iframe)
```

## Error Handling
- None needed. If the deployment or route goes away, the link or frame shows the browser's error. Re-check routes when the source app changes.

## File Structure
```
osmosis-app-market-agent/
├── page.tsx
├── metadata.json
└── HOW_IT_WORKS.md
```

## Source
Private repo `osmosis` (access through the playground owner), commit `0071d81`. Linked Nov 19, 2026.
