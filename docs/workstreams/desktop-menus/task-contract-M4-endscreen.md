# Task contract — M4 · End screen · `#menu-rework`

**This contract is the binding scope statement.** The vocabulary is **closed** (`conventions.md` §2c).
A gap is a finding with an ID — never a value at the call site, never a minted token.

**Migration only. There is no design commission for this screen** — *measured: no
`endscreen-redesign.md` exists, and `design-sprache.md` names the end screen only inside an open
question.* Take the vocabulary and change nothing else. A screen whose appearance nobody has approved
is not a screen a worker redecorates.

---

## Identity

| | |
| --- | --- |
| **Task** | `M4` — the end screen |
| **Branch** | `task/menu-m4-endscreen` — create it yourself |
| **Feature branch** | `feature/desktop-menus` |
| **Base SHA** | `654e7bef` — tip of `feature/desktop-menus` at start, tree clean before the first edit |
| **Tier** | C — a menu screen with a full measurement deliverable |
| **Owner stops** | Two |
| **Concurrency** | **Exclusive** |
| **Worktree** | `C:/Code/Autostich-worktrees/menu-rework` — shared, **leave it in place** |
| **Ports** | preview **5189** · survey **5181** |

**Green at handover:** 143 files / 2292 tests · lint · build · gen:db, all exit 0, and **CI green on
`feature/desktop-menus`**.

---

## Scope — one file, and it is half what the plan promised

*Measured from the render graph:*

| | |
| --- | --- |
| `src/ui/GameOver.jsx` | **664 lines · 50 colour values · 24 `rounded-*`**. `UnlockModal` is defined inside it and is yours |
| `src/index.css` | the **70** `.go-*` rules |

§3.1 planned M4 as 1405 lines and 99 colour values — `GameOver` plus `RunDetail`, `RunStats`,
`RunGraphs`. **M7 took that subtree.** You inherit `RunGraphs` (which holds `ScoreHerkunft`),
`RunStats` (`RunBuildChips`, `RunStatCells`) and `Sparkline` **already migrated**. That is the
re-cut paying for itself: this task halved because another ran first.

### Four things this screen renders that are not yours

| Component | Whose | Why not yours |
| --- | --- | --- |
| `GuideOverlay` | **M5** | Still planned. Rendering it does not make it yours |
| `CardGrid` | the battle session | Out of this round entirely |
| `ArchToggle` (`ArchPanels.jsx`) | the battle session | Its mechanism converted in M1; its design belongs there |
| `FormIcon` | nobody | An icon component. Meaning, not chrome |

**If one of them needs something, that is a finding with an ID.** Migrating a component because you
happen to render it is how ownership stops meaning anything.

---

## The two things to know before you start

### This screen carries the largest pre-existing overflow in the tree

**TYPO-05: 147 overflowing nodes on the end screen, at *every* viewport, *before* any change** — the
second-largest figure in that finding after the glossary's 157–170.

**It is not yours to fix and it is not new.** It was recorded in the `#typo` baseline precisely so a
later worker would not spend a round chasing a condition it did not cause. If your comparison shows
overflow here, check it against that number before treating it as a finding.

### The end screen sits inside an open canon question

`design-sprache.md` §9 open point 1 — the colour of a DP price. *Measured there:* DP carries three
colours today; the hub already uses `#d6ab6b`, the end screen and the workshop use `#35c6e6`. The
canon's recommendation is gold and it names the end screen as part of the cost.

**That is a currency colour — meaning, not chrome — so it is outside your five axes and outside
§2c.** Leave it exactly as it is. **Do not "fix" it toward the canon's recommendation**: the question
is open, the owner has not answered it, and a worker resolving an open canon question inside a
migration is the same mistake as redecorating a screen without a design.

---

## Non-goals, and the tripwires

Any other menu screen · **`GuideOverlay`, `CardGrid`, `ArchPanels`, `FormIcon`** · the DP price
colour · any composition change to this screen · the battle screen and pick phase · anything below
1280 px · any type size, `.ty-*` role or `--text-*` token · a new dependency, icon or glyph ·
translating the German comments in `index.css` · **minting a token** · the twelve `.as-edge-*`
translucent alphas · `@theme`.

**Tripwire 1** — a new `box-shadow`, `padding`, `border-radius` or `background` value at the call site
instead of one from the vocabulary: **stop.**

**Tripwire 2** — building your own panel: **stop and report.**

---

## Approved architecture — binding

