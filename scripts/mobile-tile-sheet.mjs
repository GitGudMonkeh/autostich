#!/usr/bin/env node
/* mobile-tile-design, part 1 — deliverable S: the variant sheets.
   =================================================================================================

     node scripts/mobile-tile-sheet.mjs

   Renders the two candidate mobile tile designs — D1: a banner behind the tile head, and a fixed
   emblem in the tile's top-right corner — beside the tile as it renders today, on all three
   selection screens, at the width deliverable M measured. Writes one PNG per sheet into
   docs/workstreams/mobile-icons/mobile-tile-design/visual/ plus a measurements sidecar. The owner
   picks a design off those images at V3; the verdict goes into findings.md.

   TWO KINDS OF SHEET, because the owner has two questions and one image cannot answer both.

     variants-<screen>.png   control | banner | corner | corner-bleed, at the 390 px measurement.
                             This is the decision surface.
     band-<screen>.png       the banner at 320 / 390 / 480 / 639 px, side by side. The band is fluid
                             by a factor of 2.3 (M), so „does the banner hold across the band" is a
                             different question from „is the banner the right design", and it is the
                             one the cap exists for. The 320 px column also shows the single ornament
                             overhanging its head by 14 px, which is D5's one open case.

   WHY A BROWSER. The question is what the player sees, and that is `object-fit: cover` against a real
   box, `mix-blend-mode: screen` over the card's gradient, and a mask. Re-implementing that arithmetic
   would mean copying numbers out of src/index.css into a second place. The page half builds the real
   markup and lets the shipped stylesheet lay it out; the numbers are then read BACK and printed into
   the sidecar.

   NO NEW DEPENDENCY. Chrome is driven through scripts/cdp.mjs, the dependency-free client the
   viewport proof and the contact sheet already use.

   DETERMINISM — same inputs, same bytes:
     · No timestamp and no commit SHA is drawn INTO an image; both go into the sidecar, which also
       carries a SHA-256 per PNG. Re-run, diff the sidecar, and the claim is checked rather than
       asserted.
     · `prefers-reduced-motion: reduce` is emulated, and `.as-legendary` — the one unconditionally
       animated class on this surface — is deliberately not on the tiles (see the page file).
     · Fonts are awaited and every emblem is `decode()`d before capture.
     · deviceScaleFactor 1, so one image pixel is one CSS pixel and the tiles are at TRUE size.
     · NOT applied: the four render flags `icon-contact-sheet.mjs` measured
       (`--disable-gpu`, `--force-color-profile=srgb`, `--font-render-hinting=none`,
       `--disable-lcd-text`). `launch()` in scripts/cdp.mjs takes no flags on this base; the option
       that adds them is in flight on `task/icon-position-review`, and D2 says that task is not
       touched. **Consequence, stated rather than hidden:** these sheets are reproducible in content
       but NOT guaranteed byte-identical between runs, because every tile goes through a
       `mix-blend-mode` compositing path and GPU and CPU blending differ by about a unit per channel.
       The SHA-256 per PNG in the sidecar is therefore a record of what was shown at the gate, not a
       reproducibility claim. When that cdp.mjs change lands on `dev`, pass the flags and the claim
       becomes real.

   READ-ONLY AGAINST src/. This script and its page import from src/ and change nothing there — the
   task contract's tripwire. */

