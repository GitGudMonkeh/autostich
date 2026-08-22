#!/usr/bin/env node
/* icons-perks — drive the application to the perk-selection screen, MEASURE the offer tile, capture it.
   =================================================================================================

     node docs/workstreams/desktop-icons/icons-perks/perk-zone-probe.mjs --label V1
     node docs/workstreams/desktop-icons/icons-perks/perk-zone-probe.mjs --label V2

   Why this file exists at all
   ---------------------------
   `scripts/skill-art-build.py` refuses to bake the `perkcats` and `legendaries` lots because their
   render zone has no settled width, and the bloom radius is a CSS length that only becomes a pixel
   radius once you divide by that width (`BLOOM_CSS * SIZE / STRIP_W`). The task contract makes the
   failure mode explicit: a plausible-looking constant borrowed from the skill card produces a bloom
   that is authoritative and wrong. So the number is read out of the running application, and this
   script is what reads it — committed so the reader can re-run it instead of trusting a quoted figure.

   It is also the V1/V2 capture. Same script, same seed, same viewports, same application state for
   both halves — which is what §8 of docs/engineering/task-lifecycle.md requires of a V2 that is going
   to be compared against a V1.

   How it reaches the screen
   -------------------------
   The perk offer is not reachable by a URL. Round 1 of a run is a SKILL decision and round 2 is the
   first PERK decision (`DECISION_SCHEDULE` in src/game/constants.js), so the run has to be played:
   start, pick a skill, let one deck pass resolve at maximum speed, and the perk offer opens.

   The run seed is typed into the hub's seed field rather than left to chance. `11` parses to the
   32-bit seed 33 (`parseSeed`, Crockford base32), and seed 33's first perk offer is

       L_VAB (legendary) - B_OPENING:2 - C_GUARD:1

   — one legendary and two regular perks in ONE offer, which is the only configuration that lets a
   single capture show both icon populations side by side under identical tile geometry. That is the
   acceptance gate of this task, so the seed is chosen for it rather than accepted as it came.

   A SEED ALONE IS NOT ENOUGH for that offer, and the reason is worth stating because the first
   version of this script got it wrong. Legendary perks are a progression-tree layer: on a fresh
   profile `nodeEffects` returns `legendaryLayer: false` and `maxTier: 2`, so the legendary pool is
   switched off entirely and only tiers I and II are offered — seed 33 then yields three ordinary
   tier-I family perks and no legendary at all. The three tree nodes `tier3` / `tier4` / `legLayer`
   (9 SP, the ordinary purchase path) are therefore seeded into `as_profile` below. That is a state a
   real player reaches, written through the profile's own migrate-and-merge path; it is not a
   preview-only switch and it changes nothing in `src/`.

   Determinism is controlled the same way `scripts/viewport-proof.mjs` controls it: reduced motion
   reported by the browser, `Math.random` replaced by a seeded PRNG before any application script
   runs, muted audio, telemetry off. The game core is seeded separately and independently — it derives
   every draw from the run seed, not from `Math.random`.

   1280x720 is captured too, and it is not decoration: the desktop gate must keep the images off the
   narrow viewport entirely, and the only honest way to show that is a capture where the <img> is
   absent from the DOM rather than merely invisible. */

import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { launch, setViewport, reduceMotion, seedRandom, goto, evaluate, screenshot, sleep }
  from "../../../../scripts/cdp.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, "visual");
const PORT = 5184;                 // pinned by the task contract
const ORIGIN = `http://localhost:${PORT}`;
const SEED_INPUT = "11";           // parseSeed("11") === 33 — see the header
const VIEWPORTS = [[1280, 720], [1600, 900], [1920, 1080], [2560, 1440]];

const label = (() => {
  const i = process.argv.indexOf("--label");
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : "V";
})();

/* Read out of the LIVE DOM, never out of the stylesheet. A value copied from `src/index.css` would
   only prove that the file says what it says; the zone width is a layout OUTCOME (grid column of a
   card whose width comes from the overlay, the wings and the viewport), so the DOM is the only place
   it actually exists. */
