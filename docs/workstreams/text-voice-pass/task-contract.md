# Task contract — text-voice-pass

Tier **B**. The pass itself would be A; it is B because it adds a rule to
`docs/text-style-guide.md` that outlives the pass and binds every text written after it.

## Placement

| Field | Value |
| --- | --- |
| Branch | `task/text-voice-pass` |
| Base | `origin/dev` @ `47020403041c97f70022b1a11c7770970e83821c` |
| Concurrency | one writer; sequential sessions may continue the task in the same worktree |
| Worktree | `C:/Code/Autostich-worktrees/text-voice-pass` |
| Branch checked out there | `task/text-voice-pass` |
| Upstream | none — the branch deliberately does not track its base |
| Preview port | 5194 |
| Preview URL | http://localhost:5194 |
| Server invocation | `npm run dev -- --port 5194 --strictPort` |

Note on the branch prefix: `create-task` derives `feature/<slug>` for Tier B, but the planning
order specifies `task/text-voice-pass`, and repository practice agrees — `feature/*` is an
integration branch carrying `task/*` below it (`feature/desktop-menus`), while standalone tasks
are `task/*`. The order was followed and the skill table is flagged as probably inverted.

## Staffing

| Role | Who |
| --- | --- |
| Owner | Repository owner (GitGudMonkeh) — settled the decision block before implementation |
| Integrator | This Claude Code session, on the owner's explicit instruction |

No reviewer row: no independent review was requested. Review is optional and risk-based
(`AGENTS.md` — *Independent review*).

## Goal

Player-visible text reads as the product rather than as a language model, in both languages, and
the rule that makes it so is written into `docs/text-style-guide.md` so later text already
complies.

## Scope

- Remove the em-dash (`—`) from player-visible strings in both languages. Every one that stays
  is named and justified in the report; the default is removal, not deliberation.
- Enforce the parts of the style guide that were written and never applied: §1 canonical terms
  and §3 sentence shape.
- Add the dash rule to §3 of `docs/text-style-guide.md`, in German (H6).

Measured inventory at base (`docs/localization/strings_de_pixi_2026-08-15.csv`, regenerated):
2797 player strings; 221 German rows with an em-dash (230 occurrences), 222 English rows (231).
93% are one pattern — an appended clause after `" — "`; 9 are paired-dash insertions; 3 are
line-initial.

## Non-goals

| Non-goal | Why |
| --- | --- |
| Engineering text, code comments, `docs/**` | Player-visible text only |
| Renaming canonical terms | §1 fixes them; unifying means applying, not re-choosing |
| Number formats | §2 settled |
| Balance, mechanics, meaning | Second tripwire |
| En-dashes in numeric ranges (`4–7`) | Correct German typography, not a tell |
| Effect jargon without an established German equivalent | Renaming, which is a non-goal above |

## Approved architecture

**Scope correction against the order.** The order scopes the pass to `src/i18n/de.js` and
`en.js`, reading the CSV `category` column. That column records the export path, not the source
file: `de.js` imports from `src/game/*` and passes register text through. Measured by locating
every em-dash string literally, the German side is:

| Area | German | n | English | n |
| --- | --- | --- | --- | --- |
| UI catalogue | `src/i18n/de.js` | 100 | `src/i18n/en.js` | 100 |
| Guides | `src/ui/guides.js` | 42 | `src/i18n/enGuides.js` | 42 |
| Glossary | `src/game/glossary.js` | 35 | `src/i18n/enGlossary.js` | 36 |
| Skills | `src/game/skills.js` | 11 | `src/i18n/enSkills.js` | 10 |
| Cosmetics | `src/game/themes.js` | 9 | `src/i18n/enCosmetics.js` | 9 |
| Families | `src/game/families.js` | 4 | `src/i18n/enFamilies.js` | 4 |
| Singles | `engine.js`, `weekMods.js`, `App.jsx`, `modalStyle.jsx` | 1 each | `enMeta.js` | 1 |
| Composed at runtime | template literals in `skills.js` | 18 | same | 19 |

German is the source locale and lives with the registers; English is fully extracted into
`src/i18n/**` and mirrors it one to one. Every German edit therefore has exactly one English
counterpart, and the key-parity and terminology guards enforce the pairing.

**Batching.** One batch = one area = a German file with its English counterpart, so the parity
guards can run after each. Batch 7 last, because every line there is a template literal with an
interpolated constant and is the only group carrying real drift risk.

| # | Batch | Size (de + en) |
| --- | --- | --- |
| 1 | Cosmetics + families | 30 |
| 2 | Glossary | 35 + 36 |
| 3 | Guides | 42 + 42 |
| 4 | UI catalogue A | ~50 + 50 |
| 5 | UI catalogue B | ~50 + 50 |
| 6 | Skills, literal | 11 + 10 |
| 7 | Skills, interpolated | 18 + 19 |

Batches 1–6 and batch 7 land as separate commits so batch 7 can be rolled back alone.

**Replacement vocabulary.** Four tools cover the corpus: full stop (two sentences), colon
(announcement → resolution), comma (trailing apposition), parentheses (insertion). Where none of
them reads well, the sentence is rebuilt. Rejected: a mechanical global replacement of `" — "`
with a fixed character. It would have produced a uniform substitute tic in place of the current
one, which is the same failure with different punctuation.

