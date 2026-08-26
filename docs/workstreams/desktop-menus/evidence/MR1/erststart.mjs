#!/usr/bin/env node
/* #menu-rework MR1 — the zero-delta gate for the ONE screen the survey cannot reach.
   ============================================================================

     node docs/workstreams/desktop-menus/evidence/MR1/erststart.mjs --out <dir>

   WHY THIS FILE EXISTS. MR1 migrates eight sites onto `--sf-row`, and one of them is the constant in
   `UsernameModal.jsx:37` with its three readers (124, 179, and the rule `.un-first .un-prev` in
   index.css). The screen they paint is the FIRST START, and first start has no cell in
   `viewport-survey.mjs` and never has had one: the survey seeds `as_username` before it boots, so
   `showUsername` (App.jsx:302) is false and `.un-first` is absent from every matrix this workstream
   owns. M9 named that as its H-c and measured the screen with a harness of its own; this is the same
   road with a different instrument at the end of it.

   IT IS THE SAME GATE, NOT A SOFTER ONE. M9's `measure.mjs` checks a design document's claims and
   writes its own JSON shape. MR1's acceptance criterion is zero COMPUTED deltas, so this script runs
   `surfaceProbeSource()` — the instrument the gate already uses — and writes `matrix.json` in the
   survey's cell shape, so `scripts/surface-delta.mjs` compares it with no special case. One gate, two
   matrices, because one screen is out of the survey's reach.

   BOTH VARIANTS OF THE MODAL, and that is the point rather than thoroughness for its own sake.
   `.un-prev` renders in the change-name variant too (UsernameModal.jsx:178 sits outside the
   `firstTime` branch), while the stylesheet rule that carries the row ground is `.un-first .un-prev`
   — first start only. So in the change-name variant the inline constant is the ONLY thing painting
   that row, with no rule above it to mask a wrong token. That is the cell where this migration would
   fail loudest, so it is measured.

   DETERMINISM AND THE BUNDLE come from the shared modules, exactly as the survey takes them: pinned
   clock, local answer for `autostich_scores`, reduced motion, seeded random, and `dist/` verified
   before the first cell and again after the last. */

import { writeFileSync, mkdirSync, readFileSync, existsSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { launch, setViewport, reduceMotion, seedRandom, suppressInstallPrompt,
  goto, evaluate, sleep } from "../../../../../scripts/cdp.mjs";
import { surfaceProbeSource } from "../../../../../scripts/surfaceProbe.js";
import { fetchStubSource, freezeClockSource, FROZEN_MS } from "../../../../../scripts/survey-stub.mjs";
import { assertServesDist } from "../../../../../scripts/survey-bundle.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "../../../../..");
const PORT = 5181;
const BASE = (() => {
  const html = readFileSync(join(ROOT, "dist/index.html"), "utf8");
  const m = html.match(/<script[^>]+src="([^"]*)\/assets\//);
  return m && m[1] ? `${m[1]}/` : "/";
})();
const HOST = `http://localhost:${PORT}`;
const ORIGIN = `${HOST}${BASE}`;
const DIST = join(ROOT, "dist");

const OUT = (() => {
  const i = process.argv.indexOf("--out");
  return i >= 0 && process.argv[i + 1] ? resolve(process.argv[i + 1]) : join(HERE, "erststart");
})();

/* The survey's five sizes and both languages, so a delta cannot hide at one width. */
const SIZES = [[1920, 1080], [1600, 900], [1536, 791], [1400, 700], [1280, 720]];
const LANGS = ["de", "en"];
const SURFACES = ["erststart", "namechange"];

/* The seeded name doubles as the handle for the change-name control. The hub's button has no class
   of its own (StartScreen.jsx:870) and its label is localised, but it PRINTS the name — so the name
   is what identifies it, in either language. */
const SEEDED_NAME = "MR1";

/* ------------------------------------------------------------------ server */

