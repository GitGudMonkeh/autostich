#!/usr/bin/env node
/* #menu-rework M7 — THE GATE'S BLIND SPOT, walked by hand and written down.
   ============================================================================

   `viewport-survey.mjs` prints it on every run: *"Surfaces only. Control states are not captured and
   are verified by hand."* Every cell of the matrix is a surface in its RESTING state — nothing
   clicks, hovers, focuses or disables anything after the navigation lands. So no gate built on that
   matrix can see a change to a control state, and its green is not evidence about them.

   This walks the states this task actually introduces or moves, drives each one, and reports what it
   found. It is still "by hand" in the sense that matters — a person reads the output and decides —
   but the hand is not asked to remember which fifteen things to click.

     npm run build
     node docs/workstreams/desktop-menus/evidence/M7/states.mjs [--shots]

   Port 5189, the same production build and the same seeded profile as `measure.mjs`. */

import { writeFileSync, mkdirSync, readFileSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { launch, setViewport, reduceMotion, seedRandom, suppressInstallPrompt, screenshot,
  goto, evaluate, sleep } from "../../../../../scripts/cdp.mjs";
import { seedBlob } from "./seed.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "../../../../..");
const OUT = join(HERE, "states");
const SHOTS = process.argv.includes("--shots");
const PORT = 5189;
const BASE = (() => {
  const html = readFileSync(join(ROOT, "dist/index.html"), "utf8");
  const m = html.match(/<script[^>]+src="([^"]*)\/assets\//);
  return m && m[1] ? `${m[1]}/` : "/";
})();
const ORIGIN = `http://localhost:${PORT}${BASE}`;

const alive = async () => { try { return (await fetch(ORIGIN, { signal: AbortSignal.timeout(1500) })).ok; } catch { return false; } };

/* One state: a name, the script that puts the page into it, and the script that reads it back.
   `read` returns a plain object — what it returns IS the record, so a state that reports nothing
   useful is visible as such rather than as a silent pass. */
