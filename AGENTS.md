# Pine One repo: guide for agents

Read this first, whatever tool you are (Claude Code reads it through `CLAUDE.md`; Codex, Cursor and others read `AGENTS.md`). It tells you what's here, how to run it, which rules apply, and the exact steps for the common requests: **add something**, **bring something in**, or **make a version or experiment**.

People using this repo are mostly **designers**. They describe outcomes, not code. Ask at most one clarifying question, pick sensible defaults, and finish with a link they can open on a phone.

## 1. What's in the repo

Three independent projects. Each has its own dependencies, lockfile and package manager. **Never install a package at the root for `mobile/` or `playground/`, or the other way round.**

| Folder | What | Package manager | Run | Deployed to (Vercel project) |
|---|---|---|---|---|
| `/` (root) | **Pine One web portal**: merchant dashboard, onboarding, sign-up | **pnpm** (`packageManager: pnpm@9`) | `pnpm install && pnpm dev` → :3000 | pine-one-user-journey-v2.vercel.app (`pine-one-user-journey-v2`) |
| `mobile/` | **Pine One mobile app** (Expo / React Native) | **npm** (`.npmrc`: legacy-peer-deps) | `cd mobile && npm install && npx expo start` | pine-one-app.vercel.app (`pine-one-app`, static web build; see `playground/app/prototypes/pine-one-mobile/HOW_IT_WORKS.md` for the deploy command) |
| `playground/` | **Prototype playground**: gallery of prototypes and links to other apps | **npm** | `cd playground && npm install && npm run dev -- -p 3001` | pine-one-playground.vercel.app (`pine-one-playground`, password) |

Other folders: `docs/` holds product and design docs (start at `docs/README.md`; module specs in `docs/design/`, flows in `docs/flows/`, decisions in `docs/decisions/decision-log.md`). `tests/` holds the web unit tests. `.storybook/` is the web Storybook.

Node 22 (`.nvmrc`). No `.env` is needed to run anything locally.

### Key dependencies (check `package.json` for exact versions)

| Project | Framework | UI | Other |
|---|---|---|---|
| Web | Next.js 16 (App Router), React 19 | Tailwind v4, shadcn/ui (`radix-nova`, olive base) on Radix, Phosphor icons, Pine theme in `app/globals.css` | react-hook-form + zod, Recharts, framer-motion, sonner, next-themes, Storybook 10 |
| Mobile | Expo SDK 57, Expo Router, React Native 0.86 | React Native Paper (Material 3) with the Pine theme in `src/constants/`, `@gorhom/bottom-sheet`, Reanimated 4, `@expo/vector-icons` | Storybook for React Native |
| Playground | Next.js 16, React 19 | Tailwind v4, shadcn/ui (all components), lucide icons | next-themes, Playwright (thumbnails) |

**Adding a dependency:**
- Web: `pnpm add <pkg>` at the root.
- Mobile: `cd mobile && npx expo install <pkg>`. It picks the SDK-compatible version. Never use plain `npm i` there. Native modules need a dev build (see `mobile/AGENTS.md`).
- Playground: `cd playground && npm i <pkg>`.

Commit the updated lockfile with it. Don't add a library when an installed one already does the job; check `package.json` and `components/ui` first.

### Agent skills
The skills used here (e.g. the shadcn skill) aren't committed, but `skills-lock.json` is. Restore them with `npx skills experimental_install` at the root.

## 2. Rules that always apply

