# Evidence — `#viewport-1280` T1, commits 1 and 2

**Branch:** `feature/viewport-1280`, based on `dev` @ `863febe54fce513c4171314eb8cfc0d86f997408`.
**Date:** 2026-08-22. **Not pushed. No pull request.**
**Threshold at the end of this record: still 1400.** The flip to 1280 is commit 3 and has not happened.

| Commit | Subject |
| --- | --- |
| `24625fcf` | docs: add viewport-1280 workstream plan and T1 contract |
| `f598b3da` | test: make the i18n key-usage guard able to fail, and fast |
| `f49c5b15` | test: derive the desktop breakpoint anchors from DESKTOP_MIN |
| `5ce69805` | build: stop documentation prose from reaching the stylesheet |
| `1f43b101` | refactor: name the desktop breakpoint instead of spelling it out |

Two of these were not in the contract. Both were forced by the work and both are recorded below with
what made them necessary.

---

## 1. Baseline

`npm ci` in a fresh worktree, then the suite on the untouched base commit:

```
Test Files  135 passed (135)
Tests       2048 passed (2048)
```

This matters: without a recorded green baseline, a later red cannot be attributed.

---

## 2. Commit 1 — anchors compute instead of slicing on a literal

**Scope was larger than the contract estimated.** 33 sites, not 27:

| Kind | Count |
| --- | --- |
| Block anchors, `indexOf("@media (min-width: 1400px)…")` | 27 |
| Regex assertions on the media-query text | 5 |
| A prose anchor on a German comment heading | 1 |

Plus 7 JSX class-name assertions, which react to commit 2 rather than commit 3 and were routed
through the same helper so that commit 2 changed one line instead of seven test files.

### 2.1 The prose anchor

`test/buehne-desktop.test.js` sliced `index.css` at a **comment heading** containing "ab 1400 px",
not at the media query. Carrying the prose forward in commit 3 would have broken it and it would have
read as a real failure. It anchors on the `#buehne` section marker now — the dash form, which
distinguishes a section heading from the inline cross-reference form used elsewhere in that file.

### 2.2 The converted regexes are faithful — measured, not assumed

Two of the converted patterns feed constructs that pass **vacuously** on zero matches:
`for (const m of css.matchAll(RE))` and `css.match(RE) || []`. A green suite would therefore not have
proved anything. Old and new were run against the real stylesheet and compared match for match:

| Pattern | old matches | new matches |
| --- | --- | --- |
| `ecke` — `matchAll` over the `max-width` bands | 2 | 2 |
| `guide` — `max-height: 950px` | 5 | 5 |
| `guide` — `max-height: 820px` | 1 | 1 |
| `buehne` — `max-height: 900px` | 1 | 1 |
| `buehne` — bare media query | 11 | 11 |

Identical text in every case, and non-empty in every case.

### 2.3 The helper reads rather than imports, and why

The first version imported `DESKTOP_MIN` from `src/ui/useIsWide.js`. That is a React hook module, so
23 guards began pulling React in. It is read as text instead.

**The hypothesis that motivated the change was wrong, and the record should say so.** Cumulative test
time rose from 58.97 s to ~72 s after commit 1, and `test/i18n-guards.test.js` started timing out. The
React import looked like the cause. Removing it made the suite *slower* (79.54 s), which refuted that.
A control run on a byte-identical `dev` test tree timed out the same way — so the variable was machine
load, not the change. The text-reading construction was kept anyway because it is the better one; the
timeout had a different cause entirely (§3).

### 2.4 Threshold untouched

`git diff --name-only dev..HEAD -- src/` returned **0 files** for commits 1–3 of this record.

---

## 3. The i18n guard could not fail — found by counter-check

Not in the contract. Discovered because `AGENTS.md` requires counter-checking a guard you touch: a key
added to both catalogues and used nowhere was still reported as **used**.

Two defects hid each other:

1. **The walk was flat.** `readdirSync` over the top level of `src`, `src/ui`, `src/game`, `src/i18n`
   never reached `src/ui/tutorial/`, `src/ui/fx/`, `src/ui/fx/cardFx/` or `src/ui/indicators/`. All 42
   `tutorial.*` keys are used in `src/ui/tutorial/`.
2. **The catalogues scanned themselves.** `de.js` and `en.js` live in `src/i18n`, so every key matched
   its own definition.

Defect 2 masked defect 1: everything matched, always, for the wrong reason.

| | files scanned | reported unused |
| --- | --- | --- |
| before | ~130 | 0 — structurally impossible to report anything |
| after | 194 | 1 |

The single genuinely dead key is `gameover.best.hint`, DE and EN product text with no call site. It is
listed as a **named exception** rather than deleted, because removing product text is a product
decision. A second assertion fails if the exception itself goes stale.

