# Code Health Check — `exp` branch

Assessed against `origin/exp` @ `29daa297` (2026-09-27, "Prisma: Passiv-Beschreibung, eigenes Icon,
Fokus-Reihe auf fuenf"), on 2026-09-28, in a Linux container with Node v22.22.2 and npm 10.9.7 —
the same Node major CI pins. Nothing in `src/`, `test/`, `sim/` or `scripts/` was modified; the
four gates and the analysis scripts ran read-only. Every number is labelled **measured** (a
command was run), **computed** (derived from a measurement), **observed** (read in the source)
or **inferred** (a conclusion; the evidence is named).

This is the second health check in the repository. The first
(`docs/workstreams/health-check/report.md`, 2026-08-26) assessed `dev`. Section 11 states
which of its findings landed on `exp` and which remain open, so the two reports read as one
history rather than two overlapping lists.

**Scope.** `exp` is the core-loop playground beside the promotion chain (`AGENTS.md` — *The
`exp` branch*): 537 commits beyond `dev` (25 merges), all between 2026-09-02 and 2026-09-27,
touching 313 files (+42,727 / −18,216 lines) (measured). Everything on `dev` is an ancestor of
`exp`, so this report covers the whole tree as `exp` ships it, not only the diff.

---

## Page one — for the owner

### Verdict

`exp` is in working order: all four gates pass, CI is green on the head, the import graph has
no cycles, and the fixes from the August health check are all present. Three things need
fixing rather than tidying: one gameplay bug in the contract tally that makes a contract
unwinnable, two catalogs that contain the word "undefined" because a guard family silently
stopped asserting, and an entry bundle that carries three inactive languages. The rest is of two
kinds. **Debris from the cut** — the exp branch removed the upgrade tree, the guides and the
tutorial but left their catalog entries, CSS, exports and engine branches behind. **Weight and
drift** — a 1 GB `docs/workstreams/` tree that the August report already flagged, a README
describing a game that no longer exists on this branch, and commit messages that stopped
following the repository's own English rule.

Counted across all sections: **5 High** (one gameplay bug, one catalog defect, one vacuous guard
family, one bundle-composition item, one carried-over repository-weight item), **27 Medium**,
**~45 Low**. The full index is Appendix A.

### The findings that matter most

1. **One contract can never be fulfilled, and another is scored one short.** The contract
   tally at every cycle boundary is fed the state from *before* the closing trick, so the 40th
   trick's win is never counted. "Durchmarsch schwer" needs 40 of 40 and is unreachable;
   "Durchmarsch I/II" is off by one whenever the last trick is won. Confirmed by reading
   `reducer.js:731 → :279` against `engine.js:522 / :1187`; no test covers the reducer path.
   (observed, confirmed — section 6, G-H1)

2. **The build warns 112 times, and the warnings are real.** Four English and Spanish catalog
   files import 39 plant constants that commit `91ab2ed4` removed. Each resolves to `undefined`,
   so 28 English and 28 Spanish skill and glossary texts read "+undefined root score … at ~NaN
   growth". Nobody sees it by default because only German is active on `exp` — but the deployed
   `/exp/?lang=en` shows it (the preview build honours `?lang=`), the translator CSVs carry it,
   and no guard can catch it because the inactive flag exempts those catalogs from every parity
   check. The i18n guard family currently passes with **zero assertions executed**.
   (measured — sections 2, 8, 9)

3. **Half of the 1 MB entry chunk is text no player can reach.** All four locale catalogs are
   imported statically (`zhHans.js` alone is 207 kB of source); the Spanish catalog and removed
   English tutorial keys are demonstrably in `index-*.js`. The entry chunk is twice Vite's
   warning limit, and the `manualChunks` comment that says otherwise is stale. (measured —
   sections 2, 7)

4. **The repository weighs 1.2 GB, of which the game is 40 MB.** `docs/workstreams/` carries
   996 MB of committed screenshots and viewport surveys (fifteen 22 MB `matrix.json` files), on
   `dev` and `exp` alike. The August report found this and set the 1 MB / 25 MB tripwire; the
   tripwire held (exp added three small files), but the backlog was never cut. (measured —
   section 4)

5. **Debris from the exp cut.** 174 of 695 CSS class names are referenced nowhere, 62 rule
   blocks (~416 lines) belong to the deleted `UpgradeScreen`, guide and tutorial; 94 exports
   are used by nothing and 254 only by tests (`progression.js`: 35, for an upgrade tree that is
   gone); `engine.js` and `reducer.js` still branch on tree effects, shop anchors and time
   segments that are constant on `exp`; `dropSkill` has drifted from `PICK_SKILL` and leaves
   Prisma state behind. (measured / observed — sections 5, 6)

6. **Four functions are longer than a thousand lines.** `AutostichGame` (1,334 lines),
   `resolveTrick` (1,255), `Battlefield` (1,254), `ArchitectScreen` (1,237), plus the 947-line
   `reducer` switch; fourteen functions exceed 300 lines. This is the structural fact behind
   most medium findings in sections 6 and 7. (measured)

7. **Two high-severity advisories, and `npm audit fix` cannot run.** `@xmldom/xmldom` 0.8.13
   (via `pixi.js`, ships in the browser) and `js-yaml` 4.3.1 (via ESLint, dev-only).
   `npm audit fix --dry-run` aborts with an internal npm error on this lockfile. (measured —
   section 3)

8. **Process drift on `exp`.** 251 of 512 non-merge commit subjects carry a conventional prefix
   and about 190 are German, against the AGENTS.md rule that commit messages are English; the
   same holds for test names (630 German vs 43 English in September's files). The balance
   guard was re-centred 29 times in 25 days and one push went out deliberately red on both
   workflows. Every push to `exp` runs CI twice. 34 tests are parked behind `ALL_UNLOCKED` with
   nothing pinning the switch. (measured — sections 8, 10)

### Recommended actions, in order

| # | Action | Effort | Owner decision needed? |
| --- | --- | --- | --- |
| A1 | Fix the contract tally (pass the closing trick's win, or expose `lastCycleWins` from the engine) and add a reducer-level 40/40 test | small | no — a correctness fix; the owner should know the contract was unwinnable |
| A2 | Fix the 39 dead constant imports in the four en/es catalog files; add `rollupOptions.onwarn` that fails the build on `MISSING_EXPORT`; add one forbidding guard over **all** locales for the literal `undefined` / `NaN`; make the vacuous parity block show as *skipped* | small | no |
| A3 | Import only the active catalog statically; lazy-load the rest on `setLocale` | small | no |
| A4 | Delete the `up-*` / `gd-*` / `tut-*` CSS, the tree / anchor / time-segment plumbing in engine and reducer, and the exports nothing reaches; shrink `progression.js` to what `storage.js` and `cosmetics.js` use; unify `dropSkill` with `PICK_SKILL` | medium | no — technical, but ratchets will need updating |
| A5 | Decide the fate of the 996 MB evidence backlog: keep, move to an `archive/*` branch, or purge with a history rewrite (the only option that shrinks clones) | owner | **yes** — history rewrite is reserved |
| A6 | Rewrite the README header for `exp` (or point it at `AGENTS.md` and mark it as describing `main`); fix `docs/localization/i18n.md` and the `index.html` comment; drop volatile counts | small | partly — what the README should say |
| A7 | Add `exp` to `branches-ignore` in `ci.yml`; compute `sim-perk-impact` once in `beforeAll`; correct the two stale timeout comments | trivial | no |
| A8 | Restore the English, prefixed commit-message convention (and English test names) on `exp`, or amend AGENTS.md to exempt `exp` | trivial | **yes** — it is the owner's rule |
| A9 | Bump `pixi.js` to 8.21 and ESLint to a `js-yaml` ≥ 4.3.2; regenerate the lockfile | small | no |
| A10 | Pin `ALL_UNLOCKED` with a test and add behaviour tests for the short-circuit it introduced | small | no |

The decision block at the end of section 12 lists the three questions only the owner can answer.

---

## 1. Gates (measured)

All four required gates, plus the two additional gates AGENTS.md names, run unpiped and exit 0.

| Gate | Result | Note |
| --- | --- | --- |
| `npm test` | 162 files, 2,865 passed, 42 skipped, 0 failed, 79.8 s | 42 skips are all `it.skipIf(ALL_UNLOCKED)` / `skipIf(EN_OFF)` — deliberate parking, section 8 |
| `npm run lint -- --max-warnings=0` | clean | |
| `npm run build` | exit 0, 7.9 s | **112 Rollup warnings** (section 2) and the 500 kB chunk-size warning |
| `VITE_PREVIEW=1 npm run build` | exit 0, 6.9 s | same warnings |
| `npm run gen:db` | 225 entries, tree clean afterwards | |
| `npm run loc:export` | tree clean afterwards | exports report 726 / 831 / 832 open rows for en / es / zh-Hans |

`git status --porcelain` was empty after every gate (measured). CI on the head commit is green
on both workflows (`ci.yml` run 1234, `deploy-exp.yml` run 324, both 2026-09-27) (measured via
the GitHub API).

## 2. Build and bundle (measured)

**Missing exports.** The production build prints 112 warnings of the shape
`"TRIM_STEP" is not exported by "src/game/constants.js", imported by "src/i18n/enSkills.js"`:

| Importing file | Warnings |
| --- | --- |
| `src/i18n/enSkills.js` | 41 |
| `src/i18n/esSkills.js` | 41 |
| `src/i18n/enGlossary.js` | 15 |
| `src/i18n/esGlossary.js` | 15 |

39 distinct symbols, all plant-faction tuning constants (`TRIM_STEP`, `TRIM_CAP`,
`PLANT_VALUE_CAP`, `WURZELTIEFE_*`, `BLUETE_SCORE`, `EWIGER_FRUEHLING_*`, `WELTENBAUM_*`, …).
`git log -S` places their removal at `91ab2ed4` "feat(exp): build the Pflanze faction on the new
passive (§6)". The German catalog does not import them (it takes only `FORMATION_LABELS` and
`SUITS` from `constants.js`); the English and Spanish catalogs were not carried along. Rollup
treats a missing named export as `undefined`, so e.g. `ability.SK_PLANT_03.desc` in English reads
"The root base (undefined) ×undefined when the green card wins inside a formation." Section 9
has the runtime confirmation and the list of affected keys.

**Chunks.** `manualChunks` in `vite.config.js` splits `vendor` / `pixi` / `game`; the comment
says the split "reduces the largest chunk below the Vite warning threshold". It no longer does:

| Chunk | Minified | Gzip |
| --- | --- | --- |
| `index` (entry) | 1,039 kB | 328 kB |
| `pixi` (async) | 863 kB | 249 kB |
| `game` | 330 kB | 107 kB |
| `vendor` | 144 kB | 46 kB |
| `index.css` | 278 kB | 78 kB |

The entry chunk is twice the warning limit. The 28 lazily loaded screens and effects are
correctly split (34 JS files in `dist/assets`), so the weight is in what App.jsx imports eagerly
and in the four locale catalogs, which are all bundled although only German is active (section 9).
`dist/` is 33 MB across 504 files; the five largest non-JS assets are effect soundtracks
(`fx_blackhole` 638 kB, `fx_neonsurf` 592 kB, …) bundled through `src/assets/sounds` rather than
served from `/media/` like the music.

**Source assets.** `src/assets/` is 37 MB (cards 16 MB, battlefields 12 MB, fonts 4.8 MB,
sounds 2.6 MB). Vite hashes and copies every referenced file into each of the four slot builds.

## 3. Dependencies and security (measured)

`npm audit`: 4 advisories — 2 high, 2 moderate.

| Package | Version | Path | Severity | Ships to browser? |
| --- | --- | --- | --- | --- |
| `@xmldom/xmldom` | 0.8.13 | `pixi.js` → | high (10 advisories, XML injection / ReDoS) | yes, in the async `pixi` chunk |
| `js-yaml` | 4.3.1 | `eslint` → `@eslint/eslintrc` → | high (CPU exhaustion) | no, dev only |
| `@vitest/mocker` | 4.1.10 | `vitest` → | moderate | no, dev only |

`xmldom` is reachable only if Pixi parses SVG text at runtime; the app loads WebP/PNG textures,
so the exploitable path is not in use (inferred from the asset inventory — a grep for `.svg`
texture loads would confirm). `npm audit fix --dry-run` fails with
`Cannot read properties of null (reading 'edgesOut')` on this lockfile and npm version, so the
one-command remedy is not available; a manual bump is.

`npm outdated`: `vite` 6.4.3 → 8.3.1, `vitest` 4.1.10 → 5.0.2, `eslint` 9.39 → 10.11,
`@vitejs/plugin-react` 4.7 → 6.1, `react` / `react-dom` 18.3.1 → 19.3.0, `pixi.js` 8.19 → 8.21,
`@eslint/js` 9 → 10, `globals` 17.9 → 17.12. Two major versions behind on Vite and one on
Vitest, ESLint and React. None is urgent; Vite 6 → 8 is the one that will cost a day.

**Secrets and sinks.** No `service_role`, JWT-shaped or GitHub tokens in the tree; the committed
Supabase publishable key is documented as intentional and RLS-limited. Zero uses of
`dangerouslySetInnerHTML`, `innerHTML =`, `eval` or `new Function` in `src/`. The preview flag
gates leaderboard writes (`leaderboard.js:107`). The dev-only media middleware in
`vite.config.js` normalises and prefix-checks the path before serving. The service worker never
caches cross-origin or range requests. All observed.

## 4. Repository weight and hygiene (measured)

| Tree | Tracked size | Files |
| --- | --- | --- |
| `docs/` | 1,015 MB | of which `docs/workstreams/` 996 MB / 1,412 files |
| `media/` | 149 MB | 54 |
| `src/` | 40 MB | `src/assets/` 37 MB |
| `.nimbalyst/` | 1.5 MB | 3 PNG transcript screenshots, committed 2026-08-24 |
| everything else | < 5 MB | |

`.git` is 887 MB packed. `docs/workstreams/` holds 568 PNG and 436 WebP screenshots and fifteen
`matrix.json` viewport surveys of 22 MB each (`typography-system` 440 files, `desktop-menus`
438, `mainscreen-branding` 138, `desktop-icons` 137). `exp` added 3 files / 502 lines to it;
the weight is inherited from `dev`. The August report's tripwire (`task-lifecycle.md` §*The size
tripwire*, 1 MB per file / 25 MB per `evidence/` directory) is a documented rule, not a test;
nothing mechanical prevents the next 22 MB file.

**Branches.** 38 remote branches. 17 `task/*` and `feature/*` branches are fully merged into
`dev` and not deleted; 8 `claude/*` branches are merged into `exp`; 8 more are merged nowhere,
among them `claude/tutorial-design-review-ic49dg` (118 commits, 2026-08-30) and
`claude/pixi-grid-building-assessment-dlrdly` (43 commits). `feature/exp-branch-docs` (1 commit)
is redundant — its AGENTS.md section already exists on `exp` (line 168) but not on `dev`.
`/cleanup-task` exists for exactly this and is owner-invoked.

**Line endings.** One tracked file is CRLF in the index:
`docs/localization/strings_de_delta_test_2026-08-02.csv` (`.gitattributes` marks it `-text`,
so it is deliberate). `.gitattributes` is unchanged between `dev` and `exp`.

## 5. Structure, dead code and layering (measured unless noted)

**Size.** `src/` 220 files / 57,278 lines (`game/` 39 / 15,139; `ui/` 155 / 28,745; `i18n/`
24 / 11,750); `test/` 165 files / 34,052 lines; `sim/` 55 / 5,142; `scripts/` 27 / 5,849;
`src/index.css` 8,198 lines. Ten files exceed 1,000 lines: `zhHans.js` 2,886,
`CustomizeScreen.jsx` 2,158, `es.js` 1,991, `en.js` 1,976, `Battlefield.jsx` 1,937, `de.js`
1,793, `App.jsx` 1,540, `ArchitectScreen.jsx` 1,431, `engine.js` 1,373, `reducer.js` 1,351.

**Function length** (brace-matching heuristic; the top entries were confirmed by reading):
`AutostichGame` 1,334 lines, `resolveTrick` 1,255 (engine.js is that one function plus ten
helpers), `Battlefield` 1,254, `ArchitectScreen` 1,237, `reducer` 947, `StartScreen` 669,
`SkillSelect` 555, `GameOver` 363, `computeFormations` 294. 47 functions exceed 150 lines, 14
exceed 300.

**Import graph.** 0 static import cycles among 220 modules (Tarjan SCC). Highest fan-in:
`i18n/index.js` 74, `game/constants.js` 57, `i18n/labels.js` 37. Highest fan-out: `App.jsx` 64,
`Battlefield.jsx` 29, `CustomizeScreen.jsx` 28. Three layering violations:

- `src/game/telemetry.js` → `src/ui/version.js` (game importing UI);
- `src/i18n/de.js` and `src/i18n/labels.js` → `src/ui/indicators/vocab.js` (catalog importing UI);
- `window` is read in `telemetry.js:87–89` (unguarded) and `storage.js:719` (guarded).

`src/game` otherwise honours "no React, no DOM"; `localStorage` is touched from seven game
modules (`storage.js`, `weekMods.js`, `telemetry.js`, `progression.js`, `reports.js`,
`weeklySeed.js`, `runStats.js`), not one — each with its own try/catch (observed).

**Dead exports.** 94 exports are referenced by no file other than their own; 254 are referenced
only from `test/`. The concentration tells the story of the cut:

| Module | Exports used only by tests | Note |
| --- | --- | --- |
| `game/progression.js` | 35 | the upgrade tree; runtime uses 9 of ~50 exports (`storage.js`, `cosmetics.js`) |
| `game/storage.js` | 21 | ranked-week and highscore helpers |
| `game/contracts.js` | 19 | plus 9 used nowhere |
| `game/coins.js` | 10 | plus 10 used nowhere |
| `game/campaign.js` | 8 | plus 10 used nowhere |
| `ui/CustomizeScreen.jsx`, `ui/fx/CubeMatrixField.jsx` | 7, 9 | test hooks exported from components |

The full list is in Appendix B. "Only tests use it" is not automatically dead — several are
deliberate test seams — but 35 seams in a module whose feature was removed is a signal.

**Dead CSS.** 174 of 695 class names defined in `src/index.css` appear in no `.jsx`, `.js` or
`.html` file. 62 rule blocks (~416 lines) are the `up-*` (UpgradeScreen), `gd-*` (guide) and
`tut-*` (tutorial) families whose components were deleted on `exp`; the rest are `as-*` and
`rn-*` names that a Tailwind source scan cannot prove unused (`@source` is set to `none` with
explicit paths, per `test/bundle-split.test.js`) and that a reader should check one by one.

**Lint suppressions and console.** 45 `eslint-disable` comments in `src/`, all
`react-hooks/exhaustive-deps`; 33 carry a justification, 12 do not. 11 `console.*` calls
(8 warn, 3 log). 0 `TODO` / `FIXME` / `HACK` markers in `src/`.

## 6. Game logic — `src/game/` (observed; H and M findings re-verified by the coordinating session)

The core is deterministic by design (addressed `rngAt` streams, a `requireRng` fail-loud guard,
immutable updates in every faction transition) and storage is written defensively. The findings
are one gameplay bug, two drifts, and a layer of plumbing the exp cut left behind.

**G-H1 · Contract cycle-end tally misses the last trick of every cycle — confirmed.**
`reducer.js:731` calls `contractStep(state, next, …)` with the *pre-trick* state as `prev`, and
`contractStep` (`reducer.js:279`) then calls `CT.tallyCycleEnd(tally, prev, active)`.
`tallyCycleEnd` (`contracts.js:592–606`) reads `state.cycleWins`, but the engine increments
`cycleWins` inside the trick (`engine.js:522`) and resets it to 0 at cycle end in the same trick
(`engine.js:1187`). So `prev.cycleWins` is at most 39 when the 40th trick ends the cycle.
Consequences: `perfectRun` needs `cycleWins >= BOARD_POSITIONS` (40) and can never be
reached, so the "Durchmarsch schwer" contract is unfulfillable; `bestCycleWins` is one short
whenever the closing trick was won. `test/contracts.test.js` calls `tallyCycleEnd` with
synthetic states only, so the reducer path is untested. Fix: give the tally the finished
cycle's wins explicitly — have the engine expose `lastCycleWins` before the reset, or pass
`{ ...prev, cycleWins: prev.cycleWins + (next.lastTrick.win ? 1 : 0) }` — and add a reducer
test that plays a 40/40 cycle. **High.**

**G-M1 · Seeded runs are not fully deterministic (latent).** `reducer.js:480, :505, :539` and
`contractStep` (`:250/290/298`) draw campaign board cells, contract offers and loot from
`action.rng` even when `state.seed` is set, and App.jsx always passes `Math.random`
(`App.jsx:582, 610, 962`). Everything else keys on `(seed, cycle, kind)`. The reducer header
(`reducer.js:33`) promises "kein Math.random hier drin". Contracts and seeded runs currently
meet only on the restart path (`App.jsx:1013`), so this is latent rather than visible. Fix:
route those three draws through `rngFor(state, action, cycle, "contracts")` with `action.rng`
as the unseeded fallback. **Medium.**

**G-M2 · `dropSkill` duplicates PICK_SKILL's archetype deactivation and has drifted —
confirmed.** `reducer.js:369–394` resets lightning, fire, ice and plant state when the last skill
of an archetype goes, but not `stance` (PICK_SKILL does at `:990`) or `tendrils` (`:989`).
Selling the perk that carried the last Prisma skill (`perkSale.sellPatch` → `dropSkill`) leaves
`stance.active = true`; a later re-pick skips `initStance()` (`:969` tests `!stance.active`),
so `switches`, `critRamp` and `threshold` carry over. `test/perk-sale.test.js` covers neither.
Fix: one `deactivateInactiveArchetypes(patch, skills, skillTiers)` used by both sites. **Medium.**

**G-M3 · `telemetry.js` breaks the game-layer rule.** It imports `../ui/version.js` (`:20`),
reads `window` and `navigator` unguarded (`:80–90`), `localStorage` (`:59–62, 167–174`) and
`Math.random` (`:53–54`); `leaderboard.js` and `reports.js` do network I/O with
`import.meta.env`. Fix: move the three transport modules to `src/ui/` or a new `src/net/`,
leaving the pure `buildRunPayload` in `game/`. **Medium.**

**G-M4 · Plumbing from removed features in the hottest files.** All observed:

- Upgrade tree: `reducer.js:481–486` sets `treeRareShift / treeLegMult / treeLegForce2 /
  rerollsPerk2` to neutral constants; `engine.js:1248–1254, 1278–1279` and
  `reducer.js:1183–1191, 1202` still branch on them; `difficulty` is always `null`
  (`engine.js:179, 424–425, 1220`). `progression.js` still carries the whole node tree
  (`NODES`, `buyNode`, `respec`, `nodeEffects`) and `storage.recordRun` the SP/DP economy only
  the tree consumed.
- Shop anchors: `shop.initialShop()` returns `{ anchors: [] }` forever; `engine.js:313–315,
  381, 385, 510, 660, 664–665, 904–906`, `formations.js:358–359, 441` and 13
  `shop?.anchors || []` call sites are dead; `perkLegendaryChance(shop)` reduces to
  `PERK_LEGENDARY_BASE`.
- Time segment: `engine.js:212–217` (`timeSeg / seq / isRepeat / reducedRepeat`), `:616`, `:1080`.
- `iceTemp` has no reader (`engine.js:163, 433, 1365`; `reducer.js:187, 374, 381, 963, 991`);
  `lightDirect / fireDirectApplied` (`engine.js:791–794, 831`) are constant 0; perk `E10`
  (`perks.js:74`, `offerable: false`) is unobtainable.

Delete in one dedicated commit; the ratchets will name any guard that still reads them. **Medium.**

**G-M5 · Function size.** `resolveTrick` (`engine.js:119–1373`) is ~1,250 lines with ~80
destructured fields and ~50 phase-scoped locals; `reducer()` (`reducer.js:405–1351`) is one
~950-line switch. It also owns cycle-end offers and phases (`engine.js:1237–1319`), duplicating
`startDecisionSetup` in the reducer (`reducer.js:74–118`). Fix: extract phase functions that take
and return a context object, and one `nextDecisionPhase(state, cycle, rng)` used by both. **Medium.**

**Low.**

- G-L1 Stale constants: `COMMIT_EXP` (`constants.js:325`, feature removed §6.1), `SKILL_SLOTS`
  (`:320`; real limit is `SKILL_SLOT_LIMIT`, stale fallbacks `reducer.js:761`,
  `perkSale.js:95, 155`), `SKILLS_OFFERED` (`:321`), `LEG_PHASE_CYCLE` (`:92`, always 0),
  `ANCHOR_FORM_FACTOR` (`:100`).
- G-L2 Stale player text `glossary.js:198` ("12 Skills zur Auswahl, alle 4 Archetypen") against
  2 doors × 3 offers and 5 factions — owner-visible, flagged only.
- G-L3 Inconsistent card-value floor: `families.js:368, 381, 390, 530` and `perkSale.js:71`
  clamp at 0, `reducer.js:755` clamps at 1 citing "#34 removed the 0". One `MIN_CARD_VALUE`.
- G-L4 Board geometry hard-coded in `glacier.js:135–141, 252–259, 404–421, 440–441` (8/5/7/4)
  although `architect.js` exports `ROWS / COLS`.
- G-L5 Storage robustness (possible): `rankHighscores` (`storage.js:74`) compares `tricks` /
  `ts` without a numeric guard; `loadRunHistory:95` returns entries unvalidated;
  `ACTIVE_RUN_SCHEMA = 2` (`:843`) was not bumped for the exp-era shape changes (skill doors,
  contracts, campaign, rules, stance, firnStack). `VITE_STORAGE_NS=exp` isolates the slot, so
  the risk is low today.
- G-L6 Magic numbers: `contracts.js:709, 711` (`* 4` = `constants.BLOCK`), `:331` "fifteen"
  (14 tasks), `storage.js:84` "Top-5".
- G-L7 `reducer.js:107` `rngAt(seed, "schliesser", …)` with `seed === null` hashes `"0:…"`, so
  unseeded dev runs get a fixed stream.
- G-L8 Post-construction mutation of `lastTrick` (`engine.js:1177`) and `breakdown` (`:1016`),
  acknowledged in comments.
- G-L9 Comment hygiene: ~90 % of comment lines in `src/game` are German (2,865 of 3,181 carry a
  German marker, computed); 20 block comments of 16+ lines; stale comments at `reducer.js:409`,
  `:757–759`, `constants.js:296–309`, `engine.js:1057`, `families.js:22`, `perks.js:87–88`,
  `storage.js:840–842`. `constants.js` is roughly 40 % measurement history that belongs in
  `docs/decisions/`.

**Structure.** The faction modules are pleasingly symmetric (ID enum, `init`, `xTier / xParam`,
on-win / on-loss returning patches) but copy the `held / tier / param` trio four times
(`fire.js:46–69`, `plant.js:46–66`, `lightning.js:47–88`, `stance.js:80–95`); `ice.js` is the
odd one, with its mechanics in `glacier.js`. The engine still hard-codes each faction's state
(`heat`, `lightning`, `growth / tendrils`, `stance`, seven `glacier*` fields) and interleaves
five factions' hooks in the win branch; a per-faction `{ onValue, onWin, onLoss, onTrickEnd,
onCycleEnd }` interface is the natural next step. `computeFormations` takes 10 positional
arguments at 13 reducer and 8 UI call sites, and `reducer.js:98–102` documents a bug that came
from exactly that.

**Keep.** Addressed sub-streams and deterministic tie-breaks everywhere; rng draws consumed even
when the result is discarded (`architect.js:419`); try/catch on every storage access with
progressive pruning on quota; versioned profile migration with forward-version protection;
`rules.js` as the single source for rule switches; description templates that interpolate
constants so text and code cannot drift; contract boons as `xWith(state, base)` doors that are
provably inert when off.

## 7. UI layer — `src/App.jsx`, `src/ui/` (observed; H and M findings re-verified)

No High-severity correctness defect was found in the React layer: effects are cleaned up, Pixi
applications are created once and destroyed on unmount, async `setState` sites carry `alive`
guards, and the hooks rules are lint-enforced. The findings are about what ships, what drifts,
and what the screen reader cannot do.

**U-H1 · The three inactive catalogs ship in the entry chunk — confirmed.** `src/i18n/index.js:21–24`
statically imports `de`, `en`, `es` and `zhHans` although `LOCALES` marks the last three
`inactive`. Source sizes: `zhHans.js` 207 kB, `es.js` 129 kB, `en.js` 116 kB, `de.js` 108 kB,
plus ~90 kB of glossary and family sub-catalogs. The built entry chunk (`index-*.js`, 1,039 kB)
contains the Spanish catalog (560 matches of "ción", "Español" once) and six occurrences of the
removed `app.tutrun.*` English keys (measured); the zh-Hans text is escaped and was not counted.
Roughly half of the 1 MB entry chunk is text no player on `exp` can reach. Fix: import only
`SOURCE_LOCALE` statically and `import()` the others in `setLocale`, or route them through
`manualChunks`. **High** (impact on load, not a defect).

**U-M1 · `game` imports `ui`.** `src/game/telemetry.js:20` → `../ui/version.js` (the only such
edge; graph-verified in section 5). Fix: move `version.js` to `src/version.js` and add a
one-line ratchet. **Medium.**

**U-M2 · Locale-blind number formatting — confirmed.** Seven sites hard-code the decimal comma
with `toFixed(2).replace(".", ",")` (`ChargeBar.jsx:13, 76`, `CardDetail.jsx:12, 14`,
`Battlefield.jsx:1092`, `ChronikOverview.jsx:24`, `CardGrid.jsx:33`, plus `BuildSummary.jsx:214`,
`GlacierBar.jsx:21`, `SkillSelect.jsx:228` in variants), while 25 files already use `fmtNum`.
The inverse case: `Battlefield.jsx:1085` passes a raw JS number to `tr("bf.crit.mult", { n })`, so
German shows "×2.37" with a dot in the reduced-motion branch. `Battlefield.jsx:1091` has the
literal fallback `"Formation"`. Consistent today because only `de` is active; breaks on
reactivation. Fix: route everything through `fmtNum`; catalog the fallback. **Medium.**

**U-M3 · No focus management in modals.** 29 files render `fixed inset-0` overlays; 6 declare
`role="dialog"` / `aria-modal` (OptionsModal, FeedbackModal, UsernameModal, PrivacyModal,
DevRunSetup, Glossary). One `autoFocus` exists in the whole UI (`UsernameModal.jsx:119`); no
overlay moves focus in, traps Tab, or restores focus on close; `RunConfirm`, `BuyConfirm`,
`PerkSell`, `PerkUpgrade`, `SkillUpgrade`, `ChronikOverview`, `RunDetail` have no role at all.
Escape works everywhere (`useEscape`). Fix: a shared `useDialogFocus(ref)` and `inert` on `#root`
while a portalled modal is open. **Medium.**

