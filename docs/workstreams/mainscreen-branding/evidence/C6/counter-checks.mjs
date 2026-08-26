#!/usr/bin/env node
/* #mainscreen-branding C6 — the counter-checks for a guard that asserts an ABSENCE.
   ============================================================================

     node docs/workstreams/mainscreen-branding/evidence/C6/counter-checks.mjs

   C6 deletes rather than adds, and a deletion is the hardest thing to keep deleted: five assertions
   went with the cut, and if nothing replaced them the invariant would be unwatched at exactly the
   moment it is most likely to come back — the next person who likes the look.

   So the replacement is written as an absence, and an absence check has a failure mode of its own: it
   is green on an empty file, on a typo in the search string, and on a file it cannot read. Each case
   below puts one piece of the cut back and expects the guard to say so.

   CC6 IS THE ONE THAT MATTERS. It reintroduces the cut in the shape it would actually return in — not
   the literal string the guard greps for, but working code that renders the column again — and checks
   that the guard still catches it. A guard that only recognises the exact spelling it was written
   against is a guard against `git revert`, not against the idea coming back.

   RESTORATION IS IN A `finally`. */

import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "../../../../..");
const F = {
  start: join(ROOT, "src/ui/StartScreen.jsx"),
  grid: join(ROOT, "src/ui/BrandGrid.jsx"),
  css: join(ROOT, "src/index.css"),
};
const ORIGINAL = Object.fromEntries(Object.entries(F).map(([k, p]) => [k, readFileSync(p, "utf8")]));
const restore = () => { for (const [k, p] of Object.entries(F)) writeFileSync(p, ORIGINAL[k]); };

const GUARD = "test/marke.test.js";
const run = () => spawnSync(process.execPath,
  [join(ROOT, "node_modules", "vitest", "vitest.mjs"), "run", GUARD],
  { cwd: ROOT, encoding: "utf8", env: { ...process.env, CI: "1" } });

const sabotage = (key, find, replace) => {
  const src = ORIGINAL[key];
  if (!src.includes(find)) throw new Error(`sabotage target not found in ${key}: ${JSON.stringify(find.slice(0, 70))}`);
  writeFileSync(F[key], src.replace(find, replace));
};

const H1 = '      <h1 className="as-wordmark select-none">{t("start.logo.alt")}</h1>';

const CASES = [
  { id: "CC1", why: "the cut helper comes back into the screen",
    apply: () => sabotage("start", H1, '      const WORDMARK_I = "I";\n' + H1) },
  { id: "CC2", why: "the split values come back",
    apply: () => sabotage("start", H1, '      const logoHead = "AUTOST";\n' + H1) },
  { id: "CC3", why: "the breakpoint hook comes back into the screen",
    apply: () => sabotage("start", H1, '      const w = useIsWide();\n' + H1) },
  { id: "CC4", why: "the column cut is rendered again",
    apply: () => sabotage("start", H1,
      '      <h1 className="as-wordmark select-none">A<BrandGrid cut="column" />B</h1>') },
  { id: "CC5", why: "the component grows its second cut back",
    apply: () => sabotage("grid", "export const cellState = (p, total) => {",
      "export const cellState = (p, total, cut) => {\n  if (cut === \"column\") return p % 3 === 0 ? \"hot\" : \"quiet\";") },
  /* THE SHAPE IT WOULD ACTUALLY RETURN IN. Not the strings the guard greps for — a working column,
     rendered from a differently named helper, with its own stylesheet rule. If the guard only knew
     the old spelling this is where it would go green. */
  { id: "CC6", why: "the cut returns under different names, as working code",
    apply: () => {
      sabotage("start", H1,
        '      <h1 className="as-wordmark select-none">\n'
        + '        {t("start.logo.alt").slice(0, 6)}<BrandGrid cut="column" className="as-brandgrid-column" />\n'
        + '        {t("start.logo.alt").slice(7)}\n'
        + '      </h1>');
    } },
  { id: "CC7", why: "the stylesheet grows a rule for a column that is not rendered",
    apply: () => sabotage("css", "  .hub-play .as-brandgrid { display: inline-block; }",
      "  .hub-play .as-brandgrid { display: inline-block; }\n"
      + "  .hub-play .as-brandgrid-column { height: .71875em; }") },
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
