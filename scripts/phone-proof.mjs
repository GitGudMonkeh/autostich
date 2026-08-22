#!/usr/bin/env node
/* #viewport-1280 — is the phone layout untouched by moving the desktop threshold?
   ============================================================================

     node scripts/phone-proof.mjs capture before      # run BEFORE the value flip
     node scripts/phone-proof.mjs capture after       # run AFTER it
     node scripts/phone-proof.mjs compare before after

   TWO PROOFS, and the cheap one is the strong one.

   1. RULE APPLICABILITY (no browser, total coverage). Which CSS rules apply at 390 px is decidable:
      every media condition that mentions a width can be evaluated against 390, and everything else
      (pointer, hover, reduced motion, height) is left symbolic because this workstream never touches
      it. If the resulting rule set is identical before and after, the phone layout cannot have moved
      — on ANY screen, not just the ones a script can reach. That matters: the level-up card is one of
      the `display: contents` brackets and it sits behind a live run, so no click path reaches it.

   2. RENDERED GEOMETRY AND PIXELS (browser, partial coverage). Proof 1 says the stylesheet is the
      same; it cannot say the DOM is. So the screens reachable from the hub are also rendered at
      390 px in both languages and compared by element geometry and by pixels.

   Proof 1 is the one that would catch a real regression. Proof 2 is what catches a mistake proof 1
   cannot see — a JSX change that alters structure rather than styling.

   WHY A PRODUCTION BUILD. The in-app viewport harness is gated behind `VITE_PREVIEW` and is folded
   out of production, so it cannot be used here. `Emulation.setDeviceMetricsOverride` is a real
   viewport and needs no cooperation from the application.

   DEPENDENCY-FREE, via scripts/cdp.mjs. Playwright was rejected on record: a browser download in
   every worktree and every CI run, to drive a browser the machine already has. */

import { writeFileSync, mkdirSync, readFileSync, existsSync, readdirSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { launch, setViewport, reduceMotion, seedRandom, suppressInstallPrompt,
  goto, evaluate, screenshot, sleep } from "./cdp.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "docs/workstreams/viewport-1280/evidence/phone-390");
const PORT = 5181;                 // pinned by task-contract-T1b §3. NOT 5180 — that is the dev-server harness.
/* The production build is based at `/autostich/` (vite.config.js: DEPLOY_BASE, GitHub Pages), and
   `vite preview` honours that. Serving the root would return a 404 page that mounts nothing — and
   the failure looks exactly like "the app is slow to start": a body with one node and no hub tiles.
   Read from the built index.html rather than hard-coded, so a change of base cannot silently make
   every capture below be about an empty page. */
const BASE = (() => {
  const html = readFileSync(join(ROOT, "dist/index.html"), "utf8");
  const m = html.match(/<script[^>]+src="([^"]*)\/assets\//);
  return m && m[1] ? `${m[1]}/` : "/";
})();
const ORIGIN = `http://localhost:${PORT}${BASE}`;

/* The phone the layout was tuned against. 390 is the number the project states everywhere; the height
   is the common companion and only matters for the height media queries, which this task never moves. */
const PHONE = { w: 390, h: 844 };

/* ------------------------------------------------------------------ proof 1: rule applicability */

/* Split a stylesheet into top-level blocks. Crude by design: it counts braces and does not parse CSS.
   Both sides go through the identical function, so a parsing quirk cancels out — what must not happen
   is that the two sides are read by two different code paths. */
function topLevelBlocks(css) {
  const out = [];
  let i = 0;
  while (i < css.length) {
    if (css.startsWith("@media", i)) {
      const open = css.indexOf("{", i);
      const cond = css.slice(i + 6, open).trim();
      let depth = 1, j = open + 1;
      while (j < css.length && depth) { if (css[j] === "{") depth++; else if (css[j] === "}") depth--; j++; }
      out.push({ kind: "media", cond, body: css.slice(open + 1, j - 1) });
      i = j;
      continue;
    }
    // Anything that is not an @media block: take up to the start of the next one.
    const next = css.indexOf("@media", i);
    const end = next === -1 ? css.length : next;
    const chunk = css.slice(i, end);
    if (chunk.trim()) out.push({ kind: "plain", body: chunk });
    i = end;
  }
  return out;
}

