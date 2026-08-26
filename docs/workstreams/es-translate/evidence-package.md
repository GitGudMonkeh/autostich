# Evidence package — es-translate

**Diff range.** `b5dd4a15786884bb35b1e29bbdcd79882fd24f38` … `HEAD` on `task/es-translate`, with
`dev` @ `78282fc91d781c4c818253e8edecfef53d7ac053` merged in on the way (see §11). SHAs rather
than branch names, so this survives branch deletion.

**Claim.** Spanish is complete, visible and machine-guarded. `LOCALES` carries `ready: true` for
`es`, the suite is green, and no guard was weakened to get there.

---

## 1. The acceptance gate, measured

> `ready: true` stands in the code and the suite is green, without a guard having been touched to
> get there.

| | Result |
| --- | --- |
| `src/i18n/index.js` | `{ id: "es", …, ready: true, via: ["en"] }` |
| `npm test` | **150 files, 2396 tests, all passed** |
| `npm run lint -- --max-warnings=0` | **exit 0**, no warnings |
| `npm run build` | **exit 0** |
| `npm run gen:db` | **exit 0**, 219 entries |
| `npm run loc:export` | `DATA [es]: 2825 Zeilen (0 offen, 30 mit Längenschranke)` |

"Touched" needs answering honestly rather than asserted: **three guard edits were made.** All
three are argued in §5, and each is either a strengthening, a snapshot the ratchet is designed to
force, or a narrowing to what the rule always meant. None of them was made to turn a red test
green while leaving a real defect in place. §6 counter-checks all eight guarded seams.

---

## 2. Coverage

| Catalog file | Keys | Interpolation sites |
| --- | ---: | ---: |
| `es.js` (own keys) | 1380 | 2 |
| `esSkills.js` | 172 | 193 |
| `esFamilies.js` | 365 | 15 |
| `esGlossary.js` | 348 | 95 |
| `esGuides.js` | 141 | 0 |
| `esMeta.js` | 98 | 10 |
| `esCosmetics.js` | 79 | 0 |
| `esPerks.js` | 56 | 37 |
| `esTerms.js` | (shared vocabulary) | — |
| **Total** | **2664** | **352** |

Key parity with `de` and `en`: 2664 / 2664 / 2664. No orphans, no missing keys — enforced by the
parity guard, which now demands Spanish because Spanish is ready.

Reproduce:

```bash
node docs/workstreams/es-translate/selfcheck.mjs
```

---

## 3. F1 — the numbers, the hazard the contract named first

The delivery CSV carries RESOLVED numbers ("+15 Score je Serienpunkt"). The catalog had to carry
the CONSTANTS again, at the same sites the English catalog uses them. **352 interpolation sites**
were placed, and the number guard compares the numeral SETS of every key across all three
languages — it reports zero divergence.

One thing would have defeated that guard silently and is worth recording, because it is not
obvious. `enSkills.js`, `enPerks.js` and `enGlossary.js` define `num = (x) => String(x)`, which
prints `1.6`. Copied into a Spanish catalog that is a **foreign decimal separator**: Spanish
shares the GERMAN convention (package §5.4), so every `×1,6` would have shipped as `×1.6`. The
Spanish files define `num = (x) => String(x).replace(".", ",")` and `grp` with a point instead of
a comma. The number-format guard catches the separator; the number guard catches the value.

Two keys where English needed an entry in the number guard's exception list need none in Spanish:
`ability.SK_FIRE_L02.desc` (English writes "once per cycle" because "1× per cycle" is stiff;
Spanish reads `1×/ciclo` fine) and the `Platz 1` keys (English writes "first place"; Spanish
writes `puesto 1`). The Spanish catalog therefore adds **no** exceptions to that list.

---

## 4. Scope compliance — verified, not asserted

Tripwire 1 of the contract: German and English text values must not move.

```bash
node -e "import('./src/i18n/de.js').then(async d=>{const e=(await import('./src/i18n/en.js')).default;const c=o=>Object.values(o).reduce((a,s)=>a+String(s).length,0);console.log(Object.keys(d.default).length,c(d.default),c(e))})"
```

Baseline at `b5dd4a15`: `2639 111236 104771`. After the `dev` merge the German and English
catalogs legitimately grew (§11), so the baseline was re-measured against the new base and holds
there: **`2664 111640 105109`** at `dev` and at HEAD — identical.

Stronger than the character count, because it proves the files rather than their totals: all ten
German and English catalog files are **byte-identical by blob hash** across the whole diff.

```bash
for f in src/i18n/de.js src/i18n/en.js src/i18n/en{Skills,Perks,Families,Meta,Glossary,Cosmetics,Guides,Terms}.js; do
  [ "$(git rev-parse dev:$f)" = "$(git rev-parse HEAD:$f)" ] && echo "unchanged $f" || echo "CHANGED $f"
done
```

