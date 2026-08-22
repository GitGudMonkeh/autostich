#!/usr/bin/env node
/* icons-corners — drive the application to BOTH selection screens, MEASURE the card head, capture it.
   =================================================================================================

     node docs/workstreams/desktop-icons/icons-corners/corner-zone-probe.mjs --label V1
     node docs/workstreams/desktop-icons/icons-corners/corner-zone-probe.mjs --label V2

   Why this file exists at all
   ---------------------------
   `scripts/skill-art-build.py` registers the `corners` lot with `strip_w=None` and refuses to bake
   it. The bloom radius is a CSS length that only becomes a pixel radius once divided by the width the
   image is RENDERED at (`bloom_css * size / strip_w`), so an unmeasured zone means no radius exists.
   The task contract's tripwire is explicit: a plausible constant borrowed from the skill or perk lot
   produces a bloom that is authoritative and wrong. This script reads the number out of the running
   application, and is committed so a reader can re-run it instead of trusting a quoted figure.

   Two screens, not one. The ornaments live in the card HEAD of the skill selection and of the perk
   selection, and those are two different cards in two different layouts — so the zone is measured on
   both, and contract question Q1 ("one strip_w or two?") is answered from that pair rather than
   assumed either way.

   It is also the V1/V2 capture: same script, same seed, same viewports, same application state for
   both halves, which is what §8 of docs/engineering/task-lifecycle.md requires of a V2 that will be
   compared against a V1.

   How it reaches the screens
   --------------------------
   Neither offer is reachable by a URL. Round 1 of a run is the SKILL decision and round 2 the first
   PERK decision (`DECISION_SCHEDULE` in src/game/constants.js), so the run is played: start a seeded
   run, measure and capture the skill head with each faction tab active in turn, then pick a skill,
   let one deck pass resolve at maximum speed, and the perk offer opens.

   THE PROFILE IS SEEDED, and unlike `icons-perks` it needs more than the legendary layer. Ice and
   Plant are progression-tree unlocks (`iceDeck`, `plantDeck`, 4 SP each, `ARCHETYPES_BASE` is
   Lightning + Fire only), so on a fresh profile the round-1 offer can never span more than two
   factions — measured, not assumed: the same seeds yield `Blitz/Feuer` without those nodes and
   `Blitz/Feuer/Eis/Pflanze` with them. Since the ornament CHANGES WITH THE TAB, a two-tab screen
   cannot show the binding this task exists to build. The five nodes below are the ordinary purchase
   path (17 SP total), written through the profile's own migrate-and-merge over DEFAULT_PROFILE; it is
   a state a real player reaches and it changes nothing in `src/`.

   Seed `11` parses to the 32-bit seed 33 (`parseSeed`, Crockford base32) — deliberately the same seed
   `icons-perks` used, so its round-2 offer is the same known one legendary + two regular perks and
   the two tasks' captures stay comparable.

   Determinism is controlled as `scripts/viewport-proof.mjs` controls it: reduced motion reported by
   the browser, `Math.random` replaced by a seeded PRNG before any application script runs, muted
   audio, telemetry off. The game core is seeded separately — it derives every draw from the run seed.

   1280x720 is captured too, and it is not decoration: the desktop gate must keep the ornaments off
   the narrow viewport entirely, and the only honest way to show that is a capture where the <img> is
   absent from the DOM rather than merely invisible. */

import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { launch, setViewport, reduceMotion, seedRandom, goto, evaluate, screenshot, sleep }
  from "../../../../scripts/cdp.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, "visual");
const PORT = 5185;                 // pinned by the task contract
const ORIGIN = `http://localhost:${PORT}`;
const SEED_INPUT = "11";           // parseSeed("11") === 33 — see the header
const ALL_VIEWPORTS = [[1280, 720], [1600, 900], [1920, 1080], [2560, 1440]];
/* `--only 1920x1080` runs a single size. Iteration convenience only — a V1/V2 pair is the full
   set, and the label in the output file says which one was written, so a partial run cannot be
   mistaken for a complete capture. */
const only = (() => { const i = process.argv.indexOf("--only"); return i >= 0 ? process.argv[i + 1] : null; })();
const VIEWPORTS = only ? ALL_VIEWPORTS.filter(([w, h]) => `${w}x${h}` === only) : ALL_VIEWPORTS;

/* Everything the application must believe before its first script runs. Hoisted to a constant
   because the legendary leg has to inject it a SECOND time, with a run state on top.

   The legendary perk layer (tier3/tier4/legLayer, 9 SP) AND the two archetype unlocks
   (iceDeck/plantDeck, 4 SP each) — 17 SP on the ordinary purchase path. Without the last two the
   round-1 skill offer never spans more than Lightning + Fire and the tab binding cannot be shown
   at all. Every other profile field comes from loadProfile's merge over DEFAULT_PROFILE. */
