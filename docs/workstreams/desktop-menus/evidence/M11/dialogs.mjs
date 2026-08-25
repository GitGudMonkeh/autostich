#!/usr/bin/env node
/* #menu-rework M11 — H-a: the four surfaces the survey cannot see, measured directly.
   ============================================================================

     node docs/workstreams/desktop-menus/evidence/M11/dialogs.mjs --out <dir> [--shots <dir>]

   ZERO OF FOUR HAVE A CELL. The survey has sixteen surfaces and none of them is `AbortConfirm`,
   `RestartConfirm`, `RunLoader` or `PwaInstall`. One of the four is worse than uncovered: the survey
   OPENS the abort dialog on every run (`viewport-survey.mjs:218`, "Beenden | End") and then clicks
   `.rc-row` to leave it again, on its way to the `victory` cell. It is reached every time and
   captured never. **Do not read a green survey as evidence about this task** — it only says nothing
   ELSE moved, which is still required and is still measured (see the machine half in the record).

   SO THIS IS THE INSTRUMENT, and it differs from M5's and M6's in one deliberate way: it measures
   the DIALOG'S OWN SUBTREE, not the document. The abort and restart dialogs stand over a LIVE RUN,
   and a run's board is not the same twice; a whole-document probe would drown four small dialogs in
   the noise of the screen behind them, and — worse — could hide a real delta among nodes that were
   never comparable. `scopedProbeSource()` below is `surfaceProbeSource()` with its root moved: same
   twelve properties, same filter, paths counted from the dialog instead of from `body`. Cells stay
   in the survey's shape, so `scripts/surface-delta.mjs` compares them with no special case.

   EVERY REACH IS WRITTEN AS *CONTAINS NO X OTHER THAN Y*, which is H-e and has now cost this round
   eight findings. Naming a dialog by "an `.rc-row` exists" would pass on the wrong one the first time
   two dialogs are open, and "the only visible button" is exactly the shape that made M5's probe open
   the glossary and report ok. Each of the four therefore asserts a POSITIVE count and a NEGATIVE one:

     abort     exactly one `.rc-wide`,   no `.rc-narrow`, exactly three `.rc-row`, no `.rc-btn`
     restart   exactly one `.rc-narrow`, no `.rc-wide`,   exactly one `.rc-btn`,  no `.rc-row`
     loader    exactly one percentage readout in the whole document, and no `.rc-*` beside it
     install   exactly one visible install button, and the hub behind it (`.as-hub-tile` present)

   TWO HARNESS CONTROLS ARE ADDED HERE AND BOTH ARE NAMED RATHER THAN BURIED:

     1. THE LOADER IS HELD. `RunLoader` shows after 150 ms and gives up after 3000 ms
        (`maxWait`), so it is on screen for under three seconds and only while images are still in
        flight. This harness pauses the image requests it triggers (CDP `Fetch`) and postpones any
        timer of 3 s or more while a flag is set — the only such timer governing this dialog is its
        own safety net. It is therefore measured AT 0 %, which is a real state of the surface: `pct`
        moves one mask's `left`, and that is geometry, recorded as `box` like everything else.
     2. THE INSTALL PROMPT IS UN-SUPPRESSED. `PwaInstall` renders only when the browser has offered
        `beforeinstallprompt` (or on iOS). Every other harness in this workstream suppresses that
        event on purpose; here it is lifted for one cell and a synthetic event dispatched, because a
        component that never renders cannot be measured. `suppressInstallPrompt` returns its
        identifier for exactly this.

   DETERMINISM AND THE BUNDLE come from the shared modules, as everywhere in this workstream:
   pinned clock, board answered locally, reduced motion, seeded random, `dist/` verified before the
   first cell and again after the last. */

import { writeFileSync, mkdirSync, readFileSync, existsSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { launch, setViewport, reduceMotion, seedRandom, suppressInstallPrompt, removeInitScript,
  screenshot, goto, evaluate, sleep } from "../../../../../scripts/cdp.mjs";
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
  return i >= 0 && process.argv[i + 1] ? resolve(process.argv[i + 1]) : join(HERE, "dialogs");
})();
const SHOT_DIR = (() => {
  const i = process.argv.indexOf("--shots");
  return i >= 0 && process.argv[i + 1] ? resolve(process.argv[i + 1]) : null;
})();

