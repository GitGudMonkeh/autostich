#!/usr/bin/env node
/* #mainscreen-branding C5 — how tall is Orbitron's capital, really?
   ============================================================================

     npm run build
     node docs/workstreams/mainscreen-branding/evidence/C5/capheight.mjs

   THE DESIGN SAYS "rund .7em" AND DERIVES THE OVERSHOOT FROM IT. The owner has now asked for the
   column to sit FLUSH with the letters instead, top and bottom, and to take the difference out of the
   gaps between the squares. That turns a rounded figure into a load-bearing one: if the cap height
   really is .70em, then eight cells at .09em already measure .72em and there is no gap left to give —
   the cell would have to shrink too, which is a different change from the one that was asked for.

   So it is measured, on the real font at the real size:

     1. `TextMetrics.actualBoundingBoxAscent` for the capitals — the ink above the baseline.
     2. Separately for the FLAT-topped letters, because a font overshoots on round shapes (O, C, S)
        and "flush" has to mean flush with the letters either side of the cut, which are T and C.
     3. A DOM range over one capital as a cross-check that does not go through canvas at all.

   Nothing here changes a pixel; it prints numbers. */

import { readFileSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { launch, setViewport, reduceMotion, seedRandom, suppressInstallPrompt, goto, evaluate }
  from "../../../../../scripts/cdp.mjs";
import { fetchStubSource, freezeClockSource } from "../../../../../scripts/survey-stub.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../../../..");
const BASE = (() => {
  const html = readFileSync(join(ROOT, "dist/index.html"), "utf8");
  const m = html.match(/<script[^>]+src="([^"]*)\/assets\//);
  return m && m[1] ? `${m[1]}/` : "/";
})();
const ORIGIN = `http://localhost:5181${BASE}`;

const PROBE = `(async () => {
  await document.fonts.ready;
  const wm = document.querySelector(".hub-play .as-wordmark");
  if (!wm) return { reached: false };
  const cs = getComputedStyle(wm);
  const size = parseFloat(cs.fontSize);
  const font = cs.fontWeight + " " + cs.fontSize + " " + cs.fontFamily;
  const ctx = document.createElement("canvas").getContext("2d");
  ctx.font = font;
  const ink = (ch) => {
    const m = ctx.measureText(ch);
    return { ascent: +m.actualBoundingBoxAscent.toFixed(3), descent: +m.actualBoundingBoxDescent.toFixed(3),
      em: +(m.actualBoundingBoxAscent / size).toFixed(4) };
  };
  const range = document.createRange();
  const textNode = Array.prototype.slice.call(wm.childNodes).find((n) => n.nodeType === 3 && n.textContent.trim().length);
  let lineBox = null;
  if (textNode) { range.setStart(textNode, 0); range.setEnd(textNode, 1);
    lineBox = +range.getBoundingClientRect().height.toFixed(2); }
  /* AT 88 px THE ANSWER IS QUANTISED. Chrome returns "actualBoundingBoxAscent" in whole pixels, so
     every capital came back as exactly 64 — a ratio of 0.7273 with a resolution of only 1/88. The
     number goes into the stylesheet, so it is measured again at sizes where one pixel is a much
     smaller share of an em, and the ratio is read off the largest. */
  const atSize = (px) => {
    ctx.font = cs.fontWeight + " " + px + "px " + cs.fontFamily;
    const a = ctx.measureText("H").actualBoundingBoxAscent;
    return { px, ascent: a, em: +(a / px).toFixed(6) };
  };
  const sweep = [88, 176, 352, 880, 1760, 3520].map(atSize);
  ctx.font = font;
  const hm = ctx.measureText("H");
  return { reached: true, font, size, lineBox, sweep,
    caps: Object.fromEntries("AUTOSHIRCK".split("").map((c) => [c, ink(c)])),
    fontMetrics: { ascent: hm.fontBoundingBoxAscent, descent: hm.fontBoundingBoxDescent } };
})()`;

