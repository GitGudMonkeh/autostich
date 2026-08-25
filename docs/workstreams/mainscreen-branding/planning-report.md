# Mainscreen Branding — Planning Report

**Status:** planning only. No `src/**` file changed.
**Base:** `feature/desktop-menus` @ `4f72ba68`, branched from `origin/dev`, working tree clean (*measured*).
**Tier:** B — feature workstream (`docs/engineering/task-lifecycle.md` — *Tier B*), with one clause
borrowed from Tier C (§6.1).
**Written:** 2026-08-23. **This report replaces the version of 2026-08-22**, which the owner
discarded. §0 states what was wrong with it and what is carried forward — see also the commit that
removed it.
**Relation to `#menu-rework`:** this workstream runs **separately and first** (owner decision 2). It
is not one of that round's eleven tasks, and its layout is expressly a special case.

Claims are marked where it matters: *measured*, *inferred*, *proposed*.

---

## Decision block — deliberately empty here

The owner is stopped **once** this planning session, in
`docs/workstreams/desktop-menus/planning-report.md`. Its **Q2** was this workstream's question — does
the mainscreen use the shared panel vocabulary?

**Answered by the owner on 2026-08-23: yes.** Every deviation is documented in §2.3's table, with a
reason, written before the value is used. §2.3 and §3 below are written against that answer.

Its **Q1** binds here too: **the round unifies onto today's look** — "kleinere bis mittelgroße
Anpassungen". For this workstream that is a narrower constraint than it sounds, because the tagline
and the grid mark are genuinely *new* elements. It applies to what already exists: the wordmark's
treatment and the Signature Deck panel are adjusted, not re-composed.

One further owner decision exists and is **deliberately deferred to this workstream's Start stop**,
not asked now: **Q9**, what gives way at 1280×720 if the head zone cannot hold wordmark, tagline and
grid mark together. It cannot be answered before C1 measures (§1.3, §6.3), and asking it now would be
asking the owner to choose between three options without the numbers that distinguish them.

Everything below is written for workers and reviewers.

---

## 0. Why the previous report was discarded, and what survives it

The 2026-08-22 report was not wrong when it was written. Three things happened to it.

### 0.1 Its base is gone

It was planned against `feature/desktop-icons` @ `863febe5`. Since then `feature/mobile-icons` and
**`feature/typo-system`** have both merged into `dev`. The typography round changed **41.9 % of menu
text by more than 5 %** and moved a worst case by **28.6 %** (`typography-system/v4-classification.md`,
TYPO-02 and TYPO-03).

Every number in its §1.3 head-zone budget was measured against text that has since changed size. Those
numbers were the report's load-bearing content — §6.3 put a measurement step first *because* of them,
and §8.2 Q9 exists *because* of them. A budget re-derived from stale sizes is worse than no budget,
because it looks like evidence.

### 0.2 Its panel decision predates the system that now governs panels

Its §2.3 chose option **C3** for the Signature Deck panel — a named header, heavier deck art, the
existing battlefield and FX lines restyled as an attribute chip row, the KPI row re-weighted. That was
a sound standalone visual decision, and it was made when there was no shared panel vocabulary to make
it against.

There is one now, or there will be by the time this work starts: `#menu-rework` derives it at its
pilot and freezes it into `conventions.md` §2c. "How prominent is this panel" is no longer a question
a screen answers privately — it is a question of which surface, edge and elevation token the panel
takes, and of which deviation it declares if none fits.

A Tier B report that cannot cite the vocabulary cannot specify that panel. This one can, because it
knows the vocabulary is coming and says how to relate to it (§2.3).

### 0.3 What is carried forward, unchanged

**The owner's decisions of 2026-08-22 were not discarded with the report.** They are the owner's, they
were never revoked, and they are restated in §8.1 with their original numbering so that the old
document's Q-numbers still resolve. Two of them rest on measurements that §0.1 invalidated and are
flagged there: **Q6** (wordmark stays at 88 px, against a collision point measured at 98 px) and
**Q9** (still open, now deferred to the Start stop).