/* Both languages at the two viewports the contract calls binding. */
const CELLS = [["de", 1280, 720], ["de", 1920, 1080], ["en", 1280, 720], ["en", 1920, 1080]];

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

/* ------------------------------------------------------------------ the scoped probe

   `surfaceProbeSource()` with its root moved. Same twelve properties, same "does it paint" filter,
   same path shape — counted from the dialog's own root instead of from `body`, so a cell holds the
   dialog and nothing else. NO BACKTICKS inside the returned source (surfaceProbe.js learned that
   once and says so). */
const scopedProbeSource = (rootExpr) => "(() => {\n"
  + "  const d = document;\n"
  + "  const root = " + rootExpr + ";\n"
  + "  if (!root) return { surface: [], tokens: {}, rootFound: false };\n"
  + "  const r2 = (n) => Math.round(n * 100) / 100;\n"
  + "  const pathOf = (node) => {\n"
  + "    const parts = [];\n"
  + "    let n = node;\n"
  + "    while (n && n !== root) {\n"
  + "      const p = n.parentElement;\n"
  + "      if (!p) break;\n"
  + "      parts.push(Array.prototype.indexOf.call(p.children, n));\n"
  + "      n = p;\n"
  + "    }\n"
  + "    return parts.reverse().join('/') + ':' + node.tagName;\n"
  + "  };\n"
  + "  const SIDES = ['Top', 'Right', 'Bottom', 'Left'];\n"
  + "  const four = (cs, pre, post) => SIDES.map((s) => cs[pre + s + (post || '')]).join(' ');\n"
  + "  const read = (e) => {\n"
  + "    const cs = getComputedStyle(e);\n"
  + "    const b = e.getBoundingClientRect();\n"
  + "    return { p: pathOf(e), bg: cs.backgroundColor, bi: cs.backgroundImage,\n"
  + "      bo: cs.backgroundOrigin + '|' + cs.backgroundClip + '|' + cs.backgroundSize,\n"
  + "      bc: four(cs, 'border', 'Color'), bw: four(cs, 'border', 'Width'), bs: four(cs, 'border', 'Style'),\n"
  + "      rd: [cs.borderTopLeftRadius, cs.borderTopRightRadius, cs.borderBottomRightRadius, cs.borderBottomLeftRadius].join(' '),\n"
  + "      sh: cs.boxShadow, pd: four(cs, 'padding'),\n"
  + "      ol: cs.outlineWidth + ' ' + cs.outlineStyle + ' ' + cs.outlineColor,\n"
  + "      op: cs.opacity, cl: cs.color,\n"
  + "      box: [r2(b.width), r2(b.height)] };\n"
  + "  };\n"
  + "  const paints = (r) =>\n"
  + "    (r.bg && r.bg !== 'rgba(0, 0, 0, 0)' && r.bg !== 'transparent')\n"
  + "    || (r.bi && r.bi !== 'none') || (r.sh && r.sh !== 'none')\n"
  + "    || r.bw !== '0px 0px 0px 0px' || r.rd !== '0px 0px 0px 0px' || r.pd !== '0px 0px 0px 0px'\n"
  + "    || (r.ol && r.ol.indexOf('none') === -1);\n"
  + "  const out = [];\n"
  + "  const all = [root].concat(Array.prototype.slice.call(root.querySelectorAll('*')));\n"
  + "  for (const e of all) {\n"
  + "    const cs = getComputedStyle(e);\n"
  + "    if (cs.display === 'none' || cs.visibility === 'hidden') continue;\n"
  + "    const r = read(e);\n"
  + "    if (paints(r)) out.push(r);\n"
  + "  }\n"
  + "  const TOKENS = ['--sf-sunken', '--sf-base', '--sf-head', '--sf-scrim', '--sf-scrim-desk',\n"
  + "    '--ed-quiet', '--ed-base', '--ed-strong', '--el-flat', '--rd-sm', '--rd-md', '--rd-lg',\n"
  + "    '--in-tight', '--in-snug', '--in-base', '--ui-scale'];\n"
  + "  const rootCs = getComputedStyle(d.documentElement);\n"
  + "  const tokens = {};\n"
  + "  for (const t of TOKENS) { const v = rootCs.getPropertyValue(t).trim(); if (v) tokens[t] = v; }\n"
  + "  return { surface: out, tokens: tokens, rootFound: true };\n"
  + "})()";

