#!/usr/bin/env node
/* #menu-rework MR1 — the zero-delta gate for the three sites the survey's leaderboard cell never renders.
   ============================================================================

     node docs/workstreams/desktop-menus/evidence/MR1/lb-week.mjs --out <dir>

   MEASURED, NOT ASSUMED, AND IT IS WHY THIS FILE EXISTS. Counting the nodes that actually PAINT the
   row ground in the baseline matrix gives 50 across all 160 cells — and every one of them is on
   `glossary` (10) or `feedback` (40). The leaderboard contributes **zero**. Three of the eight sites
   this task migrates — `.lb-weekcount`, `.lb-ctxtile`, `.lb-mod` — are outside every cell the survey
   has ever taken, so a green `surface-delta.mjs` run says nothing whatever about them.

   THE REASON IS THE ENTRY, and M8 already put it on record (measurements/M8.md, "it is not enough for
   this task"): the survey opens hub tile 2, which is the BOARD entry on its default tab. All three
   rules live behind `tab === "meister"`, and two of them additionally behind `!boardMode` — the
   cockpit and the context tiles exist only in the RANKED entry, which no survey cell has ever opened.

   So this harness opens both entries on that tab and runs `surfaceProbeSource()` — the instrument the
   gate already uses — writing `matrix.json` in the survey's cell shape so `scripts/surface-delta.mjs`
   compares it with no special case. Same gate, third matrix.

   THE BOARD IS HELD STILL by M8's `seed.mjs`, imported rather than reproduced: a fixed twenty-row
   table served through a `fetch` interceptor, plus the four profile flags `rankedUnlocked()` demands
   — without them the ranked cockpit renders the LOCKED line, `.lb-modlist` never mounts, and this
   harness would measure the absence of the very thing it exists to measure. That is asserted below
   rather than hoped for. */

import { writeFileSync, mkdirSync, readFileSync, existsSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { launch, setViewport, reduceMotion, seedRandom, suppressInstallPrompt,
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
  return i >= 0 && process.argv[i + 1] ? resolve(process.argv[i + 1]) : join(HERE, "lb-week");
})();

const SIZES = [[1920, 1080], [1600, 900], [1536, 791], [1400, 700], [1280, 720]];
const LANGS = ["de", "en"];

/* Two entries, one tab. `meister` is index 1 in TABS_BOARD and index 0 in TABS_RANKED — addressed by
   index because the id order is fixed in the source and the labels are language-dependent, which is
   the same choice M8's harness makes for the same reason.
   `expect` is what each cell must actually be showing; a cell that reaches the tab but renders none
   of it is recorded as unreached rather than counted as evidence. */
const ENTRIES = [
  { id: "board-week",  open: { tile: 2 },              tab: 1, expect: [".lb-weekcount"] },
  { id: "ranked-week", open: { sel: ".as-ranked-btn" }, tab: 0,
    expect: [".lb-weekcount", ".lb-ctxtile", ".lb-mod"] },
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

const seedScript = (lang) => {
  const blob = seedBlob(lang);
  return "(() => {\n"
    + "  try { localStorage.clear(); } catch (e) {}\n"
    + "  const b = " + JSON.stringify(blob) + ";\n"
    + "  for (const k of Object.keys(b)) localStorage.setItem(k, b[k]);\n"
    + "  localStorage.removeItem(\"as_activerun\");\n"
    + "  return Object.keys(b).length;\n"
    + "})()";
};

const clickTile = (i) => "(() => {\n"
  + "  const t = Array.prototype.slice.call(document.querySelectorAll(\".as-hub-tile\"));\n"
  + "  if (!t[" + i + "]) return { ok: false, why: \"tile " + i + " of \" + t.length + \" not found\" };\n"
  + "  t[" + i + "].click(); return { ok: true };\n"
  + "})()";

const clickSel = (sel, nth = 0) => "(() => {\n"
  + "  const all = Array.prototype.slice.call(document.querySelectorAll(" + JSON.stringify(sel) + "));\n"
  + "  const vis = all.filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; });\n"
  + "  const hit = vis[" + nth + "];\n"
  + "  if (!hit) return { ok: false, why: " + JSON.stringify(sel) + " + \"[\" + " + nth + " + \"]: \" + all.length + \" matches, \" + vis.length + \" visible\" };\n"
  + "  hit.click(); return { ok: true };\n"
  + "})()";

const countOf = (sels) => "(() => {\n"
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
    + " · the board answered from M8's fixed twenty rows\n");

  for (const lang of LANGS) {
    await setViewport(c, { width: 1280, height: 720, deviceScaleFactor: 1 });
    await goto(c, ORIGIN, { settleMs: 300 });
    await evaluate(c, seedScript(lang));

    for (const [w, h] of SIZES) {
      const size = w + "x" + h;
      await setViewport(c, { width: w, height: h, deviceScaleFactor: 1 });
      process.stdout.write("\n  " + lang + " · " + size + "\n");

      for (const e of ENTRIES) {
        const key = lang + "/" + size + "/" + e.id;
        let cell;
        try {
          await goto(c, ORIGIN, { settleMs: 900 });
          const open = e.open.tile !== undefined ? await evaluate(c, clickTile(e.open.tile))
                                                 : await evaluate(c, clickSel(e.open.sel));
          if (!open.ok) {
            unreached++;
            matrix.cells[key] = { reached: false, why: open.why };
            process.stdout.write("    " + e.id.padEnd(12) + " NOT REACHED — " + open.why + "\n");
            continue;
          }
          await sleep(800);
          const tab = await evaluate(c, clickSel('.lb-tabs [role="tab"]', e.tab));
          if (!tab.ok) {
            unreached++;
            matrix.cells[key] = { reached: false, why: tab.why };
            process.stdout.write("    " + e.id.padEnd(12) + " NOT REACHED — " + tab.why + "\n");
            continue;
          }
          await sleep(900);
          const settled = await evaluate(c, SETTLE);

          /* THE ASSERTION THIS HARNESS EXISTS FOR. A cell that opened the tab but rendered none of
             the three rules is not a green cell — it is the same blind spot one level down, and a
             gate that cannot see the thing it gates is worse than no gate. */
          const present = await evaluate(c, countOf(e.expect));
          const missing = e.expect.filter((s) => !present[s]);
          if (missing.length) {
            unreached++;
            matrix.cells[key] = { reached: false, why: "rendered nothing for " + missing.join(", "), present };
            process.stdout.write("    " + e.id.padEnd(12) + " NOT REACHED — nothing for " + missing.join(", ") + "\n");
            continue;
          }

          const surf = await evaluate(c, surfaceProbeSource());
          cell = Object.assign({ reached: true, settled, present }, surf);
          process.stdout.write("    " + e.id.padEnd(12) + " ok · " + cell.surface.length + " surf · "
            + e.expect.map((s) => s + "=" + present[s]).join(" ") + "\n");
        } catch (err) {
          unreached++;
          cell = { reached: false, why: String((err && err.message) || err) };
          process.stdout.write("    " + e.id.padEnd(12) + " FAILED — " + cell.why + "\n");
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
