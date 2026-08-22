#!/usr/bin/env node
/* mobile-tile-design, part 1 — deliverable M: what is a selection tile ACTUALLY wide on a phone?
   =================================================================================================

     node docs/workstreams/mobile-icons/mobile-tile-design/tile-width-probe.mjs
     node docs/workstreams/mobile-icons/mobile-tile-design/tile-width-probe.mjs --only 390x844

   WHY THIS FILE EXISTS. The bloom of every emblem is baked into the delivery files at a radius
   derived from the width the image is RENDERED at — `bloom_css * size / strip_w` in
   scripts/skill-art-build.py. Below 1280 px no emblem is rendered at all today, so that width does
   not exist yet; it has to be measured before any zone can be authored against it. `icons-perks`
   recorded what happens when it is taken from the grid instead of from the element: a radius that is
   authoritative and wrong, off by the 5 px the rarity edge and the border cost. The number that
   matters is the tile's PADDING BOX, because `position: absolute; left: 0; right: 0` resolves
   against exactly that.

   The planning report predicts the widths from the stylesheet — ~305 px (perk) and ~321 px (skill)
   at 390 px, spreading to ~554 / ~570 px at 639 px. This script is what turns those into measurements
   or refutes them. Predictions are carried in the output next to the measured value so the two are
   compared rather than conflated.

   IT ALSO ANSWERS H7 AND D5. H7: whether all three selection screens can be reached at a phone
   viewport at all — the level-up card sits behind a live run and no click path from the hub reaches
   it (scripts/phone-proof.mjs says so for the desktop case). D5: a single corner ornament keeps its
   baked 300 px only while it fits the card head; the report derives a floor of 332 px viewport width,
   and the 320 px row is what checks it.

   HOW IT REACHES THE SCREENS — lifted from
   docs/workstreams/desktop-icons/icons-corners/corner-zone-probe.mjs, which established the route and
   is the reason this took an hour rather than a day. Round 1 of a run is the skill decision and round
   2 the first perk decision (`DECISION_SCHEDULE`, src/game/constants.js), so the run is played: start
   a seeded run, measure the skill tiles, pick a skill, let one deck pass resolve at maximum speed,
   measure the perk tiles. The legendary phase is cycle 29 and is RESUMED into rather than played to,
   from a real run state lifted out of `as_activerun` — see `runLegendary`.

   THE PROFILE IS SEEDED for the same reason it is there: Ice and Plant are progression-tree unlocks,
   and without them the round-1 offer spans at most two factions. This task does not care which
   faction is on screen, but it does care that the tab row and the pager are in their normal state,
   because both sit above the grid and both move the tiles down.

   DETERMINISM as scripts/viewport-proof.mjs establishes it: reduced motion reported by the browser,
   `Math.random` seeded before any application script runs, audio muted, telemetry off. Nothing here
   captures pixels, so the render flags the contact sheet needs are not required — geometry does not
   depend on the compositing path.

   READ-ONLY AGAINST src/. This script changes nothing there, which is the contract's tripwire. */

import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { launch, setViewport, reduceMotion, seedRandom, goto, evaluate, sleep }
  from "../../../../scripts/cdp.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "../../../..");
const OUT = join(HERE, "visual");
const PORT = 5187;                 // pinned by the task contract — NOT 5186, which icon-position-review holds
const ORIGIN = `http://localhost:${PORT}`;
const SEED_INPUT = "11";           // parseSeed("11") === 33 — the seed the sibling icon tasks used

/* The phone band, four points across it. 320 is the narrowest phone the layout is expected to meet
   and the one that tests D5's 332 px floor; 390 is canonical (scripts/phone-proof.mjs checks against
   exactly 390 x 844); 480 is the middle; 639 is the last pixel before `sm:` turns the grid into two
   or three columns and the band ends. */
const ALL_VIEWPORTS = [[320, 844], [390, 844], [480, 844], [639, 844]];
/* `overlay` is the phone's behaviour and the number the design is authored against; `classic` is what
   a desktop browser at a narrow width does, and it is measured too so the 8 px difference is on the
   record instead of being a surprise in part 2. */
const MODES = ["overlay", "classic"];
const only = (() => { const i = process.argv.indexOf("--only"); return i >= 0 ? process.argv[i + 1] : null; })();
const VIEWPORTS = only ? ALL_VIEWPORTS.filter(([w, h]) => `${w}x${h}` === only) : ALL_VIEWPORTS;

