# Osmosis app: Home

## What It Does
The Osmosis phone app: merchant switcher, Transactions and Settlements cards, bottom nav (Home, Payments, Agents, More) and the Guide button.

## Architecture
```
osmosis repo ──► Vercel ──► https://pine-one.vercel.app/
                                    ▲
playground /prototypes/osmosis-app ──iframe─┘
```

## Frontend
- Full screen on phones, a 390×844 frame from `sm` up, with an Open full screen link.
- The embedded app keeps its own storage inside the frame, so it asks to sign in once there.
- Osmosis is responsive: under ~768px it switches to a separate mobile app shell (`components/home/mobile-app-shell.tsx`) with its own nav, and it installs to the home screen (`app/manifest.ts`). Inside the phone frame, sign in once with any email and password.

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
osmosis-app/
├── page.tsx
├── metadata.json
└── HOW_IT_WORKS.md
```

## Source
Private repo `osmosis` (access through the playground owner), commit `0071d81`. Linked Nov 19, 2026.
