# Desktop Menus — Frame and Panel Rework (`#menu-rework`)

**Status:** planning only. No `src/**` file changed.
**Base:** `feature/desktop-menus` @ `4f72ba68`, branched from `origin/dev`, working tree clean
(*measured*).
**Tier:** C — a new frame and panel system across more than ten screens, with a design round per
screen (`docs/engineering/task-lifecycle.md` — *Tier C*).
**Predecessor:** `#typo-system`, integrated into `dev` on 2026-08-23. Its §6.4 handoff is consumed
here; its §9 inventory is re-measured in §1.3.
**Proof regime:** the V1–V4 visual protocol was removed from the lifecycle in `4f72ba68`. This round
uses the Tier C measurement deliverable instead — §0.5 and §5.

Claims are marked where it matters: *measured* (read out of the tree), *inferred* (follows from the
code but was not executed), *proposed* (a design suggestion).

---

## Decision block — answered by the owner, 2026-08-23

| # | Question | Decision |
| --- | --- | --- |
| **Q1** | How much of today's look survives? | **(a) — unify onto today's look.** "Viel vom heutigen Aussehen wird überleben; es sind kleinere bis mittelgroße Anpassungen." The vocabulary is derived from the values already in use, and no menu is re-composed |
| **Q2** | Does the mainscreen use the shared vocabulary? | **Yes.** Every deviation is documented in the mainscreen report's §2.3 table |
| **Q3** | Is the screen list right? | **Confirmed as written** — §3.1 and §3.2, including both boundary calls (end screen and chronicle in; architect, formation and build panel mechanism-only) |

**What Q1's answer binds.** "Kleinere bis mittelgroße Anpassungen" is a size limit on every worker's
design round, not only on the pilot's. A screen that is unrecognisable against its baseline has
exceeded this decision, whatever the vocabulary permitted — that is a finding in §5.2's table and it
goes back to the planner. The token *values* are chosen to sit inside the existing spread, not to
replace it.

The original text of the three questions follows, because the reasoning behind each recommendation is
what a later reader needs when asking why the round is shaped this way.

### Q1 — How much of today's look survives the unification?

The menus already share a family: a gradient card with a violet glow at the head, a tri-colour
hairline, the "Kante statt Fläche" buttons. What they do not share is the *values* — 43 distinct
shadows, 98 backgrounds, 28 radii (*measured*, §1.3).

- **(a) Unify onto today's look.** The vocabulary is derived from the values already in use. Visible
  change is small and corrective: panels that were nearly the same become the same.
- **(b) Retune the family while unifying** — new surface and elevation values, chosen for their own
  sake, applied everywhere at once.

**Recommended: (a).** It keeps the pilot's before/after comparison readable: every difference you see
is a value that disagreed, not a taste decision entangled with one. A retune afterwards is one token edit against a
system that already holds, rather than twelve screens. (b) spends the pilot's review budget on two
variables at once — the mistake §9 of the typography report names.

### Q2 — Does the mainscreen use the shared vocabulary?

The mainscreen is the one screen that uses **none** of the shared menu constants today (*measured*,
§1.2) — it is genuinely a special case, which is why it runs separately and first.

**Recommended: it uses the vocabulary where it fits, and documents each deviation in its own
report.** A brand surface may legitimately need an elevation or a surface tone the menus do not; the
price of that is a named exception, not a private set of values. Exempting it wholesale creates a
second system next to the first, which is the state this round exists to end.

### Q3 — Is this the right screen list?

§3.1 lists **13 menu screens in 11 worker tasks**, plus the mainscreen separately. Two boundary calls
are mine: the end screen and the chronicle are **in**; the architect and formation phases are **out of
the design round, in the mechanism conversion** — they keep their exact appearance here, and their
retune belongs to the battle session because they share `phaseCard`/`PHASE_ACCENTS` with the pick
phase and nothing with the menus.

**Recommended: confirm as written.** A missing screen or a wrong boundary call is cheapest to say now
— after the pilot it re-opens the freeze.

---

## 0. Corrections to the brief

Five premises in the brief have moved or were never accurate. All five are *measured*.

### 0.1 The survey reaches 15 surfaces, not 13

The brief cites 13 reachable screens. `#typo-system` S0 added two more on 2026-08-23:
**`architect`** and **`victory`** (`scripts/viewport-survey.mjs:118-160`). Both walk the decision
schedule forward with turbo and poll for a marker; neither needs `DevRunSetup`, which was proposed
and rejected because it is `VITE_PREVIEW`-gated and this survey measures the production build.

This matters twice. The end screen (`GameOver.jsx`) and the architect (`ArchitectScreen.jsx`) are
named in the brief as surfaces the survey never reached — they are reached now, so both arrive in
this round with a machine baseline rather than only a human one. And the baseline capture set of §3.4
covers 15 surfaces, not 13.

### 0.2 `task/icon-position-review` does not touch `src/index.css` — or any `src/` file

H8 in the brief states the branch "fasst `src/index.css` an". It does not:

```text
git diff --stat dev...task/icon-position-review -- src/     ->  (empty)
```

Its three commits change `scripts/` (a contact-sheet harness) and `docs/` only — 19 files, 2287
insertions, none under `src/`. **H8 is closed, not mitigated.** The branch can stay unmerged
indefinitely without constraining this round.

### 0.3 The ratchet exposure is 19 guards, and the number the brief gives measures the wrong thing

The brief cites 63 test files reading `src/**` and 29 reading `src/index.css`. Today: **140 test
files, 67 reading `src/**` as text, 32 reading `src/index.css`** — the counts grew with the tree.

But "reads `index.css`" is not the exposure. What matters is how many of those readers **assert on
one of the four axes this round touches**. *Measured*:

| Guard | Surface-property assertions |
| --- | --- |
| `lv-ruhe.test.js` | 14 |
| `up-ruhe.test.js` | 12 |
| `rd-ruhe.test.js` · `go-ruhe.test.js` | 8 each |
| `cz-ruhe.test.js` | 7 |
| `st-ruhe.test.js` · `desktop-perf.test.js` | 6 each |
| `hub-knopf.test.js` | 5 |
| `kante-anlauf.test.js` · `fx-panel.test.js` | 3 each |
| `shop-scale.test.js` · `levelup-wings.test.js` | 2 each |
| `skill-art` · `rahmen-huelle` · `perk-art` · `hub-panels` · `graph-labels` · `ecke` · `corner-art` | 1 each |

**19 of the 32.** Against four for the typography pass — the brief's order-of-magnitude claim is
right, and 19 is the number a worker plans against.

> **CORRECTED after the pilot, 2026-08-24 — this section named six guards and the number is two.**
> M1 measured the membership instead of inferring it: only `go-ruhe` and `st-ruhe` assert `!important`
> *because a `modalStyle` constant is inline*. The other four (`up`, `rd`, `lv`, `cz`) guard a Tailwind
> utility or a game-data inline colour and are untouched by the conversion — M1 left them alone rather
> than rewriting correct guards, which was right. **And one the list never named did need rewriting:
> `fx-panel.test.js`.** The hazard was right in shape and wrong in membership. Below, only `go-ruhe`
> and `st-ruhe` are the family this paragraph describes; the count of 19 surface-asserting guards
> stands, it is the `!important` subset that was over-claimed.
>
> The error was mine and it is worth naming: I read the assertions in `go-ruhe` and `st-ruhe` and
> **inferred** the other four from the shared filename suffix. A suffix is not a measurement.

**The `*-ruhe` family is the sharp part, and it is sharp in a specific way.** Those guards do not
merely mention the properties; they assert that `!important` is *present*, and they say why:

```text
test/go-ruhe.test.js:88   "die flache Fassung schlägt das INLINE gesetzte MENU_PANEL"
test/go-ruhe.test.js:91   `${prop} ohne !important — MENU_PANEL steht inline und gewänne`
```

The invariant those guards protect — *the flat variant must beat the panel fill* — survives this
round intact. The **mechanism** it is asserted through does not: once `MENU_PANEL` emits a custom
property instead of a hex literal, the stylesheet wins without `!important` and the assertion becomes
false while the invariant it names is more true than before. That is a guard update, not a guard
weakening, and §5.3 states how it is proven.

### 0.4 The inherited baseline is valid — verified, not assumed

`#typo-system` §6.4 point 5 offers its post-change capture set as this round's baseline. The brief
requires this be checked rather than taken. *Measured*: the capture commit is `dab335a9`; five `src/`
files changed between it and `dev`:

| File | Change | Reaches ≥1280 px? |
| --- | --- | --- |
| `src/index.css` | +79 lines, **entirely inside one `@media (max-width: 639.98px)` block** | No |
| `src/ui/useIsWide.js` | +21 lines, **zero deletions** — a new `useIsPhone` hook | No |
| `SkillSelect` · `PerkSelect` · `LegendarySelect` | corner emblem added under `phone`/`onPhone` | No |

The three screen edits replace `wide` with `(wide || phone)` and branch the class between `wide` and
the phone variant. At every canonical viewport `wide` is true and `phone` is false, so each
expression reduces to its former value and every desktop branch is taken exactly as before.