**U-M4 · Per-trick full-tree re-render with unstable props (inferred).** Every `RESOLVE_TRICK`
re-renders the run tree at 0.6–3 times per second; only `Card` / `CardTile` are memoized.
`changeOptions` (`App.jsx:471`) is a new function per render and is passed to five bars,
`StatusRail` and six phase screens; `state.forged || {}`, `growth || {}`, `brandActive || {}`
(`App.jsx:1312–1313`) mint new objects per render; `GameOver` receives `{ ...state, runId }`
(`:1470`). `ArchitectScreen`'s `useMemo`s (`:165–192`) recompute whenever the `|| []` fallbacks
(`:102, 104, 129, 131`) trigger. Fix: `useCallback(changeOptions)`, hoisted `EMPTY_OBJ` /
`EMPTY_ARR`, then `memo()` on the bank panels and `StatusRail`; measure with the existing perf
recorder before and after. **Medium** (needs a measurement to become a fact).

**Low.**

- U-L1 Render-time ref writes at `App.jsx:357, 361, 371`, `Battlefield.jsx:936`,
  `PixiStage.jsx:40, 44`, `CardFxStage.jsx:61`, `FieldCompositor.jsx:189–191`. Safe today
  because nothing uses concurrent features; a hazard the day `startTransition` appears.
