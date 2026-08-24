#!/usr/bin/env node
/* #menu-rework M8 — the gate's printed blind spot, driven by hand.
   ============================================================================

   Every run of `viewport-survey.mjs` and of `surface-delta.mjs` prints the same line:

       "Surfaces only. Control states are not captured and are verified by hand."

   This is that hand. The survey holds every surface in its RESTING state — nothing hovers, nothing
   focuses, nothing is loading, nothing is empty — so no delta on any of those can appear in the
   machine half, and their ABSENCE there is not evidence.

   Eleven states, in three groups:

     POINTER / KEYBOARD  the navigation row hovered, the list row hovered, the two buttons hovered,
                         and a navigation row focused by keyboard. The nav row's hover is NEW in this
                         task — the tree has had it since `#up-form` and the copy never did — so it
                         is the one state here that no earlier capture could have contained.
     DATA                loading, empty board, empty archive, unreachable board. All four render
                         instead of the list, and all four are unreachable from a survey cell.
     INHERITED           the run window, opened from a board row. It is M7's, migrated under M7, and
                         this task must not touch it: the capture is the evidence that it still
                         opens and still looks like M7 left it.

   Each state is captured as a PNG and its computed values are written to `states.json`, so the
   record can quote a number rather than an impression.

     npm run build
     node docs/workstreams/desktop-menus/evidence/M8/states.mjs --out <dir>
*/

import { writeFileSync, readFileSync, mkdirSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { launch, setViewport, reduceMotion, seedRandom, suppressInstallPrompt, screenshot,
  goto, evaluate, sleep } from "../../../../../scripts/cdp.mjs";
import { seedBlob, fetchStubSource, freezeClockSource } from "./seed.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "../../../../..");
const arg = (n, f = null) => {
  const i = process.argv.indexOf(n);
  return i >= 0 && process.argv[i + 1] && !process.argv[i + 1].startsWith("--") ? process.argv[i + 1] : f;
};
const OUT = resolve(arg("--out", join(HERE, "states")));
const PORT = 5189;
const SIZE = [1536, 791];

const BASE = (() => {
  const html = readFileSync(join(ROOT, "dist/index.html"), "utf8");
  const m = html.match(/<script[^>]+src="([^"]*)\/assets\//);
  return m && m[1] ? `${m[1]}/` : "/";
})();
const ORIGIN = `http://localhost:${PORT}${BASE}`;

async function serverAlive() {
  try { return (await fetch(ORIGIN, { signal: AbortSignal.timeout(1500) })).ok; } catch { return false; }
}
async function ensureServer() {
  if (await serverAlive()) throw new Error(`something already answers on ${PORT} — stop it first.`);
  const viteBin = join(ROOT, "node_modules", "vite", "bin", "vite.js");
  const proc = spawn(process.execPath, [viteBin, "preview", "--port", String(PORT), "--strictPort", "--base", BASE],
    { cwd: ROOT, stdio: "ignore" });
  const stop = async () => {
    proc.kill();
    for (let i = 0; i < 25; i++) { if (!(await serverAlive())) return; await sleep(200); }
    process.stderr.write(`WARNING: ${PORT} still answers after kill.\n`);
  };
  for (let i = 0; i < 150; i++) { if (await serverAlive()) return { stop }; await sleep(200); }
  await stop();
  throw new Error(`vite preview did not come up on ${PORT}`);
}

const PNG_SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
function writeShot(path, b64) {
  writeFileSync(path, b64, "base64");
  const head = readFileSync(path).subarray(0, 8);
  if (!head.equals(PNG_SIG)) throw new Error(`${path} is not a PNG — first bytes ${head.toString("hex")}`);
}

/* Hover is DISPATCHED, not simulated with a class: `:hover` is a real selector and a class swap
   would prove that the class works, not that the state does. CDP's Input domain moves a real cursor,
   which is what makes the computed value below the actual one. */
async function hover(c, x, y) {
  await c.send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y, buttons: 0 });
  await sleep(260);
}

const READ = (sel, props) => `(() => {
  const el = document.querySelector(${JSON.stringify(sel)});
  if (!el) return null;
  const cs = getComputedStyle(el); const o = {};
  for (const p of ${JSON.stringify(props)}) o[p] = cs.getPropertyValue(p);
  const r = el.getBoundingClientRect();
  o.box = { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) };
  return o;
})()`;
const CENTRE = (sel, nth = 0) => `(() => {
  const all = Array.prototype.slice.call(document.querySelectorAll(${JSON.stringify(sel)}));
  const el = all[${nth}];
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) };
})()`;
const TEXT_OF = (sel) => `(() => { const e = document.querySelector(${JSON.stringify(sel)}); return e ? e.textContent.trim().slice(0, 90) : null; })()`;
const COUNT = (sel) => `(() => document.querySelectorAll(${JSON.stringify(sel)}).length)()`;

