# Tutorial sections — V1–V4 measurement

Production build, viewport 390 × 844, German, Chrome via `scripts/cdp.mjs`.
Walked lesson 1 → 7 with the footer's **Weiter** button.

## V1 — every lesson renders, no page errors

| # | Lesson | Content px | Viewport px | Beats | Tap targets < 44 px | Horizontal overflow |
| --- | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Was Autostich ist | 811 | 635 | 5 | 0 | none |
| 2 | Der Stich | 368 | 368 | 2 | 0 | none |
| 3 | Kartenwert und Stichwert | 609 | 609 | 3 | 0 | none |
| 4 | Die Serie | 626 | 626 | 3 | 0 | none |
| 5 | Der Score | 706 | 635 | 5 | 0 | none |
| 6 | Der Lauf-Bildschirm | 562 | 562 | 3 | 0 | none |
| 7 | Woher dein Score kommt | 539 | 539 | 3 | 0 | none |

No entries on the page error listener across the whole walk.

Two lessons scroll (1 and 5). Both are `voll`, which is what that kind means.
The other five fit their viewport without scrolling.

## V2 — the height model against reality

The model in `catalog.js` has no browser and no pixels. This is the check of whether it is
worth anything.

| Lesson | Model | Measured | Deviation | Budget |
| --- | ---: | ---: | ---: | ---: |
| wasist | 897 | 811 | +86 | 960 |
| stich | 396 | 368 | +28 | 400 |
| werte | 620 | 609 | +11 | 960 |
| serie | 639 | 626 | +13 | 960 |
| score | 755 | 706 | +49 | 960 |
| anzeigen | 604 | 562 | +42 | 960 |
| herkunft | 563 | 539 | +24 | 960 |

The model sits **above** the measurement everywhere, by 1.4 % to 10.6 %. That is the one
direction a budget guard may be wrong in.

**It did not start that way.** The first run had four of seven *below* their real height, and
the guard was green throughout — green is not a measurement. Two causes, both now fixed:

1. Three practice rounds were entered too low: 250 / 305 / 300 against measured 271 / 325 / 364.
2. `BODY_CHROME` was **missing entirely**. A lesson body carries 30 px of its own padding that no
   beat accounts for. Adding it moved every lesson up by 30 and put the model on the safe side.

The second one also surfaced a pre-existing case: `aufstellung/formationen` computes 408 px against
the 400 px short budget. It was never inside it; the missing padding hid that. Marked `voll` for
now, and the section gets rebuilt from the approved draft anyway.

## V3 — numbers come from constants

Screenshot `grundlagen-1-wasist.png` shows the resolved placeholders: 40 cards, 4 suits, values
1 to 10, 50 cycles, and the decision plan as *Skill 10 ×, Perk 13 ×, Aufstellen 13 ×, Architekt
13 ×*. Every one of those is read or counted from `src/game/constants.js` at render time; the
counts come from `DECISION_SCHEDULE` through `countSchedule()` in `vars.js`.

A guard checks the other direction too: every `{placeholder}` in a lesson text must have a value in
`vars.js`, so a typo cannot silently ship as literal text.

## V4 — the practice rounds compute correctly

`grundlagen-4-serie.png`: opponent 4 · 8 · 3 · 9 against 7 · 5 · 6 · 2. Wins at positions 1 and 3,
not adjacent, so the longest streak is 1 and the readout shows ×1,02 — which is
`1 + 1 × STREAK_BASE_STEP` with `STREAK_BASE_STEP = 0.02`. Card borders are green where the card
wins and red where it loses.

`grundlagen-2-stich.png`: the duel, 7 against 5, with the play button and a score readout starting
at 0.

## Known defect, out of scope

In lesson 4 the text renders as `…um 2` / `%.` across a line break. German typography wants the
number and the sign to stay together. Neither `de.js` nor `en.js` contains a single no-break space
today, so this affects every percentage in the game and not this lesson — filed as its own task
rather than fixed with a lone inconsistent character here.


---

# Aufstellung

Same method, walked lesson 1 → 5.

## V1 — every lesson renders

