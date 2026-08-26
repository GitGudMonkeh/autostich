# MH4 — the exemption reach

**Task:** `task/menu-mh4-exemption-reach` · base `dev` @ `fe1d36b3` · this task moves no pixels.

An exemption in `panel-tokens.test.js` names a **selector**, and a selector stands in both halves of
the stylesheet. `rules()` dropped the `@media` context when deriving that selector, so an entry
written for a phone rule silenced the desktop rule too.

---

## 1. Baseline, measured at the base

| | |
| --- | --- |
| `npm test`, bare | **149 files / 2394 tests**, exit 0 |
| Contract's recorded baseline (`a0dc6885`) | 147 files / 2380 tests |

The tree is newer than the contract's; the difference is other work integrated since, not this task.

## 2. The green false alarm — reproduced first, then broken

**Reproduced (measured).** `#141419` and `#2a2a33` written back at the `.as-hub-field` desktop call
site, with the desktop rule under the bare selector as it stood before C4 scoped it:

```
Test Files  1 passed (1)
     Tests  102 passed (102)          exit 0
```

*The guard reported success over a rule it was no longer looking at.*

**Broken (measured).** Same sabotage, with the exemption scoped to the phone half via `nurHandy(…)`:

```
Flaeche: kein Literal in einer migrierten Regel   .as-hub-field -> background: #141419
Kante:   kein Literal in einer migrierten Regel   .as-hub-field -> border: 1px solid #2a2a33
     Tests  2 failed | 103 passed (105)           exit 1
```

The base rule of the narrow version stays covered — only the desktop rule surfaces. **The acceptance
gate is met.** Both edits were reverted; `src/**` is unchanged in the diff.

## 3. What was built

- **`rules()` carries the media context** as an appended third field, `[sel, body, media]`. The three
  call sites read `[sel, body]` and are untouched (H-d). The selector derivation is unchanged
  character for character — `.pop()` still discards the header, which is why the context now sits
  beside it instead of inside it.
- **`haelften()`** answers which half a rule *reaches*, from the width conditions of every enclosing
  block. The threshold is read from `--breakpoint-dt`, not transcribed.
- **`nurHandy(…)` / `nurDesktop(…)`** qualify an entry. Optional by construction: a bare regex keeps
  today's reach exactly (H-a). Declared as `function`, not `const` — the exemption lists sit above
  them in the file, and a `const` would leave the first worker to scope an entry with
  `Cannot access 'nurHandy' before initialization`. Measured: it failed that way on the first attempt.
- **`scripts/exempt-reach.mjs`**, promoted out of `evidence/C4/`, and the guard imports the same
  implementation rather than keeping a copy of it.

## 4. The reach, measured

```
exemption entries that match at least one rule:                     187
entries that reach BOTH halves, across the 1280px threshold:          5
entries covering several rules that ALL sit above the threshold:     42
```

**The 187 matches the C4 probe exactly.** The second number does not, and the difference is a
finding rather than a discrepancy:

| | |
| --- | --- |
| C4 probe, re-run on this tree | **16** |
| This probe | **5** across the threshold, **11** of the remaining sixteen above it |

The C4 probe knew only the first `@media (min-width: 1280px)` block and counted every rule outside it
as a phone rule — including the height variants `… and (max-height: 950px)` for the flat desktop
window. Measured on `.hub-root`: both its sites (`index.css:2538`, `:7628`) sit above the threshold
and there is no base rule at all. **5 + 11 = the sixteen.**

The five, named in the guard so a reader needs no probe:

```
INSET_EXEMPT  /\.op-dd-btn/    1 phone + 1 desktop
INSET_EXEMPT  /\.op-foot/      1 phone + 2 desktop
INSET_EXEMPT  /\.op-col2/      1 phone + 3 desktop
INSET_EXEMPT  /\.cz-root/      1 phone + 1 desktop
INSET_EXEMPT  /^\.up-root$/    1 phone + 2 desktop
```

**None of them is judged here.** Where both halves share the reason the reach is harmless; it is a
defect only where the reasons differ, and that belongs to whoever knows the screen.

## 5. The blind-spot line

`scripts/surface-delta.mjs:147` now prints:

> Surfaces only. Control states are not captured, nor is SVG paint (fill, stroke), and both are
> verified by hand.

Three seams moved together: the printed line, the pinned constant in `harness-honesty.test.js`, and
the survey header. The load-bearing clause *"control states are not captured"* is intact, because the
survey check matches exactly that substring. No fifth axis — `lockup.mjs` covers the mark directly.

## 6. Counter-checks

| # | Seam broken deliberately | Result |
| --- | --- | --- |
| **CC-1** | The C4 sabotage with the exemption scoped to phone | **RED** — 2 failed (the acceptance gate) |
| **CC-2** | `haelften()` returns `{phone: true, desktop: true}` always | **RED** — *the halves separation actually separates* |
| **CC-3** | A named entry no longer matches (`.cz-root` → `.cz-rootXX`) | **RED** — both directions of the list |
| **CC-4** | The blind-spot line reverted to its old wording | **RED** — 3 tests in `harness-honesty` |

## 7. Gates and noise floor

| Gate | Result |
| --- | --- |
| `npm test`, bare | **149 files / 2394 tests**, exit 0 |
| `npm run lint -- --max-warnings=0` | exit 0 |
| `npm run build` | exit 0 |
| `npm run gen:db` | exit 0, no file changed |
| **Noise floor** — `surface-delta.mjs` on the same tree twice | **ZERO computed deltas**, exit 0, 160 cells / 25139 matched nodes |

`test/typo-tokens.test.js` unmodified. No `src/**` file in the diff.

## 8. Deviations to note

- **Worktree.** The contract names `C:/Code/Autostich-worktrees/menu-rework`, which now holds
  `task/cubematrix-perf`. The owner had created `menu-mh4` on the `dev` tip, named for this task;
  the work was done there. Entering an occupied worktree would have put two writers in one.
- **Comment language.** New material is English per `AGENTS.md` — *Language policy*, although the
  surrounding comments in `panel-tokens.test.js` are German. Nothing existing was translated.
