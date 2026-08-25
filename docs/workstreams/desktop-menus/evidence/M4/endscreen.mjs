#!/usr/bin/env node
/* #menu-rework M4 — H-f: are the changed sites inside a measured cell?
   ============================================================================

     node docs/workstreams/desktop-menus/evidence/M4/endscreen.mjs --out <dir>

   THE HAZARD, IN THIS SCREEN'S OWN TERMS. `viewport-survey.mjs` has a `victory` cell, so it is
   tempting to read a green run as covering the end screen. It does not. **A cell reaches one STATE
   of a surface**, and this screen's composition is a function of the run that produced it: the survey
   starts from a FRESH profile, which is still inside onboarding — and `GameOver.jsx` branches on
   exactly that (`{!onboarding && earn && …}` renders the earnings panel, `{onboarding && …}` the
   onboarding banner instead). So the survey's `victory` cell sees one of the two, never both.

   MR1 paid for this lesson one screen earlier: three of its eight sites were in no cell at all,
   because a tab is a state. This harness is that finding applied before the fact rather than after.

   WHAT IT DOES. It seeds a profile PAST onboarding — M8's, imported rather than reproduced, because
   it already carries the schema stamp and the four flags — plays one run to the end screen through
   the survey's own step list, and then does two things:

     1. A PRESENCE CENSUS of every selector M4 touched. It is printed for every cell and stored in
        the matrix, so "covered" is a number in the evidence rather than an impression. Selectors that
        are NOT reachable this way are reported as zero and named in the record; a harness that
        quietly measured eleven of fourteen sites would be the defect it exists to prevent.
     2. `surfaceProbeSource()` — the instrument the gate already uses — written into the survey's cell
        shape, so `scripts/surface-delta.mjs` compares before and after with no special case.

   TWO CELLS, NOT TEN, and that is a scope statement rather than a shortcut: the five-viewport,
   two-language question belongs to the survey, which measures this surface at all ten. What only this
   harness can answer is whether the OTHER branch of the screen exists at all — and that answer does
   not vary with viewport width. de/1280x720 and en/1920x1080 are the two the contract calls binding.

   DETERMINISM AND THE BUNDLE come from the shared modules, as everywhere else in this workstream:
   pinned clock, the board answered locally, reduced motion, seeded random, `dist/` verified before the
   first cell and again after the last. */

import { writeFileSync, mkdirSync, readFileSync, existsSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { launch, setViewport, reduceMotion, seedRandom, suppressInstallPrompt, screenshot,
  goto, evaluate, sleep } from "../../../../../scripts/cdp.mjs";
import { surfaceProbeSource } from "../../../../../scripts/surfaceProbe.js";
import { seedBlob } from "../M8/seed.mjs";
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
  return i >= 0 && process.argv[i + 1] ? resolve(process.argv[i + 1]) : join(HERE, "endscreen");
})();

/* Four cells: both languages at the two viewports the contract calls binding — 1280x720 (the itch.io
   release) and 1920x1080 (the shrinkage reference). The five-viewport question belongs to the survey,
   which measures this surface at all ten; what only this harness can answer — does the OTHER branch of
   the screen exist at all — does not vary with width. Four is what the owner-facing set needs. */
const CELLS = [["de", 1280, 720], ["de", 1920, 1080], ["en", 1280, 720], ["en", 1920, 1080]];

/* `--shots <dir>` also writes one PNG per cell: the owner-facing set, captured HERE rather than in a
   second script, because the browser is already at the right viewport, in the right language, at the
   end of a navigation that took minutes to walk. PNG and not base64-with-a-png-name — M7 shipped
   twelve of those, and the contract asks for one to be opened and confirmed. */
const SHOT_DIR = (() => {
  const i = process.argv.indexOf("--shots");
  return i >= 0 && process.argv[i + 1] ? resolve(process.argv[i + 1]) : null;
})();

/* Every selector this task changed, plus the two the migration deliberately left alone, so the census
   says what it saw rather than what it hoped for. */
const CENSUS = [
  ".go-root", ".go-card", ".go-actions > button", ".go-heroblock", ".go-heroblock.is-record",
  ".go-earn", ".go-card .go-box", ".go-earn .as-edge-card", ".go-best", ".go-bestrow", ".go-bestnew",
  ".go-origin", ".go-build", ".go-build .rs-chips > *", ".go-stats", ".go-layout",
  ".go-blist", ".go-blist button", ".go-ticks .rg-perTrick > summary",
  ".go-onb", ".go-unlocks", ".ul-root",
];

