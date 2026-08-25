#!/usr/bin/env node
/* #menu-rework M11 — the counter-checks, run rather than asserted.
   ============================================================================

     node docs/workstreams/desktop-menus/evidence/M11/counter-checks.mjs

   A GUARD THAT IS MERELY GREEN IS NOT EVIDENCE (conventions.md §1.11). Each case reintroduces ONE
   defect, runs the guard meant to catch it, records red or green, and restores the file in a
   `finally` so a crash cannot leave a sabotaged tree behind.

   THREE SHAPES, and the second is the one this round keeps paying for:

     RED-ON-DEFECT   the seam is broken and the guard must fall;
     GREEN-ON-WORK   a FURTHER correct migration, which must not fall — H-f, and here it is not
                     hypothetical: two of this task's findings are conversions the planner may grant,
                     and if the guards stood in their way the grant would arrive with a red suite;
     LIVENESS        the anchor a check depends on is removed, and the check must say so rather than
                     quietly measuring nothing.

   The output is the table in measurements/M11.md §4. */

import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, resolve, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "../../../../..");
const P = (p) => join(ROOT, p);

const CSS = "src/index.css";
const RC = "src/ui/RunConfirm.jsx";
const RL = "src/ui/RunLoader.jsx";
const UB = "src/ui/UpdateBanner.jsx";
const PW = "src/ui/PwaInstall.jsx";
const PANEL = "test/panel-tokens.test.js";
const RAHMEN = "test/rahmen-huelle.test.js";
const UPRUHE = "test/up-ruhe.test.js";
const NESTING = "test/overlay-nesting.test.js";

const sub = (file, from, to) => ({ file, from, to });

