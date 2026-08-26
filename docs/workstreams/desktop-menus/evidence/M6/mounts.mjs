#!/usr/bin/env node
/* #menu-rework M6 — H-a and H-c: the mounts the survey never opens, and the cascade, measured.
   ============================================================================

     node docs/workstreams/desktop-menus/evidence/M6/mounts.mjs --out <dir> [--shots <dir>]

   NINE MOUNTS, ONE CELL. `Glossary.jsx` exports `GlossaryPanel` and `GlossaryText`, and they are
   mounted from `SkillSelect`, `PerkSelect`, `LegendarySelect`, `FormationPhase`, `ArchitectScreen`,
   `HeldSkills`, `StartScreen` (twice) and `CornerTools`/`App`. The survey's `glossary` cell reaches
   exactly one of them — `{ sel: ".gloss-i-btn" }` from a freshly loaded hub, which clicks the FIRST
   VISIBLE match. Eight are outside every capture this workstream has taken.

   This harness answers three questions the survey cannot, and each is a measurement, not a claim:

     1. WHICH mount the survey's own cell covers. Two glossary buttons stand on the hub above
        1280 px — `CornerTools`' pair button and `StartScreen`'s footer button — and exactly one of
        them is `vis[0]`. Printed per cell, so "covered" is a name rather than an assumption.
     2. THE PICK PHASE. `SkillSelect` is the battle session, out of this round entirely, and the
        acceptance gate turns on `skill-choice` at zero deltas. The survey can say the pick screen
        did not move; it cannot say the overlay still draws what it drew WHEN OPENED FROM THERE.
        So this opens it there and measures it with the gate's own instrument (`surfaceProbeSource`).
     3. THE CASCADE. Ten axis declarations in the `.gl-*` rules are overridden by a later rule of
        equal specificity — `#gl-ruhe` stood a second block beside the first instead of editing it.
        Whether a declaration paints is a MEASUREMENT, not a reading: every one is read back off the
        live document as a computed value, before the diff and again after it.

   THE NAMED CLASS, AND THIS HARNESS SITS NEXT DOOR TO ITS SEVENTH VICTIM. M5's probe targeted "the
   only visible button whose text is `i`" — which is the GLOSSARY's button, first in the document,
   and it opened the glossary while reporting ok (M5-F05). Here the glossary's button IS the target,
   so the exclusion runs the other way and is written as *contains no X other than Y*: the pick
   phase's glossary button is the visible `.gloss-i-btn` that carries NONE of the hub's or the run
   bar's marker classes, and there must be exactly one of it. A second same-shaped control cannot
   slip in unnoticed, and a hub button cannot be mistaken for the pick phase's.

   DETERMINISM AND THE BUNDLE come from the shared modules, as everywhere in this workstream:
   pinned clock, the board answered locally, reduced motion, seeded random, `dist/` verified before
   the first cell and again after the last. */

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

/* Every selector this task touched, plus the ones it deliberately left alone, so the census reports
   what it saw instead of what it hoped for. */
const CENSUS = [
  ".gl-dim", ".gl-frame", ".gl-card", ".gl-head", ".gl-search input", ".gl-close", ".gl-hair",
  ".gl-desk", ".gl-nav", ".gl-navhead", ".gl-navrow", ".gl-navrow.is-on", ".gl-navdot",
  ".gl-navcount", ".gl-navnote", ".gl-page", ".gl-page-h", ".gl-body", ".gl-cols",
  ".gl-cols .gloss-term-row", ".gl-ticon", ".gl-sechead", ".gl-tabs",
  ".gloss-i-btn", ".gloss-i-mark", ".gloss-term",
];

/* THE CASCADE CENSUS. One entry per declaration whose fate this task decides, read as a COMPUTED
   value off the live document. A declaration whose computed value is not what it declares has lost
   to a later rule and paints nothing — that is the evidence for deleting it rather than tokenising
   it, and it is the same test M5 applied to `.gd-close` and `.gd-navrow` (M5-F01), here measured
   instead of read off the sheet. */
