# Task contract — es-translate

Tier **B**. The volume is not what makes it B. This task **freezes the Spanish terminology table**:
from the moment `TERMS.es` in `test/i18n-guards.test.js` is filled, the vocabulary stops being a
discussion and becomes a check — the same role the English table has held since 15.08.2026. A word
becomes a rule, and the rule outlives the task.

## Identity

| Field | Value |
| --- | --- |
| Branch | `task/es-translate` |
| Base | local `dev` @ `b5dd4a15786884bb35b1e29bbdcd79882fd24f38` |
| Concurrency | one writer; sequential sessions may continue the task in the same worktree |
| Upstream | none — the branch deliberately does not track its base |

### Staffing

| Role | Who |
| --- | --- |
| Owner | Repository owner (GitGudMonkeh) |
| Integrator | TODO — assign before integration (`AGENTS.md` — *Roles and source of truth*) |

No reviewer row: no independent review was requested. Review is optional and risk-based
(`AGENTS.md` — *Independent review*).

### Two deviations from `create-task`, recorded rather than silent

**The branch prefix.** `create-task` step 6 derives `feature/<slug>` for Tier B. Not followed, for
the third time and for the reason already recorded in `docs/workstreams/text-voice-pass/` and
`docs/workstreams/spanish-locale/task-contract.md`: `feature/*` is an integration branch carrying
`task/*` below it (`feature/desktop-menus`, `feature/tutorial-sections`), while a standalone task off
`dev` is `task/*`. Repository practice and `git-workflow.md` §3 agree. The skill table is flagged as
probably inverted; correcting it is a separate change and not this task's business.

**The base ref.** `create-task` step 5 resolves the base as `origin/<base>`, default `origin/dev`.
`origin/dev` is `d9763883` and does **not** contain the Spanish delivery, so basing there would have
produced a worktree without the CSV, the translator package, the `es` registration and the prepared
guard tables — the precise failure the work order's precondition exists to prevent. The base is
therefore local `dev` after the owner's fast-forward. **No commit here is local-only:** `b5dd4a15`
is on the remote as `origin/task/spanish-locale`. Only the `dev` *pointer* is local until a human
pushes it.

### Setup provenance

`/create-task es-translate B` was executed by this session on the owner's explicit written
instruction, not on its own initiative. The command is owner-invoked only; the owner issued it, and
the fast-forward that precedes it, in the same message.

## Local workspace

| Field | Value |
| --- | --- |
| Worktree | `C:/Code/Autostich-worktrees/es-translate` |
| Branch checked out there | `task/es-translate` |
| Preview port | 5197 |
| Preview URL | http://localhost:5197 |
| Server invocation | `npm run dev -- --port 5197 --strictPort` |

Port 5197 is the lowest free integer from 5181 upward: `NEW_MACHINE_SETUP.md` — *Preview server and
ports* reserves 5173 and 5180, and `docs/workstreams/**` already allocates 5181–5196. Measured by
reading both sources; never probed, because `--strictPort` is what makes a collision fail loudly.

## Scope

The parts, in the order they must happen.

1. **Drift check (H1), before any translation.** `npm run loc:export`, then diff
   `docs/localization/strings_es.csv`. Any row that appears has moved since the freeze and is
   translated on its new wording.
2. **Catalog shape.** `src/i18n/es.js` plus the sub-catalogs it needs, mirroring `en.js` — not
   `de.js`, which is a generated view of the game registries. A sub-catalog file exists when there is
   text for it.
3. **Translation of the 2746 open rows**, from the German column. `en_ref` is reference, not source.
4. **Restoring the ~164 template interpolations (F1).** The CSV carries resolved numbers; the catalog
   must carry the constants again, at the same positions the English catalog uses.
5. **Glossary match forms (H2), last.** `glossary.*.match` is rewritten for Spanish out of the
   finished Spanish corpus, not translated.
