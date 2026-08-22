#!/usr/bin/env node
/* #viewport-1280 commit 4 — the survey: what does the desktop layout do at 1280 px?
   ============================================================================

     npm run build
     node scripts/viewport-survey.mjs            # full matrix
     node scripts/viewport-survey.mjs --size 1280x720 --lang de     # one cell, for debugging

   THIS MEASURES AND DOES NOT REPAIR. Contract §9: what overflows is written down, not fixed, even
   when the fix would be one line. The output of this script is evidence for T2, not a change.

   THE MATRIX is contract §5.1: five sizes by two languages. 1920 is captured FIRST in every
   language because the text-shrinkage criterion (§5.3 item 5) is defined against it — "no text at
   1280 smaller than the same text at 1920" needs the 1920 side to exist before the comparison.

   PRODUCTION BUILD, real CDP viewport, port 5181 with --strictPort (contract §3). Not the in-app
   harness: it is VITE_PREVIEW-gated and folded out of production, so it cannot be what ships is
   measured through.

   DETERMINISM is inherited from phone-proof.mjs and is not optional here either — a survey that
   varies between runs produces findings nobody can reproduce. Same controls: reduced motion, seeded
   Math.random, muted, telemetry off, minimal effect tier, seeded username, install prompt
   suppressed, every image forced eager and awaited, every animation pinned to time 0. That last one
   was earned: an unpinned as-panel-sweep made the shop differ from itself by 0.66 % of its pixels
   (evidence-T1.md §7.6.1).

   REACHABILITY IS REPORTED, NEVER ASSUMED. Each surface names a marker that must exist once its
   navigation has run. If the marker is missing the cell is recorded as `reached: false` with the
   step that failed, and the run continues. A survey that silently measured the hub five times while
   claiming to have measured five screens is worse than one with a named gap. */

import { writeFileSync, mkdirSync, readFileSync, existsSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { launch, setViewport, reduceMotion, seedRandom, suppressInstallPrompt,
  goto, evaluate, sleep } from "./cdp.mjs";
import { probeSource } from "./surveyProbe.js";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "docs/workstreams/viewport-1280/evidence/survey");
const PORT = 5181;
const BASE = (() => {
  const html = readFileSync(join(ROOT, "dist/index.html"), "utf8");
  const m = html.match(/<script[^>]+src="([^"]*)\/assets\//);
  return m && m[1] ? `${m[1]}/` : "/";
})();
const ORIGIN = `http://localhost:${PORT}${BASE}`;

/* Contract §5.1. 1920 first — it is the reference for the shrinkage criterion. */
const SIZES = [[1920, 1080], [1600, 900], [1536, 791], [1400, 700], [1280, 720]];
const REFERENCE = "1920x1080";
const LANGS = ["de", "en"];

/* ------------------------------------------------------------------ surfaces

   `steps` navigate from a freshly loaded hub. `marker` is what must be on screen afterwards; it is
   the difference between measuring a surface and measuring whatever happened to be showing. */
const SURFACES = [
  { id: "hub", steps: [], marker: ".as-hub-tile" },
  { id: "upgrades", steps: [{ tile: 0 }], marker: ".up-root, .up-vgrid, .up-head" },
  { id: "shop-packs", steps: [{ tile: 1 }], marker: ".cz-card, .cz-main" },
  { id: "leaderboard", steps: [{ tile: 2 }], marker: ".lb-page, .lb-body" },
  { id: "stats", steps: [{ tile: 3 }], marker: ".st-sec, .st-readout" },
  /* The guide button lives inside a FACTION page, not in the default "general" branch — measured:
     .up-page-guide has 0 matches until a faction row in the navigation column is chosen. */
  { id: "guide", steps: [{ tile: 0 }, { sel: ".up-navrow", nth: 1 }, { sel: ".up-page-guide" }],
    marker: ".gd-desk, .gd-page, .gd-cols" },
  { id: "glossary", steps: [{ sel: ".gloss-i-btn" }], marker: ".gl-desk, .gl-body, .gl-page" },
  { id: "options", steps: [{ text: "Optionen|Options" }], marker: ".op-head, .as-ring-run" },
  { id: "feedback", steps: [{ text: "Feedback" }], marker: ".fb-form" },
  { id: "privacy", steps: [{ text: "Datenschutz|Privacy" }], marker: ".as-panel" },
];

/* ------------------------------------------------------------------ server */

