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
   accept exactly the class of defect a padding token is most likely to introduce.

   SURFACES ONLY. CONTROL STATES ARE NOT CAPTURED AND ARE VERIFIED BY HAND (MENU-56). The matrix this
   script reads holds each surface in its RESTING state: no cell renders a segment control selected,
   hovered, focused or disabled, so no delta on those states can appear here and their absence from
   this output is not evidence that they did not move. The line is printed with every run rather than
   left in this header, because the reader who needs it is reading the OUTPUT.

   NOTHING HERE IS TRUNCATED — MH1, and it is the whole reason this paragraph exists. Two lists used
   to stop at a cap and print "… and N more": the deltas at 200, the unmatched nodes at 40. The cap
   cut in the key's sort order, so the survivors were a CONTIGUOUS SLICE — one end of the alphabet,
   one end of the size list — and a slice of a sorted list reads exactly like a pattern. Read as
   complete, 200 of 410 deltas looked like "deltas only in German, a hole at 1920x1080": a finding
   that did not exist and that only re-aggregating caught (MENU-55).

   So every list below prints in full, and the census under each one states the distribution the
   reader would otherwise have to infer by eye. A tool that summarises without saying so manufactures
   findings, and a measured-looking finding is the expensive kind. */

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

/* The census that replaces the cap. A list printed in full is still read by eye, and an eye reading
   410 lines infers a distribution; this states it instead. `by` groups a list on a key and prints
   every group with its count — every group, because a census that elides is the defect again. */
const census = (label, items, keyOf) => {
  const m = new Map();
  for (const it of items) { const k = keyOf(it); m.set(k, (m.get(k) || 0) + 1); }
  if (!m.size) return;
  out.write(`      by ${label}: ` + [...m].sort((x, y) => y[1] - x[1] || String(x[0]).localeCompare(String(y[0])))
    .map(([k, n]) => `${k}=${n}`).join("  ") + `
`);
};

out.write(`
  compared ${comparedCells} cells, ${comparedNodes} matched nodes
`);
/* MENU-56, and it is printed on EVERY run including the green one. A gate that names its blind spot
   only when it fails is a gate that reassures precisely when it is trusted most. */
out.write(`  Surfaces only. Control states are not captured, nor is SVG paint (fill, stroke), and both are verified by hand.
`);

if (missingCells.length) {
  out.write(`
  ${missingCells.length} cell(s) not comparable:
`);
  for (const m of missingCells) out.write(`    ${m}
`);
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
out.write(`
  unmatched nodes: ${preUnmatched.length} pre-registered (H-c: leaderboard, victory)`
  + `, ${realUnmatched.length} elsewhere
`);
/* IN FULL. This list used to stop at 40. */
for (const u of realUnmatched) out.write(`    ${u.key}  ${u.path}  (${u.side})
`);
if (realUnmatched.length) {
  census("cell", realUnmatched, (u) => u.key);
  census("surface", realUnmatched, (u) => u.surface);
  census("side", realUnmatched, (u) => u.side);
}

if (!deltas.length) {
  out.write(`
  ZERO computed deltas on the four surface axes.
`);
} else {
  out.write(`
  ${deltas.length} computed delta(s), all of them printed:
`);
  /* IN FULL. This list used to stop at 200, and the 210 it dropped were a contiguous tail of the
     key sort — which is how a slice comes to look like "German only, nothing at 1920" (MENU-55). */
  for (const d of deltas) {
    out.write(`    ${d.key}
      ${d.path}  ${d.prop}
        before: ${d.from}
        after : ${d.to}
`);
  }
  out.write(`
  distribution of the ${deltas.length} delta(s) — stated, not left to the eye:
`);
  census("cell", deltas, (d) => d.key);
  /* The key is `lang/size/surface`, in that order — viewport-survey.mjs:408. */
  census("lang", deltas, (d) => d.key.split("/")[0]);
  census("size", deltas, (d) => d.key.split("/")[1]);
  census("surface", deltas, (d) => d.key.split("/")[2]);
  census("property", deltas, (d) => d.prop);
}

/* Unmatched nodes outside the two pre-registered surfaces are a failure too: a node that stopped
   painting is a moved pixel, and it would otherwise leave through the gap this script opens for
   H-c. */
/* #menu-rework MH3 — `process.exitCode`, NOT `process.exit()`, and the difference is the whole
   reason this line is commented.

   On POSIX a piped stdout is ASYNCHRONOUS. `process.exit()` terminates immediately and discards
   whatever is still queued in the write buffer, so a run that prints more than a pipe drains in one
   tick loses its tail. This script writes 34 kB against the MH1 fixture. On Windows pipes are
   SYNCHRONOUS, so nothing is ever lost — which is why the defect passed on the dev machine every
   time and failed on the Linux CI runner under load. Windows-dev / Linux-CI, the same hazard class
   as `.gitattributes` (`AGENTS.md` — *Platform*).

   Measured on a 4-core Linux box: idle 0/40 runs truncated, under 12 spinners 33/40, shortest
   survivor 19 346 bytes — the exact byte at which CI cut. What survived was a contiguous slice of
   the sort order, so it read as "deltas only in German, a hole at 1920x1080": literally the false
   finding MENU-55 nearly produced, arriving this time through a lost flush rather than a coded cap.

   `process.exitCode` sets the status and lets Node exit naturally, after the buffer drains. The
   census block is printed AFTER the delta list and was therefore the first thing lost, which is why
   two assertions failed rather than one. */
process.exitCode = deltas.length || realUnmatched.length ? 1 : 0;