**Conclusion: the set at `docs/workstreams/typography-system/evidence/v2/` is accepted as this round's
baseline** — 210 captures, 15 surfaces × 5 sizes × 2 languages × 2 DPR, `matrix.json` alongside. One
full capture run is saved. §3.4 states the one condition under which it must be retaken.

### 0.5 The V1–V4 visual protocol no longer exists — the brief predates its removal

The brief specifies *"Volles V1–V4 je Umbau-Task … Tier C heißt: V3 läuft nach jeder Gestaltungsrunde
erneut, mit eigenem V2 und eigener Klassifizierung."* That protocol was **removed from the repository**
in commit `4f72ba68` (2026-08-23 21:28), across five files:

| File | What went |
| --- | --- |
| `task-lifecycle.md` | **§8 "Visual review" in full** — V1, V2, the V3 human gate, the V4 classification. The `Visual review (§8, V1–V4)` row of the tier table |
| `task-lifecycle.md` §5 | Tier C loses *"V1 and V2 as full capture sets"* and *"V3 run again after every design iteration"* |
| `task-lifecycle.md` §2 | The **End** stop is now the integration authorization alone, no longer "the V3 gate and the integration authorization answered together" |
| `AGENTS.md` | The sentence *"The human visual gate is unaffected … V1–V4 apply exactly as before"* is **deleted** — an explicit reversal, not an omission |
| `create-task/SKILL.md` | The `--pixels` flag no longer exists |

**Owner decision, 2026-08-23: the repository governs.** This round therefore does not use V1–V4 and
does not cite `task-lifecycle.md` §8, which is now *Handoff to independent review*.

**What replaces it is not nothing.** Tier C still requires, verbatim, *"a measurement task as a named
deliverable, not a bullet inside the implementation task"* — and the tier table still carries
*"Measurement / proof task: yes, as a first-class deliverable"*. §5 is that deliverable, built from
the two halves that survive: a **machine gate** (the zero-delta survey) and a **named before/after
comparison** the owner sees at the End stop.

**What is genuinely lost, stated plainly.** The old §8 made the human look a *gate* — work could not
proceed to integration until a person had passed it, and every finding had to land in a classification
table with an ID. Neither is a lifecycle requirement any more. §5.2 keeps both as **this round's own**
acceptance criteria rather than as inherited ones, because a round whose entire subject is visible
surfaces has no other instrument. That is a choice made here, and a later reader should know it was a
choice.

**Section numbers moved with the deletion.** `task-lifecycle.md` §9 is now Integration and cleanup,
§10 is Two standing rules, §11 is Provenance. Citations in this report use the **new** numbering.

---

## 1. Current state

### 1.1 Relevant files

| File | Lines | Role |
| --- | --- | --- |
| `src/index.css` | 6134 | the stylesheet; `@theme` block, `.as-*` vocabulary, all breakpoint blocks |
| `src/ui/modalStyle.jsx` | 185 | the JS surface constants — the third mechanism of H2 |
| `docs/engineering/conventions.md` | 269 | §2b typography; **§2c is where this round's vocabulary lands** |
| `scripts/viewport-survey.mjs` | — | the 15-surface, 5-size, 2-language capture harness |
| `test/*-ruhe.test.js` (6 files) | — | the guards that assert on inline-vs-stylesheet precedence |

### 1.2 Architecture facts that constrain the work

**Three mechanisms produce a surface today**, and the brief is right that the third one wins:

1. **Tailwind utilities in JSX** — `rounded-*` (390 uses), `border-*` (27), and the padding scale.
2. **Stylesheet rules in `index.css`** — the `.as-*` and per-screen `.xx-*` classes.
3. **Inline styles from JS** — `modalStyle.jsx`. Inline beats both others, and 477 `!important`
   declarations in `index.css` are partly the cost of that.

**The half-built language (H4), measured:** `as-edge-*` 143 JSX uses, `as-ring` 89, `as-panel` 67.
This is the vocabulary to complete. It is not replaced.

**The two constant families do not overlap.** *Measured* across every screen file:

| Family | Symbols | Consumed by |
| --- | --- | --- |
| **Menu** | `MODAL_CARD` (17 files), `STICKY_HEAD_BG` (13), `TopHairline` (10), `ModalHairline` (7), `MENU_PANEL` (2), `ActionBar` (9), `ActionButton` (21) | every menu screen |
| **Phase** | `phaseCard` (7), `PHASE_ACCENTS` (7), `PhaseHairline` (8), `phasePanel` (3), `PANEL_BG` (3) | architect, formation and the pick phase only |

**No file uses symbols from both.** That is the seam this round cuts against, and it is measured
rather than asserted — see §2.3.

**`StartScreen.jsx` uses neither family.** The mainscreen's status as a special case (owner decision
2) is confirmed by the tree, not only by taste.

### 1.3 The measured inventory — H3, re-measured on `cfd96560`

The §9 figures were taken before the typography merge. Re-measured on today's `dev`, same tree, same
method (property family including longhands, multi-line declarations counted):

| Axis | Declarations in `index.css` | **Distinct values** |
| --- | --- | --- |
| `background` | 220 | **98** |
| `padding` | 206 | **119** |
| `border` | 299 | **119** |
| `border-radius` | 122 | **28** |
| `box-shadow` | 81 | **43** |

Plus **390 `rounded-*`** utilities in the JSX. The spread is confirmed — 43 distinct shadows is more
than the 39 type sizes the previous round collapsed, and 119 distinct paddings is three times that.

The small deltas against §9 (85→81 shadows, 51→43 distinct) are regex methodology, not tree drift.
Both readings support the same conclusion and neither is used as an acceptance number.

### 1.4 H5 — the `!important`, and why it is a symptom

`src/index.css:3058` states its own cause:

> `!important`, weil `.cz-stage` seine Sticky-Kopf-Fläche INLINE setzt (STICKY_HEAD_BG) und Inline
> jede Stylesheet-Regel schlägt

The inline source is `CustomizeScreen.jsx:1830`:
`style={{ top: stickyTop, background: STICKY_HEAD_BG, borderBottom: "1px solid #23222e" }}`.

`STICKY_HEAD_BG` is the string `"#1b1a24"`. A hex literal in an inline style is unreachable by any
stylesheet rule that is not `!important`. **The fix is not to remove the inline style. It is to change
what the inline style contains** — §2.1.

### 1.5 Guards that will fire

The 19 of §0.3, plus one new guard this round adds (§5.3). `typo-tokens.test.js` is **not** in the
list and must not be touched: this round does not change a single type size.

---

## 2. The approach

### 2.1 Mechanism — there is no third mechanism, there is one file that has not joined the other two

**H2 states that the `@theme` token route cannot reach an inline style. That is true of a token
*class*. It is false of a token *variable*, and this repository already depends on the difference.**

`modalStyle.jsx:58`:

```js
export const DECK_BORDER = "var(--deck-border)";
```

resolved at `index.css:244`:

```css
:root { --deck-border: color-mix(in srgb, var(--deck-a1, #2c2a3a) 45%, #17171c); }
```

An inline `style={{ border: "1px solid var(--deck-border)" }}` resolves the custom property **on the
element it is set on**, at use time. Any stylesheet rule — including a conditional one, and including
one with lower specificity than an inline declaration — can set that custom property on that element,
and the inline style picks up the new value. The cascade is bypassed for the `border` declaration and
re-entered for the variable.

**This is *measured*, not reasoned.** Three cases in a browser, the middle one being the claim the
whole round rests on:

| Case | Setup | Computed result |
| --- | --- | --- |
| **A** | inline `background: rgb(27,26,36)`; stylesheet `#a { background: rgb(0,255,0) }` | **`rgb(27, 26, 36)`** — the inline literal wins. This is today's state, and why `!important` was needed |
| **B** | inline `background: var(--sf-head)`; stylesheet `#b { --sf-head: rgb(0,255,0) }` | **`rgb(0, 255, 0)`** — the stylesheet steers it, **without `!important`** |
| **C** | same as B, but the override is a *conditional* rule matching only when a gate is set — the shape of the 1280 block | flips live from `rgb(27,26,36)` to **`rgb(0, 0, 255)`**, **without `!important`** |

Case A is the H5 state. Case B is the proposal. Case C is the proposal at the exact place H5 lives.
Reproduce with the probe in the appendix.

**The decision: every literal in `modalStyle.jsx` becomes a `var(--token)` reference.** The JS layer
keeps its parameterisation and loses its values. The three mechanisms collapse to one — a custom
property defined in `index.css` — consumed three ways.

Two consequences, both large:

- **H5 dissolves rather than moving.** `.cz-stage` keeps its inline `background: var(--sf-head)`; the
  1280 block sets `--sf-head` on `.cz-stage` and wins without `!important`. The `!important` is
  deleted, not rewritten.
- **The pilot's conversion is provably appearance-neutral.** Replacing `"#1b1a24"` with
  `"var(--sf-head)"` where `--sf-head: #1b1a24` changes no computed value anywhere. That is exactly
  the property the `#typo` zero-delta gate measures, and the harness already exists (§5.1).

