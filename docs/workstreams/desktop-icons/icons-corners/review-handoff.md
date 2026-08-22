# Review handoff — icons-corners

Tier C task under `feature/desktop-icons`. Independent review is **not mandatory** for this task, so
this is written for whoever picks it up next — a reviewer, or the integrator.

**State:** implemented over three design rounds, gated, captured, guards counter-checked, and
**V3 passed by the owner on 2026-08-22** (*"passt alles. gut weiter"*). Committed and pushed to
`origin/task/icons-corners`, then **integrated into `feature/desktop-icons`** on the owner's
instruction. No PR — that needs its own instruction.

---

## Suggested reading order

1. `task-contract.md` — the binding scope, and what changed against it (below)
2. `visual-review.md` — the V4 table and what to look at for round 3
3. `evidence-package.md` — gates, the zone, where the evidence is weakest, the counter-check
4. `docs/art/corners/README.md` — the art’s own record, with the gate decisions appended
5. the diff

---

## What this task did

Five corner ornaments — four factions and the perk panel — run from the upper corners into the head
of three selection cards, mirrored on the right. The skill head and the legendary head follow their
active tab; the perk head has one identity colour and stands still.

- Measured the corner render zone live and set `strip_w=300`; `bake --lot corners` no longer refuses,
  and the last uncalibrated lot in the table is gone.
- Baked five deliveries at 600 × 400 into `src/assets/corners/` (80 kB).
- Added `src/ui/cornerArt.js`, `src/ui/CardCorners.jsx` and the `.co-corner` family in `index.css`.
- Wired all three heads.
- Added `test/corner-art.test.js`, 38 tests, all 21 seams counter-checked.
- Closed Issue #402 in `docs/art/corners/README.md`.

---

## The scope changed, and by whom

The contract named "extending the ornaments to any screen beyond skill and perk selection" as a
**non-goal**, and round 1 shipped without the legendary phase for exactly that reason
(`ICONS-CORNER-05`).

At the round-1 V3 gate the owner asked for it. Scope is the owner's, so it is in — but a reviewer
should see it as an extension rather than as something the contract already covered, and the two
weakest pieces of evidence in the package both come from it (no true V1, injected run state). Both
are stated plainly in `evidence-package.md` §4.

**It then changed shape again.** Round 2 built that screen a gold phase ornament; round 3 replaced it
with the faction ornament of its active tab, on the owner's verdict. The gold delivery and the
bake-time recolour machinery were deleted with it — a capability with no caller is a promise nobody
checks, and `git` remembers it if a later task wants it back.

---

## The four things most worth a reviewer's scepticism

### 1. The zone width is *declared*, not *resolved*

`icons-perks` had to read 265 out of the DOM because `.pk-strip` is stretched between two edges and
getting it wrong by 5 px would have shipped a wrong bloom radius. A corner ornament is anchored and
**given** a width, so 300 is a choice.

The argument, rather than the number: the envelope was measured (widest head text 244 px, centred in
an 878 px padding box, ~317 px free per side on the tightest screen), 300 fits with room, the light
fades out at ~213 px anyway, and **V2 confirms the rendered width is 300.00 px** — the divisor the
bake used. It then held on a third screen it was never measured against.

**Where it could still be wrong:** ~17 px of slack. A longer head line or a change to the 880 px cap
eats it, and both numbers need recomputing. The guard comparing them goes red first.

### 2. The opacity table is a display value, and "fixing" that would break it

The likeliest future mistake. The other Phase-2 lots bake their light alignment **into the pixels**.
This lot does not: `docs/art/corners/README.md` solved it as a per-faction Deckkraft, on the model of
`BATTLEFIELD_VEIL`. Adding a `light=` table to the `corners` lot "for consistency" would correct the
set twice — roughly a hundredfold too dark, which reads as a missing image rather than as a bug.
Guarded, and counter-checked by adding one.

### 3. Level and balance are two knobs on purpose

Round 1 shipped the measured opacities raw and the owner's verdict was that the ornaments were barely
recognisable (`ICONS-CORNER-08`). The fix was **not** to edit five numbers: `CORNER_OPACITY` stays the
measured balance, `CORNER_GAIN` is the single level, and the guard checks **ratios** so the level can
move without freezing anything.

Then the counter-check found the hole that reasoning left: setting the level back to 1 broke nothing,
because ratio guards are level-independent by design. The rejected state could have come back
silently, so the decided level is now pinned too (`ICONS-CORNER-09`). Worth noting how that was
found — by breaking seams, not by thinking about them.

### 4. Two guards were wrong, and the counter-check is what said so

Neither was found by reading the code. Both were found by breaking the seam and watching the suite
stay green.