/* The report's derivation, carried along so the output compares rather than merely states. Perk:
   viewport - 32 (page padding) - 48 (card p-6) - 5 (rarity edge + border). Skill and legendary:
   viewport - 32 - 32 (card px-4) - 5. */
const PREDICTED = (w) => ({ perk: w - 85, skill: w - 69, legendary: w - 69 });

const BOOT = `try {
  localStorage.setItem("as_options", JSON.stringify({ lang: "de", muted: true, telemetry: false, reducedFx: "an" }));
  localStorage.setItem("as_username", JSON.stringify("Probe"));
  localStorage.setItem("as_tutorial_done", "true");
  localStorage.setItem("as_profile", JSON.stringify({
    schemaVersion: 11, stichPoints: 0, stichSpent: 17,
    nodes: { tier3: 1, tier4: 1, legLayer: 1, iceDeck: 1, plantDeck: 1 },
  }));
} catch {}`;

const LEGENDARY_OFFER = ["SK_LIGHTNING_L01", "SK_FIRE_L01", "SK_ICE_L01", "SK_PLANT_L01"];

/* Read out of the LIVE DOM, never out of the stylesheet. A value copied from src/index.css would only
   prove that the file says what it says; a tile's width is a layout OUTCOME of the viewport, the
   overlay, the card padding and the column count. */
const PROBE = (screen) => `(() => {
  const round = (n) => Math.round(n * 100) / 100;
  const rect = (el) => { if (!el) return null; const r = el.getBoundingClientRect();
    return { x: round(r.x), y: round(r.y), w: round(r.width), h: round(r.height) }; };

  const marker = ${JSON.stringify(screen === "skill" ? '[data-tut="skill-offer"]' : screen === "perk" ? '[data-tut="perk-offer"]' : null)};
  const h2El = document.querySelector(".overlay-card h2");
  const onLegendary = !!(h2El && /Legend/i.test(h2El.textContent || ""));
  if (marker ? !document.querySelector(marker) : !onLegendary) return { reached: false };

  const card = document.querySelector(".overlay-card");
  if (!card) return { reached: false, why: "no overlay-card" };
  const cs = getComputedStyle(card);

  const tiles = [...card.querySelectorAll(".lv-offercard")].map((el) => {
    const s = getComputedStyle(el);
    return {
      ...rect(el),
      /* THE NUMBER THIS SCRIPT EXISTS FOR. clientWidth is the padding box, which is what an
         absolutely positioned \`left: 0; right: 0\` image resolves against — the tile's border box
         minus the 4 px rarity edge and the 1 px border. Reading the border box here instead is the
         exact mistake that cost icons-perks a re-bake. */
      paddingBoxWidth: round(el.clientWidth),
      paddingBoxHeight: round(el.clientHeight),
      borderLeft: s.borderLeftWidth, borderRight: s.borderRightWidth,
      paddingLeft: s.paddingLeft, paddingTop: s.paddingTop,
      /* D4's control side: the type sizes as they stand TODAY. Part 2's variants must not move them,
         and a comparison needs a before. */
      type: (() => {
        const f = (sel) => { const n = el.querySelector(sel); return n ? getComputedStyle(n).fontSize : null; };
        return { name: f(".lv-cardname"), badge: f("span[class*='text-[10px]']") };
      })(),
      hasImg: !!el.querySelector("img"),
    };
  });

  /* The grid above the tiles: how many columns it actually resolves to. The band claim — one tile per
     row below 640 px — is checked here rather than read off the JSX. */
  const grid = card.querySelector('[data-tut="perk-offer"], .sk-offers');
  const gridCS = grid ? getComputedStyle(grid) : null;

  /* The card head, for D5. A single ornament keeps its baked 300 px only while it fits inside the
     head's padding box; the report derives a 332 px viewport floor for that and this is the check. */
  const head = card.querySelector(":scope > .co-head, :scope > .text-center");
  const ornaments = [...card.querySelectorAll(".co-corner")].map((el) => ({
    side: el.classList.contains("co-corner-r") ? "right" : "left", ...rect(el),
  }));

  return {
    reached: true, screen: ${JSON.stringify(screen)},
    viewport: { innerWidth, innerHeight, dpr: devicePixelRatio },
    media: {
      desktop1280: matchMedia("(min-width: 1280px)").matches,
      sm640: matchMedia("(min-width: 640px)").matches,
    },
    card: {
      ...rect(card),
      paddingBoxWidth: round(card.clientWidth),
      paddingLeft: cs.paddingLeft, paddingRight: cs.paddingRight,
      borderLeftWidth: cs.borderLeftWidth, overflowX: cs.overflowX, overflowY: cs.overflowY,
    },
    grid: grid ? { ...rect(grid), templateColumns: gridCS.gridTemplateColumns,
                   columnCount: gridCS.gridTemplateColumns.split(" ").filter(Boolean).length,
                   gap: gridCS.gap } : null,
    head: rect(head),
    /* Room for one ornament at its baked width, measured rather than derived. Negative means the
       300 px copy overhangs the head and D5 does not hold at this width. */
    ornamentRoom: head ? round(card.clientWidth - 300) : null,
    ornaments,
    tileCount: tiles.length, tiles,
  };
})()`;

