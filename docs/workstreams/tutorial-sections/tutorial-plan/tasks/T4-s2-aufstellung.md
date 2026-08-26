# T4 — S2 · Aufstellung

**Branch `task/tut-s2-aufstellung` · Tier C · base `feature/tutorial-sections` · needs T1**
Shared rules incl. the lesson contract: [`README.md`](README.md).

The section that proves the whole approach: two Probierfelder calling `computeFormations` directly.
*Estimated:* **6 lessons, ~42 catalogue keys per language.**

## Lessons

| # | Lesson | Beat 2 | Glossary terms to **link** | Constants |
| --- | --- | --- | --- | --- |
| 1 | Die Aufstellungsphase und die Energie | Bild | `aufstellung` · `formenergie` | `FORMATION_ENERGY` |
| 2 | Karten tauschen — was ein Tausch kostet | **Probierfeld** | `ziehreihenfolge` | `FORMATION_ENERGY` |
| 3 | Position, Segment, Segmentgrenze | Bild | `position` · `segment` · `grenzbonus` | `SEGMENT_SIZE` · `TRICKS_PER_CYCLE` |
| 4 | Was auf einer Karte steht | Bild | `formation` | — |
| 5 | Die vier Formationen | **Probierfeld** | `formation` · `wiederholung` · `farbblock` · `treppe` · `wechsel` | `WIED_F2/F3/F4` · `FARBBLOCK_BASE` · `TREPPE_BASE` · `WECHSEL_BASE` |
| 6 | Übereinander, und nur bei Sieg | **Probierfeld** | `ueberlappung` · `anker` · `formationskern` · `nachhall` | `OVERLAP_BONUS` · `ANCHOR_FORM_FACTOR` |

## Lesson 5 does not split — read this before you plan it

Four patterns in one lesson looks like it needs four Sätze, which would blow the 400 px budget. It
does not, because **the Probierfeld names the pattern it detects.** The reader rearranges five cards
and the readout says *Wiederholung (3) · ×1,50*, then *Treppe*, then *Farbblock*. All four are met by
playing, and the Satz only has to say "there are four, each with its own factor".

Shorter text and better teaching in one move — and it is why this section is the proof case for the
Probierfeld idea rather than a nice-to-have.

## The Probierfeld contract for this section

`computeFormations(order, deck, roles, perks, skills, anchors, familyTiers, architect)` —
`src/game/formations.js:205`. Pure, exported, already used by the running game. **Call it. Do not
reproduce its rules.**

- Pass empty/neutral values for `roles`, `perks`, `skills`, `anchors`, `familyTiers`, `architect`.
  A lesson teaches the base rule; perk modifiers belong on the perk card.
- Read the result through `activeFormationCount` / `positionHasFormation` / `summarizeFormations`
  rather than reaching into its shape.
- **Five cells = one segment** (`SEGMENT_SIZE`). Measured: 54.8 × 78.3 px each at 390 × 844. Ten
  would be 27 px wide.

**Lesson 6's readout is the point of the section.** Show the multiplier, then show it struck through
when the trick is lost. `text-style-guide.md` forbids arrow notation in player text — do it with the
readout's state, not with `→`.

## Deliberately not taught here

`farballianz` · `farbtransparenz` · `joker` · `bindeglied` — four perk- and building-specific
modifiers of the base patterns (report §4). A player meets them **on the card that grants them**,
where the glossary already bolds them. Teaching them before the reader owns one is teaching a rule
with no referent. If you disagree after writing lessons 5 and 6, say so in the handoff; do not
quietly add a fifth pattern.

## Non-goals

| Non-goal | Why |
| --- | --- |
| Eis-Formationen (the glacier geometry) | A different mechanic with a reserved name — `text-style-guide.md` §1e. S4/T6. |
| Building formation effects (Sakralbau) | S5 (T7) |
| Which perks improve formations | S3 (T5) |

## Acceptance gate

> Six lessons at 390 × 844 in both languages with **0 px overhang and nothing clipped**; the three
> Probierfelder call `computeFormations` and re-implement none of its rules; lesson 6 shows the
> multiplier dying with a lost trick.

## Expected file surface

```
src/ui/tutorial-sections/catalog.js               the S2 entries
src/ui/tutorial-sections/probes/formation.jsx     shared by lessons 2, 5, 6
src/i18n/de.js, src/i18n/en.js                    ~42 keys each
test/tutorial-sections.test.js                    extend
```

## Known hazards

| | Hazard | What to do |
| --- | --- | --- |
| **A** | `computeFormations` takes eight parameters and the last six are context this lesson does not have. | Build the neutral call **once**, in `probes/formation.jsx`, and let all three lessons share it. Three call sites drifting apart is how the "one text, three implementations" defect in `text-style-guide.md` §4 happened. |
| **B** | The formation factors are `[Balance]`-tagged and have moved repeatedly (`WIED_F2` 1.30 → 1.25, `TREPPE_BASE` 1.25 → 1.35). | Never type one. The Probierfeld shows whatever the function returns; the Satz stays qualitative. |
| **C** | The word *Formation* is reserved for card formations. | `Eis-Formation` for the glacier geometry, `Struktur`/`Distrikt` for buildings. Tripwire 2 fires on a redefinition. |
| **D** | A five-cell board with a live recompute is the most interaction-heavy thing in the tutorial. | Tap-to-select then tap-to-swap; no drag. Drag on a 54 px cell inside a scrolling overlay fights the scroller, and the overlay sets `overscrollBehavior: contain` for a reason. |

## Definition of done

- [ ] 6 lessons, both languages, V1–V4 at 390 × 844
- [ ] 0 px overhang and nothing clipped on every one
- [ ] `computeFormations` called, not reproduced — one shared neutral call site
- [ ] No factor typed into a sentence
- [ ] Lesson 6 shows the multiplier not counting on a loss
- [ ] `npm test` · `lint --max-warnings=0` · `build` · `gen:db` · `loc:export`
- [ ] No diff under `src/game/**`
- [ ] Committed and pushed