The two corrections that report made to its own brief also still hold, *re-measured on `4f72ba68`*:

- **There is no tagline in the tree.** `grep -rn "tagline\|Legen\. Stechen\|Order\. Trick" src/` →
  no match. The tagline is new work, not a restyle.
- **There is no grid mark in the tree.** `grep -rn "gridmark\|grid-mark\|hub-mark" src/` → no match.

---

## 1. Current state

### 1.1 Relevant files

| File | Lines | Role |
| --- | --- | --- |
| `src/ui/StartScreen.jsx` | 891 | the mainscreen; head zone and the Signature Deck panel |
| `src/index.css` | 6134 | `.hub-*`, `.as-hub-*`, `.as-wordmark`, `.as-wm-glow`, and the short-desktop blocks |
| `src/ui/BrandGrid.jsx` | — | *proposed*, does not exist yet — the grid mark's own module |
| `docs/engineering/conventions.md` | 269 | §2b typography (binding); **§2c the panel vocabulary, once `#menu-rework` M1 writes it** |

### 1.2 Architecture facts that constrain the work

**`StartScreen.jsx` uses none of the shared menu constants.** *Measured*: no `MODAL_CARD`, no
`STICKY_HEAD_BG`, no `phaseCard`, no hairline, no `ActionButton` — the only screen in the tree of
which that is true. The mainscreen's status as a special case is a property of the code, not only a
matter of taste, and it is why owner decision 2 gives it its own round.

**The head zone is a `display: contents` lockup.** `src/index.css:1837`:
`.hub-pair, .hub-play, .hub-stand, .hub-foot { display: contents; }` — these are brackets, not boxes.
A new element in the head zone joins the parent grid directly; it does not get a box of its own for
free.

**The wordmark is token-driven and shared.** `.as-wordmark` reads `--wm-size` (`index.css:855`);
`.hub-play .as-wordmark` sets **88 px with `margin-top: -70px`** inside the 1280 block
(`index.css:2194`), and the comment there records why the selector is scoped: the run header carries
the same class and takes its 22 px from `.as-wordmark-sm`. **A rule that sets `.as-wordmark` unscoped
moves the mark inside a running game.**

**`zoom` traps.** `.hub-pair, .hub-foot { zoom: clamp(0.85, …, 1); }` (`index.css:2003`). The
containing-block consequences are recorded at `src/index.css:303-325` and guarded by
`test/overlay-nesting.test.js`: **no `position: fixed` in the head zone, and `backdrop-filter` only
where `.as-glass` already puts it.**

**The wordmark is deck-tinted, not fixed-palette.** `.as-wm-glow` composes three ellipses from
`--deck-a1`/`--deck-a2` (`index.css:2199 ff.`). Whatever is added must survive all 53 decks.

### 1.3 The head-zone budget — the actual constraint, and it must be re-measured

**The binding case is 1280×720**, not 1920×1080: it is the itch.io embed and the size most visitors
see. At that size the reserves are already spent — *measured from the rules*:

|  | 1920×1080 | **1280×720** |
| --- | --- | --- |
| `zoom` factor | 1.0 | **0.85** (clamp floor) |
| Short-desktop blocks active | `max-height: 950` only | **all three** (950 / 900 / 820) |
| Wordmark | `clamp(28px, 3.3vw, 46px)` | **88 px, pulled up 70 px** |

A tagline costs roughly `font-size × line-height + gap`; the grid mark costs its own height + gap.
**That is two new rows in a column that has already spent its reserves at the size that matters most.**
*Inferred, from the rules above.*

**The figures the previous report gave for `.hub-play` row gap (22 → 14 px) and `.hub-pair` column gap
(80 → 56 px) are not restated here as fact.** They were measured on a pre-typography tree. C1
re-measures the whole budget, **at 1280×720 first, before any other size and before any pixel moves**,
and the composition is decided against those numbers.

### 1.4 Dependencies

- **`#menu-rework` M1 must have written `conventions.md` §2c** before this workstream's C2 starts —
  otherwise §2.3 has no vocabulary to cite and the panel gets a private set of values, which is
  exactly what decision-block Q2 exists to prevent.
