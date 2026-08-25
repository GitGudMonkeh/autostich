#!/usr/bin/env node
/* #menu-rework M6 — the counter-checks, run rather than asserted.
   ============================================================================

     node docs/workstreams/desktop-menus/evidence/M6/counter-checks.mjs

   A GUARD THAT IS MERELY GREEN IS NOT EVIDENCE (conventions.md §1.11). Each case below reintroduces
   ONE defect into the working tree, runs the guard that is supposed to catch it, records red or
   green, and restores the file — in a `finally`, so a crash cannot leave a sabotaged tree behind.

   THE CASES COME IN BOTH DIRECTIONS, and that is H-e and H-f in this task's own tools. A guard that
   only proves "the defect goes red" cannot tell a too-wide expression from a right one: a check that
   asks whether something is PRESENT eventually passes on the wrong thing, and a threshold on a number
   that falls with every correct migration goes red BECAUSE the work succeeded. So the list carries
   three shapes:

     RED-ON-DEFECT   the seam is broken and the guard must fall;
     GREEN-ON-WORK   a further correct migration, which must NOT fall;
     LIVENESS        the anchor the check depends on is removed, and the check must say so rather
                     than quietly measuring nothing.

   The output is the table in measurements/M6.md §4. */

import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, resolve, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "../../../../..");
const P = (p) => join(ROOT, p);

const CSS = "src/index.css";
const JSX = "src/ui/Glossary.jsx";
const MODAL = "src/ui/modalStyle.jsx";
const PANEL = "test/panel-tokens.test.js";

/* One edit, as an exact replacement. Anything that does not match exactly once is a broken case
   rather than a passing one — a sabotage that did not apply would report the clean tree as green
   and read like proof. */
const sub = (file, from, to) => ({ file, from, to });

const CASES = [
  /* ---- the fifth seam: the head reads the step through the variable ------- */
  { id: "STICKY_HEAD_BG goes back to a literal",
    shape: "RED-ON-DEFECT", test: "test/glossary-desktop.test.js",
    edits: [sub(MODAL, `export const STICKY_HEAD_BG = "var(--sf-head)";`,
                      `export const STICKY_HEAD_BG = "#1b1a24";`)] },
  { id: "STICKY_HEAD_BG keeps the token but carries a value beside it",
    shape: "RED-ON-DEFECT", test: "test/glossary-desktop.test.js",
    edits: [sub(MODAL, `export const STICKY_HEAD_BG = "var(--sf-head)";`,
                      `export const STICKY_HEAD_BG = "linear-gradient(var(--sf-head), #1b1a24)";`)] },
  { id: "the re-point is deleted — the head paints --sf-head",
    shape: "RED-ON-DEFECT", test: "test/glossary-desktop.test.js",
    /* ANCHORED ON M6'S OWN COMMENT TAIL, and that is not laziness: `.gd-head` carries these three
       lines character for character, so the shorter anchor matches TWICE and the case would sabotage
       the guide instead of the glossary — or, under the exact-once rule, not apply at all. */
    edits: [sub(CSS, `to fall in this round. */
    --sf-head: var(--sf-head-fade);
    background: var(--sf-head);`,
                     `to fall in this round. */
    background: var(--sf-head);`)] },
  { id: "the !important comes back on the head's fill",
    shape: "RED-ON-DEFECT", test: "test/glossary-desktop.test.js",
    edits: [sub(CSS, `to fall in this round. */
    --sf-head: var(--sf-head-fade);
    background: var(--sf-head);`,
                     `to fall in this round. */
    --sf-head: var(--sf-head-fade);
    background: var(--sf-head) !important;`)] },
  { id: "the head's fill is removed entirely",
    shape: "RED-ON-DEFECT", test: "test/glossary-desktop.test.js",
    edits: [sub(CSS, `to fall in this round. */
    --sf-head: var(--sf-head-fade);
    background: var(--sf-head);`,
                     `to fall in this round. */
    --sf-head: var(--sf-head-fade);`)] },

  /* ---- the axis check over the glossary's own rules ----------------------- */
  { id: "a new surface literal arrives in a .gl-* rule",
    shape: "RED-ON-DEFECT", test: PANEL,
    edits: [sub(CSS, `  .gl-navhead {\n    font-size: var(--text-meta-4);`,
                     `  .gl-navhead {\n    background: #191922;\n    font-size: var(--text-meta-4);`)] },
  { id: "a step is silently swapped back for its literal (--sf-glass at .gl-page)",
    shape: "RED-ON-DEFECT", test: PANEL,
    edits: [sub(CSS, `    border-radius: var(--rd-lg); padding: 16px 20px 14px; min-height: 0;\n    background: var(--sf-glass);`,
                     `    border-radius: var(--rd-lg); padding: 16px 20px 14px; min-height: 0;\n    background: linear-gradient(180deg, rgba(27, 26, 36, .93), rgba(22, 22, 32, .95));`)] },
  { id: "a MENU-38 translucent edge returns to a .gl-* rule",
    shape: "RED-ON-DEFECT", test: PANEL,
    /* `.gl-navnote`'s own two lines: the bare `border-top` stands six times in this sheet, and an
       anchor that matches six rules sabotages whichever one comes first. */
    edits: [sub(CSS, `    margin-top: 4px; padding: 10px 3px 2px;
    border-top: 1px solid var(--ed-quiet);`,
                     `    margin-top: 4px; padding: 10px 3px 2px;
    border-top: 1px solid rgba(150, 150, 170, .14);`)] },
  { id: "a counted state literal is swapped for a fresh one in Glossary.jsx",
    shape: "RED-ON-DEFECT", test: PANEL,
    edits: [sub(JSX, `style={{ background: "#0f0f14", border: "1px solid #33333e", color: "#e8e8ea" }}`,
                     `style={{ background: "#101016", border: "1px solid #33333e", color: "#e8e8ea" }}`)] },
  { id: "an ink literal is added to Glossary.jsx",
    shape: "RED-ON-DEFECT", test: PANEL,
    edits: [sub(JSX, `<div className="gl-navnote">`, `<div className="gl-navnote" style={{ color: "#71717c" }}>`)] },
  { id: "the .gl-wrap exclusion is widened to /\\.gl-/",
    shape: "RED-ON-DEFECT", test: PANEL,
    edits: [sub(PANEL, `const M6_SELECTORS = [/\\.gl-(?!wrap)/, /\\.gloss-/];`,
                       `const M6_SELECTORS = [/\\.gl-/, /\\.gloss-/];`)] },
  { id: "an M6 exemption is left pointing at a selector that no longer exists",
    shape: "RED-ON-DEFECT", test: PANEL,
    edits: [sub(CSS, `  .gl-hair {`, `  .gl-hairline {`)] },

  /* ---- the direction that matters most ----------------------------------- */
  { id: "A FURTHER CORRECT MIGRATION — the two MENU-38 edges of .as-chip fall too",
    shape: "GREEN-ON-WORK", test: PANEL,
    edits: [sub(CSS, `.as-chip { border: 1px solid rgba(150, 150, 170, .18); border-left: 3px solid rgba(150, 150, 170, .35);`,
                     `.as-chip { border: 1px solid var(--ed-quiet); border-left: 3px solid var(--ed-quiet);`)] },

  { id: "A FUTURE TIDY-UP — the successor collects the rest of #gl-ruhe's leftovers",
    shape: "GREEN-ON-WORK", test: PANEL,
    edits: [sub(CSS, `    display: flex; align-items: center; gap: 10px; text-align: left;
    cursor: pointer;`,
                     `    display: flex; align-items: center; text-align: left;
    cursor: pointer;`),
            sub(CSS, `    border-radius: 7px; min-width: 34px; text-align: center;`,
                     `    border-radius: 7px; text-align: center;`)] },

  /* ---- liveness ----------------------------------------------------------- */
  { id: "LIVENESS — .gl-wrap is gone, so the counter-check would measure nothing",
    shape: "LIVENESS", test: PANEL,
    edits: [sub(CSS, `  .lb-pagescroll:has(.lb-cockpit) > .gl-wrap {`, `  .lb-pagescroll:has(.lb-cockpit) > .lb-wrap {`)] },
  { id: "LIVENESS — a counted state literal disappears from Glossary.jsx without the list following",
    shape: "LIVENESS", test: PANEL,
    edits: [sub(JSX, `boxShadow: "0 30px 80px -30px #000"`, `boxShadow: "var(--el-modal)"`)] },
];