async function serverAlive() {
  try { return (await fetch(ORIGIN, { signal: AbortSignal.timeout(1500) })).ok; } catch { return false; }
}
async function ensureServer() {
  if (await serverAlive()) return { stop: async () => {} };
  const viteBin = join(ROOT, "node_modules", "vite", "bin", "vite.js");
  if (!existsSync(viteBin)) throw new Error("vite not found — run `npm ci` in this worktree first.");
  /* --base is not optional: vite.config.js only applies the deploy base for `build`, so `preview`
     would serve dist/ at "/" while index.html points at "/autostich/". Every asset would come back
     as the SPA fallback with status 200, the module would never run, and the page would look merely
     slow. Measured in phone-proof.mjs before the flag was added. */
  const proc = spawn(process.execPath, [viteBin, "preview", "--port", String(PORT), "--strictPort", "--base", BASE],
    { cwd: ROOT, stdio: "ignore" });
  for (let i = 0; i < 150; i++) {
    if (await serverAlive()) return { stop: async () => { proc.kill(); await sleep(300); } };
    await sleep(200);
  }
  proc.kill();
  throw new Error(`vite preview did not come up on ${PORT}`);
}

/* ------------------------------------------------------------------ controls */

const profileFor = (lang) => ({ lang, muted: true, telemetry: false, reducedFx: "an", testViewport: null });
const seedScript = (lang) => `(() => {
  localStorage.setItem("as_options", ${JSON.stringify(JSON.stringify(profileFor("__L__")))}.replace("__L__", ${JSON.stringify(lang)}));
  localStorage.setItem("as_username", "SURVEY");
  return true;
})()`;

/* Same settle contract as phone-proof.mjs, and for the same measured reasons. */
const SETTLE = `(async () => {
  const deadline = (ms, v) => new Promise((r) => setTimeout(() => r(v), ms));
  const race = (p, ms, v) => Promise.race([p, deadline(ms, v)]);
  for (const a of document.getAnimations()) { try { a.currentTime = 0; a.pause(); } catch (e) {} }
  const fontsOk = await race(document.fonts.ready.then(() => true), 3000, false);
  const imgs = Array.from(document.images);
  for (const i of imgs) if (i.loading === "lazy") i.loading = "eager";
  const loaded = (i) => i.complete ? Promise.resolve(true) : new Promise((r) => {
    i.addEventListener("load", () => r(true), { once: true });
    i.addEventListener("error", () => r(true), { once: true });
  });
  const settled = await Promise.all(imgs.map(async (i) => {
    if (!await race(loaded(i), 5000, false)) return false;
    return race(i.decode().then(() => true).catch(() => true), 2000, false);
  }));
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  return { fontsOk, images: imgs.length, timedOut: settled.filter((ok) => !ok).length,
    animations: document.getAnimations().length };
})()`;

const clickTile = (i) => `(() => {
  const t = Array.prototype.slice.call(document.querySelectorAll(".as-hub-tile"));
  if (!t[${i}]) return { ok: false, why: "tile " + ${i} + " of " + t.length + " not found" };
  t[${i}].click(); return { ok: true };
})()`;

/* Click by visible text, alternatives separated by "|" so one map serves both languages. */
const clickText = (spec) => `(() => {
  const want = ${JSON.stringify(spec)}.split("|").map((s) => s.toLowerCase());
  const btns = Array.prototype.slice.call(document.querySelectorAll("button, a[role=button]"));
  for (const w of want) {
    const hit = btns.find((b) => (b.textContent || "").trim().toLowerCase().startsWith(w));
    if (hit) { hit.click(); return { ok: true, on: (hit.textContent || "").trim().slice(0, 30) }; }
  }
  return { ok: false, why: "no button starting with " + JSON.stringify(want) };
})()`;

/* Click the first VISIBLE match. A hidden twin is normal here — the glossary button exists twice in
   the start screen (corner below the threshold, footer above it) and exactly one of them is live. */
const clickSel = (sel, nth = 0) => `(() => {
  const all = Array.prototype.slice.call(document.querySelectorAll(${JSON.stringify(sel)}));
  const vis = all.filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; });
  const hit = vis[${nth}];
  if (!hit) return { ok: false, why: ${JSON.stringify(sel)} + "[" + ${nth} + "]: " + all.length + " matches, " + vis.length + " visible" };
  hit.click(); return { ok: true };
})()`;

const hasMarker = (sel) => `(() => !!document.querySelector(${JSON.stringify(sel)}))()`;

/* ------------------------------------------------------------------ one cell */