const clickSel = (sel, nth = 0) => `(() => {
  const all = Array.prototype.slice.call(document.querySelectorAll(${JSON.stringify(sel)}));
  const vis = all.filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; });
  const hit = vis[${nth}];
  if (!hit) return { ok: false, why: ${JSON.stringify(sel)} + " not found" };
  hit.click(); return { ok: true };
})()`;
const clickTile = (i) => clickSel(".as-hub-tile", i);

/* The four DATA states, each produced by a different stub — the point is that they are what the
   application does with those answers, not what a class does. */
const STUBS = {
  /* A request that never settles: the list stays in its loading state for as long as we look. */
  loading: `(() => { window.fetch = () => new Promise(() => {}); return true; })()`,
  /* An empty table. */
  empty: `(() => { const real = window.fetch.bind(window);
    window.fetch = (i, o) => (String(typeof i === "string" ? i : i.url).indexOf("autostich_scores") < 0)
      ? real(i, o)
      : Promise.resolve(new Response("[]", { status: 200, headers: { "content-type": "application/json" } }));
    return true; })()`,
  /* A board that answers with an error — the "unavailable" path. */
  error: `(() => { const real = window.fetch.bind(window);
    window.fetch = (i, o) => (String(typeof i === "string" ? i : i.url).indexOf("autostich_scores") < 0)
      ? real(i, o)
      : Promise.reject(new Error("offline"));
    return true; })()`,
};