/* The survey's own walk to the end screen (viewport-survey.mjs, surface `victory`), copied as DATA
   rather than imported: the survey exports nothing, and a second copy of a step LIST cannot drift
   into a second copy of a decision. */
const STEPS = [
  { text: "Lauf beginnen|Start run", settle: 2200 },
  { sel: ".sk-offers button", settle: 1500 },
  { turbo: true },
  { until: ".lv-offercard", maxMs: 90000 },
  { sel: ".lv-offercard", settle: 1500 },
  { until: '[data-tut="form-energy"]', maxMs: 90000 },
  { sel: '[data-tut="form-energy"] .as-edge-strong', settle: 1500 },
  { until: '[data-tut="arch-board"]', maxMs: 120000 },
  { sel: '[data-tut="arch-done"]', settle: 1500 },
  { text: "Beenden|End", settle: 1200 },
  { sel: ".rc-row", nth: 1, settle: 1500 },
  { until: ".go-root", maxMs: 30000 },
];

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

/* ------------------------------------------------------------------ controls */

/* TWO SEEDS, AND THE SECOND ONE IS THE POINT OF `--fresh`. The default seeds M8's profile, which is
   past onboarding and therefore renders the branch the survey never reaches. `--fresh` seeds exactly
   what `viewport-survey.mjs` seeds — an options blob and a username, nothing else — so the census it
   takes is a census of THE STATE THE GATE ACTUALLY MEASURES, rather than of a state this harness
   invented. Without it, "the changed sites are inside a measured cell" would be a claim about a
   different cell. */
const FRESH = process.argv.includes("--fresh");

const seedScript = (lang) => {
  /* `as_reset_epoch` IS LOAD-BEARING HERE AND THE SURVEY DOES NOT NEED IT, which is the whole trap.
     `viewport-survey.mjs` writes its two keys WITHOUT clearing, so the epoch stamp storage.js already
     put there survives. This harness clears first — a half-seeded profile is a different screen — and
     clearing takes the stamp with it. On the next boot `resetOnce()` (storage.js:332) sees no match,
     wipes, and `as_username` goes with it: the first-start modal then stands over the end screen, the
     surface probe counts its nodes, and the owner set shows the wrong screen.
     Measured, not reasoned: the first `--fresh` run reported 371 surface nodes against the seeded
     run's 357, and the opened screenshot showed the modal. Recorded as M4-F06. */
  const blob = FRESH
    ? { as_reset_epoch: "2026-08-16-test-neustart",
        as_options: JSON.stringify({ lang, muted: true, telemetry: false, reducedFx: "an", testViewport: null }),
        as_username: "SURVEY" }
    : JSON.parse(JSON.stringify(seedBlob("__L__")).replace('"__L__"', JSON.stringify(lang)));
  return "(() => {\n"
    + "  try { localStorage.clear(); } catch (e) {}\n"
    + "  const b = " + JSON.stringify(blob) + ";\n"
    + "  for (const k of Object.keys(b)) localStorage.setItem(k, b[k]);\n"
    + "  localStorage.removeItem(\"as_activerun\");\n"
    + "  return Object.keys(b).length;\n"
    + "})()";
};

const clickSel = (sel, nth = 0) => "(() => {\n"
  + "  const all = Array.prototype.slice.call(document.querySelectorAll(" + JSON.stringify(sel) + "));\n"
  + "  const vis = all.filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; });\n"
  + "  const hit = vis[" + nth + "];\n"
  + "  if (!hit) return { ok: false, why: " + JSON.stringify(sel) + " + \" [\" + " + nth + " + \"]: \" + all.length + \" matches, \" + vis.length + \" visible\" };\n"
  + "  hit.click(); return { ok: true };\n"
  + "})()";

const clickText = (spec) => "(() => {\n"
  + "  const want = " + JSON.stringify(spec) + ".split(\"|\").map((s) => s.toLowerCase());\n"
  + "  const btns = Array.prototype.slice.call(document.querySelectorAll(\"button, a[role=button]\"));\n"
  + "  for (const w of want) {\n"
  + "    const hit = btns.find((b) => (b.textContent || \"\").trim().toLowerCase().startsWith(w));\n"
  + "    if (hit) { hit.click(); return { ok: true }; }\n"
  + "  }\n"
  + "  return { ok: false, why: \"no button starting with \" + JSON.stringify(want) };\n"
  + "})()";

