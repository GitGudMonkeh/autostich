# Task contract — M2b · Workshop contents · `#menu-rework`

**This contract is the binding scope statement.** Where it and
`docs/workstreams/desktop-menus/planning-report.md` disagree, this contract wins
(`docs/engineering/task-lifecycle.md` §6).

**The vocabulary is closed.** M2a held the round's one extension window and did not spend it; the
planner accepted that reading (`conventions.md` §2c — *The window is closed*). From here on, a worker
that needs something the vocabulary does not have **stops and reports**. There is no second window.

---

## Identity

| | |
| --- | --- |
| **Task** | `M2b` — the workshop's contents |
| **Branch** | `task/menu-m2b-workshop-contents` — create it yourself |
| **Feature branch** | `feature/desktop-menus` |
| **Base SHA** | the tip of `feature/desktop-menus` at start — the M2a merge plus this contract. Record it here |
| **Tier** | C |
| **Owner stops** | Two: once before implementation, once before integration |
| **Concurrency** | **Exclusive** |
| **Reviewer** | None requested |

## Local workspace

| | |
| --- | --- |
| **Worktree** | `C:/Code/Autostich-worktrees/menu-rework` — shared, **leave it in place** for M3 |
| **Preview port** | **5189** — `http://localhost:5189/autostich/` |
| **Survey port** | **5181**, hardcoded in `scripts/viewport-survey.mjs:54` with `--strictPort`. Check it is free before a long capture |
| **Server** | `node node_modules/vite/bin/vite.js preview --port 5189 --strictPort --base /autostich/` |

**The tree was green at handover:** `npm test` **142 files / 2200 tests** · `lint --max-warnings=0` ·
`build` · `gen:db`, all exit 0. A red gate from here is something M2b caused.

Confirm your branch and an empty `git status --short` before the first edit.

---

## Scope

`src/ui/CustomizeScreen.jsx` — **the contents**: the pack cards, the fx panels, the detail card, and
the `.cz-*` rules in `src/index.css` that dress them. The shell is M2a's and is done.

Take every surface, edge, elevation, radius and inset from `conventions.md` §2c.

### What M2a left you, deliberately

| | |
| --- | --- |
| **The allowlist entry is region-precise** | **66 of the 68 axis literals in the file are yours.** M2a scoped its entry so the guard does not block work that has not happened yet. Extend the entry as you migrate — hook on, and the restriction falls away |
| **The ink ratchet caps `CustomizeScreen.jsx` at 27** | It may not grow. It may shrink |
| **The effects tab is now visible to the gate** | M2a extended the survey to open it (`35e66fe5`). Your whole surface is measurable for the first time — nothing you change there is invisible |

---

## Non-goals, and the tripwires

| Non-goal | Why |
| --- | --- |
| The workshop shell | M2a, done |
| Any other menu screen | One worker per menu |
| The **appearance** of architect, formation, build panels | Battle session |
| Battle screen and pick phase | Owner decision — own session |
| Anything below 1280 px | Owner decision |
| Any type size, `.ty-*` role or `--text-*` token | `typo-tokens.test.js` passes unmodified |
| A new dependency, icon or glyph | House rule — the owner is **asked** |
| Translating the German comments in `src/index.css` | A translation-only diff in a ratchet-guarded file costs a review round |
| **Minting a token** | The window is closed. Stop and report |

### Tripwire 1

> **If this diff introduces a new `box-shadow`, `padding`, `border-radius` or `background` value at
> the call site instead of choosing one from the vocabulary — stop.**

### Tripwire 2

> **If you build your own panel — stop and report to the planner.**

For you tripwire 2 has no window behind it. M2a named two gaps rather than taking them and both were
ruled on; that is the form, and the answer for you is *report*, not *propose and proceed*.

---

## Approved architecture — binding

1. **One mechanism.** A custom property in `index.css`, consumed three ways: utility, stylesheet rule,
   inline style emitting `var(--token)`.
2. **`!important` is not the answer to an inline style.** Redefining the property is. M2a dropped two
   more this way; there may be more in your region. If you find one where it does not work: stop and
   report.
3. **Every length takes `var(--ui-scale, 1)`.** Colours, opacities and percentages do not. `--text-*`
   is the exception. `--ui-scale` is reserved — no screen sets it.
4. **The annex is closed**, and so is the ladder.
5. **Re-pointing a step on your own root, to another named token, is sanctioned** and needs nobody.

---

## Task-specific inputs