async function serverAlive() {
  try { return (await fetch(ORIGIN, { signal: AbortSignal.timeout(1500) })).ok; } catch { return false; }
}
async function ensureServer() {
  if (await serverAlive()) {
    await assertServesDist(HOST, DIST, { when: "inherited server, checked before the run" });
    process.stdout.write("  reusing the server on " + PORT + " — verified against dist/\n");
    return { stop: async () => {} };
  }
  const viteBin = join(ROOT, "node_modules", "vite", "bin", "vite.js");
  if (!existsSync(viteBin)) throw new Error("vite not found — run `npm ci` in this worktree first.");
  const proc = spawn(process.execPath, [viteBin, "preview", "--port", String(PORT), "--strictPort", "--base", BASE],
    { cwd: ROOT, stdio: "ignore" });
  for (let i = 0; i < 150; i++) {
    if (await serverAlive()) {
      const stop = async () => { proc.kill(); await sleep(300); };
      try { await assertServesDist(HOST, DIST, { when: "own server, checked before the run" }); }
      catch (e) { await stop(); throw e; }
      process.stdout.write("  started a server on " + PORT + " — verified against dist/\n");
      return { stop };
    }
    await sleep(200);
  }
  proc.kill();
  throw new Error("vite preview did not come up on " + PORT);
}

/* ------------------------------------------------------------------ seeds

   `erststart` needs `as_username` ABSENT — that is literally what `showUsername` reads. `namechange`
   needs the opposite, plus a route to the control. Both clear the store first: a half-seeded profile
   is a different screen, and M9 paid for that sentence already. */
const RESET_EPOCH = "2026-08-16-test-neustart";
const optionsFor = (lang) => JSON.stringify({ lang, muted: true, telemetry: false, reducedFx: "an", testViewport: null });

const seedFirstStart = (lang) => "(() => {\n"
  + "  localStorage.clear();\n"
  + "  localStorage.setItem(\"as_reset_epoch\", " + JSON.stringify(RESET_EPOCH) + ");\n"
  + "  localStorage.setItem(\"as_options\", " + JSON.stringify(optionsFor(lang)) + ");\n"
  + "  return { username: localStorage.getItem(\"as_username\") };\n"
  + "})()";

const seedNamed = (lang) => "(() => {\n"
  + "  localStorage.clear();\n"
  + "  localStorage.setItem(\"as_reset_epoch\", " + JSON.stringify(RESET_EPOCH) + ");\n"
  + "  localStorage.setItem(\"as_options\", " + JSON.stringify(optionsFor(lang)) + ");\n"
  + "  localStorage.setItem(\"as_username\", " + JSON.stringify(SEEDED_NAME) + ");\n"
  + "  localStorage.setItem(\"as_tutorial_done\", \"1\");\n"
  + "  return { username: localStorage.getItem(\"as_username\") };\n"
  + "})()";

/* Click the visible button that prints the seeded name. Visible-only, same rule the survey uses: a
   hidden twin below the threshold is normal in this tree. */
const clickByName = (name) => "(() => {\n"
  + "  const want = " + JSON.stringify(name) + ";\n"
  + "  const all = Array.prototype.slice.call(document.querySelectorAll(\"button\"));\n"
  + "  const hit = all.filter((b) => (b.textContent || \"\").indexOf(want) >= 0)\n"
  + "    .filter((b) => { const r = b.getBoundingClientRect(); return r.width > 0 && r.height > 0; })[0];\n"
  + "  if (!hit) return { ok: false, why: \"no visible button printing \" + want + \" (\" + all.length + \" buttons)\" };\n"
  + "  hit.click(); return { ok: true, on: (hit.textContent || \"\").trim().slice(0, 40) };\n"
  + "})()";

/* Same settle contract as the survey, for the same measured reasons. */
const SETTLE = "(async () => {\n"
  + "  const deadline = (ms, v) => new Promise((r) => setTimeout(() => r(v), ms));\n"
  + "  const race = (p, ms, v) => Promise.race([p, deadline(ms, v)]);\n"
  + "  for (const a of document.getAnimations()) { try { a.currentTime = 0; a.pause(); } catch (e) {} }\n"
  + "  const fontsOk = await race(document.fonts.ready.then(() => true), 3000, false);\n"
  + "  const imgs = Array.from(document.images);\n"
  + "  for (const i of imgs) if (i.loading === \"lazy\") i.loading = \"eager\";\n"
  + "  const loaded = (i) => i.complete ? Promise.resolve(true) : new Promise((r) => {\n"
  + "    i.addEventListener(\"load\", () => r(true), { once: true });\n"
  + "    i.addEventListener(\"error\", () => r(true), { once: true });\n"
  + "  });\n"
  + "  const settled = await Promise.all(imgs.map(async (i) => {\n"
  + "    if (!await race(loaded(i), 5000, false)) return false;\n"
  + "    return race(i.decode().then(() => true).catch(() => true), 2000, false);\n"
  + "  }));\n"
  + "  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));\n"
  + "  return { fontsOk, images: imgs.length, timedOut: settled.filter((ok) => !ok).length,\n"
  + "    animations: document.getAnimations().length };\n"
  + "})()";