| # | Lesson | Content px | Viewport px | Beats | Tap targets < 44 px | Horizontal overflow |
| --- | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Die Aufstellungsphase | 527 | 527 | 4 | 0 | none |
| 2 | Das Brett | 525 | 525 | 3 | 0 | none |
| 3 | Was auf einer Karte steht | 531 | 531 | 3 | 0 | none |
| 4 | Die vier Formationen | 538 | 538 | 3 | 0 | none |
| 5 | Übereinander | 472 | 472 | 3 | 0 | none |

No page errors. None of the five scrolls — all fit the 635 px viewport — yet all exceed the 400 px
short budget, so `voll` is the correct kind for each.

## V2 — model against reality

| Lesson | Model | Measured | Deviation |
| --- | ---: | ---: | ---: |
| phase | 540 | 527 | +13 |
| brett | 544 | 525 | +19 |
| karte | 540 | 531 | +9 |
| formationen | 603 | 538 | +65 |
| stapeln | 499 | 472 | +27 |

The first run of this table read +81 to +187, that is 15 % to 40 % over. Two causes, both fixed:

1. The three new practice rounds were **not in `PROBE_PX` at all** and fell back to `PROBE_MAX`,
   375 px for a field that measures 186. A budget that far off measures nothing.
2. `regeln` and `liste` set in the smaller face (`text-body-5`), which the model did not know. Three
   lists measured 150, 142 and 237 px; 52 characters per line at 21 px with 26 px of chrome per
   entry fits all three, where the body text's 44 characters put the model 35 to 72 px high.

## V3 — numbers from constants, and one that was wrong

`aufstellung-2-brett.png` shows **Energie 3**. The shipped text said 4, because `VARS.energy` read
`C.FORMATION_ENERGY`. That constant is the engine default for sim, standard and dev runs; a normal
run with a profile starts at `ENERGY_FLOOR = 3` and reaches 5 through the upgrade tree. Same trap as
`COVER_FLOOR` 20 against `ARCH_MAX_COVER` 24. Both the placeholder and the practice round now read
`ENERGY_FLOOR`, and `energyMax` is summed from the tree nodes rather than typed.

## V4 — two defects the build itself surfaced

**Card colour never rendered.** `beats.jsx` carried its own suit table keyed `H / D / S / C` — the
French-deck suits. Autostich uses `R / B / G / Y`, so every lookup missed and every cell fell back to
grey. It went unnoticed because no earlier lesson depended on colour; the colour-block lesson does.
The cells now take `suitColor` from `constants.js`, and the screenshots show red, blue, green and
yellow borders.

**The tip contradicted the round beside it.** `aufstellung-3-karte.png` shows a Wiederholung paying
×1,25 on its *second* card while the tip below claimed a formation pays nothing until the third.
The code is unambiguous: `wiederholungFactor` sets `WIED_F2 = 1.25` at `ordinal === 2`, whereas
`escalatingFactor` holds Farbblock, Treppe and Wechsel at 1 through `ordinal <= 2`. The tip now
names both rules. It was wrong in the approved draft as well, and the draft and spec are corrected.

The card also renders its anatomy now — formation marks below, the position multiplier top right.
Without it the lesson titled *Was auf einer Karte steht* showed a card carrying nothing but its
value.


---

# Der Architekt

## V1 — every lesson renders

| # | Lesson | Content px | Beats | Tap targets < 44 px | Horizontal overflow |
| --- | --- | ---: | ---: | ---: | --- |
| 1 | Was der Architekt ist | 813 | 4 | 0 | none |
| 2 | Deine Hauptaktion | 761 | 4 | 0 | none |
| 3 | Wohin du baust | 901 | 4 | 0 | none |
| 4 | Tipps für den Anfang | 337 | 2 | 0 | none |

They started at 813 / **1151** / **1159** / 337 — two lessons well over the 960 budget, and the
model had waved both through. The board is the most expensive component in the whole tutorial:
eight rows by five columns. Square cells alone were 544 px of grid. Cells are now 1.9 wide to high
(they carry colour, not text, so nothing is lost), the build round is cut to four rows because it
teaches placing and rotating rather than structures, and four texts were trimmed.

## V2 — model against reality, all sixteen lessons

| Lesson | Model | Measured | Deviation |
| --- | ---: | ---: | ---: |
| architekt/wasist | 855 | 813 | +42 |
| architekt/hauptaktion | 761 | 761 | +0 |
| architekt/wohin | 911 | 901 | +10 |
| architekt/tipps | 388 | 337 | +51 |

