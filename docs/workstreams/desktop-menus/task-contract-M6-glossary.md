# Task contract — M6 · Glossary · `#menu-rework`

**This contract is the binding scope statement.** The vocabulary is **closed** (`conventions.md` §2c).
A gap is a finding with an ID — never a value at the call site, never a minted token.

**Migration only. There is no design commission for this screen.**

**And this task has the widest seam in the round.** `Glossary.jsx` exports two components that the
pick phase, the architect, the formation phase, the hub *and* the mainscreen all mount. Read that
section before anything else.

---

## Identity

| | |
| --- | --- |
| **Task** | `M6` — the glossary |
| **Branch** | `task/menu-m6-glossary` — create it yourself |
| **Feature branch** | `feature/desktop-menus` |
| **Base SHA** | tip of `feature/desktop-menus` at start. Record it here |
| **Tier** | C |
| **Owner stops** | Two |
| **Concurrency** | **Exclusive** |
| **Worktree** | `C:/Code/Autostich-worktrees/menu-rework` — shared, **leave it in place** |
| **Ports** | preview **5189** · survey **5181** |

**Green at handover:** 143 files / 2300 tests · lint · build · gen:db, all exit 0, **CI green**.

---

## Scope

| | |
| --- | --- |
| `src/ui/Glossary.jsx` | **315 lines · 17 colour values · 6 `rounded-*`.** `GlossaryOverlay`, `GlossaryButton`, `GlossaryPanel`, `GlossaryText`, `NavRow`, `TermRow` and its own `Chip` are defined inside it |
| `src/index.css` | the **73** `.gl-*` rules and the **19** `.gloss-*` ones |

`Chip` also exists in `CardDetail.jsx` and `StartScreen.jsx` as **separate local components with the
same name.** Yours is the one in `Glossary.jsx`; the other two are not.

---

## The seam — five surfaces out of this round, and one other workstream

*Measured. This is the task.*

`Glossary.jsx` exports **`GlossaryPanel`** and **`GlossaryText`**, and they are mounted by:

| Mounted by | Which is |
| --- | --- |
| `SkillSelect` · `PerkSelect` · `LegendarySelect` | **the pick phase** — battle session |
| `FormationPhase` · `ArchitectScreen` · `HeldSkills` | **in-run** — design belongs to the battle session |
| `StartScreen` (×2) | **the mainscreen** — its own workstream, not started |
| `CornerTools` · `App` | the hub chrome |

> **Convert value-preservingly wherever it changes what those draw. Nothing outside `glossary` may
> move.**

**The gate is therefore unusually wide, and that is the point:**

```
skill-choice · perk-choice · run-stage · architect · hub   →  0 deltas, printed
```

The `hub` clause matters as much as the battle ones: **the mainscreen is a separate workstream that
has not begun.** If M6 moves it, that workstream inherits a change nobody decided and its own
baseline is wrong before it starts.

**This seam has held three times** — M1 for `phaseCard`, M7 for `Sparkline`, M5 for `GuideOverlay`.
M5's method is the one to copy: it did not only pass the gate, it **opened the component from the
mount that has no survey cell and measured there.**

---

## Before you diff: this screen carries the largest overflow in the tree

**TYPO-05: the glossary carries 157–170 overflowing nodes, at every viewport, before any change** —
the largest figure in that finding, ahead of the end screen's 147.

**Not yours, not new.** It was recorded in the `#typo` baseline so a later worker would not spend a
round chasing a condition it did not cause. M4 checked its 147 against that number and moved on;
do the same. **If your figure differs from 157–170, that is worth a second look.**

---

## Non-goals, and the tripwires

Any other menu screen · **`SkillSelect`, `PerkSelect`, `LegendarySelect`, `FormationPhase`,
`ArchitectScreen`, `HeldSkills`, `StartScreen`, `CornerTools`, `CardDetail`** · `CardDetail`'s and
`StartScreen`'s own `Chip` · `GlossaryIcon` (it lives in `FactionIcon.jsx` — an icon, meaning not
chrome) · any composition change · anything below 1280 px · any type size, `.ty-*` role or `--text-*`
token · a new dependency, icon or glyph · translating the German comments in `index.css` · **minting
a token** · the twelve `.as-edge-*` translucent alphas · `@theme`.

**Tripwire 1** — a new `box-shadow`, `padding`, `border-radius` or `background` value at the call site
instead of one from the vocabulary: **stop.**

**Tripwire 2** — building your own panel: **stop and report.**

---

## Approved architecture — binding

1. **One mechanism.** A custom property in `index.css`, three consumers; an inline style emits
   `var(--token)`, never a literal.
2. **`!important` is not the answer to an inline style.** Ten have fallen this round; two were
   correctly kept. If you keep one, justify it at the site with a counter-check.
