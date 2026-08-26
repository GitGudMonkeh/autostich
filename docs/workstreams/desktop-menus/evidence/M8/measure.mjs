#!/usr/bin/env node
/* #menu-rework M8 — the leaderboard, both of its entries, measured against a still board.
   ============================================================================

   WHY THIS EXISTS BESIDE `viewport-survey.mjs`.

   The survey's `leaderboard` cell opens hub tile 2, which is the BOARD entry on its default tab, and
   it reads the live `autostich_scores` table. Two things follow, and both are hazard H-a:

     1. the row count follows the network, so the two halves of a comparison are two different trees
        (TYPO-08; `surface-delta.mjs` pre-registers `leaderboard` and counts the unmatched paths
        separately rather than as deltas);
     2. the RANKED entry — the ranked button, its cockpit, its week head and the rules tab — is not
        in the matrix at all. No survey cell has ever opened it.

   So the survey stays untouched and produces the zero-delta gate for the other fifteen surfaces;
   THIS produces the before/after geometry of the screen the task actually redesigns, with the board
   held still by `seed.mjs` and the clock pinned to a fixed instant.

   PRODUCTION BUILD, real CDP viewport, port 5189. The survey's 5181 is left alone, and this script
   REFUSES to run when something already answers on its own port rather than reusing it — the failure
   that cost M3 its gate, made impossible instead of remembered.

     npm run build
     node docs/workstreams/desktop-menus/evidence/M8/measure.mjs --out <dir> [--shots] [--sizes ...]

   `--shots` writes PNGs for the owner-facing set. `screenshot()` returns BASE64: the encoding
   argument to `writeFileSync` is not decoration. Without it the file is a text file wearing a .png
   name, which is what cost M7 twelve handover captures — see the assertion in `writeShot` below,
   which reads the first bytes back and fails if they are not a PNG signature. */

import { writeFileSync, readFileSync, mkdirSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { launch, setViewport, reduceMotion, seedRandom, suppressInstallPrompt, screenshot,
  goto, evaluate, sleep } from "../../../../../scripts/cdp.mjs";
import { seedBlob, fetchStubSource, freezeClockSource, boardRows, FROZEN_MS } from "./seed.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "../../../../..");
const arg = (name, fallback = null) => {
  const i = process.argv.indexOf(name);
  return i >= 0 && process.argv[i + 1] && !process.argv[i + 1].startsWith("--") ? process.argv[i + 1] : fallback;
};
const OUT = resolve(arg("--out", join(HERE, "run")));
const SHOTS = process.argv.includes("--shots");
/* `--empty-champs` returns an EMPTY champion archive from the stub. It is what re-measures the
   design's open question 1 — "the empty challenger tab makes the card 347 px high" — which cannot be
   read off a populated board. A separate run rather than a separate cell: the two are different
   worlds, and mixing them in one matrix would make the archive's row count depend on the flag. */
const EMPTY_CHAMPS = process.argv.includes("--empty-champs");
const PORT = 5189;

/* The deploy base, read out of the built index.html rather than assumed: vite.config.js applies it
   for `build` but not for `preview`, so serving dist at "/" returns the SPA fallback for every asset
   with status 200 and the page merely looks slow. */
const BASE = (() => {
  const html = readFileSync(join(ROOT, "dist/index.html"), "utf8");
  const m = html.match(/<script[^>]+src="([^"]*)\/assets\//);
  return m && m[1] ? `${m[1]}/` : "/";
})();
const ORIGIN = `http://localhost:${PORT}${BASE}`;

const SIZES = (() => {
  const i = process.argv.indexOf("--sizes");
  if (i >= 0 && process.argv[i + 1] && !process.argv[i + 1].startsWith("--")) {
    return process.argv[i + 1].split(",").map((s) => s.split("x").map(Number));
  }
  return [[1920, 1080], [1600, 900], [1536, 791], [1400, 700], [1280, 720]];
})();
const LANGS = (arg("--langs", "de,en")).split(",");

