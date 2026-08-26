#!/usr/bin/env node
/* #mainscreen-branding C5 — is the column actually flush?
   ============================================================================

     npm run build
     node docs/workstreams/mainscreen-branding/evidence/C5/flush.mjs

   "Flush" is a claim about two edges, so it is measured as two numbers and not looked at. The
   reference is the INK of the letters either side of the cut, not the line box and not the element
   box: a line box is taller than the letters and would call almost anything flush.

   The ink edges are found by rendering the neighbouring letters into a canvas with the same font at
   the same size and reading `actualBoundingBoxAscent` — the cap top relative to the baseline — and
   then locating the baseline in the live page from the wordmark's own box. Both edges are reported
   in device pixels at the viewport being measured, because that is where a reader would see a
   mismatch.

   Also reported: the column's width and the wordmark's total width, since the cells got smaller and
   the letter is now narrower than the glyph it replaced. */

import { writeFileSync, readFileSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { launch, setViewport, reduceMotion, seedRandom, suppressInstallPrompt, goto, evaluate }
  from "../../../../../scripts/cdp.mjs";
import { fetchStubSource, freezeClockSource } from "../../../../../scripts/survey-stub.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "../../../../..");
const BASE = (() => {
  const html = readFileSync(join(ROOT, "dist/index.html"), "utf8");
  const m = html.match(/<script[^>]+src="([^"]*)\/assets\//);
  return m && m[1] ? `${m[1]}/` : "/";
})();
const ORIGIN = `http://localhost:5181${BASE}`;
const SIZES = [[1280, 720], [1920, 1080]];
const LANGS = ["de", "en"];

const PROBE = `(async () => {
  await document.fonts.ready;
  const wm = document.querySelector(".hub-play .as-wordmark");
  const col = document.querySelector(".hub-play .as-brandgrid-column");
  if (!wm || !col) return { reached: false, why: "no wordmark or no column" };
  const cs = getComputedStyle(wm);
  const size = parseFloat(cs.fontSize);
  const zoom = wm.offsetHeight > 0 ? wm.getBoundingClientRect().height / wm.offsetHeight : 1;

  /* THE BASELINE, located rather than assumed: a zero-height inline-block aligned to the baseline
     puts its own bottom edge exactly there. Planted inside the wordmark so it shares the line box. */
  const mark = document.createElement("i");
  mark.setAttribute("data-c5-probe", "");
  mark.style.cssText = "display:inline-block;width:0;height:0;vertical-align:baseline;";
  wm.appendChild(mark);
  const baseline = mark.getBoundingClientRect().bottom;
  mark.remove();

  /* THE CAP RATIO IS TAKEN AT A LARGE SIZE, NOT AT 88 px, and the first version of this file did not
     — it measured at the rendered size and Chrome quantises "actualBoundingBoxAscent" to whole
     pixels, so a 63.25 px cap came back as 64 and the probe reported the column 0.75 px short of
     flush when it was exactly on it. The ratio is the same at any size; only the resolution differs. */
  const ctx = document.createElement("canvas").getContext("2d");
  ctx.font = cs.fontWeight + " 3520px " + cs.fontFamily;
  const capEm = ctx.measureText("H").actualBoundingBoxAscent / 3520;
  ctx.font = cs.fontWeight + " " + cs.fontSize + " " + cs.fontFamily;
  /* The ink top of the capitals, in the page's own coordinates. "capEm" is in LAYOUT em; the page
     shows it scaled by the zoom, so it is converted before it is compared with a rect. */
  const capTop = baseline - capEm * size * zoom;

  const r = col.getBoundingClientRect();
  return { reached: true, size, zoom: +zoom.toFixed(4), capEm: +capEm.toFixed(5),
    baseline: +baseline.toFixed(2), capTop: +capTop.toFixed(2),
    column: { top: +r.top.toFixed(2), bottom: +r.bottom.toFixed(2),
      w: +r.width.toFixed(2), h: +r.height.toFixed(2), layoutH: col.offsetHeight },
    /* the two numbers this file exists for, in device px at this viewport */
    flushTop: +(r.top - capTop).toFixed(2),
    flushBottom: +(r.bottom - baseline).toFixed(2),
    cells: col.querySelectorAll(".as-bg-cell").length,
    hot: col.querySelectorAll(".as-bg-hot").length,
    quietFill: (() => { const q = col.querySelector(".as-bg-quiet");
      const s = q && getComputedStyle(q);
      return q ? { fill: s.fill, fillOpacity: s.fillOpacity, strokeOpacity: s.strokeOpacity } : null; })(),
    wordmark: { layoutW: wm.offsetWidth, cssW: +wm.getBoundingClientRect().width.toFixed(2),
      text: (wm.textContent || "").trim() },
    restored: document.querySelectorAll("[data-c5-probe]").length };
})()`;

const conn = await launch({ port: 9344 });
const cells = [];
try {
  await conn.send("Page.enable");
  await conn.send("Runtime.enable");
  await reduceMotion(conn);
  await seedRandom(conn);
  await suppressInstallPrompt(conn);
  await conn.send("Page.addScriptToEvaluateOnNewDocument", { source: freezeClockSource() });
  await conn.send("Page.addScriptToEvaluateOnNewDocument", { source: fetchStubSource() });
  for (const lang of LANGS) {
    for (const [w, h] of SIZES) {
      await setViewport(conn, { width: w, height: h, deviceScaleFactor: 1 });
      await goto(conn, ORIGIN, { settleMs: 400 });
      await evaluate(conn, `(() => { localStorage.setItem("as_options", JSON.stringify({ lang: ${JSON.stringify(lang)},
        muted: true, telemetry: false, reducedFx: "an", testViewport: null, deckId: "deck_thron1", battlefieldId: "bf_thron1" }));
        localStorage.setItem("as_profile", JSON.stringify({ championWeeks: 1 }));
        localStorage.setItem("as_username", "SURVEY"); return true; })()`);
      await goto(conn, ORIGIN, { settleMs: 1600 });
      const m = await evaluate(conn, PROBE);
      cells.push({ id: `${w}x${h}/${lang}`, ...m });
      process.stdout.write(m.reached
        ? `  ${`${w}x${h}/${lang}`.padEnd(16)} top ${String(m.flushTop).padStart(6)} px · bottom ${String(m.flushBottom).padStart(6)} px`
          + ` · column ${m.column.w}x${m.column.h} · ${m.hot}/${m.cells} lit · quiet fill ${m.quietFill.fillOpacity}\n`
        : `  ${w}x${h}/${lang} NOT REACHED: ${m.why}\n`);
    }
  }
} finally {
  await conn.close();
}
writeFileSync(join(HERE, "flush.json"), JSON.stringify({ cells }, null, 2) + "\n");
const worst = Math.max(...cells.filter((c) => c.reached).flatMap((c) => [Math.abs(c.flushTop), Math.abs(c.flushBottom)]));
process.stdout.write(`\n  worst edge mismatch across ${cells.length} cells: ${worst.toFixed(2)} device px\n`);
if (cells.some((c) => c.restored !== 0)) { process.stdout.write("  a probe was left behind\n"); process.exitCode = 1; }
