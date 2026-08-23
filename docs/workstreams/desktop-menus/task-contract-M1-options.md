# Task contract — M1 · Options (the pilot) · `#menu-rework`

**This contract is the binding scope statement.** Where it and
`docs/workstreams/desktop-menus/planning-report.md` disagree, this contract wins
(`docs/engineering/task-lifecycle.md` §6).

---

## Identity

| | |
| --- | --- |
| **Task** | `M1` — the pilot of the desktop menu rework |
| **Branch** | `task/menu-m1-options` |
| **Feature branch** | `feature/desktop-menus` |
| **Base SHA** | the tip of `feature/desktop-menus` at start (the planning commit, on top of `4f72ba68`). Record the actual SHA here |
| **Tier** | C — `task-lifecycle.md` §5 |
| **Owner stops** | Two: once before implementation, once before integration |
| **Concurrency** | **Exclusive.** No other `#menu-rework` task runs while this one is open. This task defines the vocabulary every later task consumes |
| **Reviewer** | None requested. `AGENTS.md` — *Independent review* is optional and risk-based |

## Local workspace

**One worktree and one port serve the whole round** — owner decision, planning report §4.3. This is
not the usual one-worktree-per-task flow, and it is safe only because the workers are strictly
sequential.

| | |
| --- | --- |
| **Worktree** | the shared `#menu-rework` worktree. **Created once for the round; do not create another, and do not remove it at the end of this task** |
| **Preview port** | fixed for the round — record it here at start. The owner tests at this URL from M1 to M11 |
| **Server** | `node node_modules/vite/bin/vite.js preview --port <PORT> --strictPort --base /autostich/` |
| **Survey** | `node scripts/viewport-survey.mjs` — the harness already carries the five sizes, both languages and all 15 surfaces |

**`--base` is not optional.** `vite.config.js` applies the deploy base for `build` only, so `preview`
without it serves `dist/` at `/` while `index.html` points at `/autostich/`. Every asset comes back as
the SPA fallback with status 200 and the page merely looks slow.

**Before the first edit** (`AGENTS.md` — *Before you start*, *Session placement*):

1. Confirm the branch is `task/menu-m1-options`, not a previous task's branch. In a shared worktree a
   stale checkout commits into the wrong branch silently.
2. Confirm `git status --short` is **empty**. A dirty tree at handover is a collision to report, not
   to tidy away.

A difference from either is a collision to surface, not to work around.

---

## Scope — two commits, in this order, and they do not merge

### Commit 1 — the mechanism conversion. Zero pixels move.

Convert **every literal value** in `src/ui/modalStyle.jsx` to a `var(--token)` reference, and define
those tokens in the `@theme` block of `src/index.css`.

In scope for commit 1, all of `modalStyle.jsx`:

| Symbol | What is converted |
| --- | --- |
| `MODAL_CARD` | the radial glow, the linear gradient, the border colour |
| `MENU_PANEL` | background, border |
| `PANEL_CARD` | gradient, border (already uses `DECK_BORDER` — leave that as it is) |
| `PANEL_BG` · `STICKY_HEAD_BG` | the two flat fills |
| `HAIRLINE` · `PHASE_HAIRLINE_BG` | the gradient stops |
| `phaseCard(...)` · `phasePanel(...)` | the `base` defaults, the shadow values, the opacity steps |
| `PHASE_ACCENTS` | the six accent colours |
| `ACTIONBTN_BASE` · `ACTIONBTN_KIND` | radius, padding, and the two `k.c` colours |

`DECK_BORDER = "var(--deck-border)"` is **already correct**. It is the worked example this whole
conversion follows — do not change it, and read `index.css:244` to see how it resolves.

**The gate on this commit: zero computed deltas on all 15 survey surfaces, at all five sizes, in both
languages.** Same instrument and same claim as `#typo-system` S1. This is not a formality — it is what
makes it safe for the architect and formation screens to pass through this round untouched by design
(planning report §2.3).

**Also in commit 1:** delete the `!important` at `src/index.css:3060` and the two lines of comment
above it that explain why it was needed. Once `STICKY_HEAD_BG` is `var(--sf-head)`, the 1280 block
sets `--sf-head` on `.cz-stage` and wins without it. Prove the deletion with the same zero-delta run —
`shop-packs` at 1280×720 is the cell that shows it.

### Commit 2 — the pilot's design round. Pixels move here.

`src/ui/OptionsModal.jsx` and its `.op-*` rules in `src/index.css` adopt the vocabulary.

1. **Derive the token values** from the values already in the tree, per the answer to decision-block
   Q1. Cap each axis at its stated step count *before* deriving: 4 surfaces, 4 edges, 5 elevations,
   3 radii, 3 insets. A cap is what makes this a collapse rather than a survey.
2. **Apply them to the options screen.** Every surface, edge, elevation, radius and inset on that
   screen comes from a token.
3. **Complete the role classes** in `index.css`: `.as-panel` retuned onto tokens, `.as-panel-sunken`,
   `.as-card` and `.as-head` added, `.as-ring` and `.as-edge-*` retuned onto tokens with their
   behaviour unchanged.

