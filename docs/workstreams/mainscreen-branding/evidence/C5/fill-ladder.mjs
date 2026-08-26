#!/usr/bin/env node
/* #mainscreen-branding C5 — the fill, as a ladder rather than as one guess.
   ============================================================================

     npm run build
     node docs/workstreams/mainscreen-branding/evidence/C5/fill-ladder.mjs

   The owner asked for "a bit more colour fill" in the squares. "A bit" is a judgement, so what ships
   is the step the design's own table already has — the mid tone, deck colour at 28 % fill and 66 %
   edge — and the neighbours on either side of it are captured beside it so the answer costs one look
   instead of a round trip.

   AT TRUE 1x AND CROPPED TO THE WORDMARK, for the reason C2 learned: a judgement about a letter taken
   from a full-page screenshot is a judgement about the downscaling. `deviceScaleFactor: 1`, and at
   1280 x 720 the `zoom: 0.85` has already been applied — this is the size a player sees.

   The 1920 crop is captured too, because the letter is 18 % larger there and the same fill reads
   differently. Nothing here is applied to a source file. */

import { writeFileSync, readFileSync, mkdirSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { launch, setViewport, reduceMotion, seedRandom, suppressInstallPrompt, goto, evaluate, screenshot }
  from "../../../../../scripts/cdp.mjs";
import { fetchStubSource, freezeClockSource } from "../../../../../scripts/survey-stub.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "../../../../..");
const OUT = join(HERE, "owner");
const BASE = (() => {
  const html = readFileSync(join(ROOT, "dist/index.html"), "utf8");
  const m = html.match(/<script[^>]+src="([^"]*)\/assets\//);
  return m && m[1] ? `${m[1]}/` : "/";
})();
const ORIGIN = `http://localhost:5181${BASE}`;

const Q = ".hub-play .as-brandgrid-column .as-bg-quiet";
/* The design's own three states are 3/22 (quiet), 28/66 (mid) and 100/100 (lit). What ships is the
   middle one; a and c are the steps either side of it, and d is what it looked like before. */
const COL = ".hub-play .as-brandgrid-column";
const VARIANTS = {
  /* THE STATE BEFORE THIS COMMIT, restored in full — the overshooting column AND the pale cells, so
     the pair below is a fair before/after and not a comparison of one change against two. Both come
     out of this file, at the same crop, on the same deck, in the same run. */
  "z-before-c5": `${COL}{height:.874em;vertical-align:-.087em;width:.09em}`
    + `${Q}{fill:#ffffff;stroke:#ffffff;fill-opacity:.03;stroke-opacity:.22}`,
  "a-before": `${Q}{fill:#ffffff;stroke:#ffffff;fill-opacity:.03;stroke-opacity:.22}`,
  "b-half": `${Q}{fill-opacity:.16;stroke-opacity:.48}`,
  "c-ships-mid": "",
  "d-stronger": `${Q}{fill-opacity:.42;stroke-opacity:.82}`,
  "e-full": `${Q}{fill-opacity:.60;stroke-opacity:1}`,
};
const SIZES = [[1280, 720], [1920, 1080]];

const seed = `(() => {
  localStorage.setItem("as_options", JSON.stringify({ lang: "de", muted: true, telemetry: false,
    reducedFx: "an", testViewport: null, deckId: "deck_thron1", battlefieldId: "bf_thron1" }));
  localStorage.setItem("as_profile", JSON.stringify({ championWeeks: 1 }));
  localStorage.setItem("as_username", "SURVEY");
  return true;
})()`;

const conn = await launch({ port: 9345 });
mkdirSync(OUT, { recursive: true });
try {
  await conn.send("Page.enable");
  await conn.send("Runtime.enable");
  await reduceMotion(conn);
  await seedRandom(conn);
  await suppressInstallPrompt(conn);
  await conn.send("Page.addScriptToEvaluateOnNewDocument", { source: freezeClockSource() });
  await conn.send("Page.addScriptToEvaluateOnNewDocument", { source: fetchStubSource() });
  for (const [w, h] of SIZES) {
    for (const [key, css] of Object.entries(VARIANTS)) {
      await setViewport(conn, { width: w, height: h, deviceScaleFactor: 1 });
      await goto(conn, ORIGIN, { settleMs: 400 });
      await evaluate(conn, seed);
      await goto(conn, ORIGIN, { settleMs: 1600 });
      if (css) await evaluate(conn, `(() => { const s = document.createElement("style");
        s.textContent = ${JSON.stringify(css)}; document.head.appendChild(s); return true; })()`);
      const clip = await evaluate(conn, `(() => {
        const wm = document.querySelector(".hub-play .as-wordmark");
        if (!wm) return null;
        const r = wm.getBoundingClientRect();
        return { x: Math.round(r.x) - 8, y: Math.round(r.y) - 8,
          width: Math.round(r.width) + 16, height: Math.round(r.height) + 16, scale: 1 };
      })()`);
      if (!clip) throw new Error("no wordmark on the page");
      writeFileSync(join(OUT, `fill-${w}x${h}-${key}.png`), Buffer.from(await screenshot(conn, clip), "base64"));
      process.stdout.write(`  ${w}x${h} ${key} — ${clip.width}x${clip.height} at 1x\n`);
    }
  }
} finally {
  await conn.close();
}