- **No dependency on the rest of `#menu-rework`.** M2a onward touch no file this workstream touches.
- `task/icon-position-review` is **not** a dependency: *measured*, it changes no file under `src/`.

### 1.5 Guards that will fire

*Measured*: `hub-knopf.test.js` (5 surface-property assertions), `hub-panels.test.js` (1),
`hub-deck-bg.test.js`, `viewport-1280.test.js`, plus the four `as-kpi` guards the previous report
named. **`typo-tokens.test.js` must pass unmodified** — the tagline picks a role, it does not
introduce a size.

---

## 2. Approach

### 2.1 The grid mark

*Proposed:* an inline SVG in **its own module**, `src/ui/BrandGrid.jsx`, driven by a data table.
`currentColor` throughout; colour arrives from the deck variables at the call site.

Its own module, not a block at the top of `StartScreen.jsx`, so that the head region and the panel
region are not both edited in the same 891-line file in the same task.

**5 × 8** — owner decision, 2026-08-25, superseding Q1's 5 × 6. See §8.2. **Centred beneath the tagline, small** — Q2: wordmark, tagline and mark
then read as one lockup, which is what produces the premium impression. Beside the wordmark it
competes; inside the panel it becomes a UI icon and loses its brand function.

**Only the three accented cells glow** — R3. The `#ruhe` rule: only the primary CTA glows, so the eye
knows where to go. Three tiny cells read as texture, not as a second target. Once §2c exists, that
glow is `--el-glow` or it is nothing.

**No new icon or glyph.** The mark is geometry the project owns, generated from a table. A glyph from
a font would be a house-rule question for the owner, not a worker's choice.

### 2.2 The tagline

**Two new catalog keys**, wired through `t()`, in a desktop-only slot.
**"Legen. Stechen. Eskalieren." / "Order. Trick. Escalate."** — Q3, closing period included.

**It picks a typography role. It does not introduce a size** (`conventions.md:130`, binding). If no
existing role reads correctly beneath an 88 px wordmark, the escape hatch is a **new role**, proposed
once and reviewed — never a number at the call site. That is a `conventions.md` change and it goes to
the owner before C2 ends, because a new role is available to every screen afterwards.

**Shrinking the tagline to make the head zone fit is not an option** (acceptance criterion 3a, carried
forward). If it does not fit, that is Q9.

### 2.3 The panel, and how it relates to the shared vocabulary

Option **C3** stands (Q-inherited, §8.1): named header, heavier deck art, the **existing** battlefield
and FX lines restyled as the attribute chip row, KPI row retained and re-weighted. "Build DNA" remains
**out of scope** — *measured*, no formation/engine/element/effect summary is computed for the hub;
`computeFormations` is run-scoped. The mockup's four chips are placeholder values for data that would
have to be invented.

**What is new in this report is how C3 is built.** Under decision-block Q2's recommended answer:

1. The panel takes its surface, edge, elevation, radius and inset **from `conventions.md` §2c**.
   "More weight" is expressed as a step on the elevation and surface axes — `--sf-raised` and
   `--el-float` rather than `--el-rest`, *proposed* — not as a bespoke shadow.
2. **Every deviation is documented in this report, in a named table, with its reason.** A brand
   surface may legitimately need something the menus do not. The price of that is an exception with a
   name, not a private value.
3. **A deviation that is only "this looked better" is a token proposal, not a deviation.** It goes to
   the `#menu-rework` planner and becomes available everywhere, or it does not happen.

The panel sits inside `.hub-pair` and therefore inherits the `zoom` and the containing-block traps of
§1.2. No `fixed`; blur only where `.as-glass` already puts it.

**Rejected:** exempting the mainscreen from the vocabulary wholesale. It would work, and it would
produce a second system next to the first within one release — the state both rounds exist to end.

---

## 3. Scope

**In:** the head zone of `src/ui/StartScreen.jsx` (wordmark composition, tagline slot, grid mark), the
Signature Deck panel, `src/ui/BrandGrid.jsx` (new), the `.hub-*` and `.as-hub-*` rules those need, two
catalog keys per language.