Across all sixteen lessons of the three finished sections the model now sits above the measurement
everywhere, by 0 to 66 px. Measured probe heights this round: archmock 299 · bauen 286 ·
struktur 438.

## V3 — the four layouts are real buildings

`architekt-3-wohin.png` shows the *Zeile* layout: two green cells (Zollhaus, category score) and
three blue (Riegel, category value), the marked cell outlined, reading ×1,35 and 540 — which is
`SCORE_PER_WIN × 1.35`. All eight buildings across the four layouts were looked up in
`ARCHITECT_FAMILIES`; their categories and shapes match, and the factors come from `boardFactorMap`:
×1,35 · ×1,75 · ×1,62 · ×1,08.

The district layout is the proof of the lesson's point: its structure factor is ×1,00 and its
district factor ×1,08. Two different things, which is exactly what the tip says.

The tier table is computed, not typed: Zollhaus 35 / 53 / 77 / 109 and Kontor 65 / 98 / 143 / 202
come from `tierNum` over `TIER_FACTOR`.

## V4 — what replaced the old board probe, and why

The old `BoardProbe` had both defects the task contract listed as hazards, and a third:

1. It built every tapped cell as a **single-cell building**. No family has form `single` — the
   smallest is `domino` — so it showed a layout nobody can build.
2. `completedStructures(...).length` was always `undefined`, because the function returns a number.
3. It drew **two** rows of the eight-row board, so a column or diagonal could never be completed.
   The probe could not demonstrate the thing its lesson was about.

It is gone, replaced by four fixed layouts from real families.

## The defect that no gate caught

`beats.jsx` imported `ARCH_CAT` from `game/architect.js`. It lives in `ui/indicators/vocab.js`.
Lint does not resolve module exports, the tests read the file as text, and the production build
optimised the dead identifier away. Only the browser threw — and it threw while loading the whole
page, so the start screen was blank, not just the tutorial.

A new guard reads every relative named import in the four section files and checks it against the
target module's actual exports. Its first version merely imported `beats.jsx` and checked the
components; that version stayed **green with the import broken**, because Vitest resolves through
esbuild and does not enforce named exports as strictly as the browser. The counter-proof caught
that, and the guard was rewritten to check names rather than loading. Breaking the import now
reports: *beats.jsx: „ARCH_CAT" gibt es in ../../game/architect.js nicht*.


---

# Perks und Skills, Blitz

| Section | Lesson | Content px | Beats | Tap targets < 44 px | Overflow |
| --- | --- | ---: | ---: | ---: | --- |
| wahl | Perks und Skills | 559 | 4 | 0 | none |
| wahl | Die Kategorien | 337 | 2 | 0 | none |
| wahl | Raritäten | 515 | 4 | 0 | none |
| blitz | Was Blitz ist | 583 | 4 | 0 | none |
| blitz | Die Karte | 556 | 3 | 0 | none |
| blitz | Tipps für den Anfang | 334 | 2 | 0 | none |

Six lessons, no page errors, nothing scrolls.

**The reverse rule earned its keep.** `wahl/kategorien` was written as `voll` and computes 351 px,
so the guard rejected it: a lesson that fits the short budget is a short lesson. Marked `kurz`.

**Three probes were missing from `PROBE_PX` again** and fell back to `PROBE_MAX`, putting the model
189 to 305 px over. Measured: kategorien 199 · raritaet 157 · blitzkarte 272. That is the third
time this specific omission has happened, and each time the symptom is the same: the model reads
plausible and green while measuring the wrong thing.

Across all 22 lessons of the five finished sections the model now sits **above** the measurement
everywhere, by at most 66 px, and nothing exceeds its budget.

## Numbers, all derived

The lightning passive reads 13 % for the first skill and 8 % for each further one. That is not two
constants but one plus one: `LIGHTNING_CRIT_BASE` is the activation socket at 0,05 and
`LIGHTNING_CRIT_PER_SKILL` is 0,08. The draft's 13 was right and is now computed rather than typed.
The ionisation cap likewise: `ION_CRIT_STACK_CAP` 12 × `ION_CRIT_PP_PER_STACK` 0,015 = 18 %.
The 73 perk families are counted from `FAMILY_DEFS`.