const conn = await launch({ port: 9343 });
try {
  await conn.send("Page.enable");
  await conn.send("Runtime.enable");
  await reduceMotion(conn);
  await seedRandom(conn);
  await suppressInstallPrompt(conn);
  await conn.send("Page.addScriptToEvaluateOnNewDocument", { source: freezeClockSource() });
  await conn.send("Page.addScriptToEvaluateOnNewDocument", { source: fetchStubSource() });
  await setViewport(conn, { width: 1920, height: 1080, deviceScaleFactor: 1 });
  await goto(conn, ORIGIN, { settleMs: 400 });
  await evaluate(conn, `(() => { localStorage.setItem("as_options", JSON.stringify({ lang: "de",
    muted: true, telemetry: false, reducedFx: "an", testViewport: null }));
    localStorage.setItem("as_username", "SURVEY"); return true; })()`);
  await goto(conn, ORIGIN, { settleMs: 1600 });
  const m = await evaluate(conn, PROBE);
  if (!m.reached) throw new Error("no wordmark on the page");
  process.stdout.write(`  font: ${m.font}\n  size: ${m.size}px · line box of one capital: ${m.lineBox}px\n`);
  process.stdout.write(`  font bounding box: ascent ${m.fontMetrics.ascent} descent ${m.fontMetrics.descent}\n\n`);
  process.stdout.write("  letter   ink ascent   in em   ink descent\n");
  for (const [c, v] of Object.entries(m.caps)) {
    process.stdout.write(`     ${c}       ${String(v.ascent).padStart(8)}   ${String(v.em).padStart(6)}   ${v.descent}\n`);
  }
  const ems = Object.values(m.caps).map((v) => v.em);
  const flat = Object.entries(m.caps).filter(([c]) => "AHITK".includes(c)).map(([, v]) => v.em);
  process.stdout.write(`\n  cap height, flat-topped letters (A H I T K): ${Math.min(...flat)} .. ${Math.max(...flat)} em\n`);
  process.stdout.write(`  cap height, all sampled:                     ${Math.min(...ems)} .. ${Math.max(...ems)} em\n`);
  process.stdout.write(`
  THE SAME RATIO AT RISING SIZES — one pixel is a smaller share of an em each time:
`);
  for (const s of m.sweep) process.stdout.write(`    ${String(s.px).padStart(5)}px -> ${String(s.ascent).padStart(6)} px ink = ${s.em} em
`);
  const cap = m.sweep[m.sweep.length - 1].em;
  process.stdout.write(`
  cap height taken as ${cap} em (largest sample, resolution 1/${m.sweep[m.sweep.length - 1].px})
`);

  /* THE COLUMN IS AN EXCERPT OF THE SIGN, so its cell-to-gutter proportion may not change: a
     different rhythm would make it a second drawing rather than a cut of the same one. The whole
     column is therefore scaled by ONE factor until eight cells and seven gaps fill the cap exactly. */
  const CELL = 0.09, GUT = 0.022, BORD = 0.012, RAD = 0.014;
  const col = 8 * CELL + 7 * GUT;
  const k = cap / col;
  process.stdout.write(`
  FLUSH BY SCALING THE SIGN’S OWN GEOMETRY — one factor, proportion untouched:
`);
  process.stdout.write(`    column today   ${col.toFixed(4)} em  (8 x .09 + 7 x .022)
`);
  process.stdout.write(`    factor         ${cap.toFixed(6)} / ${col.toFixed(4)} = ${k.toFixed(6)}
`);
  for (const [n, v] of [["cell", CELL], ["gutter", GUT], ["border", BORD], ["radius", RAD]]) {
    process.stdout.write(`    ${n.padEnd(7)} ${v}em -> ${(v * k).toFixed(6)}em  (${(v * k * 88).toFixed(2)}px at 88px,`
      + ` ${(v * k * 88 * 0.85).toFixed(2)} device px at 1280)
`);
  }
  process.stdout.write(`    check          8 x cell + 7 x gutter = ${(8 * CELL * k + 7 * GUT * k).toFixed(6)} em
`);

  process.stdout.write(`
  THE ALTERNATIVE THE OWNER OFFERED — keep the square, take it all out of the gap:
`);
  for (const cell of [0.09, 0.085, 0.08, 0.075]) {
    const gap = (cap - 8 * cell) / 7;
    process.stdout.write(`    cell ${cell}em -> gap ${gap.toFixed(5)}em (${(gap * 88).toFixed(2)}px at 88px,`
      + ` ${(gap * 88 * 0.85).toFixed(2)} device px at 1280)${gap * 88 * 0.85 < 1 ? "   <- under one device pixel" : ""}
`);
  }
} finally {
  await conn.close();
}