| | |
| --- | --- |
| **Viewports** | 1280×720 · 1400×700 · 1536×791 · 1600×900 · 1920×1080 |
| **Languages** | `de` and `en`. **Tune in German**, verify in English |
| **Baseline** | M2a's post-change capture set, `docs/workstreams/desktop-menus/evidence/M2a/`. Named, not re-derived |
| **Survey markers** | `shop-packs` → `.cz-card, .cz-main` — now including the effects tab |

### State dependencies — read before you diff a comparison

| Surface | What moves it |
| --- | --- |
| `leaderboard` | network data |
| `victory` | run outcome |
| `stats` · `feedback` | accumulated run history |
| **every surface** | **the wall clock** |

The hub reads the ISO week and renders **behind every overlay**. One `<span>` crossing midnight
produced 72 box deltas across 37 cells and 10 surfaces, zero code changed.

> Take both halves of a comparison on the same side of a week boundary. Box deltas on
> `0/0/2/0/5/0/4/0/1/0:SPAN` are the clock — **re-take rather than explain.**

Match nodes by path; an absent path is not-comparable. Anything outside this list is real.

---

## Acceptance gate

> **Every surface, edge, elevation, radius and inset in the workshop's contents comes from §2c — and
> the allowlist entry for `CustomizeScreen.jsx` covers the whole file when you are done.**

The second half is the one that decides it. M2a's entry is region-precise *because your work had not
happened*. When it has, the region is the file. A `CustomizeScreen.jsx` that is still partly exempt
at handover means the migration is not finished, whatever the screenshots show.

---

## Expected file surface

| File | |
| --- | --- |
| `src/ui/CustomizeScreen.jsx` | contents |
| `src/index.css` | the `.cz-*` content rules. **Not `@theme`** — the window is closed |
| `test/panel-tokens.test.js` | widen the allowlist entry to the whole file; ink cap may shrink, never grow |
| `test/cz-ruhe.test.js` · `test/shop-scale.test.js` · `test/fx-panel.test.js` | if your diff breaks what they assert — **measure, do not infer** |
| `docs/workstreams/desktop-menus/measurements/M2b.md` | |
| `docs/workstreams/desktop-menus/evidence/**` | |

**Must not change:** `src/ui/OptionsModal.jsx`, `src/ui/StartScreen.jsx`, any battle or pick-phase
component, anything inside `@media (max-width: …)`, `test/typo-tokens.test.js`, every `--text-*`
token, the `@theme` block, and the value of any token M1 or M2a shipped.

---

## Known hazards — each resolved before handoff

| # | Hazard | Resolution required |
| --- | --- | --- |
| **H-a** | **Guard membership has been wrong once and measured right twice.** The planning report named six guards where two applied; M2a measured instead | Measure which guards your diff actually breaks. Rewrite to the **invariant**, never the mechanism, and counter-check each. Cannot make one pass: stop and report, do not relax |
| **H-b** | **A composite `:root` token cannot read a per-element variable.** MENU-15, then MENU-29 in the task that wrote the rule against it | Read §2c — *A token only sees what is present where it is declared* — before you write a token |
| **H-c** | **The comparison straddles a week boundary** | Re-take, do not explain |
| **H-d** | **The window is closed and you find a real gap** | Name it in the findings table with an ID and report it. Do **not** mint a token, and do **not** work around it with a call-site value — the second is tripwire 1 wearing a hat |
| **H-e** | **The allowlist is widened without the migration behind it** | The entry and the migration land in the same commit. An allowlist that runs ahead of the work is a guard that reports success it has not verified |

---

## Definition of done

- [ ] Branch confirmed, `git status --short` empty, before the first edit
- [ ] Every content surface, edge, elevation, radius and inset comes from §2c
- [ ] `panel-tokens.test.js` allowlist entry covers **the whole file**; ink cap ≤ 27
- [ ] Guards: measured which break, each rewritten to the invariant and counter-checked
- [ ] Measurement record `measurements/M2b.md` — the four parts of planning report §5.2
- [ ] **Part 3 re-measures every number the decision block put to the owner**, with the delta named
      where it moved (planning report §5.2; the reason is MENU-43)
- [ ] Comparison put in front of the **owner** at the End stop. An agent does not report it approved
- [ ] Four gates green; `typo-tokens.test.js` unmodified
- [ ] Handoff — seven points, fifteen lines or fewer
- [ ] Working tree clean; worktree left in place for M3
- [ ] **Not done here:** no merge, no push of a permanent branch, no PR
