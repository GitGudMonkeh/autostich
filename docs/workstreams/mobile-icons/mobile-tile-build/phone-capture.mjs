#!/usr/bin/env node
/* mobile-tile-build, part 2 — the V1/V2 phone capture.
   =================================================================================================

     node docs/workstreams/mobile-icons/mobile-tile-build/phone-capture.mjs --label V1   # BEFORE
     node docs/workstreams/mobile-icons/mobile-tile-build/phone-capture.mjs --label V2   # AFTER

   ONE SCRIPT FOR BOTH HALVES, which is the point: same seed, same viewport, same application state,
   same route. A V2 captured by a different path than its V1 cannot be compared to it, and
   reconstructing a baseline afterwards is exactly when the wrong state gets captured
   (`task-lifecycle.md` — *Visual review*, V1).

   THE CAPTURE SET IS D3's, settled at the owner's start stop and not re-asked: 390 x 844, German and
   English, all three selection screens, DPR 1.

   IT ALSO CARRIES THE GEOMETRY, not only pixels. Every capture writes the same probe deliverable M
   used, so „nothing changed size" is a diff of numbers rather than a squint at two PNGs — the check
   that caught a 297 px regression in part 1 while the picture still looked plausible.

   SCROLLBARS ARE HIDDEN. `.overlay-card` scrolls, and a classic desktop scrollbar takes 16 px of
   layout width that a phone's overlay scrollbar does not (measured in part 1). Both halves are
   captured the same way, so the comparison is honest either way — but the phone case is the one the
   design is authored against.

   ROUTE, inherited from part 1's tile-width-probe.mjs, which inherited it from
   docs/workstreams/desktop-icons/icons-corners/corner-zone-probe.mjs: round 1 of a run is the skill
   decision and round 2 the first perk decision, so the run is played; the legendary phase is cycle 29
   and is resumed into from a real run state. The application does NOT auto-resume — it offers a
   „Lauf fortsetzen" button on the hub, and forgetting that click is what made part 1's first run
   report the legendary screen as unreachable.

   READ-ONLY AGAINST src/ — this script changes nothing there. */

import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { launch, setViewport, reduceMotion, seedRandom, goto, evaluate, screenshot, sleep }
  from "../../../../scripts/cdp.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "../../../..");
const OUT = join(HERE, "visual");
const PORT = 5188;                 // pinned by part 2's contract — 5186 and 5187 are held by the two sibling tasks
const ORIGIN = `http://localhost:${PORT}`;
const SEED_INPUT = "11";           // parseSeed("11") === 33 — the seed the sibling icon tasks used

/* D3's capture set. 390 x 844 is canonical — scripts/phone-proof.mjs checks against exactly that.
   The extra widths part 1 measured are not captured here: this is a before/after of a design, not a
   second measurement, and every additional size is a second image to compare for no new question.
   320 px is the one exception and it is opt-in (`--wide`), because D5's ornament floor sits at
   334 px and that is the only claim a narrower capture can settle. */
const ALL_VIEWPORTS = [[390, 844]];
const EXTRA_VIEWPORTS = [[320, 844]];
const LANGS = ["de", "en"];
const label = (() => { const i = process.argv.indexOf("--label"); return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : "V"; })();
const only = (() => { const i = process.argv.indexOf("--only"); return i >= 0 ? process.argv[i + 1] : null; })();
const VIEWPORTS = (() => {
  const all = process.argv.includes("--wide") ? [...ALL_VIEWPORTS, ...EXTRA_VIEWPORTS] : ALL_VIEWPORTS;
  return only ? all.filter(([w, h]) => `${w}x${h}` === only) : all;
})();

const BOOT = (lang) => `try {
  localStorage.setItem("as_options", JSON.stringify({ lang: ${JSON.stringify(lang)}, muted: true, telemetry: false, reducedFx: "an" }));
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

async function bootRun(c, w, h, lang) {
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
  try { await c.send("Emulation.setScrollbarsHidden", { hidden: true }); }
  catch { /* older Chrome: the capture is then 16 px narrower and BOTH halves are, so still comparable */ }
  await reduceMotion(c);
  await seedRandom(c);
  await c.send("Page.addScriptToEvaluateOnNewDocument", { source: BOOT(lang) });
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

async function runLegendary(c, lang) {
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
  /* By CLASS, not by label. `.as-cta-primary` is the resume button (StartScreen.jsx:455) and it is the
     only filled primary action the hub shows when a saved run exists. A text match on „fortsetzen"
     would work in German and silently fail in English — the same trap `perkArt.js` calls out for
     emblems bound to translated names. */
  const resumed = await evaluate(c, `(() => {
    const b = document.querySelector("button.as-cta-primary");
    if (!b) return "no resume button"; b.click(); return "ok"; })()`);
  if (resumed !== "ok") return { reached: false, why: resumed };
  await sleep(2500);
  return await evaluate(c, PROBE("legendary"));
}

async function shoot(c, name) {
  const data = await screenshot(c);
  writeFileSync(join(OUT, `${label}-${name}.png`), Buffer.from(data, "base64"));
  return `${label}-${name}.png`;
}

async function runOne(w, h, port, lang) {
  const c = await launch({ port });
  try {
    await bootRun(c, w, h, lang);

    const skill = await evaluate(c, PROBE("skill"));
    if (!skill.reached) throw new Error(`round 1 was not the skill offer at ${w}x${h}`);
    await sleep(600);                       // let the emblems decode before the shot
    skill.image = await shoot(c, `skill-${lang}-${w}x${h}`);

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
    else { await sleep(600); perk.image = await shoot(c, `perk-${lang}-${w}x${h}`); }

    const legendary = await runLegendary(c, lang);
    if (legendary.reached) { await sleep(600); legendary.image = await shoot(c, `legendary-${lang}-${w}x${h}`); }
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
    /* One debugging port per run, plus one retry — the fix `icons-perks` and `icons-corners` both
       needed. Reusing a port across sequential browsers loses a run every so often on Windows: the
       previous browser has exited but the port and its profile directory are not released yet. A
       capture tool that is flaky is not evidence. */
    let port = 9381;
    for (const [w, h] of VIEWPORTS) {
      for (const lang of LANGS) {
        process.stdout.write(`${label} ${w}x${h} ${lang} … `);
        let r = null, lastErr = null;
        for (let attempt = 0; attempt < 2 && !r; attempt++) {
          try { r = await runOne(w, h, port++, lang); }
          catch (e) { lastErr = e; if (attempt) throw e; process.stdout.write("retry … "); }
        }
        if (!r) throw lastErr;
        results.push({ viewport: { w, h }, lang, ...r });
        process.stdout.write(["skill", "perk", "legendary"]
          .map((k) => `${k}=${r[k] && r[k].reached ? (r[k].tiles[0] || {}).paddingBoxWidth : "UNREACHED"}`)
          .join(" ") + "\n");
      }
    }
  } finally {
    await server.stop();
  }

  const file = join(OUT, `${label}-phone-capture.json`);
  writeFileSync(file, JSON.stringify({
    note: `${label} of the mobile-tile-build visual gate. Same script, seed, viewport and route for `
        + "both halves. Scrollbars are hidden, so the widths are the phone case. Images beside this file.",
    label, seed: SEED_INPUT, port: PORT, dpr: 1, results,
  }, null, 2));
  console.log(`
wrote ${file}`);
  console.log(`images: ${results.flatMap((r) => ["skill", "perk", "legendary"]
    .map((k) => r[k] && r[k].image).filter(Boolean)).length}`);
};

main().catch((e) => { console.error(e); process.exit(1); });
