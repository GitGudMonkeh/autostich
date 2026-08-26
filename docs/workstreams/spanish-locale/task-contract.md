# Task contract — spanish-locale

Tier **B**. The pass itself would be A; it is B because it turns every binary `de`/`en` decision in
the formatters, the guards and the export into a rule over N languages. That rule outlives the task
and binds every language added after it.

## Placement

| Field | Value |
| --- | --- |
| Branch | `task/spanish-locale` |
| Base | `origin/dev` @ `d9763883bb5e1a2d5433d33f4de1121bb9da0cf9` |
| Concurrency | one writer; sequential sessions may continue the task in the same worktree |
| Worktree | `C:/Code/Autostich-worktrees/spanish-locale` |
| Branch checked out there | `task/spanish-locale` |
| Upstream | `origin/task/spanish-locale` — its own remote counterpart, deliberately not `dev` |
| Preview port | 5196 |
| Preview URL | http://localhost:5196 |
| Server invocation | `npm run dev -- --port 5196 --strictPort` |

Note on the branch prefix: `create-task` step 6 derives `feature/<slug>` for Tier B. That table was
not followed, for the reason already recorded in `docs/workstreams/text-voice-pass/task-contract.md`
— `feature/*` is an integration branch carrying `task/*` below it (`feature/desktop-menus`,
`feature/tutorial-sections`), while a standalone task off `dev` is `task/*`. Repository practice and
`git-workflow.md` §2 agree; the skill table is flagged as probably inverted for the second time.

Note on the setup: `/create-task` was executed by this session on the owner's explicit instruction,
not on its own initiative. The base SHA moved during the planning session (`e6c31813` -> `d9763883`,
an unrelated `#eis-arch` commit from a parallel session); the base above is the one the worktree was
actually cut from, and the two baseline measurements below were re-taken against it.

## Staffing

| Role | Who |
| --- | --- |
| Owner | Repository owner (GitGudMonkeh) — settled the decision block before implementation |
| Integrator | TODO — assign before integration (`AGENTS.md` — *Roles and source of truth*) |

No reviewer row: no independent review was requested. Review is optional and risk-based
(`AGENTS.md` — *Independent review*).

## Goal

The code carries a third language without anything needing to be rebuilt afterwards, and an external
translator can start without a single question.

Translation happens externally. This task delivers the machinery and the handover package, not
Spanish text.

## Scope

In this order. Each part is finishable on its own.

1. **Freeze the source state.** The base SHA above is the frozen state. Verify the committed export
   is byte-identical to a fresh one, and keep it that way at the delivery commit.
2. **One format table.** Replace the three binary switches in `src/i18n/index.js` and the fourth in
   `src/i18n/buildingText.js` with a single exported table (*Approved architecture* A).
3. **Register `es`.** `LOCALES` entry with `ready: false` and a fallback chain; `READY_LOCALE_IDS`
   for the UI and `setLocale`; `src/i18n/es.js` exporting an empty catalog; both language pickers
   driven by the number of ready locales rather than a hard-coded two.
4. **Generalise the guards** to N languages along the forbid/require split (*Approved architecture*
   C), including the new ratchet that arms the parity guard.
5. **Per-target export.** `scripts/export-strings.mjs` emits one CSV per target language; add
   `docs/localization/strings_es.csv`; fill the `limit` column.
6. **The translator package**, in German, derived from the English one, naming the freeze SHA.

Measured inventory at base: 2639 catalog keys; 111 236 characters of German, 104 771 of English;
2800 CSV rows, of which **0** carry a `limit`; 4 locale switches in code; ~10 assertions in
`test/i18n-guards.test.js` welded to exactly two catalogs.

## Non-goals

| Non-goal | Why |
| --- | --- |
| Writing Spanish text | Owner decision 1 — translation is external |
| Adapting layout to Spanish length | Owner decision 4 — there is no Spanish text to measure |
| Changing German or English wording | Both text passes just closed; first tripwire |
| Preparing a fourth language | A third one makes the seam; a fourth is then cheap |
| A Spanish word list for the username filter | Needs native judgement and its own `ALLOW` counter-list; named successor |
| Fixing the German decimal commas hard-coded outside the i18n layer | Pre-existing, affects English only, unaffected by a third language; named successor |
| An import script for the returned CSV | The return is a separate task; the package specifies the return format |

## Approved architecture

Binding. The rejected alternatives and their reasons are in `planning-report.md`.

### A. One format table, exported, read by formatters and guards alike

