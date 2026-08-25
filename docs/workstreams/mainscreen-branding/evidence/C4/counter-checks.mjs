#!/usr/bin/env node
/* #mainscreen-branding C4 — the counter-checks for the ratchet's newest entries.
   ============================================================================

     node docs/workstreams/mainscreen-branding/evidence/C4/counter-checks.mjs

   C4 does not add a guard; it adds the mainscreen to one that already exists. That is a weaker thing
   to claim and a harder one to prove: `panel-tokens.test.js` was green before this commit too, and it
   would stay green if the entry were wrong in the direction that matters — an allowlist that catches
   nothing looks exactly like an allowlist with nothing to catch.

   So each case below breaks one thing the NEW entry claims, on the axis that entry opened:

     CC1-CC5   one literal per axis, put back at a call site inside the mainscreen
     CC6       a desktop padding utility returns to the JSX — the fourth spelling, TYPO-12's half
     CC7       an arbitrary utility returns — the third spelling
     CC8       an ink literal is added — the ink ratchet, which counts and does not coin
     CC9       a translucent edge is added — MENU-38's ratchet, at the unit that carries six of them
     CC10      an exemption is pointed at a selector that no longer exists — the guard's own
               honesty check, which is the half that rots without anyone noticing
     CC11      the deck panel's own hook is removed — the allowlist would then cover nothing of C3

   AND ONE GREEN-ON-PURPOSE CASE. CC12 removes the mainscreen ENTRY itself and expects the suite to
   stay green — because that is what "the entry catches something" has to mean: with it, the tree is
   green; without it, the tree is also green, and the difference is what the entry would refuse
   TOMORROW. So CC12 is paired with CC1 re-run without the entry, which must go GREEN — the same
   defect the entry catches, invisible to the guard that does not carry it.

   RESTORATION IS IN A `finally`. */

import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "../../../../..");
const F = {
  css: join(ROOT, "src/index.css"),
  start: join(ROOT, "src/ui/StartScreen.jsx"),
  guard: join(ROOT, "test/panel-tokens.test.js"),
};
const ORIGINAL = Object.fromEntries(Object.entries(F).map(([k, p]) => [k, readFileSync(p, "utf8")]));
const restore = () => { for (const [k, p] of Object.entries(F)) writeFileSync(p, ORIGINAL[k]); };

const GUARD = "test/panel-tokens.test.js";
const DECK = "test/deck-tafel.test.js";
const run = (file = GUARD) => spawnSync(process.execPath,
  [join(ROOT, "node_modules", "vitest", "vitest.mjs"), "run", file],
  { cwd: ROOT, encoding: "utf8", env: { ...process.env, CI: "1" } });

const sabotage = (key, find, replace) => {
  const src = ORIGINAL[key];
  if (!src.includes(find)) throw new Error(`sabotage target not found in ${key}: ${JSON.stringify(find.slice(0, 70))}`);
  writeFileSync(F[key], src.replace(find, replace));
};

/* The entry itself, removed by pointing the allowlist's file path at nothing. Written as a single
   replacement so the reconstruction cannot drift from what the guard actually carries. */
const ENTRY = '  { path: "src/ui/StartScreen.jsx", stateLiterals: [';
const dropEntry = (src) => {
  const i = src.indexOf(ENTRY);
  if (i < 0) throw new Error("the mainscreen entry moved — this counter-check cannot find it");
  const end = src.indexOf("] },", i);
  return src.slice(0, i) + src.slice(end + 4);
};