const CASCADE = [
  [".gl-close", ["borderTopLeftRadius"]],
  [".gl-navrow", ["borderTopLeftRadius", "backgroundImage", "backgroundColor", "borderTopWidth",
                  "borderLeftWidth", "borderTopColor", "paddingTop", "paddingLeft", "gap"]],
  [".gl-navrow.is-on", ["backgroundImage", "backgroundColor", "boxShadow", "borderLeftColor"]],
  [".gl-navdot", ["borderTopLeftRadius", "borderTopRightRadius", "width", "height"]],
  [".gl-navcount", ["backgroundColor", "backgroundImage", "borderTopWidth", "borderTopColor",
                    "borderTopLeftRadius", "paddingTop", "minWidth"]],
  [".gl-navrow.is-on .gl-navcount", ["borderTopColor", "borderTopWidth"]],
  [".gl-navnote", ["borderTopColor", "borderTopWidth", "paddingTop"]],
  [".gl-nav", ["backgroundImage", "borderTopLeftRadius", "paddingTop"]],
  [".gl-page", ["backgroundImage", "borderTopLeftRadius", "paddingTop"]],
  [".gl-head", ["backgroundImage", "backgroundColor", "borderBottomWidth", "borderBottomColor"]],
  [".gl-dim", ["backgroundColor", "backdropFilter"]],
  [".gl-hair", ["borderTopLeftRadius"]],
  [".gl-search input", ["backgroundColor", "borderTopColor", "paddingTop"]],
  [".gl-cols .gloss-term-row", ["paddingTop", "paddingLeft", "paddingBottom", "borderTopLeftRadius",
                                "borderTopColor", "borderTopWidth", "backgroundColor", "boxShadow"]],
  [".gl-ticon", ["borderTopLeftRadius", "backgroundColor", "borderTopColor"]],
  [".gloss-i-btn", ["borderTopLeftRadius", "backgroundColor", "borderTopColor", "color"]],
  [".gloss-i-mark", ["borderTopLeftRadius", "backgroundColor", "borderTopColor"]],
];

/* Reach the skill choice — the survey's own `skill-choice` walk, verbatim as data — then open the
   glossary from inside it. */