const TURBO = "(() => {\n"
  + "  const m = Array.prototype.slice.call(document.querySelectorAll(\"button\"))\n"
  + "    .find((b) => (b.textContent || \"\").trim() === \"MAX\");\n"
  + "  if (!m) return { ok: false, why: \"no MAX turbo button\" };\n"
  + "  m.click(); return { ok: true };\n"
  + "})()";

const hasMarker = (sel) => "(() => !!document.querySelector(" + JSON.stringify(sel) + "))()";

const censusOf = (sels) => "(() => {\n"
  + "  const out = {};\n"
  + "  for (const s of " + JSON.stringify(sels) + ") out[s] = document.querySelectorAll(s).length;\n"
  + "  return out;\n"
  + "})()";

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
  + "  await Promise.all(imgs.map((i) => race(loaded(i), 5000, false)));\n"
  + "  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));\n"
  + "  return { fontsOk, images: imgs.length, animations: document.getAnimations().length };\n"
  + "})()";

/* ------------------------------------------------------------------ main */

mkdirSync(OUT, { recursive: true });
const server = await ensureServer();
const c = await launch();
const matrix = { generated: null, base: BASE, frozen: new Date(FROZEN_MS).toISOString(),
                 sizes: [...new Set(CELLS.map(([, w, h]) => w + "x" + h))],
                 langs: [...new Set(CELLS.map(([l]) => l))], cells: {} };
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
    + " · the board answered locally · profile seeded PAST onboarding (M8's, schema-stamped)\n");

  for (const [lang, w, h] of CELLS) {
    const size = w + "x" + h;
    const key = lang + "/" + size + "/" + (FRESH ? "victory-fresh" : "victory-seeded");
    process.stdout.write("\n  " + lang + " · " + size + "\n");
    await setViewport(c, { width: w, height: h, deviceScaleFactor: 1 });
    let cell;
    try {
      await goto(c, ORIGIN, { settleMs: 400 });
      const seeded = await evaluate(c, seedScript(lang));
      await goto(c, ORIGIN, { settleMs: 1200 });

      const trace = [];
      let failed = null;
      for (const step of STEPS) {
        let r;
        if (step.turbo) r = await evaluate(c, TURBO);
        else if (step.until) {
          const deadline = Date.now() + (step.maxMs || 90000);
          r = { ok: false, why: step.until + " never appeared" };
          while (Date.now() < deadline) {
            if (await evaluate(c, hasMarker(step.until))) { r = { ok: true }; break; }
            await sleep(1200);
          }
        } else if (step.sel !== undefined) r = await evaluate(c, clickSel(step.sel, step.nth || 0));
        else r = await evaluate(c, clickText(step.text));
        trace.push({ step: step.until || step.sel || step.text || "turbo", ok: !!r.ok, why: r.why });
        if (!r.ok) { failed = r.why; break; }
        await sleep(step.settle || 700);
      }
      if (failed) {
        unreached++;
        matrix.cells[key] = { reached: false, why: failed, trace, seeded };
        process.stdout.write("    NOT REACHED — " + failed + "\n");
        continue;
      }

      const settled = await evaluate(c, SETTLE);
      const census = await evaluate(c, censusOf(CENSUS));
      const surf = await evaluate(c, surfaceProbeSource());
      cell = Object.assign({ reached: true, trace, settled, seeded, census }, surf);
      const seen = Object.entries(census).filter(([, n]) => n > 0);
      const blind = Object.entries(census).filter(([, n]) => n === 0).map(([s]) => s);
      process.stdout.write("    ok · " + cell.surface.length + " surf · "
        + seen.length + "/" + CENSUS.length + " selectors present\n");
      if (blind.length) process.stdout.write("    NOT RENDERED HERE: " + blind.join(", ") + "\n");
      if (SHOT_DIR) {
        mkdirSync(SHOT_DIR, { recursive: true });
        const png = await screenshot(c, null, { format: "png" });
        const file = join(SHOT_DIR, lang + "__" + size + "__victory.png");
        writeFileSync(file, Buffer.from(png, "base64"));
        cell.shot = file;
        process.stdout.write("    shot -> " + file + "\n");
      }
    } catch (err) {
      unreached++;
      cell = { reached: false, why: String((err && err.message) || err) };
      process.stdout.write("    FAILED — " + cell.why + "\n");
    }
    matrix.cells[key] = cell;
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
