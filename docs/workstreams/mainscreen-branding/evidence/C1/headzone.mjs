#!/usr/bin/env node
/* #mainscreen-branding C1 — the head-zone budget, re-derived.
   ============================================================================

     npm run build
     node docs/workstreams/mainscreen-branding/evidence/C1/headzone.mjs

   MEASURES AND DOES NOT REPAIR. C1 moves no pixel. Everything this file writes into the DOM is
   removed again before the cell ends, and the last act of every cell is to assert that the page is
   byte-for-byte the shape it arrived in (`restored`).

   WHY A SECOND INSTRUMENT AND NOT A SURVEY CELL. The survey answers "did anything move". This asks
   "how much room is there", which no capture can answer: the number does not exist in the rendered
   tree, only in what the tree would tolerate. So the budget is measured by ADDING height until the
   document scrolls and reporting the last value that did not — a bisection, not arithmetic.

   WHY BISECTION AND NOT A SUM. The four design documents that went to workers this round failed in
   exactly one way: their observations held and their predictions did not, and one of them had its
   height arithmetic stale in all three terms. A sum of row heights and gaps is a prediction. The
   largest spacer the layout accepts is an observation, and it is right even when I have misunderstood
   which of the three short-desktop blocks is firing.

   THE TWO TRAPS THIS PROBE HAD TO BE WRITTEN AROUND, both measured rather than assumed:

   1. `zoom: clamp(0.85, …, 1)` sits on `.hub-pair`. A px handed to a child of the pair is not a px
      on the screen. Every length below is therefore reported TWICE — `zoomPx` as the child writes
      it, `cssPx` as the viewport receives it — and the factor between them is read off the element
      (`offsetHeight` against `getBoundingClientRect().height`) instead of being taken from the rule.
   2. `.hub-pair { align-items: center }`. The pair is as tall as its TALLER column, so the first
      pixels the left column grows are free — they come out of the difference to the right column,
      not out of the page. A budget that did not separate those two stretches would read as generous
      and then fail at the first row that crosses over.

   REACHABILITY IS REPORTED, NEVER ASSUMED — the survey's rule, and it applies to a probe too. Each
   cell names the nodes it must have found; a cell that did not find them is recorded as
   `reached: false` with what was missing, and the run continues. */

import { writeFileSync, mkdirSync, readFileSync, existsSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { launch, setViewport, reduceMotion, seedRandom, suppressInstallPrompt,
  goto, evaluate } from "../../../../../scripts/cdp.mjs";
import { fetchStubSource, freezeClockSource, FROZEN_MS } from "../../../../../scripts/survey-stub.mjs";
import { assertServesDist } from "../../../../../scripts/survey-bundle.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "../../../../..");
const PORT = 5181;
const DIST = join(ROOT, "dist");
const BASE = (() => {
  const html = readFileSync(join(ROOT, "dist/index.html"), "utf8");
  const m = html.match(/<script[^>]+src="([^"]*)\/assets\//);
  return m && m[1] ? `${m[1]}/` : "/";
})();
const HOST = `http://localhost:${PORT}`;
const ORIGIN = `${HOST}${BASE}`;

/* 1280x720 FIRST, and that ordering is the contract's, not a convenience: it is the itch.io embed,
   it is where all the reserves are already spent, and it is the size the composition is decided
   against. A budget derived at 1920 and checked at 1280 is a budget derived at the wrong end. */
const SIZES = [[1280, 720], [1400, 700], [1536, 791], [1600, 900], [1920, 1080]];
const LANGS = ["de", "en"];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ------------------------------------------------------------------ server */

async function serverAlive() {
  try { return (await fetch(ORIGIN, { signal: AbortSignal.timeout(1500) })).ok; } catch { return false; }
}

