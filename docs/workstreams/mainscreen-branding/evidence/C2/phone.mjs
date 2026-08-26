#!/usr/bin/env node
/* #mainscreen-branding C2 — the narrow version, which this commit is not allowed to move.
   ============================================================================

     npm run build && node docs/workstreams/mainscreen-branding/evidence/C2/phone.mjs --out before.json
     (apply the diff, rebuild)
     node docs/workstreams/mainscreen-branding/evidence/C2/phone.mjs --out after.json

   WHY THIS EXISTS AND THE SURVEY IS NOT ENOUGH. The survey starts at 1280 px. Everything below is a
   non-goal of this round, which means it must not move — and "must not move" is a claim that needs an
   instrument, not a sentence. This commit changes the ONE element the phone and the desktop share and
   the one the round warns about twice: the wordmark. Below 1280 the `<h1>` now contains a `<span>` and
   an SVG where it used to contain plain text.

   THAT SUBSTITUTION IS EXACTLY THE KIND THAT LOOKS FREE AND IS NOT. `.as-wordmark` paints itself with
   `background-clip: text` over a transparent fill; an inline child inherits the transparency but the
   background lives on the parent, so the clip now spans an element boundary. Whether that renders
   identically is a question about the engine and not about the intent.

   SO IT IS MEASURED, not reasoned: the wordmark's box, its text, its resolved size, and the box of
   every child of `.hub-root` — before and after, at three phone widths, in both languages. */

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
const OUT = (() => {
  const i = process.argv.indexOf("--out");
  return i >= 0 && process.argv[i + 1] ? resolve(process.argv[i + 1]) : join(HERE, "phone.json");
})();

/* Three widths below the threshold, chosen for what they are rather than for coverage: the narrowest
   phone the layout claims to serve, a common one, and one pixel below the breakpoint — where the
   phone branch and the desktop branch are one pixel apart and a mistake is cheapest to make. */
const SIZES = [[360, 800], [390, 844], [1279, 800]];
const LANGS = ["de", "en"];

const seed = (lang) => `(() => {
  localStorage.setItem("as_options", JSON.stringify({ lang: ${JSON.stringify(lang)}, muted: true,
    telemetry: false, reducedFx: "an", testViewport: null }));
  localStorage.setItem("as_username", "SURVEY");
  return true;
})()`;

const SETTLE = `(async () => {
  for (const a of document.getAnimations()) { try { a.currentTime = 0; a.pause(); } catch (e) {} }
  await Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 3000))]);
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  return true;
})()`;

const PROBE = `(() => {
  const wm = document.querySelector(".hub-play .as-wordmark");
  const root = document.querySelector(".hub-root");
  if (!wm || !root) return { reached: false, why: "no wordmark or no .hub-root" };
  const b = (e) => { const r = e.getBoundingClientRect();
    return { x: +r.x.toFixed(2), y: +r.y.toFixed(2), w: +r.width.toFixed(2), h: +r.height.toFixed(2) }; };
  const cs = getComputedStyle(wm);
  return {
    reached: true,
    scrollH: document.documentElement.scrollHeight,
    wordmark: { box: b(wm), text: (wm.textContent || "").trim(),
      wmSize: cs.getPropertyValue("--wm-size").trim(), fontSize: cs.fontSize,
      lineHeight: cs.lineHeight, letterSpacing: cs.letterSpacing, marginTop: cs.marginTop,
      /* The cells and the lockup must be ABSENT from the layout here, not merely invisible: a
         display:none element still exists, so what is asserted is that it contributes no box. */
      gridBoxes: Array.prototype.slice.call(wm.querySelectorAll(".as-brandgrid"))
        .map((e) => b(e)).filter((r) => r.w > 0 || r.h > 0).length,
      lockupBoxes: Array.prototype.slice.call(document.querySelectorAll(".as-lockup"))
        .map((e) => b(e)).filter((r) => r.w > 0 || r.h > 0).length },
    /* Every child of the vertical stack, so a shift anywhere in the phone column shows up and not
       only one at the wordmark. */
    stack: Array.prototype.slice.call(root.children).map((c) => ({
      cls: (c.getAttribute("class") || "").slice(0, 60), box: b(c) })),
  };
})()`;

const conn = await launch({ port: 9341 });
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
      await evaluate(conn, seed(lang));
      await goto(conn, ORIGIN, { settleMs: 1400 });
      await evaluate(conn, SETTLE);
      const m = await evaluate(conn, PROBE);
      cells.push({ id: `${w}x${h}/${lang}`, ...m });
      process.stdout.write(`  ${w}x${h}/${lang} … ${m.reached ? `wm ${m.wordmark.box.w}x${m.wordmark.box.h} "${m.wordmark.text}"` : m.why}\n`);
    }
  }
} finally {
  await conn.close();
}
writeFileSync(OUT, JSON.stringify({ cells }, null, 2) + "\n");
process.stdout.write(`  wrote ${OUT}\n`);