/* ------------------------------------------------------------------------------------ dev server */

async function serverAlive() {
  try { return (await fetch(ORIGIN, { signal: AbortSignal.timeout(1500) })).ok; } catch { return false; }
}

/* `dev`, not `preview`: this measures LAYOUT, and the dev server serves the same stylesheet and the
   same JSX. A production build would additionally need `--base /autostich/`, which is the trap
   phone-proof.mjs documents at length, and would buy nothing a geometry probe can see. */
async function ensureServer() {
  if (await serverAlive()) return { started: false, stop: async () => {} };
  const viteBin = join(ROOT, "node_modules", "vite", "bin", "vite.js");
  if (!existsSync(viteBin)) throw new Error("vite not found — run `npm ci` in this worktree first.");
  const proc = spawn(process.execPath, [viteBin, "--port", String(PORT), "--strictPort"], {
    cwd: ROOT, stdio: "ignore",
  });
  for (let i = 0; i < 120; i++) {
    if (await serverAlive()) return { started: true, stop: async () => { proc.kill(); await sleep(300); } };
    await sleep(250);
  }
  proc.kill();
  throw new Error(`vite did not come up on ${PORT}`);
}

/* ------------------------------------------------------------------------------------- the run */

async function bootRun(c, w, h, hideScrollbars) {
  await c.send("Page.enable");
  await c.send("Runtime.enable");
  await setViewport(c, { width: w, height: h, deviceScaleFactor: 1 });
  /* THE SCROLLBAR IS PART OF THE MEASUREMENT, and this is the one control that decides whether the
     number is about a phone or about this machine.

     `.overlay-card` is `overflow-y: auto`. On a desktop Chrome a classic scrollbar takes 8 px of
     LAYOUT width, and `clientWidth` — the padding box an emblem's `left: 0; right: 0` resolves
     against — shrinks by exactly that. iOS and Android use OVERLAY scrollbars, which take none. The
     first run of this probe measured with classic scrollbars and produced a width that is 8 px too
     small for the device the design is for, and — worse — a width that CHANGES with the content,
     because the card only scrolls when the offers are tall enough. Measured, 2026-08-23: the
     legendary screen (one tile, no scroll) came out 8 px wider than the skill screen at every width.

     `Emulation.setScrollbarsHidden` removes them from layout, which is what an overlay scrollbar
     does. Both modes are run, so the difference is recorded rather than chosen silently.

     `scripts/cdp.mjs` is NOT extended for this: it is shared, and `icon-position-review` already has
     a change in flight there. The call is sent directly instead. */
  if (hideScrollbars) {
    try { await c.send("Emulation.setScrollbarsHidden", { hidden: true }); }
    catch { /* recorded by the caller as unsupported rather than silently ignored */ }
  }
  await reduceMotion(c);
  await seedRandom(c);
  await c.send("Page.addScriptToEvaluateOnNewDocument", { source: BOOT });
  await goto(c, `${ORIGIN}/`, { settleMs: 2500 });

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
}

