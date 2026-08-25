#!/usr/bin/env node
/* #menu-rework M9 — re-measure what the two design documents PREDICT, before building against them.
   ============================================================================

     node docs/workstreams/desktop-menus/evidence/M9/measure.mjs            # all three surfaces
     node .../measure.mjs --only erststart --size 1280x720                  # one, for debugging

   WHY THIS FILE EXISTS AT ALL. Four design documents have gone to a worker in this round and all four
   failed the same way and only that way: their OBSERVATIONS held, several to the decimal, and their
   PREDICTIONS did not. The contract's answer is to re-measure every number in a `main` build before
   building against it. This script is that measurement, and its output is the input to Part 3 of the
   record — not a convenience.

   FIRST START HAS NO SURVEY CELL (H-c), and that is the second reason. `viewport-survey.mjs` starts
   from a seeded profile with a username, so `showUsername` (App.jsx:302) is false and the welcome
   screen has never been in any matrix this workstream owns. The only way to reach it is an EMPTY
   `localStorage`, which is the one state the survey deliberately never has.

   IT MEASURES AND DOES NOT REPAIR. Nothing here writes to `src/**`; the output is JSON.

   DETERMINISM comes from `scripts/survey-stub.mjs` — MH2 promoted it out of M8's task-local seed, so
   this script gets the pinned clock and the local answer for `autostich_scores` by importing two
   functions. The clock matters here for a reason worth naming: the feedback modal's rate limit reads
   the wall clock, and the preview row and run context carry a score that is formatted per locale.

   THE BUNDLE IS VERIFIED, same as the survey: a stale `vite preview` on this shared worktree serves an
   abandoned build and answers just as cheerfully (M3-F09). */