**Options rejected, and why:**

| Rejected | Reason |
| --- | --- |
| **Delete `modalStyle.jsx`; move everything to classes** | `phaseCard(accent, base, {quiet})` spans 6 accents × 2 volumes × 2 bases. As static classes that is 24 rules for what is now one function, and the parameterisation is real — `quiet` is a documented desktop decision (`#lv-ruhe`), not incidental |
| **Keep the literals; add `!important` where the stylesheet must win** | This *is* today's state. It has already cost one `!important` block, and 477 in the file overall. Scaling it across twelve menus scales the notwehr |
| **A CSS-in-JS runtime (styled-components, vanilla-extract)** | A new dependency — a house rule the owner is **asked** about, not informed of — and it solves nothing the variable indirection does not |
| **Tailwind `@theme` utility classes only, no variables** | Cannot reach an inline style at all. This is the H2 objection, and it is correct against this option specifically |

### 2.2 The vocabulary — 19 tokens on five axes

*Proposed.* Values are derived from the current tree in the pilot, not invented here; the pilot's
first commit is the derivation and its output is the table that goes into `conventions.md` §2c.

| Axis | Tokens | Steps |
| --- | --- | --- |
| **Surface** (fill) | `--sf-sunken` · `--sf-base` · `--sf-raised` · `--sf-head` | 4 |
| **Edge** (border colour) | `--ed-quiet` · `--ed-base` · `--ed-strong` · `--ed-deck` | 4 |
| **Elevation** (shadow) | `--el-flat` · `--el-rest` · `--el-float` · `--el-modal` · `--el-glow` | 5 |
| **Radius** | `--rd-sm` · `--rd-md` · `--rd-lg` | 3 |
| **Inset** (padding) | `--in-tight` · `--in-snug` · `--in-base` | 3 |

19 tokens against 43 shadows, 98 backgrounds, 119 paddings, 28 radii, 119 borders.

`--ed-deck` is `--deck-border`, kept under its existing name as an alias so the 53 decks keep tinting
neutral structure panels. `--el-glow` exists so the `#ruhe` rule stays expressible: **only the primary
CTA glows**, and a token named for it is harder to spread than a shadow value copied.

**The role classes** — completing H4's language rather than replacing it:

| Class | Composition | For |
| --- | --- | --- |
| `.as-panel` *(exists, 67 uses)* | `--sf-base` `--ed-base` `--rd-md` `--el-rest` | the neutral content panel |
| `.as-panel-sunken` *(new)* | `--sf-sunken` `--ed-quiet` `--rd-sm` `--el-flat` | inset readouts, list rows |
| `.as-card` *(new)* | `--sf-raised` `--ed-base` `--rd-lg` `--el-modal` | the modal card itself |
| `.as-head` *(new)* | `--sf-head` + bottom `--ed-base` | sticky heads |
| `.as-ring` *(exists, 89 uses)* | retuned onto tokens, behaviour unchanged | the accent ring |
| `.as-edge-*` *(exists, 143 uses)* | retuned onto tokens, behaviour unchanged | "Kante statt Fläche" buttons |

**The rule, and it is the typography rule with one noun changed:**

> **A menu picks a token, or changes a token for everyone. A menu does not introduce a value.**

**The escape hatch and its price:** where a screen genuinely needs a surface no token provides, it
proposes a **new token** — reviewed once by the planner, then available everywhere. Never a value at
the call site. This is `conventions.md:130` applied to surfaces, deliberately worded the same way so
that a reader who knows one knows the other.

**Why five axes and not one ladder.** §9 is right that radii, elevation and padding have no single
derivation the way a 1.2 type ratio does. That is an argument against *deriving* the steps
arithmetically, not against *counting* them. Each axis is therefore collapsed empirically from its own
current values in the pilot, and each is capped at 3–5 steps before the derivation starts — a cap is
what makes the collapse a decision rather than a survey.

### 2.3 The seam with the battle session — measured, not drawn

The brief excludes the battle screen and the pick phase. It leaves the architect and formation phases
unclassified. §1.2 settles them: the menu constants and the phase constants have **no consumer in
common**.

**Decision: the phase screens are in this round for the mechanism, out of it for the design.**

- The pilot converts `phaseCard` / `phasePanel` / `PHASE_ACCENTS` / `PANEL_BG` / `PhaseHairline` to
  `var()` references along with the menu constants — one file, converted once, never again.
- Their computed values must not move. This is machine-checkable at the `architect` and `run-stage`
  surfaces the survey already reaches, and it is part of the pilot's acceptance gate (§5.1).
- Their **appearance** is the battle session's to decide, against a vocabulary that will already exist
  by then.

The alternative — leaving `modalStyle.jsx` half-converted — means both sessions edit the same 185-line
file, and the second one arrives to find the first one's tokens and its own literals side by side.
That is the concrete cost, and it is why the boundary is cut at the mechanism rather than at the file.

---

## 3. Scope

### 3.1 The screens — 13 menus, 11 tasks, plus the mainscreen

| # | Screen | Component file(s) | Survey id | Lines | `rounded-*` | inline `background` |
| --- | --- | --- | --- | --- | --- | --- |
| **M1** | **Options — PILOT** | `src/ui/OptionsModal.jsx` | `options` | 362 | 6 | 6 |
| **M2a** | Workshop — shell | `src/ui/CustomizeScreen.jsx` (`.cz-stage`, `.cz-card`, `.cz-main`, `.cz-scroll`) | `shop-packs` | 2128 | 51 | 60 |
| **M2b** | Workshop — contents | `src/ui/CustomizeScreen.jsx` (pack cards, fx panels, detail card) | `shop-packs` | ″ | ″ | ″ |
| **M3** | Upgrades | `src/ui/UpgradeScreen.jsx` · `src/ui/DeckDetail.jsx` | `upgrades` | 647 · 238 | 13 · 14 | 12 · 17 |
| **M4** | End screen | `src/ui/GameOver.jsx` · `src/ui/RunDetail.jsx` · `src/ui/RunStats.jsx` · `src/ui/RunGraphs.jsx` | `victory` | 664 · 212 · 320 · 209 | 24 · 4 · 7 · 7 | 20 · 5 · 10 · 11 |
| **M5** | Guide | `src/ui/GuideOverlay.jsx` | `guide` | 346 | 12 | 17 |
| **M6** | Glossary | `src/ui/Glossary.jsx` | `glossary` | 315 | 6 | 6 |
| **M7** | Stats | `src/ui/StatsScreen.jsx` · `src/ui/Sparkline.jsx` | `stats` | 324 | 11 | 7 |
| **M8** | Leaderboard | `src/ui/LeaderboardScreen.jsx` · `src/ui/GlobalLeaderboard.jsx` · `src/ui/WeekMods.jsx` | `leaderboard` | 325 · 213 · 77 | 7 · 2 · 3 | 8 · 3 · 4 |
| **M9** | Three small modals | `src/ui/PrivacyModal.jsx` · `src/ui/FeedbackModal.jsx` · `src/ui/UsernameModal.jsx` | `privacy`, `feedback`, — | 157 · 245 · 161 | 5 · 10 · 4 | 4 · 9 · 3 |
| **M10** | Chronicle | `src/ui/ChronikOverview.jsx` · `src/ui/CardDetail.jsx` | — | 189 | 4 | 7 |
| **M11** | Run dialogs | `src/ui/RunConfirm.jsx` · `src/ui/RunLoader.jsx` · `src/ui/UpdateBanner.jsx` · `src/ui/PwaInstall.jsx` | — | 121 · 72 · 70 | 3 · 2 · 2 | 2 · 3 · 1 |
| **—** | **Mainscreen** | `src/ui/StartScreen.jsx` | `hub` | 891 | 23 | 8 |

*Line and utility counts measured on `cfd96560`.*

### 3.2 What is **not** in this round, and why

| Screen / file | Component | Reason |
| --- | --- | --- |
| Battle screen | `Battlefield` · `StatusBar` · `StatusRail` · `CardGrid` · `Card` · `Controls` · `HeldSkills` · `ChargeBar` · `HeatBar` · `PlantBar` · `GlacierBar` · `RunTimer` · `TrickBreakdown` · `RoundScoreBadge` · `ScoreMilestoneBar` | Owner decision 1 — own session |
| Pick phase | `SkillSelect` · `PerkSelect` · `LegendarySelect` · `GlacierPick` · `TargetSelect` · `FamilyTargetSelect` · `LevelupWings` · `LayoutPerks` | Owner decision 1 — own session |
| **Architect** | `ArchitectScreen` · `ArchPanels` | **Design out, mechanism in** — §2.3. Shares `phaseCard`/`PHASE_ACCENTS` with the pick phase and nothing with the menus |
| **Formation** | `FormationPhase` · `FormationPanel` | **Design out, mechanism in** — §2.3, same reason |
| **Build panel** | `BuildPanel` · `BuildSummary` | **Design out, mechanism in** — renders inside both in-run and menu contexts; retuning it here would move a battle surface |
| Preview-gated | `DevRunSetup` · `DevPerkCatalog` · `PerfOverlay` · `TestViewportHarness` | `import.meta.env.VITE_PREVIEW === "1"` — folded out of production builds (`App.jsx:1081`, `main.jsx:56`). Not a shipped surface |
| Everything below 1280 px | — | Owner decision 9 — the mobile version is signed off |
| Typography | — | Owner decision 8 — finished and binding |
| Browser zoom / DPI | — | Owner decision 6 |

