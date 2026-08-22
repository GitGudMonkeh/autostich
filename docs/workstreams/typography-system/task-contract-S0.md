# Task Contract — S0: survey reach and the V1 baseline (`#typo-system`)

**Status:** ready to start. **No blocking start condition** — `dev` is frozen for desktop changes
(planning report §6.5), so the tree this measures is the tree S1 will edit.
**Written:** 2026-08-23 by the planning session.
**Follows** `planning-report.md` in this directory. Where the two disagree, **this contract wins**.

**Why this task exists.** S1's whole justification for being a separate task is its acceptance
oracle: re-run the survey, expect **zero** computed-type deltas. Measured on 2026-08-23, that oracle
covers **13 screens holding roughly two thirds of the 770 size utilities**. The rest — led by
`ArchitectScreen.jsx` with **79**, the heaviest file in the tree, and `GameOver.jsx` with **38** —
sits on screens the survey has never reached. Migrating a third of the surface with no machine check,
inside a task whose defining property is "provably a no-op", would hollow out the split. So the reach
is extended **before** the baseline is taken, not after.

Two of the unreached screens — **Architekt and GameOver** — are also two of the six the `#typo` pass
never looked at (`docs/decisions/engineering-log-2026-08.md`, `#typo`: *"nicht gesehen: Architekt,
Werkstatt, Bestenliste, Statistiken, Upgrade-Baum, GameOver"*). Without this task they would get
neither a machine check nor a human one.

---

## Identity

| Field | Value |
| --- | --- |
| **Task** | `#typo-system` S0 — extend survey reach, take V1 |
| **Branch** | `task/typo-v1-survey`, off `feature/typo-system` (which is cut from `dev` — see *Branch shape*) |
| **Base** | record the `feature/typo-system` SHA here before the first commit. A SHA, not a branch name |
| **Worktree** | `C:\Code\Autostich-worktrees\typo-v1-survey` — **new**, `npm ci` before any gate is believed |
| **Owner** | Claude worker, single writer |
| **Concurrency** | One writer. Sequential sessions may continue in this worktree. Never two at once |
| **Reviewer** | None. This task changes no application code; its output is evidence, and S1's gate re-runs it |

### Branch shape

Tier C, per `task-lifecycle.md` §2: **`feature/typo-system` is the integration line**, cut from `dev`
once, and the three tasks sit below it.

```text
dev
 └── feature/typo-system            <- cut once, from the recorded dev SHA
      ├── task/typo-v1-survey       <- S0 (this contract)
      ├── task/typo-s1-tokens       <- S1
      └── task/typo-s2-scale        <- S2
```

Each task merges up into `feature/typo-system`. `feature/typo-system` reaches `dev` once, at the end,
after the V3 gate. Nothing here is pushed to `test` or `main`.

---

## Start condition

```bash
git fetch origin
git rev-parse --short origin/dev                      # record this SHA
git merge-base --is-ancestor origin/main origin/test && \
git merge-base --is-ancestor origin/test origin/dev    # ancestry intact
```

**Verified 2026-08-23:** `dev` = `2eddf9d3`, ancestry OK, no `typo-*` worktree exists.

The `icons-*` check that the earlier draft of S1 carried is **gone**, and deliberately: the owner
froze `dev` for desktop changes until this workstream finishes (planning report §8.1c Q7b). The three
`icons-*` feature branches are merged; `task/icon-position-review` stays unmerged **by decision**, so
a contract that blocks on it would block forever.

**One thing must land before the capture, and it is not this task's:** the slashed-zero one-liner
(`task-note-slashed-zero.md`). Verify it is in the base before capturing, or V1 records a state that
will not exist again.

---

## Scope

Four parts, in order.

### 1. Re-measure the inventory against the real base

Run the planning report's Appendix snippets and **record the results in the evidence package**:

- distinct rendered sizes, weights, families
- count of size utilities, and of `dt:`-prefixed ones
- the five ratchets — still five, still at those lines?
- the §3.2 role-table check: every rendered size maps to exactly one row, no row empty

Report any delta against the planning report's figures. **Do not silently adopt either number.**
The freeze makes a large delta unlikely; that is a reason to check, not a reason to skip.

### 2. Extend `SURFACES` in `scripts/viewport-survey.mjs` to reach Architekt and Victory

The two screens with 117 of the ~254 unreached utilities. `survey-findings.md` §4.1 names why they
were not reached and proposes `DevRunSetup` — **that route is rejected here**, see *Approved
architecture* A1. Use the primitives the survey already has and that already worked for the perk
choice: `{ turbo: true }`, `{ until: <selector>, maxMs }`, `{ settle }`.

**Time-box the attempt, and prove the box before spending it.** First measure **one** cell
(`--size 1280x720 --lang de`) per screen and record the wall-clock. Then:

- **≤ 4 min per cell** → extend the full matrix. Eight cells per screen (4 viewports × 2 languages);
  a two-screen extension therefore costs at most ~64 minutes per capture round, twice (V1, V2).
- **> 4 min per cell, or the marker never appears** → stop. Do not invent a second mechanism under
  time pressure. Record it as a named gap and fall back to part 4's reduced-coverage record.

**Markers, checked 2026-08-23 rather than assumed:**

- `GameOver.jsx:217` → **`.go-root`**. A real root class on the screen's outermost element. Use it.
- `ArchitectScreen.jsx` → **no root class exists.** The nearest stable hook is `.arch-toggle`
  (`ArchPanels.jsx:42`), which is a panel *inside* the architect, not its container. It is usable as
  a reachability marker but is the wrong shape for one. **Preferred fix: add a root class to the
  architect's outermost element** — but that is a `src/**` change and therefore hits the tripwire, so
  it is **not** done here. Use `.arch-toggle`, record in the evidence that the marker is an inner
  panel, and raise the missing root class as a finding for S2 (which edits that file anyway).

**This part may edit `scripts/viewport-survey.mjs` only.** No `src/**` change. That is the whole
reason S0 needs no reviewer.

### 3. Take V1

Full capture set, per `task-lifecycle.md` §8 and planning report §7.4:

- every reachable screen × **1280×720 · 1536×791 · 1600×900 · 1920×1080** × **DE and EN** × **1× and
  2× DPR**
- **plus** `1400x700`, the second short viewport — the cheapest cross-check on the height risk (R8)
- **plus** the phone baseline: `node scripts/phone-proof.mjs capture before`
- state, sizes and DPR recorded so V2 can match them **exactly**

Production build, `npm run build`. The in-app `TestViewportHarness` is not used and is not needed:
`viewport-survey.mjs` drives a real CDP viewport against the production bundle, which is the point —
what ships is what is measured.

**Which state (owner Start-stop question, settled 2026-08-23 — planning report §8.1d Q12b):**
**fresh and deterministic** — no personal save, no accumulated unlocks. Exactly the state the
existing proof scripts already enforce. Reproducibility is the property V2 depends on; a save with
arbitrary unlocks cannot be reproduced months later, and a baseline that cannot be reproduced is not
a baseline.

Determinism is inherited from the existing scripts and is not optional: reduced motion, seeded
`Math.random`, seeded username, muted, telemetry off, minimal effect tier, install prompt suppressed,
images forced eager and awaited, animations pinned to time 0. That last one was earned — an unpinned
`as-panel-sweep` once made the shop differ from itself by 0.66 % of its pixels.

**Record the state in the capture manifest**, not just in this contract: V2 is taken weeks later by a
different session, and "same seeded state" has to be reconstructable from the evidence alone.

### 4. Write the coverage record

A table in the evidence package: **every screen, reached or not, with the count of size utilities it
carries**, and a total split into *machine-checked* and *not*.

For whatever remains unreached, write the **downgrade record** `task-lifecycle.md` §11 requires: what
the reduced criterion is, why, and what compensates. The compensation is named here so it is not
invented later: **unreached screens are migrated under human review at V3 instead of the zero-delta
gate**, and they are listed by name in S1's handoff so the V3 reviewer knows where to look hardest.

---

## Non-goals

1. **No `src/**` change of any kind.** Not a token, not a class, not a "while I'm here" fix.
2. **No new dependency.** Playwright in particular is rejected on record (`scripts/viewport-proof.mjs`).
3. **No repair of what the survey finds.** S0 measures. An overflow it discovers is a finding with an
   ID, not a fix — the same rule the viewport-1280 survey ran under.
4. **No attempt to reach the remaining screens** beyond Architekt and Victory. Formation phase, run
   details and the run dialogs stay named gaps unless part 2 comes in far under its time box.

### Tripwire

If part 2 starts requiring changes to `src/**` to make a screen reachable — a test hook, a route, a
prop — **stop and report.** That is a production-surface change wearing a measurement costume, and it
is exactly what A1 rejects.

---

## Approved architecture

**A1 — the survey keeps driving the production build; `DevRunSetup` is not the route.**
`survey-findings.md` §4.1 identifies the conflict correctly — `DevRunSetup` can build a set schedule
but is `VITE_PREVIEW`-gated, while the survey measures production by design. Resolving that by
measuring the preview build instead would break the property the survey exists for: **the tree
measured must be the tree that ships.** A preview build carries surfaces production folds out
(`scripts/check-preview-exclusion.mjs` exists precisely to police that boundary), and a type baseline
taken through it would be a baseline of something nobody plays.

The route is instead the one already proven for the perk choice: **wait, with turbo.** Autostich
resolves tricks automatically, so reaching a later decision screen is a matter of time, not of
driving. §4.1's objection — *"sits further into the round schedule than a survey can wait for"* — was
a judgement about the viewport survey's own time budget, not a property of the game. A baseline taken
twice in a workstream can afford minutes that a routine survey cannot. Part 2 measures that budget
before committing to it rather than assuming either way.

**A2 — the coverage split is recorded, not smoothed over.** Whatever this task fails to reach becomes
a written reduced criterion with a compensation, per part 4. A workstream that quietly measures two
thirds and reports "zero deltas" is worse than one that measures two thirds and says so.

---

## Acceptance gate

- [ ] Inventory re-measured; deltas against the planning report reported, or "none" stated explicitly
- [ ] §3.2 role-table check run: every rendered size maps to exactly one row, no row empty, the two
      known ties (10 px, 17 px) confirmed as the only ones
- [ ] Architekt and Victory either **reached in the full matrix**, or recorded as a named gap with the
      measured wall-clock that justified stopping
- [ ] V1 capture set complete for every reachable screen at all five viewports × 2 languages × 2 DPR,
      plus the phone baseline
- [ ] Capture state, sizes and DPR documented well enough that V2 can reproduce them without guessing
- [ ] Coverage record written: per-screen table, machine-checked vs not, totals
- [ ] Downgrade record written for the unreached remainder, with its compensation named
- [ ] `git diff --stat` against the base shows **`scripts/viewport-survey.mjs` and evidence files
      only** — zero `src/**` lines
- [ ] `npm test`, `npm run lint -- --max-warnings=0`, `npm run build` green, unpiped
- [ ] Evidence committed under `docs/workstreams/typography-system/evidence/v1/`

## Definition of done

- [ ] Start condition verified, base SHA recorded in this contract
- [ ] Slashed-zero change confirmed present in the base before capturing
- [ ] `npm ci` run in the worktree
- [ ] All four scope parts complete
- [ ] Acceptance gate met, every box checked against a real result rather than an intention
- [ ] Evidence package written, including **what was not proven**
- [ ] Branch clean, committed, merged up into `feature/typo-system`
- [ ] Handoff written for S1: the coverage table, the V1 location, and the named gaps