/* Evaluate only the WIDTH part of a media condition at the phone width. Everything else is kept as
   written: this workstream moves width thresholds and nothing else, so leaving `pointer: coarse` or
   `max-height: 820px` symbolic keeps the comparison honest — a difference there would still show up
   as a differing condition string rather than being silently resolved. */
function widthVerdict(cond, w) {
  let applies = true;
  const rest = [];
  /* BOTH spellings of the separator, and that is not defensive padding — it was a real hole.
     Source CSS writes `(min-width: 1400px) and (max-height: 820px)`; the MINIFIER writes
     `(min-width:1400px)and (max-height:820px)`, with no space before `and`. This function is fed
     the BUILT stylesheet, so for compound queries it only ever sees the second form. Splitting on
     \s+and\s+ alone therefore never split them at all: the whole condition fell through to `rest`
     as one opaque string, `applies` stayed true, and the width was never evaluated.

     The damage was silent and exactly the wrong shape. Six compound blocks were carried into the
     comparison key as TEXT, so proof 1 compared spellings for them while claiming to compute — and
     a threshold change then surfaced as a "difference" in blocks that cannot apply at 390 px on
     either side. Measured on the 1400 → 1280 flip: five false differences, no real ones
     (evidence-T1.md). A proof that compares spellings where it promises to evaluate is the failure
     mode this project has already paid for once, in the i18n key guard. */
  for (const part of cond.split(/\)\s*and\s*\(|\s+and\s+/i)) {
    const p = part.trim().replace(/^\(|\)$/g, "");
    let m;
    if ((m = p.match(/^min-width\s*:\s*([\d.]+)(px|rem)$/))) {
      const px = m[2] === "rem" ? Number(m[1]) * 16 : Number(m[1]);
      if (!(w >= px)) applies = false;
    } else if ((m = p.match(/^max-width\s*:\s*([\d.]+)(px|rem)$/))) {
      const px = m[2] === "rem" ? Number(m[1]) * 16 : Number(m[1]);
      if (!(w <= px)) applies = false;
    } else {
      rest.push(p);
    }
  }
  return { applies, rest: rest.sort().join(" and ") };
}

/* The canonical form: every rule that can apply at 390 px, with its surviving non-width condition.
   Sorted, so a reordering of unrelated blocks cannot masquerade as a change. */
function applicableAt(css, w) {
  const lines = [];
  for (const b of topLevelBlocks(css)) {
    if (b.kind === "plain") { lines.push(`@ :: ${b.body.trim()}`); continue; }
    const v = widthVerdict(b.cond, w);
    if (!v.applies) continue;
    lines.push(`@${v.rest} :: ${b.body.trim()}`);
  }
  return lines.sort().join("\n");
}

/* ------------------------------------------------------------------ the app under test */

function builtCss() {
  const dir = join(ROOT, "dist/assets");
  if (!existsSync(dir)) throw new Error("dist/assets missing — run `npm run build` first.");
  const f = readdirSync(dir).filter((n) => n.endsWith(".css")).sort();
  if (f.length !== 1) throw new Error(`expected exactly one built CSS asset, found ${f.length}`);
  return readFileSync(join(dir, f[0]), "utf8");
}

async function serverAlive() {
  try { return (await fetch(ORIGIN, { signal: AbortSignal.timeout(1500) })).ok; } catch { return false; }
}