import { writeFileSync, mkdirSync, readFileSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { launch, setViewport, reduceMotion, seedRandom, suppressInstallPrompt,
  goto, evaluate, sleep } from "../../../../../scripts/cdp.mjs";
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

/* The three sizes `erststart-redesign.md` states it measured at, plus the two the contract adds. The
   design's own claim is that the card is IDENTICAL at its three; keeping all five is what tests that
   claim rather than reproducing it. */
const SIZES = [[1280, 720], [1400, 700], [1536, 791], [1600, 900], [1920, 1080]];
const LANGS = ["de", "en"];

/* ------------------------------------------------------------------ what each document claims

   Every entry is a number or a colour a design document ASSERTS about today's build. `claim` is what
   the document says; the probe reports what is actually there. A row where they differ is a finding,
   not a silent adjustment — and per the contract, never a reason to doubt the design's direction. */
const PROBES = {
  erststart: [
    { name: "overlay",        sel: ".un-root",                 props: ["backgroundColor", "backdropFilter"], claim: "rgba(12,12,16,.94), no backdrop-filter" },
    { name: "card",           sel: ".un-card",                 props: ["width", "height", "borderRadius", "borderTopWidth", "borderTopColor", "backgroundColor"], claim: "900x444, radius 16, border 1px rgba(0,0,0,0)" },
    { name: "body-grid",      sel: ".un-first .un-body",       props: ["gridTemplateColumns", "columnGap", "padding"], claim: "340px / 464px, gap 34" },
    { name: "eyebrow",        sel: ".un-first .un-eyebrow",    props: ["color", "fontSize"], claim: "rgb(38,198,230) hub cyan" },
    { name: "wordmark",       sel: ".un-first .un-wm",         props: ["width", "height"], claim: "340x48" },
    { name: "title",          sel: ".un-first .un-title",      props: ["fontSize", "filter", "color", "backgroundImage"], claim: "22.5px, gradient, drop-shadow rgba(155,130,240,.18)" },
    { name: "subline",        sel: ".un-first .un-sub",        props: ["fontSize"], claim: "absent today" },
    { name: "input",          sel: ".un-first .un-form input", props: ["backgroundColor", "borderTopColor", "color", "height"], claim: "ground #0e1b22, border #26c6e6, text #a8ecf7" },
    { name: "lang-wrap",      sel: ".un-first .un-lang",       props: ["borderTopColor", "borderRadius", "height"], claim: "segmented, min 44px tall" },
    { name: "lang-off",       sel: ".un-first .un-lang > [aria-checked=\"false\"]", props: ["backgroundColor", "color", "borderLeftColor", "boxShadow", "height"], claim: "edge rgb(44,44,54); surface rgb(19,19,24)" },
    { name: "lang-on",        sel: ".un-first .un-lang > [aria-checked=\"true\"]",  props: ["backgroundColor", "color", "borderLeftColor", "boxShadow", "height"], claim: "edge rgb(154,154,168)/rgb(234,244,255); surface rgb(25,25,34)" },
    { name: "preview",        sel: ".un-first .un-prev",       props: ["backgroundColor", "borderTopColor", "borderRadius"], claim: "row per §1 target" },
    { name: "preview-score",  sel: ".un-first .un-prevscore",  props: ["color"], claim: "target #54e08a" },
    { name: "save",           sel: ".un-first .un-save",       props: ["backgroundImage", "backgroundColor", "boxShadow", "borderRadius"], claim: "wordmark gradient when live" },
    { name: "hint",           sel: ".un-first .un-form .text-meta-3", props: ["fontSize"], claim: "name.hint, to be shortened" },
  ],
  feedback: [
    { name: "overlay",        sel: ".fb-root",                 props: ["backgroundColor", "backdropFilter"], claim: "rgba(12,12,16,.94), no backdrop-filter" },
    { name: "card",           sel: ".fb-card",                 props: ["width", "borderRadius", "backgroundColor", "borderTopColor"], claim: "1080px wide — the existing .fb-card width stays" },
    { name: "form-grid",      sel: ".fb-form",                 props: ["gridTemplateColumns", "columnGap", "gap"], claim: "minmax(0,1fr) 400px, gap 26" },
    { name: "textarea",       sel: ".fb-msg",                  props: ["height", "backgroundColor", "borderTopColor", "borderRadius", "padding"], claim: "268px tall; ground #0f0f14, border #33333e" },
    { name: "name-input",     sel: ".fb-right input:not([aria-hidden=\"true\"])", props: ["backgroundColor", "borderTopColor", "borderRadius", "padding"], claim: "same #0f0f14 / #33333e" },
    { name: "run-row",        sel: ".fb-run",                  props: ["backgroundColor", "borderTopColor", "borderRadius", "padding", "opacity"], claim: "#20202a today; target = options row" },
    { name: "kind-on",        sel: ".fb-kind.as-edge",         props: ["backgroundColor", "borderLeftColor", "borderRadius", "height"], claim: "as-edge pill with left colour edge" },
    { name: "kind-off",       sel: ".fb-kind.as-edge-neutral", props: ["backgroundColor", "borderLeftColor", "borderRadius", "height"], claim: "as-edge-neutral pill" },
    { name: "kinds-wrap",     sel: ".fb-kinds",                props: ["borderTopColor", "borderRadius", "height", "display"], claim: "target: ONE segmented, full panel width, 44px" },
    { name: "send",           sel: ".fb-send",                 props: ["backgroundColor", "color", "borderRadius", "height"], claim: "deck fill when live" },
    { name: "label",          sel: ".fb-slabel",               props: ["fontSize", "letterSpacing", "color", "opacity", "textTransform"], claim: "target: 10px Geist Mono, .14em, #5c5c68" },
    { name: "readout",        sel: ".fb-readout",              props: ["borderLeftWidth", "paddingLeft", "fontSize"], claim: "own grid column behind a vertical rule" },
    { name: "bar",            sel: ".fb-bar",                  props: ["display", "height"], claim: "ActionBar — the design removes it" },
  ],
  privacy: [
    { name: "overlay",        sel: ".pv-root, .fixed.overlay-root", props: ["backgroundColor", "backdropFilter"], claim: "migration only" },
    { name: "panel",          sel: ".as-panel",                props: ["backgroundColor", "borderTopColor", "borderRadius", "boxShadow"], claim: "migration only" },
  ],
};

/* ------------------------------------------------------------------ server */

async function serverAlive() {
  try { return (await fetch(ORIGIN, { signal: AbortSignal.timeout(1500) })).ok; } catch { return false; }
}
async function ensureServer() {
  if (await serverAlive()) {
    await assertServesDist(HOST, DIST, { when: "inherited server" });
    return { stop: async () => {} };
  }
  const viteBin = join(ROOT, "node_modules", "vite", "bin", "vite.js");
  const proc = spawn(process.execPath, [viteBin, "preview", "--port", String(PORT), "--strictPort", "--base", BASE],
    { cwd: ROOT, stdio: "ignore" });
  for (let i = 0; i < 150; i++) {
    if (await serverAlive()) {
      const stop = async () => { proc.kill(); await sleep(300); };
      try { await assertServesDist(HOST, DIST, { when: "own server" }); } catch (e) { await stop(); throw e; }
      return { stop };
    }
    await sleep(200);
  }
  proc.kill();
  throw new Error(`vite preview did not come up on ${PORT}`);
}

/* ------------------------------------------------------------------ seeds

   TWO DIFFERENT STORAGE STATES, and the difference is the whole point of H-c.

   `erststart` needs `as_username` ABSENT — that is literally what `showUsername` reads (App.jsx:302)
   and what `firstTime` passes down. Everything else is cleared too, because the design measured "mit
   geleertem Speicher" and a half-seeded profile is a different screen.

   `feedback` needs the opposite: a username, and a run in `as_runhistory` so `lastRunContext()`
   (feedbackContext.js:17) returns the "run present" state rather than the disabled one. Both states
   are real and both are measured — `--norun` takes the second. */
const RESET_EPOCH = "2026-08-16-test-neustart";
const optionsFor = (lang) => JSON.stringify({ lang, muted: true, telemetry: false, reducedFx: "an", testViewport: null });

const seedFirstStart = (lang) => `(() => {
  localStorage.clear();
  localStorage.setItem("as_reset_epoch", ${JSON.stringify(RESET_EPOCH)});
  localStorage.setItem("as_options", ${JSON.stringify(optionsFor("__L__"))}.replace("__L__", ${JSON.stringify(lang)}));
  return { username: localStorage.getItem("as_username") };
})()`;

/* One completed run, fixed values, no clock and no random source — the same property that makes M8's
   board a comparison rather than a sample. `cycles` and `seed` are what the run label prints. */
const seedWithRun = (lang, withRun) => `(() => {
  localStorage.clear();
  localStorage.setItem("as_reset_epoch", ${JSON.stringify(RESET_EPOCH)});
  localStorage.setItem("as_options", ${JSON.stringify(optionsFor("__L__"))}.replace("__L__", ${JSON.stringify(lang)}));
  localStorage.setItem("as_username", "M9");
  localStorage.setItem("as_tutorial_done", "1");
  ${withRun ? `localStorage.setItem("as_runhistory", JSON.stringify([
    { seed: 4000021, cycles: 4, score: 812345, completed: true, archetypes: ["fire"] }
  ]));` : ""}
  return { username: localStorage.getItem("as_username"), runs: (JSON.parse(localStorage.getItem("as_runhistory") || "[]")).length };
})()`;

/* ------------------------------------------------------------------ probe */

const probeSource = (entries) => `(() => {
  const want = ${JSON.stringify(entries)};
  const out = {};
  for (const e of want) {
    const el = document.querySelector(e.sel);
    if (!el) { out[e.name] = { present: false, sel: e.sel }; continue; }
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    const got = {};
    for (const p of e.props) got[p] = cs[p];
    out[e.name] = { present: true, box: [Math.round(r.x * 100) / 100, Math.round(r.y * 100) / 100,
                                        Math.round(r.width * 100) / 100, Math.round(r.height * 100) / 100], ...got };
  }
  return out;
})()`;

const SETTLE = `(async () => {
  for (const a of document.getAnimations()) { try { a.currentTime = 0; a.pause(); } catch (e) {} }
  await Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 3000))]);
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  return document.getAnimations().length;
})()`;

const clickText = (spec) => `(() => {
  const want = ${JSON.stringify(spec)}.split("|").map((s) => s.toLowerCase());
  const btns = Array.prototype.slice.call(document.querySelectorAll("button, a[role=button]"));
  for (const w of want) {
    const hit = btns.find((b) => (b.textContent || "").trim().toLowerCase().startsWith(w));
    if (hit) { hit.click(); return { ok: true, on: (hit.textContent || "").trim().slice(0, 30) }; }
  }
  return { ok: false, why: "no button starting with " + JSON.stringify(want) };
})()`;

const hasMarker = (sel) => `(() => !!document.querySelector(${JSON.stringify(sel)}))()`;

/* ------------------------------------------------------------------ main */

const argv = process.argv.slice(2);
const only = argv.includes("--only") ? argv[argv.indexOf("--only") + 1] : null;
const oneSize = argv.includes("--size") ? argv[argv.indexOf("--size") + 1] : null;
const NORUN = argv.includes("--norun");
const sizes = oneSize ? SIZES.filter(([w, h]) => `${w}x${h}` === oneSize) : SIZES;
const surfaces = only ? [only] : ["erststart", "feedback", "privacy"];

mkdirSync(HERE, { recursive: true });
const server = await ensureServer();
const c = await launch();
const out = { generated: null, frozen: new Date(FROZEN_MS).toISOString(), base: BASE,
              norun: NORUN, sizes: sizes.map(([w, h]) => `${w}x${h}`), langs: LANGS, cells: {} };

try {
  await c.send("Page.enable");
  await c.send("Runtime.enable");
  await reduceMotion(c);
  await seedRandom(c);
  await suppressInstallPrompt(c);
  await c.send("Page.addScriptToEvaluateOnNewDocument", { source: freezeClockSource() });
  await c.send("Page.addScriptToEvaluateOnNewDocument", { source: fetchStubSource() });

  for (const lang of LANGS) {
    for (const [w, h] of sizes) {
      const size = `${w}x${h}`;
      await setViewport(c, { width: w, height: h, deviceScaleFactor: 1 });
      process.stdout.write(`\n  ${lang} · ${size}\n`);

      for (const id of surfaces) {
        const key = `${lang}/${size}/${id}`;
        let cell;
        try {
          /* Seed, then RELOAD: `showUsername` is read once in a useState initialiser, so writing the
             key after the app has mounted changes nothing at all. The first goto is what gives us an
             origin to write into; the second is the one that boots against the seeded state. */
          await goto(c, ORIGIN, { settleMs: 400 });
          const seeded = await evaluate(c, id === "erststart" ? seedFirstStart(lang) : seedWithRun(lang, !NORUN));
          await goto(c, ORIGIN, { settleMs: 1400 });

          if (id === "feedback") {
            const r = await evaluate(c, clickText("Feedback"));
            if (!r.ok) { out.cells[key] = { reached: false, why: r.why }; process.stdout.write(`    ${id.padEnd(10)} NOT REACHED — ${r.why}\n`); continue; }
            await sleep(900);
          } else if (id === "privacy") {
            const r = await evaluate(c, clickText("Datenschutz|Privacy"));
            if (!r.ok) { out.cells[key] = { reached: false, why: r.why }; process.stdout.write(`    ${id.padEnd(10)} NOT REACHED — ${r.why}\n`); continue; }
            await sleep(900);
          }
          await evaluate(c, SETTLE);

          const marker = id === "erststart" ? ".un-card" : id === "feedback" ? ".fb-form" : ".as-panel";
          if (!await evaluate(c, hasMarker(marker))) {
            out.cells[key] = { reached: false, why: `marker ${marker} absent`, seeded };
            process.stdout.write(`    ${id.padEnd(10)} NOT REACHED — marker ${marker} absent\n`);
            continue;
          }
          const probe = await evaluate(c, probeSource(PROBES[id]));
          const missing = Object.entries(probe).filter(([, v]) => !v.present).map(([k]) => k);
          cell = { reached: true, seeded, probe };
          process.stdout.write(`    ${id.padEnd(10)} ok${missing.length ? ` · absent: ${missing.join(", ")}` : ""}\n`);
        } catch (e) {
          cell = { reached: false, why: String(e && e.message || e) };
          process.stdout.write(`    ${id.padEnd(10)} FAILED — ${cell.why}\n`);
        }
        out.cells[key] = cell;
      }
    }
  }
  await assertServesDist(HOST, DIST, { when: "after the last cell" });
} finally {
  await c.close();
  await server.stop();
}

const file = join(HERE, NORUN ? "measure-norun.json" : "measure.json");
writeFileSync(file, JSON.stringify(out, null, 1));
process.stdout.write(`\n  ${Object.keys(out.cells).length} cells -> ${file}\n`);
