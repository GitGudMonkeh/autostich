# Task contract — M5 · Guide · `#menu-rework`

**This contract is the binding scope statement.** The vocabulary is **closed** (`conventions.md` §2c).
A gap is a finding with an ID — never a value at the call site, never a minted token.

**Migration only. There is no design commission for this screen.** Take the vocabulary and change
nothing else, exactly as `PrivacyModal` and the end screen were handled.

---

## Identity

| | |
| --- | --- |
| **Task** | `M5` — the guide |
| **Branch** | `task/menu-m5-guide` — create it yourself |
| **Feature branch** | `feature/desktop-menus` |
| **Base SHA** | `d5f8aece` — tip of `feature/desktop-menus` at start, tree clean before the first edit |
| **Tier** | C |
| **Owner stops** | Two |
| **Concurrency** | **Exclusive** |
| **Worktree** | `C:/Code/Autostich-worktrees/menu-rework` — shared, **leave it in place** |
| **Ports** | preview **5189** · survey **5181** |

**Green at handover:** 143 files / 2296 tests · lint · build · gen:db, all exit 0, **and CI green on
`feature/desktop-menus`**.

---

## Scope, and the correction that produced it

*Measured 2026-08-25, after the planner had described this task wrongly.*

| | |
| --- | --- |
| `src/ui/GuideOverlay.jsx` | **346 lines · 35 colour values · 12 `rounded-*`.** `GuideBody`, `GuideButton`, `LoopRing`, `SecLabel`, `Bar` and `RT` are all defined **inside it** and are yours |
| `src/index.css` | the **59** `.gd-*` rules — **29 already read a token, 7 still carry a literal** |

**The planner said M5 had shrunk to "content only, its frame came with M3". That was half right and
the wrong half was the conclusion.** The guide's *cell* is `.up-page-guide` inside the upgrade tree
and does wear that screen's chrome, which M3 migrated. But `GuideOverlay.jsx` carries 35 colour values
of its own and seven `.gd-*` literals remain. **Its frame is done; it is not.**

Sixth premise this round that a measurement corrected. The two visible literals are
`rgba(12, 12, 16, .94)` at `index.css:3891` and `#82828f` at `:3991` — **verify the full seven
yourself before trusting that count.**

---

## Two seams out of this round, and they point in opposite directions

*Both measured. This is the task's whole difficulty.*

### 1. The pick phase mounts this screen

`SkillSelect.jsx:534` renders `<GuideOverlay>`. **`SkillSelect` is the pick phase — the battle
session, out of this round entirely.** `GameOver.jsx:426` and `UpgradeScreen.jsx:919` mount it too,
and both of those are already migrated.

> Convert **value-preservingly** where it changes what the pick phase draws. **Proof: `skill-choice`
> at zero deltas** in your machine half.

Same seam M1 cut for `phaseCard` and M7 held for `Sparkline`. It has held twice; hold it a third time.

### 2. `GuideBody` reaches the phone

`DeckDetail.jsx` renders `GuideBody`, and **`DeckDetail` left this round** — M3 measured it
unreachable above 1280 px (0 entry points at 1280 and 1536, 4 at 1100). So a `GuideBody` surface that
is not inside a desktop block reaches a **phone-only** component.

> **Measure before you change `GuideBody`.** If a value you touch is read below 1280 px, that is
> owner decision 9 and it is out — name it as a finding instead.

M3's exception for a sub-1280 change was granted at **≤ 1.8/255** and explicitly created no standing
permission; M4 asked for a larger one and was refused. **Ask, do not take.**

---

## The survey sees one of three mount points

The `guide` cell is reached as `{ tile: 0 } → { .up-navrow, nth: 1 } → { .up-page-guide }` —
**through the upgrade tree only.** The mounts from `GameOver` and `SkillSelect` have no cell.

**MR1 found three of its eight sites in no cell at all**, because a cell reaches one *state* of a
surface. **Show that your changed sites are inside a measured cell**, and for the two mounts that are
not, say how you verified them. `evidence/MR1/lb-week.mjs` is the pattern.

---

## Non-goals, and the tripwires

Any other menu screen · **`DeckDetail`, `CardGrid`, `SkillSelect`, `FactionIcon`/`ArchIcon`** ·
`StatsScreen`'s own `Bar` (a different component with the same name) · any composition change · the
battle screen and pick phase · anything below 1280 px · any type size, `.ty-*` role or `--text-*`
token · a new dependency, icon or glyph · translating the German comments in `index.css` · **minting
a token** · the twelve `.as-edge-*` translucent alphas · `@theme`.

**Tripwire 1** — a new `box-shadow`, `padding`, `border-radius` or `background` value at the call site
instead of one from the vocabulary: **stop.**

**Tripwire 2** — building your own panel: **stop and report.**