const BOOT = `try {
  localStorage.setItem("as_options", JSON.stringify({ lang: "de", muted: true, telemetry: false, reducedFx: "an" }));
  localStorage.setItem("as_username", JSON.stringify("Probe"));
  localStorage.setItem("as_tutorial_done", "true");
  localStorage.setItem("as_profile", JSON.stringify({
    schemaVersion: 11, stichPoints: 0, stichSpent: 17,
    nodes: { tier3: 1, tier4: 1, legLayer: 1, iceDeck: 1, plantDeck: 1 },
  }));
} catch {}`;

/* One legendary candidate per faction, so the legendary head shows the same four-tab row the other
   screens do. Real IDs out of SKILL_DEFS (`legendary: true`); the phase offers per-archetype
   candidates, so this is the shape a player meets rather than an invented one. */
const LEGENDARY_OFFER = ["SK_LIGHTNING_L01", "SK_FIRE_L01", "SK_ICE_L01", "SK_PLANT_L01"];

const label = (() => {
  const i = process.argv.indexOf("--label");
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : "V";
})();

/* Read out of the LIVE DOM, never out of the stylesheet. A value copied from `src/index.css` would
   only prove that the file says what it says; the head zone is a layout OUTCOME — the card's width
   comes from the overlay, the wings and the viewport — so the DOM is the only place it exists.

   `screen` is "skill" or "perk"; the two heads are the same SHAPE (`.overlay-card > .text-center`
   above a sticky bar) but not the same numbers, which is the whole of question Q1. */
const PROBE = (screen) => `(() => {
  const round = (n) => Math.round(n * 100) / 100;
  const rect = (el) => { if (!el) return null; const r = el.getBoundingClientRect();
    return { x: round(r.x), y: round(r.y), w: round(r.width), h: round(r.height) }; };
  /* The legendary head carries no tutorial marker of its own, so it is recognised by its own gold
     title instead — the leg.title string renders as "★ Legendärer Skill". */
  const marker = ${JSON.stringify(screen === "skill" ? '[data-tut="skill-offer"]' : screen === "perk" ? '[data-tut="perk-offer"]' : null)};
  const h2El = document.querySelector(".overlay-card h2");
  const onLegendary = !!(h2El && /Legend/i.test(h2El.textContent || ""));
  if (marker ? !document.querySelector(marker) : !onLegendary) return { reached: false };

  const card = document.querySelector(".overlay-card");
  if (!card) return { reached: false, why: "no overlay-card" };
  const cs = getComputedStyle(card);
  const head = card.querySelector(":scope > .text-center");
  const sticky = card.querySelector(":scope > .sticky");
  const h2 = head ? head.querySelector("h2") : null;
  const eyebrow = head ? head.querySelector("div") : null;
  const hairline = card.querySelector(":scope > [aria-hidden='true']");

  /* The ORNAMENTS. Absent at V1 by definition — that absence is the baseline. At V2 every property
     the acceptance gate names is read here rather than eyeballed: the rendered width (which is what
     the bake radius must have been divided by), the mirroring, the blend mode, the mask, and
     \`filter\`, which the architecture forbids at runtime. */
  const corners = [...card.querySelectorAll(".co-corner")].map((el) => {
    const s = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    return {
      side: el.classList.contains("co-corner-r") ? "right" : "left",
      w: round(r.width), h: round(r.height), x: round(r.x), y: round(r.y),
      transform: s.transform, blend: s.mixBlendMode, opacity: s.opacity,
      mask: s.maskImage || s.webkitMaskImage, filter: s.filter,
      objectFit: s.objectFit, objectPosition: s.objectPosition,
      zIndex: s.zIndex, position: s.position,
      src: (el.getAttribute("src") || "").split("/").pop(),
      alt: el.getAttribute("alt"), ariaHidden: el.getAttribute("aria-hidden"),
      naturalW: el.naturalWidth, naturalH: el.naturalHeight,
    };
  });

  /* CLIPPING, checked rather than assumed. \`overflow-y: auto\` on the card makes its overflow-x
     compute to \`auto\` too (see the ActionBar note in src/ui/modalStyle.jsx), so anything outside the
     padding box is cut. This compares each ornament's box against the card's and says so. */
  const cr = card.getBoundingClientRect();
  const clipped = corners.map((c) => ({
    side: c.side,
    overflowsLeft: round(cr.x - c.x) > 0.5,
    overflowsRight: round((c.x + c.w) - (cr.x + cr.width)) > 0.5,
    overflowsTop: round(cr.y - c.y) > 0.5,
  }));

  const tabs = [...document.querySelectorAll(".sk-tab")].map((b) => ({
    label: (b.querySelector("span") || {}).textContent || "",
    active: b.getAttribute("aria-current") === "true",
    color: getComputedStyle(b).getPropertyValue("--c").trim(),
  }));

  return {
    reached: true, screen: ${JSON.stringify(screen)},
    viewport: { innerWidth, innerHeight, dpr: devicePixelRatio },
    wide: matchMedia("(min-width: 1400px)").matches,
    card: {
      ...rect(card),
      paddingTop: cs.paddingTop, paddingLeft: cs.paddingLeft, paddingRight: cs.paddingRight,
      borderTopWidth: cs.borderTopWidth, borderLeftWidth: cs.borderLeftWidth,
      borderRadius: cs.borderRadius, overflow: cs.overflow,
      overflowX: cs.overflowX, overflowY: cs.overflowY, position: cs.position,
      /* The PADDING box is what \`position:absolute; left:0; right:0\` resolves against — the same
         5 px trap that cost \`icons-perks\` a re-bake. Recorded explicitly so the number the bake uses
         is never read off the border box by mistake. */
      paddingBoxWidth: round(card.clientWidth),
    },
    head: rect(head), h2: rect(h2), eyebrow: rect(eyebrow),
    hairline: hairline ? { ...rect(hairline), height: getComputedStyle(hairline).height } : null,
    sticky: rect(sticky),
    /* The DEAD SPACE the ornaments are meant to occupy: from the card's padding edge to the widest
       piece of head text, on each side, and from the card top down to the sticky bar. This is the
       envelope a footprint has to fit inside, and it is what makes ~300 x 115 a claim that can be
       checked rather than a wish. */
    dead: (() => {
      if (!head) return null;
      const hr = head.getBoundingClientRect();
      const texts = [h2, eyebrow].filter(Boolean).map((e) => e.getBoundingClientRect());
      if (!texts.length) return null;
      const widest = texts.reduce((a, b) => (b.width > a.width ? b : a));
      const padL = cr.x + parseFloat(cs.paddingLeft) + parseFloat(cs.borderLeftWidth);
      const padR = cr.x + cr.width - parseFloat(cs.paddingRight) - parseFloat(cs.borderRightWidth);
      return {
        leftWidth: round(widest.x - padL), rightWidth: round(padR - (widest.x + widest.width)),
        headTop: round(hr.y - cr.y), headHeight: round(hr.height),
        topToSticky: sticky ? round(sticky.getBoundingClientRect().y - cr.y) : null,
        widestText: round(widest.width),
      };
    })(),
    tabs, corners, clipped,
    cardCount: card.querySelectorAll(".lv-offercard").length,
  };
})()`;