const PROBE = `(() => {
  const round = (n) => Math.round(n * 100) / 100;
  const g = document.querySelector('[data-tut="perk-offer"]');
  if (!g) return { reached: false };
  const gs = getComputedStyle(g);
  const cards = [...g.querySelectorAll(".lv-offercard")].map((b) => {
    const r = b.getBoundingClientRect();
    const img = b.querySelector("img");
    const name = b.querySelector(".lv-cardname");
    let strip = null;
    if (img) {
      const ir = img.getBoundingClientRect();
      const cs = getComputedStyle(img);
      strip = {
        w: round(ir.width), h: round(ir.height),
        objectFit: cs.objectFit, objectPosition: cs.objectPosition,
        blend: cs.mixBlendMode, mask: cs.maskImage || cs.webkitMaskImage,
        filter: cs.filter,
        src: (img.getAttribute("src") || "").split("/").pop(),
        alt: img.getAttribute("alt"), ariaHidden: img.getAttribute("aria-hidden"),
      };
    }
    /* The box properties are read for the NEXT task, not for this one: \`icons-corners\` places
       ornaments on this tile and needs its final geometry — radius, border widths, padding — rather
       than a description of it. Cheap to collect here, and collected from the live DOM for the same
       reason the zone width is. */
    const bs = getComputedStyle(b);
    return {
      legendary: b.className.includes("as-legendary"),
      w: round(r.width), h: round(r.height),
      paddingTop: bs.paddingTop,
      box: {
        padding: bs.padding, borderRadius: bs.borderRadius,
        borderTopWidth: bs.borderTopWidth, borderLeftWidth: bs.borderLeftWidth,
        borderRightWidth: bs.borderRightWidth, borderBottomWidth: bs.borderBottomWidth,
        borderLeftColor: bs.borderLeftColor, overflow: bs.overflow, position: bs.position,
      },
      badge: (b.querySelector("span") || {}).textContent || "",
      name: name ? name.textContent : "",
      hasImg: !!img, strip,
    };
  });
  const card = document.querySelector(".overlay-card");
  return {
    reached: true,
    viewport: { innerWidth: innerWidth, innerHeight: innerHeight, dpr: devicePixelRatio },
    wide: matchMedia("(min-width: 1400px)").matches,
    gridTemplateColumns: gs.gridTemplateColumns, gap: gs.gap,
    gridWidth: round(g.getBoundingClientRect().width),
    overlayCardWidth: card ? round(card.getBoundingClientRect().width) : null,
    overlayCardRect: card ? (() => { const r = card.getBoundingClientRect();
      return { x: round(r.x), y: round(r.y), w: round(r.width), h: round(r.height) }; })() : null,
    cards,
  };
})()`;

