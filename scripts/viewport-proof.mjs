#!/usr/bin/env node
/* #400 T2 — does the harness produce the same layout as a real viewport?
   ============================================================================

     node scripts/viewport-proof.mjs

   The harness is only worth having if it can be trusted. A tool that shows a plausible but WRONG
   picture is worse than no tool, because its output goes on to drive design decisions. So this
   script does not ask "does the iframe say 1280×720" — it renders the same application state twice
   and compares the results:

     A) through TestViewportHarness, in an iframe, inside a browser window of a DELIBERATELY
        DIFFERENT size (frame + padding). If the app were reading the host window instead of its own
        frame, this is where it would show.
     B) through a real CDP viewport of exactly that size (`Emulation.setDeviceMetricsOverride`),
        same browser, same process, same device scale factor, same seeded state.

   Three independent comparisons, weakest to strongest:

     1. VIEWPORT METRICS — innerWidth/innerHeight/clientWidth/clientHeight/DPR.
     2. MEDIA QUERIES — every width/height query index.css actually contains. This is the one that
        matters most for this codebase: the desktop pass is height-sensitive, so a harness that got
        width right and height wrong would look almost correct and be useless.
     3. LAYOUT FINGERPRINT — every element in the document, in order, with its tag, classes and
        rounded bounding box. Selector-free and immune to anti-aliasing: if the element lists differ
        the DOM is structurally different, and if any box differs the layout is.

   Then, and only as a visual record, a PIXEL comparison. Pixel equality is the weakest of the four
   and the noisiest — font rasterisation, sub-pixel positioning and compositing all vary. It is
   reported with the deltas separated into "noise" and "structural" so the two are never conflated.

   DETERMINISM is controlled at the source rather than papered over afterwards: the browser reports
   `prefers-reduced-motion: reduce` (a state the app already supports everywhere — no test-only
   branch is added to src/), and `Math.random` is replaced by a seeded PRNG before any application
   script runs, in every frame. Without the latter the menu picks a random music track and two
   captures of "the same state" would legitimately differ for reasons unrelated to the viewport. */

import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { launch, setViewport, reduceMotion, seedRandom, suppressInstallPrompt, removeInitScript,
  goto, evaluate, screenshot, sleep } from "./cdp.mjs";
import { TEST_VIEWPORTS } from "../src/ui/testViewport.js";
/* Moved to its own module 22.08.2026 so phone-proof.mjs can use the same implementation
   rather than a second copy (#viewport-1280). Behaviour unchanged. */
import { comparePixels } from "./pixel-diff.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "docs/workstreams/viewport-harness/evidence");
const PORT = 5180;                 // pinned by the task contract
const ORIGIN = `http://localhost:${PORT}`;
const DPR = Number(process.env.VP_DPR || 1);
/* The outer window is deliberately larger than the frame and never equal to it. If any measurement
   below came out equal to the window instead of the frame, the harness would be a lie. */
const OUTER_PAD = 220;

/* The seeded profile. Written into localStorage under the preview namespace before the app boots.
   Deliberately minimal and explicit — every field here is a determinism control, not a preference. */
const baseProfile = (testViewport) => ({
  lang: "de",              // never depend on the browser's Accept-Language
  muted: true,             // no audio pipeline
  telemetry: false,        // no outbound request mid-capture
  reducedFx: "an",         // minimal effect tier: the Pixi field layers are frame-timing dependent
  testViewport,            // the one field that differs between A and B
});

const MEDIA_QUERIES = [
  "(min-width: 640px)",
  "(min-width: 1400px)",
  "(max-width: 1399.98px)",
  "(min-width: 1400px) and (max-width: 1920px)",
  "(min-width: 1400px) and (max-width: 1760px)",
  "(min-width: 1400px) and (max-height: 950px)",
  "(min-width: 1400px) and (max-height: 900px)",
  "(min-width: 1400px) and (max-height: 820px)",
  "(min-width: 1750px) and (min-height: 1000px)",
  "(pointer: coarse)",
];

