#!/usr/bin/env node
/* #menu-rework M7 — the statistics screen and the run window, measured.
   ============================================================================

   WHY THIS EXISTS BESIDE `viewport-survey.mjs`, and it is a finding rather than a preference.

   The survey reaches `stats` by clicking hub tile 3 on a FRESH profile. A fresh profile has no run
   history, so `StatsScreen` renders `t("stats.empty")` and nothing else: measured on
   `evidence/M3/after`, the `stats` cell carries 171 DOM nodes against the hub's 163 — eight nodes
   more than the screen it was opened from. Every `.st-sec`, every box, the whole run list and the
   entire run window are OUTSIDE the matrix, in every cell, in both languages, at all five sizes.

   That is not a reason to distrust the survey — it measures exactly what it says it measures, and
   its `run-stage` cell is what the acceptance gate turns on. It is a reason not to pretend the
   before/after half of this task can come from it. So: the survey stays untouched and produces the
   zero-delta gate; THIS produces the geometry of the screen the task actually redesigns, against
   the named, generated profile in `seed.mjs`.

   PRODUCTION BUILD, real CDP viewport, port 5189 (the survey's 5181 is left alone — a survey run
   that finds a live server on its port reuses it without checking what it serves, and that is how
   M3 lost its gate).

     npm run build
     node docs/workstreams/desktop-menus/evidence/M7/measure.mjs --out <dir> [--shots]

   `--shots` additionally writes PNGs for the owner-facing set. Without it the run is geometry only,
   which is what the before/after table needs. `screenshot()` returns BASE64 — the encoding argument
   is not optional decoration; without it the file is a text file with a .png name, and every viewer
   reports it as a corrupt image rather than as the wrong encoding.

   DETERMINISM is inherited from `viewport-survey.mjs` and is not optional: reduced motion, seeded
   `Math.random`, every animation pinned to time 0, fonts and images awaited. The profile is fixed
   by `seed.mjs`, so the only thing that can move between two runs is the code. */

import { writeFileSync, mkdirSync, readFileSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { launch, setViewport, reduceMotion, seedRandom, suppressInstallPrompt, screenshot,
  goto, evaluate, sleep } from "../../../../../scripts/cdp.mjs";
import { seedBlob, HISTORY, PROFILE } from "./seed.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "../../../../..");
const arg = (name, fallback = null) => {
  const i = process.argv.indexOf(name);
  return i >= 0 && process.argv[i + 1] && !process.argv[i + 1].startsWith("--") ? process.argv[i + 1] : fallback;
};
const OUT = resolve(arg("--out", join(HERE, "run")));
const SHOTS = process.argv.includes("--shots");
const PORT = 5189;

/* The deploy base, read out of the built `index.html` rather than assumed: `vite.config.js` applies
   it for `build` but not for `preview`, so serving dist at "/" would return the SPA fallback for
   every asset with status 200 and the page would look merely slow. */
const BASE = (() => {
  const html = readFileSync(join(ROOT, "dist/index.html"), "utf8");
  const m = html.match(/<script[^>]+src="([^"]*)\/assets\//);
  return m && m[1] ? `${m[1]}/` : "/";
})();

const ORIGIN = `http://localhost:${PORT}${BASE}`;

const SIZES = (() => {
  /* `--sizes 1280x720,1536x791` narrows the matrix. The owner-facing set is TWO sizes, not five —
     five captures of the same screen are five chances to look at the wrong one. */
  const i = process.argv.indexOf("--sizes");
  if (i >= 0 && process.argv[i + 1]) return process.argv[i + 1].split(",").map((s) => s.split("x").map(Number));
  return [[1920, 1080], [1600, 900], [1536, 791], [1400, 700], [1280, 720]];
})();
const LANGS = ["de", "en"];

/* ------------------------------------------------------------------ server */

async function serverAlive() {
  try { return (await fetch(ORIGIN, { signal: AbortSignal.timeout(1500) })).ok; } catch { return false; }
}
async function ensureServer() {
  /* The check the survey does NOT do, and the reason M3 lost its gate: a live server on this port
     may be serving somebody else's `dist`. Refuse rather than measure it. */
  if (await serverAlive()) {
    throw new Error(`something is already answering on ${PORT}. Stop it first — a stale preview serves an old bundle and this script cannot tell.`);
  }
  const viteBin = join(ROOT, "node_modules", "vite", "bin", "vite.js");
  const proc = spawn(process.execPath, [viteBin, "preview", "--port", String(PORT), "--strictPort", "--base", BASE],
    { cwd: ROOT, stdio: "ignore" });
  for (let i = 0; i < 150; i++) {
    if (await serverAlive()) return { stop: async () => { proc.kill(); await sleep(300); } };
    await sleep(200);
  }
  proc.kill();
  throw new Error(`vite preview did not come up on ${PORT}`);
}