- U-L2 `RunLoader` denominator drift: `App.jsx:1511` passes `tasks={fxWarmTasks()}` built from a
  ref the jobs mutate; `RunLoader.jsx:75` recomputes `total` from props while the run-once effect
  counts against its captured total, so a mid-load re-render jumps the bar to 100 %. Cosmetic.
- U-L3 Duplicated helpers: a hex→RGB parser copied in 12 effect files (`LaserFaecherPixi:28`,
  `ScorchFx:36`, `MossGrow:58`, `FireHead:28`, `CubeMatrixField:159`, `PrismaKaskadePixi:23`,
  `HologridSlicePixi:49`, `BlackholeFx:50`, `FrostIce:48`, `SupernovaPixi:33`, `HoloCubePixi:29`,
  `SonnenPulsPixi:28`) plus three more variants; `clamp` ×4; `CustomizeScreen.jsx:500
  useIsMobile` duplicates `useIsWide.js:26 useMediaQuery`.
- U-L4 Stale leftovers: comments referencing the removed `UpgradeScreen` at
  `StatsScreen.jsx:257`, `modalStyle.jsx:151`, `useIsWide.js:13`; stale section headers in
  `de.js:1073, 1090, 1113`; ~400 lines each of `tut.*`, `upgrades.*`, `hint.*`, `node.*`,
  `app.tutrun.*` keys in `en` / `es` / `zhHans` that `de` dropped (tolerated only through the
  `inactive` exemption; the dead-key guard covers `de` alone). No unreachable component file
  exists — every file under `src/ui` is imported.
