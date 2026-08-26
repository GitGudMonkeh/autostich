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
| **Tier** | C — absorbs the approved redesign, so pixels move by design as well as by migration |
| **Owner stops** | Two |
| **Concurrency** | **Exclusive** |
| **Worktree** | `C:/Code/Autostich-worktrees/menu-rework` — shared, **leave it in place** |
| **Ports** | preview **5189** · survey **5181** (hardcoded, `--strictPort`) |

**Green at handover:** 143 files / 2229 tests · lint · build · gen:db, all exit 0.

Confirm your branch and an empty `git status --short` before the first edit.

---

## Scope — three commits, in this order, and they do not merge

**M3 absorbs the approved redesign.** Owner decision, 2026-08-24, and it is the M1 pattern: one worker
does both jobs so the screen is touched once, split into commits so the comparison stays readable.

**Binding input:** `docs/upgrade-baum-redesign.md` — *"freigegeben, Umsetzung ausstehend"*. Read it
before you start. It is design only and says so: the technical implementation is yours, not its.

### Commit 1 — structure. The redesign, at today's surface values.

Build what `upgrade-baum-redesign.md` specifies — head and legend, the general page, the colour
decision, the faction page, the legendary phase, the copy — using **the values that are in the tree
today**. No tokens yet.

Its four stated problems, and its claim that fixing them **costs no height**, are what your Part 3
re-measures. The document computes `.up-root` at 1080 px from head 172 + branch 808 + legend 42, and
notes the faction page has overflowed by 44 px once already. **Verify that arithmetic before you build
against it** — the last design document put to a worker had a premise that did not survive contact
with a `main` build.

### Commit 2 — vocabulary. The tokens.

Now take every surface, edge, elevation, radius and inset from §2c.

### Commit 3 — the deck detail.

`DeckDetail.jsx`, converted as a **component**, not as a corner of your screen. `GuideOverlay` (M5)
mounts it too and inherits what you leave.

---

## The hazard that is specific to this screen

**The tree is upstream of the vocabulary.** *Measured:* `src/index.css` says *"Werte 1:1 von
`.up-*` übernommen"* at **ten sites** — the workshop, the guide, the glossary, the statistics screen
and the options screen all copied their values from this one. The design document opens with the same
observation.

M1 derived the token values **by counting call sites**. Many of those call sites were copies of
`.up-*`. So a token's value is often this screen's value, one step removed.

**What follows, and it is the thing to get right:**

> When the redesign changes a `.up-*` value that a token descends from, you are not making a local
> edit. You are either **changing that token for everyone** — which goes through the planner — or
> **deliberately diverging this screen from the token**, which needs a reason in the record.

Neither is forbidden. Doing it without noticing which one you did is. Name it in your findings table
either way.

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
- [ ] Commit 1 — the redesign built at today's values, its height arithmetic verified first
- [ ] Commit 2 — both files take every surface, edge, elevation, radius and inset from §2c
- [ ] Every `.up-*` value the redesign changes is classified: **token change for everyone** (through
      the planner) or **deliberate divergence** (with a reason). Neither silently
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