3. **Every length takes `var(--ui-scale, 1)`.** Colours, opacities, percentages do not.
4. **Re-pointing a step on your own root to another named token is sanctioned.**
5. **A sub-1280 conversion is granted at ≤ 2/255 per channel with no alpha change** — *by the planner,
   on request.* Three cases decided so far; the worker still asks (`conventions.md` §2c).

---

## Task-specific inputs

| | |
| --- | --- |
| **Viewports** | 1280×720 · 1400×700 · 1536×791 · 1600×900 · 1920×1080 |
| **Languages** | `de` and `en`. **Tune in German**, verify in English |
| **Baseline** | the tip's most recent full survey run. Named, not re-derived |
| **Survey markers** | `glossary` → `.gl-desk, .gl-body, .gl-page`, reached by `{ sel: ".gloss-i-btn" }` |

### The harness

- **Noise floor zero**, clock pinned, leaderboard stubbed, bundle verified.
- **The gate captures surfaces, not control states**, and prints so every run.
- **A cell reaches one *state* of a surface.** Your components mount from nine places and the survey
  reaches one of them. **Show your changed sites are in a measured cell, and measure at least one
  mount that has none** — M5 did exactly this and it is why its seam claim is worth believing.
- **Run the gates bare, without pipes.**

### Two shapes that have cost this round seven findings

**A check that asks whether something is *present* will eventually pass on the wrong thing.** Seven
instances, and the two most recent were a guard and a measurement probe written by workers who had
this sentence in their contract. **Write it as *"contains no X other than Y"*.** M5's probe targeted
*"the only visible button reading `i`"* — which is also the glossary's own button, sitting first in
the document — and it opened the glossary while reporting ok. **That was your screen.**

**A guard can go red because you succeeded.** Three have this round. **Rewrite to the invariant, not
to a lower number** — and add a negative probe: a too-wide expression calms a ratchet exactly as
reliably as a too-narrow one.

---

## Acceptance gate

> **Every surface, edge, elevation, radius and inset in `Glossary.jsx` and the `.gl-*`/`.gloss-*`
> rules comes from §2c; the allowlist covers the file; and the machine half shows
> `skill-choice`, `perk-choice`, `run-stage`, `architect` and `hub` at zero deltas.**

---

## Expected file surface

`src/ui/Glossary.jsx` · `src/index.css` (`.gl-*`, `.gloss-*` — **not `@theme`**) ·
`test/panel-tokens.test.js` · `test/glossary-desktop.test.js` and any guard your diff actually breaks ·
`measurements/M6.md` · `evidence/**`

**Must not change:** every file listed under non-goals · every screen already migrated · anything
inside `@media (max-width: …)` · `test/typo-tokens.test.js` · every `--text-*` token · the `@theme`
block · the value of any token already shipped.

---

## Known hazards

| # | Hazard | Resolution required |
| --- | --- | --- |
| **H-a** | **Nine mount points, five of them outside this round, one in another workstream** | `skill-choice`, `perk-choice`, `run-stage`, `architect`, `hub` at zero deltas, printed |
| **H-b** | **157–170 pre-existing overflowing nodes** | TYPO-05. Check against the number before filing |
| **H-c** | **Eight of nine mounts have no survey cell** | Measure at least one directly. M5's method |
| **H-d** | **Three components named `Chip`** | Yours is `Glossary.jsx`'s |
| **H-e** | **A check that asks "is it present"** | *"Contains no X other than Y."* Seven instances |
| **H-f** | **A guard going red on success** | Invariant, not a lower threshold. Add a negative probe |
| **H-g** | **Guard membership** | Measure which break; never infer from a filename |

---

## Definition of done

- [ ] Branch confirmed, `git status --short` empty, before the first edit
- [ ] Every surface, edge, elevation, radius and inset from §2c; nothing else changed
- [ ] **`skill-choice`, `perk-choice`, `run-stage`, `architect`, `hub` at zero deltas**
- [ ] At least one uncovered mount measured directly; which one, and what you found
- [ ] Overflow checked against 157–170 before filing anything
- [ ] Allowlist covers the file; ratchets do not grow
- [ ] Guards: measured which break, each rewritten to the **invariant** and counter-checked
- [ ] `measurements/M6.md` — four parts; **Part 3 re-measures every number the decision block put to
      the owner**
- [ ] Owner-facing set: **both languages, two sizes** — **one opened and confirmed to be an image**
- [ ] Four gates green, run bare without pipes; `typo-tokens.test.js` unmodified
- [ ] Handoff — fifteen lines or fewer. Tree clean; worktree left in place
- [ ] **Not done here:** no merge, no push of a permanent branch, no PR