1. **One mechanism.** A custom property in `index.css`, three consumers; an inline style emits
   `var(--token)`, never a literal.
2. **`!important` is not the answer to an inline style.** Redefining the property is. Six have fallen
   this way; **two were correctly kept**, because they re-point a narrow value above 1280 px — the
   `--sf-scrim` / `--sf-scrim-desk` shape. If you keep one, justify it at the site with a
   counter-check, as MR1 did.
3. **Every length takes `var(--ui-scale, 1)`.** Colours, opacities, percentages do not.
4. **Re-pointing a step on your own root to another named token is sanctioned.**

---

## Task-specific inputs

| | |
| --- | --- |
| **Viewports** | 1280×720 · 1400×700 · 1536×791 · 1600×900 · 1920×1080 |
| **Languages** | `de` and `en`. **Tune in German**, verify in English |
| **Baseline** | the tip's most recent full survey run. Named, not re-derived |
| **Survey markers** | `victory` → `.go-root` |

### What the harness gives you now, and what it still does not

- **Noise floor is zero.** Every delta is yours.
- **The clock is pinned and the leaderboard is stubbed** (MH2). The week-boundary rule is gone.
- **`victory` still moves with run outcome** — TYPO-11, `"★ Neuer Rekord"` appears or does not.
  **This is your own surface.** Seed the run and say what you seeded.
- **The gate captures surfaces, not control states**, and prints so every run.
- **A cell reaches one state of a surface.** MR1 found three of its eight sites in no cell at all,
  because a tab is a state. **Show that your changed sites are inside a measured cell** — if a panel
  of this screen only appears on a particular outcome, a green run has not seen it.

---

## Acceptance gate

> **Every surface, edge, elevation, radius and inset in `GameOver.jsx` and the `.go-*` rules comes
> from §2c; the allowlist covers the file; and the machine half shows every surface but `victory` at
> zero deltas.**

---

## Expected file surface

`src/ui/GameOver.jsx` · `src/index.css` (`.go-*` only — **not `@theme`**) ·
`test/panel-tokens.test.js` · `test/go-ruhe.test.js` and any guard your diff actually breaks ·
`measurements/M4.md` · `evidence/**`

**Must not change:** `GuideOverlay.jsx`, `CardGrid.jsx`, `ArchPanels.jsx`, `FormIcon.jsx`,
`RunGraphs.jsx`, `RunStats.jsx`, `Sparkline.jsx`, every screen already migrated · anything inside
`@media (max-width: …)` · `test/typo-tokens.test.js` · every `--text-*` token · the `@theme` block ·
the value of any token already shipped.

---

## Known hazards

| # | Hazard | Resolution required |
| --- | --- | --- |
| **H-a** | **147 pre-existing overflowing nodes** at every viewport | TYPO-05. Check against that number before filing a finding |
| **H-b** | **An open canon question runs through this screen** | The DP price colour is meaning, not chrome. Leave it. Do not resolve it |
| **H-c** | **No design commission** | Vocabulary only. Do not improve what nobody approved |
| **H-d** | **You render four components that are not yours** | A need is a finding, not an edit |
| **H-e** | **Your surface moves with run outcome** | Seed it; say what you seeded |
| **H-f** | **A changed site may sit in no measured cell** | Show it is in one. MR1's probes are the pattern |
| **H-g** | **Guard membership** | Measure which guards your diff breaks; never infer from a filename. Rewrite to the **invariant**, counter-check each — a correct rewrite makes a guard *stronger* |

---

## Definition of done

- [ ] Branch confirmed, `git status --short` empty, before the first edit
- [ ] Every surface, edge, elevation, radius and inset from §2c; nothing else changed
- [ ] The DP price colour untouched; the four foreign components untouched
- [ ] **Machine half: every surface but `victory` at zero deltas**
- [ ] **Changed sites shown to be inside a measured cell**
- [ ] Allowlist covers the file; ratchets do not grow
- [ ] Guards: measured which break, each rewritten to the invariant and counter-checked
- [ ] `measurements/M4.md` — four parts; **Part 3 re-measures every number the decision block put to
      the owner**
- [ ] Owner-facing set: the migrated screen, **both languages, two sizes** — **one opened and
      confirmed to be an image**
- [ ] Four gates green, run bare without pipes; `typo-tokens.test.js` unmodified
- [ ] Handoff — fifteen lines or fewer. Tree clean; worktree left in place
- [ ] **Not done here:** no merge, no push of a permanent branch, no PR