async function ensureServer() {
  if (await serverAlive()) return { started: false, stop: async () => {} };
  const viteBin = join(ROOT, "node_modules", "vite", "bin", "vite.js");
  if (!existsSync(viteBin)) throw new Error("vite not found — run `npm ci` in this worktree first.");
  /* `preview`, not `dev`: the production build is what ships, and the preview-only harness must not
     exist in the page under test. `--strictPort` is mandatory — a server that quietly moved to
     another port would make every capture below be about an unknown build. */
  /* `--base` is not optional, and getting it wrong fails in the worst possible way.

     vite.config.js sets `base: command === "build" ? "/autostich/" : "/"`. For `vite preview` the
     command is "serve", so the built-in base does NOT apply — the server would host dist/ at "/"
     while the built index.html points at "/autostich/assets/…". Every asset request then hits the
     SPA fallback and comes back as index.html with `content-type: text/html`, status 200. The module
     never executes, #root stays empty, and there is no error in the page: it looks exactly like an
     app that is slow to start. Measured here before the flag was added. */
  const proc = spawn(process.execPath, [viteBin, "preview", "--port", String(PORT), "--strictPort", "--base", BASE], {
    cwd: ROOT, stdio: "ignore",
  });
  for (let i = 0; i < 100; i++) {
    if (await serverAlive()) return { started: true, stop: async () => { proc.kill(); await sleep(300); } };
    await sleep(200);
  }
  proc.kill();
  throw new Error(`vite preview did not come up on ${PORT}`);
}

/* Determinism controls, the same set viewport-proof.mjs established. Every field is a control, not a
   preference: an unmuted build starts an audio pipeline, telemetry fires a request mid-capture, and
   the effect tiers are frame-timing dependent. */
const profileFor = (lang) => ({ lang, muted: true, telemetry: false, reducedFx: "an", testViewport: null });

/* Unprefixed keys, and that is not a guess: storage.js prefixes with `preview_` only when
   `VITE_PREVIEW === "1"`, and this drives a PRODUCTION build. Writing the prefixed pair too would
   seed a namespace the page under test never reads — noise pretending to be a control.

   A username is seeded so the capture shows the hub rather than the first-visit welcome dialog. */
const seedScript = (lang) => `(() => {
  localStorage.setItem("as_options", ${JSON.stringify(JSON.stringify(profileFor("__LANG__")))}.replace("__LANG__", ${JSON.stringify(lang)}));
  localStorage.setItem("as_username", "PHONEPROOF");
  return true;
})()`;

/* Element geometry, deliberately WITHOUT class names.

   Commit 2 renamed ~135 utility classes on purpose and a later commit may rename more. A fingerprint
   keyed on className would report those as differences and drown the signal. Tag plus rounded box in
   document order is what "the layout did not move" actually means. */
const PROBE = `(() => {
  const d = document, el = d.documentElement, w = window;
  const r2 = (n) => Math.round(n * 100) / 100;
  const nodes = [];
  const walk = (node) => { for (const c of node.children) {
    const r = c.getBoundingClientRect();
    nodes.push({ t: c.tagName, x: r2(r.left), y: r2(r.top), w: r2(r.width), h: r2(r.height) });
    walk(c);
  } };
  walk(d.body);
  return {
    metrics: { innerWidth: w.innerWidth, innerHeight: w.innerHeight,
      clientWidth: el.clientWidth, clientHeight: el.clientHeight,
      scrollWidth: el.scrollWidth, scrollHeight: el.scrollHeight, dpr: w.devicePixelRatio },
    nodeCount: nodes.length, nodes,
  };
})()`;

/* The screens a click path can reach from the hub. Index-based rather than label-based on purpose:
   the labels differ per language and this runs in both. The tile order is the same in DE and EN.

   NOT REACHABLE and therefore not captured here: the level-up card, the formation phase, the
   architect and the victory screen all sit behind a live run. Proof 1 covers them — it is a statement
   about the stylesheet and does not care which screen is on display. */
