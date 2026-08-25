#!/usr/bin/env node
/* #menu-rework M5 — H-c: the two mount points the survey never opens.
   ============================================================================

     node docs/workstreams/desktop-menus/evidence/M5/mounts.mjs --out <dir>

   THE SURVEY SEES ONE OF THREE. `GuideOverlay` is mounted from `UpgradeScreen.jsx:919`,
   `GameOver.jsx:426` and `SkillSelect.jsx:534`. The survey's `guide` cell reaches only the first —
   `{ tile: 0 } -> { .up-navrow, nth: 1 } -> { .up-page-guide }`, through the upgrade tree. A cell
   reaches one STATE of a surface, and MR1 found three of its eight sites in no cell at all for
   exactly this reason.

   THE SECOND MOUNT IS THE ONE THAT MATTERS, and it is why this file exists rather than a paragraph.
   `SkillSelect` is the PICK PHASE — the battle session, out of this round entirely. The contract's
   acceptance gate turns on `skill-choice` staying at zero, and that is the survey's job; what the
   survey cannot say is whether the overlay THIS TASK MIGRATED, opened from inside the pick phase,
   still draws what it drew. So this harness opens it there and measures it with the gate's own
   instrument.

   The i-chip is addressed by its shape rather than its label: it is the only 18-px round button on
   the skill screen and its text is the single character "i" (`SkillSelect.jsx:431`, the desktop
   replacement for the pager badge). Its `aria-label` is localised, so matching on that would need
   both spellings of a control that already has a stable shape.

   THE THIRD MOUNT — `GameOver` — IS NOT REACHED HERE, and the record says so rather than implying
   otherwise. It opens only from a progress unlock that carries a guide (`GameOver.jsx:387`), which
   needs an onboarding run landing on that specific reward; M4 measured that branch as absent from
   every cell it could reach. What can be said without measuring it is narrow and is said as such:
   the mount renders the same component with the same two props, so any difference between mounts
   would have to come from the surrounding tree, not from this task's diff.

   DETERMINISM AND THE BUNDLE come from the shared modules, as everywhere in this workstream. */

import { writeFileSync, mkdirSync, readFileSync, existsSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { launch, setViewport, reduceMotion, seedRandom, suppressInstallPrompt, screenshot,
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
  return i >= 0 && process.argv[i + 1] ? resolve(process.argv[i + 1]) : join(HERE, "mounts");
})();
const SHOT_DIR = (() => {
  const i = process.argv.indexOf("--shots");
  return i >= 0 && process.argv[i + 1] ? resolve(process.argv[i + 1]) : null;
})();

/* Both languages at the two viewports the contract calls binding. */
const CELLS = [["de", 1280, 720], ["de", 1920, 1080], ["en", 1280, 720], ["en", 1920, 1080]];

/* Every selector M5 touched, plus the ones it deliberately left alone, so the census reports what it
   saw instead of what it hoped for. */
const CENSUS = [
  ".gd-dim", ".gd-frame", ".gd-card", ".gd-head", ".gd-hint", ".gd-close", ".gd-hair",
  ".gd-desk", ".gd-nav", ".gd-navhead", ".gd-navrow", ".gd-navrow.is-on", ".gd-navnote",
  ".gd-page", ".gd-page .gd-pillar", ".gd-page .gd-valve", ".gd-page .gd-bar", ".gd-page .gd-princ",
  ".gd-tabs", ".gd-ringbox",
];

/* Reach the skill choice, then open the guide from inside it. The first three steps are the survey's
   own `skill-choice` walk, verbatim as data. */
const STEPS = [
  { text: "Lauf beginnen|Start run", settle: 2200 },
  { until: ".sk-offers", maxMs: 60000 },
  { ichip: true, settle: 1200 },
  { until: ".gd-desk, .gd-page, .gd-cols", maxMs: 20000 },
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

const seedScript = (lang) => "(() => {\n"
  + "  localStorage.setItem(\"as_reset_epoch\", \"2026-08-16-test-neustart\");\n"
  + "  localStorage.setItem(\"as_options\", " + JSON.stringify(JSON.stringify(
      { lang, muted: true, telemetry: false, reducedFx: "an", testViewport: null })) + ");\n"
  + "  localStorage.setItem(\"as_username\", \"M5\");\n"
  + "  localStorage.removeItem(\"as_activerun\");\n"
  + "  return 1;\n"
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

/* The desktop i-chip, and the exclusion is the whole point of this comment. "The only visible button
   whose text is 'i'" is WRONG, and it cost this harness a run: the hub's GLOSSARY button is also a
   Georgia italic "i" (`.gloss-i-btn`), it is still in the document behind the run, and it is earlier
   in DOM order — so the first attempt opened the glossary, reported `ok`, and then failed four cells
   later on a marker that could never appear. M5-F05.
   Written as "contains no X other than Y" rather than as "is present", which is H-e: the chip is a
   visible button of text "i" that is NOT the glossary's, and its 18-px box is asserted rather than
   assumed, so a second same-shaped control cannot slip in unnoticed. */
const CLICK_ICHIP = "(() => {\n"
  + "  const all = Array.prototype.slice.call(document.querySelectorAll(\"button\"));\n"
  + "  const eyes = all.filter((b) => (b.textContent || \"\").trim() === \"i\")\n"
  + "    .filter((b) => { const r = b.getBoundingClientRect(); return r.width > 0 && r.height > 0; });\n"
  + "  const mine = eyes.filter((b) => !b.classList.contains(\"gloss-i-btn\"));\n"
  + "  if (mine.length !== 1) return { ok: false, why: \"expected exactly one non-glossary i-chip, found \"\n"
  + "    + mine.length + \" (of \" + eyes.length + \" visible i-buttons)\" };\n"
  + "  const r = mine[0].getBoundingClientRect();\n"
  + "  if (Math.round(r.width) !== 18) return { ok: false, why: \"the i-chip is \" + Math.round(r.width)\n"
  + "    + \" px wide, not 18 — this is probably a different control\" };\n"
  + "  mine[0].click(); return { ok: true };\n"
  + "})()";

const hasMarker = (sel) => "(() => !!document.querySelector(" + JSON.stringify(sel) + "))()";

const censusOf = (sels) => "(() => {\n"
  + "  const out = {};\n"
  + "  for (const s of " + JSON.stringify(sels) + ") out[s] = document.querySelectorAll(s).length;\n"
  + "  return out;\n"
  + "})()";

/* The sub-1280 half of the answer, and it needs no navigation: `--sf-ground` is the ONE step this
   task pointed a `GuideBody` value at, and `GuideBody` is what reaches `DeckDetail`, which M3
   measured as phone-only. If the token has one declaration and no media override, it has one value
   at every width — and then the substitution cannot move the phone. Read off the live document
   rather than off the stylesheet, because that is where a media override would show. */
const TOKEN_AT_WIDTH = "(() => {\n"
  + "  const cs = getComputedStyle(document.documentElement);\n"
  + "  return { sfGround: cs.getPropertyValue(\"--sf-ground\").trim(),\n"
  + "           edQuiet: cs.getPropertyValue(\"--ed-quiet\").trim(),\n"
  + "           width: window.innerWidth };\n"
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
                 langs: [...new Set(CELLS.map(([l]) => l))], cells: {}, tokenAtWidths: {} };