/* ------------------------------------------------------------------ controls */

const seedScript = (lang) => {
  const blob = seedBlob(lang);
  return `(() => {
    try { localStorage.clear(); } catch (e) {}
    const b = ${JSON.stringify(blob)};
    for (const k of Object.keys(b)) localStorage.setItem(k, b[k]);
    localStorage.removeItem("as_activerun");
    return Object.keys(b).length;
  })()`;
};

const SETTLE = `(async () => {
  const deadline = (ms, v) => new Promise((r) => setTimeout(() => r(v), ms));
  const race = (p, ms, v) => Promise.race([p, deadline(ms, v)]);
  for (const a of document.getAnimations()) { try { a.currentTime = 0; a.pause(); } catch (e) {} }
  const fontsOk = await race(document.fonts.ready.then(() => true), 3000, false);
  const imgs = Array.from(document.images);
  for (const i of imgs) if (i.loading === "lazy") i.loading = "eager";
  const loaded = (i) => i.complete ? Promise.resolve(true) : new Promise((r) => {
    i.addEventListener("load", () => r(true), { once: true });
    i.addEventListener("error", () => r(true), { once: true });
  });
  await Promise.all(imgs.map((i) => race(loaded(i), 5000, false)));
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  return { fontsOk, images: imgs.length, animations: document.getAnimations().length };
})()`;

const clickTile = (i) => `(() => {
  const t = Array.prototype.slice.call(document.querySelectorAll(".as-hub-tile"));
  if (!t[${i}]) return { ok: false, why: "tile " + ${i} + " of " + t.length + " not found" };
  t[${i}].click(); return { ok: true };
})()`;

/* Open the run window on a NAMED row rather than "the first one": row 0 is the full run and row 6
   the thin one, and the design's 949-against-717 comparison is exactly those two. */
const clickRun = (n) => `(() => {
  const rows = Array.prototype.slice.call(document.querySelectorAll('.st-sec[data-sec="runs"] button'));
  if (!rows[${n}]) return { ok: false, why: "run row " + ${n} + " of " + rows.length + " not found" };
  rows[${n}].click(); return { ok: true };
})()`;

/* ------------------------------------------------------------------ the probe

   Everything the design document puts a number on, read from the live layout. Names match the
   document's own wording so the before/after table can be read against it line by line. */
const PROBE = `(() => {
  const px = (n) => Math.round(n * 100) / 100;
  const box = (el) => { if (!el) return null; const r = el.getBoundingClientRect();
    return { x: px(r.x), y: px(r.y), w: px(r.width), h: px(r.height), bottom: px(r.bottom) }; };
  const one = (s) => box(document.querySelector(s));
  const all = (s) => Array.prototype.slice.call(document.querySelectorAll(s)).map(box);
  const cs = (s, props) => { const el = document.querySelector(s); if (!el) return null;
    const c = getComputedStyle(el); const o = {}; for (const p of props) o[p] = c.getPropertyValue(p); return o; };

  const card = document.querySelector(".st-card");
  const root = document.querySelector(".st-root");
  const sec = (id) => one('.st-sec[data-sec="' + id + '"]');
  const runRows = all('.st-sec[data-sec="runs"] button');

  return {
    viewport: { w: innerWidth, h: innerHeight },
    /* THE CARD, and the three numbers the design's opening paragraph turns on. */
    card: box(card),
    cardScrollH: card ? px(card.scrollHeight) : null,
    root: box(root),
    rootScrollH: root ? px(root.scrollHeight) : null,
    rootClientH: root ? px(root.clientHeight) : null,
    /* "263 px unter der Falz", "der Ueberzug scrollt 1,4x" — both derived here rather than by hand. */
    belowFold: card ? px(card.getBoundingClientRect().bottom - innerHeight) : null,
    scrollFactor: root ? px(root.scrollHeight / root.clientHeight) : null,
    /* THE THREE COLUMNS and where each of them ends. */
    columnEnds: {
      col1: [sec("best"), sec("works")].filter(Boolean).map((b) => b.bottom).sort((a, b) => b - a)[0] ?? null,
      col2: sec("runs") ? sec("runs").bottom : null,
      col3: sec("picked") ? sec("picked").bottom : null,
    },
    sections: { overview: sec("overview"), best: sec("best"), runs: sec("runs"), picked: sec("picked"), works: sec("works") },
    /* SECTION CHROME — the design says border 0, transparent background, radius 14. */
    secStyle: cs('.st-sec[data-sec="runs"]', ["background-color", "background-image", "border-top-width", "border-color", "border-radius", "padding"]),
    /* THE HEAD. The readout is the sentence the design moves out of the action zone. */
    head: one(".st-head"),
    readout: one(".st-readout"),
    close: one(".st-close"),
    title: one(".st-head h2"),
    titleSize: cs(".st-head h2", ["font-size"]),
    eyebrow: one(".st-eyebrow"),
    subline: one(".st-sub"),
    /* THE CLICK TARGETS — the design's 33 px, and the 44 px it asks for. */
    runRowCount: runRows.length,
    runRowH: runRows.length ? runRows[0].h : null,
    runRowHAll: runRows.map((b) => b.h),
    /* WHAT SCROLLS. A screen whose window scrolls and a screen whose content scrolls are two
       different screens; this is the number that tells them apart. */
    scrollers: Array.prototype.slice.call(document.querySelectorAll(".st-root, .st-card, .st-body, .st-scroll"))
      .map((el) => ({ cls: el.className.split(" ")[0], scrollH: px(el.scrollHeight), clientH: px(el.clientHeight),
        overflowY: getComputedStyle(el).overflowY })),
    nodeCount: document.querySelectorAll("*").length,
  };
})()`;