const STEPS = [
  { text: "Lauf beginnen|Start run", settle: 2200 },
  { until: ".sk-offers", maxMs: 60000 },
  { pickGlossary: true, settle: 1200 },
  { until: ".gl-desk, .gl-body, .gl-page", maxMs: 20000 },
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
  + "  localStorage.setItem(\"as_username\", \"M6\");\n"
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

/* WHICH BUTTON IS WHOSE. Every `.gloss-i-btn` in the document with the marker class that names its
   mount, its visibility and its box. `vis[0]` is what the survey clicks, and it is printed rather
   than inferred — the survey's own step is `{ sel: ".gloss-i-btn" }` with no further qualification. */
const BTN_CENSUS = "(() => {\n"
  + "  const MARK = { \"as-corner-btn\": \"CornerTools (hub chrome)\",\n"
  + "                 \"as-gloss-foot\": \"StartScreen footer (the mainscreen)\",\n"
  + "                 \"as-gloss-corner\": \"StartScreen corner (the mainscreen, below 1280)\",\n"
  + "                 \"rn-glossary\": \"App run bar (hub chrome, in-run)\" };\n"
  + "  const all = Array.prototype.slice.call(document.querySelectorAll(\".gloss-i-btn\"));\n"
  + "  const rows = all.map((b, i) => {\n"
  + "    const r = b.getBoundingClientRect();\n"
  + "    const mark = Object.keys(MARK).find((k) => b.classList.contains(k)) || null;\n"
  + "    return { dom: i, mount: mark ? MARK[mark] : \"a screen-local mount (no marker class)\",\n"
  + "             marker: mark, visible: r.width > 0 && r.height > 0,\n"
  + "             box: Math.round(r.width) + \"x\" + Math.round(r.height) };\n"
  + "  });\n"
  + "  const vis = rows.filter((r) => r.visible);\n"
  + "  return { total: rows.length, rows: rows, surveyClicks: vis[0] || null };\n"
  + "})()";

/* THE PICK PHASE'S OWN GLOSSARY BUTTON, written as *contains no X other than Y* rather than as
   *is present*. The hub's two buttons and the run bar's are still in the document behind the run;
   naming the target by its text or its class alone would take whichever came first in DOM order —
   which is exactly how M5's probe opened the glossary while reporting ok on the guide (M5-F05).
   The pick phase's button is the visible `.gloss-i-btn` that carries NONE of the four marker
   classes, and there must be EXACTLY ONE of it: two would mean a second screen is layered in and
   the cell would be measuring something else. Its 26-px box is asserted too, so a control that
   merely borrowed the class cannot pass for it. */
const CLICK_PICK_GLOSSARY = "(() => {\n"
  + "  const MARKERS = [\"as-corner-btn\", \"as-gloss-foot\", \"as-gloss-corner\", \"rn-glossary\"];\n"
  + "  const all = Array.prototype.slice.call(document.querySelectorAll(\".gloss-i-btn\"))\n"
  + "    .filter((b) => { const r = b.getBoundingClientRect(); return r.width > 0 && r.height > 0; });\n"
  + "  const mine = all.filter((b) => !MARKERS.some((m) => b.classList.contains(m)));\n"
  + "  if (mine.length !== 1) return { ok: false, why: \"expected exactly one unmarked glossary button, found \"\n"
  + "    + mine.length + \" (of \" + all.length + \" visible)\" };\n"
  + "  if (!document.querySelector(\".sk-offers\"))\n"
  + "    return { ok: false, why: \"the pick phase is not on screen\" };\n"
  + "  const r = mine[0].getBoundingClientRect();\n"
  + "  if (Math.round(r.width) !== 26) return { ok: false, why: \"the button is \" + Math.round(r.width)\n"
  + "    + \" px wide, not 26 — this is probably a different control\" };\n"
  + "  mine[0].click(); return { ok: true, box: Math.round(r.width) + \"x\" + Math.round(r.height) };\n"
  + "})()";

const hasMarker = (sel) => "(() => !!document.querySelector(" + JSON.stringify(sel) + "))()";

const censusOf = (sels) => "(() => {\n"
  + "  const out = {};\n"
  + "  for (const s of " + JSON.stringify(sels) + ") out[s] = document.querySelectorAll(s).length;\n"
  + "  return out;\n"
  + "})()";

const cascadeOf = (spec) => "(() => {\n"
  + "  const out = {};\n"
  + "  for (const pair of " + JSON.stringify(spec) + ") {\n"
  + "    const sel = pair[0], props = pair[1];\n"
  + "    const el = document.querySelector(sel);\n"
  + "    if (!el) { out[sel] = null; continue; }\n"
  + "    const cs = getComputedStyle(el);\n"
  + "    const row = {};\n"
  + "    for (const p of props) row[p] = cs[p];\n"
  + "    out[sel] = row;\n"
  + "  }\n"
  + "  return out;\n"
  + "})()";

/* The sub-1280 half of the answer. `--ed-base` is the ONE step this task points a value at that is
   also read BELOW 1280 px (`Glossary.jsx:154`, the phone head's bottom edge; the desktop rule sets
   `border-bottom: none`). If the token has one declaration and no media override it has one value at
   every width, and then the substitution cannot move the phone. Read off the LIVE document, because
   that is where a media override would show. */
const TOKEN_AT_WIDTH = "(() => {\n"
  + "  const cs = getComputedStyle(document.documentElement);\n"
  + "  return { edBase: cs.getPropertyValue(\"--ed-base\").trim(),\n"
  + "           edQuiet: cs.getPropertyValue(\"--ed-quiet\").trim(),\n"
  + "           rdLg: cs.getPropertyValue(\"--rd-lg\").trim(),\n"
  + "           sfGlass: cs.getPropertyValue(\"--sf-glass\").trim(),\n"
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
                 langs: [...new Set(CELLS.map(([l]) => l))],
                 cells: {}, tokenAtWidths: {}, hubButtons: {}, cascade: {} };
let unreached = 0;

