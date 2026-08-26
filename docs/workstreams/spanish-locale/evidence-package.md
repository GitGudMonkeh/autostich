# Evidence package — spanish-locale

What was proven, how, and what was **not** proven.

## Diff range

| | SHA |
| --- | --- |
| Base (`origin/dev`, frozen source state) | `d9763883bb5e1a2d5433d33f4de1121bb9da0cf9` |
| Branch tip at handoff | see `git rev-parse task/spanish-locale` |

```bash
git log --oneline d9763883bb5e1a2d5433d33f4de1121bb9da0cf9..task/spanish-locale
git diff d9763883bb5e1a2d5433d33f4de1121bb9da0cf9..task/spanish-locale --stat
```

The base moved once during the planning session (`e6c31813` -> `d9763883`, an unrelated `#eis-arch`
commit from a parallel worktree). Every baseline number below was re-measured against the new base;
none of them changed, because that commit did not touch the catalogs.

## Acceptance gate

> A translator can start without a single question, and the returned catalog fits without rework.

| # | Criterion | Result |
| --- | --- | --- |
| 1 | `strings_es.csv` covers every catalog key and is ratcheted | **pass** — 2800 rows, 2746 open; `test/loc-csv.test.js` now runs over every target file |
| 2 | Rows in a fixed area carry a `limit`; `formation.*.abbr` carries 1 | **pass** — 30 rows, 8 hard + 22 measured; asserted per row |
| 3 | `LOCALE_IDS` is `de,en,es`; `READY_LOCALE_IDS` is `de,en` | **pass** — and `setLocale("es")` returns `en` |
| 4 | The formatters produce the Spanish forms | **pass** — `1.234.567` · `2,25` · `7 %` · `24/12` |
| 5 | `t()` under `es` falls back to English, not German | **pass** — `common.close` resolves to `Close`, not `Schließen` |
| 6 | No German or English text value moved | **pass** — 2639 keys, 111 236 / 104 771 characters, all unchanged |

Criterion 4 was **narrowed during implementation and the change is recorded here rather than
quietly**: the contract asked for the Architect factor to render `×1,10` under `es`. It cannot,
and that is the design working. `setLocale("es")` is refused while `es` is not ready, so the
application cannot be rendered in Spanish at all, which is exactly what owner decision 2 asked for.
What replaced it: the formatter is asserted directly per locale, and a source ratchet asserts that
`buildingText.js` no longer decides a number format by comparing locales. The full path is exercised
the moment `ready` flips, and the ratchet in the guard file forces that flip.

## Reproduce

```bash
npm ci
npm test
npm run lint -- --max-warnings=0
npm run build
npm run gen:db
npm run loc:export && git diff --stat docs/localization/
bash docs/workstreams/spanish-locale/counter-checks.sh
```

## Gate results

Run in this worktree after `npm ci`, on the branch tip:

| Gate | Result |
| --- | --- |
| `npm test` | 2194 passed, 142 files (base: 2186 / 142) |
| `npm run lint -- --max-warnings=0` | 0 errors, 0 warnings |
| `npm run build` | ok |
| `npm run gen:db` | ok, 219 entries |
| `npm run loc:export` | ok, and re-running it leaves the tree clean |

## Counter-checks

`testing.md` §5: a guard that is merely green is not evidence. Every new or generalised guard was
broken on purpose and had to go red. Reproducible from the repository:

```bash
bash docs/workstreams/spanish-locale/counter-checks.sh
```

13 cases, 13 confirmed. Each one restores the working tree afterwards.

| # | Break | Expected |
| ---: | --- | --- |
| 1 | `es` catalog filled to full key parity | red — demands `ready: true` |
| 2 | Spanish brand in the English catalog | red |
| 3 | The locale comparison restored in `buildingText.js` | red |
| 4 | Invented key in `es.js` | red |
| 5 | Missing placeholder in `es.js` | red |
| 6 | English decimal point in `es.js` | red |
| 7 | German quote pair in `es.js` | red |
| 7b | Source language: closing mark without its opening one | red |
| 8 | `es` row missing its date format | red |
| 9 | `setLocale` accepting a non-ready locale | red |
| 10 | `es` without its `via` chain | red |
| 11 | Dead key present in all three catalogs | red |
| 12 | Same dead key, with `isCatalogue` hard-coded back to `(de|en)` | **green — the guard is disarmed** |

Case 12 is the one that earns its place. It shows what the fix in the dead-key guard actually buys:
with the catalog exclusion typed as `(de|en)`, a third catalog is read as source code, every key in
it counts as "used", and the guard reports nothing. That is how the same guard was disarmed once
before, on 22.08.2026.