6. **Guard tables (H3).** `TERMS.es` and `SAME_OK.es` in `test/i18n-guards.test.js`.
7. **`ready: true`** in `LOCALES`, only after key parity holds (Tripwire 2).
8. **Documentation.** `docs/localization/unsicherheiten_es.md`, the evidence package, and the
   counter-check for every new guard.

## Non-goals and tripwire

| Non-goal | Why |
| --- | --- |
| Adapting layout to Spanish length | Owner decision 4; the named successor is `es-layout` |
| Changing German or English wording | Both text passes are closed |
| Weakening a guard to make the suite green | It is the only machine that finds the gaps |
| Rebuilding the language picker as a dropdown | Owner decision, own task `lang-dropdown` |

**Tripwire 1 — German and English text values must not move.** Checkable, not judged. Baseline
**measured in this worktree at `b5dd4a15`**:

```bash
node -e "import('./src/i18n/de.js').then(async d=>{const e=(await import('./src/i18n/en.js')).default;const c=o=>Object.values(o).reduce((a,s)=>a+String(s).length,0);console.log(Object.keys(d.default).length,c(d.default),c(e))})"
```

Measured: `2639 111236 104771`. If the diff changes a German or English **text value**, stop.

**Tripwire 2 — `ready: true` must not precede key parity.** The ratchet is built the other way round:
it demands the flag once the catalog is complete. It is not permission to set it early.

## Approved architecture

Binding, not suggestions. Items 1–5 are owner decisions taken before implementation.

1. **Neutral Spanish**, language id `es`. `tú` address, `ustedes` rather than `vosotros`, no Spain-
   or Latin-America-specific vocabulary. One catalog, widest reach.
2. **The translation source is German.** Where German and English disagree, German wins and the
   contradiction is reported rather than smoothed over.
3. **The game title is `Autobaza` in Spanish.** German stays `Autostich`, English `Autotrick`.
   Already present in the brand table in `test/i18n-guards.test.js`.
4. **The layout pass is not part of this task.** It is the named successor `es-layout`.
5. **The fallback chain stays `es → en → de`.** Not to be touched.
6. TODO — the agent's own binding structural decisions (the split across sub-catalogs, hand-written
   versus generated catalogs, the self-check harness), with the rejected alternatives, once taken.

## Task-specific inputs

Measured in this worktree unless marked otherwise.

| Input | Value |
| --- | --- |
| Delivery CSV | `docs/localization/strings_es.csv` — 2800 records, 2746 `new`, 54 `n/a` (music titles, already filled) |
| Categories | 2639 `i18n`, 107 `building`, 54 `system` |
| Rows carrying a length limit | 30 — **lower bounds**; where broken, set `note` rather than bend the text (H4) |
| Catalog keys | 2639 per language |
| Template interpolations to restore | ~164 — inferred from `en.js` and its sub-catalogs; to be counted exactly during part 4 |
| Drift since the freeze | **none** — measured, see below |
| Order brief | `docs/localization/uebersetzerpaket_es_2026-08-26.md` |
| Uncertainty-list model | `docs/localization/unsicherheiten_en.md` |

**H1 measured, not assumed.** The delivery was generated against `d9763883`, which was the `dev` head
until the owner's fast-forward in this session. `npm run loc:export` in this worktree regenerated the
CSV **byte-identical** — zero drift. This holds for `b5dd4a15`; it must be re-checked if `dev` moves
under this branch before integration. See H7.

## Acceptance gate

> **`ready: true` stands in the code and the suite is green, without a guard having been touched to
> get there.**

Deliberately strict and deliberately cheap to check: the demanding guards arm themselves with the
flag. Full parity, no orphan keys, no broken placeholders, the same numbers as German, the language's
own quote pair, one character per formation abbreviation, auto-bolding that bites, a filled
terminology table.

## Expected file surface

Indicative. Anything outside it is recorded and reported before it is changed.

