#!/usr/bin/env node
/* #mainscreen-branding C2 — the lockup: measured, and shown on two decks.
   ============================================================================

     npm run build
     node docs/workstreams/mainscreen-branding/evidence/C2/lockup.mjs

   TWO JOBS, ONE NAVIGATION EACH, and they are in one file because they need the same page in the
   same state: the geometry of wordmark, tagline and mark, and the owner-facing images.

   WHY THE DECK MATTERS AND THE MOCKUP COULD NOT SAY SO. The mark is deck-tinted at seven places on
   this screen, and the mockup was rendered with ONE deck. There are 52. So every cell here runs
   twice: **Thron I** (`#8f0f2a`) is the darkest of the looks the design names, **Obsidian**
   (`#e8edf5`) is the brightest — the two ends of the range the design's own open point is about.

   WHAT THE MEASUREMENT IS FOR. C1 predicted the composition from an inserted stand-in. This measures
   the REAL one, and the two have to agree — that is the whole point of C1 existing as its own
   commit. Every number C1's decision block gave the owner is re-derived here against the built
   screen (measurement record, Part 3).

   REACHABILITY IS REPORTED, NEVER ASSUMED, and each reach is written as *contains no X other than
   Y*: the head zone must carry exactly one wordmark, exactly one cell column INSIDE it, exactly one
   tagline, and exactly one standalone mark that is NOT the column — the shape that catches the case
   where a selector quietly matches the wrong one of the two cuts. */

