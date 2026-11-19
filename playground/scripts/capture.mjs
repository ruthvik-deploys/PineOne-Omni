#!/usr/bin/env node
// Captures light + dark gallery thumbnails (640×400) for prototypes, plus og:image / og:video for public ones.
//
//   npm run thumbnails                     # every prototype
//   npm run thumbnails -- my-proto other   # just these
//   npm run thumbnails -- --missing        # only prototypes without thumbnails
//   npm run thumbnails -- --og my-proto    # also (re)capture OG assets, even if not public
//   npm run thumbnails -- --skip-build     # reuse the existing .next build
//
// It builds for production, starts `next start` on a spare port with a throwaway password, signs in,
// and screenshots each prototype in both themes. Files land in public/thumbnails and public/og.
import { execFileSync, spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const flags = new Set(args.filter((a) => a.startsWith("--")));
const requested = args.filter((a) => !a.startsWith("--"));
const PORT = 3123;
const BASE = `http://localhost:${PORT}`;
const PASSWORD = "thumbnail-capture";
const thumbsDir = path.join(root, "public/thumbnails");
const ogDir = path.join(root, "public/og");
const scratch = path.join(root, ".capture");

function run(cmd, cmdArgs) {
  execFileSync(cmd, cmdArgs, { cwd: root, stdio: "inherit" });
}

function loadPrototypes() {
  const dir = path.join(root, "app/prototypes");
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !/^[[_(]/.test(d.name) && fs.existsSync(path.join(dir, d.name, "metadata.json")))
    .map((d) => ({ slug: d.name, meta: JSON.parse(fs.readFileSync(path.join(dir, d.name, "metadata.json"), "utf8")) }));
}

function hasThumbs(slug) {
  return ["light", "dark"].every((m) => fs.existsSync(path.join(thumbsDir, `${slug}-${m}.png`)));
}

async function waitForServer() {
  for (let i = 0; i < 120; i++) {
    try {
      const res = await fetch(`${BASE}/login`);
      if (res.ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error("Server didn't start on port " + PORT);
}

async function tokenFor(password) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`playground:${password}`));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

function hasFfmpeg() {
  try {
    execFileSync("ffmpeg", ["-version"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

async function newContext(browser, mode, options = {}) {
  const context = await browser.newContext({ colorScheme: mode, reducedMotion: "no-preference", ...options });
  await context.addCookies([{ name: "playground_auth", value: await tokenFor(PASSWORD), url: BASE }]);
  await context.addInitScript((theme) => {
    try {
      localStorage.setItem("theme", theme);
    } catch {}
  }, mode);
  return context;
}

async function settle(page) {
  await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(2000); // let canvases, iframes and entry animations run
}

function targetUrl({ slug, meta }) {
  return meta.external?.embed === "none" && meta.external.url ? meta.external.url : `${BASE}/prototypes/${slug}`;
}

async function captureThumbnails(browser, proto) {
  for (const mode of ["light", "dark"]) {
    // Render a desktop layout scaled down to a 640×400 file. External desktop apps get a wider viewport.
    const url = targetUrl(proto);
    const external = !url.startsWith(BASE);
    const width = external ? 1440 : 1280;
    const viewport = { width, height: width * (400 / 640) };
    const context = await newContext(browser, mode, { viewport, deviceScaleFactor: 640 / width });
    const seed = proto.meta.external?.seedLocalStorage;
    if (seed && proto.meta.external.url) {
      // Only on the external app's own origin (also inside a PhoneFrame iframe), before its scripts run.
      await context.addInitScript(
        ({ origin, entries }) => {
          if (location.origin !== origin) return;
          for (const [k, v] of Object.entries(entries)) localStorage.setItem(k, v);
        },
        { origin: new URL(proto.meta.external.url).origin, entries: seed }
      );
    }
    const page = await context.newPage();
    await page.goto(url, { waitUntil: "load" });
    await settle(page);
    const file = path.join(thumbsDir, `${proto.slug}-${mode}.png`);
    await page.screenshot({ path: file });
    await context.close();
    console.log(`  ✓ thumbnails/${proto.slug}-${mode}.png`);
  }
}

async function captureOg(browser, proto) {
  const url = `${BASE}/p/${proto.slug}`;
  const size = { width: 1200, height: 630 };
  const imageCtx = await newContext(browser, "dark", { viewport: size });
  const page = await imageCtx.newPage();
  const res = await page.goto(url, { waitUntil: "load" });
  if (!res || res.status() === 404) {
    await imageCtx.close();
    console.log(`  ! /p/${proto.slug} is 404 (not public) — skipped OG`);
    return;
  }
  await settle(page);
  await page.screenshot({ path: path.join(ogDir, `${proto.slug}.png`) });
  await imageCtx.close();
  console.log(`  ✓ og/${proto.slug}.png`);

  fs.mkdirSync(scratch, { recursive: true });
  const videoCtx = await newContext(browser, "dark", { viewport: size, recordVideo: { dir: scratch, size } });
  const vpage = await videoCtx.newPage();
  await vpage.goto(url, { waitUntil: "load" });
  await vpage.waitForTimeout(6000);
  const video = vpage.video();
  await videoCtx.close();
  const webm = await video.path();
  for (const ext of ["mp4", "webm"]) fs.rmSync(path.join(ogDir, `${proto.slug}.${ext}`), { force: true });
  if (hasFfmpeg()) {
    execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-ss", "1", "-i", webm, "-movflags", "+faststart", "-pix_fmt", "yuv420p", "-vcodec", "libx264", "-an", path.join(ogDir, `${proto.slug}.mp4`)]);
    console.log(`  ✓ og/${proto.slug}.mp4`);
  } else {
    fs.copyFileSync(webm, path.join(ogDir, `${proto.slug}.webm`));
    console.log(`  ✓ og/${proto.slug}.webm (install ffmpeg for mp4, which more platforms play)`);
  }
}

async function main() {
  const all = loadPrototypes();
  const unknown = requested.filter((s) => !all.some((p) => p.slug === s));
  if (unknown.length) throw new Error(`Unknown prototype(s): ${unknown.join(", ")}`);

  let targets = requested.length ? all.filter((p) => requested.includes(p.slug)) : all;
  if (flags.has("--missing")) targets = targets.filter((p) => !hasThumbs(p.slug));
  if (!targets.length) {
    console.log("Nothing to capture.");
    return;
  }
  const ogTargets = targets.filter((p) => p.meta.public || flags.has("--og"));

  fs.mkdirSync(thumbsDir, { recursive: true });
  fs.mkdirSync(ogDir, { recursive: true });
  if (!flags.has("--skip-build")) run("npm", ["run", "build"]);

  const server = spawn("npx", ["next", "start", "-p", String(PORT)], {
    cwd: root,
    env: { ...process.env, PLAYGROUND_PASSWORD: PASSWORD, NODE_ENV: "production" },
    stdio: "ignore",
    detached: true,
  });
  const stop = () => {
    try {
      process.kill(-server.pid);
    } catch {}
  };
  process.on("exit", stop);

  try {
    await waitForServer();
    const browser = await chromium.launch();
    for (const proto of targets) {
      console.log(proto.slug);
      await captureThumbnails(browser, proto);
      if (ogTargets.includes(proto)) await captureOg(browser, proto);
    }
    await browser.close();
  } finally {
    stop();
    fs.rmSync(scratch, { recursive: true, force: true });
  }
  run("node", ["scripts/registry.mjs"]);
  console.log("\nDone. Open the images and check them before committing.");
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