```js
const FMT = {
  de: { dec: ",", grp: ".", pct: "{n} %", day: "{dd}.{mm}." },
  en: { dec: ".", grp: ",", pct: "{n}%",  day: "{mm}/{dd}" },
  es: { dec: ",", grp: ".", pct: "{n} %", day: "{dd}/{mm}" },
};
```

`fmtNum`, `fmtPct`, `fmtDayMonth` and `buildingText.js` read it. So does the number guard, whose
`numbersOf()` currently hard-codes the German and English grouping rules in a second place.

The `es` row is not a guess. Measured with ICU: neutral `es` gives `1.234.567,25`, `7 %` and
`24/12`. Had the language ID been `es-419`, the first two would have flipped to the English form —
which is why owner decision 2 (neutral `es`, not `es-419`) also settles the number format.

`src/i18n/buildingText.js:24` is the dangerous one and must not be forgotten: it asks
`getLocale() === SOURCE_LOCALE`, so Spanish falls silently into the English branch and every
Architect factor would read `×1.10` instead of `×1,10`. Its guard (`test/arch-eff.test.js:55`)
covers `de` and `en` only, and building effect texts are generated rather than catalog entries, so
no parity guard sees them either.

### B. `ready` is the switch that arms the parity guard

```js
{ id: "es", label: "Español", short: "ES", ready: false, via: ["en"] }
```

- `LOCALE_IDS` stays "every locale the code knows" and drives the export and the forbidding guards.
- `READY_LOCALE_IDS` drives the picker, `setLocale()` and the requiring guards.
- `t()` resolves along `locale -> via[] -> SOURCE_LOCALE`, so a missing Spanish key shows English,
  not German.

`setLocale("es")` must not stick while `es` is not ready, so a stale `options.lang` falls back to
`DEFAULT_LOCALE` exactly as an unknown value does today.

### C. Guards: the structural ones generalise, the pairwise ones become tables

This is the rule that decides whether a change is a generalisation or a weakening, and the second
tripwire is measured against it.

- Guards that **forbid** content run over **every** locale, `es` included: orphan keys, broken
  placeholders, empty strings, a foreign decimal mark, a foreign quote mark, a lonely plural half.
- Guards that **require** content run over **ready** locales: key parity, one-character formation
  badges, glossary word forms that actually match, the rarity ladder.
- One **new ratchet**: a non-ready locale that has reached full key parity fails the suite with
  "set `ready: true`". The flag cannot rot into a permanent exemption.
- `SAME_OK`, `TERMS`, the quote pair and the brand become `X[locale]`. `TERMS.es` and `SAME_OK.es`
  exist but are empty until Spanish text does. A meta-assertion requires **every ready locale to
  have an entry**, so a fourth language cannot arrive without its own table.

`SAME_OK` is explicitly **not** shared between languages: `Deck` is the same word in German and
English and is `mazo` in Spanish, so a shared list would hide exactly the forgotten translation the
guard exists to catch.

Brand table: `{ de: "Autostich", en: "Autotrick", es: "Autobaza" }` (owner decision 3). The
`start.logo.alt` assertion becomes one row per ready locale.

### D. One CSV per target language, not a third column

`status` and `note` are per-target by definition; a wide CSV needs `status_en` and `status_es`, and
hands every translator every other language's column.

`docs/localization/strings_es.csv`, columns `id, category, de, en_ref, context, limit, status, note`.
`en_ref` is a **reference, not a source**: German is what gets translated (owner decision 3), English
is shown because it is where an ambiguity in the German was already resolved once. Where the two
disagree, German wins and the translator flags it in `note`.

The existing English CSV keeps its path and its name. The ratchet, `i18n.md` and the model package
all point at it, and renaming a 520 KB file buys nothing this round.

**The freeze SHA does not go into the CSV or its filename.** `test/loc-csv.test.js` compares the CSV
against the catalog on every run, so a per-commit value would make it red on every commit; a SHA in
the filename would rename the file at every freeze. The SHA lives in the package document, written
by hand. That is sufficient for H1: with the CSV committed at the freeze commit,
`git diff <freeze-sha> -- docs/localization/strings_es.csv` names exactly the German rows that moved.

### E. The Spanish catalog mirrors the English split

`src/i18n/es.js` exists now and exports an empty catalog, with a header naming the intended split
(`esSkills`, `esPerks`, `esFamilies`, `esMeta`, `esGlossary`, `esCosmetics`, `esGuides`, `esTerms`).
The nine files are created when there is text to put in them; nine empty modules today are noise.

