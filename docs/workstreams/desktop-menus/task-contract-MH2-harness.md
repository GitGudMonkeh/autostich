# Task contract — MH2 · Harness · `#menu-rework`

**Three fixes to the measuring instrument. You touch no screen.**

One of them stops the harness writing to a live table. That one is why this task exists now rather
than at the end of the round.

---

## Identity

| | |
| --- | --- |
| **Task** | `MH2` — harness, second pass |
| **Branch** | `task/menu-mh2-harness` — create it yourself |
| **Feature branch** | `feature/desktop-menus` |
| **Base SHA** | tip of `feature/desktop-menus` at start. Record it here |
| **Tier** | A — known file surface, carries out decisions already taken |
| **Owner stops** | One, before integration |
| **Worktree** | `C:/Code/Autostich-worktrees/menu-rework` — shared, **leave it in place** |
| **Ports** | preview **5189** · survey **5181** |

**Green at handover:** 143 files / 2264 tests · lint · build · gen:db, all exit 0.

---

## 1. The survey posts real rows to the live leaderboard — stop it

*M8's finding, and it is the reason this task is not deferred.*

`publishRun` is gated by `VITE_PREVIEW` **alone** (`src/game/leaderboard.js:107`). The survey measures
the **production** build and seeds `as_username = "SURVEY"`, and its `victory` cell ends a run — so
**every full survey run posts up to ten real rows into `autostich_scores`.** They have never appeared
in a gate because a four-round run's score does not reach the top twenty.

**Three workers and the planner have run that survey.** The rows are already there.

**The remedy M8 identified:** seed an **empty** username. `App.jsx:753` requires a non-empty, allowed
name before publishing, so an empty seed skips publication entirely.

**It is one line and it is not free.** `as_username` may render — the hub, the leaderboard and the
end screen all know the player's name. Changing it changes what those surfaces draw, which moves the
baseline for every remaining task.

**So measure before and after:**

- If the empty seed changes no captured surface, take it and say so.
- If it does, find the variant that does not — a seeded name that is allowed but never published, or
  a publication gate the survey can set. **Do not trade a moved baseline for a clean table without
  saying which you chose and why.**

**Also report, do not fix:** how many `SURVEY` rows are in the table. That is the owner's data and the
owner's decision what happens to them. **Delete nothing.**

## 2. The survey must prove it measured the bundle it built

*M3-F09, outstanding since the first harness task.*

`viewport-survey.mjs` asks whether *something* answers on 5181 and reuses it. A stale server serves an
abandoned bundle and the survey measures it silently. M3 lost its gate to this; the planner cleared
the server by hand afterwards.

**Compare the served asset hash against `dist/`, or start an own server and refuse an inherited one.**
Reusing a server is a convenience; reusing it unverified is a wrong answer delivered quietly.

## 3. Record the accumulated run count per cell

*§8.12. The survey's cells are not independent — history accumulates, 0 runs in the first cell and 9
in the last, because every `victory` cell writes one and nothing clears it.*

It is deterministic, so it cancels between comparison halves — but it presents as a regression, and
four surfaces read it. **Write the count into `matrix.json` per cell** so a comparison can subtract a
known state difference instead of guessing at one. The number is already in the profile the survey
seeds.

---

## The shape all three share

| Where | The check asked | It should have asked |
| --- | --- | --- |
| `typo-tokens` | is there a `text-[Npx]`? | any size other than a role? |
| `--el-glow` | is a `var()` present? | is it resolvable *here*? |
| `viewport-survey` | does something answer on 5181? | does it serve my bundle? |
| handover images | is there a `.png`? | is it a PNG? |
| **`publishRun`** | **is this a preview build?** | **is this a real player?** |

> **A check that asks whether something is *present* will eventually pass on the wrong thing. Ask
> whether it is the *right* thing.**

Fifth instance. Item 1 above is that sentence applied to a live database.

---

## Tripwire

> **If this diff touches a screen's markup or its `.xx-*` rules — stop.** The instrument and the
> subject do not move in the same commit.

Out: the vocabulary and `@theme` · anything below 1280 px · a new dependency (`cdp.mjs` is
dependency-free on purpose) · **deleting anything from `autostich_scores`**.

`src/game/leaderboard.js` and `src/App.jsx` may be **read**. Change them only if the survey-side fix
proves impossible, and say why in the record before you do.

---

## Acceptance gate

> **The noise floor is still zero** — same tree captured twice, 0 deltas — **and a survey run posts
> nothing.**

Both halves are required. A clean table bought with a moved baseline is not a pass; nor is an intact
baseline that keeps writing rows.

---

## Expected file surface

`scripts/viewport-survey.mjs` · `test/harness-honesty.test.js` (extend) · a guard per item ·
`docs/workstreams/desktop-menus/measurements/MH2.md`

**Must not change:** any `src/ui/**`, the `@theme` block, `test/typo-tokens.test.js`, anything inside
`@media (max-width: …)`.

---

## Definition of done

- [ ] Branch confirmed, `git status --short` empty, before the first edit
- [ ] **A full survey run posts zero rows** — demonstrated, not asserted
- [ ] The captured surfaces before and after the seed change compared; **if anything moved, the
      variant chosen is named with its reason**
- [ ] The count of existing `SURVEY` rows **reported to the owner. Nothing deleted**
- [ ] The survey proves it is serving the bundle it built; a stale server is refused, not reused
- [ ] Accumulated run count written per cell into `matrix.json`
- [ ] Three guards, each counter-checked by deliberately breaking the seam
- [ ] **Noise floor re-measured: same tree twice, 0 deltas**
- [ ] Four gates green; `typo-tokens.test.js` unmodified
- [ ] Short measurement record — this task moves no pixels unless item 1 forces it; if it does, that
      is a comparison set and a finding
- [ ] Handoff, fifteen lines or fewer. Tree clean; worktree left for M9
- [ ] **Not done here:** no merge, no push of a permanent branch, no PR