/* ------------------------------------------------------------------ server */

async function serverAlive() {
  try { return (await fetch(ORIGIN, { signal: AbortSignal.timeout(1500) })).ok; } catch { return false; }
}
async function ensureServer() {
  /* The check the survey does NOT do. A live server on this port may be serving somebody else's
     dist; refuse rather than measure it. */
  if (await serverAlive()) {
    throw new Error(`something is already answering on ${PORT}. Stop it first — a stale preview serves an old bundle and this script cannot tell.`);
  }
  const viteBin = join(ROOT, "node_modules", "vite", "bin", "vite.js");
  const proc = spawn(process.execPath, [viteBin, "preview", "--port", String(PORT), "--strictPort", "--base", BASE],
    { cwd: ROOT, stdio: "ignore" });
  /* STOPPING IS VERIFIED, NOT ASSUMED — and that is H-d again, in the same shape as everywhere else.
     `proc.kill()` asks; the first run of this harness left a listener behind on Windows and the next
     run refused to start, which is the good outcome only because the refusal above exists. So the
     stop polls the port and says so when the process outlived the request, instead of returning as
     if it had worked. */
  const stop = async () => {
    proc.kill();
    for (let i = 0; i < 25; i++) {
      if (!(await serverAlive())) return;
      await sleep(200);
    }
    process.stderr.write(`WARNING: something still answers on ${PORT} after kill — stop it by hand before the next run.\n`);
  };
  for (let i = 0; i < 150; i++) {
    if (await serverAlive()) return { stop };
    await sleep(200);
  }
  await stop();
  throw new Error(`vite preview did not come up on ${PORT}`);
}

/* ------------------------------------------------------------------ captures

   H-d, and it is the cheapest hazard in the round: a check that asks whether a file is PRESENT will
   eventually pass on the wrong thing. This one asks whether it is a PNG — the eight signature bytes,
   read back off disk after the write. */