async function bootRun(c, w, h) {
  await c.send("Page.enable");
  await c.send("Runtime.enable");
  await setViewport(c, { width: w, height: h, deviceScaleFactor: 1 });
  await reduceMotion(c);
  await seedRandom(c);
  await c.send("Page.addScriptToEvaluateOnNewDocument", { source: BOOT });
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
}

async function shoot(c, name, clipRect, w, h) {
  const full = await screenshot(c);
  writeFileSync(join(OUT, `${label}-${name}.png`), Buffer.from(full, "base64"));
  if (clipRect) {
    const r = clipRect;
    const clip = { x: Math.max(0, r.x), y: Math.max(0, r.y),
                   width: Math.min(r.w, w - Math.max(0, r.x)), height: Math.min(r.h, h - Math.max(0, r.y)) };
    if (clip.width > 0 && clip.height > 0) {
      const card = await screenshot(c, clip);
      writeFileSync(join(OUT, `${label}-${name}-card.png`), Buffer.from(card, "base64"));
    }
  }
}

async function runOne(w, h, port) {
  const c = await launch({ port });
  try {
    await bootRun(c, w, h);

    // ---- Round 1: the SKILL head, once per faction tab -------------------------------------
    let skill = await evaluate(c, PROBE("skill"));
    if (!skill.reached) throw new Error("round 1 was not the skill offer");
    const perTab = [];
    const nTabs = skill.tabs.length;
    if (nTabs === 0) {
      // Below the 1400 px gate there is no tab row at all — the pager stands there instead. That is
      // the state 1280x720 is captured for, so it is a recorded outcome, not a failure.
      await sleep(400);
      await shoot(c, `skill-${w}x${h}`, skill.card, w, h);
      perTab.push({ tab: null, data: skill });
    } else {
      for (let i = 0; i < nTabs; i++) {
        await evaluate(c, `(() => { const t = document.querySelectorAll(".sk-tab")[${i}];
          if (t) t.click(); return !!t; })()`);
        await sleep(700);   // let the image decode and any transition settle
        const d = await evaluate(c, PROBE("skill"));
        const active = (d.tabs.find((t) => t.active) || {}).label || `tab${i}`;
        await shoot(c, `skill-${active}-${w}x${h}`, d.card, w, h);
        perTab.push({ tab: active, data: d });
      }
      skill = perTab[0].data;
    }

    // ---- Round 2: the PERK head -------------------------------------------------------------
    const picked = await evaluate(c, `(() => {
      const b = document.querySelector(".lv-offercard");
      if (!b) return "no skill card";
      b.click(); return "ok";
    })()`);
    if (picked !== "ok") throw new Error(`could not pick a skill: ${picked}`);
    await sleep(1200);
    await evaluate(c, `(() => { const b = [...document.querySelectorAll("button")]
      .find((e) => (e.textContent || "").trim() === "MAX"); if (b) b.click(); return !!b; })()`);

    // One deck pass at maximum speed, then round 2 opens the perk offer. Polled, never timed.
    let perk = null;
    for (let i = 0; i < 60; i++) {
      await sleep(1000);
      perk = await evaluate(c, PROBE("perk"));
      if (perk.reached) break;
    }
    if (!perk || !perk.reached) throw new Error("perk offer never opened");
    await sleep(600); // let the images decode before the shot
    perk = await evaluate(c, PROBE("perk"));
    await shoot(c, `perk-${w}x${h}`, perk.card, w, h);

    // ---- Round 29: the LEGENDARY head ---------------------------------------------------------
    const legendary = await runLegendary(c, w, h);

    return { skill: { perTab: perTab.map((p) => ({ tab: p.tab, ...p.data })) }, perk, legendary };
  } finally {
    await c.close();
  }
}

