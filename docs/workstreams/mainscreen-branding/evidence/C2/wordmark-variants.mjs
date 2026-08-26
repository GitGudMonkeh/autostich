#!/usr/bin/env node
/* #mainscreen-branding C2 — the letter, at the size a player actually sees it.
   ============================================================================

     npm run build
     node docs/workstreams/mainscreen-branding/evidence/C2/wordmark-variants.mjs

   WHY THIS FILE EXISTS AND `lockup.mjs` WAS NOT ENOUGH. The design's central claim is that the I
   reads as a letter made of eight cells. That is a visual judgement, and a visual judgement taken
   from a full-page screenshot is taken at whatever scale the viewer happens to be at — which is not
   a judgement about the letter, it is a judgement about the downscaling. So this crops to the
   wordmark and captures at **deviceScaleFactor 1**, which is the size a player at 1280x720 sees
   after the `zoom: 0.85` has already been applied. Nothing here is enlarged.

   THE NUMBERS THE PICTURES ARE ABOUT, measured rather than eyeballed, at 1280x720:

     cell     .09em  of 88 px = 7.92 px, and 6.73 device px after the zoom
     border   .012em          = 1.06 px, and 0.90 device px  <- the reason the cells read as rings
     gutter   .022em          = 1.94 px, and 1.65 device px
     column                     6.73 x 65.4 device px, against solid letter stems of about 6-7

   So the footprint is right and the WEIGHT is the question: an unlit cell is a sub-pixel ring at
   22 % white, which composites to roughly 76/255 over a ground of about 26/255 — visible, and much
   quieter than the solid stems beside it.

   FOUR ALTERNATIVES ARE BUILT, NOT DESCRIBED, so the decision costs the owner one look and not a
   round trip. None of them is applied to any source file; each is a stylesheet injected into the
   page and thrown away with the tab. **An agent does not report a visual result as approved** — the
   shipped state is the design as written, and these sit beside it. */

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

/* The unlit cells of the COLUMN only. The standalone sign is not in question — it stands on the
   screen ground the design's table was calibrated against. */
const Q = ".as-brandgrid-column .as-bg-quiet";
const VARIANTS = {
  /* What ships. The design's table, verbatim. */
  "as-designed": "",
  /* One step up the design's OWN three-state table: the unlit cells take the mid tone. The design
     says the states are ground-dependent; inside the wordmark the ground is a row of solid letters,
     so the step goes up rather than down. Introduces no value. */
  "b-column-mid": `${Q}{fill:currentColor;stroke:currentColor;fill-opacity:.28;stroke-opacity:.66}`,
  /* The cells stay neutral and only the edge gains weight. Keeps the "quiet cells are structure,
     lit cells are deck" reading, which b gives up. Introduces one value. */
  "c-edge-55": `${Q}{stroke-opacity:.55}`,
  /* A filled cell rather than a ring: the column then reads as a bar with texture instead of as a
     row of outlines. Introduces two values. */
  "d-filled-14": `${Q}{fill-opacity:.14;stroke-opacity:.40}`,
  /* The ring, drawn thicker — the sub-pixel border is the mechanism, so this addresses it directly
     and changes nothing else. `stroke-width` is in viewBox units: 24 of 1000 = .024em, twice the
     design's .012em. */
  "e-thicker": ".as-brandgrid-column .as-bg-cell{stroke-width:24}",
};

const seed = `(() => {
  localStorage.setItem("as_options", JSON.stringify({ lang: "de", muted: true, telemetry: false,
    reducedFx: "an", testViewport: null, deckId: "deck_thron1", battlefieldId: "bf_thron1" }));
  localStorage.setItem("as_profile", JSON.stringify({ championWeeks: 1 }));
  localStorage.setItem("as_username", "SURVEY");
  return true;
})()`;

const conn = await launch({ port: 9340 });
mkdirSync(OUT, { recursive: true });
try {
  await conn.send("Page.enable");
  await conn.send("Runtime.enable");
  await reduceMotion(conn);
  await seedRandom(conn);
  await suppressInstallPrompt(conn);
  await conn.send("Page.addScriptToEvaluateOnNewDocument", { source: freezeClockSource() });
  await conn.send("Page.addScriptToEvaluateOnNewDocument", { source: fetchStubSource() });
  for (const [key, css] of Object.entries(VARIANTS)) {
    await setViewport(conn, { width: 1280, height: 720, deviceScaleFactor: 1 });
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
    if (!clip) throw new Error("no wordmark on the page — the crop has nothing to take");
    writeFileSync(join(OUT, `wordmark-1x-de-${key}.png`), Buffer.from(await screenshot(conn, clip), "base64"));
    process.stdout.write(`  ${key} — ${clip.width}x${clip.height} at 1x\n`);
  }
} finally {
  await conn.close();
}
