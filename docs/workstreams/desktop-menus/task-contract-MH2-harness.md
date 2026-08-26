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

## 1. Promote M8's stub into the survey — it already solves three things

**Do not invent this. M8 built it, and it works.** `evidence/M8/seed.mjs` holds `fetchStubSource()`
and `freezeClockSource()`, installed as **init scripts** before the module graph runs. They are
task-local, so only M8's own harness ever used them. **Move them into `scripts/` and have
`viewport-survey.mjs` install them.**

*Verified before this contract was written:* `fetchStubSource()` intercepts **every** URL containing
`autostich_scores` and answers from a fixed table — it never reaches the network for those, **writes
included**.

**What promoting it fixes, all three at once:**

| Problem | Standing since | How the stub ends it |
| --- | --- | --- |
| **The survey posts real rows to the live board.** `publishRun` is gated by `VITE_PREVIEW` alone (`leaderboard.js:106`); the survey measures the **production** build, seeds `as_username = "SURVEY"`, and its `victory` cell ends a run — up to **ten real rows per full run**, invisible in every gate because the score never reaches the top twenty | three workers and the planner have run it | the insert is answered locally and never leaves the browser |
| **The wall clock.** The hub reads the ISO week behind every overlay; one `<span>` crossing midnight produced 72 box deltas across 37 cells and 10 surfaces | MENU-30, in **every contract since M2a** | `freezeClockSource()` pins `Date.now()` and `new Date()` — **not** `performance.now()`, which React's scheduler reads and which a frozen monotonic clock would hang |
| **The leaderboard's row count follows the network** | TYPO-08, pre-registered as not-comparable | the count is the same by construction. M8 measured 20 and 20 in all 60 cells |

**Why this beats the one-line fix I first proposed.** Seeding an empty username would also stop the
write — and `as_username` renders, so it would move the baseline for every remaining task. The stub
changes nothing the application sees: `leaderboardConfigured` stays true and every code path is the
real one.

**Prove it, do not assume it:** a full survey run posts **zero** rows, and the noise floor is still
zero on the new arrangement.

**Also report, do not fix:** how many `SURVEY` rows are in the table. That is the owner's data and the
owner's decision. **Delete nothing.**

**And say what it retires.** If the clock is pinned for every run, the *"both halves on the same side
of a week boundary"* instruction leaves the contracts. Name that in your record so the next contract
drops it rather than carrying a rule against a hazard that no longer exists.

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

`scripts/viewport-survey.mjs` · a new `scripts/survey-stub.mjs` (promoted from `evidence/M8/seed.mjs`) ·
`test/harness-honesty.test.js` (extend) · a guard per item ·
`docs/workstreams/desktop-menus/measurements/MH2.md`

**Must not change:** any `src/ui/**`, the `@theme` block, `test/typo-tokens.test.js`, anything inside
`@media (max-width: …)`.

---

## Definition of done

- [ ] Branch confirmed, `git status --short` empty, before the first edit
- [ ] M8's `fetchStubSource` and `freezeClockSource` promoted into `scripts/` and installed by the
      survey
- [ ] **A full survey run posts zero rows** — demonstrated, not asserted
- [ ] The captured surfaces compared before and after the change; **anything that moved is named**
- [ ] **What the pinned clock retires is stated**, so the next contract drops the week-boundary rule
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