async function runLegendary(c, w, h) {
  const raw = await evaluate(c, `localStorage.getItem("as_activerun")`);
  if (!raw) return { reached: false, why: "no active run to lift" };
  const b = JSON.parse(raw);
  b.state.phase = "legendary";
  b.state.skillOffer = null;
  b.state.offer = null;
  b.state.legendaryOffer = LEGENDARY_OFFER;
  b.state.cycle = 28;
  /* Before the app boots, never while it runs: the application writes its live state back over the
     edit within a tick. Measured the hard way by icons-corners. */
  await c.send("Page.addScriptToEvaluateOnNewDocument", {
    source: `${BOOT}\ntry { localStorage.setItem("as_activerun", ${JSON.stringify(JSON.stringify(b))}); } catch {}`,
  });
  await goto(c, `${ORIGIN}/`, { settleMs: 2500 });
  /* The application does NOT auto-resume: it comes up on the hub with a „Lauf fortsetzen" button and
     the run's round counter beside it. Measured here on 2026-08-23 — the first version of this file
     omitted the click and reported `reached: false` at all four widths, which read like a phone
     limitation and was nothing of the kind. */
  const resumed = await evaluate(c, `(() => {
    const b = [...document.querySelectorAll("button")].find((e) => /fortsetz/i.test(e.textContent || ""));
    if (!b) return "no resume button"; b.click(); return "ok"; })()`);
  if (resumed !== "ok") return { reached: false, why: resumed };
  await sleep(2500);
  return await evaluate(c, PROBE("legendary"));
}

async function runOne(w, h, port, hideScrollbars) {
  const c = await launch({ port });
  try {
    await bootRun(c, w, h, hideScrollbars);

    const skill = await evaluate(c, PROBE("skill"));
    if (!skill.reached) throw new Error(`round 1 was not the skill offer at ${w}x${h}`);

    const picked = await evaluate(c, `(() => {
      const b = document.querySelector(".lv-offercard");
      if (!b) return "no skill card";
      b.click(); return "ok";
    })()`);
    if (picked !== "ok") throw new Error(`could not pick a skill: ${picked}`);
    await sleep(1200);
    await evaluate(c, `(() => { const b = [...document.querySelectorAll("button")]
      .find((e) => (e.textContent || "").trim() === "MAX"); if (b) b.click(); return !!b; })()`);

    let perk = null;
    for (let i = 0; i < 60; i++) {
      await sleep(1000);
      perk = await evaluate(c, PROBE("perk"));
      if (perk.reached) break;
    }
    if (!perk || !perk.reached) perk = { reached: false, why: "perk offer never opened" };

    const legendary = await runLegendary(c, w, h);
    return { skill, perk, legendary };
  } finally {
    await c.close();
  }
}

/* ------------------------------------------------------------------------------------- output */

const main = async () => {
  mkdirSync(OUT, { recursive: true });
  const server = await ensureServer();
  const results = [];
  try {
    /* One debugging port per viewport, plus one retry — the fix `icons-perks` and `icons-corners`
       both needed. Reusing a port across sequential browsers loses a run every so often on Windows:
       the previous browser has exited but the port and its profile directory are not released yet.
       A measurement tool that is flaky is not evidence. */
    let port = 9341;
    for (const [w, h] of VIEWPORTS) {
      process.stdout.write(`measuring ${w}x${h} … `);
      for (const mode of MODES) {
        let r = null, lastErr = null;
        for (let attempt = 0; attempt < 2 && !r; attempt++) {
          try { r = await runOne(w, h, port++, mode === "overlay"); }
          catch (e) { lastErr = e; if (attempt) throw e; process.stdout.write("retry … "); }
        }
        if (!r) throw lastErr;
        results.push({ viewport: { w, h }, scrollbars: mode, predicted: PREDICTED(w), ...r });
        const line = ["skill", "perk", "legendary"]
          .map((k) => `${k}=${r[k] && r[k].reached ? (r[k].tiles[0] || {}).paddingBoxWidth : "unreached"}`)
          .join(" ");
        process.stdout.write(`${mode}: ${line}${mode === MODES[MODES.length - 1] ? "\n" : "  ·  "}`);
      }
    }
  } finally {
    await server.stop();
  }

  const file = join(OUT, "M-tile-widths.json");
  writeFileSync(file, JSON.stringify({
    note: "Deliverable M. Measured in the running application; `predicted` is the planning report's "
        + "derivation from the stylesheet, carried along so the two are compared and not conflated.",
    seed: SEED_INPUT, port: PORT, results,
  }, null, 2));
  console.log(`\nwrote ${file}`);
};

main().catch((e) => { console.error(e); process.exit(1); });