- **The level was unguarded** (`ICONS-CORNER-09`). Every opacity assertion is ratio-based, on purpose,
  so setting the level back to 1 — the state round 1 rejected — passed. Now pinned.
- **The lot-declaration slice widened silently** (`ICONS-CORNER-13`). It ended at the first `})`,
  which was the end of the declaration only while the lot carried a dict argument. When round 3
  dropped that argument, the slice ran on and swallowed an unrelated `light=` — so the
  hundredfold-trap guard passed for the wrong reason. It now balances parentheses.

A third defect is worth the same attention even though it is not a guard: the round-3 CSS edit left a
comment unterminated, the **entire suite stayed green**, and only `npm run build` caught it
(`ICONS-CORNER-12`). Nothing in this repository checks that the stylesheet parses; the source-text
ratchets will happily read a broken one.

---

## The unification question — taken and declined, in the same task

*Approved architecture* 7 left this to this task. The answer is both, and the split is not a hedge.

**Taken, for the corners.** One component, one CSS family, one zone — now across three screens. That
is allowed because the heads **measure identically**: same 880 px card, same 878 px padding box.

**Declined, for `.pk-strip` / `.sk-strip`.** They stay two families, and `skillArt.js` and the emblem
paths are untouched. The zones are genuinely different (265 × 201 against 277-baked / 210-rendered),
the skill zone is itself suspect (`ICONS-VIS-01`), and re-baking every skill delivery is an explicit
non-goal. A shared rule would have asserted an equality that is not true.

---

## Known state you will hit

**`npm test` exits 1**, here and on the base, through the load-dependent 5 s timeout in
`test/i18n-guards.test.js` — hazard H7. `npx vitest run --testTimeout=30000` gives **2139/2139,
exit 0**. This task adds ~8 kB to the ~1.5 MB corpus that guard scans; inside the run-to-run spread,
not literally zero, and not fixed here.

---

## Open questions

| # | Question | Who decides |
| --- | --- | --- |
| Q1 | ~~One `strip_w` for both screens, or two?~~ **Closed.** One — and it held for a third screen too | Closed |
| Q2 | ~~Does the perk corner ever change, or is it static?~~ **Closed as static** | Closed |
| Q3 | ~~Under or over the emblem strips in stacking order?~~ **Closed by layout** — head and tiles do not overlap | Closed |
| Q4 | **Is the texture difference between the lots wanted?** (`ICONS-CORNER-02`) Equal total light, very different distribution | Owner / future workstream |
| Q5 | ~~Is one ornament reaching 77 px on one screen and 115 px on another acceptable?~~ **Closed at V3** | Closed |
| Q6 | ~~Is 6 px the right inset for the filigree corners?~~ **Closed at V3** | Closed |
| Q7 | ~~Should `LegendarySelect` get one?~~ **Closed — yes**, asked for at the round-1 gate | Closed |
| Q8 | **Is 600 px the right delivery size?** Derived as 300 × the DPR-2 cap, so exact rather than the 1.4× estimate the skill lots inherited. Closes `icons-perks`' Q-D for this lot only | Reviewer, if it matters |
| Q9 | ~~Should the legendary corner follow its tab?~~ **Closed 2026-08-22 — yes.** A gold phase ornament was built, shown side by side (`visual/Q9-legendaer-varianten.png`) and rejected | Closed |
| Q10 | ~~Is 3× the right level in the real screen?~~ **Closed at V3** | Closed |
| Q11 | ~~Do the skill head and the legendary head still read as different moments?~~ **Closed at V3 round 3 — yes.** The gold title and gold frame carry it | Closed |

---

## Not done, deliberately

Nothing in the contract's *Must not be touched* list was touched: `docs/art/skills/**`,
`src/assets/skills/**`, `docs/art/{perkcats,legendaries}/**`, `src/assets/{perkcats,legendaries}/**`,
`AGENTS.md`, `CLAUDE.md`, `docs/engineering/**`, `docs/decisions/**`.

Also not done: the `.pk-strip`/`.sk-strip` merge (declined, above), `ICONS-VIS-01`,
`ICONS-PERK-VIS-10`, and the i18n guard budget (H7).

Verified: re-running the full bake leaves the four shipped skill lots **byte-identical** — neither the
lot table change nor the new derived-delivery step perturbed the shared code path.

**Committed and pushed** to `origin/task/icons-corners` after the owner passed V3, then merged into
`feature/desktop-icons` (`--no-ff`, matching how `icons-skills` and `icons-perks` were integrated) on
the owner's instruction. The gates were re-run ON THE MERGE RESULT, not only on the task branch,
and the two tree hashes match — the merge introduced nothing beyond the task.

**No PR opened, and no promotion to `dev`/`test`/`main`** — each needs its own instruction
(`AGENTS.md` — *House rules*, *Branch model*).