const RD_PROBE = `(() => {
  const px = (n) => Math.round(n * 100) / 100;
  const box = (el) => { if (!el) return null; const r = el.getBoundingClientRect();
    return { x: px(r.x), y: px(r.y), w: px(r.width), h: px(r.height), bottom: px(r.bottom) }; };
  const one = (s) => box(document.querySelector(s));
  const all = (s) => Array.prototype.slice.call(document.querySelectorAll(s)).map(box);
  const card = document.querySelector(".rd-card");
  const root = document.querySelector(".rd-root");
  /* Die Spuren liegen am RUMPF, nicht an der Karte: der Kopf hat den Scroller verlassen, und das
     Spurenraster ist mit ihm eine Ebene tiefer gewandert. Die Karte zuerst zu lesen ergab dreimal
     dieselbe Zahl - ihre eigenen drei Spalten, die nur noch der Kopf benutzt. */
  const body = document.querySelector(".rd-body") || card;
  const grid = body ? getComputedStyle(body) : null;
  const chips = Array.prototype.slice.call(document.querySelectorAll(".rd-c2 .rs-chips > *"));
  return {
    viewport: { w: innerWidth, h: innerHeight },
    card: box(card),
    cardScrollH: card ? px(card.scrollHeight) : null,
    root: box(root),
    rootScrollH: root ? px(root.scrollHeight) : null,
    rootClientH: root ? px(root.clientHeight) : null,
    /* "das Fenster misst 949 px gegen 720 px Bildschirm" — the height of the whole thing. */
    windowH: card ? px(card.getBoundingClientRect().height) : null,
    overshoot: card ? px(card.getBoundingClientRect().height - innerHeight) : null,
    /* THE THREE LANES — 374 / 374 / 374 today, 290 / 544 / 290 in the proposal. */
    lanes: grid ? grid.gridTemplateColumns : null,
    rows: grid ? grid.gridTemplateRows : null,
    panels: { c1: one(".rd-c1"), c2: one(".rd-c2"), c3: one(".rd-c3"), c4: one(".rd-c4"), left: one(".rd-left") },
    /* "die vier Panels summieren sich auf 1757 px" */
    panelSum: [".rd-c1", ".rd-c2", ".rd-c3", ".rd-c4"]
      .map((s) => { const b = one(s); return b ? b.h : 0; }).reduce((a, b) => a + b, 0),
    /* "darunter 272 px Loch" - how far the LEFT half runs past the bottom of the formation lane.
       Before this task the left half was the rd-left bracket; it is gone, because a fixed first row
       removes the reason it existed. The measure is therefore taken from whichever left-hand panel
       ends lowest, which is the same quantity either way and survives the restructure.
       NO BACKTICKS IN THIS STRING: the probe IS a template literal, and one backtick ends it. The
       same trap is documented at the head of scripts/viewport-proof.mjs. */
    hole: (() => {
      const c3 = one(".rd-c3");
      if (!c3) return null;
      const links = [".rd-left", ".rd-c4", ".rd-c2", ".rd-c1"].map(one).filter(Boolean);
      if (!links.length) return null;
      return px(Math.max(...links.map((b) => b.bottom)) - c3.bottom);
    })(),
    /* THE BUILD PANEL — the chip cloud the design replaces with fifteen fixed fields. */
    chipCount: chips.length,
    chipWidths: chips.map((el) => px(el.getBoundingClientRect().width)),
    chipHeights: [...new Set(chips.map((el) => px(el.getBoundingClientRect().height)))].sort((a, b) => a - b),
    buildFields: document.querySelectorAll(".rd-bf").length,
    /* THE BOARD — a portrait object in a landscape row. */
    board: one(".rd-c3 .cg-root"),
    /* THE HEAD. */
    score: one(".rd-num"),
    scoreSize: (() => { const el = document.querySelector(".rd-num"); return el ? getComputedStyle(el).fontSize : null; })(),
    eyebrow: one(".rd-title > div:first-child"),
    kpi: one(".rd-kpi"),
    scrollers: Array.prototype.slice.call(document.querySelectorAll(".rd-root, .rd-card, .rd-body"))
      .map((el) => ({ cls: el.className.split(" ")[0], scrollH: px(el.scrollHeight), clientH: px(el.clientHeight),
        overflowY: getComputedStyle(el).overflowY })),
    nodeCount: document.querySelectorAll("*").length,
  };
})()`;