- U-L5 The 45 `eslint-disable react-hooks/exhaustive-deps` sites: 20+ sampled, all hold —
  trick-keyed effects (`Battlefield` 862 / 1213 / 1304 / 1345 / 1363 / 1429 / 1455, `App` 619 /
  750), build-once Pixi effects with ref mirrors, signature deps (`CardGrid:323`,
  `FormationPhase:88, 174`, `ArchitectScreen:260, 291`). Noise: `Battlefield.jsx:1475` lists every
  dep yet keeps the disable; the "#292 geprüft" boilerplate is pasted onto sites it does not
  describe (`RunLoader:70`, `Glossary:102`).
- U-L6 26 index keys, all on decorative fixed-length lists; ~17 project-prefixed class names with
  no CSS rule and no test reference (`sk-door`, `sk-focus*`, `pk-*btn`, `ps-row`, `st-bar`,
  `op-dd-cur`, `fb-nameinput`, `as-card-holo`) — undocumented anchors; `useBackGuard.js:16` pushes
  a history sentinel per mount (two under StrictMode in dev); `PerfOverlay.jsx:94–95` icon
  buttons rely on `title` only (preview-only).

**Structure.** No router: in-run overlays follow `state.phase` (`menu | play | levelup |
formation | glacier-target | architect | target | family-target | gameover`,
`App.jsx:1438–1474`); menu screens are eight booleans; campaign panels and contract overlays key
off `state.contracts` outside the phase machine; the back-gesture priority chain is at
`:480–497`. One root `useReducer`, **no React context** (only a subtree `DeckLookCtx` in
`CustomizeScreen`); `state` is passed wholesale to 10 screens, `options` + `onOption` drilled into
11 components, `Battlefield` takes ~40 props (`:1310–1321`) — depth is shallow, breadth is the
cost. `CustomizeScreen.jsx` holds 22 components in one file; `Battlefield.jsx` 5 (main ≈1,250
lines, ~25 hooks) — splitting its float / announce / ghost pools into hooks is the
highest-value structural cut.

**Import map.** Eager from `App.jsx`: `StartScreen`, `Battlefield` (with `ScorchFx`,
`BlackholeFx`, `GottChromeWord`, `FieldLayer`, `TrickBreakdown`, `Card`), `StatusBar`,
`StatusRail`, `Controls`, `BuildPanel`, `WeekMods`, `PerkSelect`, `SkillSelect`,
`FormationPhase`, `TargetSelect`, `GlacierPick`, `FamilyTargetSelect`, the five faction bars,
`GameOver`, `RunLoader`, `MusicBar`, `UsernameModal`, `CrtParticles`, `CornerTools`,
`UpdateBanner`, `RunConfirm`, `ContractPhase`, `CampaignScreens`, `Glossary`, `PerfOverlay`.
Lazy (`:83–100`, idle-prefetched only in menu and game over): `ArchitectScreen`,
`ChronikOverview`, `StatsScreen`, `CustomizeScreen`, `DevRunSetup`, `LeaderboardScreen`,
`OptionsModal`, `FeedbackModal`, `PrivacyModal`; lazy inside `Battlefield` / `CustomizeScreen`:
`PixiStage`, `CardFxStage`, `CardIonStorm`, `FireHead`, `MossGrow`, `FrostIce`, `CardEdgeGlow`,
five Gott effects, `HologridSlicePixi`, `CubeMatrixField`, `FieldCompositor`. `pixi.js` is
reached only from lazy modules, so the 863 kB chunk is truly async (confirmed in `dist/`). The
split is sensible and documented (in-run overlays eager to avoid Suspense flashes); U-H1 is the
lever that matters, the rest is tens of kB.