/* Collected inside whichever document is under test — the top document for a real viewport, the
   iframe's document for the harness. `probeSource` is injected as a string so both sides run the
   IDENTICAL code; a second copy would be a place for the two halves to drift apart. */
const PROBE = (mqList) => `(() => {
  const w = window, d = document, el = d.documentElement;
  const round = (n) => Math.round(n * 100) / 100;
  const nodes = [];
  const walk = (node) => {
    for (const c of node.children) {
      const r = c.getBoundingClientRect();
      nodes.push({
        t: c.tagName,
        c: typeof c.className === "string" ? c.className : String(c.className.baseVal || ""),
        x: round(r.left), y: round(r.top), w: round(r.width), h: round(r.height),
      });
      walk(c);
    }
  };
  walk(d.body);
  /* Boxes of elements that DIRECTLY carry text. These attribute every differing pixel: a difference
     inside a text box is glyph rasterisation, a difference outside one is something actually drawn
     differently. Without this the report could only say "it looks like antialiasing to me". */
  const textBoxes = [];
  for (const e of d.querySelectorAll("*")) {
    let hasText = false;
    for (const n of e.childNodes) if (n.nodeType === 3 && n.textContent.trim()) { hasText = true; break; }
    /* Form controls count as text too. A PLACEHOLDER is not a DOM text node, so the first version of
       this mask could not see it — and the leftover "not on text" pixels turned out to be exactly the
       seed input's placeholder, one glyph row of them. That was a hole in the measurement, not a
       difference in the app. */
    if (!hasText && !/^(INPUT|TEXTAREA|SELECT)$/.test(e.tagName)) continue;
    const r = e.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) textBoxes.push([round(r.left), round(r.top), round(r.right), round(r.bottom)]);
  }
  const appRoot = d.querySelector(".app-root");
  const cs = appRoot ? getComputedStyle(appRoot) : null;
  return {
    metrics: {
      innerWidth: w.innerWidth, innerHeight: w.innerHeight,
      clientWidth: el.clientWidth, clientHeight: el.clientHeight,
      scrollWidth: el.scrollWidth, scrollHeight: el.scrollHeight,
      dpr: w.devicePixelRatio,
    },
    mq: Object.fromEntries(${JSON.stringify(mqList)}.map((q) => [q, w.matchMedia(q).matches])),
    appRoot: cs ? { minHeight: cs.minHeight, paddingLeft: cs.paddingLeft, paddingTop: cs.paddingTop } : null,
    hubZoom: (() => { const e = d.querySelector(".hub-pair"); return e ? getComputedStyle(e).zoom : null; })(),
    bodyTransform: getComputedStyle(d.body).transform,
    bodyFilter: getComputedStyle(d.body).filter,
    nodeCount: nodes.length,
    nodes,
    textBoxes,
    /* Diagnostic only — and note there are NO backticks in this comment: it lives inside a template
       literal, and a stray one ends the probe source mid-sentence.
       The desktop pass puts the hub inside a CSS zoom scope (.hub-pair and .hub-foot in index.css).
       Below 1400 px that scope does not exist and the two captures come out pixel-identical; at and
       above it they differ on glyphs. These boxes let the report say whether the differing glyphs
       are all inside that scope, instead of guessing at the mechanism. */
    zoomScopes: [...d.querySelectorAll(".hub-pair, .hub-foot")].map((e) => {
      const r = e.getBoundingClientRect();
      return [round(r.left), round(r.top), round(r.right), round(r.bottom)];
    }),
  };
})()`;

/* A username is seeded so the capture shows the HUB rather than the first-visit welcome dialog. The
   hub is the screen the later desktop refinement actually works on, and it carries far more layout
   to compare — the column pair, the footer band, the panels. (The welcome dialog was the state
   before this was seeded; it compared clean too, overlay included.) */
const seedScript = (profile) => `(() => {
  localStorage.setItem("preview_as_options", ${JSON.stringify(JSON.stringify(profile))});
  localStorage.setItem("preview_as_username", "VIEWPORTPROOF");
  return true;
})()`;

