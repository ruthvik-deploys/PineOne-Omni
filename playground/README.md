# Playground

A shared home for small prototypes. Each prototype is one folder under `app/prototypes/`. Live at https://pine-one-playground.vercel.app (ask the owner for the password).

Agents: read [CLAUDE.md](./CLAUDE.md) first. It holds every rule.

## Getting access (once)

1. **GitHub:** ask the owner to add you as a collaborator on `tirth172001/PineOne-Omnichannel` with write access.
2. **Playground password:** ask the owner. It opens the live site and every preview link.
3. **Claude Code:** install it (`npm i -g @anthropic-ai/claude-code`) or use it on the web at claude.ai/code, which also works from a phone.

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