**Keep.** Pixi lifecycle is exemplary: `disposed` guard around async `init`, app and textures
destroyed on unmount, `visibilitychange` and pointer listeners removed, tickers gated on
`active && visible` (`PixiStage.jsx:66–124`, `CardFxStage.jsx:71–200`,
`FieldCompositor.jsx:194–334`), `FxBoundary` around the lazy compositor. Every timer / rAF /
`ResizeObserver` / `IntersectionObserver` site checked has a cleanup. `RunTimer` isolates the
250 ms tick; the prefetch chain is cancellable and never runs mid-run; the watchdog self-heals a
stuck auto-play. Clickable things are real `<button>`s (`Pill`, `OptionRow`, `Toggle`,
`JumpChip`, `Chip`, `NavRow`, `DoorCard` verified). `overlayPortal` has its own guard test;
`AppErrorBoundary` has a bilingual hard fallback.

## 8. Tests and tooling — `test/`, `sim/`, `scripts/` (observed; H and M findings re-verified)

The suite is green and the tooling entry points all run (`node --check` clean on 27 sim and
script files; every relative import in `sim/`, `scripts/` and `maintenance/` resolves;
`npm run sim -- --mode baseline --runs 2` completes in 0.7 s; `sim/probe.js`, `gen-db` and
`perk-impact` work). The problem is honesty rather than correctness: a family of guards passes
with zero assertions, 34 tests are parked behind a switch nothing pins, and one file spends
50 s recomputing the same simulation.

**T-H1 · The i18n parity guards are green but empty on `exp` — confirmed.** `LOCALES` marks
en, es and zh-Hans `ready: false, inactive: true`, so in `test/i18n-guards.test.js`
`READY_TARGETS` (line 58) and `CHECKED` (line 94) are empty arrays. Key parity (67–72),
placeholder parity (95–109), "translated ≠ source" (370–377), number parity (482–494),
terminology (746–759) and the existence checks (382–386, 765–770) all loop over nothing and
execute no `expect`. The "complete catalog must set `ready: true`" ratchet (1022–1033) exempts
inactive catalogs as well. The decision is documented (`index.js:35–39`) and correct for the
playground, but it is invisible: the suite reports these as passes, not skips, and it is the
direct reason the 28 `undefined` strings in section 9 went unnoticed. Fix: wrap the demanding
block in `describe.skipIf(READY_TARGETS.length === 0)` so it shows as skipped, and add one
forbidding check over **all** locales — `/\bundefined\b|\bNaN\b/` on every catalog value — that
the inactive flag must not exempt. **High.**

**T-M1 · `ALL_UNLOCKED` parks 34 tests and nothing guards the switch — confirmed.**
`src/game/cosmetics.js:29` exports `ALL_UNLOCKED = true`; 20 tests in `themes.test.js` and 14 in
`cosmetics.test.js` are `it.skipIf(ALL_UNLOCKED)`. No test asserts the flag's value, and none
tests the short-circuit that replaced the logic (`isUnlocked(lockedDef, emptyProfile) === true`,
`packOwned`, `globalFxOwned`). One parked test (`cosmetics.test.js:221–232`) also calls
`setLocale("en")`, which on `exp` silently returns `de`, so un-parking it would fail for an
unrelated reason. Fix: a `describe("exp: ALL_UNLOCKED")` with `it.runIf(ALL_UNLOCKED)`
behaviour tests plus a pinned flag assertion. **Medium.**

**T-M2 · `sim-perk-impact.test.js` recomputes the same simulation four times.** Lines 21, 26,
34 and 38 each call `computePerkImpact(ARGS)`; measured 49.8 s for the file, single tests
19.5 s / 12.9 s / 8.9 s / 8.5 s. The file comment (10–14) still says "globales Vitest-Limit von
5 s", as does `sim-explore-eval.test.js:8–11`; both predate the global 30 s in `vite.config.js`.
Fix: compute once in `beforeAll`; correct both comments. **Medium.**

**T-M3 · `vite.config.js` comments are stale.** Lines 146–153 say the slowest test needs 2.6 s
locally (measured here: 19.5 s, 11.0 s, 6.6 s, 3.5 s); lines 110–112 say `manualChunks` keeps
the largest chunk under the Vite warning (it is 1,039 kB). No test checks chunk size. **Medium.**

**T-M4 · Vacuous assertion and slow regex in `ecke.test.js:87–95`.** The first loop asserts
`toBeTruthy()` on a string that is never empty; the second loop's regex over the whole
stylesheet costs 1.84 s of the file's 1.86 s. Fix: delete the first loop; reuse the `rules()`
parser from `marke.test.js:47–58`. **Medium.**

**T-M5 · Twelve copies of the "play to game over" driver.** Near-identical loops in
`sim-coin-policy` (15–31), `sim-architect-weights` (10–25), `sim-formation-solver`,
`sim-family-target`, `sim-greedy`, `campaign` (28–41 and four more), `faction-panels`,
`challenger-seed`, `contracts` (1003–1005) and `stance`, while `sim/run.js` already exports
`runOne`. Fix: `test/runDriver.js` exporting `playRun(seed, policy, { onStep, guard })`. **Medium.**

**T-M6 · Test names ignore the English rule.** Keyword heuristic over `it` / `describe` names:
2,784 German, 178 English, 327 unclassifiable. Files created in September: 630 German vs 43
English; the English ones are the four `sim-*` files and `dev-run-rules`. The newest files
(`contracts` 15.09, `campaign` / `campaign-ui` / `stance` 22.09, `stance-panel` 26.09) are 100 %
German. AGENTS.md asks for English "where practical". Either enforce for new files or drop the
rule. **Medium** (policy, not code).

**Low.** T-L1 `deskBlock` brace-counting IIFE copied in 14 files and `EN_OFF` in 6 (acknowledged
at `desktopBreakpoint.js:25–27`). T-L2 importable modules read as text: `marke.test.js:63–65`
regex-matches `COLS = 5` in raw `architect.js` although `COLS` is exported; `marke.test.js:116–127`,
`arch-eff.test.js:28, 72–73`, `levelup-wings.test.js:425`, `rahmen-huelle.test.js:82` scan
`de.js` / `en.js` as text. T-L3 reflow-sensitive guards: `cz-ruhe.test.js:31, 76` and
`fx-panel.test.js:176` count raw JSX including comments; `hub-knopf.test.js:56–57` pins attribute
order; `mobile-tier.test.js:111`, `ecke.test.js:39`, `fx-panel.test.js:71`,
`announce-perf.test.js:60` pin exact spelling. T-L4 stderr noise from i18n missing-key warnings,
telemetry, leaderboard (×8) and a React `useLayoutEffect` warning (`architect-overlay.test.js`).
T-L5 `typo-tokens.test.js:115, 139` hand-rolls a drive-letter fix instead of `fileURLToPath`.
T-L6 `Math.random` passed as dummy rng in `reducer.test.js:426–447`, `coins.test.js`,
`challenger-seed.test.js` — harmless because `rngFor` derives from `state.seed`, but misleading.
T-L7 `registry-guards.test.js:175–177` coverage gate is `TEST_BLOB.includes(id)` over raw text
with 2–3-character ids; honest today, weak mechanism.

**Coverage map** (test files importing each `src/game` module, measured): `deck` 51, `reducer`
47, `engine` 32, `constants` 29, `skills` 28, `glacier` 16, `architect` 16, `formations` 15,
`storage` 10, `perks` 9, `families` 9, `factions/ice` 8, `coins` 4; `cosmetics`, `glossary`,
`leaderboard`, `rarity`, `factions/lightning` 3; `campaign`, `profanity`, `progression`,
`telemetry`, `themes`, `factions/fire`, `factions/plant` 2; `color`, `contracts`, `decisionLog`,
`perkSale`, `reports`, `rng`, `rules`, `runStats`, `shop`, `weekMods`, `weeklySeed`,
`factions/stance` 1 each (a dedicated file); **`devCatalog` 0** direct. `src/i18n`: `index` 13,
`de` 9, `en` 6, `labels` 4; `es`, `zhHans` and every `en*` / `es*` sub-catalog 0 direct.

**Ratchet sample** (17 files read in full). Meaningful, with counter-checks and comment
stripping: `harness-honesty`, `registry-guards`, `typo-tokens`, `hook-deps-budget`,
`bundle-split`, `skill-invocation-guard`, `kante-anlauf`, `marke` (except 63–65 / 116–127),
`fx-panel`, `announce-perf`, `desktopBreakpoint`, `mobile-tier` (123–130), `panel-tokens`
(2,117 lines, ~60 % prose, ink caps are frozen counts). Vacuous on `exp`: `i18n-guards`
(T-H1), `ecke` 87–91. Weak: `cz-ruhe`, `hub-knopf`. `sim-balance-guard` is meaningful but
carries 100+ lines of re-centring history inside the test file.

