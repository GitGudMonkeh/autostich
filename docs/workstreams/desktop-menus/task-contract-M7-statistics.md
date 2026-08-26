# Task contract — M7 · Statistics · `#menu-rework`

**This contract is the binding scope statement.** Where it and the planning report disagree, this wins.

**The vocabulary is closed** (`conventions.md` §2c). No minting. A gap is a finding with an ID —
never a value at the call site.

---

## Identity

| | |
| --- | --- |
| **Task** | `M7` — the statistics screen and the run window |
| **Branch** | `task/menu-m7-statistics` — create it yourself |
| **Feature branch** | `feature/desktop-menus` |
| **Base SHA** | tip of `feature/desktop-menus` at start. Record it here |
| **Tier** | C — absorbs the approved redesign, so pixels move by design as well as by migration |
| **Owner stops** | Two |
| **Concurrency** | **Exclusive** |
| **Worktree** | `C:/Code/Autostich-worktrees/menu-rework` — shared, **leave it in place** |
| **Ports** | preview **5189** · survey **5181** |

**Green at handover:** 143 files / 2239 tests · lint · build · gen:db, all exit 0.

---

## Scope — and it is larger than the planning report said

**Binding design input:** `docs/statistik-redesign.md` (241 lines), *"freigegeben, Umsetzung
ausstehend"*. It states in its own §*Das Lauf-Fenster* that `RunDetail` **is part of the commission**.

*Measured, not inferred — the render graph, not the import graph:*

| File | Lines | Why it is here |
| --- | --- | --- |
| `src/ui/StatsScreen.jsx` | 324 | the screen |
| `src/ui/RunDetail.jsx` | 212 | `StatsScreen.jsx:319` renders it; the design includes it |
| `src/ui/RunStats.jsx` | 320 | `RunDetail` renders `RunStatCells`, `RunBuildChips`, `RunTreeBlock` |
| `src/ui/RunGraphs.jsx` | 209 | `RunDetail` renders it |
| `src/ui/Sparkline.jsx` | 151 | `StatsScreen` **and** `RunDetail` render it |
| `src/index.css` | — | the `.st-*` and `.rd-*` rules |

**≈ 1216 lines.** §3.1 listed M7 as "StatsScreen · Sparkline, 475 lines". That was wrong, and it was
wrong the way three earlier entries were wrong: it was read from imports. `StatsScreen` does not
render `RunStats` — the only mention of that name in the file is **a comment**.

### Three commits

1. **Structure** — the redesign at today's surface values. No tokens yet.
2. **Vocabulary** — every surface, edge, elevation, radius and inset from §2c.
3. **The shared subtree** — `RunStats`, `RunGraphs`, `Sparkline` as **components**, not as corners of
   your screen. M4 inherits all three.

---

## The hazard that decides this task: you touch the battle session

*Measured:*

| Component | Also rendered by | Which is |
| --- | --- | --- |
| **`Sparkline`** | `StatusRail.jsx:133` | **the run stage** — out of this round entirely |
| **`Sparkline`** · **`RunGraphs`** | `GameOver.jsx` (3 sites) | M4, not yet migrated |
| **`CardGrid`** | rendered *inside* `RunDetail` | **a battle component** |

**The rule, and it is the same seam M1 cut for `phaseCard`:**

> `Sparkline` and `RunGraphs` may be converted **value-preservingly** — literal to `var(--token)`,
> zero computed delta. They may **not** be restyled. Their appearance belongs to the battle session
> and to M4.
>
> **`CardGrid` is not yours at all.** `RunDetail` mounts it; you do not touch it.

**The proof this needs:** your machine half must show **`run-stage` at zero deltas**. If converting
`Sparkline` moves the run stage by one pixel, the conversion was not value-preserving and the battle
session inherits a change nobody decided.

---

## Non-goals, and the tripwires

Any other menu screen · the appearance of `Sparkline`, `RunGraphs`, `CardGrid` · the battle screen and
pick phase · anything below 1280 px · any type size, `.ty-*` role or `--text-*` token · a new
dependency, icon or glyph · translating the German comments in `index.css` · **minting a token** ·
the `.as-edge-*` translucent alphas (twelve of them, ratcheted) · `@theme`.

**Tripwire 1** — a new `box-shadow`, `padding`, `border-radius` or `background` value at the call site
instead of one from the vocabulary: **stop.**

**Tripwire 2** — building your own panel: **stop and report.**

A real gap is reported with an ID. Working around it with a call-site value is tripwire 1 in a hat,
and it looks like progress.

---

## Approved architecture — binding

1. **One mechanism.** A custom property in `index.css`, three consumers; an inline style emits
   `var(--token)`, never a literal.
2. **`!important` is not the answer to an inline style.** Redefining the property is. Six have fallen
   this way. Find one where it does not work: stop and report.
3. **Every length takes `var(--ui-scale, 1)`.** Colours, opacities, percentages do not. `--text-*` is
   the exception; `--ui-scale` is reserved.
4. **Re-pointing a step on your own root to another named token is sanctioned.**

---

## Task-specific inputs

