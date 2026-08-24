# Task contract — M2a · Workshop shell · `#menu-rework`

**This contract is the binding scope statement.** Where it and
`docs/workstreams/desktop-menus/planning-report.md` disagree, this contract wins
(`docs/engineering/task-lifecycle.md` §6).

**You are the stress test.** The vocabulary was frozen against a 362-line modal. You are 2128 lines
with a sticky head, an `!important` block and 60 inline backgrounds. Planning report §4.1 puts you
second on purpose: **you hold the round's one extension window, and it shuts behind you.**

---

## Identity

| | |
| --- | --- |
| **Task** | `M2a` — the workshop's shell |
| **Branch** | `task/menu-m2a-workshop-shell` — create it yourself: `git switch -c task/menu-m2a-workshop-shell` |
| **Feature branch** | `feature/desktop-menus` |
| **Base SHA** | the tip of `feature/desktop-menus` at start — the M1 merge plus the freeze ruling. Record the actual SHA here |
| **Tier** | C — `task-lifecycle.md` §5 |
| **Owner stops** | Two: once before implementation, once before integration |
| **Concurrency** | **Exclusive.** No other `#menu-rework` task runs while this one is open |
| **Reviewer** | None requested |

## Local workspace

**One worktree and one port serve the whole round** — planning report §4.3. The worktree arrives on
`feature/desktop-menus`; you branch inside it and leave it in place for M2b.

| | |
| --- | --- |
| **Worktree** | `C:/Code/Autostich-worktrees/menu-rework` |
| **Preview port** | **5189** — `http://localhost:5189/autostich/`, where the owner tests |
| **Survey port** | **5181**, hardcoded in `scripts/viewport-survey.mjs:54` with `--strictPort`. Not the same port, not a mistake. A third process on 5181 breaks the run loudly — check before a long capture, not after |
| **Server** | `node node_modules/vite/bin/vite.js preview --port 5189 --strictPort --base /autostich/` |

`--base` is not optional: `vite.config.js` applies the deploy base for `build` only. Without it every
asset returns the SPA fallback with status 200 and the page merely looks slow.

**Before the first edit** (`AGENTS.md` — *Before you start*, *Session placement*): confirm the branch
is yours, and that `git status --short` is empty. In a shared worktree a stale checkout commits into
the wrong branch silently. A difference is a collision to surface, not to work around.

### The tree was green at handover

*Measured on the M1 merge, in this worktree:* `npm test` 142 files / 2191 tests · `npm run lint --
--max-warnings=0` · `npm run build` · `npm run gen:db` — all exit 0. **A red gate from here is
something M2a caused.**

---

## Scope

`src/ui/CustomizeScreen.jsx` — **the shell only**: `.cz-stage`, `.cz-card`, `.cz-main`, `.cz-scroll`,
the sticky head, and the `.cz-*` rules in `src/index.css` that dress them. The pack cards, the fx
panels and the detail card are **M2b** and are not yours.

Take every surface, edge, elevation, radius and inset in that shell from `conventions.md` §2c.

### The `!important` is already gone — verify, do not re-solve

M1 deleted `src/index.css:3060` and its comment. `STICKY_HEAD_BG` is a `var()` now, so the 1280 block
sets `--sf-head` on `.cz-stage` and wins without it. **Your job is to confirm it still holds after
your changes**, not to rebuild the fix. `shop-packs` at 1280×720 is the cell that shows it.

If you find a place where redefining the custom property does **not** work: stop and report. Do not
add an `!important`.

---

## The extension window — yours, and only yours