**Counter-check after the fix:** a dead key inserted into both catalogues now makes the guard fail and
names the key; reverted with 0 files changed under `src/`.

**Speed, as a side effect:** the scan was 2526 keys × 2.56 MB with up to nine substring probes each —
1992 ms against vitest's 5 s default. It is a set lookup now: **1.2 ms**, verified to return the same
verdict for all 2526 keys, including where the old scan was deliberately loose (`a` and
`options.rfx.zzzz` still count as used). That is what removed the timeout, and the full suite now
passes at ~70 s of cumulative test time — the same load under which it previously failed.

---

## 4. Documentation prose was compiling into the stylesheet

Not in the contract. Found because commit 2's proof needs a clean baseline and the baseline was not
clean.

Tailwind 4 auto-detects sources across the whole project when no scope is given, `docs/**` included.
Class names appear there as prose — the historical log quotes them, workstream reports carry them in
tables, and `docs/localization/_ui_candidates.tsv` holds a whole `className` string. Twelve selectors
reached production this way, two with invalid declarations built from placeholders in a planning
document.

Sources are now `index.html` and `src/`. Excluded: `docs/prototypes/*.html` (standalone design pages)
and `maintenance/index.html` (own stylesheet).

**Verified before committing.** Of the twelve selectors that disappear, none occurs as a standalone
token in `src/` or `index.html`, and none is added. The check distinguishes a token from a substring —
`mb-0` only ever appears inside `mb-0.5`, `shadow` inside `drop-shadow(` — which matters, because a
substring check would have called six of them "used" and blocked a correct change.

One scare worth recording: `tracking-[.2em]` *is* used in `src/ui/GameOver.jsx` and appeared to have
been dropped. It had not been. Inside a bracketed Tailwind value the dot is escaped in the selector
too, so the stylesheet reads `tracking-\[\.2em\]`; the search needle was unescaped and found nothing.

**Guard:** `test/bundle-split.test.js`, section `#quellen`. It resolves each `@source` path and fails
if it points at nothing — a typo would leave Tailwind scanning nothing and ship a near-empty
stylesheet, which no other test would notice. Both failure modes were provoked and seen to fail.

---

## 5. Commit 2 — one named threshold

`--breakpoint-dt: 1400px` in `@theme`; 135 occurrences of the arbitrary variant rewritten to `dt:`
across eleven files **by script**, which is what makes the comparison below a consequence rather than
a coincidence.

### 5.1 The contract's gate was wrong

It demanded a **byte-identical** stylesheet. That is unachievable: the variant prefix appears in the
selectors, so `.min-\[1400px\]\:top-0` necessarily becomes `.dt\:top-0`. Asking for byte identity
would have forced a wrong conclusion.

The gate used instead: normalise both artefacts by rewriting whichever variant prefix they carry into
one neutral token, remove the differences inherent to defining a theme breakpoint — each named and
printed — and compare the remainder byte for byte.

```
variant selectors: before 63 · after 63
normalised size  : 149800 vs 149800 bytes
IDENTICAL apart from the named difference
```

**The one inherent difference:** Tailwind emits a `.container` max-width step per theme breakpoint.
`.container` is carried by no element in this app — the only occurrences of the word in `src/` are
Pixi render calls (`{ container: … }`) and a prose comment, which is why the utility is emitted at all.

### 5.2 `DESKTOP_MIN` stays a literal

The contract said it would be "derived from the same source rather than typed again". It cannot be: a
CSS media query cannot read a custom property, so the JS side must carry its own copy. Two literals
with a guard that computes both sides and compares them is the honest construction.
`test/desktopBreakpoint.js` refuses to load if they disagree, and refuses to load if the `@theme`
block contains anything other than exactly one project breakpoint — a second one would mean a third
layout tier, which this project does not have.

---

## 6. Gate results

Final state of this record, all run unpiped:

```
npm run lint -- --max-warnings=0     0 warnings
npm test                             135 files, 2051 tests, all passing
npm run build                        succeeds
```

`npm run gen:db` and the `VITE_PREVIEW=1` build have **not** been run at this point; they belong to
the commit-3 gate, where source under `src/` actually changes behaviour.

---

## 7. What is not done

- **Commit 3** — the value flip to 1280, the counter-edge, the completeness guard with its sabotage
  check, and the prose carried forward. Not started.
- **Commit 4** — the measurement probe. Not started.
- **The phone counter-proof at 390 px.** It needs a CDP capture on both sides of the flip, so the
  "before" side must be captured while the threshold is still 1400 — that is, from this state.
- `gameover.best.hint` — reported, untouched, awaiting a product decision.
