#!/usr/bin/env node
/* Measure how much light each battlefield actually ADDS to the desktop page.
   ============================================================================

     npm run dev            # in another shell
     node scripts/bf-beitrag.mjs [--surface hub|run|both] [--cap 1.15]

   Why this exists, next to `bf-helligkeit.mjs`
   --------------------------------------------
   That script answers the mobile question: it composites the hub veil over the
   narrow phone crop offline, because there the whole image is visible behind the
   tiles. On DESKTOP that model breaks, and it breaks in the direction that makes
   a tool dangerous - it looks right and is wrong.

   Two things go wrong when the band is measured in isolation:

     1. UI PANELS COVER MOST OF IT. Measured from real captures, only 19-73% of
        the hub background is visible at all, depending on the battlefield. A mean
        over the whole band weights heavily the pixels nobody ever sees, and the
        factors derived from it come out far too strong.
     2. THE SURFACES DIFFER. The hub (StartScreen.jsx) and the running game
        (Battlefield.jsx) are separate elements with different scrims - 0/.55/.82
        against .55/.38/.62 - and completely different occlusion. In the run the
        image is nearly fully visible AND the cards sit directly on it, which is
        where legibility is actually decided.

   The measurement
   ---------------
   For each battlefield the page is captured twice, with the image at
   `brightness(1)` and at `brightness(0)`. The per-pixel difference is exactly the
   light that battlefield contributes to the finished page - occlusion, partial
   panel transparency and both scrims are accounted for automatically, because
   they are simply part of both captures.

   Both captures are needed per deck rather than one shared black reference: deck
   accents (`--deck-a1`/`--deck-a2`) tint the UI itself, so the "image off" page
   is not the same page for every deck.

   The contribution is LINEAR in the brightness factor - the compositing chain is
   `(page*(1-mask) + img*k*mask)*(1-scrim) + scrim`, whose derivative in k is
   constant - so the factor that brings a battlefield to a target contribution is
   simply `target / contribution`. No search, no binary stepping.

   Reading the output
   ------------------
   The point is NOT to enter every line it prints. `bf-helligkeit.mjs` states the
   rule this repository already follows, and it applies here unchanged:

     an entry is an EXCEPTION. A few percent over the cap is noise - enter what
     you SEE, not what the number narrowly exceeds.

   So treat the list as candidates, look at them, and keep the ones that are
   visibly too loud.

   Output goes to `test/evidence/bf-beitrag/` and is GITIGNORED - it is working
   material, and the before/after captures alone run to several megabytes. What
   survives a decision is the reasoning written onto the entries themselves in
   `src/ui/cosmeticAssets.js`, which is how BATTLEFIELD_VEIL already documents
   its own numbers. Re-derive candidates at a different cap or target without
   paying for the measurement again using `--from-cache`.
*/
import { execFileSync } from "node:child_process";
import { writeFileSync, readFileSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import {
  launch, setViewport, reduceMotion, seedRandom, goto, evaluate, screenshot, sleep,
} from "./cdp.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, "..");
const BF_DIR = path.join(ROOT, "src", "assets", "battlefields");
const OUT_DIR = path.join(ROOT, "test", "evidence", "bf-beitrag");
const URL = process.env.BF_URL || "http://localhost:5173/";

const arg = (name, dflt) => {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : dflt;
};
const SURFACE = arg("surface", "both");
/* Two SEPARATE questions, deliberately not one number:
   `--cap`    who is even a candidate - how far over the median a battlefield has
              to sit before it is worth looking at.
   `--target` where a kept entry is brought down TO. Defaults to the cap, which is
              what the mobile tool does, but they are free to differ: one can want
              a strict shortlist (high cap) that still lands close to the median
              (low target). Folding both into one knob quietly couples "how many
              entries" to "how hard each one is damped". */
const CAP = Number(arg("cap", "1.15"));
const LIMIT = Number(arg("limit", "0"));  // 0 = all, otherwise first N (for a quick pass)
const TARGET = Number(arg("target", String(Number(arg("cap", "1.15")))));
const SHOTS = process.argv.includes("--shots");     // also capture before/after PNGs
const FROM_CACHE = process.argv.includes("--from-cache"); // reuse the last measurement

const IDS = readdirSync(BF_DIR, { withFileTypes: true })
  .filter((d) => d.isDirectory()).map((d) => d.name).sort();
const TARGETS = LIMIT > 0 ? IDS.slice(0, LIMIT) : IDS;

/* Mean luma of a PNG buffer, via the same Python chain the sibling script uses.
   Node cannot decode PNG on its own, and this repository deliberately keeps
   sharp/jimp out of the dependencies. */
const PY_LUMA = `
import sys, json, base64, io
try:
    from PIL import Image
    import numpy as np
except ImportError:
    print(json.dumps({"error": "Pillow/numpy missing - 'pip install pillow numpy'"})); sys.exit(0)
out = []
for b64 in json.loads(sys.stdin.read()):
    a = np.asarray(Image.open(io.BytesIO(base64.b64decode(b64))).convert("RGB"), dtype=float) / 255
    out.append(float((.2126*a[...,0] + .7152*a[...,1] + .0722*a[...,2]).mean()))
print(json.dumps(out))
`;

function lumaOf(b64list) {
  for (const bin of ["python3", "python", "py"]) {
    try {
      // stderr is captured rather than inherited: on Windows the Store alias for
      // `python3` prints a "Python was not found" banner, and inheriting it would
      // spray that over the output of every single measurement.
      const raw = execFileSync(bin, ["-c", PY_LUMA], {
        input: JSON.stringify(b64list), encoding: "utf8",
        maxBuffer: 1 << 28, stdio: ["pipe", "pipe", "pipe"],
      });
      const r = JSON.parse(raw);
      if (r.error) { console.error(r.error); process.exit(1); }
      return r;
    } catch { /* try the next interpreter name */ }
  }
  console.error("No usable Python found (tried python3, python, py).");
  process.exit(1);
}

const seedProfile = (bf) => `(() => {
  localStorage.setItem("as_username", "Test");
  localStorage.setItem("as_tutorial_done", "1");
  const o = JSON.parse(localStorage.getItem("as_options") || "{}");
  o.battlefieldId = ${JSON.stringify(bf)};
  o.deckId = ${JSON.stringify(bf.replace(/^bf_/, "deck_"))};
  o.lang = "de";
  localStorage.setItem("as_options", JSON.stringify(o));
  const p = JSON.parse(localStorage.getItem("as_profile") || "{}");
  p.onboarding = 6; p.deckPoints = 9999;
  p.hadGottgleichRun = true; p.hadMeisterNoRerollRun = true; p.championWeeks = 9;
  p.hadNoRerollRun = true; p.hadAllArchetypesRun = true;
  p.monoArchetypeRuns = { fire: 9, ice: 9, lightning: 9, plant: 9 };
  // Progress unlocks (cosmetics.js unlockDone): without these the Hirsch, Titan
  // and Kataklysmus tiers stay locked, the app silently falls back to the default
  // battlefield, and nine of them drop out of the measurement unmeasured.
  p.games = 9999; p.bestStreak = 9999; p.bestScore = 1e9;
  p.ownedCosmetics = Object.assign(p.ownedCosmetics || {},
    { ["pack:" + ${JSON.stringify(bf)}.slice(3)]: true });
  localStorage.setItem("as_profile", JSON.stringify(p));
  return 1; })()`;

const setBrightness = (k) => `(() => {
  const n = document.querySelectorAll('img[src*="battlefields"], [style*="battlefields"]');
  n.forEach((e) => { e.style.filter = "brightness(${k})"; });
  return n.length; })()`;

const enterRun = `(() => {
  const b = [...document.querySelectorAll("button")]
    .find((x) => /Lauf beginnen/i.test(x.textContent || ""));
  if (b) { b.click(); return 1; } return 0; })()`;

/* Entering a run puts TWO choice screens in front of the battlefield: first a
   skill, and declining that ("Ablehnen -> Perk") opens a perk screen, dismissed
   with "Alle ablehnen". Both match /ablehnen/i, so the same click runs twice.
   Getting this wrong is not loud: the battlefield element exists and is
   `visible` the whole time, it is merely COVERED, and the measurement then
   reports a contribution near zero for every deck alike. */
const declineOnce = `(() => {
  const el = [...document.querySelectorAll("button,[role=button]")]
    .find((x) => /ablehnen/i.test(x.textContent || ""));
  if (el) { el.click(); return 1; } return 0; })()`;

/* Occlusion guard: is anything modal sitting on top of the battlefield?
   The app marks its own overlays with `.overlay-root`, so the test is exact -
   whatever `elementFromPoint` finds at the battlefield's centre must not have
   one as an ancestor. Do NOT test "is the top element inside the battlefield's
   own container" instead: the played cards are siblings of that container and
   legitimately sit on top, so that version rejects a perfectly exposed field. */
const bfExposed = `(() => {
  const im = document.querySelector('img[src*="battlefields"]');
  if (!im) return false;
  const r = im.getBoundingClientRect();
  if (r.width < 50 || r.height < 50) return false;
  const top = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
  return !!top && !top.closest(".overlay-root"); })()`;

async function measure(c, bf, surface) {
  await evaluate(c, seedProfile(bf));
  await goto(c, URL);
  await sleep(1300);
  if (surface === "run") {
    await evaluate(c, enterRun);
    await sleep(2200);
    for (let i = 0; i < 4 && !(await evaluate(c, bfExposed)); i++) {
      if (!(await evaluate(c, declineOnce))) break;
      await sleep(1700);
    }
    if (!(await evaluate(c, bfExposed))) return { blocked: true };
  }
  const n = await evaluate(c, setBrightness(1));
  if (!n) return null;                       // battlefield not on screen - skip
  await sleep(250);
  const on = await screenshot(c);
  await evaluate(c, setBrightness(0));
  await sleep(250);
  const off = await screenshot(c);
  const [lOn, lOff] = lumaOf([on, off]);
  return { contribution: lOn - lOff, on, off };
}

const c = await launch({ port: 9440 });
const results = { hub: [], run: [] };
const skipped = [];
const shotList = [];
try {
  await c.send("Page.enable");
  await c.send("Runtime.enable");
  await setViewport(c, { width: 1280, height: 720, deviceScaleFactor: 1 });
  await reduceMotion(c);
  await seedRandom(c);
  await goto(c, URL);

  const surfaces = SURFACE === "both" ? ["hub", "run"] : [SURFACE];
  for (const s of surfaces) {
    /* Re-measuring costs a browser round trip per battlefield per surface. The
       numbers do not change unless the assets or the layout do, so re-deriving
       candidates at a different cap/target should not pay that again. */
    if (FROM_CACHE) {
      const f = path.join(OUT_DIR, `${s}.json`);
      if (!existsSync(f)) { console.error(`No cached measurement at ${f} - run without --from-cache first.`); process.exit(1); }
      results[s] = JSON.parse(readFileSync(f, "utf8")).rows;
      console.log(`
--- ${s} --- ${results[s].length} battlefields (from cache)`);
      continue;
    }
    console.log(`\n--- ${s} --- ${TARGETS.length} battlefields`);
    for (const bf of TARGETS) {
      let r = null;
      try { r = await measure(c, bf, s); } catch (e) { console.error(`  ${bf}: ${e.message}`); }
      if (r && r.blocked) {
        console.log(`  ${bf.padEnd(18)} BLOCKED - battlefield stayed covered`);
        skipped.push({ id: bf, surface: s, why: "covered" });
        continue;
      }
      if (!r) {
        console.log(`  ${bf.padEnd(18)} skipped - not rendered (locked deck?)`);
        skipped.push({ id: bf, surface: s, why: "not rendered" });
        continue;
      }
      results[s].push({ id: bf, contribution: r.contribution });
      console.log(`  ${bf.padEnd(18)} ${r.contribution.toFixed(5)}`);
    }
  }
} finally { await c.close(); }

mkdirSync(OUT_DIR, { recursive: true });
for (const [s, rows] of Object.entries(results)) {
  if (!rows.length) continue;
  const vals = rows.map((r) => r.contribution).sort((a, b) => a - b);
  const med = vals[Math.floor(vals.length / 2)];
  const over = rows
    .filter((r) => r.contribution > med * CAP)
    .sort((a, b) => b.contribution - a.contribution)
    .map((r) => ({ ...r, k: Math.round((med * TARGET) / r.contribution * 100) / 100 }));

  console.log(`\n=== ${s} === median ${med.toFixed(5)} · cap ${(med * CAP).toFixed(5)} ` +
    `· range ${vals[0].toFixed(5)}-${vals[vals.length - 1].toFixed(5)} ` +
    `(factor ${(vals[vals.length - 1] / vals[0]).toFixed(2)})\n`);
  for (const r of over) {
    console.log(`  ${r.id.padEnd(18)} ${r.contribution.toFixed(5)}  ` +
      `${((r.contribution / med - 1) * 100).toFixed(0).padStart(4)}% over median  -> brightness(${r.k})`);
  }
  console.log(`\n  ${over.length} of ${rows.length} over the cap. An entry is an EXCEPTION -`);
  console.log("  look at these before entering them; a few percent over is noise.\n");
  writeFileSync(path.join(OUT_DIR, `${s}.json`),
    JSON.stringify({ median: med, cap: CAP, rows, candidates: over }, null, 2));
  if (SHOTS) shotList.push(...over.map((r) => ({ ...r, surface: s })));
}

/* Second pass for `--shots`: the factor is only known once every battlefield has
   been measured and the median exists, so the visual evidence cannot be captured
   during the first pass. This is the part that decides what actually gets an
   entry - the numbers only narrow the field down to something worth looking at. */
if (SHOTS && shotList.length) {
  console.log(`\nCapturing ${shotList.length} before/after pairs for review...`);
  const c2 = await launch({ port: 9443 });
  try {
    await c2.send("Page.enable");
    await c2.send("Runtime.enable");
    await setViewport(c2, { width: 1280, height: 720, deviceScaleFactor: 1 });
    await reduceMotion(c2);
    await seedRandom(c2);
    await goto(c2, URL);
    for (const r of shotList) {
      await evaluate(c2, seedProfile(r.id));
      await goto(c2, URL);
      await sleep(1300);
      if (r.surface === "run") {
        await evaluate(c2, enterRun);
        await sleep(2200);
        for (let i = 0; i < 4 && !(await evaluate(c2, bfExposed)); i++) {
          if (!(await evaluate(c2, declineOnce))) break;
          await sleep(1700);
        }
        if (!(await evaluate(c2, bfExposed))) { console.log(`  ${r.id} covered - no shot`); continue; }
      }
      for (const [tag, k] of [["a-plain", 1], ["b-dimmed", r.k]]) {
        await evaluate(c2, setBrightness(k));
        await sleep(280);
        writeFileSync(path.join(OUT_DIR, `${r.surface}-${r.id}-${tag}.png`),
          Buffer.from(await screenshot(c2), "base64"));
      }
      console.log(`  ${r.surface}/${r.id} -> brightness(${r.k})`);
    }
  } finally { await c2.close(); }
}
/* Coverage is part of the result. A battlefield that never rendered is not a
   battlefield that is fine - it is one nobody measured, and staying quiet about
   it would read as "all 52 checked" when nine were not. */
if (skipped.length) {
  console.log(`\nNOT MEASURED - ${skipped.length} entries:\n`);
  for (const s of skipped) console.log(`  ${s.surface.padEnd(4)} ${s.id.padEnd(18)} ${s.why}`);
  writeFileSync(path.join(OUT_DIR, "skipped.json"), JSON.stringify(skipped, null, 2));
} else {
  console.log("\nAll battlefields measured on every requested surface.");
}
console.log(`\nWritten to ${path.relative(ROOT, OUT_DIR)}`);