| Path | Change |
| --- | --- |
| `src/i18n/es.js` | filled |
| `src/i18n/es*.js` | new sub-catalogs |
| `src/i18n/index.js` | `ready: true` for `es`, nothing else |
| `test/i18n-guards.test.js` | `TERMS.es`, `SAME_OK.es` filled |
| `docs/localization/strings_es.csv` | regenerated by `npm run loc:export` |
| `docs/localization/unsicherheiten_es.md` | new |
| `docs/workstreams/es-translate/**` | contract, evidence package, counter-checks |

**Must not change:** any German or English text value in `src/i18n/de.js`, `src/i18n/en.js` or the
`en*` sub-catalogs. Verifiable by the Tripwire 1 command above.

## Known hazards

| # | Hazard | Handling |
| --- | --- | --- |
| F1 | Resolved numbers in the CSV | Walk the English interpolations site by site; the same constant at the same position |
| F2 | Gender agreement — `{n} bloqueado` breaks as soon as `{n}` is feminine | Phrase around it; where that is impossible, split the key in code rather than write a compromise (package §4.4) |
| F3 | Long scale — `format.short.giga` is 10⁹ = `mil millones`, not `billón` | Package §5.4. No guard catches this one |
| H1 | Drift since the freeze | **Resolved for `b5dd4a15`** — measured zero. Re-check if `dev` moves |
| H2 | `glossary.*.match` is auto-bolding control, not display text | Rewritten for Spanish, last, from the finished corpus. Two tests measure the result |
| H3 | `TERMS.es` / `SAME_OK.es` are empty | Filling `TERMS.es` is not optional: a test demands a non-empty terminology table from every finished target language |
| H4 | Length limits are lower bounds | `note`, not a bent text. Hits the colour names immediately: `limit = 6`, yellow is `Amarillo`. Write `Amarillo` |
| H5 | Source-text ratchets read `src/**` as text | `AGENTS.md` — *Hazard: source-text ratchet tests* |
| H6 | Localization gate | `npm run loc:export`; the CSV must match the catalog or `test/loc-csv.test.js` goes red |
| H7 | **Cross-task collision — surfaced, not resolved** | `feature/desktop-menus` sits mid-merge with unresolved conflicts in `src/i18n/de.js` and `src/i18n/en.js`. Were that to land in `dev` before this task integrates, German and English text would move and the Tripwire 1 baseline would change. Not this task's to resolve; reported to the owner |

## Definition of done

Ticked only when true.

- [x] Drift check run and its result recorded — zero drift at `b5dd4a15`
- [ ] All 2746 open rows translated from German
- [ ] Catalog files written; key parity with `de`/`en` at 2639
- [ ] All template interpolations restored; numbers identical to German
- [ ] `glossary.*.match` rewritten for Spanish; both measuring tests pass
- [ ] `TERMS.es` and `SAME_OK.es` filled
- [ ] `ready: true` set, after parity
- [ ] Tripwire 1 re-measured: `2639 111236 104771`
- [ ] `npm test`, `npm run lint -- --max-warnings=0`, `npm run build`, `npm run gen:db`, `npm run loc:export` — all green
- [ ] Counter-check recorded for every new guard (`testing.md` §5)
- [ ] `docs/localization/unsicherheiten_es.md` written
- [ ] Evidence package written
- [ ] Decision block delivered — at most three questions, 400 words, each with a recommendation

## Open questions

TODO — the decision block is gathered at the **end** of the translation and delivered in one pass,
not raised piecemeal along the way (work order; `task-lifecycle.md` §2). Sound questions only:
neutral Spanish, German as the source, `Autobaza` and the fallback chain are settled and are not
reopened here.

---

**Language note.** This contract is English, per `AGENTS.md` — *Language policy*. The two German
artefacts of this workstream are the pre-existing translator package and the forthcoming
`docs/localization/unsicherheiten_es.md`, which follows its German model `unsicherheiten_en.md`; the
deviation is noted there.