### 3.3 Non-goals and the tripwire

| Non-goal | Why |
| --- | --- |
| Battle screen and pick phase | Own session |
| Anything below 1280 px | The mobile version is signed off |
| A new dependency, new icons or glyphs | House rule — the owner is **asked**, not informed |
| Touching typography again | Finished, binding, and a second pass would be a second typesetting |
| Browser zoom / DPI scaling | Deliberately outside acceptance — owner decision 6 |
| Translating the German comments in `src/index.css` | A pure translation diff in a ratchet-guarded file costs a review round and buys nothing (`AGENTS.md` — *Existing historical German material*) |

**The tripwire. It stands in every worker contract, verbatim:**

> **If a worker's diff introduces a new `box-shadow`, `padding`, `border-radius` or `background` value
> at the call site instead of choosing one from the vocabulary — stop.**

**The second tripwire:**

> **If a worker after the pilot builds its own panel — stop and report to the planner. Extensions to
> the vocabulary go through the planner, never around the pilot.**

### 3.4 The baseline — taken, not to be retaken

Per §0.4 the `#typo-system` capture set is this round's baseline:
`docs/workstreams/typography-system/evidence/v2/` — 210 captures, `matrix.json`, 15 surfaces ×
5 sizes × 2 languages × 2 DPR.

**A baseline is still taken before the first edit**, even though the lifecycle no longer names the
step. The reason the old §8 gave for it survives the section that carried it: a comparison that sees
only the "after" cannot separate *this change did it* from *it was always like that*, and this round
inherits 147 pre-existing overflowing nodes on one screen alone (§8.1, TYPO-05). Without a baseline
those are indistinguishable from damage the round caused.

**The one condition:** if anything lands on `feature/desktop-menus` that changes a desktop-visible
surface before M1's first commit, the baseline is void and M1 retakes it. Checked by the pilot at
start, with `git diff --stat dab335a9..HEAD -- src/` and a read of every hunk that is not inside a
`max-width` block. Cheap; do not skip it.

*Verified for `4f72ba68`: that commit changes `docs/`, `AGENTS.md` and `.claude/` only — no `src/`
file — so the baseline survives the lifecycle change untouched.*

---

## 4. Worker split and order

Eleven tasks, **sequential, one worker each**, on `task/*` branches under `feature/desktop-menus`.

```text
M1  Options ................ PILOT + modalStyle.jsx conversion
      |
    [ FREEZE ]  vocabulary written into conventions.md §2c
      |
M2a Workshop shell ......... the stress test — H5 lives here
      |
    [ CLOSE ]   the one extension window shuts
      |
M2b Workshop contents
M3  Upgrades (+ DeckDetail)
M4  End screen (+ RunDetail, RunStats, RunGraphs)
M5  Guide
M6  Glossary
M7  Stats
M8  Leaderboard (+ GlobalLeaderboard, WeekMods)
M9  Privacy + Feedback + Username
M10 Chronicle (+ CardDetail)
M11 Run dialogs
```

### 4.1 Why the hardest screen runs second — the H1 mitigation, made concrete

H1 is real: §9 of the typography report recommends *type → panels → menu pass*, both systems finished
before any menu is touched, because "a menu adjusted against half a system is a menu adjusted twice".
The owner decided the system is derived at the pilot instead. What makes that decision hold is the
seam — and a single freeze is not enough of one.

A single freeze fails in a specific way: the pilot is a 362-line modal with six rounded corners. It
cannot discover what a 2128-line screen with a sticky head, an `!important` block and 60 inline
backgrounds needs. Freezing against the pilot alone means the vocabulary's first real test arrives at
task 11, and everything before it gets adjusted twice — precisely §9's warning.

**Therefore: freeze, stress, close.**

1. **FREEZE, after M1.** The vocabulary is written into `docs/engineering/conventions.md` §2c and
   committed on `feature/desktop-menus`. It lands in `conventions.md` rather than in this report for
   the reason §6.4 point 1 gives: a planning report records a decision, a conventions section is an
   instruction that survives it. **M2a does not start until that commit exists.**
2. **STRESS, at M2a.** The workshop is the hardest consumer in the round and it runs immediately,
   while the vocabulary is still young enough to extend cheaply. M2a may file **exactly one extension
   request**, through the planner. An extension adds tokens; it never changes the value of a token
   another screen already consumes.
3. **CLOSE, after M2a.** The extension window shuts. From M2b onward the vocabulary is closed, and a
   worker that needs something it does not have stops and reports — tripwire 2.

This is stricter than the brief asks for, and it is the reason the acceptance criterion in §7 is
reachable. A vocabulary frozen against the easiest screen is a vocabulary that reopens.

### 4.1b The order is re-cut to follow the design documents — 2026-08-24

**Owner decision.** A parallel design track is producing approved target designs, one per screen. The
order below M2 is re-cut so that **a screen is migrated when its design exists**, and is therefore
touched once rather than twice.

| Design document | Screen | Task | |
| --- | --- | --- | --- |
| `optionen-redesign.md` | Options | **M1** | absorbed, done |
| `werkstatt-redesign.md` | Workshop | **M2a/M2b** | **missed it — see below** |
| `upgrade-baum-redesign.md` | Upgrade tree | **M3** | absorbed |
| `statistik-redesign.md` | Statistics | M7 | ready |
| `bestenliste-redesign.md` | Leaderboard | M8 | ready |
| `feedback-redesign.md` · `erststart-redesign.md` | Feedback · welcome | M9 | ready |
| `mainscreen-marke.md` | Mainscreen | own workstream | ready |
| *(none yet)* | End screen · Guide · Glossary · Chronicle · Run dialogs | M4 · M5 · M6 · M10 · M11 | wait |

**New order:** M3 → M7 → M8 → M9, then M4 · M5 · M6 · M10 · M11 as their designs arrive.

**Why this is not a schedule preference.** The design documents state, each in its own head, that they
are *"reiner Design-Auftrag"* and that the technical implementation belongs to the worker. So the CSS
gets written either way; the only question is whether one worker writes it once or two workers write
it twice. M1 proved the first shape works — structure commit, then vocabulary commit, one screen, one
review.

**What it already cost, recorded rather than glossed.** `werkstatt-redesign.md` was written at 14:37
on 2026-08-24; M2a and M2b had finished before it existed. **The workshop will be touched a second
time.** That is roughly one extra task, and it is sunk. It is also the whole argument for this
re-cut: the same thing was avoidable for four more screens and now is.

**The joint stays at the same seam either way.** `conventions.md` §2c decides what a value is *called*
and where it lives; a design document decides what it *should be*. A design that changes a value
changes a token — through the planner — or diverges deliberately, with a reason. That rule predates
this re-cut and is unaffected by it.

### 4.2 Why this order below M2

Shared-component owners run before their consumers, so later workers inherit a converted component
rather than fighting one:

- **M3 before M5** — `DeckDetail` is imported by `UpgradeScreen` **and** `GuideOverlay`; M3 owns it.
- **M4 owns `RunDetail`, `RunStats`, `RunGraphs`**, which `StatsScreen` (M7) and `GlobalLeaderboard`
  (M8) also render. M4 converts; M7 and M8 consume.
- **M9 last among the modals** — the three small modals are the purest `MODAL_CARD` consumers in the
  tree and the least likely to need anything the vocabulary lacks. They are the confirmation, not the
  discovery.

**Rejected orderings:**

| Rejected | Reason |
| --- | --- |
| Easiest → hardest | Puts the workshop at task 11 and buys exactly what §9 warns about |
| Workshop as the pilot | 2128 lines is not a vocabulary derivation, it is a migration. The pilot must be small enough that its comparison is about the vocabulary and not about one screen's layout |
| Split the workshop into four | The extension window has to sit at a task boundary. Two parts put it in the right place; four parts put three of them after it |
| Parallel workers on independent screens | Owner decision 7, and `git-workflow.md` §22. The planner's context is the constraint, not the workers' throughput |

### 4.3 The operating model — one worktree, one port, for the whole round

**Owner decision, 2026-08-23.** This round does **not** follow the usual one-worktree-per-task flow.