import { writeFileSync, mkdirSync, readFileSync, existsSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { launch, setViewport, reduceMotion, goto, evaluate, screenshot, sleep } from "./cdp.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const WS = join(ROOT, "docs/workstreams/mobile-icons/mobile-tile-design");
const OUT = join(WS, "visual");
const PORT = 5187;                 // pinned by the task contract — NOT 5186, which icon-position-review holds
const ORIGIN = `http://localhost:${PORT}`;
const PAGE = `${ORIGIN}/scripts/mobile-tile-sheet.html`;

const SCREENS = ["skill", "perk", "legendary"];
const CANONICAL = 390;             // scripts/phone-proof.mjs checks against exactly 390 x 844
const BAND = [320, 390, 480, 639];

/* Measured, not chosen. The tile widths come out of deliverable M's sidecar in the OVERLAY-scrollbar
   mode, which is what a phone does; the classic-scrollbar rows in that file are a desktop artefact
   and would put the design 16 px narrower than the device it is for. If the sidecar is missing the
   sheet refuses rather than falling back to a plausible constant — that fallback is exactly what cost
   `icons-perks` a re-bake. */
function measuredWidths() {
  const file = join(OUT, "M-tile-widths.json");
  if (!existsSync(file)) {
    throw new Error(`no measurement at ${file} — run tile-width-probe.mjs first; the sheet does not guess widths`);
  }
  const data = JSON.parse(readFileSync(file, "utf8"));
  const byWidth = {};
  for (const r of data.results) {
    if (r.scrollbars !== "overlay") continue;
    const row = (byWidth[r.viewport.w] = byWidth[r.viewport.w] || {});
    for (const s of SCREENS) {
      if (!r[s] || !r[s].reached) continue;
      row[s] = { tile: r[s].tiles[0].w, card: r[s].card.paddingBoxWidth,
                 emblem: r[s].tiles[0].paddingBoxWidth };
    }
  }
  for (const w of BAND) {
    for (const s of SCREENS) {
      if (!byWidth[w] || !byWidth[w][s]) throw new Error(`measurement missing ${s} at ${w} px`);
    }
  }
  return byWidth;
}

/* ------------------------------------------------------------------------------------ dev server */

async function serverAlive() {
  try { return (await fetch(PAGE, { signal: AbortSignal.timeout(1500) })).ok; } catch { return false; }
}

async function ensureServer() {
  if (await serverAlive()) return { started: false, stop: async () => {} };
  const viteBin = join(ROOT, "node_modules", "vite", "bin", "vite.js");
  if (!existsSync(viteBin)) throw new Error("vite not found — run `npm ci` in this worktree first.");
  const proc = spawn(process.execPath, [viteBin, "--port", String(PORT), "--strictPort"],
                     { cwd: ROOT, stdio: "ignore" });
  for (let i = 0; i < 120; i++) {
    if (await serverAlive()) return { started: true, stop: async () => { proc.kill(); await sleep(300); } };
    await sleep(250);
  }
  proc.kill();
  throw new Error(`vite did not come up on ${PORT}`);
}

/* --------------------------------------------------------------------------------------- capture */

const VARIANTS = [
  { variant: "none",         label: "control — today" },
  { variant: "banner",       label: "banner" },
  { variant: "corner",       label: "corner emblem" },
  { variant: "corner-bleed", label: "corner emblem — bleeding" },
];

async function shoot(c, name, sheetBox) {
  const clip = { x: 0, y: 0, width: Math.ceil(sheetBox.w), height: Math.ceil(sheetBox.h) };
  const data = await screenshot(c, clip);
  const buf = Buffer.from(data, "base64");
  const file = join(OUT, `${name}.png`);
  writeFileSync(file, buf);
  return { file: `${name}.png`, bytes: buf.length, sha256: createHash("sha256").update(buf).digest("hex") };
}

async function render(c, columns, lang) {
  return await evaluate(c, `window.__mtSheet.build(${JSON.stringify({ columns, lang })})`);
}

/* German and English at the canonical width. Tile height depends on text length and the two differ,
   so a design that only holds in one of them is a design that has not been judged. The band sheets
   stay German: their question is the emblem's WIDTH across the band, which no translation moves. */
const LANGS = ["de", "en"];

/* V3 asked for less fade toward the tile's centre. These are the candidates, from the value shown at
   the gate to almost no fade at all — one sheet so the owner points at a stop instead of describing
   one. The pair is (solid until, transparent from) on the radial mask anchored at the top-right
   corner. */
const FADES = [
  { key: "gate",   label: "as shown at V3",   vars: { "--mt-fade-solid": "42%", "--mt-fade-end": "80%" } },
  { key: "less",   label: "less fade",        vars: { "--mt-fade-solid": "58%", "--mt-fade-end": "88%" } },
  { key: "least",  label: "least fade",       vars: { "--mt-fade-solid": "72%", "--mt-fade-end": "95%" } },
  { key: "hard",   label: "no fade — control", vars: { "--mt-fade-solid": "100%", "--mt-fade-end": "100%" } },
];

const main = async () => {
  mkdirSync(OUT, { recursive: true });
  const widths = measuredWidths();
  const server = await ensureServer();
  const sidecar = { note: "Deliverable S. Widths come from M-tile-widths.json (overlay-scrollbar rows) "
                        + "and are read back out of the DOM here; `control` vs each variant is D4's proof.",
                    canonical: CANONICAL, band: BAND, sheets: [] };
  const c = await launch({ port: 9361 });
  try {
    await c.send("Page.enable");
    await c.send("Runtime.enable");
    await setViewport(c, { width: 2200, height: 1800, deviceScaleFactor: 1 });
    await reduceMotion(c);
    await c.send("Page.addScriptToEvaluateOnNewDocument", { source:
      `window.__MT_DRIVEN = true;
       try { localStorage.setItem("as_options", JSON.stringify({ lang: "de", muted: true, telemetry: false })); } catch {}` });
    await goto(c, PAGE, { settleMs: 2500 });

    for (const lang of LANGS) {
      for (const screen of SCREENS) {
        const m = widths[CANONICAL][screen];
        const cols = VARIANTS.map((v) => ({ screen, variant: v.variant, label: v.label,
                                            tileWidth: m.tile, cardWidth: m.card,
                                            sub: `${CANONICAL} px · ${lang} · tile ${m.tile} · emblem ${m.emblem}` }));
        const probe = await render(c, cols, lang);
        await sleep(250);
        const img = await shoot(c, `variants-${screen}-${lang}`, probe.sheet);
        sidecar.sheets.push({ kind: "variants", screen, lang, viewport: CANONICAL, ...img, probe });
        process.stdout.write(`variants-${screen}-${lang}.png  ${probe.tiles.length} tiles  ${img.bytes} B\n`);
      }
    }

    for (const lang of ["de"]) {
      for (const screen of SCREENS) {
        const m = widths[CANONICAL][screen];
        const cols = FADES.map((f) => ({ screen, variant: "corner", label: f.label, vars: f.vars,
                                         tileWidth: m.tile, cardWidth: m.card,
                                         sub: `solid ${f.vars["--mt-fade-solid"]} · end ${f.vars["--mt-fade-end"]}` }));
        const probe = await render(c, cols, lang);
        await sleep(250);
        const img = await shoot(c, `fade-${screen}`, probe.sheet);
        sidecar.sheets.push({ kind: "fade", screen, lang, viewport: CANONICAL, fades: FADES, ...img, probe });
        process.stdout.write(`fade-${screen}.png  ${probe.tiles.length} tiles  ${img.bytes} B
`);
      }
    }

    for (const screen of SCREENS) {
      const cols = BAND.map((w) => ({ screen, variant: "banner", label: `${w} px`,
                                      tileWidth: widths[w][screen].tile, cardWidth: widths[w][screen].card,
                                      sub: `emblem ${widths[w][screen].emblem}` }));
      const probe = await render(c, cols, "de");
      await sleep(250);
      const img = await shoot(c, `band-${screen}`, probe.sheet);
      sidecar.sheets.push({ kind: "band", screen, lang: "de", viewport: BAND, ...img, probe });
      process.stdout.write(`band-${screen}.png  ${probe.tiles.length} tiles  ${img.bytes} B\n`);
    }
  } finally {
    await c.close();
    await server.stop();
  }

  /* D4, decided here rather than left to the eye: every variant tile must match the control tile of
     the same sample, box and type size, to the pixel. */
  const d4 = [];
  for (const sh of sidecar.sheets.filter((s) => s.kind === "variants")) {
    const control = new Map(sh.probe.tiles.filter((t) => t.variant === "none").map((t) => [t.kind, t]));
    for (const t of sh.probe.tiles) {
      if (t.variant === "none") continue;
      const c0 = control.get(t.kind);
      if (!c0) { d4.push({ screen: sh.screen, ...t, verdict: "no control tile" }); continue; }
      const same = c0.box.w === t.box.w && c0.box.h === t.box.h
        && JSON.stringify(c0.type) === JSON.stringify(t.type);
      if (!same) d4.push({ screen: sh.screen, variant: t.variant, kind: t.kind,
                           control: { box: c0.box, type: c0.type }, variantMeasured: { box: t.box, type: t.type } });
    }
  }
  sidecar.d4 = { violations: d4, verdict: d4.length === 0 ? "no variant changed a tile box or a type size" : "FAILED" };

  const file = join(OUT, "S-sheet-measurements.json");
  writeFileSync(file, JSON.stringify(sidecar, null, 2));
  console.log(`\nD4: ${sidecar.d4.verdict}`);
  console.log(`wrote ${file}`);
};

/* MH3: `process.exitCode`, not `process.exit()` — the latter discards queued stdout/stderr on POSIX,
   and here that is the stack trace this handler exists to print. */
main().catch((e) => { console.error(e); process.exitCode = 1; });