/* WHY `box` IS WIDTH AND HEIGHT AND NOT x/y. A dialog is centred in the viewport and the four cells
   use two viewport sizes; recording absolute coordinates would make every node differ between sizes
   for a reason that is not a surface. Width and height still catch a padding or radius change that
   moves a box, which is what the axis gate is for. */

/* ------------------------------------------------------------------ controls */

const seedScript = (lang) => "(() => {\n"
  + "  localStorage.setItem(\"as_reset_epoch\", \"2026-08-16-test-neustart\");\n"
  + "  localStorage.setItem(\"as_options\", " + JSON.stringify(JSON.stringify(
      { lang, muted: true, telemetry: false, reducedFx: "an", testViewport: null })) + ");\n"
  + "  localStorage.setItem(\"as_username\", \"M11\");\n"
  + "  localStorage.removeItem(\"as_activerun\");\n"
  + "  return 1;\n"
  + "})()";

/* The loader's safety net, postponed rather than removed, and only while the flag is set. Installed
   as an init script so it is in place before the module graph runs. */
const HOLD_TIMERS = "(() => {\n"
  + "  window.__m11_hold = false;\n"
  + "  const real = window.setTimeout;\n"
  + "  window.setTimeout = function (fn, ms) {\n"
  + "    const args = Array.prototype.slice.call(arguments, 2);\n"
  + "    if (window.__m11_hold && typeof ms === 'number' && ms >= 3000) ms = 600000;\n"
  + "    return real.apply(window, [fn, ms].concat(args));\n"
  + "  };\n"
  + "  return 1;\n"
  + "})()";

/* EXACTLY ONE CANDIDATE, or this is not the control we mean. The survey's own helper takes the first
   match and that is right for a navigation step; it is wrong for a probe, because "the first button
   whose label starts with X" is the shape that opened the glossary for M5 and reported ok. Here a
   second candidate is an error with both labels printed, not a coin toss. */
const clickText = (spec) => "(() => {\n"
  + "  const want = " + JSON.stringify(spec) + ".split(\"|\").map((s) => s.toLowerCase());\n"
  + "  const btns = Array.prototype.slice.call(document.querySelectorAll(\"button, a[role=button]\"))\n"
  + "    .filter((b) => { const r = b.getBoundingClientRect(); return r.width > 0 && r.height > 0; });\n"
  + "  for (const w of want) {\n"
  + "    const hits = btns.filter((b) => (b.textContent || \"\").trim().toLowerCase().startsWith(w));\n"
  + "    if (hits.length === 1) { hits[0].click(); return { ok: true }; }\n"
  + "    if (hits.length > 1) return { ok: false, why: hits.length + \" visible buttons start with \"\n"
  + "      + JSON.stringify(w) + \": \" + hits.map((b) => (b.textContent || \"\").trim()).join(\" | \") };\n"
  + "  }\n"
  + "  return { ok: false, why: \"no visible button starts with \" + JSON.stringify(want) };\n"
  + "})()";

const hasMarker = (sel) => "(() => !!document.querySelector(" + JSON.stringify(sel) + "))()";

/* THE FOUR PREDICATES, each written as *contains no X other than Y*: a positive count AND the
   negative that tells the dialog apart from its sibling. `n(sel)` counts, so every line of the
   verdict is a number in the evidence rather than a boolean nobody can re-derive. */