| | |
| --- | --- |
| **Worktree** | `C:/Code/Autostich-worktrees/menu-rework` — one, for all eleven tasks. Created once, kept for the round |
| **Checked out on** | `feature/desktop-menus`, **not** a task branch. Each task creates its own inside the worktree |
| **Preview port** | **5189**, fixed. `http://localhost:5189/autostich/` from M1 to M11 |
| **Survey port** | **5181**, and it is *not* 5189. `scripts/viewport-survey.mjs:54` hardcodes it with `--strictPort`. The two coexist; a third process on 5181 breaks the survey loudly, which is the designed behaviour |
| **Branches** | Unchanged — `task/menu-mN-*` under `feature/desktop-menus`, one per task, created and checked out **inside that one worktree** |
| **Worker handover** | The owner reports when a worker is done and starts the next one. Workers never overlap |
| **Integration** | **The planner integrates, once, when all eleven are through** — not per task |

**How the worktree was created, and why not with `/create-task`'s usual form.** That command couples a
new worktree to a new `task/*` branch, because it is built for one worktree *per task*. A shared round
worktree wants the opposite: the worktree tracks the integration branch, and the task branches are
created inside it. It was therefore created as

```bash
git worktree add ../Autostich-worktrees/menu-rework feature/desktop-menus
```

with the rest of `/create-task`'s procedure followed as written — cockpit check, ancestry, base SHA,
the four collision checks, port allocation, `npm ci`. Port **5189** is the lowest free integer from
5181 upward: 5180 is reserved by `scripts/viewport-proof.mjs` and 5181–5188 are claimed by existing
workstream contracts (*measured*).

No contract scaffold was written. The round's contract already exists in full as
`task-contract-M1-options.md`; a `TODO` skeleton beside it would be noise.

**Why this is safe here, and where it would not be.** `AGENTS.md` — *Session placement* forbids a
worker editing another worktree or switching to another worker's branch, because a session cannot see
a concurrent writer. That hazard is absent by construction under owner decision 7: the workers are
strictly sequential, so there is never a second writer in the tree. The prohibition protects against
concurrency, and there is none.

**What it costs, and the two guards against it:**

1. **A worker inherits the previous worker's tree**, including `node_modules`, build output, and any
   uncommitted leftovers. Every contract therefore opens with *working tree clean, confirmed* and
   closes with the same — a dirty tree at handover is a collision to report, not to tidy away.
2. **A stale branch checkout.** A worker that starts on the previous task's branch would commit into
   it silently. Every contract's first checkbox is the branch confirmation of `AGENTS.md` — *Before
   you start*, and it is the reason that checkbox is first rather than ceremonial.

**Integration is deferred to the end**, so the eleven task branches accumulate on
`feature/desktop-menus` and are merged in one pass. That concentrates merge risk into one operation
instead of eleven — acceptable because the tasks touch disjoint screen files, with `index.css` and
`conventions.md` as the two shared surfaces. Both are append-mostly under this design: a task adds
its screen's rules and consumes tokens it does not redefine.

### 4.4 What every contract carries

Both tripwires verbatim (§3.3), the acceptance gate (§5), the file surface from §3.1, the five
viewports, both languages, the inherited findings that touch its screens (§8.1), and the handoff shape
of §6.

---

## 5. Acceptance

### 5.1 M1 — machine-checkable, and the reason the pilot is split in two commits

M1's first commit is the mechanism conversion: every literal in `modalStyle.jsx` becomes a `var()`
reference, and `index.css` gains the `@theme` definitions. **That commit must produce zero computed
deltas on all 15 surfaces**, measured with `scripts/viewport-survey.mjs` against the baseline set —
the same instrument, and the same zero-delta claim, that carried `#typo` S1.

This is what makes the phase-screen conversion of §2.3 safe: the architect and formation screens pass
through this round with a machine proof that they did not move.

M1's second commit is the pilot's design round on `OptionsModal.jsx` — where pixels are *meant* to
move, and where the comparison of §5.2 applies.

Splitting them is what gives the round one variable at a time. A combined commit would leave the
owner unable to tell a vocabulary problem from a conversion bug.

### 5.2 The measurement deliverable — every task, per screen

Tier C requires *"a measurement task as a named deliverable, not a bullet inside the implementation
task"* (`task-lifecycle.md` §5). For this round that deliverable is one committed file per task,
`docs/workstreams/desktop-menus/measurements/M<n>.md`, with four parts:

| Part | What it is | Who does it |
| --- | --- | --- |
| **1. Baseline** | The reference the task measures against — §3.4 for M1, the previous task's after-set thereafter. Named, not re-derived | machine |
| **2. Zero-delta gate** | Where the task claims no pixel moved — always commit 1; anywhere else the task says so | machine |
| **3. Before/after comparison** | Same harness, same five sizes, both languages, both DPR, same application state. Rendered as pairs the owner can page through | machine |
| **4. Findings table** | Every observation in one row, **with an ID** (`MENU-01`, `MENU-02`, …) and a disposition | human |

**Part 3 runs again after every design round**, not once at the end. This is the Tier C clause the
lifecycle dropped, kept here deliberately: one comparison at the end of an eleven-task round compares
the last change, not the work. It is now this round's own acceptance criterion rather than an
inherited one — see §0.5.

**The four dispositions**, carried forward from the deleted §8 because the distinction is what makes a
findings table useful rather than a list:

| Disposition | What follows |
| --- | --- |
| **Defect in this task** | Fixed in this task; a regression guard added and counter-checked |
| **Expected** | Documented, no fix |
| **Pre-existing, out of scope** | Backlog entry, keeps its ID |
| **New design question** | Backlog entry, named as input to a later round |

**Only the first returns as work in the task.**

**The comparison set shrinks from M3 on — owner decision, 2026-08-24.** The machine half stays in
full: the zero-delta claim, and the proof that *only* the migrated screen moved. That is what catches
a token leaking onto a screen nobody touched, and it earns its keep whatever happens later.

The **owner-facing** half does not. Every remaining menu gets a design pass of its own afterwards, so
a before/after of the re-plumbing shows a state that is not the target anyway. From M3: **the migrated
screen, both languages, two sizes** — not a full pair set. The owner sees what there is to decide,
not what the machine already checked.

*This is the largest single saving left in the plan: one capture round and one review round per screen,
across nine screens.*

**Part 3 re-measures the decision block.** Every number a task put to the owner is re-stated in the
measurement record as *measured*, with the delta named where it moved.

*Added after M2a, 2026-08-24, and it is the cheapest process fix of the round.* MENU-43: a
recommendation was wrong **in its sign** — a panel was said to lose 10 px of height, and being
content-sized it grew by 7.92 px. The mechanism the recommendation named held, nothing overflowed,
and the owner's decision stands on the same facts. But the error sat in the half nobody re-measures
after a yes. A decision block is only worth its accuracy, and accuracy that is never checked decays
silently.

**A finding that exists only in a chat message is lost.** Transcribe it into the table verbatim, with
a date. That transcription is the whole point of part 4.

**Both languages, and German is the tuning language.** `AGENTS.md` — *Additional localization gate*; a
surface tuned on English clips in German.

**An agent does not report a visual result as approved.** The lifecycle no longer says this; it stays
true regardless, and it stays in every contract of this round. Tooling captures and attributes
differences. Whether a layout is good is the owner's call at the End stop.

### 5.3 The new guard, and the six that change

**The new guard — `panel-tokens.test.js`.** In **migrated files only**, the four axes must come from
the vocabulary. The migrated set is an explicit allowlist in the test file that grows by one entry per
worker; unmigrated files are untouched by it, so the guard is a ratchet that tightens as the round
proceeds and never blocks work that has not happened yet.

It must cover **every way to write a value**, because TYPO-12 is the recorded cost of a guard that
covered half of them:

- literal `box-shadow:` / `boxShadow:` in CSS and in JSX,
- `#rrggbb` / `rgba(` in a `background` or `border` position,
- arbitrary utilities — `rounded-[Npx]`, `p-[Npx]`, `shadow-[...]`,
- **and the named Tailwind scale** — `rounded-xl`, `shadow-lg`, `p-4`. This is the half TYPO-12 was
  missed by.

**The rule that has now cost five findings — TYPO-12, MENU-15, MENU-29, MENU-52, and one before
them.** Every one is the same mistake wearing a different coat:

> **A guard asks whether *only* the sanctioned form is present. Never whether it is present.**

MENU-52 is the purest instance, because it happened *inside the guard itself*: the inline reader asked
whether a `var()` occurs, not whether a raw value sits beside it. Three sites in the very file it was
guarding were invisible to it. `text-[Npx]` without the named scale (TYPO-12) and a `:root` composite
reading a per-element variable (MENU-15, MENU-29) are the same shape.

Write the assertion as *"this file contains no X other than Y"*, never as *"this file contains Y"*.

**Counter-checked**, per `AGENTS.md` — *Hazard: source-text ratchet tests*: each of the four axes is
deliberately broken in a migrated file and the guard proved to fail. Four counter-checks, recorded.

**The six `*-ruhe` guards.** `go-ruhe`, `st-ruhe`, `up-ruhe`, `rd-ruhe`, `lv-ruhe`, `cz-ruhe` assert
that `!important` is present *because* the constant is inline (§0.3). After the conversion the
invariant holds without `!important`. Each is rewritten to assert **the invariant** — the flat
variant's value wins at the element — rather than the mechanism, and each rewrite is counter-checked
by removing the override and proving the guard fails.

