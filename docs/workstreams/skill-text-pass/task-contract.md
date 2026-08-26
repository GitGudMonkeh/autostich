# Task contract — skill-text-pass

**Tier B.** Scaffold produced by `/create-task`. Every section below marked `TODO` requires a human
decision and was deliberately left blank — a plausible guess there reads as a decision nobody made.

## Identity

| Field | Value |
| --- | --- |
| Branch | `task/skill-text-pass` |
| Base | `origin/dev` @ `9dde9bfdd255e8d836572d291fd5fd2d052eef58` |
| Upstream | none — the branch deliberately does not track its base |
| Concurrency | one writer; sequential sessions may continue the task in the same worktree |
| Owner | TODO — name the owner (`AGENTS.md` — *Roles and source of truth*) |
| Integrator | TODO — name the integrator (`AGENTS.md` — *Roles and source of truth*) |

No reviewer row: an independent review was not requested for this task. Review is optional and
risk-based (`AGENTS.md` — *Independent review*); add the row here if one is commissioned later.

**Note on the branch prefix.** `/create-task` derives `feature/<slug>` for Tier A/B and
`task/<slug>` for Tier C. This branch uses `task/` because the task brief named it explicitly, and
because every neighbouring task branch (`task/text-voice-pass`, `task/art-normalize`, `task/tut-*`)
follows the same shape. Recorded so the divergence from the default is visible rather than silent.

## Local workspace

| Field | Value |
| --- | --- |
| Worktree | `C:/Code/Autostich-worktrees/skill-text-pass` |
| Branch checked out there | `task/skill-text-pass` |
| Preview port | 5195 |
| Server invocation | `npm run dev -- --port 5195 --strictPort` |

Port 5195 is the lowest free integer from 5181 upward: 5180 is reserved for
`scripts/viewport-proof.mjs` (`NEW_MACHINE_SETUP.md` — *Preview server and ports*) and 5181–5194 are
already recorded in `docs/workstreams/**`.

## Scope

Rewrite the wording of 88 player-facing texts so a player understands them on first reading.
**Every text was settled with the owner, archetype by archetype, across five rounds before any line
was changed.** The agreed wording — old and new, both languages, with the source form carrying the
interpolated constants — is in `ledger.md` beside this file. That ledger, not this section, is the
line-by-line specification.

1. **Blitz** — 21 skill descriptions. 449 → 352 words DE.
2. **Eis** — 21 skill descriptions. 484 → 405 words DE.
3. **Feuer** — 21 skill descriptions. 492 → 470 words DE.
4. **Pflanze** — 21 skill descriptions. 456 → 451 words DE.
5. **The four archetype passives** — `skill.passive.*`. 171 → 158 words DE.

Two mechanical changes ride along, both settled in round 5:

- The Trimmen clause is hoisted to a single `const TRIMMEN` in `skills.js`, mirroring the `PRUNE`
  constant `enSkills.js` already has, and moves onto its own line via a `\n` in the six plant skills
  that carry it (`§4 — Einen Text an EINER Stelle bauen`).
- `docs/localization/text-voice-keep.txt` gains a third entry kind, `num <key> <lang> <a>-><b>
  <reason>`, with the matching branch in `scripts/text-voice-check.mjs`. Check 3 of that script has
  no escape hatch today, and this pass legitimately removes figures that only restated the words
  beside them. The bookings are listed in `ledger.md`.

**German is the source** (`SOURCE_LOCALE = "de"`, `src/i18n/index.js`). The English follows from the
**new** German, never from the old English.

## Non-goals and tripwire

| Non-goal | Why |
| --- | --- |
| Structure, new fields, changes to the selection UI | The text gets better in the field it already has |
| Balance, mechanics, behaviour | Shorter, never less true |
| Family, perk, building and glossary texts | They belong to `text-voice-pass` |
| Skill **names** | Descriptions and passives only |
| Renaming *Firn* → *Schnee* | Its own task; brief in `worker-firn-to-schnee.md`. It runs **first**, and the three ice texts that mention the resource are already written here with *Schnee* |