const CASES = [
  /* ---- the two guards that went red on success, and their repairs ---------- */
  { id: "the dialog radius goes back to a literal 6px",
    shape: "RED-ON-DEFECT", test: RAHMEN,
    edits: [sub(CSS, "  .rc-row, .rc-btn { border-radius: var(--rd-sm); }",
                     "  .rc-row, .rc-btn { border-radius: 6px; }")] },
  { id: "the dialog radius reads the NEIGHBOURING rung (--rd-md)",
    shape: "RED-ON-DEFECT", test: RAHMEN,
    edits: [sub(CSS, "  .rc-row, .rc-btn { border-radius: var(--rd-sm); }",
                     "  .rc-row, .rc-btn { border-radius: var(--rd-md); }")] },
  { id: "the dialog loses its radius entirely",
    shape: "RED-ON-DEFECT", test: RAHMEN,
    edits: [sub(CSS, "  .rc-row, .rc-btn { border-radius: var(--rd-sm); }",
                     "  .rc-row, .rc-btn { outline-offset: 0; }")] },
  { id: "the banner radius reads the neighbouring rung",
    shape: "RED-ON-DEFECT", test: UPRUHE,
    edits: [sub(CSS, "  .up-banner { border-radius: var(--rd-sm) !important; }",
                     "  .up-banner { border-radius: var(--rd-md) !important; }")] },
  { id: "the banner's button gets its glow back (--el-rest instead of --el-flat)",
    shape: "RED-ON-DEFECT", test: UPRUHE,
    edits: [sub(CSS, "  .up-banner .as-edge-strong { border-radius: var(--rd-sm); box-shadow: var(--el-flat); }",
                     "  .up-banner .as-edge-strong { border-radius: var(--rd-sm); box-shadow: var(--el-rest); }")] },

  /* ---- the axis check over the four files and their rules ------------------ */
  { id: "a step is swapped back for its literal (--sf-scrim at the abort dialog)",
    shape: "RED-ON-DEFECT", test: PANEL,
    edits: [sub(RC, 'style={{ background: "var(--sf-scrim)", backdropFilter: "blur(3px)" }} onClick={onKeepPlaying}>\n      <div className={`w-full ${wide ? "rc-wide"',
                    'style={{ background: "#0c0c10cc", backdropFilter: "blur(3px)" }} onClick={onKeepPlaying}>\n      <div className={`w-full ${wide ? "rc-wide"')] },
  { id: "a new surface literal arrives in a .rc-* rule",
    shape: "RED-ON-DEFECT", test: PANEL,
    edits: [sub(CSS, "  .rc-wide   { max-width: 560px; }",
                     "  .rc-wide   { max-width: 560px; background: #191922; }")] },
  { id: "a counted state literal is swapped for a fresh one in RunLoader",
    shape: "RED-ON-DEFECT", test: PANEL,
    edits: [sub(RL, 'border: "1px solid #2a2836"', 'border: "1px solid #2a2837"')] },
  { id: "an ink literal is added to PwaInstall — the file with nothing to migrate",
    shape: "RED-ON-DEFECT", test: PANEL,
    edits: [sub(PW, '<div className="text-body-5 text-center">',
                    '<div className="text-body-5 text-center" style={{ color: "#f2a83a" }}>')] },

  /* ---- the seam between M3's exclusion and M11's inclusion ----------------- */
  { id: "M3's `(?!banner)` is dropped — the banner lands in two ratchets",
    shape: "RED-ON-DEFECT", test: PANEL,
    edits: [sub(PANEL, "const M3_TREE_SELECTOR = /\\.up-(?!banner)/;",
                       "const M3_TREE_SELECTOR = /\\.up-/;")] },
  { id: "M11 drops `.up-banner` — the banner lands in none",
    shape: "RED-ON-DEFECT", test: PANEL,
    edits: [sub(PANEL, "const M11_SELECTORS = [/\\.rc-/, /\\.up-banner/];",
                       "const M11_SELECTORS = [/\\.rc-/];")] },

  /* ---- M11-F06, the shape that cost this task a red guard ------------------ */
  { id: "a comment is placed between overlayPortal( and the element",
    shape: "RED-ON-DEFECT", test: NESTING,
    edits: [sub(RC, "  return overlayPortal(\n    <div className=\"fixed inset-0 z-40 flex items-center justify-center p-4\"\n      style={{ background: \"var(--sf-scrim)\", backdropFilter: \"blur(3px)\" }} onClick={onKeepPlaying}>\n      <div className={`w-full ${wide ? \"rc-wide\"",
                    "  return overlayPortal(\n    /* A COMMENT OF THE LENGTH THIS TASK FIRST WROTE, put back where it first stood. The guard\n       reads the 260 characters BEFORE the class literal; three lines of comment plus the tag's\n       own prefix put `overlayPortal(` about 330 characters away, so the call falls out of the\n       window and a portalled overlay is reported as un-portalled. Measured: a SHORTER comment\n       does not trip it, which is why this case carries a comment of the original length rather\n       than a two-word stand-in. */\n    <div className=\"fixed inset-0 z-40 flex items-center justify-center p-4\"\n      style={{ background: \"var(--sf-scrim)\", backdropFilter: \"blur(3px)\" }} onClick={onKeepPlaying}>\n      <div className={`w-full ${wide ? \"rc-wide\"")] },

  /* ---- the direction that matters: the two grants must not be blocked ------ */
  { id: "GRANT M11-F04 — the loader's edge is pulled onto --ed-quiet",
    shape: "GREEN-ON-WORK", test: PANEL,
    edits: [sub(RL, 'border: "1px solid #2a2836"', 'border: "1px solid var(--ed-quiet)"'),
            sub(PANEL, 'const RL_STATE_LITERALS = ["#0c0c10f2", "#2a2836", "rgba(155,130,240,0.4)"];',
                       'const RL_STATE_LITERALS = ["#0c0c10f2", "rgba(155,130,240,0.4)"];')] },
  { id: "GRANT M11-F02 — the banner's fill is pulled onto --sf-head",
    shape: "GREEN-ON-WORK", test: PANEL,
    edits: [sub(UB, 'background: "#1b1b24"', 'background: "var(--sf-head)"'),
            sub(PANEL, 'const UB_STATE_LITERALS = ["#1b1b24", "#3a3a48", "#000"];',
                       'const UB_STATE_LITERALS = ["#3a3a48", "#000"];')] },

  /* ---- liveness ----------------------------------------------------------- */
  { id: "LIVENESS — a counted state literal disappears without the list following",
    shape: "LIVENESS", test: PANEL,
    edits: [sub(UB, 'boxShadow: "0 6px 24px -8px #000"', 'boxShadow: "var(--el-float)"')] },
  { id: "LIVENESS — every `.up-` rule is gone, so the seam check would measure nothing",
    shape: "LIVENESS", test: PANEL,
    edits: [sub(PANEL, "    const upRules = all.filter(([sel]) => /\\.up-/.test(sel));",
                       "    const upRules = all.filter(([sel]) => /\\.no-such-prefix-/.test(sel));")] },
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