**This is the single most likely place for this round to weaken a guard by accident.** A worker that
cannot make a `*-ruhe` guard pass stops and reports; it does not relax the assertion.

### 5.4 Integration readiness

Per task: four gates green on the merged tree, the measurement deliverable of §5.2 committed with no finding classified
*Defect in this task* left open, every hazard named in the contract resolved (`task-lifecycle.md`
§10), and the handoff of §6 written.

---

## 6. The handoff, and why the planner does not read the diffs

H9: the planner's context is this round's scarce resource. Sequential workers save it only if their
diffs are not read. Each worker returns **a handoff of at most fifteen lines**:

1. Screens done, commits, branch.
2. **Did the vocabulary hold?** Yes / no. If no: which token was missing, and what was used instead.
3. Tripwire 1 — fired or not. If fired: where, and how it was resolved.
4. Tripwire 2 — fired or not.
5. Guards touched, and whether each was counter-checked.
6. Finding IDs from §5.2 part 4, and their dispositions.
7. Anything the next worker inherits.

Point 2 is the load-bearing one. A run of "yes" answers is the evidence that the freeze held; the first
"no" is the planner's cue to act, and it arrives in one line rather than in a diff.

**The planner reads handoffs, not diffs.** The substitutes are the owner comparison of §5.2, the guards of §5.3 and the
tripwires — all of which fire without the planner looking.

---

## 7. Acceptance criterion of the planning session

> **After the pilot, every further menu can be handed to a worker without another planning round.**

Three things carry it, and each has an address in this report:

| Requirement | Where |
| --- | --- |
| The screen list is complete and confirmed by the owner | §3.1, §3.2 — decision block Q3 |
| The vocabulary is frozen in writing after the pilot | §4.1 — `conventions.md` §2c; freeze / stress / close |
| The tripwire stands in every contract | §3.3, §4.4 — and verbatim in `task-contract-M1-options.md` |

---

## 8. Risks

| # | Risk | Mitigation |
| --- | --- | --- |
| **R1** | **The vocabulary is too small and the workshop breaks it.** The pilot is 362 lines; the workshop is 2128 | §4.1 — the workshop runs second, with one extension window, before nine other workers have consumed the frozen version |
| **R2** | **A `*-ruhe` guard gets relaxed to reach green.** Six guards assert a mechanism this round replaces | §5.3 — each rewrite is counter-checked; a worker that cannot pass one stops and reports. Named in every contract as a hazard |
| **R3** | **The mechanism conversion moves a pixel somewhere the survey does not reach.** `CardDetail`, `FormationPanel`, `PwaInstall` have no marker | The conversion is value-preserving by construction (`#1b1a24` → `var(--sf-head)` where `--sf-head: #1b1a24`). Compensated by the comparison on the screens that are reached, and by the fact that a wrong token changes a *visible* surface, not a subtle one |
| **R4** | **Vocabulary drift across eleven tasks** — a token acquires a second meaning by task 8 | The guard of §5.3 catches new values, not misused ones. The handoff's point 2 is what catches misuse, and it is one line per worker |
| **R5** | **`--el-glow` spreads.** A token named for the primary CTA is easier to reach for than a shadow value | The `#ruhe` rule is stated in `conventions.md` §2c beside the token, and `hub-knopf.test.js` already guards the hub's instance |
| **R6** | **Planner context exhaustion** — H9 | §6. Handoffs, not diffs. If the planner reads one diff, the sequential split has bought nothing |
| **R7** | **A retune is requested mid-round** (decision block Q1 answered (b) later) | A retune after the freeze is one token-table edit plus one re-capture and one owner comparison across the migrated screens — which is the whole point of the system. It is cheap *because* of the freeze, and expensive only if requested before it |
| **R9** | **`dev` moves under the round.** It already has: `aa80bd58` merged `feature/playtest-fixes` after this branch was cut, touching nine `src/` files — including `de.js` and `en.js`. Wording changes alter text length, and text length is layout | The round deliberately **stays on `4f72ba68`** and does not take `dev` mid-flight — see §8.2. The merge happens once, at integration, and the baseline is re-verified then rather than eleven times |
| **R8** | **TYPO-03 returns.** 7 px text migrated into `--text-micro` at 28.6 % displacement is an open design question handed to this round | Not this round's to fix — it is a **type** question, and decision 8 forbids reopening typography. Carried as a backlog input; if a menu's comparison surfaces it, it is classified *New design question*, not *Defect* |

### 8.7 `DeckDetail` leaves the round — and two of my premises were wrong

*Measured by M3, 2026-08-24.*

| | |
| --- | --- |
| **M3-F03** | `DeckDetail` is **unreachable above 1280 px** — 0 entry points at 1280×720 and 1536×791, 4 at 1100×800 |
| **M3-F04** | **H-d in M3's contract was wrong.** `GuideOverlay` does **not** mount `DeckDetail`. The shared component is `GuideBody`, and it flows the other way |
| **M3-F05** | **TYPO-09's premise does not hold** for the same reason — the survey's `guide` cell lands on `GuideOverlay`, so `DeckDetail`'s 20 size utilities were never "reachable only through the guide" |

**Ruling: `DeckDetail` is out of this round.** It is not a desktop menu — above 1280 px a player
cannot get to it. Migrating it would mean **moving the phone to make a guard green**, which is owner
decision 9's non-goal stated exactly backwards. M3 counted and ratcheted it instead of migrating it,
which was right.

**Two corrections to §3.1**, and both are mine:

- M3 is **not** a shared-component owner. I wrote that into its contract from an import graph I read
  too quickly — `GuideOverlay` importing `DeckDetail` is not `GuideOverlay` mounting it.
- **M5's inheritance is `GuideBody`, not `DeckDetail`**, and it flows the other way. M5's contract
  must say so.

**The general lesson, because I have now made the same class of error twice** — once naming six guards
where two applied, once naming a mount point that does not mount: *an import is not a render, and a
filename is not an assertion.* A planner's inventory is a hypothesis until a worker measures it.

### 8.16 The number could not see it; the picture could

*M9, 2026-08-25 — and this is the clearest case the round has produced for why a person still looks.*

The first-start title began to glow white. `ty-display` lays **three `text-shadow` in
`currentColor`** beneath it — invisible for as long as the text was transparent. M9's colour change
switched them on.

**The measurement reported `filter: none` throughout.** The survey compares computed values on four
surface axes; a shadow inherited through `currentColor` from a class the screen did not touch is not
one of them. The gate was green and the screen was wrong.

Two more from the same task, both found the same way:

- A rule meant to hide the feedback card **failed twice** — the CRT rule is more specific — and the
  first attempt *looked* successful because the background was already transparent. **A change that
  cannot be distinguished from its own no-op is not a change that has been verified.**
- The locked state of the run reference was **entirely unguarded**: M9 removed it as a test and the
  whole suite stayed green.

**This is why the owner-facing half of the comparison was not cut to zero when it was shrunk** (§5.2).
The machine half proves that nothing moved where nothing should. It cannot prove that what moved is
right, and it cannot see an axis it does not measure.

### 8.17 A guard that goes red because the work succeeded

M9's `#ueberzug` guard counted literals and fell below its threshold when an overlay moved to
`--sf-scrim-desk`. **It went red because the vocabulary was applied correctly.**

Left as it was, it would have punished every future migration — a guard that fires on progress
teaches workers to route around it. Rewritten to the invariant it now also catches the **sanctioned
re-point** it previously could not see: **stricter than before, not looser.**

That is what *"rewrite to the invariant, never the mechanism"* was always meant to produce, and this
is the first time a worker has demonstrated the outcome rather than merely complied with the
instruction. **A correct rewrite makes a guard stronger. If yours got weaker, you rewrote the
threshold instead of the invariant.**

### 8.14 What MH2 retired — three rules leave the contracts

*2026-08-25. This is the first time this round has been able to delete a rule rather than add one,
and it is worth as much as the fix that allowed it.*

| Rule | Carried since | Why it goes |
| --- | --- | --- |
| *"Both halves of a comparison on the same side of a week boundary — re-take rather than explain"* | **MENU-30, every contract since M2a** | `freezeClockSource()` pins `Date.now()` and `new Date()` in every run. The hazard cannot occur |
| **TYPO-08's row-count pre-registration** | inherited from `#typo` | the leaderboard answers from a fixed twenty-row table. The count cannot move |
| **H-c — `leaderboard` and `victory` as not-comparable** | M1's contract | both now return **0 unmatched nodes** between two runs |

**What replaced them is smaller than what they were.** The clock, the network and the row count were
three separate instructions a worker had to hold while reading a delta. They are now one line in the
harness, and a delta on those surfaces means what it says.

**Not retired, and stated so it is not assumed away:** the accumulated run count (§8.12) still varies
between cells and is now *recorded* per cell rather than reasoned about. And the gate still captures
surfaces, not control states — that label stays.