/* ---------------------------------------------------------------- dev server */

async function serverAlive() {
  try {
    const r = await fetch(ORIGIN + "/", { signal: AbortSignal.timeout(1500) });
    return r.ok;
  } catch { return false; }
}

async function ensureServer() {
  if (await serverAlive()) return { started: false, stop: async () => {} };
  const viteBin = join(ROOT, "node_modules", "vite", "bin", "vite.js");
  if (!existsSync(viteBin)) throw new Error("vite not found — run `npm ci` in this worktree first.");
  // Same invocation the task contract pins, --strictPort included: a server that quietly moved to
  // another port would make every measurement below be about an unknown build.
  const proc = spawn(process.execPath, [viteBin, "--port", String(PORT), "--strictPort"], {
    cwd: ROOT, stdio: "ignore", env: { ...process.env, VITE_PREVIEW: "1" },
  });
  for (let i = 0; i < 100; i++) {
    if (await serverAlive()) return { started: true, stop: async () => { proc.kill(); await sleep(300); } };
    await sleep(200);
  }
  proc.kill();
  throw new Error(`Vite did not come up on ${PORT}`);
}

/* ---------------------------------------------------------------- captures */

async function captureReal(c, vp) {
  await setViewport(c, { width: vp.w, height: vp.h, deviceScaleFactor: DPR });
  await goto(c, `${ORIGIN}/?vp=off`, { settleMs: 400 });
  await evaluate(c, seedScript(baseProfile(null)));
  await goto(c, `${ORIGIN}/?vp=off`, { settleMs: 1600 });
  const probe = await evaluate(c, PROBE(MEDIA_QUERIES));
  const png = await screenshot(c);
  return { probe, png, outerWindow: { w: vp.w, h: vp.h } };
}

async function captureHarness(c, vp) {
  const outer = { w: vp.w + OUTER_PAD, h: vp.h + OUTER_PAD };
  await setViewport(c, { width: outer.w, height: outer.h, deviceScaleFactor: DPR });
  await goto(c, `${ORIGIN}/?vp=off`, { settleMs: 400 });
  await evaluate(c, seedScript(baseProfile(vp.id)));
  await goto(c, `${ORIGIN}/`, { settleMs: 1800 });

  // Wait for the frame and for the app inside it to mount.
  const ready = await evaluate(c, `(async () => {
    for (let i = 0; i < 100; i++) {
      const f = document.querySelector("iframe");
      if (f && f.contentDocument && f.contentDocument.querySelector(".app-root")) return true;
      await new Promise((r) => setTimeout(r, 100));
    }
    return false;
  })()`);
  if (!ready) {
    throw new Error(`harness did not mount at ${vp.id}. If a dev server was already running on `
      + `${PORT}, it is probably NOT a preview build — restart it with VITE_PREVIEW=1.`);
  }
  await sleep(400);

  const rect = await evaluate(c, `(() => { const r = document.querySelector("iframe").getBoundingClientRect();
    return { x: Math.round(r.left), y: Math.round(r.top), width: Math.round(r.width), height: Math.round(r.height) }; })()`);
  // The same probe source, executed in the FRAME's document.
  const probe = await evaluate(c, `(function(){ const f = document.querySelector("iframe");
    return f.contentWindow.eval(${JSON.stringify(PROBE(MEDIA_QUERIES))}); })()`);
  const png = await screenshot(c, rect);
  return { probe, png, outerWindow: outer, frameRect: rect };
}

/* ---------------------------------------------------------------- comparison */