async function ensureServer() {
  if (await serverAlive()) {
    await assertServesDist(HOST, DIST, { when: "inherited server, checked before the run" });
    process.stdout.write(`  reusing the server on ${PORT} — verified against dist/\n`);
    return { stop: async () => {} };
  }
  const viteBin = join(ROOT, "node_modules", "vite", "bin", "vite.js");
  if (!existsSync(viteBin)) throw new Error("vite not found — run `npm ci` in this worktree first.");
  const proc = spawn(process.execPath, [viteBin, "preview", "--port", String(PORT), "--strictPort", "--base", BASE],
    { cwd: ROOT, stdio: "ignore" });
  for (let i = 0; i < 150; i++) {
    if (await serverAlive()) {
      const stop = async () => { proc.kill(); await sleep(300); };
      try { await assertServesDist(HOST, DIST, { when: "own server, checked before the run" }); }
      catch (e) { await stop(); throw e; }
      process.stdout.write(`  started a server on ${PORT} — verified against dist/\n`);
      return { stop };
    }
    await sleep(200);
  }
  proc.kill();
  throw new Error(`vite preview did not come up on ${PORT}`);
}

/* ------------------------------------------------------------------ controls
   The survey's controls, minus the ones only a capture needs. The board stub and the pinned clock
   are NOT optional here even though nothing is screenshotted: the right column carries the
   leaderboard and an ISO-week chip, and the pair is as tall as its taller column — so a live board
   or a week rollover would move the very number this file exists to produce. */