**One surface did move, and MH2 named it correctly.** `leaderboard`, 710 deltas, exactly 71 in each
of ten cells: the fixed table replacing the live one. Structure, not noise. That surface was already
*not comparable*; it is now reproducible for the first time. **A gain, not a price** — and the
distinction matters, because a worker reading the delta list without it would file 710 findings.

### 8.15 The declared deviation, ratified

MH2's bundle check lives in `scripts/survey-bundle.mjs` rather than inside `viewport-survey.mjs`,
because **the survey starts a browser on import** — a guard cannot load the file it wants to guard.

**Ratified, and the underlying fact is the more useful half:** a module that performs work at import
time cannot be tested, and this one does. That is not MH2's to fix and it is not a defect this round
created, but the next task that has reason to touch the survey's shape should know why the check sits
beside it rather than inside it.

MH2 learned this mid-task, at cost, and wrote it down instead of moving the file quietly. **A
deviation that is declared with its reason is a decision; the same deviation undeclared is a thing
the next reader has to re-derive.**

### 8.12 The survey's cells are not independent — and it is fine, once written down

*M7-F01, corrected by recounting rather than left as first written.*

**Run history accumulates across the survey's cells**: 0 runs in the first, 9 in the last, because
every `victory` cell writes one and nothing clears it. Four surfaces read that history —
`stats`, `feedback`, `leaderboard`, `victory`.

**It is comparable, for a measured reason.** M7 ran two independent full surveys and got congruent
results, so the accumulation is deterministic and cancels between the halves of a comparison.

**It must still be written down, because it presents exactly as a regression.** Same class as the wall
clock and the stale bundle: a real effect that looks like a defect. Required of the next harness task —
**record the accumulated run count per cell in `matrix.json`**, so a comparison can subtract a known
state difference instead of guessing at one.

**Every contract from here:** a task with a state-dependent surface seeds the profile, **says what it
seeded**, and treats a delta there as not-comparable until the seed is shown to match.

### 8.13 The fourth instance of one shape, and it is worth naming as a class

| # | Where | The check asked | It should have asked |
| --- | --- | --- | --- |
| 1 | `typo-tokens` (TYPO-12) | is there a `text-[Npx]`? | is there any size other than a role? |
| 2 | `--el-glow` (MENU-15, MENU-29) | is a `var()` present? | is the value resolvable *here*? |
| 3 | `viewport-survey` (M3-F09) | does something answer on 5181? | does it serve the bundle I just built? |
| 4 | handover captures (M7) | is there a `.png`? | is it a PNG? |

**Twelve of M7's handover images were base64 text wearing `.png` names**, found by a person opening
one. Four instances, four different layers — a guard, a token, a harness, an artifact — and one shape:

> **A check that asks whether something is present will eventually pass on the wrong thing. Ask
> whether it is the right thing.**

This is §5.3's guard rule generalised past guards. It belongs in every contract's hazard list, and it
is the cheapest sentence in this report.

### 8.11 §3.1 was an import graph, not a render graph — the fourth correction

*Measured 2026-08-24, preparing M7.*

`StatsScreen.jsx` does **not** render `RunStats`. The only occurrence of that name in the file is
**a comment** (`StatsScreen.jsx:23`). §3.1's claim that "M4 owns `RunStats`, `RunGraphs`, which
`StatsScreen` (M7) and `GlobalLeaderboard` (M8) also render" was built on that comment.

`AGENTS.md` — *Hazard: source-text ratchet tests* warns that guards "have historically matched their
own explanatory comments". **I did it to my own inventory**, and it is the fourth of the same class:

| # | Claim | Measured |
| --- | --- | --- |
| 1 | Six `*-ruhe` guards assert `!important` | Two — inferred from a shared filename suffix |
| 2 | `GuideOverlay` mounts `DeckDetail` | It does not; `GuideBody` flows the other way |
| 3 | The guide is a free-standing screen | It is a page inside the upgrade tree |
| 4 | `StatsScreen` renders `RunStats` | A comment |

**The rule, stated once and applied from here on:**

> **A task's file surface is derived from the render graph, by grep for `<Component`, and never from
> the import graph or from prose.** An import is not a render; a comment is not a render; a filename
> is not an assertion.

**What it changes for M7.** Its real surface is `StatsScreen` · `RunDetail` · `RunStats` ·
`RunGraphs` · `Sparkline` — **≈1216 lines, not the 475 §3.1 promised** — because
`StatsScreen.jsx:319` renders `RunDetail`, and the design document says `RunDetail` is part of its
commission. M7 therefore becomes the owner of that shared subtree and **M4 inherits it**, inverting
what §4.2 assumed.

**And it puts M7 in contact with the battle session**, which no menu task has been before:
`Sparkline` is rendered by `StatusRail.jsx:133` — the run stage — and `CardGrid`, a battle component,
is mounted *inside* `RunDetail`. M7 converts the first value-preservingly, does not touch the second,
and proves it with `run-stage` at zero deltas.

### 8.10 The guide is not a screen — it is a page inside the upgrade tree

*Measured 2026-08-24, from the machine half M3 could not produce.*

`viewport-survey.mjs:105` reaches the guide as `{ tile: 0 } → { .up-navrow, nth: 1 } →
{ .up-page-guide }`. It wears the upgrade screen's head, root and navigation column, so M3's changes
reached it by construction: **2410 deltas, and 160 unmatched nodes before against 160 after — exactly
balanced**, which is reordering rather than loss.

**§3.1 listed "Guide · `GuideOverlay.jsx` · 346 lines" as a free-standing screen. It is not.** M5's
scope shrinks to the guide's *content* — `GuideOverlay`, marker `.gd-desk` — because its *frame* is
`.up-*` and is already done.

This is the third premise of mine a worker has corrected by measuring, after the guard membership and
the `DeckDetail` mount point. All three were inventory read from imports and filenames. **The pattern
is stable enough to state as a rule: a planner's screen list is a hypothesis about what renders, and
only the survey knows what renders.**

### 8.8 A design document's observations hold; its predictions do not

Two design documents have now been handed to a worker, and both failed the same way and only that way.

| Document | Observations | Predictions |
| --- | --- | --- |
| `optionen-redesign.md` | sound | the dead space was ~91 px, not ~350 — measured in a preview build where two `VITE_PREVIEW` rows were visible that players never see |
| `upgrade-baum-redesign.md` | **confirmed, several to the decimal** | height arithmetic stale in all three terms; `.up-branch` does not render at ≥1280 px at all; "the head costs no height" is wrong by **+24.2 px** |

**M3's verdict is the precise one and worth quoting: *nothing it recommended was wrong in sign.*** The
designs are right about what is wrong and right about what to do. They are optimistic about what it
will cost.

**Therefore, in every contract from here:**

> **Re-measure a design document's numbers in a `main` build before building against them. Its
> observations may be taken; its predictions may not.**

A worker that finds a stale figure files it as a finding and an owner question — never a silent
adjustment, and never a reason to doubt the design's direction.

### 8.9 A third way for the harness to be silently wrong

M3-F09. `viewport-survey.mjs` checks whether *something* answers on 5181 and **reuses it**. A stale
preview server therefore serves an abandoned bundle, and the survey measures it without a word.

That is the same shape MH1 fixed for truncation and the same shape MENU-52 had inside a guard: **the
check asks whether something is there, never whether it is the right thing.** Third instance, and the
rule from §5.3 covers it exactly.

**Required of the next task that touches the harness:** the survey proves it is talking to the bundle
it just built — compare the served asset hash against `dist/`, or start its own server and refuse an
inherited one. Reusing a server is a convenience; reusing it unverified is a silent wrong answer.

*The stale servers themselves were cleared by the planner after handoff (PID 23076 on 5181), and the
survey re-run to produce the proof M3 could not.*

### 8.4 Harness debt — three items, and the one that matters

*Raised by M2b, 2026-08-24. None is a screen's to fix; all three belong to the planner.*

| # | What | Consequence if left |
| --- | --- | --- |
| **1** | **The survey has a surface axis and no state axis** (MENU-56). **Owner decision, 2026-08-24: not built.** Its payoff lands in the design rework, which will know which states carry a decision; guessing them now means touching it twice. The fix is to **label the blind spot** — *surfaces only, control states verified by hand* — where a reader of the output sees it. A gate that names what it does not cover is honest; one that does not feigns coverage | Handled by labelling, and carried to the design rework as a named input |
| **2** | **`surface-delta.mjs` truncates** (MENU-55). It prints 200 of 410. Read as complete, the output looked like *"deltas only in German, a hole at 1920×1080"* — a finding that was not there. M2b caught it by re-aggregating | The next worker writes that finding down. A tool that silently truncates a comparison manufactures false findings, and they are expensive precisely because they look measured |
| **3** | **MENU-38's ratchet was ruled at the freeze and never built** — and the family has an **eighth** alpha the ruling did not know about (MENU-44) | The planner's own ruling, unexecuted. M2b's region needed it zero times, so nothing broke; the next region may not be so lucky |

**Item 3 is mine and I state it plainly:** I wrote the ruling into §2c and did not put it into a
contract's *Definition of done*. A ruling that lands only in a conventions file is a ruling nobody is
tasked with. That is the same failure mode as a finding that lives only in a chat message, one level
up.