async function runOne(w, h, port) {
  const c = await launch({ port });
  try {
    await c.send("Page.enable");
    await c.send("Runtime.enable");
    await setViewport(c, { width: w, height: h, deviceScaleFactor: 1 });
    await reduceMotion(c);
    await seedRandom(c);
    await c.send("Page.addScriptToEvaluateOnNewDocument", {
      source: `try {
        localStorage.setItem("as_options", JSON.stringify({ lang: "de", muted: true, telemetry: false, reducedFx: "an" }));
        localStorage.setItem("as_username", JSON.stringify("Probe"));
        localStorage.setItem("as_tutorial_done", "true");
        // Only the three nodes that open the legendary perk layer. Every other profile field is
        // filled by loadProfile's merge over DEFAULT_PROFILE, so this stays a minimal statement of
        // intent rather than a hand-written profile that could drift from the schema.
        localStorage.setItem("as_profile", JSON.stringify({
          schemaVersion: 11, stichPoints: 0, stichSpent: 9,
          nodes: { tier3: 1, tier4: 1, legLayer: 1 },
        }));
      } catch {}`,
    });
    await goto(c, `${ORIGIN}/`, { settleMs: 2500 });

    // Hub: type the run seed, submit it. React state, so the value has to go in through an input event.
    const started = await evaluate(c, `(() => {
      const inp = document.querySelector("input.as-hub-field");
      if (!inp) return "no seed field";
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
      setter.call(inp, ${JSON.stringify(SEED_INPUT)});
      inp.dispatchEvent(new Event("input", { bubbles: true }));
      const btn = document.querySelector("button.as-seed-play");
      if (!btn) return "no play button";
      btn.click();
      return "ok";
    })()`);
    if (started !== "ok") throw new Error(`could not start a seeded run: ${started}`);
    await sleep(2200);

    // Round 1 is the skill decision. Take the first card; which one is irrelevant to tile geometry,
    // and it is the same choice at every viewport, which is what keeps the captures comparable.
    const picked = await evaluate(c, `(() => {
      const b = document.querySelector(".lv-offercard");
      if (!b) return "no skill card";
      b.click(); return "ok";
    })()`);
    if (picked !== "ok") throw new Error(`round 1 was not the skill offer: ${picked}`);
    await sleep(1200);
    await evaluate(c, `(() => { const b = [...document.querySelectorAll("button")]
      .find((e) => (e.textContent || "").trim() === "MAX"); if (b) b.click(); return !!b; })()`);

    // One deck pass at maximum speed, then round 2 opens the perk offer. Polled, never timed.
    let data = null;
    for (let i = 0; i < 60; i++) {
      await sleep(1000);
      data = await evaluate(c, PROBE);
      if (data.reached) break;
    }
    if (!data || !data.reached) throw new Error("perk offer never opened");

    await sleep(600); // let the images decode before the shot
    data = await evaluate(c, PROBE);
    const full = await screenshot(c);
    writeFileSync(join(OUT, `${label}-perk-${w}x${h}.png`), Buffer.from(full, "base64"));
    if (data.overlayCardRect) {
      const r = data.overlayCardRect;
      const clip = { x: Math.max(0, r.x), y: Math.max(0, r.y),
                     width: Math.min(r.w, w - Math.max(0, r.x)), height: Math.min(r.h, h - Math.max(0, r.y)) };
      const card = await screenshot(c, clip);
      writeFileSync(join(OUT, `${label}-perk-card-${w}x${h}.png`), Buffer.from(card, "base64"));
    }
    return data;
  } finally {
    await c.close();
  }
}

mkdirSync(OUT, { recursive: true });
const results = {};
/* One debugging port per viewport, and a retry on top. Reusing a single port across four sequential
   browsers loses a run every so often on Windows: the previous browser has exited but the port and
   its profile directory are not released yet, so `launch` polls for a target that never appears and
   then fails on the profile cleanup. It cost the 2560x1440 half of a V2 set once, which is the sort
   of gap that quietly turns into "we did not capture that size". A capture tool that is flaky is not
   evidence, so this is fixed rather than re-run until it passes. */
for (const [i, [w, h]] of VIEWPORTS.entries()) {
  process.stdout.write(`${w}x${h} … `);
  let last = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const d = await runOne(w, h, 9351 + i * 2 + attempt);
      results[`${w}x${h}`] = d;
      const widths = [...new Set(d.cards.map((c) => c.w))];
      console.log(`tile ${widths.join(" / ")} px · wide=${d.wide} · `
        + `art on ${d.cards.filter((c) => c.hasImg).length}/${d.cards.length}`
        + (attempt ? ` (attempt ${attempt + 1})` : ""));
      last = null;
      break;
    } catch (e) {
      last = e;
      await sleep(1500);
    }
  }
  if (last) {
    results[`${w}x${h}`] = { error: String(last.message || last) };
    console.log(`FAILED: ${last.message || last}`);
  }
}
writeFileSync(join(OUT, `${label}-measurements.json`),
  JSON.stringify({ label, origin: ORIGIN, seedInput: SEED_INPUT, dpr: 1, results }, null, 2) + "\n");
console.log(`\nwritten to ${join(OUT, `${label}-measurements.json`)}`);
