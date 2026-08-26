# Handoff — MH1 · harness fixes

1. **Done.** Both tool fixes and the ratchet. `task/menu-mh1-harness`, two commits on `631a0b4e`:
   `5b9feb7a` the three changes + guards · `1d571233` measurement record. Four gates green
   (**143 files / 2229 tests** — 2206 + 9 ratchet + 14 guards), `typo-tokens.test.js` unmodified, no
   `src/**` in the diff. Branch pushed; nothing merged, no PR.
2. **NOISE FLOOR: ZERO.** Same tree captured twice, **160 cells · 25 027 matched nodes · 0 computed
   deltas · 0 unmatched**, exit 0. MENU-58's property survives these changes intact.
3. **MENU-38's ratchet starts at 0 for all seven migrated units — and the family is TWELVE alphas,
   not seven or eight.** Fresh measurement over `src/`: 64 literals,
   `.07 .08 .10 .12 .13 .14 .16 .18 .22 .25 .30 .35`. Four were unrecorded by both the ruling and
   MENU-44: `.08`/`.30` (`index.css`), `.22`/`.25` (`StartScreen.jsx`, inline). The ruling's "seven"
   was scoped to `.as-edge-*`; **the family is broader than the class that carries it.** The zeros are
   an *achieved* state — M2b collapsed the workshop's member onto `--ed-quiet`.
4. **Guards counter-checked: yes, six seams, one at a time, each confirmed red before restoring.**
   CC-5 fells the ratchet **without** felling the axis check — the seam only it watches. CC-6 fells
   the liveness check alone, proving a broken detector cannot report all-zero silently.
5. **Findings.** Fixed: **MH1-01** (two caps, not one — unmatched nodes stopped at 40 as well).
   Diagnosed: **MH1-02** — the truncation bias was the *sort order*, not bad luck: cells sort
   `lang/size/surface`, so the first half is all of `de` with `1920x1080` last inside it, and a cut at
   200/410 reads as "German only, a hole at 1920×1080" by construction. Measured: **MH1-03**,
   **MH1-04**. Answered: **MH1-05** (an all-zero ratchet is green for two indistinguishable reasons).
   Planner: **MH1-06** — `phone-proof.mjs:481` still elides silently, another strand's tool, one line.
   No action: **MH1-07** (`viewport-proof.mjs` caps but states its totals; not silent).
6. **M3 inherits** a comparator that withholds nothing and states its distribution; a gate that prints
   *"Surfaces only. Control states are not captured and are verified by hand."* on **every** run,
   green included; MENU-38's ratchet to append its unit to, as with ink — **record the measured
   number, do not zero it**. Shared worktree `C:/Code/Autostich-worktrees/menu-rework` left in place,
   clean; preview **5189**, survey **5181** free.

> **One for the planner.** The MENU-38 ratchet is written in **German**, matching
> `panel-tokens.test.js`'s 619 lines and fixed template — `AGENTS.md` *Appending to an existing German
> document*. Everything else MH1 produced is English. Flagged because the order said all repository
> artefacts stay English, and this is the one place I read the repo's own rule as the narrower one.