const SCREENS = [
  { id: "hub", open: null },
  { id: "upgrades", open: 0 },
  { id: "shop", open: 1 },
  { id: "leaderboard", open: 2 },
  { id: "stats", open: 3 },
];

const clickTile = (i) => `(() => {
  const tiles = [...document.querySelectorAll(".as-hub-tile")];
  if (!tiles[${i}]) return { ok: false, found: tiles.length };
  tiles[${i}].click();
  return { ok: true, found: tiles.length };
})()`;

async function captureScreens(c, lang) {
  const out = {};
  for (const s of SCREENS) {
    await goto(c, ORIGIN, { settleMs: 1400 });
    if (s.open !== null) {
      const r = await evaluate(c, clickTile(s.open));
      if (!r || !r.ok) throw new Error(`${lang}/${s.id}: hub tile ${s.open} not found (tiles: ${r && r.found})`);
      await sleep(900);
    }
    const probe = await evaluate(c, PROBE);
    const png = await screenshot(c);
    out[s.id] = { probe, png };
    process.stdout.write(`    ${lang}/${s.id.padEnd(12)} ${probe.nodeCount} nodes · `
      + `doc ${probe.metrics.scrollWidth}x${probe.metrics.scrollHeight} in ${probe.metrics.clientWidth}x${probe.metrics.clientHeight}\n`);
  }
  return out;
}

/* ------------------------------------------------------------------ commands */

async function capture(label) {
  mkdirSync(join(OUT, label), { recursive: true });

  const css = builtCss();
  const rules = applicableAt(css, PHONE.w);
  writeFileSync(join(OUT, label, "applicable-390.txt"), rules);
  process.stdout.write(`  rule set at ${PHONE.w}px: ${rules.split("\n").length} blocks, ${rules.length} bytes\n\n`);

  const server = await ensureServer();
  const c = await launch();
  const record = { label, phone: PHONE, screens: {} };
  try {
    await c.send("Page.enable");
    await c.send("Runtime.enable");
    await reduceMotion(c);
    await seedRandom(c);
    await suppressInstallPrompt(c);
    await setViewport(c, { width: PHONE.w, height: PHONE.h, deviceScaleFactor: 1 });

    for (const lang of ["de", "en"]) {
      await goto(c, ORIGIN, { settleMs: 300 });
      await evaluate(c, seedScript(lang));
      const shots = await captureScreens(c, lang);
      for (const [id, v] of Object.entries(shots)) {
        writeFileSync(join(OUT, label, `${lang}-${id}.png`), Buffer.from(v.png, "base64"));
        record.screens[`${lang}/${id}`] = v.probe;
      }
    }
  } finally {
    await c.close();
    await server.stop();
  }
  writeFileSync(join(OUT, label, "geometry.json"), JSON.stringify(record, null, 2));
  process.stdout.write(`\n  evidence -> ${join(OUT, label)}\n`);
}

/* Re-canonicalise a STORED rule set through today's evaluator.

   WHY THIS EXISTS. `capture` writes the applicable set as it understood it at the time, and
   `compare` used to diff two such files directly. That freezes the VERDICT into the artefact: the
   two sides went through the same function only as long as nobody touched that function in between.
   A parser fix landing between two captures silently made the comparison be about two different
   questions — which is exactly what happened here (see `widthVerdict` above).

   Running both stored sides through the current evaluator restores the property the header of this
   file claims: one code path, both sides, at comparison time. It also keeps an older baseline VALID
   across a parser fix instead of forcing a re-capture — which matters here, because the 390 px
   baseline was taken while the threshold still stood at its old value and cannot honestly be taken
   again afterwards.

   Idempotent on a line that was evaluated correctly: no width terms survive there, so re-evaluating
   changes nothing. One record per line; a line carrying no ` :: ` separator is treated as a
   continuation of the previous record rather than silently dropped. */