### Commit 3 — the freeze.

Write **`docs/engineering/conventions.md` §2c** — the same file and the same shape as §2b typography,
for the reason `#typo-system` §6.4 point 1 gives: a planning report records a decision, a conventions
section is an instruction that survives it.

§2c must contain:

- the token table — name, value, intended use, one row per token;
- the role-class table;
- **the rule, worded to match `conventions.md:130` deliberately:**
  *A menu picks a token, or changes a token for everyone. A menu does not introduce a value.*
- the escape hatch and its price: a new **token**, reviewed once by the planner, then available
  everywhere. Never a value at the call site;
- the `#ruhe` rule stated beside `--el-glow`: only the primary CTA glows;
- what is permanently exempt, if commit 2 finds anything that is.

**No other task in this round starts until this commit exists on `feature/desktop-menus`.**

---

## Non-goals, and the tripwire

| Non-goal | Why |
| --- | --- |
| Any menu screen other than Options | One worker per menu — owner decision 7 |
| The **appearance** of the architect, formation or build panels | Their mechanism converts here; their design belongs to the battle session (planning report §2.3) |
| The battle screen and the pick phase | Owner decision 1 — own session |
| Anything below 1280 px | Owner decision 9. `useIsPhone`, the `max-width: 639.98px` block and everything they reach are untouchable |
| **Any type size, any `.ty-*` role, any `--text-*` token** | Owner decision 8. `typo-tokens.test.js` must pass unmodified |
| A new dependency, a new icon or glyph | House rule — the owner is **asked**, not informed |
| Translating the German comments in `src/index.css` | A pure translation diff in a ratchet-guarded file costs a review round and buys nothing |
| Browser zoom / DPI scaling | Owner decision 6 |

### Tripwire 1

> **If this diff introduces a new `box-shadow`, `padding`, `border-radius` or `background` value at
> the call site instead of choosing one from the vocabulary — stop.**

In commit 2 this reads slightly differently than it will for later workers, because commit 2 is where
the vocabulary is *created*: a value that lands **in the token table** is the work; a value that lands
**at a call site in `OptionsModal.jsx`** is the tripwire firing.

### Tripwire 2

> **If a worker after the pilot builds its own panel — stop and report to the planner. Extensions to
> the vocabulary go through the planner, never around the pilot.**

Carried here so the pilot's contract is the canonical copy every later contract is cut from.

---

## Approved architecture — binding, not suggestions

1. **One mechanism: a CSS custom property defined in `index.css`, consumed three ways** — by a
   Tailwind utility, by a stylesheet rule, and by an inline style that emits `var(--token)`.
   `DECK_BORDER` is the existing worked example.
2. **`modalStyle.jsx` keeps its parameterisation and loses its values.** `phaseCard(accent, base,
   {quiet})` stays a function. Do not flatten it into classes — the rejected options and their reasons
   are in planning report §2.1.
3. **Commit 1 is value-preserving by construction.** `"#1b1a24"` becomes `"var(--sf-head)"` where
   `--sf-head: #1b1a24`. If a token's value has to differ from the literal it replaces, that belongs in
   commit 2, not commit 1.
4. **`!important` is not the answer to an inline style.** Redefining the custom property is — this is
   *measured*, three cases, in the planning report §2.1, with a reproducible probe in its appendix.
   Run the probe once before commit 1 if you want to see it work. If a place is found where it does
   **not** work, stop and report — do not add an `!important`.
5. **Five axes, capped before derivation.** Surface 4 · Edge 4 · Elevation 5 · Radius 3 · Inset 3.

---

## Task-specific inputs

| | |
| --- | --- |
| **Viewports** | 1280×720 · 1400×700 · 1536×791 · 1600×900 · 1920×1080 — exactly the set the survey measures |
| **Languages** | `de` and `en`, both. **Tune in German**, verify in English (`AGENTS.md` — *Additional localization gate*) |
| **Baseline** | `docs/workstreams/typography-system/evidence/v2/` — 210 captures, `matrix.json`. **Accepted, verified in planning report §0.4.** Do not retake it unless the check below fails |
| **Baseline validity check** | Before the first edit: `git diff --stat dab335a9..HEAD -- src/`. Read every hunk not inside a `max-width` block. If a desktop-visible surface changed, the baseline is void and this task retakes it |
| **Survey markers** | `options` → `.op-head, .as-ring-run` |
| **Inherited** | TYPO-04: overflow at 1280×720 grew by ~28 nodes across the tree. Options is not one of the heavy screens, but the figure is the round's input list, not a defect to chase |

---

## Acceptance gate

> **Commit 1 produces zero computed deltas on all 15 survey surfaces, at all five sizes, in both
> languages — and after commit 3, `conventions.md` §2c states the vocabulary completely enough that
> the M2a worker needs nothing from the planner to start.**