**All three are handled by a harness task before M3** — `task-contract-MH1-harness.md`. Not folded
into M3: a screen task that also rebuilds the instrument it is measured by has two variables, and the
one that fails is not identifiable.

### 8.6 Handed to the mobile strand — `phone-proof.mjs` truncates silently

MH1-06. `scripts/phone-proof.mjs:481` has the defect MH1 fixed in `surface-delta.mjs`: it caps its
output without saying so. **One line, and it belongs to another strand** — MH1 read it, did not touch
it, and reported it rather than repairing it quietly outside its file surface. That was the right
call, and it is why this entry exists instead of an unexplained diff.

The reason it is worth carrying rather than dropping: MH1-02 showed that a silent cut over a **sorted**
set does not blur a finding, it manufactures a specific one. `phone-proof.mjs` sorts too.

*Backlog, with an ID. Not this round's to fix.*

### 8.5 The noise floor is measured, and it is zero

MENU-58, and it is quietly the most useful measurement of the round: **the same tree captured twice,
0 deltas across 160 cells.** The harness has no scatter.

That converts every comparison in this round from *"these deltas are probably the change"* to *"these
deltas are the change"*. Without it, a worker facing 410 deltas has no way to say how many are noise,
and the honest answer would have been "unknown". Re-take it if the harness or the machine changes.

### 8.1 Inherited findings — inputs, not new defects

From `docs/workstreams/typography-system/v4-classification.md`, handed to this round explicitly:

| ID | What arrives here |
| --- | --- |
| **TYPO-03** | 7 px → 9 px, 28.6 % worst-case displacement. Should the micro band keep a step below 9? See R8 |
| **TYPO-04** | Overflow at 1280×720 grew by ~28 nodes (de 402→430, en 401→426); truncation +1/+4. Accepted by the owner; **this round's input list** |
| **TYPO-05** | Large pre-existing overflow — **147 nodes on the end screen, 157–170 on the glossary, at every viewport, before any typography change** |
| **TYPO-07** | `ArchitectScreen` has no root class. Cheap to fix in any task that edits the file — M1 does not; noted for the battle session |
| **TYPO-09** | 168 size utilities on screens the survey cannot reach carry no machine check. `DeckDetail` (20) and `BuildSummary` (19) are the largest |

**TYPO-04 and TYPO-05 are the two that bind.** The end screen (M4) and the glossary (M6) arrive with
147 and 157–170 overflowing nodes that predate everything. A worker on either must be told this before
it starts, or it will spend its round chasing a condition it did not cause — both contracts carry the
figure.


### 8.3 State dependencies — the list H-c should have carried

*Measured by M1, 2026-08-24.* The pilot's contract named two surfaces whose node set moves without any
code changing: `leaderboard` (network data) and `victory` (run outcome). **The real list is five, and
the fifth is the one that bites every worker.**

| Surface | What moves it |
| --- | --- |
| `leaderboard` | network data — row count varies between runs (TYPO-08) |
| `victory` | run outcome — `"★ Neuer Rekord"` appears or does not (TYPO-11) |
| `stats` | accumulated run history |
| `feedback` | accumulated run history |
| **every surface** | **the wall clock** — see below |

**The clock, and why it is the dangerous one.** The hub's ranked-board label reads the ISO week. M1's
session crossed midnight into Monday; the label went `"Week 34"` → `"Week 35"`, and `"5"` is 1.09 px
wider than `"4"` in Orbitron. Because **the hub renders behind every overlay**, that single `<span>`
produced **72 box deltas across 37 cells and 10 surfaces** — in one run, 180 in another. Zero code
changed.

A worker who sees ten surfaces light up at once will read it as a regression it caused, and will spend
a session proving otherwise. **Every contract from M2a on carries this table**, and the rule that goes
with it:

> Take both halves of a comparison on the same side of a week boundary. If a run straddles one, the
> box deltas on `0/0/2/0/5/0/4/0/1/0:SPAN` are the clock, not the diff — re-take rather than explain.

*This is a correction to H-c as the pilot's contract stated it, not a new defect. MENU-30.*

### 8.2 Why the round does not take `dev` mid-flight

*Measured 2026-08-23, after this branch was cut:* `dev` moved from `4f72ba68` to `aa80bd58`, merging
`feature/playtest-fixes` — nine `src/` files, 98 insertions. **No `index.css`, no menu component**, so
nothing this round rewrites. But `src/i18n/de.js` and `src/i18n/en.js` are among them, and a wording
change is a text-length change, which is a layout change.

**The decision: the round stays on `4f72ba68` until integration.** Two reasons, and the second is the
one that decides it:

1. **It matches the owner's model.** One worktree, eleven sequential tasks, *"wenn alle durch sind
   integrierst du alles"* — the round runs on its own base and merges once at the end.
2. **Taking `dev` now would void the inherited baseline.** §0.4 accepted the `#typo` capture set
   because every `src/` change since it was gated below 640 px. The i18n edits are not: they are
   visible at every viewport. Merging them in means M1 opens with a full 210-cell capture run — the
   one thing §6.4 point 5 of the predecessor's report exists to save.

**What this costs, stated rather than hidden.** By integration there will be more drift than this, and
it lands in one merge instead of eleven small ones. That is the trade: eleven cheap tasks and one
merge that has to be measured, against eleven tasks that each re-baseline. Given the tasks touch
disjoint screen files and `dev`'s traffic is not in `index.css`, the first is the better bet — but it
is a bet, and the integration step must re-verify rather than assume.

**M1 does not need to do anything about this.** Its baseline validity check
(`git diff --stat dab335a9..HEAD -- src/`) is against its own `HEAD`, which is this branch, where the
check still passes. The check is what would catch it if someone did merge `dev` in first.

---

## Appendix — reproduce the measurements

```bash
# §0.1 — surfaces the survey reaches
grep -c '{ id: "' scripts/viewport-survey.mjs

# §0.2 — H8: does the open branch touch src/ ?
git diff --stat dev...task/icon-position-review -- src/

# §0.3 — ratchet exposure
grep -rl "index.css" test/ | wc -l
for f in $(grep -rl "index.css" test/); do
  h=$(grep -ciE "box-shadow|boxShadow|border-radius|rounded|padding|background" $f)
  [ "$h" -gt 0 ] && echo "$(basename $f) $h"
done | sort -k2 -rn

# §0.4 — baseline validity: what changed since the capture commit
git diff --stat dab335a9..dev -- src/
git diff dab335a9..dev -- src/index.css | grep -E "^\+" | grep -E "@media|min-width|max-width"

# §1.2 — the two constant families, and their disjointness
for f in src/ui/*.jsx; do
  echo "$(basename $f): $(grep -oE '\b(MODAL_CARD|STICKY_HEAD_BG|phaseCard|phasePanel|PHASE_ACCENTS|PANEL_BG)\b' $f | sort -u | tr '\n' ' ')"
done | grep -v ": $"

# §1.3 — the surface inventory
for p in box-shadow padding border-radius background border; do
  d=$(grep -oE "(^|[;{[:space:]])$p[a-z-]*:[^;]*" src/index.css | wc -l)
  u=$(grep -oE "(^|[;{[:space:]])$p[a-z-]*:[^;]*" src/index.css | sed 's/^[;[:space:]]*//' | sort -u | wc -l)
  echo "$p decls=$d distinct=$u"
done

# §1.2 — the half-built language
grep -rhoE "\bas-(ring|edge|panel)[a-z-]*" src --include=*.jsx | sort | uniq -c | sort -rn
```

**§2.1 — the inline-style probe.** Save as `probe.html`, open it, and read the three values from the
console. A is today's state, B is the proposal, C is the proposal where H5 lives.

```html
<!doctype html><meta charset="utf-8">
<style>
  :root { --sf-head: rgb(27, 26, 36); }
  #a { background: rgb(0, 255, 0); }                 /* A: loses to the inline literal   */
  #b { --sf-head: rgb(0, 255, 0); }                  /* B: steers the inline var()       */
  html[data-vp="1280"] #c { --sf-head: rgb(0,0,255); } /* C: same, but conditional       */
</style>
<div id="a" style="background: rgb(27, 26, 36)">A</div>
<div id="b" style="background: var(--sf-head)">B</div>
<div id="c" style="background: var(--sf-head)">C</div>
<script>
  const bg = (id) => getComputedStyle(document.getElementById(id)).backgroundColor;
  console.log("A", bg("a"), "expect rgb(27, 26, 36)");   // inline literal wins
  console.log("B", bg("b"), "expect rgb(0, 255, 0)");    // stylesheet steers the variable
  console.log("C before", bg("c"), "expect rgb(27, 26, 36)");
  document.documentElement.setAttribute("data-vp", "1280");
  console.log("C after ", bg("c"), "expect rgb(0, 0, 255)");
</script>
```

*A width media query is equivalent to C's gate and is what the real rule uses; the attribute is used
here only so the probe does not depend on the window being a particular size.*