- **Check the research before you judge.** Merchant research, user journeys and similar documents live in `playground/docs/` (index and rules in `playground/docs/README.md`). Before a design or product decision in any of the three projects, read what's relevant there and cite it. If it contradicts the request, say so; if nothing covers it, say that instead of inventing findings.
- **Read the project's own rules before changing it:**
  - Web portal: section 4 below, plus `docs/design/` for the module you touch.
  - Mobile: `mobile/AGENTS.md` (Expo conventions) and `mobile/DESIGN_RULES.md` (the app's design rules).
  - Playground: `playground/CLAUDE.md` (all rules, including importing and variants).
- **Branch for every task:**
  - `git switch -c <name>/<topic>` for normal work;
  - `exp/<name>` for experiments;
  - `proto/<slug>` for playground prototypes.
  Never commit to `main`.
- **Before you say "done", run the project's checks:**
  - web: `pnpm lint && pnpm test && pnpm build`;
  - mobile: `npx expo lint && npx tsc --noEmit`;
  - playground: `npm run check`.
  If a check fails, say so with the output.
- **Check it visually.** Screenshot what you changed (Playwright is installed in `playground/`), at phone width (375–390px) and, for web, desktop width. Compare against the reference page or Figma frame you were given.
- **Never commit secrets** (`.env*` is gitignored) or customer research files (visit notes, interview transcripts). The GitHub repo is public.
- **Deploying is publishing.** Only deploy when the person asks. End with the URL.
- When something goes wrong and you fix it, add the lesson to the relevant rules file in the same PR.

## 3. Recipes

### Add a new prototype (most requests)
Follow `playground/CLAUDE.md` → "Creating a new prototype". In short: `app/prototypes/<slug>/` with `page.tsx`, `metadata.json` (including `folder`, `surface` and `group`) and `HOW_IT_WORKS.md`; build to the rules; `npm run thumbnails -- <slug>`; `npm run check`; then a PR plus the preview link.

### Bring in a project someone already built
Follow `playground/CLAUDE.md` → "Bringing in an existing project". Default: link or embed its deployment (`external`). Port the code only when it's a small React prototype and they want it to live here. If it's an app with several flows, give each flow its own entry with a deep link.

### Make a version or experiment
Pick the row that matches what they want to try:

| They want to… | Do this | Shows up in the playground as |
|---|---|---|
| Try a different take on a **playground prototype** | Copy the folder to `<slug>-<idea>` (e.g. `tip-calculator-swipe`), add `"variantOf": "<original-slug>"` to its metadata, and change only what the idea needs. Leave the original untouched. | A card in the same group labelled "Variant of …" |
| Try a design change in the **mobile app** | On `exp/<name>`, add a switch in `mobile/src/constants/experiments.ts` (copy the comment format: what it does, the Figma frame, the files it touches), default `false`. Branch on it in the components. Set it `true` on the branch and deploy a preview: `vercel deploy` from `mobile/`, without `--prod`. Vercel runs `expo export -p web` itself (`mobile/vercel.json`). | A new `external` entry (`embed: "phone"`, `surface: "mobile"`, `variantOf: "pine-one-mobile"`) pointing at the preview URL |
| Try a different flow in the **web portal** | On `exp/<name>`, build it as a **parallel route** next to the current one (`app/<flow>-<idea>/…`, like `/onboarding-demo` beside `/signup`), reusing `components/`. Don't change the existing flow. Deploy a preview from the root (`vercel deploy`, no `--prod`). | A new `external` entry (`surface: "web"`, `variantOf` the flow's current entry, e.g. `pine-one-web-kyc`) |
| Keep the winner | Merge its branch. Mobile: set the switch to `true` (or delete the old path). Web: replace the old route or redirect it. Mark the losing entries `"hidden": true` as a record; the playground still shows every entry. | Original entry updated; variants hidden |

Always write down the **hypothesis** (one sentence: what's different and why) at the top of the variant's `HOW_IT_WORKS.md`, the experiment switch's comment, or the PR description.

### Change the web portal or mobile app directly
Branch, make the change, run the checks, screenshot, and open a PR. If the change is visible on a screen that has a playground entry, regenerate that entry's thumbnail after the deployment updates (`cd playground && npm run thumbnails -- <slug>`).

## 4. Web portal rules (root)

- **UI:** build from the installed shadcn components in `components/ui` (Field/FieldGroup, ToggleGroup, Empty, Item, Spinner, sonner, Sidebar, Tooltip…) with semantic tokens. The Pine theme in `app/globals.css` sits on top. **Never** run `shadcn apply`, a preset, or `--overwrite`; they replace the theme. Check `components/ui` before adding a component.
- **Icons:** Phosphor (`@phosphor-icons/react`).
- **Layouts follow the Figma references, kept lean.**
  - Overview follows Mercury Home: one setup card with a stepper, then pairs of equal cards.
  - Product setup pages follow Mercury "You're nearly there": a numbered checklist with the current step open.
  - Other products follow Shopify "Sell in person" cards.
  - Use one sentence per step and one primary button. No duplicate explanations.
- **Onboarding:**
  - In-store, Payment links and Checkout are separate products with separate onboarding.
  - Sign-up goes straight into full-screen onboarding. Step 1 is "Choose your products", and the steps that follow come from that choice. Verification is shared and done once.
  - Logic: `docs/flows/progressive-onboarding-logic.md`.
- **Structure:**
  - pages in `app/` (one folder per route; route groups in parentheses);
  - shared UI in `components/<area>/`;
  - logic and mock data in `lib/`;
  - tests in `tests/*.test.mjs` (`pnpm test`).

## 5. Where things are deployed and how to update them

- Web: `vercel deploy --prod` from the root. Mobile: from `mobile/`, run the deploy command in `playground/app/prototypes/pine-one-mobile/HOW_IT_WORKS.md`. It targets `pine-one-app`; the folder's own `.vercel` link points at the older `pineone-mobile` project on another team. Vercel runs `expo export -p web` itself. Playground: `vercel deploy --prod` from `playground/` (it needs `PLAYGROUND_PASSWORD`, already set in Vercel).
- **Storybooks** aren't rebuilt automatically:
  - Web: https://pine-one-storybook.vercel.app, built with `pnpm build-storybook`.
  - Mobile: https://pine-one-app-storybook.vercel.app, built with `STORYBOOK_ENABLED=true npx expo export -p web`.
  - The exact deploy commands are in `playground/app/prototypes/pine-one-{web,app}-storybook/HOW_IT_WORKS.md`. Rebuild after changing stories.
- Without `--prod` you get a **preview URL**. Use previews for experiments, and put the preview URL in the playground entry.
- If the repo is connected to Vercel's Git integration, every pushed branch gets a preview automatically. Use that URL instead of running `vercel deploy`.