const STATES = [
  {
    name: "run row · hover",
    why: "44 px click target, and the gold edge must stay the record row's alone",
    run: `(() => {
      const rows = [...document.querySelectorAll('.st-sec[data-sec="runs"] button')];
      if (!rows.length) return { ok: false, why: "no run rows" };
      rows[1].dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
      rows[1].classList.add("__hover-probe");
      return { ok: true };
    })()`,
    read: `(() => {
      const rows = [...document.querySelectorAll('.st-sec[data-sec="runs"] button')];
      const cs = (el) => getComputedStyle(el);
      return {
        rows: rows.length,
        heights: [...new Set(rows.map((r) => Math.round(r.getBoundingClientRect().height)))],
        edgeRecord: cs(rows[0]).borderLeftColor,
        edgeOther: cs(rows[1]).borderLeftColor,
        golden: rows.filter((r) => cs(r).borderLeftColor === cs(rows[0]).borderLeftColor).length,
      };
    })()`,
  },
  {
    name: "run row · focus (keyboard)",
    why: "optically reachable and actually focusable must agree (design-sprache §5)",
    run: `(() => {
      const rows = [...document.querySelectorAll('.st-sec[data-sec="runs"] button')];
      if (!rows.length) return { ok: false, why: "no run rows" };
      rows[2].focus();
      return { ok: true };
    })()`,
    read: `(() => {
      const a = document.activeElement;
      return { tag: a && a.tagName, inList: !!(a && a.closest('.st-sec[data-sec="runs"]')),
        outline: a ? getComputedStyle(a).outlineStyle : null };
    })()`,
  },
  {
    name: "reserved slot · damped and named",
    why: "a free place is not at zero, it is empty — and it says so (§1 Ziel, §5 Leere Werte). "
      + "THE SEEDED PROFILE FILLS ALL FOUR BLOCKS, so this state has to be reached with a THINNER "
      + "one: twelve varied runs leave no free place, and a state nobody can reach is a state nobody "
      + "verified. `sparse` re-seeds, reloads and re-opens before reading.",
    sparse: true,
    run: `(() => ({ ok: true }))()`,
    read: `(() => {
      const slots = [...document.querySelectorAll('.st-slot')];
      return {
        count: slots.length,
        opacity: [...new Set(slots.map((s) => getComputedStyle(s).opacity))],
        says: [...new Set(slots.map((s) => (s.textContent || "").trim().split("–")[0].trim()))].filter(Boolean),
        displayed: [...new Set(slots.map((s) => getComputedStyle(s).display))],
      };
    })()`,
  },
  {
    name: "build field · resting",
    why: "fifteen fields, empty ones standing and damped",
    run: `(() => ({ ok: true }))()`,
    read: `(() => {
      const f = [...document.querySelectorAll('.rd-bf')];
      const cs = (el) => getComputedStyle(el);
      return {
        fields: f.length,
        empty: f.filter((x) => x.classList.contains("is-empty")).length,
        emptyOpacity: [...new Set(f.filter((x) => x.classList.contains("is-empty")).map((x) => cs(x).opacity))],
        fullOpacity: [...new Set(f.filter((x) => !x.classList.contains("is-empty")).map((x) => cs(x).opacity))],
        minHeights: [...new Set(f.map((x) => cs(x).minHeight))],
        numberColours: [...new Set(f.map((x) => cs(x.querySelector(".rd-bf-n")).color))].length,
      };
    })()`,
  },
  {
    name: "build field · hover",
    why: "the tile lifts on the wash, and nothing else moves",
    run: `(() => {
      const f = document.querySelectorAll('.rd-bf');
      if (!f.length) return { ok: false, why: "no fields" };
      f[8].dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
      return { ok: true, panel: Math.round(document.querySelector('.rd-c2').getBoundingClientRect().height) };
    })()`,
    read: `(() => ({ panel: Math.round(document.querySelector('.rd-c2').getBoundingClientRect().height) }))()`,
  },
  {
    name: "build panel · open",
    why: "the panel keeps its measurements; the fields become a tab row; the other two groups collapse",
    run: `(() => {
      const f = [...document.querySelectorAll('.rd-bf')];
      const voll = f.find((x) => !x.classList.contains("is-empty") && x.closest('[data-group="perks"]'))
        || f.find((x) => !x.classList.contains("is-empty"));
      if (!voll) return { ok: false, why: "no non-empty field" };
      const before = Math.round(document.querySelector('.rd-c2').getBoundingClientRect().height);
      voll.click();
      return { ok: true, before };
    })()`,
    read: `(() => {
      const c2 = document.querySelector('.rd-c2');
      const list = document.querySelector('.rd-blist2');
      const gruppen = [...document.querySelectorAll('.rd-bg')];
      return {
        panelHeight: Math.round(c2.getBoundingClientRect().height),
        head: (document.querySelector('.rd-c2 .rd-ph') || {}).textContent,
        tabs: document.querySelectorAll('.rd-bf-tab').length,
        selected: document.querySelectorAll('.rd-bf-tab.is-on').length,
        selectedUnderline: (() => { const on = document.querySelector('.rd-bf-tab.is-on');
          return on ? getComputedStyle(on).boxShadow : null; })(),
        groupsStillVisible: gruppen.filter((g) => g.getBoundingClientRect().height > 0).length,
        listRows: list ? list.querySelectorAll('.rd-bl-row').length : 0,
        listScrolls: list ? getComputedStyle(list).overflowY : null,
        listBox: list ? { client: list.clientHeight, scroll: list.scrollHeight } : null,
      };
    })()`,
  },
  {
    name: "build panel · the longest list scrolls inside the panel",
    why: "the one place on this screen where a list may be any length (§1) — and the panel keeps 380 px",
    run: `(() => {
      const f = [...document.querySelectorAll('.rd-bf')];
      const groesst = f.map((x) => [Number(x.querySelector('.rd-bf-n').textContent), x])
        .sort((a, b) => b[0] - a[0])[0];
      if (!groesst || !groesst[0]) return { ok: false, why: "every field is empty" };
      groesst[1].click();
      return { ok: true, n: groesst[0] };
    })()`,
    read: `(() => {
      const list = document.querySelector('.rd-blist2');
      return {
        panelHeight: Math.round(document.querySelector('.rd-c2').getBoundingClientRect().height),
        head: (document.querySelector('.rd-c2 .rd-ph') || {}).textContent,
        listRows: list ? list.querySelectorAll('.rd-bl-row').length : 0,
        listBox: list ? { client: list.clientHeight, scroll: list.scrollHeight } : null,
        scrolls: list ? list.scrollHeight > list.clientHeight : null,
        withTier: list ? list.querySelectorAll('.rd-bl-t').length : 0,
        withEffect: list ? list.querySelectorAll('.rd-bl-d').length : 0,
      };
    })()`,
  },
  {
    name: "build panel · switch category without going back",
    why: "the whole point of the tab row",
    run: `(() => {
      const tabs = [...document.querySelectorAll('.rd-bf-tab')];
      const other = tabs.find((t) => !t.classList.contains("is-on"));
      if (!other) return { ok: false, why: "no other tab" };
      const before = Math.round(document.querySelector('.rd-c2').getBoundingClientRect().height);
      other.click();
      return { ok: true, before };
    })()`,
    read: `(() => {
      const c2 = document.querySelector('.rd-c2');
      return {
        panelHeight: Math.round(c2.getBoundingClientRect().height),
        head: (document.querySelector('.rd-c2 .rd-ph') || {}).textContent,
        stillOpen: !!document.querySelector('.rd-blist2'),
        selected: document.querySelectorAll('.rd-bf-tab.is-on').length,
      };
    })()`,
  },
  {
    name: "build panel · close again",
    why: "clicking the selected field closes it, and the panel is where it was",
    run: `(() => {
      const on = document.querySelector('.rd-bf-tab.is-on');
      if (!on) return { ok: false, why: "nothing open" };
      on.click();
      return { ok: true };
    })()`,
    read: `(() => ({
      panelHeight: Math.round(document.querySelector('.rd-c2').getBoundingClientRect().height),
      fields: document.querySelectorAll('.rd-bf').length,
      tabs: document.querySelectorAll('.rd-bf-tab').length,
      listGone: !document.querySelector('.rd-blist2'),
    }))()`,
  },
  {
    name: "seed chip · the two drawn marks",
    why: "§4 — drawn SVG, 16-grid, currentColor; no text glyph left",
    run: `(() => ({ ok: true }))()`,
    read: `(() => {
      const marks = [...document.querySelectorAll('.rd-mark')];
      const chip = document.querySelector('.rd-score .as-edge-neutral');
      const replay = document.querySelector('.rd-score .as-edge');
      return {
        marks: marks.length,
        viewBoxes: [...new Set(marks.map((m) => m.getAttribute("viewBox")))],
        stroke: [...new Set(marks.map((m) => m.getAttribute("stroke")))],
        sized: [...new Set(marks.map((m) => Math.round(m.getBoundingClientRect().width)))],
        textGlyphs: [chip, replay].filter(Boolean)
          .map((b) => (b.textContent || "")).join("").match(/[↻⧉]/g) || [],
      };
    })()`,
  },
];

