# Handoff — M7 · Statistics and the run window

**Done.** The approved redesign is built and both screens are on the vocabulary, in seven commits on
`task/menu-m7-statistics` (base `d4870e5f`): the contract's three — structure · vocabulary · shared
subtree — plus four defects the measurement found. Four gates green, `typo-tokens.test.js`
unmodified, `@theme` byte-identical, no shipped token's value changed. Full record and every number:
`measurements/M7.md`.

**Did the vocabulary hold?** Mostly. Value-identical for the two washes, the head fade, all radii,
`--sf-base` and `--ed-quiet`; deliberate and named for the insets and the translucent edges. **Six
gaps counted, none coined** — M7-G1 the ground of a bar (below the deepest step, and phone-visible),
G2 the white wash over glass (M3-G2's family), G3 an inline explanation's ground, G4 the building
list's state pair, G5 micro radii on 9-px swatches, G6 the hairline's 2-px rounding. **M7-F09** is
the one worth the planner's eye: `--sf-deck` tints 9/5 % where `design-sprache.md` §1 says 5/1 %, and
Options has shipped 9/5 since M1 — it predates this task.

**`run-stage` at zero deltas: YES**, printed in `evidence/M7/delta.txt`. 160 cells, 0 unreached,
24 666 matched nodes, two independent full runs in agreement. And the gate says more than the clause
asks: **`victory` is at zero too**, and it renders all three shared components including `Sparkline`
at three sites. Fifteen of sixteen surfaces did not move. The sixteenth is `stats`, by design.

**Tripwires.** Neither tripped. No panel of my own; no new value at a call site — the six that had no
step are ratcheted with counter-checks, not invented.

**Guards.** Measured which broke rather than assumed: **eleven assertions across six files**, each
rewritten to the invariant and counter-checked by putting the defect back (sixteen counter-checks,
all fell). Three in `screens-desktop`, three in `rd-ruhe` (two read radii as `[\d.]+px` and found
`null` once they were tokens — the trap `st-ruhe` documented for M3), `st-ruhe`'s count becomes
*"contains no X other than Y"*, `desktop-perf` twice (`#rd-scroll` nailed the mechanism instead of
the reachability; `#ueberzug` typed the wash's digits), and two `KEPT` entries in `viewport-1280`.

**Findings.** F01 the survey's `stats` cell holds a **different save state in every position** —
history accumulates across the matrix, 0 runs in the first cell and 9 in the last; **I wrote this
finding down wrong first** and the correction is in the record · F04 the sections were not
"background transparent", they lacked the *frame* · **F05 the Kopf-Kanon costs +60.2 px here** (M3
measured +24.2 on the tree), which is why "etwa dreizehn" run rows cannot fit · F06 a saved run
carries no `families`, so the run window can only ever show its legendary picks · **F07** the run
window's heights do not reproduce (1591.75 / 526.08 / 2743 against 949 / 717 / 1757) · **F08 the
board is 1 : 1.375 on the desktop, not 1 : 2.2** — an entire canon rule rests on that number ·
F12–F16, five defects the harnesses found that no eye would have. **Every "before" number the design
stated is confirmed, several to the decimal; its predictions are not, and nothing it recommended is
wrong in sign.**

**Owner: one stop, five questions** (three owner, two planner), all in `measurements/M7.md` §5 —
the third lane's foot (the hole grew; the victory screen already has an answer), how many runs the
list shows, the fixed 380-px row, the panel tint, and the survey's `stats` cell.

**M8 inherits** both screens fully migrated (edge ratchet 0 — achieved; ink 4/4/1/0/0/1 and 3/10),
five guards on invariants, two harnesses that outlive this task (`evidence/M7/measure.mjs` for
geometry against a named seed, `states.mjs` for the gate's printed blind spot), and a design document
whose observations are confirmed and whose arithmetic is now corrected against a real build.

**No merge, no push, no PR; worktree left in place. No visual result here is approved — the captures
in `evidence/M7/owner/` are for the owner to look at.**