async function measure(c, surface) {
  await goto(c, ORIGIN, { settleMs: 900 });
  const trace = [];
  for (const step of surface.steps) {
    const r = step.tile !== undefined ? await evaluate(c, clickTile(step.tile))
            : step.sel !== undefined ? await evaluate(c, clickSel(step.sel, step.nth || 0))
                                      : await evaluate(c, clickText(step.text));
    trace.push({ step, ...r });
    if (!r.ok) return { reached: false, trace };
    await sleep(700);
  }
  const settled = await evaluate(c, SETTLE);
  if (!await evaluate(c, hasMarker(surface.marker))) {
    return { reached: false, trace, why: `marker ${surface.marker} absent after navigation` };
  }
  const probe = await evaluate(c, probeSource());
  return { reached: true, trace, settled, ...probe };
}

/* ------------------------------------------------------------------ shrinkage

   Contract §5.3 item 5, and the ONLY text criterion T1b enforces: nothing at this width may be set
   smaller than the same node at the reference width. Matched on the structural path, so a class
   rename cannot turn a comparison into a miss. */
function shrinkage(cell, reference) {
  if (!cell.type || !reference || !reference.type) return null;
  const ref = new Map(reference.type.map((t) => [t.path, t]));
  const out = [];
  for (const t of cell.type) {
    const r = ref.get(t.path);
    if (!r) continue;
    if (t.size < r.size - 0.01) {
      out.push({ path: t.path, tag: t.tag, here: t.size, at: r.size,
        delta: Math.round((r.size - t.size) * 100) / 100, text: t.text });
    }
  }
  return out;
}

/* ------------------------------------------------------------------ main */

const argv = process.argv.slice(2);
const only = { size: argv[argv.indexOf("--size") + 1], lang: argv[argv.indexOf("--lang") + 1] };
const sizes = argv.includes("--size") ? SIZES.filter(([w, h]) => `${w}x${h}` === only.size) : SIZES;
const langs = argv.includes("--lang") ? LANGS.filter((l) => l === only.lang) : LANGS;
if (!sizes.length || !langs.length) throw new Error("no cell matches the given --size/--lang");

mkdirSync(OUT, { recursive: true });
const server = await ensureServer();
const c = await launch();
const matrix = { generated: null, base: BASE, sizes: sizes.map(([w, h]) => `${w}x${h}`), langs, cells: {} };
let unreached = 0;

try {
  await c.send("Page.enable");
  await c.send("Runtime.enable");
  await reduceMotion(c);
  await seedRandom(c);
  await suppressInstallPrompt(c);

  for (const lang of langs) {
    await setViewport(c, { width: 1280, height: 720, deviceScaleFactor: 1 });
    await goto(c, ORIGIN, { settleMs: 300 });
    await evaluate(c, seedScript(lang));

    for (const [w, h] of sizes) {
      const size = `${w}x${h}`;
      await setViewport(c, { width: w, height: h, deviceScaleFactor: 1 });
      process.stdout.write(`\n  ${lang} · ${size}\n`);

      for (const s of SURFACES) {
        const key = `${lang}/${size}/${s.id}`;
        let cell;
        try {
          cell = await measure(c, s);
        } catch (e) {
          cell = { reached: false, why: String(e && e.message || e) };
        }
        if (cell.reached) {
          const ref = matrix.cells[`${lang}/${REFERENCE}/${s.id}`];
          cell.shrunk = size === REFERENCE ? [] : shrinkage(cell, ref);
          const sc = cell.pageScroll;
          process.stdout.write(`    ${s.id.padEnd(14)} scroll ${sc.x}x${sc.y}px · `
            + `${cell.overflows.length} overflow · ${cell.outside.length} outside · `
            + `${cell.truncated.length} truncated · ${cell.type.length} text`
            + `${cell.shrunk && cell.shrunk.length ? ` · ${cell.shrunk.length} SHRUNK` : ""}\n`);
        } else {
          unreached++;
          process.stdout.write(`    ${s.id.padEnd(14)} NOT REACHED — ${cell.why || (cell.trace || []).map((t) => t.why).filter(Boolean).join("; ")}\n`);
        }
        matrix.cells[key] = cell;
      }
    }
  }
} finally {
  await c.close();
  await server.stop();
}

writeFileSync(join(OUT, "matrix.json"), JSON.stringify(matrix, null, 1));
const total = Object.keys(matrix.cells).length;
process.stdout.write(`\n  ${total} cells · ${unreached} not reached\n  evidence -> ${join(OUT, "matrix.json")}\n`);
