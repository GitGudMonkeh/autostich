#!/usr/bin/env node
/* #mainscreen-branding C3 — the counter-checks.
   ============================================================================

     node docs/workstreams/mainscreen-branding/evidence/C3/counter-checks.mjs

   Twelve sabotages against two guards, each breaking exactly one thing a guard claims to hold, each
   expecting red, each restored afterwards. Ten belong to `deck-tafel.test.js`, which is new here.

   THE LAST TWO BELONG TO `desktop-perf.test.js`, AND THEY ARE THE POINT OF THIS FILE.

   That guard went red in C3 **because a comment was written.** It counts how often `as-ring` and
   `as-ring-run` appear in a file's raw source, as a stand-in for its real claim — *every element with
   `as-ring` has exactly one `as-ring-run` child* — and a comment naming one of the classes breaks the
   stand-in without anything being wrong. Second case of that shape this round; M11-F06 was the first,
   on a different guard.

   Comments are now stripped before counting, and **that has to be shown to be a strengthening rather
   than a loosening**, or it is exactly the move the round forbids: rewriting the threshold instead of
   the invariant. So there are two cases and not one:

     CC11  a real defect — a panel with `as-ring` and no `as-ring-run`  ->  still red
     CC12  the SAME defect, with a comment that names `as-ring-run`     ->  red NOW, and it was
           GREEN before the rewrite, because the comment made the counts balance again

   CC12 is run against both versions of the guard: the current one and a copy with the strip removed.
   A rewrite that only claims to be stronger is an assurance; this one is measured.

   RESTORATION IS IN A `finally`, and every file's text is held in memory before the first edit. */

import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "../../../../..");
const F = {
  css: join(ROOT, "src/index.css"),
  start: join(ROOT, "src/ui/StartScreen.jsx"),
  perf: join(ROOT, "test/desktop-perf.test.js"),
};
const ORIGINAL = Object.fromEntries(Object.entries(F).map(([k, p]) => [k, readFileSync(p, "utf8")]));
const restore = () => { for (const [k, p] of Object.entries(F)) writeFileSync(p, ORIGINAL[k]); };

const runGuard = (file) => spawnSync(process.execPath,
  [join(ROOT, "node_modules", "vitest", "vitest.mjs"), "run", file],
  { cwd: ROOT, encoding: "utf8", env: { ...process.env, CI: "1" } });

const sabotage = (key, find, replace) => {
  const src = ORIGINAL[key];
  if (!src.includes(find)) throw new Error(`sabotage target not found in ${key}: ${JSON.stringify(find.slice(0, 70))}`);
  writeFileSync(F[key], src.replace(find, replace));
};

const DECK = "test/deck-tafel.test.js";
const PERF = "test/desktop-perf.test.js";

const CASES = [
  { id: "CC1", guard: DECK, why: "the deck art gets a fixed height again — the decision the owner did not take",
    apply: () => sabotage("css", "height: clamp(112px, calc((100vh - 80px) / var(--hub-zoom, 0.85) - 592px), 268px);", "height: 268px;") },
  { id: "CC2", guard: DECK, why: "the cap moves off the design's 268 px",
    apply: () => sabotage("css", "- 592px), 268px)", "- 592px), 320px)") },
  { id: "CC3", guard: DECK, why: "a width is forced on the art — the card would stretch",
    apply: () => sabotage("css", "  .as-deck-art {\n    width: auto;", "  .as-deck-art {\n    width: 196px;") },
  { id: "CC4", guard: DECK, why: "the .25 alpha goes back inline, where no rule can reach it",
    apply: () => sabotage("start", '<img src={deckBack} alt="" draggable="false" className="as-deck-art rounded-lg select-none" />',
      '<img src={deckBack} alt="" draggable="false" className="as-deck-art rounded-lg select-none" style={{ border: "1px solid rgba(150,150,170,.25)" }} />') },
  { id: "CC5", guard: DECK, why: "the .22 alpha goes back inline on the music chip",
    apply: () => sabotage("start", '<span className="as-deck-attr as-deck-attr-music min-w-0"',
      '<span className="as-deck-attr as-deck-attr-music min-w-0" style={{ border: "1px solid rgba(150,150,170,.22)" }}') },
  { id: "CC6", guard: DECK, why: "a KPI cell gets its own fill back — four surfaces inside one surface",
    apply: () => sabotage("start", '<div key={i} className="as-kpi flex flex-col gap-0.5 px-4 py-3.5">',
      '<div key={i} className="as-kpi flex flex-col gap-0.5 px-4 py-3.5" style={{ background: "rgba(22,22,32,.5)" }}>') },
  { id: "CC7", guard: DECK, why: "the one dividing line above the KPIs is removed",
    apply: () => sabotage("css", "  .as-kpis { border-top: 1px solid rgba(60, 58, 78, .5); }", "") },
  { id: "CC8", guard: DECK, why: "a second element claims the panel's own hook",
    apply: () => sabotage("start", '<div className="as-kpis grid grid-cols-4">', '<div className="as-deck as-kpis grid grid-cols-4">') },
  { id: "CC9", guard: DECK, why: "the chip row grows a catalog key of its own — scope nobody ordered",
    apply: () => sabotage("start", '<span className="truncate">{t("start.board.fx", { list: fxNames.join(" + ") })}</span>',
      '<span className="truncate">{t("start.board.attr.fx")}{t("start.board.fx", { list: fxNames.join(" + ") })}</span>') },
  /* CC10's first version put `buildDna` in a COMMENT and the guard stayed green — correctly, because
     a comment is not a Build-DNA row and the guard strips comments before it looks. The sabotage was
     wrong, not the guard, and it is worth four lines to say so: a counter-check that fails tells you
     which of the two is broken only if you go and look. */
  { id: "CC10", guard: DECK, why: "Build DNA appears in the panel as real markup — Q4, and the data does not exist",
    apply: () => sabotage("start", '<div className="as-deck-attrs flex flex-wrap items-center gap-2">',
      '<div className="as-deck-attrs flex flex-wrap items-center gap-2">\n          <span className="as-deck-attr">{buildDna}</span>') },
  { id: "CC11", guard: PERF, why: "a panel carries as-ring with no as-ring-run child — the real defect",
    apply: () => sabotage("start", '<div className="as-deck hidden dt:flex as-glass as-ring flex-col gap-[18px] rounded-2xl px-6 py-[22px]">\n        <i className="as-ring-run" aria-hidden="true" />',
      '<div className="as-deck hidden dt:flex as-glass as-ring flex-col gap-[18px] rounded-2xl px-6 py-[22px]">') },
];