**Keep.** No `.only`, `.todo` or bare `.skip`; no wall-clock dependence (`weeklySeed` uses fixed
UTC, `feedbackRateCheck(now)` is injectable); no absolute paths; `process.env` guarded. The EN
skip is itself pinned (`i18n-guards.test.js:959–978` asserts `READY_LOCALE_IDS` is `["de"]`).
Guard-the-guard and comment stripping are established idioms and `testing.md` §6–8 documents
the traps precisely; the dead-key guard records its own two past defects (1138–1153).
`eslint.config.js` has no stale settings and lints `test/`, `sim/` and `scripts/`.

## 9. Localization and documentation — `src/i18n/`, `docs/` (observed; H and M re-verified)

**I-H1 · The English and Spanish catalogs contain "undefined" and "NaN" and describe skills that
no longer exist — confirmed.** Each of `enSkills.js`, `esSkills.js`, `enGlossary.js`,
`esGlossary.js` does `import * as C from "../game/constants.js"`; commit `91ab2ed4` removed
39 plant constants (−105 lines) and rewrote only `de.js`. A namespace import degrades silently
and the template literals evaluate at module load, so the `interpolate()` safety net
(`index.js:131–138`) never sees them. Measured at runtime:

> `ability.SK_PLANT_02.desc` (en) = "Every win by a green card gives +undefined root score, plus
> a bonus that rises with the total growth on the field (max +undefined at ~NaN growth)."

28 values per catalog are affected: `ability.SK_PLANT_{02,03,04,05,06,07,08,10,11,12,13,14,15,
16,17,18,L01,L02,L03,L04}.desc` and `glossary.{ueberlauf,growth,setzling,wurzeln,bluete,trimmen,
overgrowth,eternalSpring}.text`. Beyond the numbers the texts are semantically stale:
`SK_PLANT_12` is "Lichtung" in German but "Photosynthesis" in English, `SK_PLANT_15` "Dickicht"
vs "Runners"; `SK_PLANT_02 / 18 / L01` are no longer in `SKILL_LIST`; the 18 `SK_STANCE_*` and
`SK_LIGHTNING_02 / 12` have no English or Spanish entry at all.

Exposure: `DEFAULT_LOCALE` is `de`, `setLocale` refuses non-ready ids, and the options picker
is hidden when only one locale is ready — so **nobody sees this by default**. But
`src/main.jsx:70–73` pins any registered locale from `?lang=` when `VITE_PREVIEW === "1"`, and
`deploy-exp.yml:43` builds `exp` with exactly that flag, so `/autostich/exp/?lang=en` renders the
strings today. The translator CSVs in `docs/localization/` carry them verbatim (18 rows en, 22
es, 18 zh via `en_ref`), and `test/loc-csv.test.js` faithfully enforces that sync. Fix:
short-term, point the four files at the plant tier tables in `skills.js` / `factions/plant.js`
(as `de.js` does) or drop the plant sections with a comment, so the build is warning-free;
add `build.rollupOptions.onwarn` that throws on `MISSING_EXPORT`; then decide with the owner
whether inactive catalogs are pruned to `SKILL_LIST` now or on reactivation. **High.**

