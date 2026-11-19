# Pine One mobile app

Expo (React Native) app with Expo Router. Setup for the whole repo is in the [root README](../README.md).

```bash
npm install          # uses .npmrc (legacy-peer-deps)
npx expo start       # w = browser, scan QR = Expo Go, i/a = simulators
```

- Screens: `src/app/` (file-based routes)
- Components: `src/components/`
- Mock data: `src/data/`
- Agent rules (Expo conventions): `AGENTS.md`
- Add packages with `npx expo install <pkg>`, not `npm i`, so versions match the Expo SDK

Checks before a PR: `npm run lint` and `npx tsc --noEmit`.

Deployed as a static web build (`npx expo export -p web`, see `vercel.json`) to the Vercel project `pineone-mobile`.

Don't run `npm run reset-project`. It's leftover Expo starter tooling and moves the whole app into `app-example/`.
