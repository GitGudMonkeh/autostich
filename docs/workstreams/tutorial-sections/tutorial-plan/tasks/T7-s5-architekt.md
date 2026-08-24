# T7 — S5 · Der Architekt

**Branch `task/tut-s5-architekt` · Tier C · base `feature/tutorial-sections` · needs T1**
Shared rules incl. the lesson contract: [`README.md`](README.md).

The largest single screen in the game gets six lessons and two Probierfelder. *Estimated:* **~42
catalogue keys per language.**

## Terminology — read this first, it is a tripwire

The owner's brief said *"Formations- und Distrikt-Boni"*. In the game they are **Struktur**- and
**Distrikt**-Boni. `text-style-guide.md` §1e **reserves** the word *Formation* for card formations
and forbids it for building geometry; the glossary ids are `struktur` and `distrikt`, and
`gebaeude`/*Gebäude-Boost* is defined as the sum of the two.

Writing "Formations-Bonus" here would create the second truth H4 is about, and Tripwire 2 fires on
it. **Struktur · Distrikt · Gebäude-Boost.**

## Lessons

| # | Lesson | Beat 2 | Glossary terms to **link** | Constants |
| --- | --- | --- | --- | --- |
| 1 | Was die Bauphase ist — kein Geld | Bild | `bauphase` | — |
| 2 | Das Brett und das Baufeld | Bild | `brett` · `baufeld` · `abgedecktezelle` | `ROWS` · `COLS` · `N_POS` · `MAX_COVER` |
| 3 | Bauen — Bauplan, Polyomino, Drehen | **Probierfeld** | `bauplan` · `polyomino` · `gebaeude` | `ARCHITECT_OFFER` |
| 4 | Die drei Bau-Kategorien | Bild | `baukat` | — |
| 5 | Struktur- und Distrikt-Boni — nur bei Sieg | **Probierfeld** | `struktur` · `distrikt` | `HAEUSERZEILE_FACTOR` · `SPALTE_FACTOR` · `DIAGONALE_FACTOR` · `DISTRICT_BONUS` · `DISTRICT_CAP` |
| 6 | Aufwerten und **Versetzen** | Bild | `aufruesten` · **`versetzen`** | `MAX_TIER` · `TIER_FACTOR` |

**Bold** = an owner-approved gap. *Versetzen* is its own phase after building and is easy to miss
entirely.

Lesson 4's three categories, from `architect.js:11–13` and `:259/:270/:293`:
**Tragwerk** (`value`, +Stichwert before the comparison) · **Handelsbau** (`score`, after the win) ·
**Sakralbau** (`formation`, bends `computeFormations` for covered positions).

## The two Probierfelder

All functions verified pure and exported in `src/game/architect.js`. **Call them; reproduce
nothing.**

- **Lesson 3 — placing and rotating.** `enumeratePlacements` (`:170`) · `isValidFootprint` (`:195`) ·
  `nextRotationFootprint` (`:233`) · `shapeRotations` (`:133`). The reader drops one polyomino and
  rotates it; validity comes from the real check, so "why can't I put it there" is answered by the
  game rather than by a sentence.
- **Lesson 5 — the boni.** `boardFactorMap` (`:448`) · `structureFactorMap` (`:399`) ·
  `districtFactorMap` (`:426`) · `neighborCounts` (`:147`) · `completedStructures` (`:457`). The
  reader places a few buildings and watches the factor map light up. **Then shows it counting for
  nothing on a lost trick** — same beat as S2 lesson 6, deliberately rhyming.

**Board size.** The real board is 8 × 5 = 40. At 390 × 844 the content width is 364 px, so five
columns are ~63 px each — fine. Eight rows at that cell size is ~500 px, which alone exceeds the
400 px lesson budget. **Use a cropped board** — three or four rows are enough to show a completed
row and a district — and say in the Satz that the real board is `ROWS` × `COLS`. Measure it; do not
assume the crop fits.

## Deliberately not taught here

`staffel` · `lage` · `critwette` · `kicker` — four building-specific behaviours, each named on the
building that has it and explained in the glossary. Five with `abgedecktezelle`, which lesson 2
mentions in passing rather than teaching.

## Non-goals

| Non-goal | Why |
| --- | --- |
| Individual buildings from `ARCHITECT_FAMILIES` | The catalogue is large and balance-volatile |
| Which buildings to prefer | Strategy — not this layer |
| Eis-Formationen on the board | A different mechanic; reserved term |
| Reproducing the architect's rendering | Link or embed the real thing where a Bild is needed |

## Acceptance gate

> Six lessons at 390 × 844 in both languages with **0 px overhang and nothing clipped**; both
> Probierfelder call the real `architect.js` functions; lesson 5 shows the boost not counting on a
> loss; the words *Struktur* and *Distrikt* are used and *Formation* never is.

## Expected file surface

```
src/ui/tutorial-sections/catalog.js               the S5 entries
src/ui/tutorial-sections/probes/architect.jsx     shared by lessons 3 and 5
src/i18n/de.js, src/i18n/en.js                    ~42 keys each
test/tutorial-sections.test.js                    extend
```

Consider a guard asserting no `tut.s5.*` string contains "Formation"/"formation" — the tripwire made
mechanical. Cheap, and it is a relationship rather than a spelling.

## Known hazards

| | Hazard | What to do |
| --- | --- | --- |
| **A** | The 8 × 5 board does not fit the lesson budget. | Crop, **and measure the crop** with `../evidence/measure.mjs`. Do not shrink the cells: 44 px is the floor. |
| **B** | `MAX_COVER` reads `process.env.ARCH_MAX_COVER` and defaults to 24, and the perk *Bauhütte* and the upgrade tree both raise it at runtime. | Interpolate, and phrase it the way `glossary.js` `baufeld` already does. Do not invent a second wording — Tripwire 2's subtle form. |
| **C** | Structure factors multiply **per position** and `FUNDAMENT_BONUS`'s comment warns of outlier potential. | The Probierfeld shows what `boardFactorMap` returns. Do not explain the stacking maths in a Satz; let the map show it. |
| **D** | `ARCHITECT_ENABLED` is env-gated in `constants.js:21`. | Check what that gate actually controls before assuming the architect is always present for a new player. If it can be off, lesson 1 needs to know — raise it in the handoff rather than writing around it. |

## Definition of done

- [ ] 6 lessons, both languages, V1–V4 at 390 × 844
- [ ] 0 px overhang and nothing clipped on every one — including the cropped board, measured
- [ ] Both Probierfelder call `architect.js`; nothing reproduced
- [ ] Lesson 5 shows the boost not counting on a loss
- [ ] "Formation" appears in no S5 string; guard added
- [ ] Every factor interpolated; no literal in a sentence
- [ ] Hazard D answered in the handoff
- [ ] `npm test` · `lint --max-warnings=0` · `build` · `gen:db` · `loc:export`
- [ ] No diff under `src/game/**`
- [ ] Committed and pushed
