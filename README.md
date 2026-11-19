# Pine One

Three projects live in this repo. Each one installs and runs on its own.

| Folder | What | Stack | Package manager | Live |
|---|---|---|---|---|
| `/` (root) | **Web portal**: Pine One Omni merchant dashboard | Next.js 16, React 19, Tailwind, shadcn/ui | pnpm | pine-one-user-journey-v2.vercel.app |
| `mobile/` | **Mobile app**: Pine One merchant app | Expo 57 (React Native), Expo Router | npm | pineone-mobile.vercel.app (web build) |
| `playground/` | **Prototype playground**: gallery of small prototypes | Next.js 16, shadcn/ui | npm | pine-one-playground.vercel.app (password) |

Product and design docs are in `docs/` (start at `docs/README.md`).

**Using an AI agent (Claude Code, Codex, Cursor…)?** It reads [`AGENTS.md`](AGENTS.md) automatically: the repo map, dependencies, rules, and step-by-step recipes for adding a prototype, bringing in an existing project, and making a version or experiment. Mobile design rules are in [`mobile/DESIGN_RULES.md`](mobile/DESIGN_RULES.md).

## Before you start (once)

1. **Access:** ask the owner to add you to the GitHub repo with write access. For the playground you also need its password.
2. **Node 22** (see `.nvmrc`). With nvm: `nvm install && nvm use`. Check with `node -v`.
3. **pnpm** for the web portal: `corepack enable` (ships with Node, gives you the pinned pnpm 9).
4. **Git**, plus optionally:
   - **Claude Code** (`npm i -g @anthropic-ai/claude-code`, or claude.ai/code in the browser) to build with an agent. Every project has rules files (`CLAUDE.md` / `AGENTS.md`) the agent reads automatically. Optional: `npx skills experimental_install` restores the agent skills listed in `skills-lock.json` (e.g. shadcn).
   - **Expo Go** on your phone (App Store / Play Store) to run the mobile app on a device.

```bash
git clone https://github.com/tirth172001/PineOne-Omnichannel.git
cd PineOne-Omnichannel
```

All dependencies are declared in each project's `package.json` and pinned by its lockfile (`pnpm-lock.yaml`, `mobile/package-lock.json`, `playground/package-lock.json`). Always install with the command below so you get exactly the same versions. No `.env` file is needed to run any of them locally.

## Web portal (root)

```bash
pnpm install
pnpm dev               # http://localhost:3000
```

| Task | Command |
|---|---|
| Lint | `pnpm lint` |
| Unit tests | `pnpm test` |
| Production build | `pnpm build` |
| Storybook | `pnpm storybook` (http://localhost:6006) |

Pages live in `app/` (one folder per route), shared UI in `components/`, and data and logic in `lib/`.

## Mobile app (`mobile/`)

```bash
cd mobile
npm install            # .npmrc sets legacy-peer-deps; don't remove it
npx expo start
```

Then:
- press **w** to open it in the browser (quickest), or
- scan the QR code with **Expo Go** (phone on the same Wi-Fi), or
- press **i** / **a** for the iOS simulator / Android emulator (needs Xcode / Android Studio).

| Task | Command |
|---|---|
| Lint | `npm run lint` |
| Type-check | `npx tsc --noEmit` |
| Storybook | `npm run start:storybook` |
| Web build (what's deployed) | `npx expo export -p web` → `dist/` |

Screens are in `src/app/` (Expo Router, file-based), components in `src/components/`, and mock data in `src/data/`. Add packages with `npx expo install <pkg>` (it picks versions that match the Expo SDK), and read `mobile/AGENTS.md` before changing code.

## Playground (`playground/`)

```bash
cd playground
npm install
npm run dev -- -p 3001   # -p 3001 so it can run next to the web portal
```

How to create prototypes, and how to bring an existing project in: see [`playground/README.md`](playground/README.md).

## Working together

- **Experiments and versions:** never overwrite the current version to try an idea. Ask for a variant; the recipe is in `AGENTS.md` → "Make a version or experiment". Variants show next to the original in the playground.

- Branch from `main` (`git switch -c <your-name>/<topic>`), push, and open a pull request. Don't commit to `main` directly.
- Run the project's lint, type-check and build before opening the PR.
- Never commit secrets (`.env*` is gitignored).