async function main() {
  mkdirSync(OUT, { recursive: true });
  const server = await ensureServer();
  let c = null;
  const out = { size: SIZE.join("x"), states: {} };
  try {
    c = await launch();
    await c.send("Page.enable");
    await c.send("Runtime.enable");
    await reduceMotion(c);
    await seedRandom(c);
    await suppressInstallPrompt(c);
    await c.send("Page.addScriptToEvaluateOnNewDocument", { source: freezeClockSource() });
    const stubId = (await c.send("Page.addScriptToEvaluateOnNewDocument", { source: fetchStubSource() })).identifier;
    await setViewport(c, { width: SIZE[0], height: SIZE[1], deviceScaleFactor: 1 });
    await goto(c, ORIGIN, { settleMs: 400 });
    await evaluate(c, `(() => { try { localStorage.clear(); } catch (e) {} const b = ${JSON.stringify(seedBlob("de"))};
      for (const k of Object.keys(b)) localStorage.setItem(k, b[k]); return 1; })()`);

    const openRanked = async () => {
      await goto(c, ORIGIN, { settleMs: 1100 });
      const r = await evaluate(c, clickSel(".as-ranked-btn"));
      if (!r.ok) throw new Error("the ranked button did not open: " + r.why);
      await sleep(900);
    };
    const openBoard = async () => {
      await goto(c, ORIGIN, { settleMs: 1100 });
      const r = await evaluate(c, clickTile(2));
      if (!r.ok) throw new Error("hub tile 2 did not open: " + r.why);
      await sleep(900);
    };
    const record = async (name, value) => {
      out.states[name] = value;
      writeShot(join(OUT, `${name}.png`), await screenshot(c, null, {}));
      process.stdout.write(`  ${name}\n`);
    };

    const NAV_PROPS = ["background-color", "background-image", "border-radius", "box-shadow", "border-left-color", "color"];

    /* ---- 1. pointer, on the navigation column ---------------------------- */
    await openRanked();
    /* Park the cursor away from everything first: a mouse that has never moved still reports the
       resting state, which would make the "rest" reading below meaningless. */
    await hover(c, 5, 5);
    out.states["nav-rest"] = await evaluate(c, READ('.lb-tabs [role="tab"]:not([aria-selected="true"])', NAV_PROPS));
    await record("nav-rest", out.states["nav-rest"]);

    const navIdle = await evaluate(c, CENTRE('.lb-tabs [role="tab"]:not([aria-selected="true"])'));
    await hover(c, navIdle.x, navIdle.y);
    await record("nav-hover", await evaluate(c, READ('.lb-tabs [role="tab"]:not([aria-selected="true"])', NAV_PROPS)));

    await record("nav-active", await evaluate(c, READ('.lb-tabs [role="tab"][aria-selected="true"]', NAV_PROPS)));

    /* Keyboard focus, and it is a different question from hover: the row is a <button>, so it takes
       focus, and nothing in this task gave it a focus style of its own. */
    await evaluate(c, `(() => { const b = document.querySelectorAll('.lb-tabs [role="tab"]')[1]; b.focus(); return document.activeElement === b; })()`);
    await sleep(200);
    await record("nav-focus", await evaluate(c, READ('.lb-tabs [role="tab"]:focus', [...NAV_PROPS, "outline-color", "outline-width", "outline-style"])));

    /* ---- 2. pointer, on the play button and on close --------------------- */
    const cta = await evaluate(c, CENTRE(".lb-cockpit .as-cta-primary"));
    if (cta) { await hover(c, cta.x, cta.y); await record("cta-hover", await evaluate(c, READ(".lb-cockpit .as-cta-primary", ["background-color", "background-image", "box-shadow", "transform", "border-left-color"]))); }
    const close = await evaluate(c, CENTRE(".lb-head > button"));
    await hover(c, close.x, close.y);
    await record("close-hover", await evaluate(c, READ(".lb-head > button", ["background-color", "border-color", "border-left-color", "border-radius", "color"])));

    /* ---- 3. pointer, on a list row --------------------------------------- */
    await hover(c, 5, 5);
    out.states["row-rest"] = await evaluate(c, READ(".lb-page .lb-rows > button:nth-child(2)", ["background-color", "border-top-color", "border-radius", "filter"]));
    const row = await evaluate(c, CENTRE(".lb-page .lb-rows > button", 1));
    await hover(c, row.x, row.y);
    await record("row-hover", await evaluate(c, READ(".lb-page .lb-rows > button:nth-child(2)", ["background-color", "border-top-color", "border-radius", "filter"])));

    /* ---- 4. the inherited run window — M7's, and it must still be M7's ---- */
    await evaluate(c, clickSel(".lb-page .lb-rows > button", 1));
    await sleep(1000);
    await record("run-window", {
      present: await evaluate(c, COUNT(".rd-root")),
      card: await evaluate(c, READ(".rd-card", ["background-color", "background-image", "border-radius", "box-shadow"])),
      lanes: await evaluate(c, `(() => { const b = document.querySelector(".rd-body"); return b ? getComputedStyle(b).gridTemplateColumns : null; })()`),
      eyebrow: await evaluate(c, TEXT_OF(".rd-eyebrow")),
    });
    await evaluate(c, `(() => { const b = document.querySelector(".rd-close"); if (b) b.click(); return !!b; })()`);
    await sleep(400);

    /* ---- 5. the four data states ----------------------------------------- */
    await c.send("Page.removeScriptToEvaluateOnNewDocument", { identifier: stubId });
    for (const [name, source] of Object.entries(STUBS)) {
      const id = (await c.send("Page.addScriptToEvaluateOnNewDocument", { source })).identifier;
      await openBoard();
      await record(`data-${name}`, {
        rows: await evaluate(c, COUNT(".lb-page .lb-rows > button")),
        message: await evaluate(c, TEXT_OF(".lb-pagescroll > div")),
      });
      await c.send("Page.removeScriptToEvaluateOnNewDocument", { identifier: id });
    }

    /* The empty ARCHIVE is a fifth state and a different one: the champion list has its own empty
       text, and it is the state the design's open question 1 is about. */
    const id = (await c.send("Page.addScriptToEvaluateOnNewDocument", { source: fetchStubSource({ champions: false }) })).identifier;
    await openBoard();
    await evaluate(c, clickSel('.lb-tabs [role="tab"]', 2));
    await sleep(900);
    await record("data-empty-archive", {
      champions: await evaluate(c, COUNT(".lb-pagescroll .as-rank-icon")),
      card: await evaluate(c, READ(".lb-card", ["border-radius"])),
      message: await evaluate(c, `(() => { const n = Array.prototype.slice.call(document.querySelectorAll(".lb-pagescroll div"))
        .map((e) => e.textContent.trim()).filter((t) => t.length > 10 && t.length < 200); return n[n.length - 1] || null; })()`),
    });
    await c.send("Page.removeScriptToEvaluateOnNewDocument", { identifier: id });
  } finally {
    try { if (c) await c.close(); } catch { /* already gone */ }
    await server.stop();
  }
  writeFileSync(join(OUT, "states.json"), JSON.stringify(out, null, 1));
  console.log(`states.json written — ${Object.keys(out.states).length} states`);
}

main().catch((e) => { console.error(e); process.exit(1); });