function compareProbes(a, b) {
  const diffs = [];
  for (const k of Object.keys(a.metrics)) {
    if (a.metrics[k] !== b.metrics[k]) diffs.push({ kind: "metric", key: k, harness: a.metrics[k], real: b.metrics[k] });
  }
  for (const q of Object.keys(a.mq)) {
    if (a.mq[q] !== b.mq[q]) diffs.push({ kind: "media-query", key: q, harness: a.mq[q], real: b.mq[q] });
  }
  for (const k of ["hubZoom", "bodyTransform", "bodyFilter"]) {
    if (a[k] !== b[k]) diffs.push({ kind: "style", key: k, harness: a[k], real: b[k] });
  }
  if (a.appRoot && b.appRoot) {
    for (const k of Object.keys(a.appRoot)) {
      if (a.appRoot[k] !== b.appRoot[k]) diffs.push({ kind: "app-root", key: k, harness: a.appRoot[k], real: b.appRoot[k] });
    }
  }

  const layout = [];
  if (a.nodeCount !== b.nodeCount) {
    /* Say WHICH elements, not just how many. A bare count told us three nodes were missing and
       nothing about what they were; the multiset difference named `PwaInstall` immediately. */
    const tally = (ns) => ns.reduce((m, n) => { const k = `${n.t}.${n.c}`; m[k] = (m[k] || 0) + 1; return m; }, {});
    const A = tally(a.nodes), B = tally(b.nodes);
    const only = [];
    for (const k of new Set([...Object.keys(A), ...Object.keys(B)])) {
      if ((A[k] || 0) !== (B[k] || 0)) only.push({ el: k.slice(0, 100), harness: A[k] || 0, real: B[k] || 0 });
    }
    layout.push({ kind: "node-count", harness: a.nodeCount, real: b.nodeCount, elements: only });
  } else {
    for (let i = 0; i < a.nodes.length; i++) {
      const x = a.nodes[i], y = b.nodes[i];
      if (x.t !== y.t || x.c !== y.c) { layout.push({ kind: "structure", i, harness: `${x.t}.${x.c}`, real: `${y.t}.${y.c}` }); continue; }
      if (x.x !== y.x || x.y !== y.y || x.w !== y.w || x.h !== y.h) {
        layout.push({ kind: "box", i, el: `${x.t}.${x.c}`.slice(0, 70),
          harness: [x.x, x.y, x.w, x.h], real: [y.x, y.y, y.w, y.h] });
      }
    }
  }
  return { diffs, layout };
}

/* ---------------------------------------------------------------- run */

const stamp = new Date().toISOString();
const server = await ensureServer();
const c = await launch();
const report = { stamp, dpr: DPR, origin: ORIGIN, outerPad: OUTER_PAD, sizes: [], determinism: null };

