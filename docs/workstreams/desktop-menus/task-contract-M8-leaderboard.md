# Task contract — M8 · Leaderboard · `#menu-rework`

**This contract is the binding scope statement.** The vocabulary is **closed** (`conventions.md` §2c).
A gap is a finding with an ID — never a value at the call site, never a minted token.

---

## Identity

| | |
| --- | --- |
| **Task** | `M8` — the leaderboard, both of its screens |
| **Branch** | `task/menu-m8-leaderboard` — create it yourself |
| **Feature branch** | `feature/desktop-menus` |
| **Base SHA** | tip of `feature/desktop-menus` at start. Record it here |
| **Tier** | C — absorbs the approved redesign |
| **Owner stops** | Two |
| **Concurrency** | **Exclusive** |
| **Worktree** | `C:/Code/Autostich-worktrees/menu-rework` — shared, **leave it in place** |
| **Ports** | preview **5189** · survey **5181** |

**Green at handover:** 143 files / 2255 tests · lint · build · gen:db, all exit 0.

---

## Scope

**Binding design input:** `docs/bestenliste-redesign.md` (149 lines), *"freigegeben, Umsetzung
ausstehend"*. Its own §*Zwei Bildschirme in einem* is the shape of your task.

*Measured from the render graph, by `grep "<Component"` — not from imports:*

| File | Lines | What it holds |
| --- | --- | --- |
| `src/ui/LeaderboardScreen.jsx` | 325 | the screen; `ChampionsList`, `RegelnPanel`, `ModBox` are defined **inside it** |
| `src/ui/GlobalLeaderboard.jsx` | 213 | the ranked board; `TreePill` defined inside it |
| `src/ui/WeekMods.jsx` | 77 | exports `WeekModChips` and `WeekModPanel`, which the screen renders |
| `src/index.css` | — | the `.lb-*` rules |

### You inherit a migrated component — the first task that does

`GlobalLeaderboard` renders **`RunDetail`**, and M7 migrated it. **Do not migrate it again, and do
not restyle it.** If it needs something, that is a finding, not an edit. Its appearance was reviewed
under M7.

### What is not chrome, and stays literal

The design's own boundary, and §2c agrees with it: **the modifier colours, the rank and champion
medals are meaning, not chrome.** `WeekMods.jsx:10` exports `MOD_POS = "#5fce86"` and
`MOD_NEG = "#ef6f68"` as JS constants. They look exactly like the `modalStyle.jsx` literals M1
converted and they are **not the same thing** — those were surfaces, these encode *better* and
*worse*. Leave them. Same for `RankIcon` and `FactionIcon`.

---

## The hazard that decides this task: your surface is the one that is not deterministic

Four surfaces in this round depend on state. Three of them accumulate **deterministically** — run
history builds the same way in every run, so it cancels between the halves of a comparison (§8.12).

**`leaderboard` is the exception. It reads the network**, and TYPO-08 has it on record: the row count
varies between runs. It does not cancel, because the two halves genuinely differ.

**How that is handled — pre-registered, not discovered:**

> Nodes are matched by path. A path present in one half and absent in the other is **not a delta** —
> it is *not comparable*, and `surface-delta.mjs` counts it separately under H-c. That mechanism
> already exists and already names `leaderboard`.

**What you must add:** **state the row count in both halves** of your comparison, in the record. A
reader who sees unmatched nodes on your surface must be able to tell *nine rows became eleven* from
*something broke*. Without the number the pre-registration is a promise instead of a measurement.

**And if you can capture with the board empty or stubbed, do — and say so.** A comparison with the
network held still is worth more than one that explains itself afterwards.

---

## Re-measure the design's predictions before building against them

**Three design documents have now gone to a worker. All three failed the same way and only that way:
their observations held — several to the decimal — and their predictions did not.**

| Document | What was wrong |
| --- | --- |
| `optionen-redesign` | dead space measured in a preview build showing rows players never see |
| `upgrade-baum-redesign` | height arithmetic stale in all three terms |
| `statistik-redesign` | the board is 1 : 1.375 on the desktop, not 1 : 2.2 — the 2.2 is the phone card |

> **Take a design's observations. Re-measure its predictions, in a `main` build, before building
> against them.** A stale figure is a finding and an owner question — never a silent adjustment, and
> never a reason to doubt the design's direction. Nothing any of the three recommended was wrong in
> sign.

---

## Non-goals, and the tripwires