const lines = [];
const say = (s) => { lines.push(s); process.stdout.write(`${s}\n`); };
let unexpected = 0;

try {
  for (const g of [DECK, PERF]) {
    const r = runGuard(g);
    say(`  BASELINE before  ${g}  exit ${r.status}  ${r.status === 0 ? "GREEN as required" : "RED — nothing below is meaningful"}`);
    if (r.status !== 0) unexpected++;
  }

  for (const c of CASES) {
    restore();
    c.apply();
    const r = runGuard(c.guard);
    const ok = r.status !== 0;
    if (!ok) unexpected++;
    say(`  ${c.id.padEnd(5)} ${c.guard === DECK ? "deck" : "perf"}  exit ${r.status}  ${ok ? "RED as required" : "GREEN — THE GUARD DID NOT NOTICE"}  — ${c.why}`);
  }

  /* --- CC12: the rewrite, measured against the version it replaced ---------
     The same defect as CC11, plus a comment that names the missing class. Run twice: once against
     the guard as it stands, once against a copy with the comment-strip removed. The pair is the
     evidence that stripping comments STRENGTHENED the guard. */
  restore();
  /* ONE tree, TWO guards — and the first attempt did not manage that. It compared the two guards
     against DIFFERENT trees and read "red before the rewrite too, the rewrite bought nothing". That
     was an artefact: C3's own comment in `StartScreen.jsx` names `.as-ring`, so the pre-rewrite guard
     was already red on the clean file, before any sabotage landed. The comparison is worth something
     only if both halves see the same source, so the C3 comment's mention is neutralised first and the
     masked defect applied on top of that. */
  const neutral = ORIGINAL.start.replace("weil ZWEI Kinder `.as-ring` tragen", "weil ZWEI Kinder den Ring tragen");
  if (neutral === ORIGINAL.start) throw new Error("could not neutralise C3's own comment mention — it moved");
  const masked = neutral.replace('<div className="as-deck hidden dt:flex as-glass as-ring flex-col gap-[18px] rounded-2xl px-6 py-[22px]">\n        <i className="as-ring-run" aria-hidden="true" />',
    '{/* die Tafel traegt hier kein as-ring-run mehr */}\n      <div className="as-deck hidden dt:flex as-glass as-ring flex-col gap-[18px] rounded-2xl px-6 py-[22px]">');
  if (masked === neutral) throw new Error("could not apply the masked defect — the panel markup moved");
  writeFileSync(F.start, masked);
  const now = runGuard(PERF);
  const okNow = now.status !== 0;
  if (!okNow) unexpected++;
  say(`  CC12  perf  exit ${now.status}  ${okNow ? "RED as required" : "GREEN — THE REWRITE DID NOT HELP"}`
    + "  — the same defect, masked by a comment naming as-ring-run");

  /* The pre-rewrite guard, reconstructed by undoing the one line the rewrite added. */
  const OLD = ORIGINAL.perf.replace("const s = stripComments(src(f));", "const s = src(f);");
  if (OLD === ORIGINAL.perf) throw new Error("could not reconstruct the pre-rewrite guard — the strip line moved");
  writeFileSync(F.perf, OLD);
  const before = runGuard(PERF);
  const wasGreen = before.status === 0;
  if (!wasGreen) unexpected++;   /* if it was ALSO red before, the rewrite bought nothing */
  say(`  CC12' perf  exit ${before.status}  ${wasGreen ? "GREEN before the rewrite — which is what the rewrite fixed" : "RED before the rewrite too — the rewrite bought nothing"}`
    + "  — same defect, same comment, guard without the comment strip");
} finally {
  restore();
}

for (const g of [DECK, PERF]) {
  const r = runGuard(g);
  say(`  BASELINE after   ${g}  exit ${r.status}  ${r.status === 0 ? "GREEN — the tree is restored" : "RED — THE TREE IS NOT RESTORED"}`);
  if (r.status !== 0) unexpected++;
}

say(`\n  ${CASES.length + 2} sabotage runs, 4 baselines, ${unexpected} unexpected`);
writeFileSync(join(HERE, "counter-checks.txt"), `${lines.join("\n")}\n`);
process.exitCode = unexpected ? 1 : 0;
