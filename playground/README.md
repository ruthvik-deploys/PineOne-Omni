# Playground

Personal prototype playground. Agents: read [CLAUDE.md](./CLAUDE.md) first.

```bash
npm install
npm run dev          # http://localhost:3000 (no password locally)
npm run check        # lint + typecheck + production build
npm run thumbnails   # capture light/dark thumbnails (see CLAUDE.md for flags)
```

Deploy: Vercel project with Root Directory `playground` and env `PLAYGROUND_PASSWORD`.