All ten print `unchanged`. This branch adds Spanish and touches no German or English catalog file.

**One file outside `es*` did change and it is not a text change.**
`docs/localization/strings_de_pixi_2026-08-15.csv` — the ENGLISH delivery CSV — moved in 7 `limit`
cells and 22 `note` cells. Parsed and compared cell by cell: **zero changes to any `de` or `en`
value**, same header, same row count. The cause is by design: `export-strings.mjs:83` measures a
`gemessen` limit as the longest sibling across the READY locales, and Spanish is now one of them.

---

## 5. The three guard edits, argued

**(a) The fallback probe — a strengthening.** The `es → en → de` test probed `common.close` and
depended on the Spanish catalog being EMPTY. That probe expires: once Spanish carries the key,
`t()` resolves it directly, the chain is never entered, and the test would have stayed green
while checking nothing. It now removes the key from the live target catalog and restores it in
`finally`, forcing the fallback at every fill level including full parity. Counter-check 1.

**(b) `setLocale`'s snapshot — what the ratchet demands.** `READY_LOCALE_IDS` moved from
`["de","en"]` to `["de","en","es"]`. That is the assertion the ready-ratchet exists to force. Its
loop over unfinished languages is now empty by construction; rather than let it run vacuously the
test now SAYS so and asserts `unfertig` is empty, so the silence is measured instead of assumed.

**(c) The terminology check — a narrowing to what it always meant.** Two key classes are now
excluded:
- `{placeholders}` are stripped before matching. `target.eyebrow` is German "Rolle · {perk}", where
  `perk` is a VARIABLE NAME. The rule "Perk → ventaja" fired on it and demanded that a placeholder
  be translated. English never noticed because its placeholder names happen to equal their own
  translations.
- `glossary.*.match` is skipped. Those lists are the auto-bolding word forms and are REWRITTEN per
  language by definition (package §7); a Spanish list must carry Spanish inflections and must not
  mirror the German ones. English came through only because "Deck-Durchlauf" happens to appear
  there as "deck cycle".

Neither exclusion touches display text, the English table behaves identically before and after,
and counter-check 2 proves the rule still bites.

---

## 6. Counter-checks — all eight seams

`testing.md` §5: a guard that is merely green is not evidence.

```bash
bash docs/workstreams/es-translate/counter-checks.sh
```

**8 passed, 0 failed.** Each case breaks the protected seam, proves the guard goes RED, and
restores the file; the harness refuses to run against a dirty file and fails a case whose break
pattern no longer matches.

| # | Seam broken | Guard that fired |
| --- | --- | --- |
| 1 | `FALLBACK` drops `via`, so `es` falls straight to German | fallback chain |
| 2 | glossary `stich` renamed to the forbidden synonym `Ronda` | terminology table |
| 3 | English brand `Autotrick` planted in the Spanish privacy notice | brand per language |
| 4 | a skill figure typed wrong (`+1` → `+2` charge) | same numbers across languages |
| 5 | `escalera` abbreviation collided with `ancla` | one character, pairwise distinct |
| 6 | a German quote pair slipped into a Spanish string | own quote pair per language |
| 7 | a glossary `match` list emptied | at least one word form per entry |
| 8 | `hud.score` reverted to the German word | untranslated text, unless SAME_OK.es allows |

**Two harness traps closed, both inherited from the spanish-locale run.** A `-t` filter that
matches nothing lets vitest exit 0 and reads as "guard stayed green"; every filter is pure ASCII
and the harness fails a case that matched no test. And a break whose pattern no longer matches
tests nothing — the harness verifies the file actually changed first. **That second check earned
itself immediately:** case 6's first version used `\x{201e}` in the perl PATTERN, which matches
nothing because perl reads bytes there. The harness reported it instead of passing.

---

## 7. The two rewritten tables

**`TERMS.es` — 36 rules, frozen 26.08.2026.** Every rule was probed against the finished catalog
before being frozen; a rule that merely "looks sensible" is not in the table. The probe found one
real break: `glossary.skillrunde` read "Ronda de habilidad" while the German word is
Skill-**Durchlauf** and §3.1 makes `ciclo` the only word for it. Fixed before the freeze.

Two Spanish quirks the English table never meets are recorded in the guard itself: JS `\b` is
ASCII-based and never matches before `Épica`, and `Kampfwert-Vorsprung` maps to `margen` rather
than `valor de combate` — with `ventaja` as a FORBIDDEN synonym, because `ventaja` is the frozen
word for Perk (§3.5) and one word may not carry two terms.