**Out:**

| Non-goal | Why |
| --- | --- |
| Build DNA | Q4 — the data does not exist; a visual workstream must not quietly grow a game-data summary layer |
| Everything below `DESKTOP_MIN` | The phone layout keeps its own composition — Q5. The tagline **does** appear from 1280×720 upward, including the itch.io embed |
| The hub tile bank | `.as-hub-list` is `#menu-rework`'s neighbour, not this workstream's; touching it here would collide |
| Any type size | `conventions.md:130`. A new **role** is the only escape hatch, and it is an owner decision |
| A CRT-skin variant of the mark | Q7 — identical in both skins; the mark takes the deck colour like everything else |
| A new dependency, icon or glyph | House rule — the owner is asked, not informed |

**Tripwire**, matching `#menu-rework` so a worker who has read one contract has read both:

> **If this diff introduces a new `box-shadow`, `padding`, `border-radius` or `background` value at
> the call site instead of choosing one from `conventions.md` §2c — stop.** A genuine mainscreen
> exception is a documented row in §2.3's deviation table, written before the value is used, not a
> literal that appears in the diff.

---

## 4. Acceptance criteria

1. **Wordmark, tagline and grid mark read as one lockup** at all five canonical viewports, in both
   languages, on a dark **and** a bright battlefield deck.
2. **1280×720 holds the whole head zone without clipping**, or Q9 has been answered by the owner and
   the answer implemented.
3. **The tagline is never shrunk below its chosen role** (3a). If it does not fit, something else
   gives way.
4. **The panel's surfaces come from §2c**, with every deviation in the §2.3 table with a reason.
5. `typo-tokens.test.js` and `panel-tokens.test.js` pass; the four `as-kpi` guards and the `hub-*`
   guards are updated deliberately, **each counter-checked**, never relaxed to reach green.
6. **The measurement deliverable** — the same four parts as `#menu-rework` §5.2: a baseline captured
   before the first edit, a zero-delta claim where one is made, a before/after comparison at five
   viewports in both languages with DPR recorded, and a findings table with an ID per row.

---

## 5. Tier and worker split

### 5.1 Tier B, with one Tier C clause

Tier B: one screen, one feature. **The borrowed Tier C clause: the before/after comparison runs again
after every design iteration**, each with its own capture and its own findings table. A head-zone
composition is not settled in one round, and a single comparison at the end would show the last change
rather than the work.

Note that this clause is now **this workstream's own**, not an inherited one: `4f72ba68` removed it
from the lifecycle along with the rest of the visual protocol (`#menu-rework` §0.5). It is kept here
for the reason it existed, which the deletion did not change.

### 5.2 One worker, three sequenced commits

| Commit | Contents |
| --- | --- |
| **C1** | **Measurement only. No pixel moves.** Re-derive the head-zone budget at 1280×720 first, then the other four sizes, on the post-typography tree. Output is a table, and the input to Q9 |
| **C2** | The head zone: `BrandGrid.jsx`, the tagline slot, the composed lockup. Designed **1280 → 1600 → 1920**, smallest first |
| **C3** | The Signature Deck panel against §2c, plus the deviation table of §2.3 |

**C1 exists as a commit of its own, not as a bullet inside C2**, for the reason `task-lifecycle.md`
§5 gives about measurement tasks: if proving the work correct is a sub-bullet, it is the thing that
gets cut under time pressure. Here it is worse than that — C1's numbers are the *input* to a decision
the owner has to make, and a worker that has already composed the head zone has an interest in the
answer.

### 5.3 The baseline

