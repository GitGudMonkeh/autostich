# Task contract — M3 · Upgrades · `#menu-rework`

**This contract is the binding scope statement.** Where it and
`docs/workstreams/desktop-menus/planning-report.md` disagree, this contract wins.

**The vocabulary is closed** (`conventions.md` §2c). No window, no minting. A gap is a finding with an
ID, reported — never a value at the call site.

---

## Identity

| | |
| --- | --- |
| **Task** | `M3` — the upgrade screen and the deck detail |
| **Branch** | `task/menu-m3-upgrades` — create it yourself |
| **Feature branch** | `feature/desktop-menus` |
| **Base SHA** | tip of `feature/desktop-menus` at start. Record it here |
| **Tier** | C |
| **Owner stops** | Two |
| **Concurrency** | **Exclusive** |
| **Worktree** | `C:/Code/Autostich-worktrees/menu-rework` — shared, **leave it in place** |
| **Ports** | preview **5189** · survey **5181** (hardcoded, `--strictPort`) |

**Green at handover:** 143 files / 2229 tests · lint · build · gen:db, all exit 0.

Confirm your branch and an empty `git status --short` before the first edit.

---

## Scope

| File | Lines | What |
| --- | --- | --- |
| `src/ui/UpgradeScreen.jsx` | 647 | the upgrade tree |
| `src/ui/DeckDetail.jsx` | 238 | **you own it** — `GuideOverlay` (M5) renders it too and inherits your conversion |
| `src/index.css` | — | the `.up-*` and deck-detail rules |

Every surface, edge, elevation, radius and inset from §2c.

**You are a shared-component owner.** M5 and anything else that mounts `DeckDetail` consume what you
leave. Convert it as a component, not as a corner of your screen.

---

## What the instrument now does, and does not

MH1 repaired it. Read this before you diff anything.

| | |
| --- | --- |
| **Noise floor is zero** | Same tree twice: 160 cells, 25 027 nodes, **0 deltas**. Every delta you see belongs to your change, not to scatter |
| **The comparator no longer truncates** | It prints in full and names its distribution. The old cut at 200 of 410 did not blur a finding, it **manufactured** one — cells sort lang/size/surface, so a cut necessarily read as "only German, hole at 1920×1080" |
| **The gate does not capture control states** | It prints *"Surfaces only. Control states are not captured and are verified by hand."* on every run, green ones included. **Believe the label.** Any control state you touch, you verify in a browser and say so in your record |

---

## The comparison set is smaller from here

**Owner decision, 2026-08-24.** Every remaining menu gets a design pass of its own afterwards, so a
full before/after of the re-plumbing shows a state that is not the target anyway.

| Half | Scope |
| --- | --- |
| **Machine** | **Unchanged, in full.** The zero-delta claim where you make one, and the proof that **only** your screens moved. This is what catches a token leaking onto a screen nobody touched |
| **Owner-facing** | **The migrated screens, both languages, two sizes.** Not a full pair set |

The machine half is not negotiable and the owner-facing half is not padding — send what there is to
decide, not what the machine already checked.

---

## Non-goals, and the tripwires

| Non-goal | Why |
| --- | --- |
| Any other menu screen | One worker per menu |
| The **appearance** of architect, formation, build panels | Battle session |
| Battle screen and pick phase | Own session |
| Anything below 1280 px | Owner decision |
| Any type size, `.ty-*` role or `--text-*` token | `typo-tokens.test.js` passes unmodified |
| A new dependency, icon or glyph | House rule — the owner is **asked** |
| Translating the German comments in `src/index.css` | Translation-only diff in a ratchet-guarded file |
| **Minting a token** | The vocabulary is closed |
| `.as-edge-*`'s translucent alphas | Twelve of them, 64 literals, a family this round does not migrate. **Ratcheted, not yours to collapse** |

### Tripwire 1

> **If this diff introduces a new `box-shadow`, `padding`, `border-radius` or `background` value at
> the call site instead of choosing one from the vocabulary — stop.**

### Tripwire 2

> **If you build your own panel — stop and report to the planner.**

---

## Approved architecture — binding

1. **One mechanism.** A custom property in `index.css`, consumed three ways; an inline style emits
   `var(--token)`, never a literal.
2. **`!important` is not the answer to an inline style.** Redefining the property is. Four have fallen
   this way already. Find one where it does not work: stop and report.
3. **Every length takes `var(--ui-scale, 1)`.** Colours, opacities, percentages do not. `--text-*` is
   the exception. `--ui-scale` is reserved — no screen sets it.