const PNG_SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
function writeShot(path, base64) {
  writeFileSync(path, base64, "base64");
  const head = readFileSync(path).subarray(0, 8);
  if (!head.equals(PNG_SIG)) {
    throw new Error(`${path} is not a PNG — first bytes ${head.toString("hex")}. `
      + `A base64 payload written without the encoding argument looks exactly like this.`);
  }
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

const clickSel = (sel, nth = 0) => `(() => {
  const all = Array.prototype.slice.call(document.querySelectorAll(${JSON.stringify(sel)}));
  const vis = all.filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; });
  const hit = vis[${nth}];
  if (!hit) return { ok: false, why: ${JSON.stringify(sel)} + "[" + ${nth} + "]: " + all.length + " matches, " + vis.length + " visible" };
  hit.click(); return { ok: true };
})()`;

/* The navigation column IS the tab strip above 1280 px; below it, it is a row. Either way the
   controls carry `role="tab"`, which is the stable handle — clicking by label would need both
   spellings of every tab for a control that already has one. */
const clickTab = (n) => clickSel('.lb-tabs [role="tab"]', n);

/* ------------------------------------------------------------------ the probe

   Everything `docs/bestenliste-redesign.md` puts a number on, read off the live layout, with the
   document's own wording in the key names so the before/after table reads against it line by line.

   NO BACKTICKS IN THIS STRING: the probe IS a template literal and one backtick ends it. Same trap
   documented at the head of scripts/viewport-proof.mjs and in M7's harness. */
const PROBE = `(() => {
  const px = (n) => Math.round(n * 100) / 100;
  const box = (el) => { if (!el) return null; const r = el.getBoundingClientRect();
    return { x: px(r.x), y: px(r.y), w: px(r.width), h: px(r.height), bottom: px(r.bottom) }; };
  const one = (s) => box(document.querySelector(s));
  const cs = (s, props) => { const el = document.querySelector(s); if (!el) return null;
    const c = getComputedStyle(el); const o = {}; for (const p of props) o[p] = c.getPropertyValue(p); return o; };
  const csEl = (el, props) => { if (!el) return null;
    const c = getComputedStyle(el); const o = {}; for (const p of props) o[p] = c.getPropertyValue(p); return o; };

  const card = document.querySelector(".lb-card");
  const body = document.querySelector(".lb-body");
  const root = document.querySelector(".lb-root");
  const page = document.querySelector(".lb-page");
  const tabs = Array.prototype.slice.call(document.querySelectorAll('.lb-tabs [role="tab"]'));
  const active = tabs.find((t) => t.getAttribute("aria-selected") === "true") || null;
  const idle = tabs.find((t) => t.getAttribute("aria-selected") !== "true") || null;

  /* THE GLYPH CENSUS. The design counts 22 text glyphs on this screen; this counts them by walking
     the text nodes, so the number is the DOM's rather than a reading of the source. */
  const GLYPHS = ["\\u2317", "\\u2696", "\\u2654", "\\u271a", "\\u2298"];
  const glyphs = {};
  for (const g of GLYPHS) glyphs[g] = 0;
  const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let total = 0;
  for (let n = walk.nextNode(); n; n = walk.nextNode()) {
    for (const g of GLYPHS) {
      let i = -1, c = 0;
      while ((i = n.nodeValue.indexOf(g, i + 1)) >= 0) c++;
      glyphs[g] += c; total += c;
    }
  }

  const rows = Array.prototype.slice.call(document.querySelectorAll(".lb-rows > button"));
  const mods = Array.prototype.slice.call(document.querySelectorAll(".lb-mod"));

  return {
    viewport: { w: innerWidth, h: innerHeight },
    /* THE MEASURES the design says are already right: card 1208, nav column 300, gap 22, panel 884. */
    card: box(card), body: box(body), page: box(page),
    tabsCol: box(document.querySelector(".lb-tabs")),
    bodyGrid: body ? csEl(body, ["grid-template-columns", "column-gap"]) : null,
    /* THE CONTENT-SIZED CARD: the head, the column and the panel top edge must stay put while the
       bottom edge moves. All four are read here so "only the bottom edge moves" is checkable. */
    head: one(".lb-head"),
    headTop: one(".lb-head") ? one(".lb-head").y : null,
    cardBottom: card ? px(card.getBoundingClientRect().bottom) : null,
    belowFold: card ? px(card.getBoundingClientRect().bottom - innerHeight) : null,
    /* THE OVERLAY. */
    rootStyle: cs(".lb-root", ["background-color", "backdrop-filter", "-webkit-backdrop-filter", "align-items"]),
    /* THE NAVIGATION COLUMN — the three grips the design asks for. */
    navActive: csEl(active, ["background-color", "background-image", "border-radius", "box-shadow", "border-left-color", "border-left-width", "padding"]),
    navIdle: csEl(idle, ["background-color", "background-image", "border-radius", "box-shadow", "border-left-color", "border-left-width", "padding"]),
    navBox: box(active),
    navCount: tabs.length,
    navLabels: tabs.map((t) => (t.textContent || "").trim().replace(/\\s+/g, " ").slice(0, 40)),
    /* THE PANEL — tint and frame, or the absence of both. */
    pageStyle: cs(".lb-page", ["background-color", "background-image", "border-top-width", "border-top-color", "border-radius", "padding"]),
    /* THE HEAD CANON. */
    title: one(".lb-head h2"),
    titleStyle: cs(".lb-head h2", ["font-size", "font-weight"]),
    eyebrow: one(".lb-eyebrow"),
    eyebrowStyle: cs(".lb-eyebrow", ["font-size", "color", "letter-spacing", "text-transform"]),
    eyebrowText: (document.querySelector(".lb-eyebrow") || {}).textContent || null,
    sub: one(".lb-sub"),
    subStyle: cs(".lb-sub", ["font-size", "color", "line-height"]),
    subText: (document.querySelector(".lb-sub") || {}).textContent || null,
    close: one(".lb-head > button"),
    /* THE GLYPHS. */
    glyphs, glyphTotal: total,
    svgIcons: document.querySelectorAll(".lb-body svg").length,
    /* THE LIST — the row count both halves must state. */
    rowCount: rows.length,
    rowH: rows.length ? px(rows[0].getBoundingClientRect().height) : null,
    modCount: mods.length,
    /* The play button, and it is an assertion target rather than a curiosity: it renders only when
       rankedUnlocked(profile) holds, so its absence means the seeded profile did not survive the
       boot. See the second stamp in seed.mjs. (No backticks in this comment — it lives inside the
       probe's template literal, and one backtick ends the string. The header says so; I paid it
       anyway, which is why this parenthesis is here.) */
    playCta: document.querySelectorAll(".lb-cockpit .as-cta-primary").length,
    /* Champion rows carry no class of their own before this task, so they are counted by the one
       node each of them certainly holds: the rank vector. Counting them by a class this task ADDS
       would read zero in the before-half and look like a change that never happened. */
    champCount: document.querySelectorAll(".lb-pagescroll .as-rank-icon").length,
    /* THE EDGE SPOTS. One point per rule whose colour the vocabulary commit moves, given in CSS
       pixels, so pixels.mjs can read the SAME point out of the before and the after capture and
       the colour delta is measured rather than reasoned about. A translucent edge has no colour of
       its own — it depends on the ground — and the ground here is a 94 % scrim over a hub whose
       ambient glow varies across the screen, so arithmetic on the declared value would be a guess.

       Each spot sits ON the 1-px edge: the middle of the element's top border, half a pixel in. The
       row hairline is a border-TOP and the others are full borders, so the top edge is the one point
       every one of them actually has. */
    edgeSpots: (() => {
      const spot = (name, sel) => {
        const el = document.querySelector(sel);
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return { name, sel, x: Math.round(r.x + r.width / 2), y: Math.round(r.y) };
      };
      return [
        spot("nav row (idle)", '.lb-tabs [role="tab"]:not([aria-selected="true"])'),
        spot("nav row (active)", '.lb-tabs [role="tab"][aria-selected="true"]'),
        spot("modifier box", ".lb-mod"),
        spot("context tile", ".lb-ctxtile"),
        spot("span chip", ".lb-modspan"),
        spot("list subhead chip", ".lb-page .lb-listsub"),
        spot("list row hairline", ".lb-page .lb-rows > button:nth-child(2)"),
        spot("countdown chip", ".lb-weekcount"),
      ].filter(Boolean);
    })(),
    /* WHAT SCROLLS. */
    scrollers: Array.prototype.slice.call(document.querySelectorAll(".lb-root, .lb-card, .lb-body, .lb-page, .lb-pagescroll"))
      .map((el) => ({ cls: (el.className || "").split(" ")[0], scrollH: px(el.scrollHeight),
        clientH: px(el.clientHeight), overflowY: getComputedStyle(el).overflowY })),
    nodeCount: document.querySelectorAll("*").length,
  };
})()`;

/* ------------------------------------------------------------------ the walk

   Two entries, and the tab sets differ between them — that is the whole point of the design's "two
   screens in one". Tabs are addressed by INDEX because the id order is fixed in the source
   (`TABS_BOARD`, `TABS_RANKED`) and the labels are language-dependent. */
const ENTRIES = [
  { id: "board", open: [{ tile: 2 }], tabs: ["global", "week", "champions"] },
  { id: "ranked", open: [{ sel: ".as-ranked-btn" }], tabs: ["week", "champions", "rules"] },
];

async function openEntry(c, entry) {
  for (const step of entry.open) {
    const r = step.tile !== undefined ? await evaluate(c, clickTile(step.tile))
                                      : await evaluate(c, clickSel(step.sel));
    if (!r.ok) return r;
    await sleep(800);
  }
  return { ok: true };
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const server = await ensureServer();
  /* `launch()` inside the try, not before it: a browser that fails to start would otherwise leave the
     preview server running and the NEXT run would refuse to start — measured, once. */
  let c = null;
  const out = { base: BASE, frozen: new Date(FROZEN_MS).toISOString(), boardRows: boardRows().length, cells: {} };
  try {
    c = await launch();
    /* Both domains. `goto()` waits on Page.loadEventFired, and without Page.enable that event is
       never delivered — the script does not fail, it waits forever. */
    await c.send("Page.enable");
    await c.send("Runtime.enable");
    await reduceMotion(c);
    await seedRandom(c);
    await suppressInstallPrompt(c);
    /* The two init scripts that make this surface deterministic. Both must be in place before the
       module graph runs: `leaderboard.js` reads its config at module scope and the hub reads the ISO
       week on its first render. */
    await c.send("Page.addScriptToEvaluateOnNewDocument", { source: freezeClockSource() });
    await c.send("Page.addScriptToEvaluateOnNewDocument", { source: fetchStubSource({ champions: !EMPTY_CHAMPS }) });

    for (const lang of LANGS) {
      for (const [w, h] of SIZES) {
        await setViewport(c, { width: w, height: h, deviceScaleFactor: 1 });
        await goto(c, ORIGIN, { settleMs: 400 });
        await evaluate(c, seedScript(lang));

        for (const entry of ENTRIES) {
          /* Reload between entries rather than closing the overlay: the two entries are two mounts
             of the same component with different props, and a stale mount would carry its tab over. */
          await goto(c, ORIGIN, { settleMs: 1100 });
          await evaluate(c, SETTLE);
          const nav = await openEntry(c, entry);
          if (!nav.ok) {
            out.cells[`${lang}/${w}x${h}/${entry.id}`] = { reached: false, why: nav.why };
            continue;
          }
          for (let i = 0; i < entry.tabs.length; i++) {
            const key = `${lang}/${w}x${h}/${entry.id}/${entry.tabs[i]}`;
            const t = await evaluate(c, clickTab(i));
            if (!t.ok) { out.cells[key] = { reached: false, why: t.why }; continue; }
            await sleep(900);
            await evaluate(c, SETTLE);
            const probe = await evaluate(c, PROBE);
            /* THE ASSERTION THAT MAKES THIS HARNESS WORTH RUNNING. If the stub did not take, the
               board renders the "unavailable" line and every geometry below is of a different
               screen — silently, with no error anywhere. The two list tabs must have rows. */
            if ((entry.tabs[i] === "global" || entry.tabs[i] === "week") && probe.rowCount === 0) {
              throw new Error(`${key}: no board rows — the fetch stub did not take. `
                + `A capture of the unavailable line is not a capture of the leaderboard.`);
            }
            /* THE SECOND ASSERTION, and it is the one the seed's schema stamp is checked by. Without
               it the ranked cockpit quietly renders the LOCKED line instead of the play button, and
               the whole cockpit column is then a different screen — measured once, before the stamp
               went in. Only the ranked entry has a cockpit; the board entry deliberately has none. */
            if (entry.id === "ranked" && entry.tabs[i] === "week" && probe.playCta === 0) {
              throw new Error(`${key}: the ranked cockpit has no play button — `
                + `rankedUnlocked() is false, i.e. the seeded profile did not survive the boot. `
                + `Check PROFILE_SCHEMA_VERSION in seed.mjs against src/game/storage.js.`);
            }
            out.cells[key] = { reached: true, ...probe };
            if (SHOTS) writeShot(join(OUT, `${entry.id}-${entry.tabs[i]}-${lang}-${w}x${h}.png`),
              await screenshot(c, null, {}));
          }
        }
        process.stdout.write(`  ${lang} · ${w}x${h} ok\n`);
      }
    }
  } finally {
    try { if (c) await c.close(); } catch { /* the browser may already be gone */ }
    await server.stop();
  }
  writeFileSync(join(OUT, "geometry.json"), JSON.stringify(out, null, 1));
  console.log(`geometry.json written — ${Object.keys(out.cells).length} cells`);
}

main().catch((e) => { console.error(e); process.exit(1); });