The vocabulary is frozen (`conventions.md` §2c, *The planner's ruling at the freeze*). You may file
**exactly one extension request**, through the planner, before M2b starts. After that the vocabulary
is closed for the rest of the round.

An extension **adds** a token. It never changes the value of a token another screen already consumes —
that would silently move Options, which is already reviewed.

**What is not an extension:** re-pointing a step on your own root, to another named token. That is
sanctioned and needs nobody:

```css
.cz-stage { --sf-head: var(--sf-head-fade); background: var(--sf-head); }
```

**Use the window if you need it.** Discovering at task 9 that the vocabulary was short is the failure
this ordering exists to prevent. A window unused because nothing was missing is the result we want; a
window unused because you worked around a gap is the one that costs the round.

---

## Non-goals, and the tripwires

| Non-goal | Why |
| --- | --- |
| The workshop's contents — pack cards, fx panels, detail card | M2b |
| Any other menu screen | One worker per menu |
| The **appearance** of architect, formation, build panels | Their mechanism converted in M1; their design belongs to the battle session |
| Battle screen and pick phase | Owner decision 1 — own session |
| Anything below 1280 px | Owner decision 9 |
| Any type size, `.ty-*` role or `--text-*` token | Owner decision 8. `typo-tokens.test.js` passes unmodified |
| A new dependency, icon or glyph | House rule — the owner is **asked** |
| Translating the German comments in `src/index.css` | A translation-only diff in a ratchet-guarded file costs a review round and buys nothing |

### Tripwire 1

> **If this diff introduces a new `box-shadow`, `padding`, `border-radius` or `background` value at
> the call site instead of choosing one from the vocabulary — stop.**

### Tripwire 2

> **If you build your own panel — stop and report to the planner. Extensions go through the planner,
> never around the pilot.**

You hold the window, so for you tripwire 2 reads: *propose it, do not take it.* M1 proposed two and
took neither; both were ratified. That is the shape.

---

## Approved architecture — binding

1. **One mechanism.** A custom property in `index.css`, consumed three ways: utility, stylesheet rule,
   and an inline style that emits `var(--token)`.
2. **`!important` is not the answer to an inline style.** Redefining the property is.
3. **Every length takes `var(--ui-scale, 1)`.** Colours, opacities and percentages do not. `--text-*`
   is the one exception and stays out. `--ui-scale` is a **reserved hook** — no screen sets it.
4. **The annex is closed.** *Outside the ladder* is a complete list. Something not on it is an
   extension request, not a free addition.

---

## Task-specific inputs

| | |
| --- | --- |
| **Viewports** | 1280×720 · 1400×700 · 1536×791 · 1600×900 · 1920×1080 |
| **Languages** | `de` and `en`. **Tune in German**, verify in English (`AGENTS.md` — *Additional localization gate*) |
| **Baseline** | M1's post-change capture set, in `docs/workstreams/desktop-menus/evidence/`. Named, not re-derived |
| **Survey markers** | `shop-packs` → `.cz-card, .cz-main` |

### State dependencies — read this before you diff a comparison

Five things move a capture without any code changing. Four are surfaces; the fifth is every surface.

| Surface | What moves it |
| --- | --- |
| `leaderboard` | network data — row count varies (TYPO-08) |
| `victory` | run outcome — `"★ Neuer Rekord"` appears or does not (TYPO-11) |
| `stats` · `feedback` | accumulated run history |
| **every surface** | **the wall clock** |

**The clock is the one that will fool you.** The hub's ranked-board label reads the ISO week, and the
hub renders **behind every overlay**. M1's session crossed midnight into Monday: `"Week 34"` →
`"Week 35"`, `"5"` is 1.09 px wider than `"4"` in Orbitron, and that one `<span>` produced **72 box
deltas across 37 cells and 10 surfaces**. Zero code.

> Take both halves of a comparison on the same side of a week boundary. If a run straddles one, the
> box deltas on `0/0/2/0/5/0/4/0/1/0:SPAN` are the clock, not your diff — **re-take rather than
> explain.**

Match nodes by path; treat an absent path as not-comparable. Any deviation that is *not* on this list
is real.

---

## Acceptance gate

> **Every surface, edge, elevation, radius and inset in the workshop shell comes from §2c — and the
> extension window closes with a written answer: either "nothing was missing", or one named token,
> ratified by the planner and added to §2c before M2b starts.**

---

## Expected file surface

| File | |
| --- | --- |
| `src/ui/CustomizeScreen.jsx` | shell only |
| `src/index.css` | the `.cz-*` shell rules; `@theme` **only** if an extension is ratified |
| `test/cz-ruhe.test.js` | if the conversion touches what it asserts |
| `test/panel-tokens.test.js` | allowlist entry, **and the ink ratchet** — see below |
| `docs/workstreams/desktop-menus/measurements/M2a.md` | |
| `docs/workstreams/desktop-menus/evidence/**` | |
| `docs/engineering/conventions.md` | only to record a ratified extension |

**Must not change:** `src/ui/OptionsModal.jsx`, `src/ui/StartScreen.jsx`, any battle or pick-phase
component, anything inside `@media (max-width: …)`, `test/typo-tokens.test.js`, every `--text-*`
token, and the value of any token M1 already shipped.

---

## Known hazards — each resolved before handoff (`task-lifecycle.md` §10)

| # | Hazard | Resolution required |
| --- | --- | --- |
| **H-a** | **The guard membership in the planning report was wrong once already.** It named six `*-ruhe` guards; two applied, and one it never named (`fx-panel`) did | **Measure which guards your diff actually breaks. Do not infer from a filename.** `cz-ruhe` is the likely one, but read its assertions before assuming. Rewrite to the **invariant**, never the mechanism, and counter-check each: remove the override, prove the guard fails |
| **H-b** | **A guard that covers half the ways to write a value will be wrong.** TYPO-12, then MENU-15, then MENU-29 — three times in this repository | Your allowlist entry covers literals in CSS *and* JSX, `#rrggbb`/`rgba(`, arbitrary utilities *and* the named Tailwind scale |
| **H-c** | **A composite `:root` token cannot read a per-element variable.** MENU-29: M1 shipped this bug *in the same task that wrote the rule against it into §2c*, and only the zero-delta gate caught it | Read §2c — *A token only sees what is present where it is declared* — **before** you write a token, not after. If a token must vary per element, it decomposes into scalars |
| **H-d** | **The comparison straddles a week boundary** | See *State dependencies*. Re-take, do not explain |
| **H-e** | **The window is used to paper over a gap instead of naming one** | An extension is a token added to §2c with a reason. A value at a call site is tripwire 1, whatever it is called |

---

## Definition of done

- [ ] Branch confirmed as yours, `git status --short` empty, before the first edit
- [ ] Every shell surface, edge, elevation, radius and inset comes from §2c
- [ ] The `.cz-stage` head still wins without `!important` — verified at `shop-packs` 1280×720
- [ ] **The extension window answered in writing** — "nothing was missing", or one token, ratified,
      in §2c, before M2b starts
- [ ] **The ink ratchet added to `panel-tokens.test.js`** — counts ink literals per migrated file,
      fails on growth. The planner's ruling at the freeze; M2a implements it
- [ ] Guards: which ones your diff actually breaks, measured not inferred; each rewritten to the
      invariant and counter-checked
- [ ] Measurement record written — `measurements/M2a.md`, the four parts of planning report §5.2
- [ ] Comparison put in front of the **owner** at the End stop. An agent does not report it approved
- [ ] Four gates green; `typo-tokens.test.js` passes **unmodified**
- [ ] Handoff written — the seven points of planning report §6, fifteen lines or fewer
- [ ] Working tree clean; the worktree left in place for M2b
- [ ] **Not done here:** no merge, no push of a permanent branch, no PR
