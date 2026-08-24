#!/usr/bin/env node
/* #menu-rework M1 — the zero-delta gate, as a program rather than as a claim.
   ============================================================================

     node scripts/surface-delta.mjs <before-dir> <after-dir>

   Compares two survey matrices cell by cell and prints every computed difference on the four
   surface axes. Exit 0 means the two runs are identical where they are comparable; exit 1 means
   they are not, and every difference is on stdout with the surface, the size, the language, the
   node path and both values.

   WHAT "COMPARABLE" MEANS, and it is pre-registered rather than discovered.

   Nodes are matched by the structural path from body. A path present in one run and absent in the
   other is NOT a delta — it is a tree that differs, and two surfaces in this matrix legitimately
   differ between runs for reasons that have nothing to do with this task:

     TYPO-08  the leaderboard's row count follows network data;
     TYPO-11  the victory screen's node set follows the run outcome (the record banner).

   Those are named in the M1 contract as hazard H-c and are counted separately as "unmatched", not
   silently dropped and not counted as deltas. ANY OTHER unmatched path is reported too, in the same
   list, because the difference between "pre-registered" and "real" is which surface it is on, and
   that is a judgement for the findings table rather than for this script.

   BOX GEOMETRY IS COMPARED WITH A TOLERANCE OF ZERO. Sub-pixel drift is not expected between two
   runs of the same deterministic harness at the same viewport, and accepting a tolerance here would
   accept exactly the class of defect a padding token is most likely to introduce. */

import { readFileSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";

const [beforeDir, afterDir] = process.argv.slice(2);
if (!beforeDir || !afterDir) {
  process.stderr.write("usage: node scripts/surface-delta.mjs <before-dir> <after-dir>\n");
  process.exit(2);
}
const load = (dir) => {
  const p = join(resolve(dir), "matrix.json");
  if (!existsSync(p)) { process.stderr.write(`no matrix.json in ${dir}\n`); process.exit(2); }
  return JSON.parse(readFileSync(p, "utf8"));
};
const A = load(beforeDir), B = load(afterDir);

/* Every key the surface probe records, in the order it records them. `box` is compared elementwise. */
const PROPS = ["bg", "bi", "bo", "bc", "bw", "bs", "rd", "sh", "pd", "ol", "op", "cl"];
/* H-c: the two surfaces whose node set is allowed to differ between runs. */
const PREREGISTERED = new Set(["leaderboard", "victory"]);

const deltas = [];
const unmatched = [];
const tokenChanges = new Map();   /* text -> how many cells showed it */
const missingCells = [];
let comparedCells = 0, comparedNodes = 0;

const keys = [...new Set([...Object.keys(A.cells), ...Object.keys(B.cells)])].sort();
for (const key of keys) {
  const a = A.cells[key], b = B.cells[key];
  const surface = key.split("/")[2];
  if (!a || !b) { missingCells.push(`${key}: present in only one run`); continue; }
  if (a.reached === false || b.reached === false) {
    if (a.reached !== b.reached) missingCells.push(`${key}: reached ${!!a.reached} -> ${!!b.reached}`);
    continue;
  }
  if (!a.surface || !b.surface) { missingCells.push(`${key}: no surface section (probe missing on one side)`); continue; }
  comparedCells++;

  /* THE TOKEN TABLE IS DIAGNOSTIC, NOT THE GATE, and the distinction is worth being exact about
     because it decides what this script fails on.

     What the probe records off :root is a custom property's SPECIFIED text. What the gate is about
     is COMPUTED values on elements — the twelve properties plus the box, measured on every painting
     node. `1rem` and `calc(1rem * 1)` are two spellings of one computed value, so a token whose text
     changed while every consumer computes identically has by definition moved no pixel.

     Failing on the text would therefore report a difference that does not exist. Not failing on it
     would be a hole only if a token could change value with no measured consumer — and the tokens
     with no consumer are exactly the ones Tailwind prunes, which never reach this table at all.
     Every token that DOES appear here has live consumers among the 24k element rows below, so a
     wrong value shows up there.

     So: printed in full, never elided, and not counted as a delta. The reader decides what a text
     change means; the gate stays on the elements. */
  const at = a.tokens || {}, bt = b.tokens || {};
  for (const t of [...new Set([...Object.keys(at), ...Object.keys(bt)])].sort()) {
    if (at[t] === bt[t]) continue;
    tokenChanges.set(`${t}: ${at[t] ?? "(absent)"} -> ${bt[t] ?? "(absent)"}`,
      (tokenChanges.get(`${t}: ${at[t] ?? "(absent)"} -> ${bt[t] ?? "(absent)"}`) || 0) + 1);
  }

  const am = new Map(a.surface.map((r) => [r.p, r]));
  const bm = new Map(b.surface.map((r) => [r.p, r]));
  for (const [p, ra] of am) {
    const rb = bm.get(p);
    if (!rb) { unmatched.push({ key, surface, path: p, side: "only in before", pre: PREREGISTERED.has(surface) }); continue; }
    comparedNodes++;
    for (const prop of PROPS) {
      if (ra[prop] !== rb[prop]) deltas.push({ key, path: p, prop, from: ra[prop], to: rb[prop] });
    }
    for (let i = 0; i < 4; i++) {
      if (ra.box[i] !== rb.box[i]) {
        deltas.push({ key, path: p, prop: "box[" + "xywh"[i] + "]", from: ra.box[i], to: rb.box[i] });
      }
    }
  }
  for (const [p] of bm) {
    if (!am.has(p)) unmatched.push({ key, surface, path: p, side: "only in after", pre: PREREGISTERED.has(surface) });
  }
}

const out = process.stdout;
out.write(`\n  compared ${comparedCells} cells, ${comparedNodes} matched nodes\n`);

if (missingCells.length) {
  out.write(`\n  ${missingCells.length} cell(s) not comparable:\n`);
  for (const m of missingCells) out.write(`    ${m}\n`);
}

if (tokenChanges.size) {
  out.write(`
  ${tokenChanges.size} vocabulary token(s) differ in DECLARED TEXT (diagnostic, not the gate —
`
    + `  the gate is the computed element rows below):
`);
  for (const t of [...tokenChanges.keys()].sort()) out.write(`    ${t}   [${tokenChanges.get(t)} cells]
`);
}

const preUnmatched = unmatched.filter((u) => u.pre);
const realUnmatched = unmatched.filter((u) => !u.pre);
out.write(`\n  unmatched nodes: ${preUnmatched.length} pre-registered (H-c: leaderboard, victory)`
  + `, ${realUnmatched.length} elsewhere\n`);
for (const u of realUnmatched.slice(0, 40)) out.write(`    ${u.key}  ${u.path}  (${u.side})\n`);
if (realUnmatched.length > 40) out.write(`    … and ${realUnmatched.length - 40} more\n`);

if (!deltas.length) {
  out.write(`\n  ZERO computed deltas on the four surface axes.\n`);
} else {
  out.write(`\n  ${deltas.length} computed delta(s):\n`);
  for (const d of deltas.slice(0, 200)) {
    out.write(`    ${d.key}\n      ${d.path}  ${d.prop}\n        before: ${d.from}\n        after : ${d.to}\n`);
  }
  if (deltas.length > 200) out.write(`    … and ${deltas.length - 200} more\n`);
}

/* Unmatched nodes outside the two pre-registered surfaces are a failure too: a node that stopped
   painting is a moved pixel, and it would otherwise leave through the gap this script opens for
   H-c. */
process.exit(deltas.length || realUnmatched.length ? 1 : 0);