try {
  await c.send("Page.enable");
  await c.send("Runtime.enable");
  await reduceMotion(c);
  await seedRandom(c);
  await suppressInstallPrompt(c);
  await c.send("Page.addScriptToEvaluateOnNewDocument", { source: freezeClockSource() });
  await c.send("Page.addScriptToEvaluateOnNewDocument", { source: fetchStubSource() });
  process.stdout.write("  clock pinned · board answered locally · the glossary opened from the PICK PHASE\n");

  /* The token question first, at four widths including two below the threshold. */
  for (const w of [1920, 1280, 1100, 390]) {
    await setViewport(c, { width: w, height: 800, deviceScaleFactor: 1 });
    await goto(c, ORIGIN, { settleMs: 500 });
    matrix.tokenAtWidths[w] = await evaluate(c, TOKEN_AT_WIDTH);
  }
  const vals = Object.values(matrix.tokenAtWidths).map((v) => v.edBase);
  process.stdout.write("  --ed-base at 1920/1280/1100/390: " + vals.join(" · ")
    + (new Set(vals).size === 1 ? "   [one value at every width]" : "   [DIFFERS BY WIDTH]") + "\n");

  /* Which of the nine mounts the survey's own cell covers, and the cascade of the rules this task
     decides — both read on the hub, where the survey takes its `glossary` cell. */
  for (const [lang, w, h] of [["de", 1280, 720], ["de", 1920, 1080]]) {
    const size = w + "x" + h;
    await setViewport(c, { width: w, height: h, deviceScaleFactor: 1 });
    await goto(c, ORIGIN, { settleMs: 400 });
    await evaluate(c, seedScript(lang));
    await goto(c, ORIGIN, { settleMs: 1400 });
    const btns = await evaluate(c, BTN_CENSUS);
    matrix.hubButtons[lang + "/" + size] = btns;
    process.stdout.write("\n  hub " + lang + " · " + size + " — " + btns.total
      + " glossary buttons in the document; the survey clicks: "
      + (btns.surveyClicks ? btns.surveyClicks.mount + " [" + btns.surveyClicks.box + "]" : "NONE") + "\n");
    for (const r of btns.rows) {
      process.stdout.write("    dom " + r.dom + "  " + (r.visible ? "visible" : "hidden ")
        + "  " + String(r.box).padEnd(9) + "  " + r.mount + "\n");
    }
    /* Open it from the hub and read the cascade off the live overlay. */
    await evaluate(c, "(() => { const b = Array.prototype.slice.call(document.querySelectorAll(\".gloss-i-btn\"))"
      + ".filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; })[0];"
      + " if (b) b.click(); return !!b; })()");
    await sleep(1000);
    if (await evaluate(c, hasMarker(".gl-desk, .gl-body, .gl-page"))) {
      await evaluate(c, SETTLE);
      matrix.cascade[lang + "/" + size] = await evaluate(c, cascadeOf(CASCADE));
      process.stdout.write("    cascade read for " + Object.keys(matrix.cascade[lang + "/" + size]).length
        + " selectors\n");
    } else {
      matrix.cascade[lang + "/" + size] = null;
      process.stdout.write("    CASCADE NOT READ — the glossary did not open from the hub\n");
    }
  }

  for (const [lang, w, h] of CELLS) {
    const size = w + "x" + h;
    const key = lang + "/" + size + "/glossary-from-pick";
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
        if (step.pickGlossary) r = await evaluate(c, CLICK_PICK_GLOSSARY);
        else if (step.until) {
          const deadline = Date.now() + (step.maxMs || 60000);
          r = { ok: false, why: step.until + " never appeared" };
          while (Date.now() < deadline) {
            if (await evaluate(c, hasMarker(step.until))) { r = { ok: true }; break; }
            await sleep(1000);
          }
        } else r = await evaluate(c, clickText(step.text));
        trace.push({ step: step.until || step.text || "pick-phase glossary button", ok: !!r.ok, why: r.why, box: r.box });
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
        const file = join(SHOT_DIR, lang + "__" + size + "__glossary.png");
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