function recanonicalise(text, w) {
  const records = [];
  for (const line of text.split("\n")) {
    if (line.startsWith("@") && line.includes(" :: ")) records.push(line);
    else if (records.length) records[records.length - 1] += "\n" + line;
    else records.push(line);
  }
  const kept = [];
  for (const rec of records) {
    const at = rec.indexOf(" :: ");
    if (at < 0) { kept.push(rec); continue; }
    const cond = rec.slice(1, at), body = rec.slice(at + 4);
    if (!cond) { kept.push(rec); continue; }            // the unconditional chunk
    const v = widthVerdict(cond, w);
    if (!v.applies) continue;                            // cannot apply at this width
    kept.push(`@${v.rest} :: ${body}`);
  }
  return kept.sort().join("\n");
}

function compare(a, b) {
  const read = (l, f) => readFileSync(join(OUT, l, f), "utf8");
  let bad = 0;

  const ra = recanonicalise(read(a, "applicable-390.txt"), PHONE.w);
  const rb = recanonicalise(read(b, "applicable-390.txt"), PHONE.w);
  if (ra === rb) {
    process.stdout.write(`  PROOF 1  rule set at ${PHONE.w}px IDENTICAL (${ra.length} bytes)\n`);
  } else {
    bad++;
    let i = 0; while (i < ra.length && i < rb.length && ra[i] === rb[i]) i++;
    process.stdout.write(`  PROOF 1  DIFFERS at byte ${i}\n`);
    process.stdout.write(`    ${a}: ${JSON.stringify(ra.slice(Math.max(0, i - 70), i + 70))}\n`);
    process.stdout.write(`    ${b}: ${JSON.stringify(rb.slice(Math.max(0, i - 70), i + 70))}\n`);
  }

  const ga = JSON.parse(read(a, "geometry.json")), gb = JSON.parse(read(b, "geometry.json"));
  const keys = [...new Set([...Object.keys(ga.screens), ...Object.keys(gb.screens)])].sort();
  for (const k of keys) {
    const A = ga.screens[k], B = gb.screens[k];
    if (!A || !B) { bad++; process.stdout.write(`  PROOF 2  ${k}: missing on one side\n`); continue; }
    const diffs = [];
    for (const m of Object.keys(A.metrics)) if (A.metrics[m] !== B.metrics[m]) diffs.push(`${m} ${A.metrics[m]}→${B.metrics[m]}`);
    if (A.nodeCount !== B.nodeCount) diffs.push(`nodeCount ${A.nodeCount}→${B.nodeCount}`);
    else for (let i = 0; i < A.nodes.length; i++) {
      const x = A.nodes[i], y = B.nodes[i];
      if (x.t !== y.t || x.x !== y.x || x.y !== y.y || x.w !== y.w || x.h !== y.h) {
        diffs.push(`node ${i} ${x.t} [${x.x},${x.y},${x.w},${x.h}] → [${y.x},${y.y},${y.w},${y.h}]`);
        if (diffs.length > 6) break;
      }
    }
    if (diffs.length) { bad++; process.stdout.write(`  PROOF 2  ${k}: ${diffs.length} diff(s)\n${diffs.map((d) => `    ${d}`).join("\n")}\n`); }
    else process.stdout.write(`  PROOF 2  ${k.padEnd(18)} identical (${A.nodeCount} nodes)\n`);
  }

  process.stdout.write(bad ? `\nFAIL · ${bad} check(s) differ\n` : "\nPASS · the phone layout is unchanged\n");
  process.exit(bad ? 1 : 0);
}

/* ------------------------------------------------------------------ entry */

const [cmd, x, y] = process.argv.slice(2);
if (cmd === "capture" && x) await capture(x);
else if (cmd === "compare" && x && y) compare(x, y);
else {
  process.stdout.write("usage:\n  phone-proof.mjs capture <label>\n  phone-proof.mjs compare <labelA> <labelB>\n");
  process.exit(2);
}
