# Task contract — M11 · Run dialogs · `#menu-rework`

**This contract is the binding scope statement.** The vocabulary is **closed** (`conventions.md` §2c).
A gap is a finding with an ID — never a value at the call site, never a minted token.

**Migration only. No design commission exists for any of these four.**

**This is the last task of the round.** It is also the smallest — and it has the worst measurement
coverage of any task in it. **Zero of its four surfaces has a survey cell.** That is the whole
difficulty, and it is stated first because everything else here is routine.

---

## Identity

| | |
| --- | --- |
| **Task** | `M11` — the run dialogs |
| **Branch** | `task/menu-m11-dialogs` — create it yourself |
| **Feature branch** | `feature/desktop-menus` |
| **Base SHA** | tip of `feature/desktop-menus` at start. Record it here |
| **Tier** | C |
| **Owner stops** | Two |
| **Concurrency** | **Exclusive** |
| **Worktree** | `C:/Code/Autostich-worktrees/menu-rework` — shared, **leave it in place** |
| **Ports** | preview **5189** · survey **5181** |

**Green at handover:** 143 files / 2306 tests · lint · build · gen:db, all exit 0, **CI green**.

---

## Scope — four files, eleven colour values

*Measured from the render graph, matching whole element names:*

| File | Lines | Colours | Mounted by |
| --- | --- | --- | --- |
| `src/ui/RunConfirm.jsx` | 121 | 3 | `App.jsx`, as **`AbortConfirm`** and **`RestartConfirm`** — there is no `<RunConfirm>` |
| `src/ui/RunLoader.jsx` | 72 | 4 | `App.jsx` |
| `src/ui/UpdateBanner.jsx` | 70 | 3 | `App.jsx` |
| `src/ui/PwaInstall.jsx` | 67 | 1 | **`StartScreen.jsx`** — the mainscreen |
| `src/index.css` | — | | the **5** `.rc-*` rules, and whatever else these four read |

They render only `ActionBar`, `ActionButton`, `ModalHairline` and `OptionRow` — primitives M1
migrated. **Nothing downstream inherits from you.**

---

## The difficulty: the gate cannot see any of this

The survey has sixteen surfaces — `hub`, `upgrades`, `shop-packs`, `shop-fx`, `leaderboard`, `stats`,
`guide`, `glossary`, `options`, `feedback`, `privacy`, `skill-choice`, `run-stage`, `perk-choice`,
`architect`, `victory`. **None of them is one of your four.**

**One is traversed but never photographed.** `viewport-survey.mjs:218–219` clicks *"Beenden | End"* to
open the abort dialog, then clicks `.rc-row` to leave it — on the way to the `victory` cell. So
`AbortConfirm` appears on screen during every survey run and is captured **never**.

> **A green survey run says nothing about your work.** It says only that you did not break anything
> else — which still matters, and is still required.

**What you owe instead: measure each of the four directly**, the way M5 and M6 measured the mounts
that had no cell. `evidence/MR1/lb-week.mjs` is the pattern and both later tasks refined it.

MR1 found three of its eight sites in no cell at all; M6 found that the survey opens the glossary from
the **hub** button and not the mainscreen's. **Both discovered coverage they had assumed.** You start
knowing you have none.

## And one of them reaches another workstream

`PwaInstall` is mounted by **`StartScreen`** — the mainscreen, whose workstream has not begun.

> **`hub` at zero deltas, printed.** If M11 moves the mainscreen, that workstream inherits a change
> nobody decided and its baseline is wrong before its first measurement.

M6 carried the same clause and found the reason it matters more than it looks.

---

## Non-goals, and the tripwires

Any other menu screen · **`StartScreen`, `App.jsx`** · every screen already migrated · the battle
screen and pick phase · anything below 1280 px · any type size, `.ty-*` role or `--text-*` token · a
new dependency, icon or glyph · translating the German comments in `index.css` · **minting a token** ·
the twelve `.as-edge-*` translucent alphas · `@theme` · **dead declarations that are not on your five
axes** (M6 asked; the answer was no — tidying is not migration).

**Tripwire 1** — a new `box-shadow`, `padding`, `border-radius` or `background` value at the call site
instead of one from the vocabulary: **stop.**

**Tripwire 2** — building your own panel: **stop and report.**

---

## Approved architecture — binding