async function main() {
  mkdirSync(OUT, { recursive: true });
  if (await alive()) throw new Error(`something already answers on ${PORT} — stop it first.`);
  const viteBin = join(ROOT, "node_modules", "vite", "bin", "vite.js");
  const server = spawn(process.execPath, [viteBin, "preview", "--port", String(PORT), "--strictPort", "--base", BASE],
    { cwd: ROOT, stdio: "ignore" });
  for (let i = 0; i < 150 && !(await alive()); i++) await sleep(200);

  const c = await launch();
  const out = { viewport: "1536x791", lang: "de", states: [] };
  try {
    await c.send("Page.enable");
    await c.send("Runtime.enable");
    await reduceMotion(c);
    await seedRandom(c);
    await suppressInstallPrompt(c);
    await setViewport(c, { width: 1536, height: 791, deviceScaleFactor: 1 });
    await goto(c, ORIGIN, { settleMs: 400 });
    await evaluate(c, `(()=>{localStorage.clear();const b=${JSON.stringify(seedBlob("de"))};
      for(const k of Object.keys(b))localStorage.setItem(k,b[k]);return 1})()`);
    await goto(c, ORIGIN, { settleMs: 1200 });
    await evaluate(c, `document.querySelectorAll('.as-hub-tile')[3].click()`);
    await sleep(900);

    for (const st of STATES) {
      /* A state that needs a different save state re-seeds and reloads, so the states stay
         independent of each other rather than of the order they happen to run in. */
      if (st.sparse) {
        await evaluate(c, `(()=>{const b=${JSON.stringify(seedBlob("de"))};
          const h=JSON.parse(b["as_runhistory"]).slice(0, 2);
          h[0]={...h[0], skills: h[0].skills.slice(0, 2), perks: h[0].perks.slice(0, 1), archetypes: ["fire"]};
          h[1]={...h[1], skills: h[1].skills.slice(0, 1), perks: [], archetypes: ["fire"]};
          localStorage.setItem("as_runhistory", JSON.stringify(h));
          const p=JSON.parse(b["as_profile"]); p.games=2;
          localStorage.setItem("as_profile", JSON.stringify(p)); return h.length})()`);
        await goto(c, ORIGIN, { settleMs: 1100 });
        await evaluate(c, `document.querySelectorAll('.as-hub-tile')[3].click()`);
        await sleep(900);
      }
      if (st.name.startsWith("build") || st.name.startsWith("seed")) {
        if (!(await evaluate(c, `!!document.querySelector('.rd-card')`))) {
          await evaluate(c, `document.querySelectorAll('.st-sec[data-sec="runs"] button')[0].click()`);
          await sleep(900);
        }
      }
      const r = await evaluate(c, st.run);
      await sleep(350);
      const read = r && r.ok === false ? null : await evaluate(c, st.read);
      out.states.push({ name: st.name, why: st.why, ok: !(r && r.ok === false), note: r && r.why, read });
      if (st.sparse) {
        await evaluate(c, `(()=>{const b=${JSON.stringify(seedBlob("de"))};
          for(const k of Object.keys(b))localStorage.setItem(k,b[k]);return 1})()`);
        await goto(c, ORIGIN, { settleMs: 1100 });
        await evaluate(c, `document.querySelectorAll('.as-hub-tile')[3].click()`);
        await sleep(900);
      }
      if (SHOTS) {
        const png = await screenshot(c, null, {});
        writeFileSync(join(OUT, `${st.name.replace(/[^a-z0-9]+/gi, "-")}.png`), png, "base64");
      }
      process.stdout.write(`  ${st.name}: ${JSON.stringify(read)}\n`);
    }
  } finally {
    try { await c.close(); } catch { /* already gone */ }
    server.kill();
    await sleep(300);
  }
  writeFileSync(join(OUT, "states.json"), JSON.stringify(out, null, 1));
  console.log(`states.json written — ${out.states.length} states`);
}

main().catch((e) => { console.error(e); process.exit(1); });
