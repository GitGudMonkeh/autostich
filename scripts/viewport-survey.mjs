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
import { launch, setViewport, reduceMotion, seedRandom, suppressInstallPrompt, screenshot,
  goto, evaluate, sleep } from "./cdp.mjs";
import { probeSource } from "./surveyProbe.js";
/* #menu-rework M1: the surface axes the geometry probe does not see. See surfaceProbe.js
   for why this is a second probe and not an edit to the first. */
import { surfaceProbeSource } from "./surfaceProbe.js";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
/* `--out <dir>` added 2026-08-23 (#typo-system S0), and it fixes a real accident rather than adding
   a convenience. The output directory was hard-wired to the viewport-1280 strand's evidence folder,
   and the writer MERGES into whatever matrix.json it finds there. A survey run from a different
   workstream therefore silently rewrote another strand's committed evidence — which is what happened
   on the first full S0 run, and was caught only because `git status` showed the file modified.
   Evidence belongs to the workstream that produced it; the default stays put so existing invocations
   are unchanged. */
const OUT = (() => {
  const i = process.argv.indexOf("--out");
  return i >= 0 && process.argv[i + 1]
    ? resolve(process.argv[i + 1])
    : join(ROOT, "docs/workstreams/viewport-1280/evidence/survey");
})();
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

  /* ---- in-run surfaces ----------------------------------------------------
     Measured 2026-08-22: a run OPENS on the skill choice, so that screen needs no play at all. The
     run stage follows once a skill is taken, and the perk choice arrives about twelve seconds later
     with turbo at MAX. Formation, architect, victory, run details and the run dialogs sit further
     into the schedule and are still not reached — they stay named gaps in survey-findings.md §4. */
  { id: "skill-choice", steps: [{ text: "Lauf beginnen|Start run", settle: 2200 }], marker: ".sk-offers" },
  { id: "run-stage",
    steps: [{ text: "Lauf beginnen|Start run", settle: 2200 }, { sel: ".sk-offers button", settle: 1800 }],
    marker: ".rn-shell" },
  { id: "perk-choice",
    steps: [{ text: "Lauf beginnen|Start run", settle: 2200 }, { sel: ".sk-offers button", settle: 1500 },
            { turbo: true }, { until: ".lv-offercard", maxMs: 90000 }],
    marker: ".lv-offercard" },

  /* #typo-system S0 (2026-08-23): two surfaces added, and the §4.1 reason is worth keeping here.
     The typography workstream migrates ~770 size utilities and checks itself by re-running this
     survey and demanding zero deltas. On the thirteen surfaces above, that check reached roughly two
     thirds of them. `ArchitectScreen.jsx` alone carries 79 size utilities — the heaviest file in the
     tree — and `GameOver.jsx` 38, and neither was measured. Both are also two of the six screens the
     `#typo` pass never looked at, so without this they would have had neither a machine check nor a
     human one.

     The route is the one already proven for the perk choice — play forward with turbo and poll —
     NOT `DevRunSetup`. That was the proposal in survey-findings.md §4.1 and it is rejected: it is
     `VITE_PREVIEW`-gated, and this survey measures the PRODUCTION build on purpose. A baseline taken
     through a preview build is a baseline of something nobody plays.

     Both walk the decision schedule (`BASE_SCHEDULE`, constants.js): round 1 skill, 2 perk,
     3 formation, 4 shop. Round 4's "shop" IS the architect phase — the run passes `architect: true`
     (App.jsx:893), so it is enabled in a normal run even though `C.ARCHITECT_ENABLED` defaults to
     false for the sim. Each decision screen BLOCKS the schedule until it is dismissed, which is why
     these steps click through rounds 2 and 3 rather than waiting them out. */
  { id: "architect",
    steps: [{ text: "Lauf beginnen|Start run", settle: 2200 },
            { sel: ".sk-offers button", settle: 1500 },                       // R1 skill -> run stage
            { turbo: true },
            { until: ".lv-offercard", maxMs: 90000 },                         // R2 perk
            { sel: ".lv-offercard", settle: 1500 },                           // taking it is one click
            { until: '[data-tut="form-energy"]', maxMs: 90000 },              // R3 formation
            { sel: '[data-tut="form-energy"] .as-edge-strong', settle: 1500 },// "Fortfahren"
            { until: '[data-tut="arch-board"]', maxMs: 120000 }],              // R4 shop == architect
    /* MARKER, and the first attempt was wrong in a way worth recording. `.arch-toggle` looks like an
       architect class and is not: it lives in `ArchPanels.jsx`, which `ArchitectScreen` does not
       import — only `FormationPhase` and `ChronikOverview` do. A probe run reached step 7 of 8 and
       then waited out the full 120 s for a class that renders on a different screen.
       `ArchitectScreen` has NO root class of its own (its outermost node is
       `fixed inset-0 overlay-root z-20`, which every overlay shares), so the marker is the tutorial
       hook on the board instead — stable, semantic, and already load-bearing for the tutorial.
       Giving the screen a real root class is a `src/**` change S0 may not make; recorded as a
       finding for S2, which edits that file anyway. */
    marker: '[data-tut="arch-board"]' },

  /* Victory / end screen. NOT played to the end — `END_RUN` (reducer.js:308) ends a run voluntarily
     and goes straight to the end screen, which is what the "Beenden" control in the run does. A full
     run would take the schedule's whole length and measure the same markup.
     It walks the architect path FIRST and only then ends, deliberately: an end screen from round 1
     has no perks, no skills and no score, so half its sections never render and would silently go
     unmeasured. Ending after round 4 gives it something to show.
     Both "Beenden" labels collide (`controls.quit` and `app.end` share the word), so the dialog is
     dismissed by row index, not by text. */
  { id: "victory",
    steps: [{ text: "Lauf beginnen|Start run", settle: 2200 },
            { sel: ".sk-offers button", settle: 1500 },
            { turbo: true },
            { until: ".lv-offercard", maxMs: 90000 },
            { sel: ".lv-offercard", settle: 1500 },
            { until: '[data-tut="form-energy"]', maxMs: 90000 },
            { sel: '[data-tut="form-energy"] .as-edge-strong', settle: 1500 },
            { until: '[data-tut="arch-board"]', maxMs: 120000 },
            { sel: '[data-tut="arch-done"]', settle: 1500 },                  // leave the architect
            { text: "Beenden|End", settle: 1200 },                            // opens the abort dialog
            { sel: ".rc-row", nth: 1, settle: 1500 },                         // row 1 = end and score it
            { until: ".go-root", maxMs: 30000 }],
    marker: ".go-root" },
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

