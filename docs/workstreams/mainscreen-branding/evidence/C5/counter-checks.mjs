#!/usr/bin/env node
/* #mainscreen-branding C5 — the counter-checks for the two decided properties.
   ============================================================================

     node docs/workstreams/mainscreen-branding/evidence/C5/counter-checks.mjs

   Flush and filled are now DECIDED, which means they can break silently: nothing about the screen
   fails to render if the column drifts a pixel off the cap line or the squares go pale again. Each
   case below breaks one of them and expects `marke.test.js` to say so.

   THE LAST TWO ARE THE ONES WORTH THE FILE. Flush is not one property but three — the height, the
   width, and the absence of a correction value — and a guard that checked only the height would be
   green with a `vertical-align: -.05em` sitting under it, which is exactly the nudge the decision
   replaces. CC5 and CC6 put each of the other two back on its own.

   RESTORATION IS IN A `finally`. */

import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "../../../../..");
const F = { css: join(ROOT, "src/index.css") };
const ORIGINAL = Object.fromEntries(Object.entries(F).map(([k, p]) => [k, readFileSync(p, "utf8")]));
const restore = () => { for (const [k, p] of Object.entries(F)) writeFileSync(p, ORIGINAL[k]); };

const GUARD = "test/marke.test.js";
const run = () => spawnSync(process.execPath,
  [join(ROOT, "node_modules", "vitest", "vitest.mjs"), "run", GUARD],
  { cwd: ROOT, encoding: "utf8", env: { ...process.env, CI: "1" } });

const sabotage = (find, replace) => {
  if (!ORIGINAL.css.includes(find)) throw new Error(`sabotage target not found: ${JSON.stringify(find.slice(0, 70))}`);
  writeFileSync(F.css, ORIGINAL.css.replace(find, replace));
};

const CASES = [
  { id: "CC1", why: "the column goes back to the design's .874em — the overshoot returns",
    apply: () => sabotage("width: auto; height: .71875em;", "width: auto; height: .874em;") },
  { id: "CC2", why: "the height is nudged by a hair — the kind of drift nobody sees in a diff",
    apply: () => sabotage("width: auto; height: .71875em;", "width: auto; height: .72em;") },
  { id: "CC3", why: "the unlit cells go pale again",
    apply: () => sabotage("    fill-opacity: .28; stroke-opacity: .66;", "    fill-opacity: .03; stroke-opacity: .22;") },
  { id: "CC4", why: "the fill is loud but the edge was forgotten — half the step",
    apply: () => sabotage("    fill-opacity: .28; stroke-opacity: .66;", "    fill-opacity: .28; stroke-opacity: .22;") },
  { id: "CC5", why: "a vertical correction value comes back — the nudge the decision replaces",
    apply: () => sabotage("vertical-align: baseline;", "vertical-align: -.02em;") },
  { id: "CC6", why: "the width is set instead of taken from the viewBox — the cell leaves the grid",
    apply: () => sabotage("width: auto; height: .71875em;", "width: .074em; height: .71875em;") },
  { id: "CC7", why: "the mid tone is applied to the standalone mark as well, not only the column",
    apply: () => sabotage("  .hub-play .as-brandgrid-column .as-bg-quiet {", "  .hub-play .as-bg-quiet {") },
];

const lines = [];
const say = (s) => { lines.push(s); process.stdout.write(`${s}\n`); };
let unexpected = 0;

try {
  const base = run();
  say(`  BASELINE before  exit ${base.status}  ${base.status === 0 ? "GREEN as required" : "RED — nothing below is meaningful"}`);
  if (base.status !== 0) unexpected++;
  for (const c of CASES) {
    restore();
    c.apply();
    const r = run();
    const ok = r.status !== 0;
    if (!ok) unexpected++;
    say(`  ${c.id}  exit ${r.status}  ${ok ? "RED as required" : "GREEN — THE GUARD DID NOT NOTICE"}  — ${c.why}`);
  }
} finally {
  restore();
}

const after = run();
say(`  BASELINE after   exit ${after.status}  ${after.status === 0 ? "GREEN — the tree is restored" : "RED — THE TREE IS NOT RESTORED"}`);
if (after.status !== 0) unexpected++;

say(`\n  ${CASES.length} sabotages, 2 baselines, ${unexpected} unexpected`);
writeFileSync(join(HERE, "counter-checks.txt"), `${lines.join("\n")}\n`);
process.exitCode = unexpected ? 1 : 0;
