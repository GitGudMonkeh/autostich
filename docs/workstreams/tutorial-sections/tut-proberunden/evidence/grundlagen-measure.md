# Grundlagen — V1–V4 measurement

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