For whoever fills them later: German is a **generated view of the game registries** (`de.js:29`),
English is hand-maintained with about 164 template interpolations pulling live tuning constants.
Spanish is the English kind. The returned CSV carries **resolved** numbers, so those interpolations
must be re-introduced by hand. The number guard catches a missed one, but only at the next balance
pass, which is the expensive place to find out.

### F. The `limit` column gets filled

A single table in the export, keyed by id or id pattern. Hard cases first (`formation.*.abbr = 1`,
today guarded but never communicated), then the tight cells measurable without Spanish text. Today
all 2800 rows carry an empty `limit` while the model package promises the translator 290 filled ones.

## Tripwires

1. **The diff changes a German or English text value** — stop. A key may move; its text may not.
   Measured, not judged: the character totals must be **111 236 German and 104 771 English** at the
   end, over **2639** keys.
2. **A change weakens a guard instead of generalising it** — stop. Section C states the rule that
   decides which of the two it is. The parity guard is the only machine that finds an incomplete
   translation.

## Task-specific inputs

- `docs/localization/uebersetzerpaket_pixi_2026-08-15.md` — the model, and partly stale: it still
  says "there is no loc system", lists export categories that no longer exist (`ui`, `item`,
  `tutorial`, `ability`, `achievement`, `store` versus today's `i18n`, `building`, `system`) and
  describes plurals as hand-coded ternaries. §1, §3, §8 and §9 carry over; §2, §4, §5.5, §6 and §7
  must be re-derived against the current export.
- `docs/localization/unsicherheiten_en.md` — the shape the Spanish uncertainty list will take
- `docs/localization/genre-terminologie.md`, `docs/localization/i18n.md`, `docs/text-style-guide.md`
- `test/i18n-guards.test.js`, `test/loc-csv.test.js`, `test/arch-eff.test.js`, `test/format.test.js`
- Measured ICU reference for `es`: `1.234.567,25` · `7 %` · `24/12` · plural categories `one`/`other`

## Expected file surface

`src/i18n/index.js`, `src/i18n/es.js` (new), `src/i18n/buildingText.js`,
`src/ui/UsernameModal.jsx`, `src/ui/OptionsModal.jsx`,
`scripts/export-strings.mjs`,
`test/i18n-guards.test.js`, `test/loc-csv.test.js`, `test/arch-eff.test.js`, `test/format.test.js`,
`docs/localization/strings_es.csv` (new), `docs/localization/uebersetzerpaket_es_2026-08-26.md`
(new), `docs/localization/i18n.md`,
`docs/workstreams/spanish-locale/**`.

Anything outside this is recorded and reported before it is changed.

## Known hazards

| | Resolution required before handoff |
| --- | --- |
| **H1 — freeze SHA** | The package names `d9763883…` as the state it was exported against, and the CSV is committed at that commit. Drift on return is a `git diff`. |
| **H2 — text length** | Out of scope (owner decision 4). Recorded correction: English is 5.8 % **shorter** than German here, so "Spanish runs 20 to 25 % longer" is a claim against **English**. Against German the excess is smaller and unmeasured. Named successor `es-layout`. |
| **H3 — `limit`** | Measured empty in all 2800 rows. Addressed by F. Not "check whether it is filled" but "it is filled nowhere". |
| **H4 — plural and interpolation** | Measured: `es` has exactly `one`/`other` with the same boundary as German and English, so `resolveKey` suffices and no code changes. The real Spanish trap is **gender agreement with an interpolated word** (`{n} bloqueado` / `bloqueada`), which this interpolation cannot express. Belongs in the package as a phrasing rule, not in the code. |
| **H5 — username filter** | `FOLD` already folds `ñ á é í ó ú` to base letters, so a Spanish list would match. Adding the words is a named successor: it needs native judgement and its own `ALLOW` counter-list (`puta` inside `disputa`/`reputación`, `coño` folding to `cono`). Independent of shipping Spanish UI, because names are global regardless of the player's language. |
| **H6 — PWA manifest** | Re-checked, no change. A manifest is read once at install and knows no switching; as true of three languages as of two. The note at `de.js:448` still holds. |
| **H7 — source-text ratchets** | Only `test/arch-eff.test.js:70` reads a catalog as raw text, for four `arch.eff.*` lines. The formatter rework touches no ratchet. `un-lang` in `UsernameModal.jsx` is not ratcheted, so the grid may change. |
| **H8 — localisation gate** | `npm run loc:export` runs with the other gates; verified byte-identical at the base SHA. |
| **H9 — fonts (closed)** | Measured out of the shipped `cmap`s rather than the declared `unicode-range`: `Geist.woff2` and `GeistMono.woff2` carry 225 glyphs including every accented letter, `ñ`, `¿` and `¡`. `Orbitron.woff2` (card numbers, wordmark, floating scores) carries them too and lacks only `« » º ª`. No font work. One package rule: `“ ”` never `« »`, and no `1.º / 3.ª` ordinals. |

## Acceptance gate

**A translator can start without a single question, and the returned catalog fits without rework.**

Machine-checked:

1. `npm run loc:export` produces `docs/localization/strings_es.csv` covering every catalog key, with
   the target column empty, and `test/loc-csv.test.js` ratchets it the same way it ratchets the
   English one.
2. Every row that sits in a fixed area carries a `limit`, and every `formation.*.abbr` row carries
   `limit = 1`. Zero filled rows is a failure.
3. `LOCALE_IDS` is `["de", "en", "es"]` and `READY_LOCALE_IDS` is `["de", "en"]`.
4. The four formatters produce the Spanish forms: `fmtNum(1234567,"es") === "1.234.567"`,
   `fmtNum(2.25,"es") === "2,25"`, `fmtPct(0.07,"es") === "7 %"`, `fmtDayMonth(…,"es") === "24/12"`,
   and the Architect factor renders `×1,10` under `es`.
5. `t()` under `es` falls back to English, not German, for a key `es` does not have.
6. The character totals are unchanged: 2639 keys, 111 236 German, 104 771 English.

Human-checked: the package document names the freeze SHA, the CSV, the terminology mapping, the
placeholder and gender rules, the character restrictions and the return format, with no open item
that a translator would have to ask about.

## Definition of done

- [ ] Acceptance gate green, all six machine checks.
- [ ] Gates green: `npm test`, `npm run lint -- --max-warnings=0`, `npm run build`,
      `npm run gen:db`, `npm run loc:export`.
- [ ] Every new guard counter-checked by deliberately breaking the seam it protects, and the
      counter-check recorded (`testing.md` §5). This includes the `ready` ratchet: set `es` complete
      and prove the suite goes red.
- [ ] Both language pickers measured at 390×844 and 1280×720 with three entries, every number
      labelled. `UsernameModal.jsx:124` no longer hard-codes `grid-cols-2`.
- [ ] Evidence package with the diff range as SHAs and the limits of the evidence stated.
- [ ] `docs/localization/i18n.md` §6 and §7 reflect three languages and the `ready` gate.

## Owner decisions taken before implementation

Settled 2026-08-26, in one pass, before any implementation.

1. **Fallback chain `es -> en -> de`.** A missing Spanish key shows English, never German. Today
   `SOURCE_LOCALE = "de"` is the only fallback (`index.js:101`), which would show a Spanish player
   German.
2. **Spanish becomes visible only when it is complete.** Registration and visibility are separated
   by the `ready` flag, and the new ratchet keeps the flag from becoming permanent.
3. **The game is called `Autobaza` in Spanish.** This applies the rule taken on 2026-08-18 (the mark
   follows the same mapping as the word inside it: `Stich` -> `trick` -> `baza`) rather than
   reopening it.

Carried in from the planning order and not reopened: translation is external; neutral `es`, not
`es-ES` and not `es-419`; German is the source language; the layout pass is a separate later task.

## Status at integration

TODO — filled at handoff.

## Open questions

None blocking. Recorded for elsewhere rather than decided here:

- Whether the returned CSV should be turned into catalog files by a script (`loc:import`) or by
  hand. Belongs to the return task, and the answer depends on how clean the returned file is.
- The ~10 sites outside the i18n layer that hard-code the German decimal comma
  (`Battlefield.jsx:1082`, `CardGrid.jsx:19`, `CardDetail.jsx:12`, `ChargeBar.jsx:25`,
  `ChronikOverview.jsx:24`, `GlacierBar.jsx:19`, `BuildSummary.jsx:278`, `Card.jsx:77`). The English
  build already shows German commas there. A third language does not make it worse, because Spanish
  uses the comma too.
- `format.short.giga` in Spanish is `mil millones`, not `billón` — Spanish uses the long scale, so
  `1e9` and `1e12` do not map the way English does. A package note, and a place where a plausible
  translation would be numerically wrong by a factor of a thousand.
