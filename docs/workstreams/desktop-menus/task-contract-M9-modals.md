# Task contract — M9 · The three small modals · `#menu-rework`

**This contract is the binding scope statement.** The vocabulary is **closed** (`conventions.md` §2c).
A gap is a finding with an ID — never a value at the call site, never a minted token.

**This is the round's simplest task, and that is deliberate.** These three are the purest consumers
of the modal shell in the tree. They were placed here to be the confirmation, not the discovery: if
the vocabulary holds anywhere, it holds here, and if it does not hold here something is wrong with
the vocabulary rather than with the screen.

---

## Identity

| | |
| --- | --- |
| **Task** | `M9` — feedback, first start, privacy |
| **Branch** | `task/menu-m9-modals` — create it yourself |
| **Feature branch** | `feature/desktop-menus` |
| **Base SHA** | tip of `feature/desktop-menus` at start. Record it here |
| **Tier** | C — two of the three absorb an approved redesign |
| **Owner stops** | Two |
| **Concurrency** | **Exclusive** |
| **Worktree** | `C:/Code/Autostich-worktrees/menu-rework` — shared, **leave it in place** |
| **Ports** | preview **5189** · survey **5181** |

**Green at handover:** 143 files / 2279 tests · lint · build · gen:db, all exit 0.

---

## Scope — three files, two designs, one migration

*Measured from the render graph:* all three are rendered **only by `App.jsx`**, and each renders only
`ActionBar`, `ActionButton` and `ModalHairline` — primitives M1 migrated. **No shared component is
yours, and nothing downstream inherits from you.**

| File | Lines | Design input |
| --- | --- | --- |
| `src/ui/FeedbackModal.jsx` | 245 | **`docs/feedback-redesign.md`** (156 lines) — names `.fb-*` and the 1080 px `.fb-card` width explicitly |
| `src/ui/UsernameModal.jsx` | 161 | **`docs/erststart-redesign.md`** (175 lines) — **first-start mode only**, see below |
| `src/ui/PrivacyModal.jsx` | 157 | **none. Migration only** |
| `src/index.css` | — | the `.fb-*`, `.un-*` and privacy rules |

### `UsernameModal` serves two purposes; the design covers one

The component carries `.un-*` and is both the **welcome screen at first start** and the later
**"change name" dialog**. `erststart-redesign.md` scopes itself to the first: *"Der schmale Dialog
darunter und der spätere ‚Name ändern'-Dialog sind nicht Gegenstand."*

**So: redesign the first-start mode, migrate both.** The change-name mode takes the vocabulary like
every other surface, and keeps its composition. If the two modes cannot be separated cleanly in the
markup, that is a finding and an owner question — not a licence to redesign the second.

### `PrivacyModal` has no design document

It is migration only: the vocabulary, and nothing else. **Do not improve it while you are in there.**
A screen with no approved design is a screen whose appearance nobody has decided; changing it would
make a decision that is not yours and would arrive without a document to review it against.

---

## What the harness no longer requires of you

Three rules left the contracts with MH2, and **this is the first contract written without them**:

| Retired | Why |
| --- | --- |
| *"Both halves on the same side of a week boundary"* | the clock is pinned in every run |
| TYPO-08's row-count pre-registration | the leaderboard answers from a fixed table |
| H-c — `leaderboard` and `victory` as not-comparable | both now return **0 unmatched nodes** between runs |

**What still holds:**

- **Noise floor is zero.** Every delta is yours.
- **The accumulated run count varies between cells** — it is now recorded per cell in `matrix.json`,
  so subtract it rather than reasoning about it.
- **The gate captures surfaces, not control states.** It prints so on every run. `feedback` has a
  form with inputs in several states; **verify them in a browser and record what you checked.**
- **The survey verifies its own bundle now.** If it refuses a server, that is the check working.

---

## Re-measure the design's predictions before building against them

**Four design documents have gone to a worker. All four failed the same way and only that way: their
observations held — several to the decimal — and their predictions did not.**

| Document | What was wrong |
| --- | --- |
| `optionen-redesign` | dead space measured in a preview build showing rows players never see |
| `upgrade-baum-redesign` | height arithmetic stale in all three terms |
| `statistik-redesign` | the board is 1 : 1.375 on the desktop, not 1 : 2.2 — the 2.2 is the phone card |
| `bestenliste-redesign` | its own open question, re-measured, moved the overlay's share by 9 points |

> **Take a design's observations. Re-measure its predictions, in a `main` build, before building
> against them.** A stale figure is a finding and an owner question — never a silent adjustment, and
> never a reason to doubt the design's direction. **Nothing any of the four recommended was wrong in
> sign.**

---

## Non-goals, and the tripwires