**Recording a kept dash.** `docs/localization/text-voice-keep.txt`, one line per key with the
reason. Rejected: an in-source marker such as `/* keep-dash */` — it reads as new text to the
source-text ratchets, and it does not travel when a key moves.

## Tripwires

1. **A hyphen between two word characters changes** — stop. Regex `(?<=\w)-(?=\w)`. 537 German
   rows carry one and practically all are compounds; a broken compound reads as a typo, not as a
   bug, which is why this is the one failure that would pass silently.
2. **A text's claim changes rather than its form** — stop. That is `docs/desc-check.md`, not this
   pass.

## Task-specific inputs

- `docs/text-style-guide.md` §1 and §3 — the rules being enforced
- `docs/localization/strings_de_pixi_2026-08-15.csv` — the inventory and the baseline
- `docs/desc-check.md` — the boundary to a meaning change
- `test/i18n-guards.test.js` — which keys are pinned verbatim

## Expected file surface

`src/i18n/{de,en,enGuides,enGlossary,enSkills,enCosmetics,enFamilies,enMeta}.js`,
`src/ui/guides.js`, `src/game/{glossary,skills,themes,families,weekMods,engine}.js`,
`src/App.jsx`, `src/ui/modalStyle.jsx`, `docs/text-style-guide.md`,
`docs/localization/text-voice-keep.txt`, plus a new check script and the regenerated CSV.

## Known hazards

**H1 — the hyphen.** Tripwire 1. The largest single hazard.

**H2 — guards with verbatim strings.** Smaller than the order assumed: all 24 verbatim
assertions in `test/i18n-guards.test.js` were checked and **none pins a string containing an
em-dash**. The guards are mostly an asset here — key parity and terminology mapping force the
English counterpart to be edited too. A pinned key is still a stop, never a wave-through.

**H3 — text length is layout.** Measure in the real build (`scripts/cdp.mjs`,
`scripts/phone-proof.mjs`) at 390×844 and 1280×720; mark every number *measured*, *derived* or
*estimated*.

**H4 — interpolated numbers.** Batch 7. A rewritten line keeps its template literal; baking the
number in creates exactly the drift §4 forbids.

**H5 — family patterns.** Narrow in practice: only 4 family texts carry an em-dash, all four
tiers of `E_COLOR_ALLIANCE`. They get one identical treatment.

**H6 — the guide is German with a fixed template.** The new §3 entry stays German
(`AGENTS.md` — *Appending to an existing German document*).

**H7 — volume.** 2797 strings. Handled by the batching above.

**H8 — source-text ratchets.** Much of the suite reads `src/**` as text.

**H9 — localisation gate.** `npm run loc:export` runs in every task; the CSV it produces is the
evidence, not only a gate.

**H10 — `*.match` keys (found during planning, absent from the order).** The glossary bolds terms
via recogniser lists that deliberately contain the variants §1 forbids —
`glossary.archetyp.match = "Archetyp|Archetypen|Archetyps|Fraktion|Fraktionen"`,
`glossary.kartenwert.match = "Kartenwert|Dauerwert"`. "Correcting" them silently switches the
bolding off; no test fires. `*.match` keys are excluded from the §1 pass categorically.

## Acceptance gate

A diff of the regenerated CSV against the base version shows no em-dash left in any player
string except those named and justified in the report, and not one hyphen inside a compound
touched.

Machine-checked by `scripts/text-voice-check.mjs`, three assertions with exit codes:

1. every remaining `—` appears in `text-voice-keep.txt`;
2. the multiset of hyphenated words matching `(?<=\w)-(?=\w)` is identical before and after,
   which also catches an accidentally *added* hyphen;
3. per key, the set of numbers in the text is unchanged.

## Definition of done

- Acceptance gate green.
- Gates green: `npm test`, `npm run lint -- --max-warnings=0`, `npm run build`, `npm run gen:db`,
  `npm run loc:export`.
- §3 of the style guide carries the dash rule, in German.
- §1a carries the `Slot` exception (owner decision 2).
- Per batch, a short note on which §1 and §3 rules were applied and where one deliberately was
  not. Not a gate.
- Layout measured at 390×844 and 1280×720, every number labelled.

## Owner decisions taken before implementation

1. **English follows the same rule at the same strength.** The English strings are one-to-one
   mirrors carrying the same 219 appended clauses in the same places — translated, not grown, so
   they carry the same tic.
2. **`Slot` stays for skills**, and §1a gains an exception entry (`Slot — nur in *Skill-Slot*`).
   §1a forbids "Slot" and points at "Position", but §1e reserves "Position" for the fixed card
   position 1–40; "Skill-Position" would be the double-loading §1e exists to prevent.
3. **One task**, with batch 7 in its own commit.

## Status at integration

Complete. The acceptance gate passes: no unlisted em-dash, compounds intact, no number drift,
five booked exceptions. 221 -> 0 German and 222 -> 0 English em-dash rows across 2797 strings.

Every Definition-of-Done item is met. Layout was measured in the real build at both constrained
viewports rather than reasoned about, and the pass turns out to make the corpus 367 characters
SHORTER, so the hazard it guarded against did not materialise.

## Open questions

None blocking. Four items are recorded in the planning report for elsewhere rather than decided
here: the terminology guard's blindness to a violation both languages share; the §1a/`TIER_META`
disagreement on rarity names; the 47 arrow-notation strings §3 arguably covers; and the hard-coded
date in the inventory filename.
