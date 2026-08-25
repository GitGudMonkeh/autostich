# `tut-inhalte` — handoff

All six sections, 34 lessons, both languages. Contract: [`task-contract.md`](task-contract.md).

## Gates — run bare

| Gate | Result |
| --- | --- |
| `npm test` | **exit 0** — 140 files, 2161 tests |
| `npm run lint -- --max-warnings=0` | exit 0 |
| `npm run build` | exit 0 |
| `npm run build` with `VITE_PREVIEW=1` | exit 0 |
| `npm run gen:db` | exit 0 |
| `npm run loc:export` | exit 0 |
| `git diff src/game/` | **empty** — tripwire 1 holds |

## Measured — every lesson, both languages, 390 × 844

**68 lesson views. 0 overhang · 0 clipped · 0 sideways scroll · 0 tap targets under 44 px.**
Reproduce with [`evidence/measure-all.mjs`](evidence/measure-all.mjs); raw rows in
[`evidence/measurements.json`](evidence/measurements.json).

| Section | Lessons | Tallest (German) |
| --- | --- | --- |
| S1 Grundlagen | 8 | 327 px |
| S2 Aufstellung | 6 | 363 px |
| S3 Perks und Skills | 6 | 181 px |
| S4 Die vier Archetypen | 4 | 245 px |
| S5 Der Architekt | 6 | **382 px** |
| S6 Nach dem Lauf | 4 | 160 px |

Budget is 400 px. The tallest lesson in the whole tutorial uses 96 % of it; the median is well under
half. German is taller than English everywhere, as the budget assumes.

## What went wrong, and what it cost

**The guard passed a lesson that was 86 px over budget.** First measurement: 486 px for *Struktur und
Distrikt*. The model priced **every** Probierfeld at 215 px, and the architect board is far taller
than a row of cards. A guard that waves a budget through is worse than no guard, so the model is now
**per building block** — `PROBE_PX = { formation, streak, score, board }`, with an unknown block
costing the highest known value so a guess falls against the budget rather than against the reader.

Then the board itself: three rows → two. Two rows still show a full row (a structure) and a
neighbour (a district), and the sentence says how big the real board is. That took 486 → 424. Two
sentences trimmed took it to 382.

**The architect board wore the formation probe's words.** The screenshot showed *"PROBIERFELD · EIN
SEGMENT"* and *"keine Formation"* on a board of buildings — formation vocabulary on architect
geometry, which `text-style-guide.md` §1e forbids by name and this workstream's Tripwire 2 exists to
catch. Every probe now carries **its own** labels, and a new guard asserts no architect text uses the
word.

> **That guard needed one exception, and it is the interesting kind.** *Sakralbauten* really do act
> on card formations (`architect.js:13` — "biegt computeFormations für abgedeckte Positionen"), so
> the word is correct there. The exception is a named list with the reason, plus a second test that
> the exception **still matches something** — a stale exception weakens the rule silently. Same shape
> as `test/overlay-nesting.test.js`.

**The Probierfeld taught the opposite of its lesson.** T1 flagged it; this task fixed it. The old
start state stood at ×1,88, and the obvious move — three nines in a row — *lowered* it to ×1,50,
because two overlapping formations beat one longer one. The new start stands at **×1,00, "keine
Formation"**: of the ten possible swaps, **six** produce a formation and none can make it worse,
because there is nothing to lose. Found by running candidate orders through `computeFormations`, not
by reasoning about it.

**Two dead catalogue keys, caught by the parity guard.** `streak.none` and `score.none` were an
em dash in both languages, because those two probes have no empty state — a streak of 0 is still a
number. Deleted rather than parked in `SAME_OK`.

**One terminology break of mine:** the S6 subtitle said *Rangliste* / *leaderboard*. The glossary
separates `rankedrun` from `bestenliste`, and the i18n guard enforces the mapping. Now
*Ranglisten-Lauf* / *ranked run*.

## Register

The owner's constraint — *"so einfach und simpel wie möglich"* — as applied: short main clauses, no
stacked subordinates, everyday words, glossary terms **used** and never re-defined, numbers only
where they carry meaning and always interpolated. One sentence shape throughout: condition → effect.

The same rule is stated twice on purpose, in the same words, in S2 (*"Der Multiplikator zählt nur,
wenn du den Stich gewinnst"*) and S5 (*"Beides zahlt nur, wenn du den Stich gewinnst"*). It is the
rule new players most often miss, and saying it identically in two places is cheaper than saying it
differently.

## Decisions

**One task instead of six.** Recorded in the contract: all six sections write into the same three
files, so six branches would have meant fifteen merges of one seam — and a consistent register holds
better in one pass. The six briefs stayed binding as content specifications.

**The Leitfaden link is not a fifth beat.** The archetype lessons carry it in the **Bild** slot as a
`guideFire`/`guideLightning`/… block. A fifth beat kind would have needed a `design-sprache.md` §11
entry first; this needed nothing. The lessons link the guide and never paraphrase it — three
questions each (what is the resource, what does it do, where do I read more) and out.

**Probe names are identifiers, not strings.** `guideFire`, not `"guide-fire"`: a quoted key with a
hyphen is invisible to the guard that checks a probe name exists, and loosening the guard to accept
quotes would have been the wrong repair.

## Open

1. **`docs/design-sprache.md` §11 mentions ~180 px of leftover air as the "thin on content"
   threshold**, measured when the topic list had two placeholder sections. It now has six. Worth
   re-measuring the topic list and correcting §11 if the number no longer earns its place.
2. **The 44 px scoped rule** (`.tut-card .as-actbtn`) still waits on §11's app-wide decision. If it
   goes app-wide, delete the scoped rule rather than leaving the number in two places.
3. **Not measured:** anything other than 390 × 844, and the archetype lessons' guide link was
   verified to render but its target overlay was not re-measured — `GuideOverlay` is unchanged and
   pre-existing.