const VERDICT = "(() => {\n"
  + "  const n = (s) => document.querySelectorAll(s).length;\n"
  + "  const vis = (s) => Array.prototype.slice.call(document.querySelectorAll(s))\n"
  + "    .filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; }).length;\n"
  + "  const allPct = Array.prototype.slice.call(document.querySelectorAll('div, span'))\n"
  + "    .filter((e) => e.children.length === 0 && /^\\d{1,3}%$/.test((e.textContent || '').trim()));\n"
  /* M11-F09: a percentage readout is NOT the loader's just because it is a percentage. The run
     stage carries one of its own — one in German, TWO in English, measured — so the first version
     of this predicate would have measured the running game. The loader's readout is the one inside
     an overlay, and `.rn-shell` must be absent as well: the run has not begun while it is on. */
  + "  const pcts = allPct.filter((e) => e.closest('.overlay-root'));\n"
  + "  const install = Array.prototype.slice.call(document.querySelectorAll('button'))\n"
  + "    .filter((b) => (b.textContent || '').indexOf(String.fromCodePoint(0x1F4F2)) >= 0)\n"
  + "    .filter((b) => { const r = b.getBoundingClientRect(); return r.width > 0 && r.height > 0; });\n"
  + "  return { rcWide: n('.rc-wide'), rcNarrow: n('.rc-narrow'), rcRow: n('.rc-row'),\n"
  + "           rcBtn: n('.rc-btn'), upBanner: n('.up-banner'), hubTile: vis('.as-hub-tile'),\n"
  + "           pct: pcts.length, pctElsewhere: allPct.length - pcts.length, runShell: n('.rn-shell'),\n"
  + "           pctText: pcts.length ? pcts[0].textContent.trim() : null,\n"
  + "           install: install.length, overlays: n('.overlay-root') };\n"
  + "})()";

const DISPATCH_BIP = "(() => {\n"
  + "  window.dispatchEvent(new Event('beforeinstallprompt'));\n"
  + "  return 1;\n"
  + "})()";

const SETTLE = "(async () => {\n"
  + "  const deadline = (ms, v) => new Promise((r) => setTimeout(() => r(v), ms));\n"
  + "  const race = (p, ms, v) => Promise.race([p, deadline(ms, v)]);\n"
  + "  for (const a of document.getAnimations()) { try { a.currentTime = 0; a.pause(); } catch (e) {} }\n"
  + "  const fontsOk = await race(document.fonts.ready.then(() => true), 3000, false);\n"
  + "  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));\n"
  + "  return { fontsOk, animations: document.getAnimations().length };\n"
  + "})()";

/* ------------------------------------------------------------------ the four surfaces

   `reach` is a step list; `expect` is the verdict this surface and no other satisfies; `root` is the
   expression the scoped probe measures. Written as data so the record can quote it. */
const SURFACES = [
  {
    id: "abort-confirm",
    reach: [
      { text: "Lauf beginnen|Start run", settle: 2200 },
      { until: ".sk-offers", maxMs: 60000 },
      { sel: ".sk-offers button", settle: 1800 },
      { until: ".rn-shell", maxMs: 60000 },
      { text: "Beenden|End", settle: 1200 },
      { until: ".rc-wide", maxMs: 20000 },
    ],
    expect: (v) => (v.rcWide === 1 && v.rcNarrow === 0 && v.rcRow === 3 && v.rcBtn === 0)
      ? null : "expected one .rc-wide with three .rc-row and no .rc-narrow/.rc-btn, got "
        + JSON.stringify({ rcWide: v.rcWide, rcNarrow: v.rcNarrow, rcRow: v.rcRow, rcBtn: v.rcBtn }),
    root: "document.querySelector('.rc-wide')",
  },
  {
    id: "restart-confirm",
    reach: [
      { text: "Lauf beginnen|Start run", settle: 2200 },
      { until: ".sk-offers", maxMs: 60000 },
      { sel: ".sk-offers button", settle: 1800 },
      { until: ".rn-shell", maxMs: 60000 },
      { text: "Neustart|Restart", settle: 1200 },
      { until: ".rc-narrow", maxMs: 20000 },
    ],
    expect: (v) => (v.rcNarrow === 1 && v.rcWide === 0 && v.rcBtn === 1 && v.rcRow === 0)
      ? null : "expected one .rc-narrow with one .rc-btn and no .rc-wide/.rc-row, got "
        + JSON.stringify({ rcWide: v.rcWide, rcNarrow: v.rcNarrow, rcRow: v.rcRow, rcBtn: v.rcBtn }),
    root: "document.querySelector('.rc-narrow')",
  },
  {
    id: "run-loader",
    hold: true,
    reach: [
      { text: "Lauf beginnen|Start run", settle: 0 },
      { untilPct: true, maxMs: 20000 },
    ],
    expect: (v) => (v.pct === 1 && v.runShell === 0 && v.rcWide === 0 && v.rcNarrow === 0
                    && v.rcRow === 0 && v.rcBtn === 0)
      ? null : "expected exactly one percentage readout INSIDE an overlay, the run not yet begun and "
        + "no run dialog beside it, got "
        + JSON.stringify({ pct: v.pct, pctElsewhere: v.pctElsewhere, runShell: v.runShell,
                           rcWide: v.rcWide, rcNarrow: v.rcNarrow }),
    /* The loader's card, addressed through the readout rather than by a class it does not have: the
       single childless node whose whole text is a percentage AND which sits inside an overlay, then
       up to the overlay card. The overlay clause is M11-F09 and it is not decoration — without it
       this expression resolves to the running game's own readout. */
    root: "(() => { const e = Array.prototype.slice.call(document.querySelectorAll('div, span'))"
      + ".filter((x) => x.children.length === 0 && /^\\d{1,3}%$/.test((x.textContent || '').trim()))"
      + ".filter((x) => x.closest('.overlay-root'))[0];"
      + " return e ? e.closest('.overlay-card') : null; })()",
  },
  {
    id: "pwa-install",
    install: true,
    reach: [{ bip: true, settle: 900 }],
    expect: (v) => (v.install === 1 && v.hubTile > 0 && v.rcWide === 0 && v.rcNarrow === 0)
      ? null : "expected exactly one visible install button on the hub, got "
        + JSON.stringify({ install: v.install, hubTile: v.hubTile }),
    root: "Array.prototype.slice.call(document.querySelectorAll('button'))"
      + ".filter((b) => (b.textContent || '').indexOf(String.fromCodePoint(0x1F4F2)) >= 0)[0]"
      + ".closest('div')",
  },
];