/* ------------------------------------------------------------------ run */

async function main() {
  mkdirSync(OUT, { recursive: true });
  const server = await ensureServer();
  const c = await launch();
  const out = { base: BASE, seed: { runs: HISTORY.length, best: PROFILE.bestScore, games: PROFILE.games }, cells: {} };
  try {
    /* BOTH domains, and this is not boilerplate: `goto()` waits on `Page.loadEventFired`, and
       without `Page.enable` that event is never delivered — the script does not fail, it waits
       forever. Cost the first run of this harness ten minutes of silence. */
    await c.send("Page.enable");
    await c.send("Runtime.enable");
    await reduceMotion(c);
    await seedRandom(c);
    await suppressInstallPrompt(c);
    for (const lang of LANGS) {
      for (const [w, h] of SIZES) {
        await setViewport(c, { width: w, height: h, deviceScaleFactor: 1 });
        /* The seed is written BEFORE the app boots, then the page is loaded again: `loadRunHistory`
           and `loadProfile` are both read once, on mount, and a profile written afterwards would be
           invisible until something re-mounted. */
        await goto(c, ORIGIN, { settleMs: 400 });
        await evaluate(c, seedScript(lang));
        await goto(c, ORIGIN, { settleMs: 1100 });
        await evaluate(c, SETTLE);

        const key = `${lang}/${w}x${h}`;
        const nav = await evaluate(c, clickTile(3));
        if (!nav.ok) { out.cells[`${key}/stats`] = { reached: false, why: nav.why }; continue; }
        await sleep(800);
        await evaluate(c, SETTLE);
        const probe = await evaluate(c, PROBE);
        /* THE ASSERTION THAT MAKES THIS HARNESS WORTH RUNNING. The first run of it measured a
           fully-seeded profile and got the EMPTY screen in all ten cells — `maybeResetForEpoch`
           wipes a fresh namespace once, and it did so between the seed and the first read. Nothing
           errored; the numbers were simply of a different screen. A run that cannot see the run list
           has not measured the statistics screen, and it says so instead of writing a file. */
        if (probe.runRowCount === 0) {
          throw new Error(`${key}: the run list is empty — the seed did not survive the boot. `
            + `Check as_reset_epoch against RESET_EPOCH in src/game/storage.js.`);
        }
        out.cells[`${key}/stats`] = { reached: true, ...probe };
        if (SHOTS) await screenshot(c, null, {}).then((b) => writeFileSync(join(OUT, `stats-${lang}-${w}x${h}.png`), b, "base64"));

        for (const [name, row] of [["run-full", 0], ["run-thin", 6]]) {
          const r = await evaluate(c, clickRun(row));
          if (!r.ok) { out.cells[`${key}/${name}`] = { reached: false, why: r.why }; continue; }
          await sleep(700);
          await evaluate(c, SETTLE);
          out.cells[`${key}/${name}`] = { reached: true, ...(await evaluate(c, RD_PROBE)) };
          if (SHOTS) await screenshot(c, null, {}).then((b) => writeFileSync(join(OUT, `${name}-${lang}-${w}x${h}.png`), b, "base64"));
          /* CLOSE THE WINDOW, DO NOT ESCAPE IT. A synthetic Escape on `document` was the obvious
             move and it closed BOTH layers — `useEscape` is mounted by the statistics screen as
             well, and the run window is a portal on `document.body`, so one key event reaches two
             listeners. The next cell then looked for row 6 in a list of zero. Clicking the window's
             own close button leaves exactly one layer, which is what a player's Escape does. */
          await evaluate(c, `(() => { const b = document.querySelector(".rd-close"); if (b) b.click(); return !!b; })()`);
          await sleep(500);
        }
        process.stdout.write(`  ${key} ok\n`);
      }
    }
  } finally {
    try { await c.close(); } catch {}
    await server.stop();
  }
  writeFileSync(join(OUT, "geometry.json"), JSON.stringify(out, null, 1));
  console.log(`geometry.json written — ${Object.keys(out.cells).length} cells`);
}

main().catch((e) => { console.error(e); process.exit(1); });
