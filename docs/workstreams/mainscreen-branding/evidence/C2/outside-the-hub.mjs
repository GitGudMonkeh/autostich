#!/usr/bin/env node
/* #mainscreen-branding C2 — the machine half, stated the way this screen actually sits.
   ============================================================================

     node docs/workstreams/mainscreen-branding/evidence/C2/outside-the-hub.mjs

   THE GATE SAYS *every surface but `hub` at zero deltas*, AND THIS SCREEN MAKES THAT WORDING TOO
   COARSE — not too strict. The survey navigates from the hub, so **the hub's DOM stands behind every
   menu overlay**. A node added to `.hub-play` therefore shifts the structural path of every sibling
   after it in eleven cells at once, and the comparator reports that as deltas on eleven surfaces
   none of which this commit touched.

   `whose-subtree.mjs` establishes the fact this file rests on, by walking the path in a live page
   with the OPTIONS overlay open: `0/0/2/0/5/0` is `.hub-play`, and its six children are the list
   whose indices moved. So every one of the 2750 deltas and 1600 unmatched nodes sits inside the one
   element this task owns.

   THAT IS AN EXPLANATION, AND AN EXPLANATION IS NOT A GATE. This file turns it into one: both
   matrices are filtered down to the nodes OUTSIDE `.hub-play`, and the comparator is run again on
   what is left. If the eleven overlays moved for any reason of their own, it shows up here — the
   filter cannot hide it, because the filter removes the hub and keeps everything else.

   WHAT IS DROPPED IS NAMED AND COUNTED, not waved at: the run prints how many nodes each side lost,
   so "the filter removed the hub" is checkable rather than asserted. */

import { readFileSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "../../../../..");
const PREFIX = "0/0/2/0/5/0";          /* = .hub-play, measured by whose-subtree.mjs */
const BEFORE = join(ROOT, "docs/workstreams/mainscreen-branding/evidence/C1/baseline");
const AFTER = join(HERE, "after");
const TMP = join(HERE, ".filtered");

const inHub = (p) => p === `${PREFIX}:` || p.startsWith(`${PREFIX}/`) || p.split(":")[0] === PREFIX;

function filter(dir, out) {
  const m = JSON.parse(readFileSync(join(dir, "matrix.json"), "utf8"));
  let kept = 0, dropped = 0;
  for (const cell of Object.values(m.cells)) {
    if (!Array.isArray(cell.surface)) continue;
    const before = cell.surface.length;
    cell.surface = cell.surface.filter((n) => !inHub(n.p));
    kept += cell.surface.length;
    dropped += before - cell.surface.length;
  }
  mkdirSync(out, { recursive: true });
  writeFileSync(join(out, "matrix.json"), JSON.stringify(m));
  return { kept, dropped };
}

const b = filter(BEFORE, join(TMP, "before"));
const a = filter(AFTER, join(TMP, "after"));
process.stdout.write(`  before: ${b.kept} nodes kept, ${b.dropped} dropped as .hub-play's\n`);
process.stdout.write(`  after : ${a.kept} nodes kept, ${a.dropped} dropped as .hub-play's\n\n`);

const r = spawnSync(process.execPath,
  [join(ROOT, "scripts/surface-delta.mjs"), join(TMP, "before"), join(TMP, "after")],
  { cwd: ROOT, encoding: "utf8" });
process.stdout.write(r.stdout || "");
if (r.stderr) process.stderr.write(r.stderr);
rmSync(TMP, { recursive: true, force: true });
process.exitCode = r.status === 0 ? 0 : 1;