/* ------------------------------------------------------------------ main */

mkdirSync(OUT, { recursive: true });
const server = await ensureServer();
const c = await launch();
const matrix = { generated: null, base: BASE, frozen: new Date(FROZEN_MS).toISOString(),
                 sizes: [...new Set(CELLS.map(([, w, h]) => w + "x" + h))],
                 langs: [...new Set(CELLS.map(([l]) => l))], cells: {} };
let unreached = 0;

/* The image hold, off until a surface asks for it. */
let holdImages = false;
const held = [];

try {
  await c.send("Page.enable");
  await c.send("Runtime.enable");
  await reduceMotion(c);
  await seedRandom(c);
  let suppressId = await suppressInstallPrompt(c);
  await c.send("Page.addScriptToEvaluateOnNewDocument", { source: freezeClockSource() });
  await c.send("Page.addScriptToEvaluateOnNewDocument", { source: fetchStubSource() });
  await c.send("Page.addScriptToEvaluateOnNewDocument", { source: HOLD_TIMERS });
  await c.send("Network.enable", {});
  await c.send("Fetch.enable", { patterns: [{ urlPattern: "*", requestStage: "Request" }] });
  /* HELD BY WHAT THE URL IS, not only by what Chrome labels it. `resourceType` is `Image` for some
     of these and `Other` for the rest, depending on whether an <img> or a bare `new Image()` asked;
     measured, 2 of 65 came through as `Image`. A filter on the label alone let 63 through. */
  const looksImage = (u) => /\.(webp|png|jpe?g|gif|avif|svg)(\?|$)/i.test(u);
  c.on("Fetch.requestPaused", async (p) => {
    if (holdImages && (p.resourceType === "Image" || looksImage(p.request.url))) {
      held.push(p.requestId); return;
    }
    try { await c.send("Fetch.continueRequest", { requestId: p.requestId }); } catch { /* gone */ }
  });
  process.stdout.write("  clock pinned · board answered locally · four uncovered dialogs, measured directly\n");

  for (const [lang, w, h] of CELLS) {
    const size = w + "x" + h;
    process.stdout.write("\n  " + lang + " · " + size + "\n");
    await setViewport(c, { width: w, height: h, deviceScaleFactor: 1 });

    for (const s of SURFACES) {
      const key = lang + "/" + size + "/" + s.id;
      let cell;
      try {
        /* The install cell is the one that needs the suppression lifted; every other cell keeps it,
           so a browser-offered prompt cannot wander into a dialog that is not about it. */
        if (s.install) await removeInitScript(c, suppressId);
        /* M11-F05: WHAT ACTUALLY KEEPS THIS DIALOG OFF THE SCREEN IS THE SERVICE WORKER, and it took
           three measurements to get there. `RunLoader` shows only while images are still in flight;
           the hub paints the same art the run start preloads, so after any hub visit all 27 of them
           decode instantly — measured, 27 of 27 resolved, and the loader was reported as never
           appearing in four cells out of four. Clearing the HTTP cache did not change that: the app
           is a PWA and its SERVICE WORKER was answering, which the `Fetch` domain never sees. With
           the worker bypassed the same run makes 65 image requests instead of 2.
           So for this one surface: cache cleared, worker bypassed, images held from the first byte,
           and the 3 s safety net postponed. The hub behind it is therefore missing its art — said
           out loud rather than cropped out, and it costs the measurement nothing, because the probe
           reads the dialog's own subtree and the dialog's own wash is 95 % opaque. */
        await c.send("Network.setCacheDisabled", { cacheDisabled: !!s.hold });
        await c.send("Network.setBypassServiceWorker", { bypass: !!s.hold });
        if (s.hold) {
          await c.send("Network.clearBrowserCache", {});
          holdImages = true;
        }

        await goto(c, ORIGIN, { settleMs: 400 });
        await evaluate(c, seedScript(lang));
        await goto(c, ORIGIN, { settleMs: 1200 });
        if (s.hold) await evaluate(c, "(() => { window.__m11_hold = true; return 1; })()");

        const trace = [];
        let failed = null;
        for (const step of s.reach) {
          let r;
          if (step.bip) r = { ok: !!(await evaluate(c, DISPATCH_BIP)) };
          else if (step.untilPct) {
            const deadline = Date.now() + (step.maxMs || 20000);
            r = { ok: false, why: "no percentage readout ever appeared" };
            while (Date.now() < deadline) {
              const v = await evaluate(c, VERDICT);
              if (v.pct >= 1) { r = { ok: true }; break; }
              await sleep(100);
            }
          } else if (step.until) {
            const deadline = Date.now() + (step.maxMs || 60000);
            r = { ok: false, why: step.until + " never appeared" };
            while (Date.now() < deadline) {
              if (await evaluate(c, hasMarker(step.until))) { r = { ok: true }; break; }
              await sleep(500);
            }
          } else if (step.sel) {
            r = await evaluate(c, "(() => { const e = document.querySelector(" + JSON.stringify(step.sel)
              + "); if (!e) return { ok: false, why: " + JSON.stringify(step.sel) + " + ' not found' };"
              + " e.click(); return { ok: true }; })()");
          } else r = await evaluate(c, clickText(step.text));
          trace.push({ step: step.until || step.sel || step.text || (step.bip ? "beforeinstallprompt" : "percentage"), ok: !!r.ok, why: r.why });
          if (!r.ok) { failed = r.why; break; }
          if (step.settle) await sleep(step.settle);
        }

        if (!failed) {
          const verdict = await evaluate(c, VERDICT);
          const wrong = s.expect(verdict);
          if (wrong) failed = wrong;
          else {
            if (!s.hold) await evaluate(c, SETTLE);
            const probe = await evaluate(c, scopedProbeSource(s.root));
            if (!probe.rootFound) failed = "the probe root resolved to nothing";
            else {
              cell = Object.assign({ reached: true, trace, verdict }, probe);
              process.stdout.write("    " + s.id.padEnd(16) + " ok · " + probe.surface.length
                + " painted nodes · " + JSON.stringify(verdict) + "\n");
              if (SHOT_DIR) {
                mkdirSync(SHOT_DIR, { recursive: true });
                const png = await screenshot(c, null, { format: "png" });
                const file = join(SHOT_DIR, lang + "__" + size + "__" + s.id + ".png");
                writeFileSync(file, Buffer.from(png, "base64"));
                cell.shot = file;
              }
            }
          }
        }
        if (failed) {
          unreached++;
          cell = { reached: false, why: failed, trace };
          process.stdout.write("    " + s.id.padEnd(16) + " NOT REACHED — " + failed + "\n");
        }
      } catch (err) {
        unreached++;
        cell = { reached: false, why: String((err && err.message) || err) };
        process.stdout.write("    " + s.id.padEnd(16) + " FAILED — " + cell.why + "\n");
      } finally {
        holdImages = false;
        for (const id of held.splice(0)) {
          try { await c.send("Fetch.failRequest", { requestId: id, errorReason: "Aborted" }); } catch { /* gone */ }
        }
        if (s.install) suppressId = await suppressInstallPrompt(c);
      }
      matrix.cells[key] = cell;
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