const profileFor = (lang) => ({ lang, muted: true, telemetry: false, reducedFx: "an", testViewport: null });
const seedScript = (lang) => `(() => {
  localStorage.setItem("as_options", ${JSON.stringify(JSON.stringify(profileFor("__L__")))}.replace("__L__", ${JSON.stringify(lang)}));
  localStorage.setItem("as_username", "SURVEY");
  return true;
})()`;

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
  const settled = await Promise.all(imgs.map(async (i) => {
    if (!await race(loaded(i), 5000, false)) return false;
    return race(i.decode().then(() => true).catch(() => true), 2000, false);
  }));
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  return { fontsOk, images: imgs.length, timedOut: settled.filter((ok) => !ok).length };
})()`;

/* ------------------------------------------------------------------ the probe

   Runs entirely in the page. Written as one expression so the whole measurement is one round trip
   and nothing can land between two halves of it.

   THE MARK'S GEOMETRY IS THE DESIGN'S OWN TABLE, not a shape I chose: cell `.09em`, gutter `.022em`,
   border `.012em`, radius `.014em`, all relative to `--wm-size` (`mainscreen-marke.md`, "Maße").
   The design derives a column of eight from it at `.874em`; this probe re-derives that number from
   the parts and reports both, so a transcription error in either shows up as a disagreement rather
   than as agreement with itself. The full sign is the same cells at 5 x 8. */
const PROBE = `(() => {
  const out = { reached: true, missing: [] };
  const q = (s) => document.querySelector(s);
  const need = (s) => { const e = q(s); if (!e) { out.reached = false; out.missing.push(s); } return e; };

  const root = need(".hub-root"), pair = need(".hub-pair"), play = need(".hub-play"),
        stand = need(".hub-stand"), foot = need(".hub-foot"), wm = need(".hub-play .as-wordmark");
  if (!out.reached) return out;

  const doc = document.documentElement;
  const box = (e) => { const r = e.getBoundingClientRect();
    return { x: +r.x.toFixed(2), y: +r.y.toFixed(2), w: +r.width.toFixed(2), h: +r.height.toFixed(2) }; };
  const cs = (e) => getComputedStyle(e);
  const num = (v) => { const n = parseFloat(v); return Number.isFinite(n) ? +n.toFixed(3) : v; };

  /* --- the zoom factor, read off the element rather than off the rule -------
     offsetHeight is the LAYOUT height, in the units a child writes. The rect is what the viewport
     receives. Their ratio IS the effective zoom, whatever the clamp resolved to and whether or not
     the engine understood tan(atan2(...)). */
  const zoomOf = (e) => { const oh = e.offsetHeight, rh = e.getBoundingClientRect().height;
    return oh > 0 ? +(rh / oh).toFixed(4) : null; };

  out.viewport = { w: window.innerWidth, h: window.innerHeight, dpr: window.devicePixelRatio };
  out.scrolls = { scrollH: doc.scrollHeight, clientH: doc.clientHeight,
    overflowPx: doc.scrollHeight - window.innerHeight,
    scrollbar: window.innerWidth - doc.clientWidth };

  out.zoom = { declared: cs(pair).zoom, effectivePair: zoomOf(pair), effectiveFoot: zoomOf(foot) };

  out.blocks = {
    /* Which of the short-desktop blocks is actually live. Asked of the engine, not of the file. */
    "min-1280": matchMedia("(min-width: 1280px)").matches,
    "max-h-950": matchMedia("(min-width: 1280px) and (max-height: 950px)").matches,
    "max-h-900": matchMedia("(min-width: 1280px) and (max-height: 900px)").matches,
    "max-h-820": matchMedia("(min-width: 1280px) and (max-height: 820px)").matches,
  };

  out.boxes = { root: box(root), pair: box(pair), play: box(play), stand: box(stand), foot: box(foot),
    wordmark: box(wm) };
  out.layoutH = { play: play.offsetHeight, stand: stand.offsetHeight, pair: pair.offsetHeight };
  out.rhythm = {
    rootGap: num(cs(root).rowGap), rootPadTop: num(cs(root).paddingTop),
    playGap: num(cs(play).rowGap), standGap: num(cs(stand).rowGap),
    pairColGap: num(cs(pair).columnGap), playAlign: cs(play).alignItems, pairAlign: cs(pair).alignItems,
  };
  out.wordmark = {
    wmSize: num(cs(wm).getPropertyValue("--wm-size")), fontSize: num(cs(wm).fontSize),
    lineHeight: num(cs(wm).lineHeight), marginTop: num(cs(wm).marginTop),
    letterSpacing: num(cs(wm).letterSpacing), text: (wm.textContent || "").trim(),
    chars: (wm.textContent || "").trim().length,
  };

  /* --- the two stretches of the budget ------------------------------------
     "columnHeadroom" is what the left column may grow before it becomes the taller of the two and
     starts pushing the page; "pageHeadroom" is what it may grow before the page scrolls. The first
     is free height, the second is the whole budget. Both in the units a CHILD of .hub-play writes,
     which is what a composition has to spend. */
  out.columns = { playLayoutH: play.offsetHeight, standLayoutH: stand.offsetHeight,
    columnHeadroom: +(stand.offsetHeight - play.offsetHeight).toFixed(2) };

  const probe = document.createElement("div");
  probe.setAttribute("data-c1-probe", "");
  probe.style.cssText = "flex:0 0 auto;width:1px;padding:0;margin:0;";
  play.appendChild(probe);
  const fits = (h) => { probe.style.height = h + "px";
    void doc.offsetHeight;                                   /* force layout before reading */
    return doc.scrollHeight <= window.innerHeight; };

  /* Bisection to 0.5 px. The upper bound is opened by doubling rather than guessed, so a viewport
     with a great deal of slack is measured rather than clipped at whatever ceiling I picked. */
  let lo = 0, hi = 1;
  if (!fits(0)) { lo = hi = 0; out.alreadyOverflows = true; }
  else { while (hi < 4096 && fits(hi)) { lo = hi; hi *= 2; } }
  while (hi - lo > 0.5) { const mid = (lo + hi) / 2; if (fits(mid)) lo = mid; else hi = mid; }
  probe.style.height = "0px";

  /* THE GAP IS PART OF THE PRICE. .hub-play is a flex column with a row gap, so the row that
     carries the probe cost one gap before it carried a single pixel. Reported separately rather
     than folded in: a composition that adds ONE wrapper pays it once, one that adds two rows pays
     it twice, and that difference is a real number at this viewport. */
  const gap = parseFloat(cs(play).rowGap) || 0;
  out.budget = { probeMax: +lo.toFixed(2), gapPerRow: +gap.toFixed(2),
    oneRowTotal: +(lo + gap).toFixed(2), zoomedIntoCssPx: out.zoom.effectivePair };
  probe.remove();

  /* --- the mark, at its real 5 x 8 height ---------------------------------
     Built from the design's em table and MEASURED, not computed: the element is inserted, its rect
     is read, and it is removed again. "cell"/"gutter" are resolved against the live --wm-size, so
     if the wordmark's size ever moves the mark's does too, which is the whole point of the table
     being written in em. */
  const wmPx = parseFloat(cs(wm).getPropertyValue("--wm-size")) || parseFloat(cs(wm).fontSize);
  const EM = { cell: 0.09, gutter: 0.022, border: 0.012, radius: 0.014, colHeight: 0.874 };
  const mkGrid = (cols, rows, cellPx, gutPx) => {
    const g = document.createElement("div");
    g.setAttribute("data-c1-probe", "");
    g.style.cssText = "display:grid;width:max-content;box-sizing:content-box;padding:0;margin:0;"
      + "grid-template-columns:repeat(" + cols + "," + cellPx + "px);"
      + "grid-auto-rows:" + cellPx + "px;gap:" + gutPx + "px;";
    for (let i = 0; i < cols * rows; i++) {
      const c = document.createElement("i");
      c.style.cssText = "display:block;box-sizing:border-box;border:" + (EM.border * wmPx) + "px solid;"
        + "border-radius:" + (EM.radius * wmPx) + "px;";
      g.appendChild(c);
    }
    return g;
  };
  const measureGrid = (cols, rows, cellPx, gutPx) => {
    const g = mkGrid(cols, rows, cellPx, gutPx);
    play.appendChild(g); void doc.offsetHeight;
    const r = g.getBoundingClientRect();
    const m = { layoutW: g.offsetWidth, layoutH: g.offsetHeight, cssW: +r.width.toFixed(2), cssH: +r.height.toFixed(2) };
    g.remove(); return m;
  };

  const cellPx = +(EM.cell * wmPx).toFixed(4), gutPx = +(EM.gutter * wmPx).toFixed(4);
  out.mark = {
    wmPx, cellPx, gutPx,
    borderPx: +(EM.border * wmPx).toFixed(4), radiusPx: +(EM.radius * wmPx).toFixed(4),
    /* the column inside the I — eight cells, one wide */
    column: measureGrid(1, 8, cellPx, gutPx),
    /* the design's own figure for that column, for the disagreement check */
    columnPerDesign: +(EM.colHeight * wmPx).toFixed(2),
    /* the standalone sign — the same cells at 5 x 8, which is what C2 puts under the tagline */
    full: measureGrid(5, 8, cellPx, gutPx),
  };
  /* The same sign at smaller cells, so the budget can be read against a size rather than only
     against a yes/no. Cell sizes as a fraction of the I-column's cell. */
  out.markScale = [1, 0.85, 0.7, 0.6, 0.5, 0.4].map((k) => {
    const m = measureGrid(5, 8, +(cellPx * k).toFixed(4), +(gutPx * k).toFixed(4));
    return { k, cellPx: +(cellPx * k).toFixed(3), layoutH: m.layoutH, layoutW: m.layoutW,
      cssH: m.cssH, cssW: m.cssW };
  });

  /* --- the tagline, at the nearest existing role --------------------------
     NO SIZE IS INTRODUCED. The size is read from --text-body-lg on :root, which is the ladder step
     nearest the design's 15px, and the design's own letter-spacing is applied. The family and
     weight are the ones .hub-play already inherits. What is measured is the line box and the
     rendered width in both languages, because the width is what decides whether the lockup reads
     as one block or as a caption that outruns the mark. */
  const rootCS = getComputedStyle(doc);
  const roleSize = rootCS.getPropertyValue("--text-body-lg").trim();
  const TAG = { de: "Legen. Stechen. Eskalieren.", en: "Order. Trick. Escalate." };
  const measureTag = (text, size) => {
    const s = document.createElement("div");
    s.setAttribute("data-c1-probe", "");
    s.style.cssText = "display:block;width:max-content;margin:0;padding:0;letter-spacing:.05em;"
      + "white-space:nowrap;font-size:" + size + ";";
    s.textContent = text;
    play.appendChild(s); void doc.offsetHeight;
    const r = s.getBoundingClientRect();
    const m = { fontSize: +parseFloat(getComputedStyle(s).fontSize).toFixed(2),
      lineHeight: +parseFloat(getComputedStyle(s).lineHeight).toFixed(2),
      layoutH: s.offsetHeight, layoutW: s.offsetWidth,
      cssH: +r.height.toFixed(2), cssW: +r.width.toFixed(2) };
    s.remove(); return m;
  };
  out.tagline = { roleToken: "--text-body-lg", roleSize,
    designSize: "15px (mainscreen-marke.md) — nearest rung is the role above",
    de: measureTag(TAG.de, roleSize), en: measureTag(TAG.en, roleSize),
    /* the ladder's neighbours, so the owner sees what the alternatives cost rather than one number */
    atBody: measureTag(TAG.de, rootCS.getPropertyValue("--text-body").trim()),
    atMeta: measureTag(TAG.de, rootCS.getPropertyValue("--text-meta").trim()) };

  /* --- the composition, tried for real ------------------------------------
     The decisive test, and it is deliberately not a sum: tagline and mark are inserted after the
     wordmark exactly as C2 would place them, and the page is asked whether it scrolls. Repeated
     for each mark scale so the answer is "which sizes hold", not "does it hold". */
  out.compose = out.markScale.map(({ k, cellPx: cp }) => {
    const tag = document.createElement("div");
    tag.setAttribute("data-c1-probe", "");
    tag.style.cssText = "display:block;margin:0;padding:0;letter-spacing:.05em;white-space:nowrap;font-size:" + roleSize + ";";
    tag.textContent = TAG.de;
    const grid = mkGrid(5, 8, cp, +(cp * (EM.gutter / EM.cell)).toFixed(4));
    wm.after(tag); tag.after(grid);
    void doc.offsetHeight;
    const r = { k, cellPx: cp, scrollH: doc.scrollHeight, innerH: window.innerHeight,
      overflowPx: +(doc.scrollHeight - window.innerHeight).toFixed(2),
      holds: doc.scrollHeight <= window.innerHeight,
      playLayoutH: play.offsetHeight, standLayoutH: stand.offsetHeight };
    tag.remove(); grid.remove();
    return r;
  });

  /* --- the OTHER column, because the measurement moved the constraint ------
     Not in C1's brief as written, and it is here because the numbers above put it there: the left
     column never becomes the taller of the two, so the page height is decided by .hub-stand. The
     deck panel is C3's subject and it GROWS — the design takes the deck art from 112 px to a
     196 x 268 framed field — so the budget that matters for C3 is this one, and it is cheaper to
     take it in the same run than to discover it in C3 with the panel already composed. */
  /* THE DECK PANEL IS REACHED BY WHAT IT IS NOT. Two children of .hub-stand carry ".as-ring" — the
     deck panel and the hub tile bank — so "the ring-bearing child" would have measured whichever
     came first. Written as *contains no ring-bearing child other than one tile bank and one panel*,
     which is the shape this round learned eight times: a reach that asks whether something is
     PRESENT eventually passes on the wrong thing. */
  const ringed = Array.prototype.slice.call(stand.children).filter((c) => c.classList.contains("as-ring"));
  const banks = ringed.filter((c) => c.classList.contains("as-hub-list"));
  const panels = ringed.filter((c) => !c.classList.contains("as-hub-list"));
  const deckOk = ringed.length === 2 && banks.length === 1 && panels.length === 1;
  const deck = deckOk ? panels[0] : null;
  out.deckPanel = deckOk
    ? { reached: true, box: box(deck), layoutH: deck.offsetHeight, layoutW: deck.offsetWidth,
        cls: (deck.getAttribute("class") || ""),
        rootClass: "none of its own — reached as the non-bank ring-bearing child of .hub-stand",
        art: (() => { const img = deck.querySelector("img");
          return img ? { layoutW: img.offsetWidth, layoutH: img.offsetHeight,
            cssW: +img.getBoundingClientRect().width.toFixed(2),
            cssH: +img.getBoundingClientRect().height.toFixed(2) } : null; })() }
    : { reached: false, why: ringed.length + " ring-bearing children, " + banks.length + " bank(s), "
        + panels.length + " panel(s) — expected 2/1/1" };

  /* --- the OTHER column, because the measurement moved the constraint ------
     Not in C1's brief as written, and it is here because the numbers above put it there: the left
     column never becomes the taller of the two, so the page height is decided by .hub-stand. The
     deck panel is C3's subject and it GROWS — the design takes the deck art from 112 px to a
     196 x 268 framed field — so the budget that matters for C3 is this one, and it is cheaper to
     take it in the same run than to discover it in C3 with the panel already composed.

     GROWN, NOT APPENDED. A spacer child would pay a row gap before it paid a pixel, and C3 does not
     add a row to this column — it makes an existing panel taller. So the panel's own min-height is
     raised instead, and what is reported is the DELTA it tolerates. */
  out.standBudget = { reached: deckOk };
  if (deckOk) {
    const was = deck.offsetHeight;
    const before = deck.style.minHeight;
    const standFits = (h) => { deck.style.minHeight = (was + h) + "px"; void doc.offsetHeight;
      return doc.scrollHeight <= window.innerHeight; };
    let slo = 0, shi = 1;
    const zeroFits = standFits(0);
    if (zeroFits) { while (shi < 4096 && standFits(shi)) { slo = shi; shi *= 2; }
      while (shi - slo > 0.5) { const mid = (slo + shi) / 2; if (standFits(mid)) slo = mid; else shi = mid; } }
    deck.style.minHeight = before; void doc.offsetHeight;
    out.standBudget = { reached: true, panelWas: was, zeroFits, growthMax: zeroFits ? +slo.toFixed(2) : 0,
      restored: deck.offsetHeight === was };
  }

  /* What C3's growth costs, tried rather than predicted: the deck art is swapped for the design's
     196 x 268 framed field and the page is asked whether it scrolls. Restored afterwards, asserted. */
  const artImg = deckOk ? deck.querySelector("img") : null;
  if (artImg) {
    const bw = artImg.style.width, bh = artImg.style.height;
    const wasH = artImg.offsetHeight, wasW = artImg.offsetWidth, standWas = stand.offsetHeight;
    artImg.style.width = "196px"; artImg.style.height = "268px";
    void doc.offsetHeight;
    out.c3Probe = { reached: true, artWas: { w: wasW, h: wasH }, artAt: { w: 196, h: 268 },
      standWas, standLayoutH: stand.offsetHeight, scrollH: doc.scrollHeight, innerH: window.innerHeight,
      overflowPx: +(doc.scrollHeight - window.innerHeight).toFixed(2),
      holds: doc.scrollHeight <= window.innerHeight };
    artImg.style.width = bw; artImg.style.height = bh;
    void doc.offsetHeight;
    out.c3Probe.artRestored = artImg.offsetWidth === wasW && artImg.offsetHeight === wasH;
  } else out.c3Probe = { reached: false, why: "no deck art image in the deck panel" };

  /* --- the three options, priced ------------------------------------------
     C1 does not choose. It measures what each of the three obvious ways out actually costs, so the
     owner decides against numbers rather than against three sentences. All three are tried on the
     live page and undone again; the restoration is asserted with the rest.

       A  the art is as large as the viewport allows, and reaches 196 x 268 only where it fits
       B  the art is 196 x 268 everywhere and the tile bank below gives up the difference
       C  the art is 196 x 268 everywhere and the zoom floor drops below 0.85

     A fourth — let the page scroll at 1280 x 720 — is measured implicitly (c3Probe.overflowPx) and
     is named in the record rather than priced here, because scrolling the itch.io embed is the one
     outcome the 1280 threshold was moved to prevent. */
  const bank = deckOk ? banks[0] : null;
  if (artImg && bank) {
    const bw = artImg.style.width, bh = artImg.style.height, bmh = bank.style.maxHeight;
    const pz = pair.style.zoom;
    const wasW = artImg.offsetWidth, wasH = artImg.offsetHeight, bankWas = bank.offsetHeight;
    const RATIO = 196 / 268;
    const fits = () => { void doc.offsetHeight; return doc.scrollHeight <= window.innerHeight; };

    /* A — the tallest art the page tolerates, width kept at the design ratio. */
    const setArt = (h) => { artImg.style.height = h + "px"; artImg.style.width = (h * RATIO) + "px"; };
    let alo = 0, ahi = 268;
    setArt(0); const artZeroFits = fits();
    if (artZeroFits) { while (ahi - alo > 0.5) { const mid = (alo + ahi) / 2; setArt(mid); if (fits()) alo = mid; else ahi = mid; } }
    const optionA = { artHeightMax: artZeroFits ? +alo.toFixed(1) : 0,
      artWidthAtMax: artZeroFits ? +(alo * RATIO).toFixed(1) : 0,
      designAsks: 268, todayIs: wasH, reachesDesign: artZeroFits && alo >= 268 };

    /* B — art at the design size, and the tile bank capped until the page fits again. */
    setArt(268);
    let blo = bankWas, bhi = bankWas;
    const capBank = (h) => { bank.style.maxHeight = h + "px"; return fits(); };
    let bankFitsAt = null;
    if (!fits()) {
      blo = 0; bhi = bankWas;
      if (capBank(0)) { while (bhi - blo > 0.5) { const mid = (blo + bhi) / 2; if (capBank(mid)) blo = mid; else bhi = mid; }
        bankFitsAt = +blo.toFixed(1); }
    } else bankFitsAt = bankWas;
    const optionB = { bankWas, bankMustCapAt: bankFitsAt,
      bankGivesUp: bankFitsAt === null ? null : +(bankWas - bankFitsAt).toFixed(1),
      enoughAlone: bankFitsAt !== null && bankFitsAt > 0 };
    bank.style.maxHeight = bmh;

    /* C — art at the design size, and the zoom floor lowered until the page fits. */
    setArt(268);
    const zAt = (z) => { pair.style.zoom = String(z); return fits(); };
    let zlo = 0.5, zhi = 0.85, zoomNeeded = null;
    if (zAt(0.85)) zoomNeeded = 0.85;
    else if (zAt(0.5)) { while (zhi - zlo > 0.002) { const mid = (zlo + zhi) / 2; if (zAt(mid)) zlo = mid; else zhi = mid; }
      zoomNeeded = +zlo.toFixed(3); }
    pair.style.zoom = pz;

    /* The floor is 0.85 for a measured reason — below it the start button falls under 22 px — so
       what option C costs is reported as that button's height, not only as a factor. */
    const cta = document.querySelector(".hub-play .as-cta-primary, .hub-play .as-cta-ghost");
    const ctaAt = zoomNeeded && zoomNeeded < 0.85 && cta
      ? +(cta.offsetHeight * zoomNeeded).toFixed(1) : null;
    const optionC = { zoomFloorToday: 0.85, zoomNeeded,
      ctaLayoutH: cta ? cta.offsetHeight : null, ctaCssHAtNeededZoom: ctaAt,
      floorReasonIs: "below 0.85 the start button falls under 22 px (index.css, the zoom comment)" };

    setArt(wasH); artImg.style.width = bw; artImg.style.height = bh;
    void doc.offsetHeight;
    out.c3Options = { A: optionA, B: optionB, C: optionC,
      restored: artImg.offsetWidth === wasW && artImg.offsetHeight === wasH
        && bank.offsetHeight === bankWas && pair.style.zoom === pz };
  } else out.c3Options = { reached: false, why: "art image or tile bank not reached" };

  /* The two columns, child by child. This is the baseline composition: what is in each column now,
     in the order it stands, with the height each contributes. C2 and C3 are read against this. */
  const kids = (e) => Array.prototype.slice.call(e.children).map((c) => ({
    tag: c.tagName.toLowerCase(), cls: (c.getAttribute("class") || "").slice(0, 120),
    layoutH: c.offsetHeight, layoutW: c.offsetWidth,
    cssH: +c.getBoundingClientRect().height.toFixed(2), cssW: +c.getBoundingClientRect().width.toFixed(2) }));
  out.children = { play: kids(play), stand: kids(stand) };

  /* --- what centring the column would move, measured rather than argued ----
     The design wants the head zone CENTRED and argues it costs nothing because every block below
     runs the full column width. That is a prediction about eight boxes, and predictions are what
     the four design documents got wrong. So it is tried: "align-items: center" on ".hub-play", and
     every child's left edge and width recorded before and after. A block that does not run the full
     width will show up here as a moved x, and nowhere else until someone opens a screenshot. */
  const beforeAlign = cs(play).alignItems;
  const snap = () => Array.prototype.slice.call(play.children).map((c) => {
    const r = c.getBoundingClientRect();
    return { x: +r.x.toFixed(2), w: +r.width.toFixed(2) }; });
  const alignBefore = snap();
  const inlineAlign = play.style.alignItems;
  play.style.alignItems = "center";
  void doc.offsetHeight;
  const alignAfter = snap();
  play.style.alignItems = inlineAlign;
  void doc.offsetHeight;
  out.centringTrial = {
    was: beforeAlign,
    moved: alignBefore.map((b, i) => ({ i, dx: +(alignAfter[i].x - b.x).toFixed(2),
      dw: +(alignAfter[i].w - b.w).toFixed(2), w: b.w }))
      .filter((d) => d.dx !== 0 || d.dw !== 0),
    unchanged: alignBefore.filter((b, i) => alignAfter[i].x === b.x && alignAfter[i].w === b.w).length,
    total: alignBefore.length,
    restored: snap().every((s, i) => s.x === alignBefore[i].x && s.w === alignBefore[i].w),
  };

  /* --- restoration, asserted rather than trusted -------------------------- */
  void doc.offsetHeight;
  out.restored = { probesLeft: document.querySelectorAll("[data-c1-probe]").length,
    scrollH: doc.scrollHeight, playLayoutH: play.offsetHeight, standLayoutH: stand.offsetHeight };
  return out;
})()`;

/* ------------------------------------------------------------------ run */

async function main() {
  const server = await ensureServer();
  const conn = await launch({ port: 9337 });
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
        const id = `${w}x${h}/${lang}`;
        process.stdout.write(`  ${id} … `);
        await setViewport(conn, { width: w, height: h, deviceScaleFactor: 1 });
        await goto(conn, ORIGIN, { settleMs: 400 });
        await evaluate(conn, seedScript(lang));
        await goto(conn, ORIGIN, { settleMs: 1400 });
        const settle = await evaluate(conn, SETTLE);
        const m = await evaluate(conn, PROBE);
        cells.push({ id, size: `${w}x${h}`, lang, settle, ...m });
        process.stdout.write(m.reached
          ? `play +${m.budget.probeMax} · stand +${m.standBudget.growthMax} · free ${m.columns.columnHeadroom}`
            + ` · overflow ${m.scrolls.overflowPx} · lockup ${m.compose[0].holds ? "holds" : "SCROLLS"}`
            + ` · 196x268 ${m.c3Probe.holds ? "holds" : "SCROLLS by " + m.c3Probe.overflowPx}