Any other menu screen · **`RunDetail`** (M7's, migrated) · modifier colours, rank and champion medals ·
the battle screen and pick phase · anything below 1280 px · any type size, `.ty-*` role or `--text-*`
token · a new dependency, icon or glyph · translating the German comments in `index.css` · **minting a
token** · the twelve `.as-edge-*` translucent alphas · `@theme`.

**Tripwire 1** — a new `box-shadow`, `padding`, `border-radius` or `background` value at the call site
instead of one from the vocabulary: **stop.**

**Tripwire 2** — building your own panel: **stop and report.**

---

## Approved architecture — binding

1. **One mechanism.** A custom property in `index.css`, three consumers; an inline style emits
   `var(--token)`, never a literal.
2. **`!important` is not the answer to an inline style.** Redefining the property is.
3. **Every length takes `var(--ui-scale, 1)`.** Colours, opacities, percentages do not.
4. **Re-pointing a step on your own root to another named token is sanctioned.**

---

## Task-specific inputs

| | |
| --- | --- |
| **Viewports** | 1280×720 · 1400×700 · 1536×791 · 1600×900 · 1920×1080 |
| **Languages** | `de` and `en`. **Tune in German**, verify in English |
| **Baseline** | `evidence/M7/after`. Named, not re-derived |
| **Survey markers** | `leaderboard` → `.lb-page, .lb-body` |

### The harness, and what it does not tell you

- **Noise floor is zero.** Every delta is yours — except the network, above.
- **The survey reuses a live server on 5181 without checking what it serves.** M3 lost its gate to
  this. **Check the port is free before a long run.**
- **The gate prints its blind spot every run:** *"Surfaces only. Control states are not captured and
  are verified by hand."* Verify states in a browser; record what you checked.
- **The wall clock.** The hub reads the ISO week and renders behind every overlay — one `<span>`
  crossing midnight produced 72 box deltas across 37 cells and 10 surfaces, zero code changed. **Both
  halves on the same side of a week boundary — re-take rather than explain.**

### One class of defect, four instances, and it is the cheapest hazard to carry

| Where | The check asked | It should have asked |
| --- | --- | --- |
| `typo-tokens` | is there a `text-[Npx]`? | any size other than a role? |
| `--el-glow` | is a `var()` present? | is it resolvable *here*? |
| `viewport-survey` | does something answer on 5181? | does it serve my bundle? |
| handover images | is there a `.png`? | **is it a PNG?** |

> **A check that asks whether something is *present* will eventually pass on the wrong thing. Ask
> whether it is the *right* thing.**

The fourth cost M7 twelve handover captures that were base64 text wearing `.png` names, found by a
person opening one. **Open one of yours.**

---

## Acceptance gate

> **Every surface, edge, elevation, radius and inset in the three files comes from §2c; the allowlist
> covers all three; the machine half shows every surface but `leaderboard` at zero deltas; and the
> row count is stated for both halves.**

---

## Expected file surface

The three files · `src/index.css` (`.lb-*` — **not `@theme`**) · `test/panel-tokens.test.js` · any
guard your diff actually breaks · `measurements/M8.md` · `evidence/**`

**Must not change:** `RunDetail.jsx`, `StatsScreen.jsx`, `RunStats.jsx`, `RunGraphs.jsx`,
`Sparkline.jsx`, `CardGrid.jsx`, `StatusRail.jsx`, `GameOver.jsx`, and every screen already migrated ·
anything inside `@media (max-width: …)` · `test/typo-tokens.test.js` · every `--text-*` token · the
`@theme` block · the value of any token already shipped.

---

## Known hazards

| # | Hazard | Resolution required |
| --- | --- | --- |
| **H-a** | **The network moves your surface** | Row count stated for both halves; unmatched treated as not-comparable, not as delta. Capture with the board still if you can |
| **H-b** | **You inherit `RunDetail` migrated** | Do not touch it. A need is a finding |
| **H-c** | **Guard membership** | Measure which guards your diff breaks; never infer from a filename. Rewrite to the **invariant**, counter-check each |
| **H-d** | **A check that asks "is it present"** | See the table above. Open one of your own captures |
| **H-e** | **A `:root` composite cannot read a per-element variable** | §2c — *A token only sees what is present where it is declared* |
| **H-f** | **The design's predictions** | Re-measure in a `main` build first |

---

## Definition of done

- [ ] Branch confirmed, `git status --short` empty, before the first edit
- [ ] Design's numbers re-measured in a `main` build; deviations filed as findings
- [ ] Commit 1 the redesign at today's values · commit 2 the vocabulary
- [ ] `RunDetail` untouched; modifier colours and medals left literal
- [ ] **Machine half: every surface but `leaderboard` at zero deltas**
- [ ] **Row count stated for both halves** of the leaderboard comparison
- [ ] Allowlist covers all three files; ratchets do not grow
- [ ] Guards: measured which break, each rewritten to the invariant and counter-checked
- [ ] `measurements/M8.md` — four parts; **Part 3 re-measures every number the decision block put to
      the owner**, with the delta named where it moved
- [ ] Owner-facing set: the migrated screens, **both languages, two sizes** — and **one of them
      opened and confirmed to be an image**
- [ ] Control states verified by hand and recorded
- [ ] Four gates green; `typo-tokens.test.js` unmodified
- [ ] Handoff — fifteen lines or fewer. Tree clean; worktree left for M9
- [ ] **Not done here:** no merge, no push of a permanent branch, no PR
