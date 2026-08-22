# Evidence — `#viewport-1280` T1 and T1b, commits 1 to 3

**Branch:** `feature/viewport-1280`, based on `dev` @ `863febe54fce513c4171314eb8cfc0d86f997408`.
**Date:** 2026-08-22. **Not pushed. No pull request.**
**Threshold at the end of this record: 1280.** The flip is commit 3 and is recorded in §7.

| Commit | Subject |
| --- | --- |
| `24625fcf` | docs: add viewport-1280 workstream plan and T1 contract |
| `f598b3da` | test: make the i18n key-usage guard able to fail, and fast |
| `f49c5b15` | test: derive the desktop breakpoint anchors from DESKTOP_MIN |
| `5ce69805` | build: stop documentation prose from reaching the stylesheet |
| `1f43b101` | refactor: name the desktop breakpoint instead of spelling it out |
| `062538e4` | docs: record the evidence for viewport-1280 commits 1 and 2 |
| `e131155d` | docs: contract the flip to 1280 and the survey |
| `d3f65b43` | test: capture the 390 px phone baseline before the threshold moves |
| *(this record)* | refactor: lower the desktop threshold to 1280 px |

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

## 7. Commit 3 — the flip to 1280

Base `d3f65b43`, clean tree, threshold verified still at 1400 before the first edit.

### 7.1 What moved

| Site | Count | From → to |
| --- | --- | --- |
| `@theme` token `--breakpoint-dt` | 1 | 1400px → 1280px |
| `min-width` media queries in `index.css` | 11 | 1400px → 1280px |
| Counter-edge `max-width` | 1 | 1399.98px → 1279.98px |
| `DESKTOP_MIN` in `src/ui/useIsWide.js` | 1 | 1400 → 1280 |
| Prose carried forward | 399 lines across 66 files under `src/` and `test/` | 1400/1399 → 1280/1279 |