import { writeFileSync, mkdirSync, readFileSync, existsSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { launch, setViewport, reduceMotion, seedRandom, suppressInstallPrompt,
  goto, evaluate, screenshot } from "../../../../../scripts/cdp.mjs";
import { fetchStubSource, freezeClockSource } from "../../../../../scripts/survey-stub.mjs";
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
const OUT = join(HERE, "owner");

/* 1280x720 first — the binding case, and the size the composition was decided against. */
const SIZES = [[1280, 720], [1920, 1080]];
const LANGS = ["de", "en"];
/* The two ends of the deck-brightness range, named by the design's own open point. */
const DECKS = [
  { key: "dark", deckId: "deck_thron1", bfId: "bf_thron1", a1: "#8f0f2a",
    /* Thron I is a `championWeek` unlock, so the profile has to have won a week. */
    profile: { championWeeks: 1 },
    why: "Thron I — the darkest look the design names" },
  { key: "bright", deckId: "deck_obsidian", bfId: "bf_obsidian", a1: "#e8edf5",
    /* Obsidian is a `buy` unlock, so the profile has to own the pack. */
    profile: { ownedCosmetics: { "pack:obsidian": true } },
    why: "Obsidian — the brightest" },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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

/* The deck is chosen through the SAME option keys the workshop writes (`deckId`/`battlefieldId`,
   `storage.js`), not through a test-only hook. A capture that reaches its state by a route no player
   has is a capture of something nobody sees.

   AND THE PROFILE HAS TO OWN THE DECK, which is the thing the first run of this file got wrong and
   the reason the note below exists. `resolveSkinId` (`cosmetics.js:313`) hands back `"default"` for
   any deck the profile has not unlocked, `resolvePackByDeckId("default")` is null, and App then sets
   NO `--deck-a1` at all. So the first run rendered both the dark and the bright cell in the same
   cyan — the CSS fallback — and the probe read an empty `--deck-a1` and printed it without comment.

   That is a finding about the harness and not only about this file: the survey seeds a fresh profile
   too, so **no `hub` cell in any matrix this round has ever carried a deck colour.** Recorded as
   C2-F02. Here the unlock condition is satisfied the way the game satisfies it — a won week for
   Thron, an owned pack for Obsidian — and the probe now FAILS the cell if `--deck-a1` is empty
   rather than reporting a blank. */
const seedScript = (lang, deck) => `(() => {
  localStorage.setItem("as_options", JSON.stringify({ lang: ${JSON.stringify(lang)}, muted: true,
    telemetry: false, reducedFx: "an", testViewport: null,
    deckId: ${JSON.stringify(deck.deckId)}, battlefieldId: ${JSON.stringify(deck.bfId)} }));
  localStorage.setItem("as_profile", JSON.stringify(${JSON.stringify(deck.profile)}));
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
  await Promise.all(imgs.map(async (i) => {
    if (!await race(loaded(i), 5000, false)) return false;
    return race(i.decode().then(() => true).catch(() => true), 2000, false);
  }));
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  return { fontsOk, images: imgs.length };
})()`;

const PROBE = `(() => {
  const out = { reached: true, why: [] };
  const doc = document.documentElement;
  const box = (e) => { const r = e.getBoundingClientRect();
    return { x: +r.x.toFixed(2), y: +r.y.toFixed(2), w: +r.width.toFixed(2), h: +r.height.toFixed(2) }; };
  const all = (s) => Array.prototype.slice.call(document.querySelectorAll(s));

  /* --- the reaches, each as "contains no X other than Y" ------------------- */
  const play = document.querySelector(".hub-play");
  if (!play) { out.reached = false; out.why.push("no .hub-play"); return out; }

  const marks = all(".hub-play .as-wordmark");
  if (marks.length !== 1) { out.reached = false; out.why.push(marks.length + " wordmarks in .hub-play, expected 1"); }

  /* The cell column must be INSIDE the wordmark, and there must be no second brandgrid in there. */
  const inWord = marks[0] ? Array.prototype.slice.call(marks[0].querySelectorAll(".as-brandgrid")) : [];
  const cols = inWord.filter((e) => e.classList.contains("as-brandgrid-column"));
  if (inWord.length !== 1 || cols.length !== 1) {
    out.reached = false;
    out.why.push(inWord.length + " brandgrids inside the wordmark, " + cols.length + " of them the column cut — expected 1/1");
  }

  const tags = all(".hub-play .as-tagline");
  if (tags.length !== 1) { out.reached = false; out.why.push(tags.length + " taglines, expected 1"); }

  /* The standalone mark: a brandgrid in the head zone that is NOT inside the wordmark and is NOT the
     column cut. Written this way round on purpose — "the second brandgrid" would pass on the column
     the day someone adds a third. */
  const outside = all(".hub-play .as-brandgrid").filter((e) => !marks[0] || !marks[0].contains(e));
  const fulls = outside.filter((e) => e.classList.contains("as-brandgrid-full"));
  if (outside.length !== 1 || fulls.length !== 1) {
    out.reached = false;
    out.why.push(outside.length + " brandgrids outside the wordmark, " + fulls.length + " of them the full cut — expected 1/1");
  }
  if (!out.reached) return out;

  const wm = marks[0], col = cols[0], tag = tags[0], mark = fulls[0];
  const cs = (e) => getComputedStyle(e);

  out.page = { scrollH: doc.scrollHeight, innerH: window.innerHeight,
    overflowPx: doc.scrollHeight - window.innerHeight, playLayoutH: play.offsetHeight,
    standLayoutH: document.querySelector(".hub-stand").offsetHeight };

  out.wordmark = { box: box(wm), layoutW: wm.offsetWidth, layoutH: wm.offsetHeight,
    wmSize: cs(wm).getPropertyValue("--wm-size").trim(), fontSize: cs(wm).fontSize,
    text: (wm.textContent || "").trim(), align: cs(play).alignItems };
  /* The column's overshoot, measured rather than trusted: how far it stands above and below the
     wordmark's own text box. The design asks for it on BOTH sides and calls it deliberate. */
  /* AN SVG ELEMENT HAS NO offsetWidth. It is not an HTMLElement, so the layout-box properties are
     simply absent and read as undefined — which prints as "undefinedxundefined" and not as an error.
     Measured on the first run of this file. The rect is the only box an SVG has here. */
  out.column = { box: box(col), cssW: +col.getBoundingClientRect().width.toFixed(2),
    cssH: +col.getBoundingClientRect().height.toFixed(2),
    overshootTop: +(wm.getBoundingClientRect().top - col.getBoundingClientRect().top).toFixed(2),
    overshootBottom: +(col.getBoundingClientRect().bottom - wm.getBoundingClientRect().bottom).toFixed(2),
    cells: col.querySelectorAll(".as-bg-cell").length,
    hot: col.querySelectorAll(".as-bg-hot").length,
    mid: col.querySelectorAll(".as-bg-mid").length,
    quiet: col.querySelectorAll(".as-bg-quiet").length };
  out.tagline = { box: box(tag), text: (tag.textContent || "").trim(),
    fontSize: cs(tag).fontSize, lineHeight: cs(tag).lineHeight,
    letterSpacing: cs(tag).letterSpacing, colour: cs(tag).color,
    dots: all(".hub-play .as-tagline-dot").length,
    dotColour: all(".hub-play .as-tagline-dot")[0] ? cs(all(".hub-play .as-tagline-dot")[0]).color : null };
  out.mark = { box: box(mark), cssW: +mark.getBoundingClientRect().width.toFixed(2),
    cssH: +mark.getBoundingClientRect().height.toFixed(2),
    cells: mark.querySelectorAll(".as-bg-cell").length,
    hot: mark.querySelectorAll(".as-bg-hot").length,
    mid: mark.querySelectorAll(".as-bg-mid").length,
    quiet: mark.querySelectorAll(".as-bg-quiet").length,
    colour: cs(mark).color, filter: cs(mark).filter };

  /* --- does it read as ONE lockup: the three centre lines --------------------
     Not a matter of taste at this level: three elements read as one block when they share a centre.
     The three are reported as offsets from the column's centre, so "0, 0, 0" is the claim and any
     other number is the finding. */
  const mid = (e) => { const r = e.getBoundingClientRect(); return r.x + r.width / 2; };
  const colMid = play.getBoundingClientRect().x + play.getBoundingClientRect().width / 2;
  out.lockup = {
    wordmarkOffCentre: +(mid(wm) - colMid).toFixed(2),
    taglineOffCentre: +(mid(tag) - colMid).toFixed(2),
    markOffCentre: +(mid(mark) - colMid).toFixed(2),
    /* and the vertical rhythm, so the gaps are on record rather than in a screenshot */
    wordmarkToTagline: +(tag.getBoundingClientRect().top - wm.getBoundingClientRect().bottom).toFixed(2),
    taglineToMark: +(mark.getBoundingClientRect().top - tag.getBoundingClientRect().bottom).toFixed(2),
  };

  /* --- the deck reaches the mark, which is what a one-deck mockup could not show --- */
  /* "--deck-a1" is NOT on :root — App.jsx sets it on the stage node (App.jsx:1119), so it is read
     where it is USED and not where it was guessed to live. Reading :root returned an empty string on
     the first run, which is the shape of a probe that would have reported "no deck colour" on a
     screen that is fully deck-tinted. */
  const wmCS = cs(wm);
  const a1 = wmCS.getPropertyValue("--deck-a1").trim();
  if (!a1) { out.reached = false; out.why.push("--deck-a1 is empty — the profile does not own this deck, so the screen fell back"); }
  out.deck = { a1, a2: wmCS.getPropertyValue("--deck-a2").trim(),
    markColour: cs(mark).color, columnColour: cs(col).color };

  /* --- THE WORDMARK TRAP: the run header must not have been reached ---------
     The rule is scoped to .hub-play; this asserts the scoping from the other side, on the same page,
     rather than trusting the selector. ".as-wordmark-sm" is not mounted on the hub, so what is
     checked here is that no rule OUTSIDE .hub-play sets a size on the class — measured by planting
     one and reading it back. */
  const probe = document.createElement("h1");
  probe.className = "as-wordmark as-wordmark-sm";
  probe.setAttribute("data-c2-probe", "");
  probe.textContent = "PROBE";
  document.body.appendChild(probe);
  out.runHeaderProbe = { wmSize: getComputedStyle(probe).getPropertyValue("--wm-size").trim(),
    fontSize: getComputedStyle(probe).fontSize,
    hasCells: probe.querySelectorAll(".as-brandgrid").length };
  probe.remove();
  out.restored = { probesLeft: document.querySelectorAll("[data-c2-probe]").length };
  return out;
})()`;

async function main() {
  const server = await ensureServer();
  const conn = await launch({ port: 9338 });
  const cells = [];
  mkdirSync(OUT, { recursive: true });
  try {
    await conn.send("Page.enable");
    await conn.send("Runtime.enable");
    await reduceMotion(conn);
    await seedRandom(conn);
    await suppressInstallPrompt(conn);
    await conn.send("Page.addScriptToEvaluateOnNewDocument", { source: freezeClockSource() });
    await conn.send("Page.addScriptToEvaluateOnNewDocument", { source: fetchStubSource() });

    for (const deck of DECKS) {
      for (const lang of LANGS) {
        for (const [w, h] of SIZES) {
          const id = `${w}x${h}/${lang}/${deck.key}`;
          process.stdout.write(`  ${id} … `);
          await setViewport(conn, { width: w, height: h, deviceScaleFactor: 1 });
          await goto(conn, ORIGIN, { settleMs: 400 });
          await evaluate(conn, seedScript(lang, deck));
          await goto(conn, ORIGIN, { settleMs: 1400 });
          await evaluate(conn, SETTLE);
          const m = await evaluate(conn, PROBE);
          const file = join(OUT, `hub-${w}x${h}-${lang}-${deck.key}.png`);
          const png = await screenshot(conn);
          writeFileSync(file, Buffer.from(png, "base64"));
          cells.push({ id, size: `${w}x${h}`, lang, deck: deck.key, deckId: deck.deckId,
            image: `owner/${(file.split(/[\\/]/).pop())}`, ...m });
          process.stdout.write(m.reached
            ? `deck ${m.deck.a1} · mark ${m.mark.cssW}x${m.mark.cssH} `
              + `· off-centre ${m.lockup.wordmarkOffCentre}/${m.lockup.taglineOffCentre}/${m.lockup.markOffCentre} `
              + `· overflow ${m.page.overflowPx}\n`
            : `NOT REACHED: ${m.why.join("; ")}\n`);
        }
      }
    }
  } finally {
    await conn.close();
    await server.stop();
  }

  writeFileSync(join(HERE, "lockup.json"), JSON.stringify({ sizes: SIZES.map(([a, b]) => `${a}x${b}`),
    langs: LANGS, decks: DECKS, cells }, null, 2) + "\n");
  process.stdout.write(`\n  wrote ${join(HERE, "lockup.json")} and ${cells.length} PNGs in ${OUT}\n`);

  const bad = cells.filter((c) => !c.reached);
  if (bad.length) { process.stdout.write(`  ${bad.length} cell(s) NOT REACHED\n`); process.exitCode = 1; }
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
