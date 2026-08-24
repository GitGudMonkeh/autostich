# T8 — S6 · Nach dem Lauf

**Branch `task/tut-s6-nach-dem-lauf` · Tier C · base `feature/tutorial-sections` · needs T1**
Shared rules incl. the lesson contract: [`README.md`](README.md).

What the run pays and what it feeds. *Estimated:* **4 lessons, ~28 catalogue keys per language.**
The smallest section, carrying the currency trap that cost this planning session a wrong claim.

## The currency, and why it needs its own warning

**SP and TP are the same currency in two languages.** Verified:

```
de.js:461   "common.cur.sp": "SP"     (Stichpunkte)
en.js:448   "common.cur.sp": "TP"     (Trick Points)
en.js:167   "gameover.sp":   "Trick Points"
```

`docs/localization/i18n.md` §4 — one German word maps to exactly one English word, and *Stich* is
*trick*. So the hub says "Bonus TP" in English and "Bonus SP" in German, correctly, from one key.

**The rule: write the currency as `t("common.cur.sp")`, never as a literal.** A hard-wired `"SP"`
would read as a typo in the English build, and the `MIGRATED` ratchet would **not** catch it — that
guard looks for words, and `SP` is a plausible code token, not a German word. This is the one place
in the whole workstream where the automated net has a hole, so it is on your checklist below.

**DP is DP in both** (`de.js:462` / `en.js:449`) — but write it through the key anyway, so the two
currencies are handled the same way and nobody has to remember which is which.

## Lessons

| # | Lesson | Beat 2 | Glossary terms to **link** | Constants |
| --- | --- | --- | --- | --- |
| 1 | Der Endscreen — Score-Herkunft, Build, **Geist** | Bild | `scoreherkunft` · **`geist`** | — |
| 2 | Meilensteine, SP und DP — und wie du sie einsetzt | Bild | `stichpunkte` · `deckpunkte` | `SP_PER_RUN` · `SP_MILESTONES` · `SP_LOYALTY_*` |
| 3 | Upgrade-Baum und Deck-Werkstatt | Bild | `upgradebaum` · `kosmetik` | — |
| 4 | Ranglisten-Lauf, Wochen-Modifikator, Bestenliste, Chronik | Bild | `rankedrun` · `weekmod` · `bestenliste` · `chronik` | — |

**Bold** = an owner-approved gap. The *Geist* is your saved best run, flashing up every few tricks
as a benchmark — a new player sees it during their first run and has no idea what it is.

## Deliberately not taught here

- **`challenger` / Seed** — for players who already share runs.
- **`statshub`** — a screen, not a mechanic; it explains itself.

## What the tutorial must not promise

Owner decision, question 3, answered **nein**: **the tutorial pays nothing.** No SP, no DP, no
unlock, no gate. Lesson 2 explains how the *run* pays; it must not imply that finishing the tutorial
does. The onboarding chain that could have carried a reward stays inert — reviving it would silently
cut a new player's first six runs of **both** SP and DP, because `dpForRun` also gates on `isSpRun`
(`progression.js:355`).

## Non-goals

| Non-goal | Why |
| --- | --- |
| A reward for finishing the tutorial | Owner decision, question 3 |
| Touching `ONBOARDING_LINKS` or anything around it | H1, and it is `src/game/` — Tripwire 1 |
| Explaining the upgrade tree node by node | The tree explains itself; this is a pointer |
| Cosmetics catalogue detail | `kosmetik` links the glossary |

## Acceptance gate

> Four lessons at 390 × 844 in both languages with **0 px overhang and nothing clipped**; **no
> literal "SP" or "TP" appears in any string**; no lesson implies the tutorial pays anything.

## Expected file surface

```
src/ui/tutorial-sections/catalog.js      the S6 entries
src/i18n/de.js, src/i18n/en.js           ~28 keys each
test/tutorial-sections.test.js           extend — add the currency guard below
```

**Add one guard:** no `tut.*` string contains a bare `SP` or `TP` token. It closes the hole the
`MIGRATED` ratchet cannot see, it is a relationship rather than a spelling, and it protects every
later section too — not just this one. **Counter-check it** (`testing.md` §5): plant a literal,
prove it goes red, remove it.

## Known hazards

| | Hazard | What to do |
| --- | --- | --- |
| **A** | **The SP/TP trap.** It reads as a typo, survives the ratchet, and only shows in the English build. | The guard above. Do not rely on care. |
| **B** | `SP_PER_RUN` is 5 and its comment records that this **deliberately diverges** from `docs/progression-decisions.md` §6 (+1/run), by owner decision 2026-08-23. | Interpolate the constant. Do **not** read the number out of the design document — it is stale on purpose, and the code comment says so. |
| **C** | Lesson 4 describes four meta screens that the menu rebuild is currently changing. | Say what each is *for*; do not describe its current layout. Owner decision 5 puts desktop after that rebuild, and a layout description would age before it ships. |
| **D** | `weekMods` change weekly by design. | Explain that modifiers exist and where to read the current one. Never name one. |

## Definition of done

- [ ] 4 lessons, both languages, V1–V4 at 390 × 844
- [ ] 0 px overhang and nothing clipped on every one
- [ ] Currency written through `t("common.cur.sp")` / `…dp` everywhere
- [ ] Currency guard added **and counter-checked** (the red run recorded)
- [ ] Nothing implies the tutorial pays a reward
- [ ] Every number interpolated; `SP_PER_RUN` from the constant, not from the design doc
- [ ] `npm test` · `lint --max-warnings=0` · `build` · `gen:db` · `loc:export`
- [ ] No diff under `src/game/**`
- [ ] Committed and pushed