1. **One mechanism.** A custom property in `index.css`; an inline style emits `var(--token)`.
2. **`!important` is not the answer to an inline style.** Thirteen have fallen this round; two were
   correctly kept. If you keep one, justify it at the site with a counter-check.
3. **Every length takes `var(--ui-scale, 1)`.** Colours, opacities, percentages do not.
4. **Re-pointing a step on your own root to another named token is sanctioned.**
5. **A sub-1280 conversion is granted at ≤ 2/255 per channel with no alpha change** — by the planner,
   on request. Three cases so far. **You still ask.**

---

## Task-specific inputs

| | |
| --- | --- |
| **Viewports** | 1280×720 · 1400×700 · 1536×791 · 1600×900 · 1920×1080 |
| **Languages** | `de` and `en`. **Tune in German**, verify in English |
| **Baseline** | the tip's most recent full survey run. Named, not re-derived |
| **Survey markers** | **none exist for your four.** See above |

### Two shapes that have cost this round eight findings

**A check that asks whether something is *present* will eventually pass on the wrong thing.** Eight
instances now — a guard, a probe, a token, a harness, an artifact, a database gate. The two most
recent were written by workers holding this sentence in their contract. **Write it as *"contains no X
other than Y"*.** You will be writing probes for four uncovered surfaces; that is exactly where this
one bites.

**A guard can go red because you succeeded.** Three this round. **Rewrite to the invariant, not to a
lower number**, and add a **negative probe** — a too-wide expression calms a ratchet exactly as
reliably as a too-narrow one.

---

## Acceptance gate

> **Every surface, edge, elevation, radius and inset in the four files comes from §2c; the allowlist
> covers all four; the machine half shows every one of the sixteen surfaces at zero deltas — `hub`
> included; and each of the four dialogs is measured directly, with the method stated.**

**Every surface at zero** is the right gate here precisely because none of them is yours: your screens
are invisible to the survey, so the survey's only job is to prove you touched nothing else.

---

## Expected file surface

The four files · `src/index.css` (`.rc-*` and what these four read — **not `@theme`**) ·
`test/panel-tokens.test.js` · any guard your diff actually breaks · `measurements/M11.md` ·
`evidence/**`

**Must not change:** `StartScreen.jsx`, `App.jsx`, every screen already migrated · anything inside
`@media (max-width: …)` · `test/typo-tokens.test.js` · every `--text-*` token · the `@theme` block ·
the value of any token already shipped.

---

## Known hazards

| # | Hazard | Resolution required |
| --- | --- | --- |
| **H-a** | **No survey cell covers any of your four** | Measure each directly; state the method for each |
| **H-b** | **`AbortConfirm` is traversed but never captured** | `viewport-survey.mjs:218`. Do not mistake it being *reached* for it being *measured* |
| **H-c** | **`PwaInstall` reaches the mainscreen workstream** | `hub` at zero, printed |
| **H-d** | **`RunConfirm` has no `<RunConfirm>`** | Its exports are `AbortConfirm` and `RestartConfirm` |
| **H-e** | **A check that asks "is it present"** | *"Contains no X other than Y."* Eight instances |
| **H-f** | **A guard going red on success** | Invariant, not a lower threshold. Add a negative probe |
| **H-g** | **Guard membership** | Measure which break; never infer from a filename |

---

## Definition of done

- [ ] Branch confirmed, `git status --short` empty, before the first edit
- [ ] Every surface, edge, elevation, radius and inset from §2c; nothing else changed
- [ ] **All sixteen survey surfaces at zero deltas, `hub` included**
- [ ] **Each of the four measured directly**, with the method named for each
- [ ] Allowlist covers all four; ratchets do not grow
- [ ] Guards: measured which break, each rewritten to the **invariant** and counter-checked
- [ ] `measurements/M11.md` — four parts; **Part 3 re-measures every number the decision block put to
      the owner**
- [ ] Owner-facing set: the four dialogs, **both languages, two sizes** — **one opened and confirmed
      to be an image**
- [ ] Four gates green, run bare without pipes; `typo-tokens.test.js` unmodified
- [ ] Handoff — fifteen lines or fewer. **Say what the round's last task leaves behind**
- [ ] Tree clean; worktree left in place
- [ ] **Not done here:** no merge, no push of a permanent branch, no PR
