# T5 — S3 · Perks & Skills

**Branch `task/tut-s3-perks-skills` · Tier C · base `feature/tutorial-sections` · needs T1**
Shared rules incl. the lesson contract: [`README.md`](README.md).

The choices a run actually asks you to make. *Estimated:* **6 lessons, ~42 catalogue keys per
language.** Four of the owner's nine approved gaps live here.

## Lessons

| # | Lesson | Beat 2 | Glossary terms to **link** | Constants |
| --- | --- | --- | --- | --- |
| 1 | Perks — Angebot, **Kategorien A–E**, Ablehnen | Bild | `perk` · `familie` · `stufe` · **`kategorien`** · `farbserie` | `PERKS_OFFERED` |
| 2 | **Rarität** und Legendäre | Bild | **`raritaet`** · `legendaer` | `RARITY_WEIGHTS` · `TIER_META` |
| 3 | **Neuwurf** — drei Vorräte, kein Nachschub | Bild | **`reroll`** | `BASE_REROLLS` |
| 4 | Skills — Angebot, Slots, Aktivierung | Bild | `skillrunde` · `skillslot` · `archetyp` | `SKILLS_OFFERED` · `SKILL_SLOTS` · `MAX_ARCHETYPES` · `FIRST_SKILL_CYCLE` |
| 5 | Konsument, Verstärker, Bekenntnis | Bild | `consume` · `bekenntnis` · `ueberlauf` | `SKILL_SLOTS` |
| 6 | **Legendäre Skills und die Legendär-Phase** | Bild | `legskill` | `LEG_PHASE_CYCLE` |

**Bold** = an owner-approved gap (report §4).

## The two phases nobody listed — they belong in lesson 1

A first run stops dead on these and today the only explanation is one sentence from the guided run,
which T2 is deleting:

- **Ziel-Auswahl** (`phase: "target"`) — a perk asks you to tap N cards.
- **Familien-Ziel** (`phase: "family-target"`) — a family asks for a colour, a card or a formation
  type.

Neither has a glossary entry. Both are *phases*, not mechanics, which is why the glossary check did
not catch them and the phase table in `docs/tutorial-guided-run-plan.md` §4 did. One sentence each,
inside lesson 1, is enough — but they must be there.

## Rarity is four names, not three — and do not trust the style guide's list

`RARITY_WEIGHTS` has three keys (`common` · `rare` · `legendary`); `TIER_META` in
`src/game/rarity.js` carries **four** display names. **Read that file. Do not copy the list out of
any document, including this brief.**

> **Measured, and it is a live drift.** `docs/text-style-guide.md:45` lists the rarities as
> *"Normal · Selten · Sehr selten · **Rar**"*. `TIER_META` says **Episch** — `rarity.js:14` records
> the rename and the reason: *rar* and *selten* are synonyms, so the ladder climbed backwards.
> The style guide's own instruction — *"Namen aus `TIER_META`"* — is correct; its example list is
> stale. That is §4's drift, inside §4's own document.
>
> **Do not fix it in this task** (out of scope, and it is a shared document). It is filed as a
> follow-up in [`../planning-report.md`](../planning-report.md) §9.

`*Ungewöhnlich*` was a rarity name that lived in documents and not in the code, and is why the
"generate enumerations from the register" rule exists at all.

## Deliberately not taught here

- **`upgradetyp`** (Regelersetzung · Kumulativ · Rolle) — a rules-lawyer distinction that is on the
  card and in the glossary.
- **`opfergabe`** — one perk's drawback.
- **The five Präzision families** (`praez_sharp` · `praez_force` · `praez_aim` · `praez_lens` ·
  `praez_color`) — five named perk families, read on the perk card. Lesson 1 of S1 already said
  crit-chance comes from Präzision and from Blitz; that is the level a tutorial owes.

If writing lesson 1 convinces you a category needs its own lesson, say so in the handoff. Do not
quietly grow the section.

## Non-goals

| Non-goal | Why |
| --- | --- |
| What each archetype *does* | S4 (T6). This section teaches how you acquire skills, not how Feuer plays. |
| Strategy — which perks to take | That is the Leitfaden's job (owner decision 3) |
| Individual perk or family effects | 20 families; the glossary and the card carry them |

## Acceptance gate

> Six lessons at 390 × 844 in both languages with **0 px overhang and nothing clipped**; the two
> unlisted phases are covered; rarity names come from `TIER_META`; every offer count is interpolated.

## Expected file surface

```
src/ui/tutorial-sections/catalog.js      the S3 entries
src/i18n/de.js, src/i18n/en.js           ~42 keys each
test/tutorial-sections.test.js           extend
```

No probe file: this section is about reading offers, and a Probierfeld that fakes an offer would be
a re-implementation of `buildOffer` — the thing the architecture forbids.

## Known hazards

| | Hazard | What to do |
| --- | --- | --- |
| **A** | Nearly every number here is `envNum`-tunable (`SKILLS_OFFERED`, `SKILL_SLOTS`, `PERKS_OFFERED`, `BASE_REROLLS`, `MAX_ARCHETYPES`). | Interpolate all of them. `SKILL_SLOTS` is 6 today and the perk *Meisterhand* raises it to 7 at runtime — so write "höchstens {slots}" phrasing that survives the perk, as `glossary.js` already does. |
| **B** | `MAX_ARCHETYPES` is 4 and `SIM_MAX_ARCHETYPES` can set 3. | Do not write "alle vier" as prose. |
| **C** | Lesson 5 must not sell a skill-gated effect as an archetype property. | `text-style-guide.md` §3 — *Voraussetzungen nennen*. Name the skill in the sentence. This is the rule the Leitfaden violated once and it is called out by name in the style guide. |
| **D** | `BASE_REROLLS` is the *ranked* value; the upgrade tree raises it. | The glossary entry `reroll` already words this correctly. Match its phrasing rather than inventing a second one — that is Tripwire 2 in its subtle form. |

## Definition of done

- [ ] 6 lessons, both languages, V1–V4 at 390 × 844
- [ ] 0 px overhang and nothing clipped on every one
- [ ] Ziel-Auswahl and Familien-Ziel covered in lesson 1
- [ ] Rarity names read from `TIER_META`; no typed list
- [ ] Every count interpolated; no literal in a sentence
- [ ] No skill-gated effect described as an archetype property
- [ ] `npm test` · `lint --max-warnings=0` · `build` · `gen:db` · `loc:export`
- [ ] No diff under `src/game/**`
- [ ] Committed and pushed
