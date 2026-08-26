# T6 — S4 · Die vier Archetypen

**Branch `task/tut-s4-archetypen` · Tier C · base `feature/tutorial-sections` · needs T1**
Shared rules incl. the lesson contract: [`README.md`](README.md).

Four lessons, one per archetype. *Estimated:* **~28 catalogue keys per language.** The smallest
section and the one most likely to go wrong, because there is a four-guide Leitfaden sitting right
next to it saying similar things better.

## The line this section must not cross

`docs/tutorial-guided-run-plan.md` §1, carried forward by owner decision 3:

> **Glossar = nachschlagen · Leitfaden = Strategie · Tutorial = einmal machen.**

So each lesson answers exactly three questions and then gets out of the way:

1. **What is the resource?** The bar you will see running. Hitze · Ladung · Masse · Wachstum.
2. **What does it do with no skills beyond the first?** The passive.
3. **Where do I read more?** A **link** to `GuideOverlay` for that archetype.

**It does not answer "how do I play Feuer".** That is the Leitfaden, it already exists, it is
deliberately number-free so it survives balance passes, and paraphrasing it here creates the second
truth H4 is about. A lesson that starts explaining a payoff chain has crossed the line.

## Lessons

| # | Archetype | Bar component | Resource terms to **link** | Constants |
| --- | --- | --- | --- | --- |
| 1 | 🔥 Feuer | `HeatBar.jsx` | `heat` · `glutdividende` · `whiteheat` | — |
| 2 | ⚡ Blitz | `ChargeBar.jsx` | `charge` · `ionize` · `stapel` · `kaskade` | `LIGHTNING_CRIT_BASE` · `LIGHTNING_CRIT_MULT_PER_SKILL` |
| 3 | ❄ Eis | `GlacierBar.jsx` | `glacier` · `masse` · `bersten` | `glacier.js` `THRESHOLDS` |
| 4 | 🌿 Pflanze | `PlantBar.jsx` | `growth` · `setzling` · `green` | `PLANT_VALUE_CAP` |

Read `ARCHETYPE_META` (`skills.js`) for names and colours; read `src/ui/guides.js` to see what the
Leitfaden already says, **so you can link to it instead of repeating it.**

## Lesson 3 carries a phase nobody listed

**Gletscher-Wahl** (`phase: "glacier-target"`) is a **mandatory step after every ice skill**: you
must pick exactly one card for the glacier. It has no glossary entry, it was on nobody's list, and a
first Eis run stops on it. One sentence inside lesson 3 (report §4).

## Deliberately not taught here — thirteen terms

`brand` · `ash` · `ashglow` · `forge` · `cluster` · `eisformation` · `freeze` · `wurzeln` ·
`bluete` · `trimmen` · `colonize` · `overgrowth` · `eternalSpring`

Every one is gated behind holding a specific skill. Teaching all thirteen would be writing a fifth
Leitfaden in the tutorial's voice — the exact failure H4 names. The glossary has them; the card that
grants them names them; the Leitfaden argues them.

## Non-goals

| Non-goal | Why |
| --- | --- |
| Rewriting or paraphrasing `src/ui/guides.js` | Owner decision 3 — it stays and is **linked** |
| Build advice, archetype mixing strategy, "Mono lohnt sich" | Leitfaden |
| The legendary skills of each archetype | S3 lesson 6 (T5) covers the Legendär-Phase as a mechanic |
| Eis-Formationen (glacier geometry) | Named in the glossary as a *reserved* term; out of scope here |

## Acceptance gate

> Four lessons at 390 × 844 in both languages with **0 px overhang and nothing clipped**; each links
> its Leitfaden rather than paraphrasing it; the glacier pick is covered; no lesson describes a
> skill-gated effect as an archetype property.

## Expected file surface

```
src/ui/tutorial-sections/catalog.js      the S4 entries
src/i18n/de.js, src/i18n/en.js           ~28 keys each
test/tutorial-sections.test.js           extend — add the Leitfaden-link assertion below
```

**Add one guard:** every S4 lesson carries a link to `GuideOverlay` for its archetype. It is cheap,
it is a relationship rather than a spelling, and it is the mechanical half of the rule this whole
section is about.

## Known hazards

| | Hazard | What to do |
| --- | --- | --- |
| **A** | **The strongest pull in the whole workstream is to write a good short guide here.** It will read well and it will be wrong. | Three questions, then link. If a lesson runs long, that is the symptom. |
| **B** | `text-style-guide.md` §3 — *Voraussetzungen nennen* — names `src/ui/guides.js` as the file that has historically sold skill-gated effects as archetype properties. | Every sentence about an effect names the skill it hangs on, or describes only the bar. |
| **C** | The four bars are live components under active design. | Link or embed the real component; do not draw a lookalike that will drift. |
| **D** | Ice numbers live in `glacier.js`, not `constants.js`, and `glossary.js` imports them for exactly this reason. | Import from `glacier.js` the same way `glossary.js` does. Its header comment records that there is no import cycle. |

## Definition of done

- [ ] 4 lessons, both languages, V1–V4 at 390 × 844
- [ ] 0 px overhang and nothing clipped on every one
- [ ] Each lesson links its Leitfaden; guard added and passing
- [ ] Gletscher-Wahl covered in lesson 3
- [ ] No skill-gated effect described as an archetype property
- [ ] None of the thirteen omitted terms explained here
- [ ] `npm test` · `lint --max-warnings=0` · `build` · `gen:db` · `loc:export`
- [ ] No diff under `src/game/**`
- [ ] Committed and pushed