---

## Approved architecture — binding

1. **One mechanism.** A custom property in `index.css`, three consumers; an inline style emits
   `var(--token)`, never a literal.
2. **`!important` is not the answer to an inline style.** Ten have fallen this round; **two were
   correctly kept**, because they re-point a narrow value above 1280 px. If you keep one, justify it
   at the site with a counter-check.
3. **Every length takes `var(--ui-scale, 1)`.** Colours, opacities, percentages do not.
4. **Re-pointing a step on your own root to another named token is sanctioned.**

---

## Task-specific inputs

| | |
| --- | --- |
| **Viewports** | 1280×720 · 1400×700 · 1536×791 · 1600×900 · 1920×1080 |
| **Languages** | `de` and `en`. **Tune in German**, verify in English |
| **Baseline** | the tip's most recent full survey run. Named, not re-derived |
| **Survey markers** | `guide` → `.gd-desk, .gd-page, .gd-cols` |
| **Inherited** | **TYPO-05: the glossary carries 157–170 overflowing nodes** and the end screen 147, at every viewport, before any change. The guide is not on that list — if overflow appears here, it is worth a second look rather than a shrug |

### What the harness gives you

- **Noise floor is zero.** Every delta is yours.
- **Clock pinned, leaderboard stubbed, bundle verified** (MH2, MH3). The week-boundary rule is gone.
- **The gate captures surfaces, not control states**, and prints so on every run.
- **Run the gates bare, without pipes.** `npm test | tail` reports the pipe's exit code, not the
  test's — that is how a red CI stayed invisible for two pushes.

---

## Acceptance gate

> **Every surface, edge, elevation, radius and inset in `GuideOverlay.jsx` and the `.gd-*` rules comes
> from §2c; the allowlist covers the file; and the machine half shows `skill-choice` at zero deltas
> alongside every surface but `guide`.**

The `skill-choice` clause is the one that decides it. It is the proof that the pick phase inherited
nothing it did not decide.

---

## Expected file surface

`src/ui/GuideOverlay.jsx` · `src/index.css` (`.gd-*` only — **not `@theme`**) ·
`test/panel-tokens.test.js` · `test/guide-desktop.test.js` and any guard your diff actually breaks ·
`measurements/M5.md` · `evidence/**`

**Must not change:** `DeckDetail.jsx`, `SkillSelect.jsx`, `GameOver.jsx`, `UpgradeScreen.jsx`,
`CardGrid.jsx`, `FactionIcon.jsx`, `StatsScreen.jsx`, every screen already migrated · anything inside
`@media (max-width: …)` · `test/typo-tokens.test.js` · every `--text-*` token · the `@theme` block ·
the value of any token already shipped.

---

## Known hazards

| # | Hazard | Resolution required |
| --- | --- | --- |
| **H-a** | **The pick phase mounts this screen** | `skill-choice` at zero deltas, printed |
| **H-b** | **`GuideBody` reaches a phone-only component** | Measure before changing it. A sub-1280 value is a finding, not an edit |
| **H-c** | **Two of three mount points have no survey cell** | Show your changed sites are in a measured cell; say how you checked the other two |
| **H-d** | **Guard membership** | Measure which guards your diff breaks; never infer from a filename. Rewrite to the **invariant**, counter-check each — a correct rewrite makes a guard *stronger* |
| **H-e** | **A check that asks whether something is *present*** | Six instances this round, one of them inside a guard in the task that named the class. Write it as *"contains no X other than Y"* |
| **H-f** | **A `:root` composite cannot read a per-element variable** | §2c — *A token only sees what is present where it is declared* |

---

## Definition of done

- [ ] Branch confirmed, `git status --short` empty, before the first edit
- [ ] The seven `.gd-*` literals re-measured; **what you found is stated**, not what this contract said
- [ ] Every surface, edge, elevation, radius and inset from §2c; nothing else changed
- [ ] **`skill-choice` at zero deltas** — the pick phase inherited nothing
- [ ] `GuideBody`'s reach below 1280 px measured; anything there named, not changed
- [ ] Changed sites shown to be inside a measured cell; the two uncovered mounts verified by hand
- [ ] Allowlist covers the file; ratchets do not grow
- [ ] Guards: measured which break, each rewritten to the invariant and counter-checked
- [ ] `measurements/M5.md` — four parts; **Part 3 re-measures every number the decision block put to
      the owner**
- [ ] Owner-facing set: the migrated screen, **both languages, two sizes** — **one opened and
      confirmed to be an image**
- [ ] Four gates green, run bare without pipes; `typo-tokens.test.js` unmodified
- [ ] Handoff — fifteen lines or fewer. Tree clean; worktree left in place
- [ ] **Not done here:** no merge, no push of a permanent branch, no PR
