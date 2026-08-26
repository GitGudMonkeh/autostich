#!/usr/bin/env node
/* #mainscreen-branding — the census the planner needs, so the counters are numbers and not guesses.
   ============================================================================

     node docs/workstreams/mainscreen-branding/evidence/C6/census.mjs

   §2c's threshold reads: **a gap becomes a token on the third independent CALL SITE, not the third
   screen.** So a worker that reports "this screen misses a step" hands the planner an impression; a
   worker that reports how many places in the tree carry the same value hands it a decision.

   Three families are counted, and each is one this workstream had to leave as a deviation:

     1. the translucent PANEL SURFACE — `rgba(20, 20, 26, …)`, the attribute chip's ground
     2. the translucent DIVIDER — `rgba(60, 58, 78, …)`, the hub list's row separator
     3. PANEL INSETS that are not `--in-base` — counted as VALUES, because the threshold counts a
        value spreading and not a category being missed

   Counted over `src/**` — every JSX file and the stylesheet — with comments stripped, because a
   value named in a comment is not a call site. */

import { readFileSync, readdirSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../../../..");
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
const files = [
  "src/index.css",
  ...readdirSync(join(ROOT, "src/ui")).filter((f) => f.endsWith(".jsx")).map((f) => `src/ui/${f}`),
  "src/App.jsx",
];

const FAMILIES = [
  { name: "translucent panel surface  rgba(20, 20, 26, a)", re: /rgba\(\s*20\s*,\s*20\s*,\s*26\s*,\s*[\d.]+\s*\)/g },
  { name: "translucent divider        rgba(60, 58, 78, a)", re: /rgba\(\s*60\s*,\s*58\s*,\s*78\s*,\s*[\d.]+\s*\)/g },
  { name: "MENU-38 neutral edge       rgba(150,150,170, a)", re: /rgba\(\s*150\s*,\s*150\s*,\s*170\s*,\s*[\d.]+\s*\)/g },
];

for (const fam of FAMILIES) {
  const hits = [];
  for (const f of files) {
    const src = strip(readFileSync(join(ROOT, f), "utf8"));
    for (const m of src.matchAll(new RegExp(fam.re.source, "g"))) hits.push({ f, v: m[0].replace(/\s+/g, "") });
  }
  const byFile = hits.reduce((a, h) => (a[h.f] = (a[h.f] || 0) + 1, a), {});
  const byValue = hits.reduce((a, h) => (a[h.v] = (a[h.v] || 0) + 1, a), {});
  process.stdout.write(`\n  ${fam.name}\n`);
  process.stdout.write(`    ${hits.length} call site(s) in ${Object.keys(byFile).length} file(s)`
    + `, ${Object.keys(byValue).length} distinct alpha(s)\n`);
  for (const [f, n] of Object.entries(byFile).sort((a, b) => b[1] - a[1])) {
    process.stdout.write(`      ${String(n).padStart(3)}  ${f}\n`);
  }
  process.stdout.write(`      values: ${Object.entries(byValue).map(([v, n]) => `${v} x${n}`).join("  ")}\n`);
}

/* The inset question, counted as VALUES rather than as "a panel that misses 18". A category that is
   missed at three different values is three one-sightings, not one three-sighting — and saying so is
   the difference between reporting a trigger and reporting a wish. */
const css = strip(readFileSync(join(ROOT, "src/index.css"), "utf8"));
const insets = {};
for (const m of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
  const sel = m[1].trim().split("\n").pop().trim();
  if (!sel || sel.startsWith("@")) continue;
  for (const d of m[2].matchAll(/(?:^|;)\s*padding\s*:\s*([^;}]+)/g)) {
    const v = d[1].trim();
    if (/var\(|^0/.test(v)) continue;
    (insets[v] ||= []).push(sel);
  }
}
process.stdout.write(`\n  PANEL/BOX INSETS written as a literal shorthand, across the whole stylesheet\n`);
const sorted = Object.entries(insets).sort((a, b) => b[1].length - a[1].length);
for (const [v, sels] of sorted.slice(0, 12)) {
  process.stdout.write(`    ${String(sels.length).padStart(3)} x  padding: ${v.padEnd(18)} ${sels.slice(0, 3).join(" · ")}`
    + `${sels.length > 3 ? " · …" : ""}\n`);
}
const three = sorted.filter(([, s]) => s.length >= 3);
process.stdout.write(`\n    values at three or more call sites: ${three.length}`
  + `${three.length ? " -> " + three.map(([v, s]) => `${v} (${s.length})`).join(", ") : ""}\n`);