**Not inherited.** `#menu-rework` may use the `#typo` capture set as its baseline (that round's §0.4),
but this workstream starts *after* M1 has changed `modalStyle.jsx` and `index.css`, so that set is no
longer a valid "before" for it. **C1 captures its own baseline** — the `hub` surface at five sizes, two
languages, both DPR — before C2's first edit.

---

## 6. Risks

| # | Risk | Mitigation |
| --- | --- | --- |
| **R1** | **Head-zone height at 1280×720 — the top risk.** All three short-desktop blocks fire, the wordmark is already pulled up 70 px, and this is the itch.io embed | C1 measures there first, before anything else. If it does not fit, that is Q9 — an owner decision at the Start stop, not a worker's silent trade-off |
| **R2** | **The vocabulary is not ready.** C2 or C3 starts before `conventions.md` §2c exists | §1.4 — a hard dependency. C3 does not start without it. C1 and C2 can proceed; only the panel needs §2c |
| **R3** | **The tagline's role does not exist.** No current role reads right beneath an 88 px wordmark | §2.2 — propose a **new role**, once, to the owner. Never a call-site number. Budget one owner round for it |
| **R4** | **Deck tint against a fixed-violet mockup.** The reference was rendered with one deck; the mark must survive all 53 | Deck-tinted from the start; the comparison run on a dark **and** a bright battlefield |
| **R5** | **The unscoped `.as-wordmark` trap.** A rule that is not scoped to `.hub-play` moves the mark inside a running game | Recorded at `index.css:2191`; named in the contract. The guard is a comparison cell at `run-stage`, which the survey reaches |
| **R6** | **`zoom` traps** — a new head-zone element using `position: fixed` or a stray `backdrop-filter` | `src/index.css:303-325` (guard: `test/overlay-nesting.test.js`). No `fixed` in the head zone; blur only where `.as-glass` already puts it |
| **R7** | **Language regression** — a size tuned on English clips in German | Tune in German, verify in English (`AGENTS.md` — *Additional localization gate*) |
| **R8** | **Scope creep into Build DNA** | Explicit non-goal (§3), with the measurement that kills it recorded there |
| **R9** | **Q6 rests on a stale measurement.** "Wordmark stays at 88 px" was decided against a 98 px collision point measured pre-typography | C1 re-measures the collision point. If it has moved below 88 px, that is a finding for the Start stop, not a silent adjustment |

## 7. Inherited findings

**MENU-38 / MH1, measured 2026-08-24 — two translucent edge alphas live in this workstream's file.**
`rgba(150, 150, 170, .22)` and `… .25` are set **inline in `src/ui/StartScreen.jsx`**. They belong to
a family of **twelve** alphas across 64 literals, carried mostly by the `.as-edge-*` role classes,
which `#menu-rework` deliberately does not migrate.

Two things follow. This workstream is the only one that will touch those two sites, so if they are
ever to join the family's eventual collapse, it happens here or not at all. And an inline literal is
unreachable by any stylesheet rule that is not `!important` — the same trap `#menu-rework` §2.1
resolves by emitting `var()` instead of a value. **If C2 or C3 touches either line, convert it rather
than copy it.**

*Not a defect, and not this workstream's to collapse. An input, so the collapse is not later found to
have missed two sites nobody owned.*



From `typography-system/v4-classification.md`: **TYPO-04** — overflow at 1280×720 grew by ~28 nodes
tree-wide (de 402→430, en 401→426) and was accepted by the owner. The hub is not among the heavy
screens (**TYPO-05** names the end screen at 147 nodes and the glossary at 157–170), but C1 records the
hub's own figure so that C2's findings table can tell a new overflow from an inherited one.

---

## 8. Decisions

### 8.1 Owner decisions of 2026-08-22 — carried forward, original numbering

These were taken by the owner, were never revoked, and survive the discarded report.

| # | Question | Decision |
| --- | --- | --- |
| Q1 | Grid geometry | ~~5 × 6~~ — **superseded on 2026-08-25 by 5 × 8.** The 5 × 6 was the shape reviewed at the time; the reason for 5 × 8 was not on the table then. See §8.2 |
| Q2 | Grid placement | **Centred beneath the tagline, small** — wordmark, tagline and mark read as one lockup |
| Q3 | EN tagline | **"Order. Trick. Escalate."** with the closing period. "Order" and "Trick" are already the approved English terms for the order phase and for *Stich* — established vocabulary, not new synonyms |
| Q4 | Build DNA | **Out of scope** |
| Q5 | Tagline below 1400 px | **Shown from `DESKTOP_MIN` upward, including 1280×720.** Not in the phone layout |
| Q6 | Wordmark size | **Stays at 88 px** — presence comes from composition. ⚠ **Rests on a pre-typography measurement; see R9** |
| Q7 | CRT skin | **Identical in both skins** |
| Q8 | Sequencing | Superseded: its two blockers (`feature/viewport-1280`, `feature/desktop-icons`) have landed. The live dependency is now §1.4 |
| R3 | Glow | **Only the three accented grid cells.** The panel gains no glow, unlike the reference image |

### 8.2 Open, and deliberately deferred

- **Q9 — what gives way if 1280×720 cannot hold all three.** Options: drop the grid mark at 1280 and
  show it from 1600 up; place the mark beside the wordmark rather than beneath it at 1280; or reduce
  the wordmark below 88 px at 1280 only. **Shrinking the tagline is not an option** (criterion 3a).
  **Asked at this workstream's Start stop, with C1's numbers in hand** — not in this planning session,
  where it would be a choice without evidence.
- **Q1a — answered 2026-08-25: 5 × 8.** *Closed, and the way it closed is worth keeping.*

  This report left Q1a open in these words: *"if 5 × 8 was deliberate and carries a meaning the brief
  never stated, that overrides Q1."* **It was, and it does.**

  `docs/mainscreen-marke.md` gives the meaning, and it is **measured rather than asserted** —
  `src/game/architect.js` carries `COLS = 5`, `ROWS = 8`, `N_POS = 40`, with `COLS` explicitly
  `= SEGMENT_SIZE` from `formations.js`. So the grid is not a decorative rectangle: **5 wide is the
  segment width every formation run ends at, 8 tall is the eight segments of a pass, and 40 cells is
  a full deck.** The mark says three true things about the game without a word.

  **Q1's 5 × 6 was not wrong when it was taken** — it was the shape actually reviewed, and the brief
  at the time offered no reason for the other. The reason arrived later, from the code.

  **The cost this decision reopens, stated plainly:** 5 × 8 is two rows taller than the shape §1.3's
  head-zone budget was reasoned against, and that budget is the top risk of this workstream at
  1280×720. **C1 measures the mark at its real height before C2 composes anything** — and if the head
  zone cannot hold it, that is Q9, unchanged.

### 8.3 Technical decisions taken here, not escalated

| Decision | Rejected alternative |
| --- | --- |
| The grid mark is a data-driven inline SVG in its own module | A block at the top of `StartScreen.jsx` — would put the head region and the panel region in one file in one task |
| The panel's weight is expressed as steps on the §2c surface and elevation axes | A bespoke shadow and fill for the brand panel — the second system decision-block Q2 exists to prevent |
| C1 is a commit of its own | A measurement bullet inside C2 — the thing that gets cut, and here the worker would own the answer to a question the owner has to decide |
| The baseline is captured fresh | Inheriting `#typo`'s capture set — invalid here, because M1 changes `index.css` before this workstream starts |

---

## Appendix — reproduce the measurements

```bash
# §0.3 — neither the tagline nor the grid mark exists
grep -rn "tagline\|Legen\. Stechen\|Order\. Trick" src/
grep -rn "gridmark\|grid-mark\|hub-mark" src/

# §1.2 — StartScreen uses none of the shared menu constants
grep -oE "\b(MODAL_CARD|MENU_PANEL|STICKY_HEAD_BG|phaseCard|phasePanel|PHASE_ACCENTS|ActionButton)\b" src/ui/StartScreen.jsx

# §1.2 — the head-zone rules
grep -n "wm-size\|hub-play\|hub-pair\|as-wm-glow" src/index.css

# §1.4 — the open branch is not a dependency
git diff --stat dev...task/icon-position-review -- src/

# §1.5 — the guards
grep -rl "hub-\|as-kpi" test/ | xargs grep -lE "box-shadow|rounded|padding|background"
```
