# Grundlagen and Aufstellung — V1–V4 measurement

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