The second half is the one that decides whether this round works. It is testable before M2a starts:
hand §2c to a reader who has not seen this contract and ask them what token an inset panel on the
workshop's sticky head should use. If they cannot answer from §2c alone, §2c is not finished.

---

## Expected file surface

Indicative. Anything outside it is recorded and reported before it is changed — not blocked on an
owner answer unless the departure is itself a scope change.

| File | Commit |
| --- | --- |
| `src/ui/modalStyle.jsx` | 1 |
| `src/index.css` — `@theme` block, `.as-*` rules, the `:3060` `!important` | 1, 2 |
| `src/ui/OptionsModal.jsx` | 2 |
| `docs/engineering/conventions.md` | 3 |
| `test/panel-tokens.test.js` *(new)* | 2 |
| `test/{go,st,up,rd,lv,cz}-ruhe.test.js` | 1 |
| `docs/workstreams/desktop-menus/evidence/**` | all |
| `docs/workstreams/desktop-menus/measurements/M1.md` | 1, 2 |

**Must not change:** `src/ui/StartScreen.jsx`, any battle or pick-phase component, anything inside
`@media (max-width: …)`, `test/typo-tokens.test.js`, and every `--text-*` token. Scope compliance on
these is provable by blob hash.

---

## Known hazards — each resolved before handoff (`task-lifecycle.md` §10)

| # | Hazard | Resolution required |
| --- | --- | --- |
| **H-a** | **The six `*-ruhe` guards assert that `!important` is present** *because* the constant is inline — `go`, `st`, `up`, `rd`, `lv`, `cz`. Commit 1 makes that assertion false while making the invariant behind it stronger | Rewrite each to assert **the invariant** (the flat variant's value wins at the element), not the mechanism. **Counter-check each**: remove the override, prove the guard fails. **If a guard cannot be made to pass, stop and report — do not relax it** |
| **H-b** | **The new guard covers half the ways to write a value.** This is TYPO-12, already paid for once | `panel-tokens.test.js` covers literals in CSS *and* JSX, `#rrggbb`/`rgba(`, arbitrary utilities *and* the named Tailwind scale. Four counter-checks, one per axis, recorded |
| **H-c** | **The zero-delta run is not actually zero** on `leaderboard` or `victory` | Known and pre-registered: TYPO-08 (leaderboard row count varies with network data) and TYPO-11 (the victory screen's node set depends on run outcome). Match nodes by path; treat an absent path as not-comparable. Any *other* deviation is a real one |
| **H-d** | **A token value has to differ from the literal it replaces** during commit 1 | It does not go in commit 1. Move it to commit 2 and say so in the handoff. Commit 1 is value-preserving or it is not commit 1 |
| **H-e** | **The vocabulary is derived against a 362-line modal** and will not fit the workshop | Not resolvable here — this is the reason M2a runs second and holds the one extension window (planning report §4.1). Resolution for *this* task: cap each axis before deriving, and do not add a token because Options happens to want one |

---

## Definition of done

Ticked only when true.

- [ ] Branch confirmed as `task/menu-m1-options`, and `git status --short` empty, **before** the first
      edit
- [ ] Preview port recorded in *Local workspace* above, and the server verified with `--base`
- [ ] Baseline validity check run; the `#typo` capture set either accepted or retaken, and which one recorded
- [ ] Commit 1 — every literal in `modalStyle.jsx` is a `var()` reference
- [ ] Commit 1 — the `index.css:3060` `!important` deleted, and its comment with it
- [ ] Commit 1 — **zero computed deltas**, 15 surfaces × 5 sizes × 2 languages, evidence committed
- [ ] Commit 1 — six `*-ruhe` guards rewritten to the invariant, each counter-checked
- [ ] Commit 2 — token values derived, each axis at or under its cap
- [ ] Commit 2 — Options takes every surface, edge, elevation, radius and inset from a token
- [ ] Commit 2 — `.as-panel-sunken`, `.as-card`, `.as-head` added; `.as-panel`, `.as-ring`,
      `.as-edge-*` retuned with behaviour unchanged
- [ ] Commit 2 — `panel-tokens.test.js` added, four counter-checks recorded
- [ ] Measurement deliverable written — `docs/workstreams/desktop-menus/measurements/M1.md`, all four
      parts of planning report §5.2: baseline named, zero-delta result, before/after comparison,
      findings table with an ID per row
- [ ] The comparison put in front of the **owner** at the End stop. An agent does not report it as
      approved
- [ ] Commit 3 — `conventions.md` §2c written, and the reader test in the acceptance gate applied
- [ ] Four gates green
- [ ] `typo-tokens.test.js` passes **unmodified**
- [ ] Handoff written — the seven points of planning report §6, fifteen lines or fewer
- [ ] Every hazard above resolved, or recorded as a downgrade with a reason (`task-lifecycle.md` §10)
- [ ] **Working tree clean at handover**, and the worktree left in place for M2a
- [ ] **Not done here:** no merge into `feature/desktop-menus`, no push of a permanent branch, no PR.
      The planner integrates all eleven task branches once, at the end of the round (§4.3)