| | |
| --- | --- |
| **Viewports** | 1280×720 · 1400×700 · 1536×791 · 1600×900 · 1920×1080 |
| **Languages** | `de` and `en`. **Tune in German**, verify in English |
| **Baseline** | `evidence/M3/after`. Named, not re-derived |
| **Survey markers** | `stats` → `.st-sec, .st-readout` |
| **Design measurement** | The document measures the run window on a **full** run — 7 skills, 20 perks, formation: 949 px, against 717 for a thin one. Reproduce that state or say which you used |

### Re-measure the design's numbers before you build against them

**Two design documents have now been handed to a worker, and both failed the same way and only that
way: their observations held — several to the decimal — and their predictions did not.** The options
document's dead space was measured in a preview build showing rows players never see. The upgrade
tree's height arithmetic was stale in all three terms.

> **Take a design's observations. Re-measure its predictions, in a `main` build, before building
> against them.** A stale figure is a finding and an owner question — never a silent adjustment, and
> never a reason to doubt the design's direction.

### State dependencies — read before you diff

| Surface | What moves it |
| --- | --- |
| `leaderboard` | network data |
| `victory` | run outcome |
| **`stats`** · `feedback` | **accumulated run history — this is your own surface** |
| **every surface** | **the wall clock** |

`stats` reads accumulated history, so **your own screen's node set moves between runs if you play**.
Seed the profile and say what you seeded.

The hub reads the ISO week and renders behind every overlay: one `<span>` crossing midnight produced
72 box deltas across 37 cells and 10 surfaces, zero code changed. **Both halves of a comparison on the
same side of a week boundary — re-take rather than explain.**

### The harness

- **Noise floor is zero** (160 cells, 25 027 nodes). Every delta is yours.
- **The survey reuses a live server on 5181 without checking what it serves.** M3 lost its gate to
  this. **Check the port is free, or that the server is yours, before a long run.**
- **The gate prints its blind spot on every run:** *"Surfaces only. Control states are not captured
  and are verified by hand."* Believe it. Verify states in a browser and record what you checked.

---

## Acceptance gate

> **Every surface, edge, elevation, radius and inset in the five files comes from §2c; the allowlist
> covers all five; and the machine half shows `run-stage` at zero deltas.**

The last clause is the one that decides it. It is the proof that the shared components were converted
and not restyled.

---

## Expected file surface

The five files above · `src/index.css` (`.st-*`, `.rd-*` — **not `@theme`**) ·
`test/panel-tokens.test.js` · `test/st-ruhe.test.js`, `test/rd-ruhe.test.js`, `test/graph-labels.test.js`
and any guard your diff actually breaks · `measurements/M7.md` · `evidence/**`

**Must not change:** `CardGrid.jsx`, `StatusRail.jsx`, `GameOver.jsx`, `OptionsModal.jsx`,
`CustomizeScreen.jsx`, `UpgradeScreen.jsx`, `StartScreen.jsx`, any other battle or pick-phase
component, anything inside `@media (max-width: …)`, `test/typo-tokens.test.js`, every `--text-*`
token, the `@theme` block, and the value of any token already shipped.

---

## Known hazards

| # | Hazard | Resolution required |
| --- | --- | --- |
| **H-a** | **A shared component is restyled instead of converted**, and the run stage moves | `run-stage` at zero deltas in the machine half. Not a claim — a printed result |
| **H-b** | **Guard membership.** Measure which guards your diff breaks; never infer from a filename. Four workers have measured it right; the planning report got it wrong twice | Rewrite to the **invariant**, counter-check each by reintroducing the defect |
| **H-c** | **A guard that asks whether the sanctioned form is *present*.** Six findings from this shape now | Write it as *"contains no X other than Y"* |
| **H-d** | **A `:root` composite cannot read a per-element variable** | §2c — *A token only sees what is present where it is declared*. Read before writing a token |
| **H-e** | **Your own surface is state-dependent** | Seed the profile; record what you seeded |
| **H-f** | **The design's predictions** | Re-measure in a `main` build first |

---

## Definition of done

- [ ] Branch confirmed, `git status --short` empty, before the first edit
- [ ] Design's numbers re-measured in a `main` build; deviations filed as findings
- [ ] Commit 1 the redesign at today's values · commit 2 the vocabulary · commit 3 the shared subtree
- [ ] `Sparkline` and `RunGraphs` converted **value-preservingly**; `CardGrid` untouched
- [ ] **Machine half shows `run-stage` at zero deltas**
- [ ] Allowlist covers all five files; ratchets do not grow
- [ ] Guards: measured which break, each rewritten to the invariant and counter-checked
- [ ] `measurements/M7.md` — four parts; **Part 3 re-measures every number the decision block put to
      the owner**, with the delta named where it moved
- [ ] Owner-facing set: the migrated screens, **both languages, two sizes**
- [ ] Control states verified by hand and recorded
- [ ] Four gates green; `typo-tokens.test.js` unmodified
- [ ] Handoff — fifteen lines or fewer. Tree clean; worktree left for M8
- [ ] **Not done here:** no merge, no push of a permanent branch, no PR