**Tripwire — if the diff touches `src/ui/**`, stop.** This round is text, not interface. The menu
rework holds ~138 unintegrated commits there; a reach into that tree is a conflict, not a bycatch.
Verified during round 5 that nothing here needs it: the bold rendering of *Trimmen* and the line
break both already work through `GlossaryText` (`SkillSelect.jsx:386`).

**Second tripwire — if a rewritten line hardcodes a tuning number that used to be interpolated,
stop.** That is the most likely failure of this task and it surfaces only at the next balancing
pass. See *Known hazards*.

## Approved architecture

- Wording only. No new field, no short-line-plus-detail split, no change to the selection screen.
- A claim removed is a silent rule change, not a simplification. Where a clause looked like flourish,
  it was checked against the engine before being cut — and three times it turned out to be load
  bearing (Kurzschluss's stacks, the commitment scaling on the Blitz legendaries, Pfahlwurzel's
  exclusion). Each such check is recorded in the ledger with its file and line.
- Canonical vocabulary (`docs/text-style-guide.md` §1) is not traded for everyday words. Where the
  owner deliberately dropped a canonical term (*Bekenntnis*, `Überlauf-Wachstum`, *Mono-Pflanze*),
  the decision and its consequence are booked in the ledger.
- Numbers stay interpolated from `constants.js` / `glacier.js`. Where a figure was removed, it was
  removed because the words beside it already said it — never to simplify the template.

## Task-specific inputs

Measured at the base SHA, on the resolved text with constants interpolated:

| | texts | DE before | DE after | |
| --- | --- | --- | --- | --- |
| Blitz | 21 | 449 | 352 | −22 % |
| Eis | 21 | 484 | 405 | −16 % |
| Feuer | 21 | 492 | 470 | −4,5 % |
| Pflanze | 21 | 456 | 451 | −1,1 % |
| Passives | 4 | 171 | 158 | −8 % |
| **Total** | **88** | **2052** | **1836** | **−10,5 %** |

Longest text in the game: 51 → 36. Texts carrying a parenthesis: 54 → 31.

The Blitz passive at 16 words is the yardstick — a text that already had the target shape, in the
same game, for the same kind of mechanic. It is not an invented target.

## Acceptance gate

> **Every one of the 88 texts is shorter than before — or its exception is written down with its
> word count and reason — and none of them claims anything different than before.**
>
> Evidenced by the before/after tables per archetype in `ledger.md` and by the diff of the generated
> CSV. "Reads better" is not evidence; the word count and the unchanged numeric content are.

Reproduce:

```bash
npm test
npm run loc:export
node scripts/text-voice-check.mjs --baseline 9dde9bfdd255e8d836572d291fd5fd2d052eef58
```

**The exceptions, each with its number and reason** — Abbruchkante 18→19 · Sonnenzorn 31→32 ·
Damaststahl 29→35 (EN 35→38) · Mutterbaum 29→31 · plant passive 46→48 · Dauerstrom 24→24 ·
Feuersturm 16→16 · and 26 texts left unchanged. Dauerfrost (47→42) and Sonnenkern (42→41) are the
honest non-results: wording alone does not bring them near the yardstick, and no structural change
was in scope.

## Expected file surface

