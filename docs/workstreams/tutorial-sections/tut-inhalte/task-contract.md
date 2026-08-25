# Task contract — `tut-inhalte`

**Tier C · all six sections, in one pass.**

## Why one task and not six

The plan cut this as **T3–T8, six parallel tasks**
([`../tutorial-plan/tasks/README.md`](../tutorial-plan/tasks/README.md)). Recut to one, deliberately:

1. **All six touch the same seam.** Every section writes into `catalog.js`, `de.js` and `en.js` at
   the same place. Six branches would mean fifteen pairwise merges of exactly the conflict that T1
   and T2 already produced there once.
2. **One voice.** The owner's constraint is *"so einfach und simpel wie möglich"*. A consistent
   register across 34 lessons is something one pass holds and six passes negotiate.

The six briefs stay binding as **content specifications** — lesson lists, glossary terms to link,
constants to interpolate, what each section must not teach. Only the *packaging* changed.

## Identity

| | |
| --- | --- |
| **Branch** | `task/tut-inhalte` |
| **Base** | `origin/feature/tutorial-sections` @ `27f5307ab0440f56aeaf3352fbff129e7a979013` |
| **Owner** | repository owner | 
| **Integrator** | Claude Code |
| **Reviewer** | none requested |
| **Concurrency** | one writer |

## Local workspace

| | |
| --- | --- |
| **Worktree** | `C:/Code/Autostich-worktrees/tut-inhalte` |
| **Branch checked out there** | `task/tut-inhalte` |
| **Upstream** | none |
| **Preview port** | `5193` |
| **Production-build preview** | `npx vite preview --port 5193 --strictPort --base /autostich/` — `--base` mandatory |

## Scope

The six section briefs, in order, as content specifications:

| Section | Brief |
| --- | --- |
| S1 Grundlagen | [`T3-s1-grundlagen.md`](../tutorial-plan/tasks/T3-s1-grundlagen.md) |
| S2 Aufstellung | [`T4-s2-aufstellung.md`](../tutorial-plan/tasks/T4-s2-aufstellung.md) |
| S3 Perks & Skills | [`T5-s3-perks-skills.md`](../tutorial-plan/tasks/T5-s3-perks-skills.md) |
| S4 Die vier Archetypen | [`T6-s4-archetypen.md`](../tutorial-plan/tasks/T6-s4-archetypen.md) |
| S5 Der Architekt | [`T7-s5-architekt.md`](../tutorial-plan/tasks/T7-s5-architekt.md) |
| S6 Nach dem Lauf | [`T8-s6-nach-dem-lauf.md`](../tutorial-plan/tasks/T8-s6-nach-dem-lauf.md) |

Shared rules: [`../tutorial-plan/tasks/README.md`](../tutorial-plan/tasks/README.md).

## The register — owner constraint, 25.08.2026

> *"Versuche die Anleitung in deutsch und Englisch so einfach und simpel wie möglich zu halten."*

Binding, and testable where it can be:

1. **Short main clauses.** No stacked subordinate clauses.
2. **Everyday words.** A glossary term is **used**, never defined in the lesson — the glossary
   already defines it and Tripwire 2 forbids a second definition.
3. **Numbers only where they carry meaning**, and always interpolated from the constant.
4. **One sentence shape:** condition → effect (`text-style-guide.md` §3).
5. **Two sentences per Satz, and short ones.** The style guide already asks for one to two.

Approved sample (owner, same message):

> „Liegen deine Karten in einem Muster, zählt der Stich mehr. So ein Muster heißt Formation."
> *"When your cards form a pattern, the trick counts for more. That pattern is a formation."*
> **Tipp:** „Der Multiplikator zählt nur, wenn du den Stich gewinnst."

## Non-goals and tripwires

Both tripwires from the shared rules bind: **no `src/game/**` diff except to read**, and **no lesson
redefines a glossary term**.

| Non-goal | Why |
| --- | --- |
| Touching the shell, the beats or the guard | T1's territory; this task adds catalogue entries and text |
| Rewriting `src/ui/guides.js` | Owner decision 3 — the Leitfaden is linked, never paraphrased |
| A fifth beat kind | Needs a `design-sprache.md` §11 entry first |
| Desktop | Owner decision 5 |
| Video, voice, subtitles | Owner decision 4 |

## Acceptance gate

> Every lesson renders at 390 × 844 **in both languages** with **0 px overhang and nothing clipped**,
> the height guard passes, no number appears in a sentence that is not interpolated, and no lesson
> restates a glossary definition.

## Known hazards

| | Hazard | What to do |
| --- | --- | --- |
| **A** | 34 lessons is the largest single text addition the project has made — *measured:* about +250 keys per language, +21 % of `de.js`. | The 400 px budget is the brake. Write, then measure; do not measure at the end. |
| **B** | **The teaching example that teaches the wrong thing.** *Measured in T1:* the placeholder's starting order makes the obvious move **lower** the multiplier (×1,88 → ×1,50, two overlapping formations beating one longer one). | Choose every Probierfeld's start state so the intended move **improves** the readout. Verify by using it, not by reasoning about it. |
| **C** | Currency: `t("common.cur.sp")`, never a literal. SP and TP are the same currency in two languages. | The guard T8's brief asks for closes the hole the `MIGRATED` ratchet cannot see. |
| **D** | Rarity names come from `TIER_META`, not from any document — `text-style-guide.md:45` is stale and says "Rar" where the code says "Episch". | Read the register. |
| **E** | Architect: **Struktur** and **Distrikt**, never "Formation" — `text-style-guide.md` §1e reserves that word. | Tripwire 2. |

## Definition of done

- [ ] Six sections written, both languages
- [ ] Every lesson measured at 390 × 844 in both languages: 0 px overhang, nothing clipped
- [ ] Height guard green; no number typed into a sentence
- [ ] No glossary definition restated; archetype lessons link the Leitfaden
- [ ] Probierfeld start states verified by use (hazard B)
- [ ] `npm test` · `lint --max-warnings=0` · `build` · `gen:db` · `loc:export`
- [ ] No diff under `src/game/**`
- [ ] Committed and pushed