let unreached = 0;

try {
  await c.send("Page.enable");
  await c.send("Runtime.enable");
  await reduceMotion(c);
  await seedRandom(c);
  await suppressInstallPrompt(c);
  await c.send("Page.addScriptToEvaluateOnNewDocument", { source: freezeClockSource() });
  await c.send("Page.addScriptToEvaluateOnNewDocument", { source: fetchStubSource() });
  process.stdout.write("  clock pinned · board answered locally · the guide opened from the PICK PHASE\n");

  /* H-b first, and at three widths including two below the threshold: does the one step this task
     pointed a GuideBody value at carry the same value on the phone as on the desktop? */
  for (const w of [1920, 1280, 1100, 390]) {
    await setViewport(c, { width: w, height: 800, deviceScaleFactor: 1 });
    await goto(c, ORIGIN, { settleMs: 500 });
    matrix.tokenAtWidths[w] = await evaluate(c, TOKEN_AT_WIDTH);
  }
  const vals = Object.values(matrix.tokenAtWidths).map((v) => v.sfGround);
  process.stdout.write("  --sf-ground at 1920/1280/1100/390: " + vals.join(" · ")
    + (new Set(vals).size === 1 ? "   [one value at every width]" : "   [DIFFERS BY WIDTH]") + "\n");

  for (const [lang, w, h] of CELLS) {
    const size = w + "x" + h;
    const key = lang + "/" + size + "/guide-from-pick";
    process.stdout.write("\n  " + lang + " · " + size + "\n");
    await setViewport(c, { width: w, height: h, deviceScaleFactor: 1 });
    let cell;
    try {
      await goto(c, ORIGIN, { settleMs: 400 });
      await evaluate(c, seedScript(lang));
      await goto(c, ORIGIN, { settleMs: 1200 });

      const trace = [];
      let failed = null;
      for (const step of STEPS) {
        let r;
        if (step.ichip) r = await evaluate(c, CLICK_ICHIP);
        else if (step.until) {
          const deadline = Date.now() + (step.maxMs || 60000);
          r = { ok: false, why: step.until + " never appeared" };
          while (Date.now() < deadline) {
            if (await evaluate(c, hasMarker(step.until))) { r = { ok: true }; break; }
            await sleep(1000);
          }
        } else r = await evaluate(c, clickText(step.text));
        trace.push({ step: step.until || step.text || "i-chip", ok: !!r.ok, why: r.why });
        if (!r.ok) { failed = r.why; break; }
        await sleep(step.settle || 700);
      }
      if (failed) {
        unreached++;
        matrix.cells[key] = { reached: false, why: failed, trace };
        process.stdout.write("    NOT REACHED — " + failed + "\n");
        continue;
      }

      const settled = await evaluate(c, SETTLE);
      const census = await evaluate(c, censusOf(CENSUS));
      const surf = await evaluate(c, surfaceProbeSource());
      cell = Object.assign({ reached: true, trace, settled, census }, surf);
      const blind = Object.entries(census).filter(([, n]) => n === 0).map(([s]) => s);
      process.stdout.write("    ok · " + cell.surface.length + " surf · "
        + (CENSUS.length - blind.length) + "/" + CENSUS.length + " selectors present\n");
      if (blind.length) process.stdout.write("    NOT RENDERED HERE: " + blind.join(", ") + "\n");
      if (SHOT_DIR) {
        mkdirSync(SHOT_DIR, { recursive: true });
        const png = await screenshot(c, null, { format: "png" });
        const file = join(SHOT_DIR, lang + "__" + size + "__guide.png");
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