**Expected to change**

    src/game/skills.js                       84 desc fields + const TRIMMEN
    src/i18n/enSkills.js                     84 ability.*.desc + PRUNE
    src/i18n/de.js                           skill.passive.fire / .ice / .plant
    src/i18n/en.js                           the same three keys
    docs/localization/text-voice-keep.txt    the num entry kind + this pass's bookings
    scripts/text-voice-check.mjs             the matching branch for that kind
    docs/localization/strings_de_pixi_*.csv  regenerated by loc:export — the evidence
    docs/workstreams/skill-text-pass/**      contract, ledger, worker brief, report

**Must not change** — provable by blob hash:

    src/ui/**            the tripwire
    src/game/engine.js   behaviour
    src/game/constants.js · src/game/glacier.js   the numbers themselves
    src/game/glossary.js · src/i18n/enGlossary.js  another pass's territory
    src/game/families.js · perks.js · architect.js · themes.js

## Known hazards

| | Hazard | Resolution |
| --- | --- | --- |
| H1 | **Interpolated constants.** Every description is a template literal. Baking a number into the prose while rephrasing produces exactly the drift `text-style-guide.md` §4 was written against, and it surfaces only at the next balancing pass. **The most likely failure of this task.** | Check 3 of `text-voice-check.mjs` compares the number multiset per key. The regenerated CSV is the proof. Each deliberate removal is booked with a reason. |
| H2 | **`desc-check.md`** — cutting a parenthesis often cuts a condition with it. | Every clause that read as a guarantee was checked against the engine before removal. Recorded per text in the ledger with file and line. |
| H3 | **Canonical terms** (§1a–§1e) must not be traded for everyday words. | Deviations are owner decisions, each booked with its consequence — including the glossary entry `bekenntnis` that is left orphaned. |
| H4 | **Form rules that already apply** (§3): condition → effect, "Verstärker: …", no self-reference, no arrow notation. Never enforced across these 84 texts. | Enforced here. Three self-references found (`kurzschließt`, `erstarrt`, and two false positives correctly left alone), one arrow notation (`→ ×2`). |
| H5 | **Literal guards.** `test/i18n-guards.test.js` pins wording. | Exactly one skill desc is pinned: `ability.SK_FIRE_L02.desc` (line 254). That text is deliberately unchanged, so the guard stays quiet. A guard that fires is **tightened, never weakened** (`AGENTS.md` — *Hazard*). |
| H6 | **Eis may not reach the target.** | It does not, and that is reported as measured fact: Dauerfrost 47 → 42. Four claims, three numeric, none removable without changing what the skill promises. |
| H7 | **Source-text ratchets.** Much of the suite reads `src/**` as text. | `npm test` is part of the gate. |
| H8 | **Localisation gate.** `npm run loc:export` runs in every task; the CSV is evidence, not just a gate. | Part of the reproduce block above. |

## Definition of done

- [ ] All 88 texts match `ledger.md` in both languages, with constants still interpolated.
- [ ] `const TRIMMEN` hoisted in `skills.js`; `PRUNE` updated in `enSkills.js`; the six plant skills
      carry the clause on its own line.
- [ ] `text-voice-keep.txt` carries the `num` entry kind and every booking listed in the ledger;
      `text-voice-check.mjs` honours it.
- [ ] `npm test` green.
- [ ] `npm run loc:export` regenerated, CSV diff attached to the report.
- [ ] `node scripts/text-voice-check.mjs --baseline <base SHA>` passes.
- [ ] Scope compliance proven by blob hash for every must-not-change path.
- [ ] Report written, with the exceptions table and the findings that were **not** shortenings.

## Open questions

- **`Firn` → `Schnee` must land before this branch is integrated.** The three ice texts here already
  say *Schnee*; until that task runs, the glossary still says *Firn*. Owner sequences it.
- **Glühende Klinge is missing a claim.** `de.js:217` (`bar.fire.badge.glow.title`) states a decay
  rule — *"bleibt ein Segment ohne, fällst du zurück"* — that the skill description never mentions.
  Reported, not acted on: adding it lengthens the text and writes a rule into a family this round
  only rewords. Owner decides whether it belongs here or in a follow-up.
- **`glossary.js:211` `bekenntnis` is now orphaned.** *Blitz-Bekenntnis* appeared in player text only
  in the two Blitz legendaries, and both dropped it on the owner's call. Glossary texts are a
  non-goal here, so nothing was touched.
- **`CardGrid.jsx:193` and `:200` carry hardcoded German tooltips**, one with a literal `12` against
  `G_THRESHOLDS`. Found while measuring the Firn blast radius; behind the `src/ui` tripwire, so
  reported only.
