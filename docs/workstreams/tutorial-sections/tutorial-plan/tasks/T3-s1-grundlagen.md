# T3 — S1 · Grundlagen

**Branch `task/tut-s1-grundlagen` · Tier C · base `feature/tutorial-sections` · needs T1**
Shared rules incl. the lesson contract: [`README.md`](README.md).

The first section a new player meets. Everything else assumes it. *Estimated:* **8 lessons, ~56
catalogue keys per language.**

## Lessons

| # | Lesson | Beat 2 | Glossary terms to **link**, never restate | Constants to interpolate |
| --- | --- | --- | --- | --- |
| 1 | Was ist Autostich | Bild | — | `MAX_CYCLES` |
| 2 | Der Stich | Bild | `stich` · `kampfwert` · **`gleichstand`** | — |
| 3 | Kartenwert · Stichwert · Kampfwert | Bild | `kartenwert` · `stichwert` · `kampfwert` | — |
| 4 | Durchlauf und Lauf | Bild | `durchlauf` · `segment` | `TRICKS_PER_CYCLE` · `MAX_CYCLES` · `SEGMENT_SIZE` |
| 5 | Serie und Serien-Multiplikator | **Probierfeld** | `streak` · `serienpunkt` | `STREAK_BASE_STEP` · `STREAK_BASE_CAP` |
| 6 | Crit | Bild | `crit` · `praez_intro` | `CRIT_BASE_MULT` |
| 7 | Woraus dein Score entsteht | **Probierfeld** | **`direktscore`** | `SCORE_PER_WIN` |
| 8 | Die Panels des Laufs | Bild | — | — |

**Bold** = a gap the owner approved adding (report §4). Lesson 1 also carries, in its single Satz,
*which phases exist and in what order* — a sentence, not a lesson.

## The two Probierfelder

Both are sliders rather than boards; there is nothing to arrange yet.

- **Lesson 5** — a streak length slider, showing the resulting multiplier. Computed from
  `STREAK_BASE_STEP` and `STREAK_BASE_CAP`, never a typed table.
- **Lesson 7** — the factor chain. Base × Serie × Crit × Formation × Gebäude, each factor a toggle,
  the product live. This is the lesson that makes the whole scoring model click, and it is the one
  place a reader can see *why the formation multiplier is worthless on a lost trick*.

Both read their constants from `src/game/constants.js`. Neither re-implements the engine: they
present the factors the engine multiplies, and if the balance moves the numbers move with it.

## What this section must not do

| Non-goal | Why |
| --- | --- |
| Explain any archetype | S4 (T6) |
| Explain formations beyond the word | S2 (T4) — lesson 7 may *name* the factor without teaching it |
| Teach the panels of the level-up phases | S3 (T5) |
| Restate a glossary definition | Tripwire 2. Link it. |

## Acceptance gate

> Eight lessons render at 390 × 844 in both languages, **each with 0 px overhang and nothing
> clipped**, the height guard passes, and no lesson names a number that is not interpolated from a
> constant.

## Expected file surface

```
src/ui/tutorial-sections/catalog.js        the S1 entries
src/ui/tutorial-sections/probes/streak.jsx    lesson 5
src/ui/tutorial-sections/probes/scorechain.jsx lesson 7
src/i18n/de.js, src/i18n/en.js             ~56 keys each
test/tutorial-sections.test.js             extend, do not rewrite
```

## Known hazards

| | Hazard | What to do |
| --- | --- | --- |
| **A** | Lesson 1 is the hardest text in the whole project: it must say what the game *is* in two sentences, to someone who has never seen it. | Write it last, after the other seven have taught you the vocabulary you can assume. |
| **B** | Lesson 7's factor chain is the one place the tutorial is closest to re-implementing the engine. | Present factors and multiply them; do not reproduce softcaps, ordering rules or `prodHook`. If the honest version needs a rule you would have to copy, cut the rule and say so in the handoff. |
| **C** | `SCORE_PER_WIN` is 400 today and marked `[TUNING]`. | Interpolate. A typed "400" is exactly the drift `text-style-guide.md` §4 exists to stop. |
| **D** | Lesson 8 shows panels that the menu rebuild is currently changing. | Prefer a Bild that names *what a panel is for* over one that reproduces its current pixels. A screenshot-like Bild will age in weeks. |

## Definition of done

- [ ] 8 lessons, both languages, V1–V4 at 390 × 844
- [ ] 0 px overhang and nothing clipped on every one
- [ ] Every number interpolated; no literal in a sentence
- [ ] Every glossary term linked, none restated
- [ ] `npm test` · `lint --max-warnings=0` · `build` · `gen:db` · `loc:export`
- [ ] No diff under `src/game/**`
- [ ] Committed and pushed