/* Turbo to MAX. Autostich resolves tricks automatically — the player only decides between rounds —
   so reaching a decision screen is a matter of waiting, and waiting is what the survey must not do
   at real speed. */
const TURBO = `(() => {
  const m = Array.prototype.slice.call(document.querySelectorAll("button"))
    .find((b) => (b.textContent || "").trim() === "MAX");
  if (!m) return { ok: false, why: "no MAX turbo button" };
  m.click(); return { ok: true };
})()`;

const hasMarker = (sel) => `(() => !!document.querySelector(${JSON.stringify(sel)}))()`;

/* ------------------------------------------------------------------ one cell */

async function measure(c, surface) {
  /* Starting a run writes as_activerun, and a saved run changes the hub for EVERY surface measured
     afterwards — the start button becomes "continue". Clearing it per surface is what keeps the
     in-run cells from silently contaminating the menu cells. */
  await evaluate(c, `(() => { try { localStorage.removeItem("as_activerun"); } catch (e) {} return 1; })()`);
  await goto(c, ORIGIN, { settleMs: 900 });
  const trace = [];
  for (const step of surface.steps) {
    let r;
    if (step.turbo) {
      r = await evaluate(c, TURBO);
    } else if (step.until) {
      /* Poll rather than sleep a guessed amount. A fixed wait would either be too short on a slow
         machine or waste minutes on a fast one, and it could not report WHY it failed. */
      const deadline = Date.now() + (step.maxMs || 90000);
      r = { ok: false, why: `${step.until} never appeared within ${(step.maxMs || 90000) / 1000}s` };
      while (Date.now() < deadline) {
        if (await evaluate(c, hasMarker(step.until))) { r = { ok: true }; break; }
        await sleep(1200);
      }
    } else if (step.tile !== undefined) {
      r = await evaluate(c, clickTile(step.tile));
    } else if (step.sel !== undefined) {
      r = await evaluate(c, clickSel(step.sel, step.nth || 0));
    } else {
      r = await evaluate(c, clickText(step.text));
    }
    trace.push({ step, ...r });
    if (!r.ok) return { reached: false, trace, why: r.why };
    await sleep(step.settle || 700);
  }
  const settled = await evaluate(c, SETTLE);
  if (!await evaluate(c, hasMarker(surface.marker))) {
    return { reached: false, trace, why: `marker ${surface.marker} absent after navigation` };
  }
  const probe = await evaluate(c, probeSource());
  const surf = await evaluate(c, surfaceProbeSource());
  return { reached: true, trace, settled, ...probe, ...surf };
}