try {
  await c.send("Page.enable");
  await c.send("Runtime.enable");
  await reduceMotion(c);
  await seedRandom(c);
  const installSuppression = await suppressInstallPrompt(c);

  report.browser = await evaluate(c, "navigator.userAgent").catch(() => null);
  report.browserPath = c.browserPath;
  report.serverStartedByScript = server.started;

  // Not wiped: every artefact is already @{DPR}x-suffixed, so a 1x and a 2x run coexist as two
  // reference sets rather than the second silently replacing the first.
  mkdirSync(OUT, { recursive: true });

  for (const vp of TEST_VIEWPORTS) {
    process.stdout.write(`\n── ${vp.id} @${DPR}x ─────────────────────────────\n`);

    const H = await captureHarness(c, vp);
    writeFileSync(join(OUT, `harness-${vp.id}@${DPR}x.png`), Buffer.from(H.png, "base64"));
    process.stdout.write(`  harness  frame ${H.frameRect.width}×${H.frameRect.height} in a `
      + `${H.outerWindow.w}×${H.outerWindow.h} window · inner ${H.probe.metrics.innerWidth}×${H.probe.metrics.innerHeight}\n`);

    const R = await captureReal(c, vp);
    writeFileSync(join(OUT, `real-${vp.id}@${DPR}x.png`), Buffer.from(R.png, "base64"));
    process.stdout.write(`  real     window ${R.outerWindow.w}×${R.outerWindow.h}`
      + ` · inner ${R.probe.metrics.innerWidth}×${R.probe.metrics.innerHeight}\n`);

    const cmp = compareProbes(H.probe, R.probe);
    const px = await comparePixels(c, H.png, R.png, R.probe.textBoxes, DPR, R.probe.zoomScopes);
    writeFileSync(join(OUT, `diff-${vp.id}@${DPR}x.png`), Buffer.from(px.diffPng, "base64"));
    delete px.diffPng; // the image is on disk; keep report.json readable

    const ok = cmp.diffs.length === 0 && cmp.layout.length === 0;
    process.stdout.write(`  metrics/MQ/style diffs: ${cmp.diffs.length} · layout diffs: ${cmp.layout.length}`
      + ` · nodes: ${H.probe.nodeCount}/${R.probe.nodeCount}\n`);
    process.stdout.write(`  pixels: ${px.differingPct}% differ · ${px.structuralPct}% beyond noise (max Δ${px.maxDelta})\n`);
    process.stdout.write(`  beyond-noise: ${px.structuralOnText} on text glyphs · `
      + `${px.structuralOffText} NOT on text${px.structuralOffText ? ` (max Δ${px.structuralOffTextMaxDelta})` : ""}`
      + ` · inside the CSS zoom scope: ${px.structuralInsideZoomScope}/${px.structural} (${px.zoomScopeCount} scopes)\n`);
    process.stdout.write(`  → ${ok ? "LAYOUT IDENTICAL" : "LAYOUT DIFFERS"}\n`);

    report.sizes.push({
      id: vp.id, w: vp.w, h: vp.h, dpr: DPR,
      harness: { outerWindow: H.outerWindow, frameRect: H.frameRect, metrics: H.probe.metrics, mq: H.probe.mq,
        appRoot: H.probe.appRoot, hubZoom: H.probe.hubZoom, nodeCount: H.probe.nodeCount, textBoxCount: H.probe.textBoxes.length,
        bodyTransform: H.probe.bodyTransform, bodyFilter: H.probe.bodyFilter,
        file: `harness-${vp.id}@${DPR}x.png`, capturedVia: "TestViewportHarness iframe" },
      real: { outerWindow: R.outerWindow, metrics: R.probe.metrics, mq: R.probe.mq,
        appRoot: R.probe.appRoot, hubZoom: R.probe.hubZoom, nodeCount: R.probe.nodeCount,
        bodyTransform: R.probe.bodyTransform, bodyFilter: R.probe.bodyFilter,
        file: `real-${vp.id}@${DPR}x.png`, capturedVia: "CDP Emulation.setDeviceMetricsOverride" },
      layoutIdentical: ok,
      diffs: cmp.diffs,
      layoutDiffs: cmp.layout.slice(0, 40),
      layoutDiffCount: cmp.layout.length,
      pixels: px,
      diffFile: `diff-${vp.id}@${DPR}x.png`,
    });
  }

  /* ---- determinism: the same harness state, captured twice, from a cold navigation each time ---- */
  process.stdout.write(`\n── determinism (1280x720 @${DPR}x, two cold captures) ──\n`);
  const vp0 = TEST_VIEWPORTS[0];
  const D1 = await captureHarness(c, vp0);
  const D2 = await captureHarness(c, vp0);
  writeFileSync(join(OUT, `determinism-a-${vp0.id}@${DPR}x.png`), Buffer.from(D1.png, "base64"));
  writeFileSync(join(OUT, `determinism-b-${vp0.id}@${DPR}x.png`), Buffer.from(D2.png, "base64"));
  const dCmp = compareProbes(D1.probe, D2.probe);
  const dPx = await comparePixels(c, D1.png, D2.png, D1.probe.textBoxes, DPR);
  writeFileSync(join(OUT, `diff-determinism-${vp0.id}@${DPR}x.png`), Buffer.from(dPx.diffPng, "base64"));
  delete dPx.diffPng;
  const byteIdentical = D1.png === D2.png;
  report.determinism = {
    size: vp0.id, dpr: DPR,
    sameViewport: D1.probe.metrics.innerWidth === D2.probe.metrics.innerWidth
      && D1.probe.metrics.innerHeight === D2.probe.metrics.innerHeight,
    sameState: dCmp.diffs.length === 0 && dCmp.layout.length === 0,
    byteIdentical, pixels: dPx,
    diffs: dCmp.diffs, layoutDiffCount: dCmp.layout.length, layoutDiffs: dCmp.layout.slice(0, 20),
    files: [`determinism-a-${vp0.id}@${DPR}x.png`, `determinism-b-${vp0.id}@${DPR}x.png`],
  };
  process.stdout.write(`  same viewport: ${report.determinism.sameViewport} · same layout: ${report.determinism.sameState}`
    + ` · byte-identical PNG: ${byteIdentical} · differing pixels: ${dPx.differingPct}%\n`);

  /* ---- the one KNOWN difference, measured rather than asserted ----------------------------------
     The suppression above is lifted and both contexts are loaded again, so the report can state as a
     measured fact what an iframe cannot do: Chrome fires `beforeinstallprompt` only in a top-level
     browsing context, so `PwaInstall` renders in a real viewport and never inside the harness. */
  process.stdout.write(`\n── known difference: PWA install link ──────────────\n`);
  await removeInitScript(c, installSuppression);
  const PWA_PROBE = `(() => { const b = [...document.querySelectorAll("button")]
    .find((x) => /installieren|install/i.test(x.textContent || ""));
    return { present: !!b, text: b ? b.textContent.trim() : null }; })()`;

  await setViewport(c, { width: vp0.w, height: vp0.h, deviceScaleFactor: DPR });
  await goto(c, `${ORIGIN}/?vp=off`, { settleMs: 400 });
  await evaluate(c, seedScript(baseProfile(null)));
  await goto(c, `${ORIGIN}/?vp=off`, { settleMs: 2000 });
  const pwaReal = await evaluate(c, PWA_PROBE);

  await setViewport(c, { width: vp0.w + OUTER_PAD, height: vp0.h + OUTER_PAD, deviceScaleFactor: DPR });
  await goto(c, `${ORIGIN}/?vp=off`, { settleMs: 400 });
  await evaluate(c, seedScript(baseProfile(vp0.id)));
  await goto(c, `${ORIGIN}/`, { settleMs: 2400 });
  const pwaHarness = await evaluate(c, `(function(){ const f = document.querySelector("iframe");
    return f ? f.contentWindow.eval(${JSON.stringify(PWA_PROBE)}) : { present: null, text: "no iframe" }; })()`);

  report.knownDifference = {
    what: "PWA install link (src/ui/PwaInstall.jsx)",
    cause: "Chrome fires `beforeinstallprompt` only in a top-level browsing context, never in an iframe.",
    realViewport: pwaReal, harness: pwaHarness,
    nodesAffected: 3,
    controlledDuringComparison: "beforeinstallprompt suppressed in BOTH halves via "
      + "Page.addScriptToEvaluateOnNewDocument, so the layout comparison is not about this.",
    impact: "The harness cannot display the install link. It is a browsing-context capability, not a "
      + "layout fault, and it is conditional in production anyway (browser installability heuristics).",
  };
  process.stdout.write(`  real viewport: ${pwaReal.present ? "present" : "absent"}`
    + ` · harness frame: ${pwaHarness.present ? "present" : "absent"}  → difference is real and explained\n`);

  writeFileSync(join(OUT, `report@${DPR}x.json`), JSON.stringify(report, null, 2));
  process.stdout.write(`\nevidence → ${OUT}\n`);
} finally {
  await c.close();
  await server.stop();
}

const allIdentical = report.sizes.every((s) => s.layoutIdentical);
const deterministic = report.determinism.sameViewport && report.determinism.sameState;
process.stdout.write(`\n${allIdentical ? "PASS" : "FAIL"} · layout identical at every size\n`);
process.stdout.write(`${deterministic ? "PASS" : "FAIL"} · harness captures are deterministic\n`);
/* MH3: the code, not `process.exit()` — a pipe stdout is async on POSIX and an exit call drops
   whatever is still queued, which here would be the two verdict lines themselves. */
if (!allIdentical || !deterministic) process.exitCode = 1;