`
          : `NOT REACHED: ${m.missing.join(", ")}\n`);
      }
    }
  } finally {
    await conn.close();
    await server.stop();
  }

  /* `--out <file>` added by C2, and it fixes a real accident rather than adding a convenience: the
     output path was HERE, so re-running this instrument against a changed tree OVERWROTE C1's
     committed evidence. Caught by `git status`, which is the same way the survey's `--out` was
     earned (#typo-system S0). The default stays put, so C1's own invocation is unchanged. */
  const outFile = (() => {
    const i = process.argv.indexOf("--out");
    return i >= 0 && process.argv[i + 1] ? resolve(process.argv[i + 1]) : join(HERE, "headzone.json");
  })();
  mkdirSync(dirname(outFile), { recursive: true });
  writeFileSync(outFile, JSON.stringify({
    takenAgainst: "production build in dist/", frozenClock: new Date(FROZEN_MS).toISOString(),
    sizes: SIZES.map(([a, b]) => `${a}x${b}`), langs: LANGS, cells,
  }, null, 2) + "\n");
  process.stdout.write(`\n  wrote ${outFile}\n`);

  const bad = cells.filter((c) => !c.reached);
  if (bad.length) { process.stdout.write(`  ${bad.length} cell(s) NOT REACHED\n`); process.exitCode = 1; }
  const dirty = cells.filter((c) => c.reached && c.restored.probesLeft !== 0);
  if (dirty.length) { process.stdout.write(`  ${dirty.length} cell(s) left a probe behind\n`); process.exitCode = 1; }
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