/* The LEGENDARY phase is cycle 29 of a 50-cycle run (`BASE_SCHEDULE` in src/game/constants.js), so
   playing to it is not a capture step, it is a second test suite. The run is RESUMED into it.

   Why this is honest rather than a mock: the state injected below is a REAL run state, lifted out
   of `as_activerun` after the seeded run has actually started, with four fields changed — the
   phase, the two dead offers and the cycle counter. Everything else is whatever the engine
   produced. The application then loads it through its own `loadActiveRun`, which validates the
   schema and the core fields and discards a malformed state rather than rendering it. What appears
   on screen is `LegendarySelect` with real data.

   THE INJECTION HAS TO HAPPEN BEFORE THE APP BOOTS, and that is not a detail: writing the key
   while the application runs does not work, because it saves its own live state back over the edit
   within a tick. Measured the hard way — the first attempt resumed straight back into the skill
   offer. Hence `addScriptToEvaluateOnNewDocument` and a fresh navigation. */
async function runLegendary(c, w, h) {
  const raw = await evaluate(c, `localStorage.getItem("as_activerun")`);
  if (!raw) return { reached: false, why: "no active run to lift" };
  const b = JSON.parse(raw);
  b.state.phase = "legendary";
  b.state.skillOffer = null;
  b.state.offer = null;
  b.state.legendaryOffer = LEGENDARY_OFFER;
  b.state.cycle = 28;
  await c.send("Page.addScriptToEvaluateOnNewDocument", {
    source: `${BOOT}\ntry { localStorage.setItem("as_activerun", ${JSON.stringify(JSON.stringify(b))}); } catch {}`,
  });
  await goto(c, `${ORIGIN}/`, { settleMs: 2500 });
  const resumed = await evaluate(c, `(() => {
    const b = [...document.querySelectorAll("button")].find((e) => /fortsetz/i.test(e.textContent || ""));
    if (!b) return "no resume button"; b.click(); return "ok"; })()`);
  if (resumed !== "ok") return { reached: false, why: resumed };
  await sleep(2500);
  const data = await evaluate(c, PROBE("legendary"));
  if (data.reached) await shoot(c, `legendary-${w}x${h}`, data.card, w, h);
  return data;
}

mkdirSync(OUT, { recursive: true });
const results = {};
/* One debugging port per viewport, and a retry on top — the same fix `icons-perks` needed. Reusing a
   single port across four sequential browsers loses a run every so often on Windows: the previous
   browser has exited but the port and its profile directory are not released yet. A capture tool that
   is flaky is not evidence. */
for (const [i, [w, h]] of VIEWPORTS.entries()) {
  process.stdout.write(`${w}x${h} … `);
  let last = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const d = await runOne(w, h, 9371 + i * 2 + attempt);
      results[`${w}x${h}`] = d;
      const s0 = d.skill.perTab[0];
      console.log(`wide=${s0.wide} · card ${s0.card.w} px (padding box ${s0.card.paddingBoxWidth}) · `
        + `tabs ${d.skill.perTab.map((p) => p.tab).join("/")} · `
        + `dead L/R ${s0.dead ? s0.dead.leftWidth + "/" + s0.dead.rightWidth : "n/a"} · `
        + `corners skill ${s0.corners.length} perk ${d.perk.corners.length} leg ${d.legendary.reached ? d.legendary.corners.length : "n/a"}`
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