const hasMarker = (sel) => "(() => !!document.querySelector(" + JSON.stringify(sel) + "))()";

/* ------------------------------------------------------------------ main */

mkdirSync(OUT, { recursive: true });
const server = await ensureServer();
const c = await launch();
const matrix = { generated: null, base: BASE, frozen: new Date(FROZEN_MS).toISOString(),
                 sizes: SIZES.map(([w, h]) => w + "x" + h), langs: LANGS, cells: {} };
let unreached = 0;

try {
  await c.send("Page.enable");
  await c.send("Runtime.enable");
  await reduceMotion(c);
  await seedRandom(c);
  await suppressInstallPrompt(c);
  await c.send("Page.addScriptToEvaluateOnNewDocument", { source: freezeClockSource() });
  await c.send("Page.addScriptToEvaluateOnNewDocument", { source: fetchStubSource() });
  process.stdout.write("  clock pinned to " + new Date(FROZEN_MS).toISOString()
    + " · autostich_scores answered locally\n");

  for (const lang of LANGS) {
    for (const [w, h] of SIZES) {
      const size = w + "x" + h;
      await setViewport(c, { width: w, height: h, deviceScaleFactor: 1 });
      process.stdout.write("\n  " + lang + " · " + size + "\n");

      for (const id of SURFACES) {
        const key = lang + "/" + size + "/" + id;
        let cell;
        try {
          /* Seed, then RELOAD. `showUsername` is read once in a useState initialiser, so writing the
             key after the app has mounted changes nothing at all. The first goto gives us an origin
             to write into; the second is the one that boots against the seeded state. */
          await goto(c, ORIGIN, { settleMs: 400 });
          const seeded = await evaluate(c, id === "erststart" ? seedFirstStart(lang) : seedNamed(lang));
          await goto(c, ORIGIN, { settleMs: 1400 });

          const trace = [];
          if (id === "namechange") {
            const r = await evaluate(c, clickByName(SEEDED_NAME));
            trace.push(Object.assign({ step: "hub name control" }, r));
            if (!r.ok) {
              unreached++;
              matrix.cells[key] = { reached: false, why: r.why, trace, seeded };
              process.stdout.write("    " + id.padEnd(11) + " NOT REACHED — " + r.why + "\n");
              continue;
            }
            await sleep(900);
          }
          const settled = await evaluate(c, SETTLE);

          /* `.un-first` is the first-start variant; the change-name variant is the card WITHOUT it. */
          const marker = id === "erststart" ? ".un-first" : ".un-card:not(.un-first)";
          if (!await evaluate(c, hasMarker(marker))) {
            unreached++;
            matrix.cells[key] = { reached: false, why: "marker " + marker + " absent", trace, seeded };
            process.stdout.write("    " + id.padEnd(11) + " NOT REACHED — marker " + marker + " absent\n");
            continue;
          }
          const surf = await evaluate(c, surfaceProbeSource());
          cell = Object.assign({ reached: true, trace, settled, seeded }, surf);
          process.stdout.write("    " + id.padEnd(11) + " ok · " + cell.surface.length + " surf\n");
        } catch (e) {
          unreached++;
          cell = { reached: false, why: String((e && e.message) || e) };
          process.stdout.write("    " + id.padEnd(11) + " FAILED — " + cell.why + "\n");
        }
        matrix.cells[key] = cell;
      }
    }
  }
  await assertServesDist(HOST, DIST, { when: "after the last cell — was the bundle swapped mid-run?" });
  process.stdout.write("\n  bundle re-verified after the last cell — same dist/ throughout\n");
} finally {
  await c.close();
  await server.stop();
}

matrix.generated = new Date(FROZEN_MS).toISOString();
writeFileSync(join(OUT, "matrix.json"), JSON.stringify(matrix, null, 1));
process.stdout.write("  " + Object.keys(matrix.cells).length + " cells, " + unreached
  + " unreached -> " + join(OUT, "matrix.json") + "\n");
if (unreached) process.exitCode = 1;