Two cases initially reported false results and both were defects in the harness, not in the guards:
`vitest -t` filters were written without umlauts and matched nothing while vitest still exited 0
(the harness now fails a case that matched no test), and `printf` does not expand `\uXXXX`, so the
quote case never inserted the character it claimed to. The second of those hid a **real** defect,
which is described below.

## One real defect, found by counter-check

The first version of the quote guard keyed on the **opening** mark per language and let a correctly
formed German quote pair pass inside the Spanish catalog.

The cause: `U+201C` is the **closing** mark in German and the **opening** mark in English and
Spanish. A guard keyed on a single mark must therefore either flag every correct German quote or let
foreign ones through; the first version chose the latter through an escape hatch.

Fixed by comparing **pairs**: each language declares `{open, close}` and may carry no mark outside
its own pair. Measured before writing the rule: `de` uses `U+201E` in 10 rows and `U+201C` in 9,
never `U+201D`; `en` uses `U+201C` in 10 and `U+201D` in 10, never `U+201E`. The original
source-language rule was kept **alongside** rather than replaced, because a German text carrying only
the closing mark stays inside its own pair and would pass the new rule.

## Scope compliance

Tripwire 1 — no German or English text value changed — is verified rather than asserted:

```bash
node -e "import('./src/i18n/de.js').then(async d=>{const e=(await import('./src/i18n/en.js')).default;const c=o=>Object.values(o).reduce((a,s)=>a+String(s).length,0);console.log(Object.keys(d.default).length,c(d.default),c(e))})"
```

Expected and measured: `2639 111236 104771`, identical to the base.

The English delivery CSV changed in 60 cells across 30 rows. Both versions were parsed and compared
cell by cell: **0 changes to any `de` or `en` value**, same header, same row count. Only `limit` and
`note` moved.

## Pixel measurement

Owner's `--pixels` concern: the language picker goes from two entries to three. Measured in the real
build on the task port, with `es` temporarily flipped to `ready` so three entries render. The
temporary flip and the preview config change were reverted; the tree was clean afterwards.

| Screen | Viewport | Result |
| --- | --- | --- |
| First-run picker (`.un-lang`) | 390 × 844 | 3 columns × 84.7 px, grid 270 px, no button overflow, no page scroll |
| Options picker (`Segmented`) | 390 × 844 | bar 209.7 px, right edge 343.3 of 390, no wrap, no overflow |
| Options picker | 1280 × 720 | bar 209.7 px, inside its row (right edge 396.8 of row edge 410.6) |
| First-run picker | 1280 × 720 | 3 columns × 154.3 px, all on one line, segmented CSS active |

No console errors on either viewport.

`UsernameModal.jsx` no longer hard-codes `grid-cols-2`; the column count comes from the number of
ready locales, as an inline style rather than a Tailwind class, because a class assembled at runtime
is not found by the Tailwind scanner and would never be built.

## Limits of this evidence

- **No Spanish text exists**, so nothing about Spanish text length, line breaking or truncation was
  measured. That is owner decision 4 and the named successor `es-layout`.
- The pixel measurements used **three** entries with the label `Español`. They say nothing about a
  fourth language or a longer label.
- Measured on **Windows, Chromium**, one machine, at two viewports. Nothing was checked on a real
  phone, on Safari, or on Linux beyond what CI runs.
- The **measured** length limits are lower bounds on real capacity, not exact capacities. One is
  already known to be tight for Spanish: `suit.*.name` carries 6, from "Yellow", and Spanish for
  yellow is `Amarillo` at 8. The package tells the translator to write it anyway and set `note`.
- The Spanish vocabulary in §3 of the package is a **proposal**, not a verified translation. It was
  written to let a translator start, and the package says so in a box at the top of the section.
- `test/loc-csv.test.js` proves the CSV matches the catalog. It cannot prove the CSV is *useful* to
  a translator; that is the judgement the acceptance gate leaves to a human.

## Uncertainty by category

- **Measured:** font glyph coverage, ICU number/date/plural behaviour for `es`, catalog key and
  character counts, CSV row and limit counts, all gate results, all counter-check outcomes, all four
  pixel measurements, the cell-by-cell CSV comparison.
- **Observed:** no console errors in the preview.
- **Inferred:** that Spanish runs longer than the existing two languages. Well founded, unmeasured
  here, and explicitly out of scope.
- **Proposed:** the DE→ES vocabulary, the eight formation abbreviations, and the score-announcement
  chain. All three are marked as proposals in the package and are for the owner to settle when the
  translation returns.
