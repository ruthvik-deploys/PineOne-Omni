# Playground

A shared home for small prototypes. Each prototype is one folder under `app/prototypes/`. Live at https://pine-one-playground.vercel.app (ask the owner for the password).

Agents: read [CLAUDE.md](./CLAUDE.md) first. It holds every rule.

## Getting access (once)

1. **GitHub:** ask the owner to add you as a collaborator on `tirth172001/PineOne-Omnichannel` with write access.
2. **Playground password:** ask the owner. It opens the live site and every preview link.
3. **Claude Code:** install it (`npm i -g @anthropic-ai/claude-code`) or use it on the web at claude.ai/code, which also works from a phone.

## Finding things

The home page shows folders: Docs, Design system, Pine One, Pine One app, Pine Omni, Pine Omni app and Onboarding. Open one to see what's inside. The search box looks through every folder at once, including the full text of the research docs.

## Research docs

Merchant research, user journeys and similar documents live in the **Docs** folder (`docs/`, one Markdown file each). Give the agent the file and ask it to add it; `docs/README.md` has the steps. Agents working anywhere in the repo read these before making design judgements.

## Making a prototype

You describe it; the agent builds it. `CLAUDE.md` tells the agent the folder layout, design rules, thumbnails and PR steps, so your request only has to say *what* you want.

**From a laptop**
```bash
git clone https://github.com/tirth172001/PineOne-Omnichannel.git
cd PineOne-Omnichannel/playground
npm install
claude
```
Then ask, for example:
> Create a prototype called "Tip calculator": enter a bill, pick a tip %, split between people. Open a PR when done.

**From a phone:** open claude.ai/code, pick the `PineOne-Omnichannel` repo, and send the same kind of request.

The agent then:
1. Creates a branch and the folder `app/prototypes/<name>/`.
2. Builds it and checks it at phone and desktop sizes, in light and dark.
3. Captures the gallery thumbnails.
4. Runs lint, type-check and a production build.
5. Opens a pull request and replies with the **preview link**.

Open the link, try it, and ask for changes in the same chat. When you're happy, merge the PR and it appears in the live gallery.

## Adding a project you already built

You don't need to rebuild it. Give the agent the link and say how you want it in:

> Add my project https://github.com/someone/budget-app (deployed at https://budget-app.vercel.app) to the playground as "Budget app". Open a PR.

The agent picks one of three ways (details in `CLAUDE.md` → "Bringing in an existing project"):

| Your project | What happens | You need to give |
|---|---|---|
| Already deployed, or a big or full app in any framework | A gallery card that embeds it (phone frame) or opens it. The code stays where it is, and your updates show up automatically. | The live URL |
| Small React / Next.js prototype | Moved into the playground and restyled to its design system, so it lives here from now on. | Repo link or zip, plus any env var names (send values to the owner privately) |
| Static site (HTML, Vite…) that isn't deployed | Its build is copied in and shown in a frame. | Repo link or zip |

If you don't say, the agent embeds or links the deployment. That's the fastest option and nothing breaks.

## Trying a version or experiment

Ask for it as a variant, and say what you want to test:

> Make a variant of the KYC onboarding where business verification and banking are one step. Keep the current one as it is.

The original stays untouched. The variant gets its own card, in the same group, labelled "Variant of …", so you can open both and compare.

| You want to vary… | Where the agent builds it |
|---|---|
| A playground prototype | A copy of its folder in the playground |
| A web portal flow (e.g. sign-up, KYC) | A parallel route in the web portal, deployed as a preview and linked here |
| A mobile app screen | A switch in the app's experiments file, deployed as a preview and linked here |

When you've decided, say which one wins. The other is hidden from the gallery, not deleted.

## Tips for good requests

- Say what it does and who it's for, in a sentence or two. Leave out layout details unless they matter. The default is a clean single column.
- Mention tunable things ("let me change speed and colour") and you get a control panel with Randomize and Reset.
- Prototypes are private (behind the password). Ask explicitly for "make <name> public" to get a shareable `/p/<name>` link with a preview image and video.
- To change someone else's prototype, ask the same way: "In the tip-calculator prototype, add rounding."

## Running it yourself

```bash
npm run dev          # http://localhost:3000, no password locally
npm run check        # lint + typecheck + production build
npm run thumbnails   # light/dark thumbnails (flags in CLAUDE.md)
```

Deploy: Vercel project `pine-one-playground`, Root Directory `playground`, env `PLAYGROUND_PASSWORD`.