**I-M1 · No guard forbids `undefined` or a missing export.** Every check that would catch I-H1
exempts `INACTIVE_LOCALE_IDS` (section 8, T-H1); `i18n-guards.test.js:112` ("kein Katalogtext
ist leer") runs over all locales but "undefined" is not empty; `vite.config.js` has no `onwarn`.
**Medium** (the mechanism half of I-H1).

**I-M2 · `README.md` documents `main`, not `exp` — confirmed.** Header lines 15–20: "v0.3", "4
Elementar-Archetypen" (five on `exp`), "Upgrade-Baum (SP/DP)" (removed), "1263 Vitest-Fälle (84
Dateien)" (162 files / 2,907 tests; AGENTS.md forbids volatile counts in durable docs); line 38
"Entwickelt wird auf `Autostich_Test`" (the branch model is `main → test → dev` plus `exp`);
§14 lists `AnleitungModal`, `CrystalBar`, `FrostOverlay`, `StatSelect`, none of which exist.
Nothing on contracts, coins, campaign or Prisma. Last substantive edit 2026-09-06. Fix: replace
the header with a pointer to `AGENTS.md` and `docs/README.md`, delete the counts, and add one
paragraph saying what `exp` changes — or mark the file explicitly as describing `main`. **Medium.**

**I-M3 · `docs/localization/i18n.md` contradicts the code it routes to.** Lines 66 and 140 say
`DEFAULT_LOCALE` is `en` (code: `de`); line 141 lists `de en es` with `de en` ready (code: four
locales, `de` only); lines 310 and 316 reference `src/i18n/guideWalk.js`, deleted on `exp`; no
mention of the `inactive` flag. This is the document AGENTS.md routes every i18n task to.
**Medium.**

**I-M4 · Placeholder divergence in the inactive catalogs (latent).** 14 en / 17 es / 18 zh keys
differ from `de` in their `{placeholders}`: e.g. `bar.ice.chip.title` de `{at}{mass}{tier}` vs
en `{mass}{tier}`; `bar.lightning.storm.title` en has `{cap}`, de none (would render literally);
`skill.passive.{lightning,fire,plant}`, `card.ring.grown`, `bar.plant.strip.green`,
`building.eff.*`. All exempt under `INACTIVE`. Low today, a runtime text bug the day a locale is
reactivated. Fix: keep the exemption, but keep this list on the reactivation checklist. **Medium.**

**Low.** I-L1 `index.html:2–5` comment and `<html lang="en">` claim the default is English;
`main.jsx:77` overwrites it at boot, so only the pre-mount frame is wrong. I-L2 Misleading
comments: `i18n-guards.test.js:972` "three complete catalogs"; `en.js:2–3` "guard test fails the
build if a key is missing" and "84 skills"; `index.js:38–39` "new German keys get no
translation" while `en.js` was still edited on 2026-09-25. I-L3 Stale artifacts in
`docs/localization/`: `strings_de.csv` (old schema), two `strings_de_delta_*.csv`,
`strings_de_banners.csv`, `_ui_candidates.tsv` — not regenerated by `loc:export`; the English
export is still named `strings_de_pixi_2026-08-15.csv`. I-L4 The `MIGRATED` ratchet
(`i18n-guards.test.js:1054–1096`) lists 54 files; 27 `src/ui` files are outside it, including
the exp-era `CampaignScreens`, `ContractPhase`, `PerkSell`, `PerkUpgrade`, `SkillUpgrade`,
`HeldSkills`, `BuyConfirm`, `RunConfirm`, `UpdateBanner`, `CornerTools` — clean today (the
project's own `locTodo` flags 2 fragments), unprotected tomorrow. I-L5 `docs/README.md` omits
`kampagne.md`, `zwischenaufgaben.md`, `muenz-oekonomie.md`; `docs/text-style-guide.md:9, 146`
references the deleted `src/ui/guides.js`. I-L6 `docs/skill-rework.md` is 10,651 lines /
856 kB in one file, cited by section number from five `src/ui` files; an owner design document,
deliberately German, that belongs in the repo but would gain from a per-faction split or index.

**Catalog parity** (flattened keys, measured):

| Locale | Keys | Missing vs de | Extra vs de | Values with undefined / NaN |
| --- | --- | --- | --- | --- |
| de | 2,763 | 0 | 0 | 0 |
| en | 2,815 | 605 | 657 | 28 |
| es | 2,710 | 710 | 657 | 28 |
| zh-Hans | 2,861 | 711 | 809 | 0 |

Missing keys cluster in exp-only systems (`contract.loot` 73, `contract.task` 31, `dev.run` 22,
`bar.stance` 21, `campaign.*`, `ability.SK_STANCE_*`); extra keys are removed systems (`tut.sz`
135, `tut.d` 47, `bar.plant` 29, `upgrades.*`, `guide.*`). At runtime `t()` resolves own catalog
→ `via` chain (es / zh → en) → `de` → key, so a missing English key shows **German**
(measured). "Offen" in the export means an empty target column: 726 / 831 / 832 = the missing
keys plus 121 rows that only render for ready locales. All four catalogs are bundled into the
1 MB entry chunk although only one is active (inferred from the chunk list; `de` + `en` + `es`
+ `zhHans` are ~8,600 source lines).

**Hard-coded strings.** Attribute scan (`title`, `aria-label`, `placeholder`, `alt`) over
`src/ui` and `App.jsx`: 0 hits. Text-node scan: `AppErrorBoundary.jsx:28–30` (deliberate
bilingual fallback around a `t()` that may itself have failed), `DevPerkCatalog.jsx:48`
(dev-only), `Battlefield.jsx:311` (a font name). The catalog migration the August report asked
for is complete.

**Documentation that is current.** `AGENTS.md:168` has "The `exp` branch";
`docs/engineering/git-workflow.md:51, 753` knows `exp`; no missing file references in
`docs/engineering/*.md`; `docs/decisions/README.md` status-marker scheme intact. The six
exp-era design documents (`haltungen-fraktion.md`, `kampagne.md`, `zwischenaufgaben.md`,
`muenz-oekonomie.md`, `fraktion-5-brainstorm.md`, `skill-rework.md`) each declare "Sprache
Deutsch, weil Produktsprache, Owner schreibt mit" in their header — design documents in the
owner's domain, compliant with the language policy. The three exp handoffs in
`docs/workstreams/skill-rework/` are English — compliant.

## 10. Process and CI (measured)

**Double CI.** `ci.yml` runs on every push except `main`, `test` and `dev`; `deploy-exp.yml`
runs on every push to `exp` and executes the same `npm ci` / `test` / `lint` / `build` / `gen:db`
sequence before deploying. Both ran for each of the last six `exp` commits with identical head
SHAs and start times (measured via the GitHub API). Adding `exp` to `branches-ignore` in
`ci.yml` halves the runner minutes for this branch at no loss of coverage.

**Commit messages.** Of 512 non-merge commits on `exp`: 251 carry a conventional-commit
prefix (`feat(exp):`, `fix:`, …) and 261 do not; a German-marker heuristic (umlauts, ae/oe/ue
digraphs, common German words) matches about 190 subjects, e.g. "Prisma: die Passive staffeln mit
dem Bau (Owner)", "Balance-Waechter: Median-Band auf die Fuenfer-Welt neu zentriert". AGENTS.md
lists commit messages under *Engineering language — English*. The early `exp` commits
(2026-09-02 to 09-08) follow the rule; the later ones do not. Every one of the 537 commits is
authored "Claude" (measured), so the drift is in the sessions' prompts, not in a human habit.

**Balance guard churn.** `test/sim-balance-guard.test.js` was changed in 29 of the 537 commits
— on average once a day — each time re-centring a median/mean band after a balance change. It
behaves as a measurement pin, not an invariant. On 2026-09-27 commit `16c4c327` was pushed with
the guard knowingly red ("ROT bleibt sim-balance-guard — Owner-Entscheid: nicht anfassen");
both workflows failed, and the next commit moved the band. That is a legitimate owner decision,
but it means the deploy to `/exp/` skipped a commit and the CI history now contains a red run
that was not a regression. A `describe.skipIf(process.env.BALANCE_RETUNE)` style switch, or
moving the band into the same commit as the balance change, avoids the red push.

**Test wall time.** Three files dominate the 80 s suite: `sim-perk-impact.test.js` 49.8 s
(one test 19.5 s), `sim-explore-eval.test.js` 17.7 s (one test 11.0 s), `faction-panels.test.js`
10.5 s. `vite.config.js` sets `testTimeout: 30_000` with a comment saying the slowest test needs
2.6 s locally; in this container the slowest needs 19.5 s, 65 % of the limit. On a loaded CI
runner this is the file that will time out first, and the failure will look like a regression.

## 11. Follow-up on the August health check (measured)

Both health-check branches are ancestors of `exp` (`e8f27b5a` report and tripwire; `0393b9d9`
last fix commit). Spot checks of the fixes on the `exp` head:

| August finding | Status on `exp` |
| --- | --- |
| S3 `AppErrorBoundary` | present (`src/ui/AppErrorBoundary.jsx`, wired in `main.jsx`) |
| G1 `archOf(state)` on all `computeFormations` sites | present — 14 of 15 call sites pass `archOf`, the 15th passes `architectEnabled ? s.architect : null` explicitly |
| M12/M14/M22/M26 hard-coded German in Card, ChargeBar, MuteButton, LayoutPerks | fixed — none of the literals remain |
| M3 telemetry queue race | fixed, with the explanation kept as a comment |
| M20 StatsScreen double-Escape | fixed (`useEscape(detail ? … : onClose)`) |
| M10 `Schale` component defined inside render | fixed — `ArchPanels.jsx:79` now picks between two module-level components, which removes the remount |
| R1 996 MB evidence backlog | **open** — decision was the owner's; tripwire rule in place, no cut made |
| Owner items: two SQL constraints, crash-screen sign-off, G1 sign-off | not verifiable from the repository |
| Deferred M16 / M17 (capture scripts), S6 (`publishRun` failures invisible) | not re-examined here |

## 12. What this health check did not examine

- **Visual correctness.** Nothing was rendered; no screenshot, no browser run. Findings about
  CSS are about reachability, not about how the screens look.
- **Balance and gameplay feel.** The simulation harness ran only in the tests' own
  configurations; the balance bands were not judged, only their churn counted.
- **Supabase server side.** The two SQL constraints the August report asked the owner to apply
  cannot be verified from the repository.
- **The deployed `/exp/` slot itself.** CI results were read through the GitHub API; the Pages
  output was not fetched.
- **`docs/workstreams/` contents beyond size and language.** 185 Markdown files were sampled,
  not read.
- **`sim/` and `scripts/` internals.** Verified to parse, import and run; not reviewed for
  correctness of the simulations.
- **Pixi effect code in depth.** Section 7 covers lifecycle and leaks in the effect components;
  shader and geometry code was not audited.
- **Windows.** All measurements are from Linux. The August report covered the Windows host.

### Decision block — three questions for the owner

1. **The 996 MB evidence backlog (R1, open since August).** Keep, archive to a branch, or
   rewrite history. Only a rewrite shrinks clones; it is a house-rule item and needs an
   explicit yes. Recommendation: move `docs/workstreams/*/evidence/` to an `archive/evidence`
   branch and rewrite `dev` / `exp` / `test` / `main` once, in one announced window.
2. **The inactive catalogs.** Prune en / es / zh-Hans to `SKILL_LIST` now (small, keeps the
   build honest, loses nothing that reactivation would not have to redo) or leave them as a
   frozen snapshot with the `undefined` strings fixed (the minimum). Recommendation: prune.
3. **The commit-message rule on `exp`.** Enforce English with a conventional prefix (the rule
   as written), or amend AGENTS.md to exempt `exp`. Recommendation: enforce — the early exp
   commits show the sessions can do it.

Everything else in the action list is technical and needs no decision.

## Appendix A — finding index

| ID | Sev. | Location | One line |
| --- | --- | --- | --- |
| G-H1 | High | `reducer.js:279, 731`; `contracts.js:592`; `engine.js:522, 1187` | Contract cycle tally misses the closing trick; "Durchmarsch schwer" unreachable |
| I-H1 | High | `i18n/enSkills.js`, `esSkills.js`, `enGlossary.js`, `esGlossary.js` | 39 removed constants → 28 "undefined"/"NaN" strings per catalog; reachable via `/exp/?lang=en` |
| T-H1 | High | `test/i18n-guards.test.js:58, 94` | Parity, placeholder, number and terminology guards iterate empty lists on `exp` |
| U-H1 | High | `i18n/index.js:21–24`; `dist/assets/index-*.js` | Three inactive catalogs bundled into the 1 MB entry chunk |
| R-1 | High (carried over) | `docs/workstreams/**` | 996 MB committed evidence; August decision still open |
| G-M1 | Medium | `reducer.js:250, 480, 505, 539` | Contract / campaign draws bypass the seeded rng |
| G-M2 | Medium | `reducer.js:369–394` vs `:985–991` | `dropSkill` misses `stance` and `tendrils` resets |
| G-M3 | Medium | `game/telemetry.js:20, 53, 59, 80–90` | Game layer imports UI, reads `window`, `localStorage`, `Math.random` |
| G-M4 | Medium | `engine.js`, `reducer.js`, `progression.js`, `shop.js` | Upgrade-tree, anchor and time-segment plumbing is constant on `exp` |
| G-M5 | Medium | `engine.js:119–1373`; `reducer.js:405–1351` | `resolveTrick` 1,255 lines, `reducer` 947 lines; cycle-end logic duplicated |
| U-M1 | Medium | `game/telemetry.js:20` | The one game→ui import edge |
| U-M2 | Medium | seven `toFixed().replace` sites; `Battlefield.jsx:1085, 1091` | Locale-blind number formatting; a literal fallback |
| U-M3 | Medium | 29 overlay files | No focus move, trap or restore in any modal |
| U-M4 | Medium (inferred) | `App.jsx:471, 1312–1313, 1470` | Per-trick full-tree re-render with unstable props |
| T-M1 | Medium | `cosmetics.js:29`; `themes.test.js`, `cosmetics.test.js` | 34 tests parked behind `ALL_UNLOCKED`; nothing pins the flag |
| T-M2 | Medium | `test/sim-perk-impact.test.js:21–38` | Same simulation computed four times; 49.8 s |
| T-M3 | Medium | `vite.config.js:110–112, 146–153` | Stale chunk-size and timeout comments |
| T-M4 | Medium | `test/ecke.test.js:87–95` | Vacuous assertion; 1.84 s regex |
| T-M5 | Medium | twelve test files | Copied "play to game over" driver |
| T-M6 | Medium (policy) | `test/*.test.js` | Test names 94 % German, including every September file |
| I-M1 | Medium | `test/i18n-guards.test.js:112`; `vite.config.js` | Nothing forbids `undefined` in a catalog or fails on `MISSING_EXPORT` |
| I-M2 | Medium | `README.md:15–20, 38, 404, 417`, §14 | Describes `main`, volatile counts, removed features, phantom components |
| I-M3 | Medium | `docs/localization/i18n.md:66, 140–141, 310, 316` | Wrong default locale, locale sets, deleted file |
| I-M4 | Medium (latent) | 14 en / 17 es / 18 zh keys | Placeholder sets differ from `de` |
| B-1 | Medium | `vite.config.js` (no `onwarn`) | 112 build warnings pass CI |
| B-2 | Medium | `dist/assets/index-*.js` 1,039 kB | Entry chunk twice the warning limit |
| D-1 | Medium | `pixi.js` → `@xmldom/xmldom` 0.8.13; ESLint → `js-yaml` 4.3.1 | Two high advisories; `npm audit fix` errors |
| S-1 | Medium | Appendix B | 94 unused exports, 254 test-only exports |
| S-2 | Medium | `src/index.css` | 174 unreferenced classes; ~416 lines for deleted screens |
| S-3 | Medium | `i18n/de.js`, `i18n/labels.js` → `ui/indicators/vocab.js` | Catalog imports UI |
| P-1 | Medium | `.github/workflows/ci.yml` | `exp` runs CI twice per push |
| P-2 | Medium (policy) | git history `dev..exp` | 261 of 512 subjects without prefix; ~190 German |
| P-3 | Medium (process) | `test/sim-balance-guard.test.js` | Re-centred 29 times; one deliberately red push |
| P-4 | Medium | `test/sim-perk-impact.test.js` | Slowest test at 65 % of the 30 s timeout |
| R-2 | Low | remote branches | 17 merged-and-undeleted, 8 unmerged `claude/*`, one redundant `feature/*` |
| R-3 | Low | `.nimbalyst/` | 1.5 MB of committed transcript screenshots |
| G-L1–L9, U-L1–L6, T-L1–L7, I-L1–L6 | Low | see sections 6–9 | stale constants, comments, duplicated helpers, weak guards, stale docs and artifacts |

## Appendix B — exports referenced by no other file (94, measured)

A whole-word search of every `.js` / `.jsx` / `.mjs` file under `src/`, `test/`, `sim/`,
`scripts/`, `bench/` and `maintenance/`, excluding the defining file. Whole-word matching means
a symbol reused as a plain word elsewhere would be counted as used, so the true number is at
least this.

| File | Exports |
| --- | --- |
| `game/architect.js` | `FORM_TIER_BONUS`, `ARCHITECT_CAT_WEIGHT`, `ARCHITECT_LEGENDARY_CHANCE`, `neighborCounts`, `noOfferPlaceable` |
| `game/campaign.js` | `hasStep`, `clearedOf`, `nextUnlock`, `hasUnlock`, `DECK_UNLOCKS`, `decksFor`, `maxTierFor`, `isCleared`, `CAMPAIGN_COINS_PER_CYCLE`, `priceLadderWith` |
| `game/coins.js` | `FORFEIT_ENERGY`, `REROLL_LEG_BASE`, `PRICE_LADDER`, `priceStep`, `ladderOf`, `ENERGY_BASE`, `COVER_BASE`, `COVER_MAX_BUYS`, `stepBuy`, `FOCUS_PRICE` |
| `game/contracts.js` | `LOWER_SHARE`, `LEGENDARY_SHARE`, `LOOT_PER_REWARD`, `LOOT_CATEGORIES`, `suitsAtStreak`, `readValue`, `minSuitWins`, `isWindowStart`, `isWindowEnd` |
| `game/cosmetics.js` | `MONO_CHALLENGE_N` |
| `game/devCatalog.js` | `fullSkillOffer` |
| `game/factions/fire.js` | `hasSonnenkern`, `hasEwigeGlut`, `hasSonnenzorn` |
| `game/factions/ice.js` | `ROLE_SKILL`, `iceRow` |
| `game/factions/lightning.js` | `hasHochspannung` |
| `game/factions/plant.js` | `SCORE_BY_TYPE`, `hasEwigerFruehling`, `isGreen`, `isBloom`, `bloomCount`, `formationGreenCount`, `GREEN_SUIT` |
| `game/glacier.js` | `KOLLISION_MULT`, `chebyshev` |
| `game/progression.js` | `COVER_FLOOR`, `ENERGY_FLOOR`, `RARITY_TIER_BASE`, `ARCHETYPES_BASE`, `LEG_MULT_PER_SHIFT`, `LEG_PERK2_FORCE`, `BRANCHES`, `BUYABLE_NODES`, `gateMet`, `ONBOARDING_ARCH_UNLOCK`, `ONBOARDING_RARITY_UNLOCK`, `SP_MILESTONES` |
| `game/skills.js` | `HOCHSPANNUNG_ID` |
| `game/storage.js` | `RANKED_WEEK_SP`, `RANKED_WEEK_DP`, `RANKED_WEEK_DP_FULL`, `HIGHSCORE_CAP`, `isRankedMode` |
| `game/themes.js` | `CARD_ANIM_KEYS` |
| `game/weeklySeed.js` | `weekLabelShort` |
| `i18n/labels.js` | `trimmableNames` |
| `ui/BrandGrid.jsx` | `EM` |
| `ui/BuildSummary.jsx` | `ZinsReadout` |
| `ui/CoinMark.jsx` | `COIN_GOLD`, `CoinIcon` |
| `ui/ContractPhase.jsx` | `contractText`, `contractExtraText`, `contractName` |
| `ui/CustomizeScreen.jsx` | `isGiftPack` |
| `ui/FactionIcon.jsx` | `GLOSSARY_IMG_SRC`, `FACTION_GLOW` |
| `ui/fx/announceChrome.js` | `TON_JE_RANG` |
| `ui/fx/cardFx/glitch.js`, `holo.js` | `GLITCH_TUNE`, `HOLO_TUNE` |
| `ui/fx/firePalette.js` | `FIRE_NEON` |
| `ui/indicators/panelKit.jsx` | `PANEL_STYLE` |
| `ui/indicators/vocab.js` | `LIGHTNING_ACCENT`, `ASH`, `FORGE_GLOW`, `CASCADE`, `THUNDER`, `GLACIER`, `MOSS_GREEN_STAGE` |

Exports referenced **only from `test/`** (254) are concentrated in `game/progression.js` (35),
`game/storage.js` (21), `game/contracts.js` (19), `game/coins.js` (10), `game/themes.js` (9),
`ui/fx/CubeMatrixField.jsx` (9), `game/campaign.js` (8), `game/factions/plant.js` (7),
`game/perkSale.js` (7), `game/skills.js` (7), `ui/CustomizeScreen.jsx` (7). The generating
script is reproducible: it is 60 lines of Node and can be committed under `scripts/` if the owner
wants the number tracked.

## Appendix C — class names in `src/index.css` referenced by no source file (174, measured)

Families that belong to components deleted on `exp` (62 rule blocks, ~416 lines):

- `up-*` (UpgradeScreen, 96 names): `up-actions up-bal up-bal-k up-bal-u up-bal-v up-branch
  up-branch-h up-branches up-card up-chain-row up-chall up-chall-b up-chall-bar up-chall-f
  up-chall-k up-chall-link up-chall-n up-charrow up-close up-desk up-dist up-distbar up-distkey
  up-drop-t up-dropbar up-dropbox up-droplegend up-dropnow up-eyebrow up-facbody up-headrow
  up-impact up-impact-grid up-impact-h up-leg up-leg-buy up-leg-m up-leg-n up-leg-row up-leg-why
  up-legend up-legend-hint up-legend-outer up-legend-page up-mark up-navhead up-navrow up-navtext
  up-nodes up-nodes-k up-nodes-v up-page-eyebrow up-page-guide up-page-h up-page-hint up-rank
  up-rank-b up-rank-k up-rank-v up-readout up-readout-phone up-skill up-skill-d up-skill-n
  up-skillgrid up-skills up-skills-h up-stat up-stat-b up-stat-k up-stat-max up-stat-next
  up-stat-v up-sub up-tabs up-varrow up-vchain up-vgrid up-vlane up-vlane-h up-vlane-n
  up-vlane-note up-vnode up-vnode-m up-vnode-t up-vnode-w`
- `gd-*` (guide overlay, 43 names): `gd-bar gd-barname gd-barpay gd-barscale gd-card gd-close
  gd-col gd-cols gd-core gd-desk gd-dim gd-frame gd-hair gd-headrow gd-hint gd-loopgrid
  gd-navhead gd-navnote gd-navtext gd-page gd-page-eyebrow gd-page-h gd-page-hint gd-pglyph
  gd-pillar gd-pname gd-princ gd-ptext gd-ringbox gd-scroll gd-seclabel gd-sectext gd-step
  gd-stepno gd-tabs gd-tag gd-title gd-valve guide-ring-spark`
- tutorial and hints: `tut-btn tut-card as-tut-btn as-hint-anchor-pulse`

Names that need a reader's judgement (they may be composed at runtime or reached through
Tailwind's explicit `@source` list): `as-banner as-bg-hot as-bg-mid as-bg-quiet as-bonus-track
as-burn-flicker as-field-aurora-a as-field-aurora-b as-field-bloom as-field-rise as-field-spark
as-head as-hub-bonus as-hub-cur as-hub-num as-lead-gem as-logo-card as-motor-flow as-panel-arch
as-panel-sunken as-result-pulse as-shake-1 as-shake-2 as-shake-3 as-shell as-star-twinkle
as-streak-glow as-streak-pulse as-wordmark-header as-wordmark-hero crt-title cz-bal go-earn
go-unlocks is-buy is-done is-lead is-leg is-owned is-poor lv-grip-r rn-milestone rn-music
sk-offers-leg ty-unit`.