const CASES = [
  { id: "CC1", why: "Flaeche: a raw fill returns to a migrated rule",
    apply: () => sabotage("css", "    background: var(--sf-ground);", "    background: #141419;") },
  { id: "CC2", why: "Kante: a raw edge returns",
    apply: () => sabotage("css", "    border: 1px solid var(--ed-quiet);", "    border: 1px solid #2a2a33;") },
  { id: "CC3", why: "Radius: a raw radius returns to the attribute chip",
    apply: () => sabotage("css", "    border-radius: var(--rd-md);\n    font-size: var(--text-body)",
      "    border-radius: 8px;\n    font-size: var(--text-body)") },
  { id: "CC4", why: "Hoehe: an elevation literal appears where the ladder has a step",
    apply: () => sabotage("css", "  .hub-foot .as-hub-chip { padding: 11px 20px; }",
      "  .hub-foot .as-hub-chip { padding: 11px 20px; box-shadow: 0 2px 9px rgba(0,0,0,.4); }") },
  { id: "CC5", why: "Innenabstand: a panel inset appears on a rule no exemption names",
    apply: () => sabotage("css", "  .as-hub-list .as-hub-stripe { border-radius: 0; }",
      "  .as-hub-list .as-hub-stripe { border-radius: 0; padding: 7px; }") },
  { id: "CC6", why: "a desktop padding utility returns to the JSX — the fourth spelling",
    apply: () => sabotage("start", 'className="as-tut-btn w-full px-5 py-3 rounded-xl',
      'className="as-tut-btn w-full px-5 py-3 dt:py-4 rounded-xl') },
  { id: "CC7", why: "an arbitrary utility returns — the third spelling",
    apply: () => sabotage("start", 'className="as-deck hidden dt:flex as-glass as-ring flex-col gap-[18px] rounded-2xl"',
      'className="as-deck hidden dt:flex as-glass as-ring flex-col gap-[18px] rounded-2xl py-[22px]"') },
  { id: "CC8", why: "an ink literal is added — the ratchet counts and does not coin",
    apply: () => sabotage("css", "  .as-tagline-dot { color: #5c5c68; }",
      "  .as-tagline-dot { color: #5c5c68; }\n  .as-hub-chip span { color: #b3a8ff; }") },
  { id: "CC9", why: "a seventh translucent edge is added to the unit that carries six",
    apply: () => sabotage("css", "  .hub-foot .as-hub-chip { padding: 11px 20px; }",
      "  .hub-foot .as-hub-chip { padding: 11px 20px; border-color: rgba(150, 150, 170, .13); }") },
  { id: "CC10", why: "an exemption is pointed at a selector that no longer exists",
    apply: () => sabotage("guard", "/^\\.hub-foot \\.as-hub-chip$/,", "/^\\.hub-foot \\.as-hub-chip-that-never-was$/,") },
  /* CC11 RUNS AGAINST THE OTHER GUARD, and the first version did not — it pointed this defect at the
     ratchet, which stayed green, correctly: `panel-tokens.test.js` never asks whether a class EXISTS,
     only what the rules that mention it carry. The hook's existence is `deck-tafel.test.js`'s claim.
     A counter-check aimed at the wrong guard reports "the guard did not notice" about a guard that was
     never asked. */
  { id: "CC11", guard: DECK, why: "the deck panel's own hook is removed — every C3 rule would then dress nothing",
    apply: () => sabotage("start", 'className="as-deck hidden dt:flex', 'className="hidden dt:flex') },
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
    const r = run(c.guard || GUARD);
    const ok = r.status !== 0;
    if (!ok) unexpected++;
    say(`  ${c.id.padEnd(5)} exit ${r.status}  ${ok ? "RED as required" : "GREEN — THE GUARD DID NOT NOTICE"}  — ${c.why}`);
  }

  /* --- CC12: what the entry is actually worth ------------------------------
     The same defect as CC1, against a guard that does not carry the mainscreen. It must go GREEN —
     otherwise the entry is decorative and something else was already catching this. */
  restore();
  writeFileSync(F.guard, dropEntry(ORIGINAL.guard));
  const cleanNoEntry = run();
  say(`  CC12a exit ${cleanNoEntry.status}  ${cleanNoEntry.status === 0 ? "GREEN — the tree passes without the entry too" : "RED — removing the entry alone breaks the suite"}`
    + "  — the entry costs nothing on a clean tree, which is what an allowlist should do");
  if (cleanNoEntry.status !== 0) unexpected++;

  /* THE DEFECT HAS TO BE ONE ONLY THIS ENTRY CATCHES, and the first version got that wrong: it used
     CC1's raw fill, which is a CSS defect, while the entry being removed is the JSX one. The CSS side
     comes in through `MIGRATED_SELECTORS`, so the guard stayed red and the probe read "the entry buys
     nothing" about a pairing that never tested it. CC6's defect is the right one — a `dt:` utility is
     seen by the FILE entry and by nothing else. */
  writeFileSync(F.start, ORIGINAL.start.replace(
    'className="as-tut-btn w-full px-5 py-3 rounded-xl', 'className="as-tut-btn w-full px-5 py-3 dt:py-4 rounded-xl'));
  const defectNoEntry = run();
  const blind = defectNoEntry.status === 0;
  if (!blind) unexpected++;
  say(`  CC12b exit ${defectNoEntry.status}  ${blind ? "GREEN without the entry — so the entry is what catches CC6" : "RED without the entry — something else already caught it, the entry buys nothing"}`
    + "  — CC6's defect, guard without the mainscreen entry");
} finally {
  restore();
}

const after = run();
const afterDeck = run(DECK);
if (afterDeck.status !== 0) unexpected++;
say(`  BASELINE after   deck exit ${afterDeck.status}${afterDeck.status === 0 ? " GREEN" : " RED — THE TREE IS NOT RESTORED"}`);
say(`  BASELINE after   exit ${after.status}  ${after.status === 0 ? "GREEN — the tree is restored" : "RED — THE TREE IS NOT RESTORED"}`);
if (after.status !== 0) unexpected++;

say(`\n  ${CASES.length} sabotages + 2 entry probes, 2 baselines, ${unexpected} unexpected`);
writeFileSync(join(HERE, "counter-checks.txt"), `${lines.join("\n")}\n`);
process.exitCode = unexpected ? 1 : 0;