Untouched by design: the height bands 950 / 900 / 820, `min-width: 1750px` (the guide's large step),
the `max-width: 1920px` / `1760px` right edges, and every rule of the phone layout.

**Not one source-text ratchet broke.** That is the return on commit 1: all 33 anchors already compute
from `DESKTOP_MIN`, so they followed the threshold instead of failing at it. The hazard the contract
called the most expensive one (§10.2) cost nothing in the end, because it had already been paid off.

The mechanical pass ran as a script over `git ls-files` with an explicit skip list, so the six lines
that needed judgement were left untouched and edited by hand rather than being swept along.

### 7.2 What deliberately did NOT move

Eleven occurrences of `1400` survive in `src/`. None of them is the threshold, and each is named in
the guard's exception list with its reason:

| Kind | Sites |
| --- | --- |
| Timing constants in milliseconds | `FireHead.jsx` particle lifetime · `SeedChip.jsx` copy timeout |
| Measurements at a named window size | `shopScale.js` (1400 × 700) · KPI tile inner width · three guide `--gs` measurement rows · shop tile count · laptop overlap observation · verified window sizes |
| Historical reference | the superseded rationale, which names the value it superseded |

**A measurement taken at 1400 px stays true when the threshold moves.** Rewriting those numbers would
not carry prose forward, it would falsify a record. Two notes drafted during this commit originally
introduced fresh `1400`s of their own; they were reworded to say "the previous, higher threshold"
instead, so that the exception list records only what was already there.

### 7.3 The rationale block

`index.css` argued **for** 1400 and **against** 1280 on the grounds that the hub column pair measures
1520 px. Replaced in place, in German, with the current reasoning: the itch.io embed at 1280 × 720,
and why the column pair loses nothing it needs (`.hub-pair` is fluid-capped at 1520 px and rides the
`zoom` clamp with its 0.85 floor — the 1520 px is air the design *takes*, not air it *needs*). The
superseded argument is stated as superseded rather than deleted.

`docs/decisions/` was not touched.

### 7.4 The completeness guard — `test/viewport-1280.test.js`

Five assertions, none of which spells the threshold out. Each states a relationship and derives both
sides, so the file needs no edit the next time the number moves:

1. no `1400`/`1399` in `src/**` outside the named exception list — **and** no exception that has gone
   stale, which is the half that keeps the list from rotting into a permanent hole;
2. every `min-width` above 1000 px equals the `@theme` token or is a named band (`{1750}`);
3. exactly one fractional `max-width` exists and it equals *token − 0.02* — computed, not typed;
4. no arbitrary `min-[Npx]:` variant survives; the named variant is the only route;
5. `@theme` holds exactly one `--breakpoint-*` token and `DESKTOP_MIN` equals its value.

Assertions 2 and 4 carry their own vacuity checks (at least one wide `min-width` must equal the token;
the named variant must actually occur), and a sixth test asserts that the file walk reaches
`ui/fx/cardFx`, `ui/tutorial`, `ui/indicators`, `i18n` and `game`. That last one is written from the
scar in §3: the i18n guard reported "0 unused" for months because its walk was flat and it was
structurally unable to report anything else.

The old-value scan folds in `1399` as well. The contract asks only for `1400`; the counter-edge moved
with the threshold and a forgotten `1399` is the same defect wearing the other hat.

### 7.5 The guard was seen to fail — five times, not asserted

| # | Sabotage | Result |
| --- | --- | --- |
| A | one media query reinstated at 1400 | assertions **1 + 2** fail; names `src/index.css:5230` |
| B | counter-edge left at 1399.98 | assertions **1 + 3** fail; *"expected 1399.98 to be close to 1279.98"* |
| C | one `dt:` variant rewritten to `min-[1280px]:` | assertion **4** fails; names `CustomizeScreen.jsx:1240` |
| D | `DESKTOP_MIN` set to 1360 | `desktopBreakpoint.js` throws: *"Desktop breakpoint drift: … must be changed together"* |
| E | an exception's site edited away | the **staleness** half fails; names `ui/SeedChip.jsx «setCopied(false), 1400»` |

Every one reverted and verified by `git hash-object` against the pre-sabotage hash.

A guard nobody has watched fail is not evidence. That is the whole lesson of §3, and it is the reason
these five runs are in the record rather than a sentence saying the guard works.

### 7.6 The phone counter-proof — and the defect it exposed in its own tool

The first `compare` run came back **FAIL**, on five lines of proof 1. It was not a layout regression.
It was a hole in the proof.

`widthVerdict()` split media conditions on `/\s+and\s+/`. Source CSS writes `(min-width: 1400px) and
(max-height: 820px)`, but the **minifier** writes `(min-width:1400px)and (max-height:820px)` — no space
before `and` — and proof 1 is fed the *built* stylesheet. The split therefore never fired on a single
compound query. The whole condition fell through as one opaque string, `applies` stayed `true`, and
**the width was never evaluated at all.**

Six compound blocks were carried into the comparison key as text. So for those blocks proof 1
compared spellings while claiming to compute — the same shape of defect as the vacuous i18n guard in
§3, in the very tool built to prove this commit safe.

**The verdict itself was unchanged, and that was measured, not assumed.** Re-evaluating both stored
artefacts with a correct parser, without rebuilding anything and without touching the baseline:

```
before: 40 records -> 34 applicable at 390px
after : 40 records -> 34 applicable at 390px
byte length: before 67136 · after 67136
IDENTICAL — the rule set that can apply at 390 px did not move.
```

All six dropped blocks open with a `min-width` of 1400 or 1750, false at 390 px on **both** sides:

```
@min-width:1400px)and (max-height:820px    @min-width:1400px)and (max-width:1760px
@min-width:1400px)and (max-height:900px    @min-width:1400px)and (max-width:1920px
@min-width:1400px)and (max-height:950px    @min-width:1750px)and (min-height:1000px
```

The sixth carries 1750 on both sides, so it was invisible in the diff while being just as mis-parsed —
which is the part worth remembering: the defect was only *visible* because a number happened to change.

**Two fixes, on the owner's decision.** The regex now splits both spellings. And `compare` re-runs both
stored artefacts through today's evaluator instead of diffing them raw — because the old construction
froze the *verdict* into the artefact, so the two sides went through the same function only as long as
nobody touched that function in between. That is a structural weakness independent of this bug, and it
is what lets the protected 390 px baseline stay valid across a parser fix rather than being re-captured.

**The repaired proof was then shown to still fail.** A proof changed until it passes is worth nothing
otherwise: `.lv-rig { --lv-h: min(92dvh, 760px) }` — a rule outside every media query, so live at
390 px — was moved to 761px, rebuilt and captured. Proof 1 caught the one-pixel change and named it.
Reverted, rebuilt, capture directory removed.

**Final result, DE and EN, five screens:**

```
PROOF 1  rule set at 390px IDENTICAL (67136 bytes)
PROOF 2  de/hub 163 · de/upgrades 372 · de/shop 412 · de/leaderboard 261 · de/stats 171   all identical
PROOF 2  en/hub 163 · en/upgrades 372 · en/shop 412 · en/leaderboard 261 · en/stats 171   all identical
PASS · the phone layout is unchanged
```

`before/` was never written to; verified with `git diff` against the committed baseline (empty).

### 7.6.1 The pixel half — found missing, then made to work

Found on 2026-08-22 while assembling the review handoff, after `c8af0f76` was already committed and
pushed. It is recorded here rather than quietly fixed, because it changes what the commit can claim.

Contract §3.1 asks for a "Pixel comparison — the existing text-mask / noise-threshold method", and
acceptance §8.1 for "0.0000 % of pixels beyond the noise threshold". **Neither happens:**

- `compare()` in `scripts/phone-proof.mjs` reads `applicable-390.txt` and `geometry.json` only. It
  never opens a PNG.
- `geometry.json` holds `metrics` and node boxes — **no pixel digest**, so comparing it cannot compare
  pixels indirectly either.
- Byte comparison of the committed pairs: **3 identical, 7 differing** (`de-hub`, `en-hub`,
  `en-leaderboard` identical; the rest differ by −583 B to +705 B).
- The method itself exists, fully implemented, in `scripts/viewport-proof.mjs`. It was never wired
  into `phone-proof.mjs`.

**Resolved the same day. §8.1 is now satisfied — measured, not argued.** What it took is below,
because the route matters more than the result: four defects sat between "the tool exists" and "the
tool measures", and three of them were invisible while the tool reported PASS.

#### The four defects

| # | Defect | How it surfaced |
| --- | --- | --- |
| 1 | `compare()` never opened a PNG | reading the function while assembling the review handoff |
| 2 | `goto()` hangs forever on about:blank → about:blank | wiring in the comparison; ten pairs in a row, no navigation between |
| 3 | `settlePaint()` had no deadline and hung the capture | **introduced by this session's own fix**, caught by this session's own control |
| 4 | 16 of the shop's 32 images never loaded | the diagnostic added in 3 printed `16 STILL PENDING, 16 DECODE TIMEOUT` |

`goto` awaits `Page.loadEventFired` with no timeout, and Chrome fires no load event for a navigation
from about:blank to about:blank. `viewport-proof.mjs` never hit it because it captures the
application between comparisons; `phone-proof.mjs` compares ten pairs back to back and hung on the
first. Fixed in `pixel-diff.mjs` by navigating only when not already blank.

#### The cause that mattered, and the two hypotheses that were wrong

Fixing all four still left the shop differing **from itself** — two captures of one build, 0.65 %
beyond the noise threshold, ~1800 pixels off any text box, geometry identical. So the flip was not
the cause, and neither were the images.

Two hypotheses were tested and **refuted**, and they are recorded because a refuted hypothesis is
what makes the third credible:

- **Canvas / Pixi rendering.** Refuted: the probe records tag names, and the shop has 32 `IMG` and 11
  `svg` and **zero** `CANVAS`.
- **`backdrop-filter: blur()` not being bit-deterministic on the GPU.** Refuted by measuring computed
  styles on the live screen: the only blurred elements are the hub field and four hub tiles, none of
  which is where the difference sits.

The actual cause came from the same measurement. One element carried a running animation:

```
DIV.w-full max-w-xl ...   as-panel-sweep 7s   @12,51 366x743
```

**Exactly the bounding box the pixel diff had been reporting all along** — `x12..378, y51..793`. Two
captures land at two phases of a seven-second sweep, so a moving gradient sits somewhere else in
each. Every symptom matches: spread over the panel, none on text, none inside an image, deltas up to
109, and geometry untouched because nothing moves.

**It is not a bug in the app.** `index.css` freezes `as-panel-sweep` under `data-reduced-fx` and then
deliberately exempts the identity panels — the comment at that rule calls it "AUSNAHME (auf Wunsch)".
The shop card carries `as-panel as-panel-deck`, so it is inside the exemption by design.

**Worth recording separately:** `prefers-reduced-motion: reduce` — which this capture sets — does not
cover `as-panel-sweep` at all. That is a different axis from `reducedFx`, and an infinite decorative
animation that ignores it is at least an accessibility question. Reported, not changed; §9 forbids
the repair and this is not even a layout one.

#### The control, and why it lives in the tool

Every animation is pinned to `currentTime = 0` and paused, through the Web Animations API, before the
probe and the screenshot. Not an injected `animation: none` rule: the exemption above is written with
`!important` and a three-part selector, so a universal override would lose the specificity fight and
fail **silently**. Pinning cannot lose, and it pins to a *defined* phase rather than to whichever
moment the screenshot happened to catch.

Determinism control after the fix — two captures, one build:

```
10 screens, DE and EN:  0.0000 % beyond noise      (8 of them byte-identical)
```

#### The baseline was re-derived, and `before/` was not touched

The old `before/` was captured with animations running, so it cannot be compared against a pinned
capture — measured: 8 of 10 screens differ, and the 2 that do not are exactly the two with no
animation.

The premise that the baseline "cannot be re-taken" was true **only while the capture was
nondeterministic**. It no longer is, and the pre-flip state is `d3f65b43` in git. So `src/` was
checked out at that commit, built, captured with the current tool into **`before-pinned/`**, and
`src/` restored — verified by `git status` reporting `src/` clean against HEAD afterwards.
**`before/` was never written to** and remains the historical artefact.

#### The result

```
PROOF 1   rule set at 390px IDENTICAL (67136 bytes)
PROOF 2   10 screens, geometry identical
PROOF 2b  10 screens, 0.0000 % beyond noise, max delta 1-8 (all sub-threshold)
PASS · the phone layout is unchanged
```

Acceptance §8.1 — *"0 structural differences on geometry, 0.0000 % of pixels beyond the noise
threshold, DE and EN, comparing across the flip"* — is met on the evidence, not on an argument about
what geometry implies.

**Correction on the record.** The commit message of `c8af0f76` says "geometry and pixels identical on
five screens in DE and EN". The geometry half is measured. The pixel half was never measured; it was
taken from the tool's own header comment, which describes a comparison `compare()` does not perform.
The commit is pushed, so the message stands as written and this is the correction.

### 7.7 Two findings documented, not repaired

Both are prose carried forward honestly rather than layout touched. §9 of the contract forbids the
repair; it does not forbid saying what is now true.

- **The `:hover` argument is weaker at 1280.** `index.css` justifies omitting `@media (hover: hover)`
  by saying a touch device at the threshold width practically does not exist. The 12.9" iPad in
  landscape is 1366 CSS px: below the old threshold it never saw those rules, above the new one it
  does. Noted at the site. Retrofitting the hover query would be a repair → T2.
- **The level-up wings.** The in-file arithmetic is explicitly *for the narrowest case*, and the
  narrowest case moved: 1280 − 32 − 880 − 44 = **324 px for two wings, 162 per side** (previously
  444 / 222). The wing asks for 320 px, so it now gets about half at the bottom end. Documented at
  the site and left standing, per §9. Note the planning report's §1.5 row 11 predicted 178 px per
  side — it omitted the 32 px overlay padding that the in-file computation includes.

### 7.8 Scope: prose carried slightly beyond the contract's list

The contract names `index.css`, `App.jsx`, `de.js`, `en.js` and the test headers. Three documentation
files stated the threshold as a live fact and would otherwise have been left lying:
`docs/engineering/conventions.md` (named by `AGENTS.md` as a source of *current* conventions) and
`docs/art/corners/README.md` + `docs/art/skills/README.md` (both describe the render gate).

**Deliberately left alone**, and reported rather than changed:

- `docs/decisions/` — historical record, forbidden by the contract.
- `docs/workstreams/viewport-harness/` — the finished workstream's own measurement records.
- `docs/feature-backlog.md` — its entry "desktop devices between 1280 and 1399 px get the phone
  layout" is **obsolete as of this commit**. Removing or rewriting a backlog entry is a product
  decision, so it is flagged here instead.

### 7.9 Gate results

All run unpiped, on the final tree, after the `phone-proof.mjs` fix:

```
npm test                             136 files, 2057 tests, all passing   (was 135 / 2051)
npm run lint -- --max-warnings=0     0 warnings
npm run build                        succeeds
npm run gen:db                       219 entries
VITE_PREVIEW=1 npm run build         succeeds
```

Commit 3 is the first commit in this workstream to change `src/`, so it is the first where both build
variants actually matter. Both were run.

---

## 8. What is not done

- **Commit 4** — the survey: five sizes × two languages × the surface list of contract §5.2, the
  typography inventory, and every §1.5 prediction marked held or refuted. Not started.
- **T2** — every repair. Nothing that overflows at 1280 was fixed, including the two findings in §7.7
  and the guide's `--gs` step.
- `gameover.best.hint` — reported, untouched, awaiting a product decision.
- `docs/feature-backlog.md` — the now-obsolete compact-layout entry, see §7.8.
