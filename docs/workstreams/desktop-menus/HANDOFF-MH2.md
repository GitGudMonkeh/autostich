# Handoff — MH2 · harness, second pass

1. **Done.** All three fixes and their guards. `task/menu-mh2-harness`, two commits on `486e60c0`:
   `d42e2447` the fixes + guards · `6e7fba45` record and evidence. Four gates green (**143 files /
   2279 tests**, 2264 + 15), `typo-tokens.test.js` unmodified, no `src/**` in the diff.
2. **A full run posts ZERO rows — demonstrated.** `autostich_scores` counted either side of two full
   runs: **260/250 before A, 260/250 after B**. Newest row in the table is still `2026-08-24T21:47Z`,
   from the last unprotected run. Each of those runs would have posted ten.
3. **NOISE FLOOR: ZERO.** A vs B, **160 cells · 25 149 matched nodes · 0 deltas · 0 unmatched**,
   exit 0; the 160 stdout lines are byte-identical too. **One surface moved against the old baseline:**
   `leaderboard`, 710 deltas + 230 unmatched, 71 per cell — the fixed board replacing the live one.
   The other fifteen are 0 and 0. **New baseline: `evidence/MH2/after-1`.**
4. **The pinned clock retires the *"both halves on the same side of a week boundary"* rule** (MENU-30,
   in every contract since M2a). **Drop it.** TYPO-08's row-count pre-registration goes with it, and
   **H-c** too: `leaderboard` and `victory` now return 0 unmatched between runs (MH2-F05).
5. **250 of the table's 260 rows are `SURVEY`** — 13/95/142 across 22.–24. Aug. Ten real player rows.
   `name=M8` is 0: M8's harness had the stub. **Nothing deleted — owner's data, owner's call.**
6. **Guards counter-checked: yes, eleven seams, one at a time, each confirmed red before restoring.**
   Findings **MH2-F01…F05**. F03 stands open: `publishRun`'s own gate is still `VITE_PREVIEW` alone —
   the barrier promoted here is the *survey's*, so any other harness on the production build writes.
7. **M9 inherits** a survey that refuses a stale server (checked before the first cell and after the
   last), pins the clock, answers `autostich_scores` locally, and writes the accumulated run count
   into every cell. Worktree left in place, tree clean. Nothing merged, no PR.

**Deviation from the expected file surface:** the bundle check is `scripts/survey-bundle.mjs`, not
inline in `viewport-survey.mjs` — that file launches a browser at module scope, so a guard cannot
import it. Reason and proof in `measurements/MH2.md` Part 8.