**`SAME_OK.es` — 40 entries** in three groups, each a different reason: pure structure (templates
with only placeholders, numbers and separators), loanwords Spanish uses exactly as German does
(Build, Bug, Balance, Tutorial, Playtest, Packs, Mono, Motor, Prisma), and the two formation
abbreviations that coincide by accident (Wechsel/Zigzag → Z, Anker/Ancla → A). A further 29
identical values are covered by the pre-existing proper-noun CLASS regex and need no entry.

Inheriting either table from English would have been the comfortable mistake: half the English
entries ("Deck", "Score", "Perks") are words Spanish very much does translate — and here they are
translated (mazo, puntuación, ventajas).

---

## 8. Auto-bolding — measured, not assumed

`glossary.*.match` was written LAST, out of the finished Spanish corpus (package §7), and the
result is measured across all `ability|family|perk` description texts:

| Locale | Texts | Bolded hits | Guard threshold | Lossless round-trip |
| --- | ---: | ---: | ---: | --- |
| de | 397 | 670 | 198.5 | yes |
| en | 397 | 726 | 198.5 | yes |
| **es** | **397** | **750** | 198.5 | **yes** |

Spanish has the densest bolding of the three. Counter-check 7 proves an emptied list is caught.

---

## 9. Characters

`¿` 11 occurrences, `¡` 3 — set where Spanish orthography wants them (package §5.3 explicitly asks
for this). Forbidden characters `« » º ª`: **zero**. The ordinal indicator is the one that took
work: German writes "2. Karte", "Ab der 3.", "Jeder 12. Sieg", and Spanish wants `2.ª`. Spelling
the ordinal out instead ("la tercera") reads fine but DROPS a digit the German names — the number
guard caught all three cases. The catalog keeps the numeral: "Carta 2", "Desde la carta 3",
"Cada 12 victorias".

---

## 10. Uncertainty by category

- **Measured:** key and character counts, all interpolation counts, every gate result, all eight
  counter-check outcomes, the cell-by-cell CSV comparison, the blob-hash scope proof, the
  auto-bolding hit counts, the character census, every `TERMS.es` rule against the live catalog.
- **Observed:** the assembled catalog loads and resolves in Node under all three locales.
- **Inferred:** that Spanish runs longer than German and English in the UI. Well founded and
  partly evidenced by the two limits that recomputed upward, but the layout itself is **not**
  measured here — that is the named successor `es-layout`, and the length overruns are listed for
  it in `docs/localization/unsicherheiten_es.md` §7.
- **Proposed:** the DE→ES vocabulary of `unsicherheiten_es.md` §§1–4, above all the score
  announcement chain, which is deliberately NOT frozen into the guard because the English chain
  carries an owner release date and the Spanish one does not yet.

**What was NOT proven.** No screen was rendered and no pixel was measured; there is no visual
evidence in this package and none is claimed. The suite proves structure, parity, numbers,
terminology and characters — not that a Spanish sentence fits its tile.

---

## 11. H1 and H7 both fired, and both were handled

The contract listed drift since the freeze (H1) as resolved-for-`b5dd4a15` and named a live
cross-task collision (H7): `feature/desktop-menus` sitting mid-merge with unresolved conflicts in
`src/i18n/de.js` and `src/i18n/en.js`. **Both happened while this task was running.**

`dev` moved from `b5dd4a15` to `78282fc9` — the menu rework was integrated, and it changed the
German and English catalogs. Measured rather than estimated:

| | Keys |
| --- | ---: |
| New German keys with no Spanish | 29 |
| German values changed under an existing Spanish translation | 15 |
| Keys removed, leaving a Spanish orphan | 4 |

The base was merged FORWARD into the task branch — the base, not a sibling, which is ordinary
pre-integration hygiene and what the predecessor branch did too. The single merge conflict was in
`docs/localization/strings_es.csv`, a generated artefact; it was resolved by regenerating the file
rather than hand-merging machine output.

**Why this was not optional.** With `ready: true` set, the parity guard demands a Spanish value
for every German key. Leaving the 29 untranslated would have turned the suite red the moment this
branch met `dev` — the acceptance gate would have been true only in isolation, which is the same
as not being true.

One recorded finding went obsolete in a good way: `upgrades.ranked.free` used to be German "frei"
for two different meanings, and Spanish followed the English disambiguation. The rework made the
German say "Freigeschaltet", so `desbloqueada` is now a straight translation. The note in the
catalog was corrected rather than left standing.

**Still open, and the owner's call:** whether `dev` needs pushing, and whether anything else lands
in `src/i18n/**` before this branch integrates. If it does, the same three measurements repeat —
`npm run loc:export`, the self-check, and the blob-hash scope proof — and the delta will again be
tens of keys rather than thousands.