/* Every cell runs against a wall-clock deadline, and this is not belt-and-braces — it cost 53
   minutes to learn.

   cdp.mjs sends a CDP command over a websocket and awaits the reply with NO timeout. When the
   browser dies mid-run, that promise never settles: the survey sat on one cell for the better part
   of an hour, six node processes alive, zero Chrome processes left, and the log frozen mid-line with
   nothing to say why. Same failure family as the goto() hang in pixel-diff.mjs — a wait with no
   upper bound, in shared tooling, that only shows itself when something upstream disappears.

   Fixing cdp.mjs would touch every caller, so the bound lives here instead: one cell may fail, the
   matrix may not. A cell that trips this is recorded as unreached with the reason, exactly like a
   missing marker. */
function withDeadline(promise, ms, what) {
  let timer;
  const bell = new Promise((_, rej) => { timer = setTimeout(() => rej(new Error(what + ": no answer within " + (ms / 1000) + "s — browser gone?")), ms); });
  return Promise.race([promise, bell]).finally(() => clearTimeout(timer));
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
const only = { size: argv[argv.indexOf("--size") + 1], lang: argv[argv.indexOf("--lang") + 1],
               surface: argv[argv.indexOf("--surface") + 1] };
const sizes = argv.includes("--size") ? SIZES.filter(([w, h]) => `${w}x${h}` === only.size) : SIZES;
const langs = argv.includes("--lang") ? LANGS.filter((l) => l === only.lang) : LANGS;
/* #typo-system S0: `--surface` narrows a debug run to one screen. Added because timing a single
   in-run surface was otherwise impossible — the smallest unit was a whole cell, i.e. every screen at
   one size and language. A run that uses it writes NO matrix file (see the guard at the end): a
   partial matrix silently overwriting a full one is exactly the kind of evidence corruption this
   survey exists to avoid. */
const surfaces = argv.includes("--surface") ? SURFACES.filter((s) => s.id === only.surface) : SURFACES;
if (!sizes.length || !langs.length) throw new Error("no cell matches the given --size/--lang");
if (!surfaces.length) throw new Error(`no surface named ${only.surface}`);

/* #typo-system S0: `--shots <dir>` also writes a PNG per cell at DPR 1 and 2 — the V1 baseline the
   human visual gate compares against later. Opt-in, because the viewport survey's own job is
   measurement and it should stay cheap when that is all that is wanted. */
const SHOTS = argv.includes("--shots");
const SHOT_FMT = argv.includes("--png") ? "png" : "webp";
const SHOT_DIR = SHOTS ? resolve(argv[argv.indexOf("--shots") + 1] || join(ROOT, "capture")) : null;
if (SHOTS) mkdirSync(SHOT_DIR, { recursive: true });

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

      for (const s of surfaces) {
        const key = `${lang}/${size}/${s.id}`;
        let cell;
        try {
          /* The perk choice legitimately waits up to 90 s for a decision to arrive; everything else
             should be done inside 60. Give each cell its own budget plus headroom. */
          const budget = (s.steps || []).reduce((t, st) => t + (st.maxMs || 0), 0) + 90000;
          cell = await withDeadline(measure(c, s), budget, `${lang}/${size}/${s.id}`);
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
            + `${cell.surface ? ` · ${cell.surface.length} surf` : ""}`
            + `${cell.shrunk && cell.shrunk.length ? ` · ${cell.shrunk.length} SHRUNK` : ""}\n`);
          /* #typo-system S0: capture the V1/V2 screenshot pair for the human visual gate.

             WHY HERE and not in a separate capture script: the browser is already at the right
             viewport, in the right language, with the right seeded state, at the end of a navigation
             that took up to a minute to walk. A second script would have to reproduce all of it, and
             any drift between the two reproductions would show up as a false visual difference.

             WHY BOTH DPRs: `matrix.json` measures COMPUTED styles and is device-pixel-independent, so
             it stays at DPR 1. Screenshots are not — sub-pixel rounding of a new type scale is
             exactly the defect class that appears at 2x and not at 1x, and it is a typography defect,
             so the owner's decision to accept layout breakage (planning report §8.1d) does not cover
             it. Changing deviceScaleFactor re-rasterises without re-navigating, so the second shot is
             nearly free — the expensive part was getting here. */
          if (SHOTS) {
            /* DPR 2 only where it can actually be judged, and the arithmetic is the reason: the full
               matrix at both scale factors is ~210 files. Captured twice (V1 and V2) that is evidence
               measured in tens of megabytes, for a question — "did sub-pixel rounding of the new
               scale go wrong" — that does not need every viewport to answer. 1280x720 is the binding
               viewport (the itch.io release) and 1920x1080 is the reference the shrinkage criterion
               is defined against; a rounding defect that shows nowhere in those two is not one worth
               this cost. */
            const dprs = (size === "1280x720" || size === REFERENCE) ? [1, 2] : [1];
            for (const dpr of dprs) {
              if (dpr !== 1) await setViewport(c, { width: w, height: h, deviceScaleFactor: dpr });
              await sleep(250);
              const png = await screenshot(c, null, { format: SHOT_FMT, quality: 95 });
              writeFileSync(join(SHOT_DIR, `${lang}__${size}__${s.id}__dpr${dpr}.${SHOT_FMT}`), Buffer.from(png, "base64"));
            }
            await setViewport(c, { width: w, height: h, deviceScaleFactor: 1 });
          }
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

/* MERGE, do not overwrite. The full matrix takes long enough that it is run in chunks — one size at
   a time, both languages — and a chunk that replaced the file would throw away every earlier one.
   Cells are keyed lang/size/surface, so a re-run of the same chunk replaces exactly its own cells
   and leaves the rest standing. */
const target = join(OUT, "matrix.json");
/* #typo-system S0: a `--surface` run is a debug probe, not evidence. Merging its one cell into the
   stored matrix would leave a file that LOOKS complete and is not — the same failure the reachability
   reporting above exists to prevent, one level up. */
if (argv.includes("--surface")) {
  const reached = Object.values(matrix.cells).filter((c) => c.reached !== false).length;
  process.stdout.write(`\n  --surface probe: ${Object.keys(matrix.cells).length} cell(s), ${reached} reached.` +
    `\n  matrix.json NOT written (probe runs never touch the evidence file)\n`);
  process.exit(unreached ? 1 : 0);
}

let merged = matrix;
if (existsSync(target)) {
  try {
    const prev = JSON.parse(readFileSync(target, "utf8"));
    merged = { ...matrix, cells: { ...prev.cells, ...matrix.cells } };
    merged.sizes = [...new Set([...(prev.sizes || []), ...matrix.sizes])];
    merged.langs = [...new Set([...(prev.langs || []), ...matrix.langs])];
  } catch (e) { process.stdout.write("  (existing matrix.json unreadable, starting fresh)" + String.fromCharCode(10)); }
}
writeFileSync(target, JSON.stringify(merged, null, 1));
const total = Object.keys(merged.cells).length;
process.stdout.write(`\n  ${total} cells · ${unreached} not reached\n  evidence -> ${join(OUT, "matrix.json")}\n`);