Any other menu screen · **the appearance of `PrivacyModal`** beyond the vocabulary · the change-name
mode's composition · the battle screen and pick phase · anything below 1280 px · any type size,
`.ty-*` role or `--text-*` token · a new dependency, icon or glyph · translating the German comments
in `index.css` · **minting a token** · the twelve `.as-edge-*` translucent alphas · `@theme`.

**Tripwire 1** — a new `box-shadow`, `padding`, `border-radius` or `background` value at the call site
instead of one from the vocabulary: **stop.**

**Tripwire 2** — building your own panel: **stop and report.**

A real gap is reported with an ID. Working around it with a call-site value is tripwire 1 in a hat.

---

## Approved architecture — binding

1. **One mechanism.** A custom property in `index.css`, three consumers; an inline style emits
   `var(--token)`, never a literal.
2. **`!important` is not the answer to an inline style.** Redefining the property is. Six have fallen
   this way across the round.
3. **Every length takes `var(--ui-scale, 1)`.** Colours, opacities, percentages do not.
4. **Re-pointing a step on your own root to another named token is sanctioned.**

---

## Task-specific inputs

| | |
| --- | --- |
| **Viewports** | 1280×720 · 1400×700 · 1536×791 · 1600×900 · 1920×1080 |
| **Languages** | `de` and `en`. **Tune in German**, verify in English |
| **Baseline** | `evidence/MH2/after` (or the tip's most recent full run). Named, not re-derived |
| **Survey markers** | `feedback` → `.fb-form` · `privacy` → `.as-panel`. **First start has no cell** — verify it by hand and say so |

**`feedback` reads accumulated run history.** Seed the profile and say what you seeded.

### One class of defect, five instances — the cheapest hazard you carry

| Where | The check asked | It should have asked |
| --- | --- | --- |
| `typo-tokens` | is there a `text-[Npx]`? | any size other than a role? |
| `--el-glow` | is a `var()` present? | is it resolvable *here*? |
| `viewport-survey` | does something answer on 5181? | does it serve my bundle? |
| handover images | is there a `.png`? | is it a PNG? |
| `publishRun` | is this a preview build? | is this a real player? |

> **A check that asks whether something is *present* will eventually pass on the wrong thing. Ask
> whether it is the *right* thing.**

The fourth cost M7 twelve handover captures that were base64 text wearing `.png` names, found by a
person opening one. **Open one of yours.**

---

## Acceptance gate

> **Every surface, edge, elevation, radius and inset in the three files comes from §2c; the allowlist
> covers all three; and the machine half shows every surface but `feedback` and `privacy` at zero
> deltas.**

---

## Expected file surface

The three files · `src/index.css` (`.fb-*`, `.un-*`, privacy rules — **not `@theme`**) ·
`test/panel-tokens.test.js` · any guard your diff actually breaks · `measurements/M9.md` ·
`evidence/**`

**Must not change:** every screen already migrated · any battle or pick-phase component · anything
inside `@media (max-width: …)` · `test/typo-tokens.test.js` · every `--text-*` token · the `@theme`
block · the value of any token already shipped.

---

## Known hazards

| # | Hazard | Resolution required |
| --- | --- | --- |
| **H-a** | **The two modes of `UsernameModal`** | Redesign the first, migrate both. If they cannot be separated cleanly: finding and owner question |
| **H-b** | **`PrivacyModal` invites improvement** | It has no approved design. Vocabulary only |
| **H-c** | **First start has no survey cell** | Verify by hand; say what you checked and at which sizes |
| **H-d** | **Guard membership** | Measure which guards your diff breaks; never infer from a filename. Rewrite to the **invariant**, counter-check each |
| **H-e** | **A guard that asks whether the sanctioned form is *present*** | Write it as *"contains no X other than Y"* |
| **H-f** | **A `:root` composite cannot read a per-element variable** | §2c — *A token only sees what is present where it is declared* |

---

## Definition of done

- [ ] Branch confirmed, `git status --short` empty, before the first edit
- [ ] Designs' numbers re-measured in a `main` build; deviations filed as findings
- [ ] Commit 1 the two redesigns at today's values · commit 2 the vocabulary, all three files
- [ ] `PrivacyModal` migrated and **not otherwise changed**
- [ ] First start verified by hand, at named sizes, in both languages
- [ ] **Machine half: every surface but `feedback` and `privacy` at zero deltas**
- [ ] Allowlist covers all three files; ratchets do not grow
- [ ] Guards: measured which break, each rewritten to the invariant and counter-checked
- [ ] `measurements/M9.md` — four parts; **Part 3 re-measures every number the decision block put to
      the owner**, with the delta named where it moved
- [ ] Owner-facing set: the migrated screens, **both languages, two sizes** — **one of them opened
      and confirmed to be an image**
- [ ] Four gates green; `typo-tokens.test.js` unmodified
- [ ] Handoff — fifteen lines or fewer. Tree clean; worktree left for the next task
- [ ] **Not done here:** no merge, no push of a permanent branch, no PR
