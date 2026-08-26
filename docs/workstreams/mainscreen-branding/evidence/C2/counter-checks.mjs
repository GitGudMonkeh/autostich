#!/usr/bin/env node
/* #mainscreen-branding C2 — the counter-checks: does the guard notice?
   ============================================================================

     node docs/workstreams/mainscreen-branding/evidence/C2/counter-checks.mjs

   A GREEN GUARD PROVES NOTHING UNTIL IT HAS BEEN SEEN TO GO RED. `marke.test.js` passes; so would a
   file full of `expect(true).toBe(true)`. Each case below breaks exactly one thing the guard claims
   to hold, runs the guard, and expects it to fail — then puts the source back.

   THE SABOTAGES ARE THE FAILURES THE ROUND ACTUALLY HAD, not imagined ones:

     · the wordmark rule loses its scope           — the trap this screen has all to itself
     · the accented set becomes a typed list       — the design's own warning, made checkable
     · a colour moves into the component           — invisible to `panel-tokens.test.js` if it does
     · the mark is renamed in one language only    — the assumption the whole cut rests on
     · the English tagline loses its period        — Q3a, decided twice and printed wrongly once
     · a second `--wm-size` rule appears           — how the run header's mark moves
     · the cell column reaches below 1280 px       — the non-goal this round is built around
     · the narrow version gets the DOM back        — the 0.02 px this commit exists to avoid

   RESTORATION IS IN A `finally`, and every file's original text is held in memory before the first
   edit. A counter-check run that dies half-way must not leave the tree sabotaged.

   TWO CASES ARE GREEN-ON-PURPOSE. A guard that goes red for everything is not a guard, it is a lock:
   the clean baseline before the run, and the clean baseline after it, must both pass — the second is
   what proves the restoration worked, and it is the assertion this file would be worthless without. */

import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../../../..");
const F = {
  css: join(ROOT, "src/index.css"),
  grid: join(ROOT, "src/ui/BrandGrid.jsx"),
  start: join(ROOT, "src/ui/StartScreen.jsx"),
  en: join(ROOT, "src/i18n/en.js"),
  de: join(ROOT, "src/i18n/de.js"),
};
const ORIGINAL = Object.fromEntries(Object.entries(F).map(([k, p]) => [k, readFileSync(p, "utf8")]));
const restore = () => { for (const [k, p] of Object.entries(F)) writeFileSync(p, ORIGINAL[k]); };

/* `--run` so vitest does not go into watch mode; the guard is the only file, so a full suite is not
   paid for eight times. Exit code is the verdict; stdout is kept for the record. */
const runGuard = () => spawnSync(process.execPath,
  [join(ROOT, "node_modules", "vitest", "vitest.mjs"), "run", "test/marke.test.js"],
  { cwd: ROOT, encoding: "utf8", env: { ...process.env, CI: "1" } });

/* A sabotage is a single string replacement. If the search text is not found the case ABORTS rather
   than silently doing nothing — a counter-check that edited nothing and then saw green would report
   "the guard caught it" about a file it never changed. That is the shape this round found eight
   times, and it would be embarrassing to rebuild it here. */
const sabotage = (key, find, replace) => {
  const src = ORIGINAL[key];
  if (!src.includes(find)) throw new Error(`sabotage target not found in ${key}: ${JSON.stringify(find.slice(0, 60))}`);
  writeFileSync(F[key], src.replace(find, replace));
};

const CASES = [
  { id: "CC1", why: "the wordmark's size rule loses its scope — the run header would move",
    apply: () => sabotage("css", "  .hub-play .as-wordmark { --wm-size: inherit; margin-top: -70px; }",
      "  .as-wordmark { --wm-size: inherit; margin-top: -70px; }") },
  { id: "CC2", why: "a second, unscoped --wm-size rule is added beside the scoped one",
    apply: () => sabotage("css", "  .hub-play { --wm-size: 88px; }",
      "  .hub-play { --wm-size: 88px; }\n  .as-wordmark-hero { --wm-size: 64px; }") },
  { id: "CC3", why: "the accented set becomes a typed list of fourteen numbers",
    apply: () => sabotage("grid", "  if (cut === \"column\") return p % 3 === 0 ? \"hot\" : \"quiet\";",
      "  const ACCENTED = [0, 3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36, 39];\n"
      + "  if (cut === \"column\") return ACCENTED.includes(p) ? \"hot\" : \"quiet\";") },
  { id: "CC4", why: "a colour moves into the component, where no ratchet and no cascade can reach it",
    apply: () => sabotage("grid", "className={`as-bg-cell as-bg-${cellState(p, total, cut)}`}",
      "className={`as-bg-cell as-bg-${cellState(p, total, cut)}`} fill=\"#26c6e6\"") },
  { id: "CC5", why: "the English mark is renamed and no longer carries the I at seventh place",
    apply: () => sabotage("en", '"start.logo.alt": "AUTOTRICK",', '"start.logo.alt": "AUTOTRICKS",') },
  { id: "CC6", why: "the mark gains a second I — the cut becomes ambiguous",
    apply: () => sabotage("de", '"start.logo.alt": "AUTOSTICH",', '"start.logo.alt": "AUTISTICH",') },
  { id: "CC7", why: "the English tagline loses its closing period — Q3a, printed wrongly once already",
    apply: () => sabotage("en", '"start.tagline": "Order. Trick. Escalate.",',
      '"start.tagline": "Order. Trick. Escalate",') },
  { id: "CC8", why: "the cell column is made visible outside the desktop section",
    apply: () => sabotage("css", ".as-brandgrid { display: none; }",
      ".as-brandgrid { display: inline-block; }") },
  { id: "CC9", why: "the narrow version gets both variants in the DOM again — the 0.02 px this commit removed",
    apply: () => sabotage("start", "{wide && logoI >= 0",
      "{logoI >= 0") },
  { id: "CC10", why: "the standalone mark is dropped and only the letter remains",
    apply: () => sabotage("start", '<BrandGrid cut="full" className="as-brandmark" />', "") },
];

const lines = [];
const say = (s) => { lines.push(s); process.stdout.write(`${s}\n`); };

let unexpected = 0;
try {
  const base = runGuard();
  say(`  BASELINE before  exit ${base.status}  ${base.status === 0 ? "GREEN as required" : "RED — nothing below is meaningful"}`);
  if (base.status !== 0) unexpected++;

  for (const c of CASES) {
    restore();
    c.apply();
    const r = runGuard();
    const ok = r.status !== 0;
    if (!ok) unexpected++;
    say(`  ${c.id}  exit ${r.status}  ${ok ? "RED as required" : "GREEN — THE GUARD DID NOT NOTICE"}  — ${c.why}`);
  }
} finally {
  restore();
}

const after = runGuard();
say(`  BASELINE after   exit ${after.status}  ${after.status === 0 ? "GREEN — the tree is restored" : "RED — THE TREE IS NOT RESTORED"}`);
if (after.status !== 0) unexpected++;

say(`\n  ${CASES.length} sabotages, 2 baselines, ${unexpected} unexpected`);
writeFileSync(join(dirname(fileURLToPath(import.meta.url)), "counter-checks.txt"),
  `${lines.join("\n")}\n`);
process.exitCode = unexpected ? 1 : 0;