function runGuard(file) {
  try {
    execFileSync("npx", ["vitest", "run", file], { cwd: ROOT, stdio: "pipe", shell: true });
    return "green";
  } catch {
    return "RED";
  }
}

const rows = [];
process.stdout.write("  clean tree first — a sabotage table means nothing beside a red baseline\n");
for (const t of [...new Set(CASES.map((c) => c.test))]) {
  const r = runGuard(t);
  process.stdout.write(`    ${t.padEnd(34)} ${r}\n`);
  rows.push({ id: `the clean tree — ${t}`, shape: "BASELINE", want: "green", got: r });
}

for (const c of CASES) {
  const saved = new Map();
  let applied = true;
  try {
    for (const e of c.edits) {
      const p = P(e.file);
      if (!saved.has(p)) saved.set(p, readFileSync(p, "utf8"));
      const src = readFileSync(p, "utf8");
      const n = src.split(e.from).length - 1;
      if (n !== 1) { applied = false; break; }
      writeFileSync(p, src.replace(e.from, e.to));
    }
    const got = applied ? runGuard(c.test) : "NOT APPLIED";
    const want = c.shape === "GREEN-ON-WORK" ? "green" : "RED";
    rows.push({ id: c.id, shape: c.shape, want, got });
    const verdict = got === want ? "ok" : "!! UNEXPECTED";
    process.stdout.write(`  ${verdict.padEnd(14)} [${c.shape}] ${c.id} -> ${got}\n`);
  } finally {
    for (const [p, src] of saved) writeFileSync(p, src);
  }
}

const bad = rows.filter((r) => r.got !== r.want);
process.stdout.write(`\n  ${rows.length} cases, ${bad.length} unexpected\n`);
writeFileSync(join(HERE, "counter-checks.txt"),
  rows.map((r) => `${(r.got === r.want ? "ok  " : "BAD ")}${r.shape.padEnd(14)} ${r.want.padEnd(6)} ${r.got.padEnd(6)} ${r.id}`).join("\n") + "\n");
if (bad.length) process.exitCode = 1;