4. **Re-pointing a step on your own root to another named token is sanctioned** and needs nobody.
5. **A gap is reported, not solved.** Third-sighting threshold: `conventions.md` §2c.

---

## Task-specific inputs

| | |
| --- | --- |
| **Viewports** | 1280×720 · 1400×700 · 1536×791 · 1600×900 · 1920×1080 |
| **Languages** | `de` and `en`. **Tune in German**, verify in English |
| **Baseline** | M2b's post-change capture set. Named, not re-derived |
| **Survey markers** | `upgrades` → `.up-root, .up-vgrid, .up-head` |
| **Inherited** | **TYPO-09**: `DeckDetail` carries **20 size utilities** on a screen the survey reaches only through the guide — the largest uncovered block in that finding. Your conversion is the first machine check it gets |

### State dependencies — read before you diff

| Surface | What moves it |
| --- | --- |
| `leaderboard` | network data |
| `victory` | run outcome |
| `stats` · `feedback` | accumulated run history |
| **every surface** | **the wall clock** |

The hub reads the ISO week and renders **behind every overlay**. One `<span>` crossing midnight
produced 72 box deltas across 37 cells and 10 surfaces, zero code changed.

> Both halves of a comparison on the same side of a week boundary. Box deltas on
> `0/0/2/0/5/0/4/0/1/0:SPAN` are the clock — **re-take rather than explain.**

Match nodes by path; an absent path is not-comparable. Anything outside this list is real.

---

## Acceptance gate

> **Every surface, edge, elevation, radius and inset in `UpgradeScreen.jsx` and `DeckDetail.jsx` comes
> from §2c, the allowlist entry covers both files, and the machine half proves that only these two
> screens moved.**

---

## Expected file surface

`src/ui/UpgradeScreen.jsx` · `src/ui/DeckDetail.jsx` · `src/index.css` (`.up-*` and deck-detail rules
only — **not `@theme`**) · `test/panel-tokens.test.js` (allowlist, ratchets) ·
`test/up-ruhe.test.js` and any guard your diff actually breaks ·
`docs/workstreams/desktop-menus/measurements/M3.md` · `docs/workstreams/desktop-menus/evidence/**`

**Must not change:** `OptionsModal.jsx`, `CustomizeScreen.jsx`, `StartScreen.jsx`, any battle or
pick-phase component, anything inside `@media (max-width: …)`, `test/typo-tokens.test.js`, every
`--text-*` token, the `@theme` block, and the value of any token M1, M2a or M2b shipped.

---

## Known hazards

| # | Hazard | Resolution required |
| --- | --- | --- |
| **H-a** | **Guard membership.** The planning report got it wrong once; three workers have measured it right since | Measure which guards your diff actually breaks. `up-ruhe` is the likely one — **read its assertions before assuming**. Rewrite to the **invariant**, never the mechanism, counter-check each. Cannot pass one: stop and report |
| **H-b** | **A guard that asks whether the sanctioned form is *present*.** Five findings have come from this — TYPO-12, MENU-15, MENU-29, MENU-52 and one before | Write it as *"contains no X other than Y"*, never *"contains Y"*. MENU-52 happened inside a guard's own reader |
| **H-c** | **A composite `:root` token cannot read a per-element variable** | `conventions.md` §2c — *A token only sees what is present where it is declared*. Read it before writing a token |
| **H-d** | **`DeckDetail` has a second mount point** | `GuideOverlay` renders it. Verify it in both contexts, or say which one you did not |
| **H-e** | **The comparison straddles a week boundary** | Re-take, do not explain |
| **H-f** | **A control state changes and the gate does not see it** | The label says so on every run. Verify in a browser, record what you checked. Do **not** let a green gate stand in for a look |

---

## Definition of done

- [ ] Branch confirmed, `git status --short` empty, before the first edit
- [ ] Both files take every surface, edge, elevation, radius and inset from §2c
- [ ] Allowlist entry covers both files; ratchets do not grow
- [ ] `DeckDetail` verified in **both** mount points, or the gap named
- [ ] Guards: measured which break, each rewritten to the invariant and counter-checked
- [ ] Measurement record `measurements/M3.md` — four parts; **Part 3 re-measures every number the
      decision block put to the owner**, with the delta named where it moved
- [ ] Machine half in full: zero-delta claim, and the proof that only these screens moved
- [ ] Owner-facing set: **the migrated screens, both languages, two sizes**
- [ ] Control states verified by hand and recorded
- [ ] Four gates green; `typo-tokens.test.js` unmodified
- [ ] Handoff — seven points, fifteen lines or fewer
- [ ] Working tree clean; worktree left in place for M4
- [ ] **Not done here:** no merge, no push of a permanent branch, no PR
