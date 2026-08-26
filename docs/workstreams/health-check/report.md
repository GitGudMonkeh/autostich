# Health-Check — Code, Repository, and Agent Harness

Task: `#health-check`, Tier B. Assessed against `dev` @ `264c1e8a1f395a94274efa760cee3a82a2458626`
(2026-08-26), on the Windows development host, Node v24.18.0. Part 1 changed nothing; `src/` and
`test/` were only read. Every number is labelled **measured** (a command was run), **computed**
(derived from measurements), or **estimated**.

*Branch note:* `task/health-check` was cut from `origin/dev` @ `b476e47b`, 19 commits
(tutorial/text work) ahead of the assessed SHA. The findings were measured at `264c1e8a` and were
not re-assessed against those 19 commits.

**Coverage: complete.** On the owner's instruction the audit covers the entire code, not a sample.
All 427 code files (99,921 lines: `src/` 214 files incl. the full 8,112-line `index.css` and all
i18n catalogs, `test/` 154, `sim/` 21, `scripts/` 30, `maintenance/` 4, `bench/` 1, plus
`vite.config.js`, `eslint.config.js`, `index.html`) were read first line to last by 21 parallel
audit agents, one batch of ~5,000 lines each. Coverage was verified mechanically: every agent
reported per-file read confirmation, and the union was reconciled against the file inventory —
**427 of 427 read fully, 0 missing, 0 partial** (measured). Every medium-severity finding below
was additionally spot-checked against the source by the coordinating session before inclusion.

**Process note.** The order called for the worktree `/create-task health-check B` creates. It did not
exist when this session started, and `/create-task` is owner-invoked (`CLAUDE.md` — *Project
commands*), so the analysis ran read-only from the cockpit checkout instead, and this report is
delivered for the owner to have committed onto `task/health-check` once the worktree exists. Nothing
in the repository was modified; the four gates were run in the cockpit and left the working tree
clean (verified with `git status --porcelain` after `gen:db` — empty, measured).

---

## Page one — for the owner

### The six findings that matter most

**1. All four gates are green on `dev`.** `npm test` (151 files, 2418 tests, 36.7 s), `lint
--max-warnings=0`, `build`, `gen:db` — all exit 0, run unpiped, working tree clean afterwards
(measured). No Windows load-artifact timeout occurred this run. The baseline you are deciding from
is a healthy one.

**2. The evidence rule broke ten days ago and it cost ~950 MB, mostly invisible.** The rule against
committing heavy machine output (`task-lifecycle.md` — *Committing evidence*, citing the 11 MB
viewport-1280 incident) was committed 2026-08-21. The heavy evidence arrived **after** it:
2026-08-23 through 2026-08-26 (measured from `git log --diff-filter=A`). Composition of the 997 MB
under `docs/workstreams/`: **676 MB is JSON** (112 files — 32 of them over 5 MB, the largest a
uniform family of ~22 MB `matrix.json` geometry dumps), 250 MB PNG, ~70 MB WebP (measured). All of
it is tracked; workstream blobs are **52 % of all blob bytes in the repository's history** (1021 MB
of 1970 MB, measured across all refs). The interesting failure is not the size — it is that the rule
names geometry dumps and survey matrices explicitly ("commit the table that carries the claim, not
the machine output behind it") and every one of those matrix.json files is exactly that. Diagnosis
and options: Part 1, finding R1. Removal means history rewriting, which is reserved; it is
**described, not proposed** below.

**3. The leaderboard and feedback tables trust the client more than the rest of the system does.**
Score inserts are unvalidated server-side (`docs/supabase-schema.sql:73` — `with check (true)`, no
range constraint on `score`), the feedback rate limit lives only in localStorage
(`src/game/storage.js:873-918`), and the feedback message length is capped only by the textarea
(`src/ui/FeedbackModal.jsx:209`). The telemetry table already shows the intended fix — it carries a
size check constraint (`docs/telemetry-schema.sql:79`); scores and reports lack the equivalent
(computed). Anyone with the bundled anon key (public by design) can top every board or flood the
reports table. Part 1, findings S1–S2.

**4. One render-time chunk failure can still blank the app — and the code knows it.**
`src/ui/fx/FxBoundary.jsx:3-16` documents that the app has no global error boundary, that exactly
this failure shipped once (black screen minutes after the first compositor deploy), and that an
app-wide boundary was deliberately deferred as its own decision. All menu overlays are `React.lazy`
behind bare `Suspense` (`src/App.jsx:1349, 1361, 1395, 1435`); a deploy race that breaks a lazy
import at render still unmounts the whole tree (measured code path, scenario computed). This is a
known, named gap whose decision is now worth taking — not an oversight. Part 1, finding S3.

**5. English players see German in eleven places — the guard's documented blind spots, filled
in.** The full read found hard-coded German player-visible text in 11 UI files that the
localization ratchet cannot see, exactly where `testing.md` §9 predicts (tooltips, `title`,
constant tables, `aria-label`): every played card (`src/ui/Card.jsx:158-160` — "Basis",
"⚔ +N Stich" — plus seven German tooltip families in the same file), the game-over onboarding
banner (`GameOver.jsx:411, 420`), the deck histogram legend (`BuildSummary.jsx:227, 244`), the
challenge status pills (`DeckDetail.jsx:166` — "✓ frei / 🔒 gesperrt"), a panel heading
(`LayoutPerks.jsx:16`), glacier/firn tooltips (`CardGrid.jsx:193, 200, 224`;
`ArchitectScreen.jsx:848`; `RunStats.jsx:100`), the mute button's `aria-label`
(`MuteButton.jsx:7`), and the lightning panel (`ChargeBar.jsx:204, 212`). All measured, each
verified to sit beside siblings that use `t()` correctly. One catalog comment describes the
opposite of shipping behaviour: `src/i18n/index.js:39-47` still calls zh-Hans a 111-key fixture
with `ready: false`; the code reads `ready: true` with a complete 2,660-key catalog (measured).
Part 1, cluster F1.

**6. The harness carries; the fat is in two places, not everywhere.** No dangling cross-reference
was found (measured, pattern check over every `docs/...` path named in the harness). No genuine
rule contradiction was found. The two real reduction targets: **`conventions.md` §2c has become a
dated ruling log** (~430 of its 764 lines are case narratives from 2026-08-24/25 — the file's own
header promises "no measurements, no dated implementation state"), and **`AGENTS.md` carries ~150
lines whose full text also lives in the routed documents** where the affected task would read them
anyway. The deliberate duplications (ratchet hazard, gate list, pipe rule) are identified and kept.
Part 2 below; every cut names what it costs.

### Recommended cuts, each with its cost

| Cut | Lines saved | What is lost, and why that is acceptable |
| --- | --- | --- |
| C1. Move `conventions.md` §2c's dated rulings (MENU-38/44/46-51, M3/M4/M5/M8/M9/M11 narratives) to `docs/decisions/engineering-log-2026-08.md`; keep the distilled rules (~60 lines: the ladder, the two "pick a token" rules, the third-call-site threshold, the ≤2/255 and Δα≤0.01 bounds, the permanent exemptions, the worker-still-asks clause) | ~370 of 764 | **Lost:** the case narratives at the point of rule use. **Acceptable because** the decision log is the designated home for exactly this material (`conventions.md` §5 says so itself), every rule the cases produced is kept in place, and each kept rule gets a one-line provenance pointer. Nothing is deleted, only moved to where the file's own charter says it belongs. |
| C2. Slim `AGENTS.md` — *Independent review* to ~15 lines (optional/risk-based, the four readiness conditions, pointer) | ~45 of 596 | **Lost:** full/closure review mechanics and the review budget from the always-read file. **Acceptable because** they are duplicated in `task-lifecycle.md` §8, which any session actually running a review is routed to; the rule that must survive in every session — "review is optional, absence blocks nothing" — stays. **Caveat:** `task-lifecycle.md` currently declares the budget "canonical in `AGENTS.md`" — that sentence must be updated in the same commit or the pointer chain inverts. |
| C3. Delete `git-workflow.md` §10 (Validation) | ~40 of 862 | **Lost:** the gate list from the Git document. **Acceptable because** it is a verbatim third copy — `AGENTS.md` (always read) and `testing.md` §1 both carry it, and `NEW_MACHINE_SETUP.md` §4 already demonstrates the correct pattern ("that list is authoritative and is deliberately not copied here"). Replace with that one pointer sentence. |
| C4. Cut `CLAUDE.md`'s *Historical knowledge* and *Language* sections | ~20 of 69 | **Lost:** a restatement. **Acceptable because** `CLAUDE.md` inlines `AGENTS.md` via `@AGENTS.md`, so every session that reads one reads both — this duplication buys the emphasis argument nothing (unlike the ratchet warning, which bridges to a document that is *not* always read). The file even declares rules "deliberately not repeated here", then repeats these two. Keep the MSYS note, session placement, and project commands — those are genuinely Claude-specific. |
| C5. Compress `AGENTS.md` — *Branch model*'s command blocks to the invariant + rules, dropping the promotion command listings | ~20 of 596 | **Lost:** copy-paste promotion commands from the always-read file. **Acceptable because** promotion is an integrator act the routing table routes to `git-workflow.md` §12, which carries the fuller, safer versions (including the catch-up merge step `AGENTS.md`'s copy omits — the two copies have already drifted apart in that detail). The prohibitions (no direct commits, ff-only, no squash) stay. |

**Not recommended for cutting**, explicitly: the ratchet-hazard section in `AGENTS.md` (deliberate
duplication of `testing.md`, and the order names it as such); `testing.md` (260 lines, densest
value-per-line in the harness); the three skills (they cite rather than restate — the pattern the
rest should follow); `task-lifecycle.md`; `design-sprache.md` (a living owner document in the
product domain — an engineering pass has no standing to shorten it).

Net effect if all five are taken: unconditionally-read text falls from 665 to ~580 lines
(computed); the routed corpus falls by ~410 lines with zero rules lost and one rule family
(conventions §2c case law) relocated to its designated home.

### Decision block — three questions, each with a recommendation

**Q1 — Which cuts?** *Recommendation: all five (C1–C5), as one Tier A task on this branch, executed
only after this report is accepted.* They are ordered by value; C1 is the largest and the safest
because it moves rather than deletes. If you take only one, take C1.

**Q2 — What happens to the ~950 MB of committed evidence?** *Recommendation: two steps, only the
first now.* (a) Stop the growth: add the missing half of the evidence rule — a hard size tripwire
(e.g. "no single evidence file over 1 MB without a ruling") in `task-lifecycle.md` — because the
current rule failed as a judgement call at commit time and needs a number (analysis in R1). Delete
nothing. (b) The existing history: shrinking it requires rewriting shared history (`git
filter-repo` or equivalent over all branches), which invalidates every open worktree and clone and
is reserved by house rule. That path is **described in R1, not proposed**; decide it separately, if
ever, at a quiet moment between workstreams. Living with 890 MB of `.git` is a real option — it
costs clone time, not correctness.

**Q3 — Which code findings become tasks?** *Recommendation: three now, one decision, rest
backlog.* Task 1 (Tier A): server-side constraints for scores and reports — range check on
`score`, size check on `message`, mirroring the telemetry table's existing pattern (S1, S2).
Task 2 (Tier A): app-level error boundary — the decision `FxBoundary.jsx` explicitly deferred;
small surface, one deliberate UX choice (what the player sees on a crash) which is yours (S3).
Task 3 (Tier A): the German-text sweep — migrate the 11 files in cluster F1 into the catalogs and
add each to the i18n ratchet's migrated list; mechanical, and it fixes what an English player
actually sees today. One decision, not a task yet: `reducer.js` recomputes formations **without**
the architect's buildings on five of ten call sites (G1) — whether that is a deliberate phase rule
or a genuine bug needs the engine's owner-of-record to say; if it is a bug it is the only finding
in this report that changes gameplay outcomes. Backlog, not tasks yet: the
dead-export sweep and the two verbatim geometry duplicates (M3, M4 — mechanical, low risk, best
done in one small pass), and the `resolveTrick` decomposition (M2 — valuable but only worth doing
when engine work is planned anyway, because it churns a file the whole suite leans on). The
keyboard/dialog accessibility findings (A1, A2) are cheap and can ride along with the next screen
rework instead of being their own task.

---

## Part 1 — Code and repository (detail)

### Method

Two stages. **Stage one — four thematic audit passes** run in parallel, each with an explicit
strategy, plus direct measurements for repository weight and gates. Dimensions chosen: **module
structure and duplication** (because 5 files over 1300 lines concentrate risk), **boundary
security and error handling** (save-game, Supabase, usernames — the only surfaces with external
input), **test-suite value** (27.5k lines whose worth the ratchet doctrine makes non-obvious from
outside), and **dependencies/bundle/performance/accessibility** (the cost centres of a
Vite+React+Pixi app). Chosen over other candidates because each either has an existing guard
system to check against or a concrete failure cost. **Stage two — the full-coverage pass** on the
owner's instruction: every code file read completely by 21 batch agents, coverage reconciled
mechanically against the inventory (427/427). The top findings of every pass were independently
spot-checked against the source before inclusion (measured).

### Gates (H5)

| Gate | Result | Note |
| --- | --- | --- |
| `npm test` | exit 0 — 151 files, 2418 tests, 36.66 s | measured, unpiped |
| `npm run lint -- --max-warnings=0` | exit 0 | measured, unpiped |
| `npm run build` | exit 0 | measured, unpiped |
| `npm run gen:db` | exit 0, no diff produced | measured; `git status --porcelain` empty afterwards |

### Security and error handling

**S1 (high). Score inserts unvalidated server-side.** `docs/supabase-schema.sql:73` grants `anon`
insert `with check (true)`; `score` is `bigint` with no range constraint; the only trigger validates
the name (`docs/username-profanity-guard.sql`). Failure: a direct POST with the bundled anon key and
`score: 2^63-1` permanently tops every board; with no update/delete policy, cleanup needs the
service role. The profanity/name enforcement being DB-side shows the right architecture is already
in place — the score column just never got the same treatment. (measured schema, computed scenario)

**S2 (high). Feedback reports: client-only rate limit, unbounded message.** Rate limit in
localStorage (`src/game/storage.js:873-918`, 30 s gap / 20 per day) — trivially bypassed. Message
length capped only by the textarea (`src/ui/FeedbackModal.jsx:26,209`); `toRow`
(`src/game/reports.js:33-49`) does not truncate; the schema deliberately avoids a length check
(anti-#197 note). The telemetry table's `decisions` column has exactly the missing constraint
(`docs/telemetry-schema.sql:79`) — the pattern exists in-house. (measured, computed)

**S3 (medium-high). No app-level error boundary; lazy overlays can blank the app.**
`src/ui/fx/FxBoundary.jsx:3-16` — the comment states the gap, the shipped incident, and that the
app-wide decision was deliberately deferred. Menu overlays: `React.lazy` behind bare `Suspense`
(`src/App.jsx:1349, 1361, 1395, 1435`); `Suspense` does not catch load rejections, so a
deploy-race chunk failure at render unmounts the tree. The comment at `App.jsx:1001` ("Suspense
fängt") holds for the preload only, not the render-time import. Per H3 this is reported as a
deferred decision now worth taking, not as an oversight. (measured path, computed scenario)

**S4 (medium). Quota-exceeded can silently desync history vs profile.** `recordRun`
(`src/game/storage.js:420-515`) writes run history with progressive quota-pruning fallback
(lines 389–416, good), then writes the profile with a bare `try { setItem } catch {}`
(`storage.js:515`, verified). Failure: quota hit between the writes → the run is in history, the
earned DP/SP/unlocks are silently gone. The `signalQuota` machinery exists and only the history
path uses it. (measured)

**S5 (medium-low). One oversized telemetry row discards the whole batch.** `doFlush`
(`src/game/telemetry.js:218-233`) POSTs the queue as one batch and clears it on any 4xx; the client
caps entries (500) but never serialized size against the DB's 200k-char constraint. One oversized
run can drop up to 11 innocent queued runs. Acknowledged as a trade-off in the code comment.
(computed)

**S6 (low).** `publishRun` failures are invisible (`src/App.jsx:762` — `.catch(() => {})`): no
retry, no toast; the player believes the score published. **S7 (low).** Username truncation by
UTF-16 units (`App.jsx:730` `slice(0, 20)`) can split a surrogate pair; DB counts
`char_length` — cosmetic mismatch, not a hole. **S8 (low).** `loadHighscores` validates "is array"
but not entry shape (`storage.js:58-64`): a hand-edited `score: "abc"` sorts as NaN and can occupy
a top slot; contrast `isResumableRunState` (`storage.js:824-859`), which is exemplary.

**Verified clean** (measured): zero `dangerouslySetInnerHTML`/`innerHTML`/`document.write` in
`src/`; URL params parsed as numbers/flags or whitelist-checked; leaderboard names rendered as React
text nodes; telemetry RLS insert-only; opt-out purges the queue; window
`error`/`unhandledrejection` captured into a bounded ring buffer (`src/game/errorBuffer.js:14-56`);
corrupted-JSON handling present at every load site; profile migration chain (11 steps, idempotent,
no-downgrade) at `storage.js:154-272`.

### Test suite value

**T1. Composition is healthy for the stated design** (measured): of 151 test files — 68 purely
behavioral (import and execute src), 41 mixed, 37 pure source-text ratchets, 5 meta. 83 files
import `src/game/**`: the domain layer is predominantly tested by execution; ratchets concentrate
on CSS/JSX seams, exactly as `testing.md` prescribes.

**T2. Engine coverage is deep, not decorative** (measured): `test/engine.test.js` — 141 cases
including invariant assertions (factor product must equal `gained`, line 71; wins+losses+ties ==
trickNo, line 125) and boundary cases; `test/reducer.test.js` — 56 cases including no-op paths and
seeded determinism.

**T3. Sampled ratchets secure relationships, not spellings** (computed over an 8-file sample
including the two largest). `test/panel-tokens.test.js` imports the real implementation instead of
transcribing it (line 5), cross-verifies its own exemption lists against live parsed CSS
(lines 1146–1197), and records sabotage results inline. `test/i18n-guards.test.js` computes catalog
parity from live imports and counter-checks its own tables (lines 322, 692, 703). Where
spelling-pins exist they are labelled as the honest fallback, per doctrine.

**T4. Counter-check discipline is real** (measured): 6 of 8 sampled ratchet files record one; 30 of
151 test files mention Gegenprobe/counter-check; durable per-milestone counter-check artifacts
exist under `docs/workstreams/*/evidence/`. **Gap:** `test/formation-legend.test.js` and
`test/screens-desktop.test.js` record none — a reader cannot distinguish them from unchecked guards
(`testing.md` §5's exact concern). Smallest real improvement available.

**T5 (low).** `test/corner-art.test.js:280` forbids `/filter/` over a whole raw JSX file — a benign
future comment containing the word turns it red (§7 trap, one narrow-window fix). Of 36 no-strip
forbid files only 3 were window-verified; the rest is estimated to follow the same idiom, not
proven.

### Structure, dependencies, performance, accessibility

**D1. Zero unused dependencies** (measured — every entry in `package.json` grep-verified to an
import site). Versions: React 18.3.1 (19.x current), Vite 6.4.3 (8.x current — aging fastest),
eslint 9 (10 current), pixi.js 8.19→8.20 minor. Nothing broken; upgrade pressure is real but not
urgent, and a pixi upgrade is guarded by `test/bundle-split.test.js`.

**D2. Bundle config matches its documentation, with one drift** (measured): `PIXI_DEPS`
(`vite.config.js:82-85`) matches `pixi.js/package.json` runtime deps 8/8; preload helper routed to
vendor (line 120) as documented. Drift: `architecture.md` §5 says the `assetsInlineLimit` override
covers "skill emblems"; the config also excludes `perkcats` and `legendaries`
(`vite.config.js:106-107`, added 2026-08-22). Doc-side one-line fix.

**P1. Performance rules are being followed** (measured): `Battlefield.jsx` (1926 lines) contains
zero `getBoundingClientRect` and zero rAF; `CardFxStage.jsx` measures per frame with a documented
justification at the site (H3 honoured); all 8 sampled `setInterval` sites have cleanup; hot list
components (`Card`, `CardTile`) are memoized; contexts are screen-scoped with memoized values.

**A1 (medium). One control is mouse-only:** the skill-tree pill at `src/ui/UpgradeScreen.jsx:149`
is a `<span role="button">` with no `tabIndex`/`onKeyDown` (verified) — while the same file solves
it correctly further down (~line 580). **A2 (low-medium).** Five modals lack
`role="dialog"`/`aria-modal` (`OptionsModal.jsx:158`, `FeedbackModal.jsx:143`,
`PrivacyModal.jsx:73`, `UsernameModal.jsx:58`, `DevRunSetup.jsx:85`) while `Glossary.jsx:142`,
`GuideOverlay.jsx:264` and `TutorialSections.jsx:112` carry them — an in-house inconsistency, two
attributes each. No focus trap exists anywhere (grep: zero hits); all overlays share Escape
handling via `useEscape.js`. Calibrated for a game: dialog roles and the one dead pill are worth
fixing; a full focus-trap pass is optional.

**C-css. `index.css` !important census** (measured): 509 total; 292 have a comment within 3 lines
above, 217 do not (block-heading comments count only once, so the justified share is somewhat
higher than 57%). Against the repo's own "reason at the site" rule, the uncommented remainder is
the measurable gap — a census, not a judgement on any individual site (H3). Duplicate top-level
selectors: effectively none (one deliberate split). Per H4, no restructuring of the file is
proposed; its single-file, unlayered property is load-bearing for the token system.

### Module structure, duplication, dead code

**M1. The game/ui boundary is clean** (measured): zero React imports in `src/game/` (all 29 files);
the only `src/ui` import is the documented exception `src/game/telemetry.js:20` (version
constants). No game→i18n imports. A verified pass, stated because the architecture depends on it.

**M2. `engine.js` is effectively one function** (measured): `resolveTrick` runs from
`src/game/engine.js:96` to the end of the 1569-line file — ~1470 lines in one function body, with
fire/perk/crit sub-logic inlined (e.g. the Feuer-Rework block at :319). The per-phase blocks are
already comment-delimited; they could become named steps without changing the state-in/state-out
contract. The clearest refactor seam in the repository — and, given T2's invariant tests, a
well-guarded one.

**M3. Dead and pseudo-dead exports** (measured): 53 exports are referenced nowhere in the entire
repository; 14 of them are fully unused code — including the whole `DeckHistogram` component
(`src/ui/BuildSummary.jsx:208`, verified: no other reference), `segmentGainedFormation` /
`baseFormationCount` / `FORMATION_TYPE_LABELS` (`src/game/formations.js:435/430/48`),
`SHOP_CATEGORY_LABELS`, `tintImages`, `hasKey`, `__resetTelemetryState`. The other 39 are used
in-file only (the `export` keyword is dead, not the code). A further 181 exports are used only by
test/sim/bench/scripts (computed) — partly deliberate test seams (some documented as such, e.g.
`CustomizeScreen.jsx:256` "#327 exportiert für den Drift-Guard-Test"), but the volume (~28 in
`progression.js` alone) obscures the real public surface. One permanently-off flag:
`SHOW_HIT_ICONS = false` (`src/ui/Battlefield.jsx:301`) guards a branch at :1774 that can never
render (verified).

**M4. UI reimplements exported game geometry** (measured, verified): `src/ui/ArchitectScreen.jsx:77
footprintAt` is a line-for-line copy of `src/game/architect.js:201 footprintAtRot`;
`ArchitectScreen.jsx:322 currentRotOf` duplicates the exported `currentRotationIndex`
(`architect.js:216`). Importing the game versions deletes ~25 lines and one divergence risk — the
cheapest real duplication fix found. Smaller families: four independent hex-color parsers
(`announceChrome.js:29`, `FieldCompositor.jsx:153`, `indicators/vocab.js:83`, `packSort.js:25`);
`pointer: coarse` probed independently in four files although `mobileTier.js:18` is the documented
single evaluation point (the two `src/game/` probes cannot import ui, which argues for a shared
probe, not a defect).

**M5. Module cut of the top-5 files** (computed from symbol maps): `CustomizeScreen.jsx` (2163)
carries four separable layers — FX prefetch infra, ~600 lines of preview scene components
(:553–1160, the cheapest extraction), the screen itself, and the shop views (:1381–2163).
`Battlefield.jsx` (1926) embeds a self-contained slice/laser finisher subsystem (:327–683) before
the main component — a clean seam. `App.jsx` (1458) is one orchestration component (42 `useEffect`,
38 `useState`); extractable as hooks, but as the app shell its size is the most defensible of the
five. `ArchitectScreen.jsx` (1371) is a single component mixing geometry, drag handling and
rendering. No orphan files exist (measured: every non-i18n module basename is referenced).
None of this is urgent; it is where the next structural task gets the most value per line moved.

### Full-coverage pass — what reading everything added

21 agents, one per ~5,000-line batch, read all 427 files completely (coverage reconciled against
the inventory: 427/427, measured). Result: **0 high, 31 medium, 144 low** findings after the
calibration rules (German comments, ratchet-by-design, catalog length and justified `!important`
excluded as instructed), plus 105 recorded positive verifications. Every medium finding was
spot-checked by the coordinating session; the low findings carry their agents' evidence and were
not individually re-verified (stated honestly — see the coverage-limits section). The complete
list is in Appendix A/B; the clusters that matter:

**F1 — Hard-coded German player-visible text, 11 files + 1 stale catalog comment** (all measured;
page-one finding 5). The pattern is uniform: each file is otherwise catalog-driven and the German
sits exactly in the guard's documented blind spots — tooltips, `title`, `aria-label`, constant
tables. Files: `Card.jsx`, `GameOver.jsx`, `BuildSummary.jsx`, `DeckDetail.jsx`, `LayoutPerks.jsx`,
`CardGrid.jsx`, `ArchitectScreen.jsx:848`, `RunStats.jsx:100`, `MuteButton.jsx:7`,
`ChargeBar.jsx:204/212`, `GlobalLeaderboard.jsx:176`; plus `src/i18n/index.js:39-47` describing
zh-Hans as a 111-key `ready: false` fixture while the code ships `ready: true` with 2,660 keys.

**G1 — Formation recomputation inconsistency in the reducer** (measured call-site pattern,
consequence computed). `computeFormations` takes the architect state as its final argument.
Five call sites pass it (`src/game/reducer.js:679, 729, 821, 855, 864` — `archOf(state)`), five
omit it (`reducer.js:483` PICK_PERK, `:511/:526` PICK_FAMILY, `:582` FAMILY_TARGET_CONFIRM,
`:599` CONFIRM_TARGET), so formations recomputed after a perk or family pick drop building
effects until the next recompute that passes it. Verified: the split is exactly as stated. Whether
the omission is a deliberate phase rule or a bug is the engine owner's call (Q3).

**G2 — Smaller verified logic findings** (each measured/computed, spot-checked or
evidence-complete): the reduced-fx ring freeze targets a pseudo-element nothing defines
(`src/index.css:7686` styles `.as-ring::before`; the animation lives on
`.as-ring > .as-ring-run::before`, defined at `:3051` — the reduced-effects setting therefore does
not stop the ring sweep it means to stop); one Escape press in the stats screen closes two layers
(`StatsScreen.jsx:254` + `RunDetail.jsx:231` both bind unconditionally — `UpgradeScreen.jsx:616`
documents and solves this exact hazard by chaining); the parked-draft resend in the feedback modal
can destroy a user's in-progress edit (`FeedbackModal.jsx:89`); the architect drag preview omits
the Fundament bonus and shows a spurious negative delta (`ArchitectScreen.jsx:579` vs `:171-194`);
`ArchPanels.jsx:65` defines a component inside a render body, remounting the list subtree and
dropping focus on every parent render; the telemetry flush can discard a row enqueued while the
POST is in flight (`telemetry.js:223`, snapshot-then-clear); the idle prefetch chain cannot be
cancelled once started, contradicting its own "never during a live trick" invariant
(`App.jsx:292-306`).

**G3 — Tooling rot in `scripts/` and `maintenance/`** (measured): `npm run compress:music` crashes
on ENOENT — it still reads `src/assets/music`, which moved to `media/music`
(`scripts/compress-music.mjs:13`, package.json still wires it); the FX bench is unrunnable on the
primary Windows host (`maintenance/fx-bench.mjs:40` — `spawn("npx")` without shell plus a
POSIX-only process-group kill, the exact trap `scripts/check-preview-exclusion.mjs:43-47` documents
and avoids); the zh screenshot gate leaks state between its two language passes
(`scripts/zh-gate-shots.mjs:80`); the viewport survey's only text criterion silently computes
`null` in the documented chunked workflow (`scripts/viewport-survey.mjs:498`); the loudness
pipeline is duplicated near-verbatim across `normalize-music.mjs`/`normalize-sfx.mjs`, and
`loc-todo.mjs` claims "same rules as the test, in one place" while the test re-implements the
regexes (`loc-todo.mjs:7-17` vs `i18n-guards.test.js:1035-1038`, byte-identical copies).

**G4 — Guard weaknesses the doctrine itself asks to hunt** (each with the assertion cited):
`starfield-budget.test.js:205` is vacuous — `indexOf` returning −1 satisfies the comparison, so
deleting the protected call leaves the suite green; `qa-fixes.test.js:21` counter-checks a
hand-copied function, the exact "tested a copy" hazard `panel-tokens.test.js:3-4` warns about;
`panel-tokens.test.js:1152`'s exemption-liveness check omits ~10 of its own exemption lists
(M3/M4/M5/C_* families), so a dead entry there is undetectable — the MENU-37 failure mode the
file's own comment names; `desktop-perf.test.js:171`'s #flach guard only counts capitalized
component tags, so the lowercase `<img>` child it exists to forbid passes; `marke.test.js:186`
splits on a marker that occurs three times in `index.css` and silently drops everything after the
second. Plus 9 low-severity test-quality notes in Appendix B. These strengthen, not weaken, the
Part-1 verdict on the suite: the doctrine is sound and mostly followed; these are the residual
gaps a full read was needed to find.

**Low findings (144, Appendix B)** cluster as: comment drift 25, duplication 22, dead code 20,
error-handling nits 10, test-quality 9, ratchet hazards 6, the rest singletons (computed
histogram). Nothing in the low tier changes a recommendation above; they are the raw material for
opportunistic cleanup during neighbouring tasks, not for a dedicated sweep.

### R1 — The repository weight, and why the rule did not hold (H2)

Measured facts: `docs/workstreams/` is 997 MB working-tree; 676 MB JSON (112 files), 250 MB PNG
(556), ~70 MB WebP (436); 32 JSON files exceed 5 MB, dominated by a uniform family of ~22 MB
`matrix.json` geometry dumps under `desktop-menus/evidence/` (520 MB JSON in that workstream alone)
and `mainscreen-branding/evidence/`. `.git` is 890 MB; workstream blobs are 1021 MB of 1970 MB
total blob bytes across all refs — 52 % of the repository's entire object history.

The rule (`task-lifecycle.md` — *Committing evidence*) was committed **2026-08-21** and names
geometry dumps and survey matrices verbatim. The matrix.json files were added **2026-08-23 to
2026-08-26** (measured, `git log --diff-filter=A`). So the failure is not ignorance of the rule —
it is that the rule's operative clause is a judgement call ("unless a reader must see the raw rows")
evaluated by the same session that produced the rows, at commit time, with no tripwire. Every other
discipline in this repository that actually held (ratchets, token freeze, sub-1280 thresholds) holds
because a **number** decides, not a mood — `conventions.md` §2c even states this pattern as a
lesson ("The distinction is a number, not a mood"). The evidence rule never got its number.

**Containment (proposed, cheap):** a size tripwire in the rule — no single evidence file over
1 MB, no workstream evidence directory over 25 MB, without a ruling recorded where the grants
in `conventions.md` are recorded. Optionally a repository guard (a test that fails on oversized
tracked files under `docs/workstreams/` — the suite already has the machinery for exactly this
class of check).

**Removal (described, not proposed):** the blobs are in shared history reachable from `dev`;
removing them means `git filter-repo` (or equivalent) across every branch, force-pushing all
permanent branches, invalidating every clone and all 15 worktrees, and re-basing any unmerged task
branch. House rules reserve shared-history rewriting explicitly. If ever done: between workstreams,
with all branches integrated, as its own planned task with a fresh-clone verification step. Until
then the cost is clone/fetch time and disk, not correctness — CI and gh-pages are unaffected
(measured: deploy workflows build from checkout, evidence is not in the bundle).

---

## Part 2 — The harness (detail)

### Does it carry? (question 1)

**Cross-references: sound.** Every `docs/...` path named in `AGENTS.md`, `CLAUDE.md`,
`docs/engineering/*.md`, the three skills and the agent resolves to an existing file (measured,
pattern-extraction check). Numbered section pointers (`git-workflow.md` §7–§9, §18, §22;
`testing.md` §5, §12) all currently point at the intended sections (verified by reading).

**Contradictions: none found that bind.** Two documented-and-consistent near-misses: the review
budget is stated in both `AGENTS.md` and `task-lifecycle.md` §8, but the latter declares the former
canonical (deliberate layering, works — until C2 moves the canon; see the C2 caveat). The
gate list appears three times (`AGENTS.md`, `git-workflow.md` §10, `testing.md` §1) — identical
today, but three copies is two too many opportunities to drift; C3 addresses the one with no
always-read or routing justification.

**Rules one cannot follow without guessing: none found.** The closest candidates are judgement
clauses that were later given numbers by rulings (sub-1280 delta, alpha bound) — the mechanism
works. The one judgement clause that demonstrably failed for lack of a number is the evidence rule
(R1).

**Charter violations, i.e. a document breaking its own stated shape (computed):**

1. **`conventions.md`** — header: "no measurements, no dated implementation state". Actual: §2c
   contains ~430 lines of dated planner rulings with measurements (freeze rulings 2026-08-24, the
   MENU-38 re-measurement, MENU-46–51, M3/M4/M5 grants table, the alpha clause, `--sf-row`,
   M8/M11 cases). Each ruling was correct to write down; this file is the wrong home by the file's
   own §5, which designates the decision log for exactly this. This is also the growth pattern to
   fear: the file grew from 269 lines (2026-08-23) to 764 (2026-08-26) — +495 lines in three days
   of active screen work, nearly all of it §2c rulings (measured, `git show` at both dates). → C1.
2. **`CLAUDE.md`** — declares project rules "deliberately not repeated here", then restates the
   language policy and the historical-records rules, both of which are in `AGENTS.md`, which
   `CLAUDE.md` itself inlines via `@AGENTS.md`. → Cut C4.
3. **`docs/localization/i18n.md`** is current engineering documentation (actively extended
   2026-08-26) written in German, under a language policy that says new engineering material is
   English. It is good documentation; it is just on the wrong side of the policy, or the policy
   needs a carve-out for `docs/localization/` (which its translator-facing audience would justify).
   Flagged for a one-line policy decision, not for translation — a translation-only diff is exactly
   what the policy warns against. Cosmetic: the file numbers two sections "§7" (lines 172 and 330,
   measured).

**Deliberate duplication, recognized and kept** (the order's own example plus two more): the
ratchet hazard (`AGENTS.md` ↔ `testing.md` §2–3) — bridges into a document not every session reads;
the pipe rule (`AGENTS.md` ↔ `testing.md` §1) — same justification; `NEW_MACHINE_SETUP.md` §5's
two-line summary of the timeout artifact with a pointer into `testing.md` §12 — the model citation
pattern. These are Absicht and this report distinguishes them from the unintended copies named in
C2–C5.

### What can go? (question 2)

The order's framing is accepted: 4839 total lines is the wrong denominator; 665 unconditionally
read lines is the right one. The cuts C1–C5 (page one, each with its cost line) reduce the
unconditional load by ~85 lines and the routed corpus by ~410, with one relocation and zero rule
loss. Below the five, diminishing returns set in fast: the remaining candidates (compressing
`AGENTS.md`'s language-policy subsections, folding `git-workflow.md` §18 and the `CLAUDE.md` MSYS
note into one home) each save 10–20 lines but touch text that different task types genuinely reach
from different directions; the risk-per-line-saved rises above the value. They are noted here so a
future pass does not re-derive them, and deliberately not recommended now.

**One addition is recommended despite the shortening mandate** (R1): the evidence-size tripwire.
~5 lines. It is the missing half of a rule that measurably failed, and the cheapest 5 lines in this
report.

---

## What this health check did NOT examine

Every code file was **read** (427/427, verified). Reading is not the same as proving; the honest
residue is now about depth and environment, not files:

- **The 144 low-severity findings were not individually re-verified** by the coordinating session;
  they stand on their auditing agents' cited evidence. All 31 medium findings were re-verified.
- **Nothing was executed beyond the four gates.** No screen was rendered, no effect run; dynamic
  behaviour — actual Pixi ticker crash paths, real telemetry races, the drag-preview delta on
  screen — is inferred from code, not observed. Per `testing.md` §10, green gates do not claim
  visual correctness.
- **The engine's algorithmic correctness** — the math was read and its tests audited for depth,
  but the balance model was not re-derived and `sim/` results were not re-run.
- **The deployed Supabase state.** The SQL files under `docs/` are the intended schema; whether the
  live database matches them is unverifiable from the repository. S1/S2 assume it does.
- **Runtime bundle output** — chunk assignment verified from config plus its guard test; no built
  chunk was inspected. `npm audit` was not run.
- **Color contrast, screen-reader announcement flow, touch-target sizes** — the a11y findings
  cover keyboard and semantics only.
- **Dead-export edge cases**: the dead-scan covered line-initial named declarations only;
  `export { ... }` re-export lists, default exports, and dynamic string-keyed access were not
  swept (spot-checks found none resurrecting a candidate, but it is not proven).
- **Non-code content**: `docs/decisions/`, `docs/workstreams/**` beyond size/date measurements,
  `media/` assets, and the 15 open worktrees' branches (H6: only `dev` @ `264c1e8a` was assessed).
- **i18n catalog translation quality** — catalogs were read for structural defects (duplicate
  keys, broken placeholders), not for wording; `design-sprache.md` §§3–11 and
  `text-style-guide.md` were skimmed for Part 2 scope only. Git history quality: out of scope.

These are the places a wrong conclusion could still hide. The report's claims are scoped to what
the measured/computed labels say, and to `dev` @ `264c1e8a` on 2026-08-26.

---

## Appendix — complete finding list from the full-coverage pass

Every entry carries its agent-cited location and label. Medium findings were re-verified by the
coordinating session; low findings stand on the cited evidence.

### Appendix A — all medium findings (31)

| # | Location | Category | Label | Finding |
| --- | --- | --- | --- | --- |
| M1 | `src/i18n/index.js:39` | comment-drift | measured | The #zh-hans comment block (lines 39-47) is stale on four counts against the code on line 48: it says the catalog is a 111-key fixture, that `ready: false` is its switch, that setLocale rejects the language and the UI does not offer it, and explicitly 'Kein via' so missing keys fall back visibly to German. The code reads `ready: true, via: ["en"]`, and the catalog is complete (measured: 2660/2660… |
| M2 | `src/App.jsx:306` | incorrect-cleanup | measured | The lazy-screen/emblem prefetch idle chain cannot be cancelled once started and keeps firing during an active run, contradicting the stated invariant 'NIE waehrend eines laufenden Stichspiels' (lines 292-294). |
| M3 | `src/game/telemetry.js:223` | race-condition-data-loss | computed | doFlush clears the ENTIRE stored queue (writeQueue([])) after posting a snapshot of it, so a telemetry row enqueued by recordRun while the post is in flight is silently discarded and never sent — the again/inflight mechanism cannot recover it because the follow-up round finds an already-wiped queue. |
| M4 | `src/game/reducer.js:483` | logic-inconsistency | computed | computeFormations is called WITHOUT the architect argument in PICK_PERK (line 483), PICK_FAMILY (lines 511, 526), FAMILY_TARGET_CONFIRM (line 582) and CONFIRM_TARGET (line 599), while all other reducer call sites (PICK_SKILL 679, PICK_LEGENDARY 729, SWAP_CARDS 821, UNDO_SWAP 855, RESET_FORMATION 864) pass archOf(state) — so formations recomputed after a perk/family pick drop building effects (e.g… |
| M5 | `src/index.css:7686` | dead-code / comment-drift / performance | computed | The reduced-fx ring freeze rule `:root[data-reduced-fx="1"] .as-ring::before { animation: none !important; }` targets a pseudo-element that no longer exists: since the #perf-ring rework the sweep animation (as-ring-slide) lives on `.as-ring > .as-ring-run::before` (line 3051), and no rule gives `.as-ring::before` any content. Under 'Effekte reduziert' the ring sweep therefore keeps running on eve… |
| M6 | `scripts/compress-music.mjs:13` | dead-code | measured | Stale tool: reads src/assets/music, a directory that no longer exists (music moved to media/music per #F-01, see maintenance/music-overview.mjs:17). readdirSync at line 17 throws ENOENT, so `npm run compress:music` (still wired in package.json:20) crashes instead of hitting the graceful 'Keine .mp3' path. The closing advice at line 36 ('music.js-Imports auf .m4a umziehen') describes a migration t… |
| M7 | `maintenance/fx-bench.mjs:40` | portability-bug | computed | spawn("npx", ...) without shell fails on Windows (npx is npx.cmd; Node refuses to spawn .cmd without a shell — the repo's own scripts/check-preview-exclusion.mjs:43-47 documents exactly this trap and uses process.execPath + node_modules/vite/bin/vite.js instead). Additionally process.kill(-server.pid) at line 41 (negative PID = process group) is POSIX-only and throws on win32, silently swallowed … |
| M8 | `src/i18n/de.js:1498` | comment-code-drift | measured | "start.progress.bonus" hard-codes "+5" (de.js:1498 "Bonus-{cur} · nächste +5", en.js:1444 "next +5") although the actual drip amount is SP_LOYALTY_SP (progression.js:318, envNum("PROG_SP_LOYALTY_SP", 5) — env-overridable). This violates the catalog's own header rule (de.js line 8: tuning numbers must be interpolated from constants, never typed). |
| M9 | `src/ui/ArchitectScreen.jsx:579` | logic-error | computed | dragDelta boost preview omits the Fundament perk bonus: pStructBonus = boardFactorMap(previewBuildings) is called without fundBonus, while the baseline archBoostPct (lines 171/180/194) uses boardFactorMap(buildings, fundBonus); with the Fundament perk held, the live dBoost chip shows a spurious negative delta on structure factors even for a no-op move. |
| M10 | `src/ui/ArchPanels.jsx:65` | react-remount | computed | `Schale` is a component defined inside ArchBuildingList's render body (two arrow functions chosen by `bare`), so React sees a new component type on every render and unmounts/remounts the entire list subtree each time the parent re-renders (e.g. on every inspectBid toggle) — keyboard focus on the tapped button is lost and transition-all animations restart. |
| M11 | `src/ui/ArchitectScreen.jsx:848` | i18n | measured | Hardcoded German tooltip on the glacier marker: title={`Gletscher · Masse ${gMass}${...` · Reserve ${fMass}`}`} — the sibling firn marker six lines below (854) uses t("arch.firn.title"), so the English build shows a German tooltip on this one marker. |
| M12 | `src/ui/Card.jsx:160` | i18n | measured | Hardcoded German player-visible text on the card: visible labels `Basis {baseRank}` (159) and `⚔ +{stichBonus} Stich` (160), plus German tooltips at 76-77 (Wachstumsring), 93 (`Dauerhaft +X (Basis Y)`), 101 (`Geschmiedet +X Wert (dauerhaft)`), 121 (`Kolonisiert (Ausläufer) · Ernte +N Wachstum`), 128, 134/137 (`Gebrandmarkt −N Wert`), 145 (`Ionisiert N/5 ... VOLL IONISIERT`) — none via the i18n ca… |
| M13 | `src/ui/BuildSummary.jsx:244` | i18n | measured | DeckHistogram carries hardcoded German player-visible text: the legend sentence `Werte über 10 (violett) überbieten jede Gegnerkarte.` (244) and the bar tooltip `${suitLabel(su)} ${v}: ${n} Karten` (227), while the sibling DeckStrength component uses t("build.deck.legend") (286) for the same sentence — English build shows German in the histogram. |
| M14 | `src/ui/ChargeBar.jsx:204` | i18n | measured | Hardcoded German visible strings in the lightning panel: `🛡 {shieldCount}× Serie gehalten` (204, only its title uses t()) and `Konsument: {consumer}` (212) — the rest of the component is fully catalog-driven, so the English build shows two German fragments. |
| M15 | `src/ui/CardGrid.jsx:193` | i18n | measured | Hardcoded German tooltips: glacier marker `Gletscher · Masse N · Reserve N (füllt zum Durchlauf-Beginn auf 12)` (193), firn marker `Schnee · Reserve N (füllt einen Gletscher hier zum Durchlauf-Beginn)` (200), and SegmentBridge `Segmentarbeit: Formationen dürfen die Grenze zwischen Segment A und B überschreiten` (224) — neighboring titles in the same file use t() (cardgrid.anchor.title, cardgrid.g… |
| M16 | `scripts/zh-gate-shots.mjs:80` | bug | computed | No state reset between the two language passes: the zh-Hans pass saves the username (NAME_SETZEN) and starts a run that is never ended (20 s wait, then next locale), so the subsequent de pass inherits as_username/active-run state — '1-willkommen-de' captures the hub instead of the welcome dialog, and 'start.normal' may no longer match the continue-labelled button. This undermines the script's own… |
| M17 | `scripts/viewport-survey.mjs:498` | bug | computed | The shrinkage criterion (contract §5.3 item 5, the only text criterion) is silently never computed in the documented chunked workflow: the 1920x1080 reference cell is looked up only in the in-memory matrix of the current process, not in the merged matrix.json on disk, so any run invoked with --size <non-reference> stores shrunk: null for every cell. |
| M18 | `src/ui/DeckDetail.jsx:166` | i18n | measured | Hardcoded German player-visible strings '✓ frei' / '🔒 gesperrt' in the Challenges tab bypass the i18n catalog; every other string in this file goes through t(). English-language players see German status pills. |
| M19 | `src/ui/FeedbackModal.jsx:89` | race-condition | computed | The silent background resend of a parked draft unconditionally clears the textarea on success; if the user has meanwhile edited/extended the pre-filled draft text, their in-progress edits are destroyed (only the stale draft was sent). |
| M20 | `src/ui/StatsScreen.jsx:254` | bug-event-handling | computed | Escape closes two layers at once: StatsScreen registers an unconditional useEscape(onClose) while the RunDetail overlay it opens registers its own useEscape (RunDetail.jsx:231). Both are independent window keydown listeners, so one Escape press while a run's detail is open closes the detail AND the whole stats screen. UpgradeScreen.jsx:616 documents exactly this hazard ('beide Handler haengen am … |
| M21 | `src/ui/UpgradeScreen.jsx:149` | accessibility | measured | NodePill renders the node selector as a <span role="button" onClick> without tabIndex or a key handler — on the mobile path this is the only way to select (and thus reach the buy button for) an upgrade node, and it is unreachable and unactivatable by keyboard. |
| M22 | `src/ui/MuteButton.jsx:7` | i18n | measured | Player-visible aria-label/title strings are hardcoded German ('Ton einschalten' / 'Ton stummschalten') instead of going through the i18n catalogs, violating the AGENTS.md product-UI language policy which explicitly covers title and aria-label. |
| M23 | `src/ui/RunStats.jsx:100` | i18n | measured | The glacier best-trick StatCard tooltip is a hardcoded German string while its label and all sibling cells use t(); English players see a German tooltip. |
| M24 | `src/ui/OptionsModal.jsx:158` | accessibility | computed | None of the batch's fullscreen overlays declare dialog semantics (role="dialog"/aria-modal, no focus trap), so screen readers do not announce them as modal and background content stays in the reading order. |
| M25 | `src/ui/GameOver.jsx:411` | i18n | measured | Hard-coded German player-visible strings bypass the localization catalogs: line 411 renders the literal button text '📖 Leitfaden: {u.guideName}' and line 420 renders the template ' · Nächste Freischaltung bei ${onboarding.nextAt}/${onboarding.links}: ${onboarding.nextLabel}'. English/Spanish locales show German text on the game-over onboarding banner, violating the AGENTS.md product-UI rule (pla… |
| M26 | `src/ui/LayoutPerks.jsx:16` | i18n | measured | The panel heading 'Positions- & Formations-Perks' is a hard-coded German literal; the component is rendered in FormationPhase.jsx:289 and ChronikOverview.jsx:111, so non-German locales see a German heading. Everything else in the panel comes from localized registries (layoutFamilies/perkDef). |
| M27 | `test/desktop-perf.test.js:171` | test-quality | computed | The #flach guard against 'a second child with an image in .up-facbody' cannot catch the very regression it names: it extracts child tags with /<([A-Z][A-Za-z0-9]*)/ so only capitalized component tags are counted; a raw lowercase <div> or <img> child (exactly 'ein zweites Kind mit Bild', the documented old failure) passes green. Additionally the lazy match ([\s\S]*?)<\/div> at line 169 stops at th… |
| M28 | `test/starfield-budget.test.js:205` | vacuous-guard | computed | The 'überspringt VOR der Zufalls-/Geometrierechnung' guard passes vacuously if the cometStride() call is removed from erupt(): body.indexOf("cometStride(") returns -1, and -1 is always less than the positive index of 'const d = Math.random()'. No other assertion in the file requires the cometStride call in starfieldPixi.js (the Verdrahtung test at lines 121-124 checks cometLifeS/trailSamples/spar… |
| M29 | `test/marke.test.js:186` | bug | measured | The 'outside the desktop section' computation has a blind spot: `css.split(DESKTOP_BLOCK_AT)[0] + (css.split(DESKTOP_BLOCK_AT)[1] || "").slice(deskBlock.length)` assumes the marker occurs once, but `@media (min-width: 1280px) {` occurs 3 times in src/index.css (lines 2541, 7721, 7971 — verified by grep). Everything after the second occurrence is silently dropped from `outside`, and `.slice(deskBl… |
| M30 | `test/panel-tokens.test.js:1152` | test-quality | measured | The exemption-liveness counter-check ('JEDE Ausnahme trifft eine migrierte Regel — keine zeigt ins Leere') omits about ten exemption lists: M3_SURFACE_EXEMPT, M3_EDGE_EXEMPT, M4_SURFACE_EXEMPT, M5_SURFACE_EXEMPT, M5_RADIUS_EXEMPT and all five C_* lists (C_SURFACE/EDGE/ELEV/RADIUS/INSET_EXEMPT). Those lists ARE spread into CSS_AXES (lines 1020-1042) and thus exempt rules from the axis checks, but … |
| M31 | `test/qa-fixes.test.js:21` | test-quality | computed | The F-06 regression test verifies a locally hand-copied `boost` function annotated 'exakt die Engine-Naht', but nothing ties the copy to the real week-mod boost code in the engine/reducer. If the production seam regresses (e.g. back to doubling negative flats), this suite stays green because it exercises only its own transcription — the exact 'counter-check that inspects a copy' hazard test/panel… |

### Appendix B — all low findings (144)

| # | Location | Category | Label | Finding |
| --- | --- | --- | --- | --- |
| L1 | `src/i18n/zhHans.js:2` | comment-drift | measured | The header comment states the catalog is 'angemeldet, noch nicht vollstaendig (`ready: false`)', but src/i18n/index.js line 48 declares zh-Hans with `ready: true`, and the catalog is in fact complete: 2660 keys with exact bidirectional parity to de.js (no mis… |
| L2 | `src/i18n/es.js:32` | comment-drift | measured | Copy-paste leftover: the import comment for esFamilies carries a second, contradicting trailing comment duplicated from the esPerks line above it — `// 73 perk families x name + tier descriptions // legendary perks + perk categories`. |
| L3 | `src/game/constants.js:13` | comment-drift | measured | The block comment states the target run length is 45 cycles ('Ziel-Rundenlaenge = 45 Durchlaeufe', 'im Browser ... immer 45', 'fuer n <= 45 wird ein Prefix des 45-Plans gespielt'), but MAX_CYCLES defaults to 50 (line 18) and BASE_SCHEDULE is a 50-entry plan (… |
| L4 | `src/App.jsx:366` | comment-drift | measured | Comment says the base run length is 'MAX_CYCLES 60', but MAX_CYCLES in src/game/constants.js line 18 is 50. |
| L5 | `src/App.jsx:1002` | error-handling | measured | `try { importArchitect(); } catch (e) {}` only catches synchronous throws; a failed dynamic import rejects asynchronously and becomes an unhandled promise rejection. |
| L6 | `src/App.jsx:1416` | react-purity | measured | onChampionWeeks performs a side effect (recordChampionWeeks, a localStorage write) inside a setProfile updater function, which React requires to be pure; under StrictMode/concurrent re-invocation the storage write runs twice. |
| L7 | `src/game/architect.js:353` | correctness-edge | computed | weightedTier's fallthrough fallback returns the LAST entry of the weight table, which can be a zero-weight tier above the onboarding maxTier cap when floating-point residue survives the subtraction loop. |
| L8 | `src/game/cosmetics.js:206` | comment-drift | measured | Orphaned comment describes a thousands-separator formatting helper ('10000000 -> "10.000.000"') that no longer exists anywhere in this file. |
| L9 | `src/game/skills.js:627` | dead-code | computed | The #247 per-archetype legendary machinery in buildSkillOffer can never execute: the pool at line 609-610 filters !s.legendary BEFORE legPoolByArch[arch] is filled from it (line 611), so legPoolByArch is always empty — the roll at line 627, placeLeg/archLegs … |
| L10 | `src/game/reducer.js:775` | comment-code-drift | computed | REROLL_PERK's first comment says the phase-specific token is consumed 'zuerst ... erst danach der normale Perk-Pool', but the code (usePerk2 = inLegPerkPhase; tokens = usePerk2 ? perk2 : rerollsPerk) and the second comment directly below make the phase token … |
| L11 | `src/game/themes.js:25` | comment-code-drift | computed | The GLOBAL_FX header comment documents groups "field" ('Battlefield-Ambiente ... Hologrid + Sternenfeld/Aurora/...') and "finisher" ('Sieg-Abschluss ... Laser/Schwarzes Loch'), but no GLOBAL_FX entry uses either group — the actual groups are bgfx, bgfin, anim… |
| L12 | `src/index.css:7107` | dead-code / comment-drift | computed | The #up-form 'Radius 6 px, überall' collector lists `.gloss-term-row` (border-radius: var(--rd-sm)), but that entry never paints on the desktop glossary: `.gl-cols .gloss-term-row { border-radius: 11px; }` at line 4746 has higher specificity (0,2,0 vs 0,1,0) … |
| L13 | `src/index.css:5512` | dead-code | computed | `border-radius: var(--rd-md)` on `.st-close, .lb-head > button` is a dead declaration: the #eckig collector at line 7161 re-declares border-radius: var(--rd-sm) on the identical selectors at equal specificity later in the sheet, so the computed radius is 6px … |
| L14 | `src/index.css:1215` | dead-code | computed | The rule `@media (prefers-reduced-motion: reduce) { .as-wordmark { animation: none; } }` is ineffective in every state: below 1280px the base .as-wordmark declares no animation to disable (the gradient is static, line 1184-1188), and at >=1280px the desktop r… |
| L15 | `scripts/skill-art-build.py:187` | logic-error | computed | Lot.as_shown resizes the delivery image to a (strip_w, strip_w) SQUARE — its docstring says 'object-fit: cover on a square source' — but the corners lot is 3:2 (600x400 delivery). cover would scale by width to 300x200; as_shown produces 300x300, stretching th… |
| L16 | `scripts/loc-todo.mjs:17` | duplication | measured | HAS_WORD and CODEISH regexes are duplicated near-verbatim in test/i18n-guards.test.js:1035-1038, while this file's header (lines 7-8) claims 'dieselben Regeln wie im Test, an einer Stelle' (same rules, one place). The `export` on locTodo (line 20) exists for … |
| L17 | `maintenance/normalize-music.mjs:22` | duplication | measured | run(), measure(), encode() and verifyLufs() (lines 22-57) are near-verbatim duplicates of the same four functions in maintenance/normalize-sfx.mjs:31-66 — identical except for the TARGET/ENCODE constants and comment wording. A fix to the loudnorm-JSON extract… |
| L18 | `scripts/phone-proof.mjs:533` | dead-code | computed | `(gb.phone && gb.phone.dpr) || 1` can never read a dpr: capture() records `record.phone = PHONE` (line 374) and PHONE is `{ w: 390, h: 844 }` with no dpr field — the actual DPR sits in probe.metrics.dpr. The expression therefore always evaluates to 1. Correct… |
| L19 | `scripts/phone-proof.mjs:51` | error-handling | computed | BASE is computed at module scope by readFileSync(dist/index.html). In a worktree without a build, every invocation — including the bare usage message and `compare`, which only reads stored evidence and never touches dist/ — crashes with a raw ENOENT before an… |
| L20 | `scripts/export-strings.mjs:202` | dead-code | computed | The else branch `push(r.id, r.category, ...)` in the uiRows() consumer loop is unreachable: uiRows() reads only src/ui/music.js (SRC list, line 268-270) and stamps every row's context with `${context} — ${rel}:${line}` where rel is 'src/ui/music.js', so `isTr… |
| L21 | `scripts/export-strings.mjs:316` | comment-drift | measured | The trailing comment '// interne Perk-IDs (L5, L11 …)' sits on the SVG-path filter line but describes the `/^L\d+$/` filter two lines above (line 314), which already carries no comment — a reader attributes the wrong rationale to the SVG-path regex. |
| L22 | `scripts/survey-report.mjs:67` | dead-code | computed | worst.refMissing is set when a surface's 1920 reference cell is missing/unreached for a language, but the flag is never read afterwards: neither the markdown table nor the coverage line mentions it, so a surface silently contributes zero deltas for that langu… |
| L23 | `src/game/families.js:1073` | determinism-hazard | measured | applyFamilyPick defaults its rng parameter to Math.random (`rng = Math.random`), contradicting the project's own determinism invariant #229 N8, which engine.js enforces with a hard-throwing requireRng() precisely to forbid silent Math.random fallbacks. |
| L24 | `src/game/perks.js:198` | determinism-hazard | measured | buildPerkOffer also defaults rng to Math.random, the same silent-fallback pattern that invariant #229 N8 (requireRng in engine.js) was introduced to eliminate. |
| L25 | `src/game/progression.js:118` | comment-drift | computed | The hard-coded totals in comments are stale: line 118 claims TOTAL_COST '= 137' and TOTAL_NODES '= 25', and the branch header at line 77 claims 'ALLGEMEIN-Zweig (92 SP)'; recomputing from the NODES table gives deck 45 + gen 104 = 149 SP total and 27 buyable n… |
| L26 | `src/game/profanityWords.js:24` | comment-drift | measured | Comment claims whitelist hits are masked 'längenerhaltend' (length-preserving), but maskAllowed in profanity.js replaces the entire matched word with a single '-' character, which is not length-preserving. |
| L27 | `src/game/formations.js:285` | dead-code | measured | onRunJoker is a zero-argument factory (`() => (mem) => {...}`) yet every call site passes a formation-type string — onRunJoker("wiederholung") at line 299, ("treppe") at 323, ("wechsel") at 330 — which is silently discarded. |
| L28 | `src/game/engine.js:605` | dead-code | measured | Redundant always-true condition: `if (hasKernholz(skills) && cardGreen)` sits inside the enclosing `if (cardGreen) {` block opened at line 583, so the second `cardGreen` test can never be false. |
| L29 | `src/i18n/enGlossary.js:177` | terminology-drift | measured | "glossary.cathint.grund" says "battle value" — an invented synonym for the frozen term "combat value", which the same file uses in 5+ entries (e.g. line 45 kampfwert = "Combat value"). |
| L30 | `src/i18n/enCosmetics.js:2` | comment-code-drift | measured | Header claims "Skin set names (27) + global effects (13)"; the file actually contains 54 skin-set names and 12 fx names, matching DECK_DEFS (54 entries) and GLOBAL_FX (12 entries). |
| L31 | `src/i18n/enMeta.js:2` | comment-code-drift | measured | Header claims "Upgrade tree (26 nodes + 2 branches)"; the file defines 28 node.*.label entries and progression.js NODES has 28 ids. |
| L32 | `src/i18n/enGlossary.js:201` | dead-code | measured | `export { RARE, EPIC };` is dead: RARE and EPIC are imported from enTerms.js (line 25) but used nowhere inside the file, and no module imports named exports from enGlossary — en.js takes only the default export; enMeta imports RARE/EPIC directly from enTerms.… |
| L33 | `src/i18n/de.js:672` | typography-inconsistency | measured | "arch.plot.used": "{n} belegt · {pct}%" is the only German string writing {pct}% without a space; 17 other de.js strings use "{pct} %" and the file's own #394 comment (line 1633) states German sets the percent sign with a narrow space. |
| L34 | `src/ui/audio.js:238` | error-handling | computed | loop() returns null when muted/volume 0/bgSuspended and callers never retry: if the player is muted when a loop bed should start (neonsurf at Battlefield.jsx:789, blackhole bed at Battlefield.jsx:972), unmuting later leaves the ambience permanently silent unt… |
| L35 | `src/ui/Battlefield.jsx:550` | dead-code | measured | The whole `laser` branch of SliceFx (lines 546-591) plus its helpers clipHalf (331-344) and laserPieces (350-375) and sepMul (489) are unreachable: no caller ever passes laser=true. |
| L36 | `src/ui/Battlefield.jsx:1420` | dead-code | measured | playerGhosts is always empty — the ghost-spawn effect only ever pushes side:"opp" (line 1385; the player-side spawn was removed per comment at 1376) — so the player-side SlashGhostLayer overlay (line 1748) never renders; additionally the ghost base carries un… |
| L37 | `src/ui/Battlefield.jsx:1149` | resource-cleanup | computed | Timer ids pushed into floatTimers (blackhole pulsZug, line 1149) and ghostTimers (bladeAt sound timers, line 1411) are never spliced out after firing — only the main removal timers self-remove (lines 1199/1402 per the #159 comment) — so both ref arrays grow w… |
| L38 | `src/ui/Battlefield.jsx:1225` | logic-error | computed | Announcement/effect asymmetry for the Grosse Lawine: the LAWINE announcement requires baseBigTier truthy (t.gained > 10000, line 1088/1225), but the Gottgleich prunk trigger fires on `!!t.grosseLawine` regardless of score (line 1326) — a low-scoring Lawine br… |
| L39 | `src/ui/ArchitectScreen.jsx:739` | null-safety | computed | Board cell render dereferences fam without a null guard: `fam.legendary` (739), `fam.name` in the tooltip (771) and `famEff(fam, b)` (772) run whenever a building occupies the cell, but familyDef() can return null for an unknown familyId (a save containing a … |
| L40 | `src/ui/ArchitectScreen.jsx:613` | accessibility | measured | The Architect full-screen overlay has no dialog semantics (no role="dialog", no aria-modal, no focus trap) — it is a fixed inset-0 modal rendered through overlayPortal, which adds none either; screen-reader users get no modal context and background content st… |
| L41 | `src/ui/ArchitectScreen.jsx:252` | duplication | measured | The cell-measurement block (useLayoutEffect at 235-258: getBoundingClientRect over data-arch-pos cells, exH/exV gap halving, archFrameLines, ResizeObserver) near-verbatim duplicates CardGrid.jsx:259-301 — and the copies have already drifted: CardGrid re-measu… |
| L42 | `scripts/text-voice-check.mjs:133` | error-handling | computed | The number-drift comparison na.join("") !== nb.join("") concatenates sorted number strings without a separator, so distinct multisets can collide and drift passes undetected (e.g. before ["1","23"] and after ["12","3"] both join to "123"; ["1","2"] vs ["12"] … |
| L43 | `scripts/vendor-noto-sc.mjs:27` | error-handling | computed | The fetch of the Google Fonts stylesheet is not checked for response.ok; a 404/error page yields zero @font-face blocks, gewichte is empty, basis becomes undefined, and the script crashes at line 58 with 'Cannot read properties of undefined (reading length)' … |
| L44 | `sim/memory.js:8` | hygiene | measured | SEP is the invisible control character U+0001, which renders as an empty string in most viewers (including this audit's file reader) — the code then looks like key.split("") splitting into characters, i.e. broken, and the comment 'kollidiert nicht mit ids/Buc… |
| L45 | `sim/policies/pivot.js:42` | bug | computed | Hardcoded slot cap `s.skills.length < 6` instead of the state-carried cap, repeating exactly the mistake random.js documents against: with Meisterhand (skillSlots raised) the pivot never uses the extra slot, and because a held legendary skill counts toward le… |
| L46 | `sim/policies/fixed.js:54` | bug | computed | The final fallback `?? ids[0]` can select the dropped or gate-blocked id when every entry of a perk offer is blocked, contradicting the file's own contract ('drop = eine id, die NIE gewählt wird') and silently corrupting the paired ablation for that seed. |
| L47 | `sim/perk-impact.mjs:79` | bug | computed | With --faction plus --pickfrom, the pick-time gate is silently dropped: armFor's faction branch passes {architectGreedy, drop, prefer} to factionPolicy, which has no gate parameter, so a run combining both flags reports pick-timing results that were never act… |
| L48 | `sim/cross.js:97` | comment-drift | computed | Comment says 'Alle 15 Builds in EINE Liste' but the list holds 16 (4 pure + 1 mix + 6 pairs + 4 triples + 1 quad); the header comment at line 53 correctly says 16. |
| L49 | `sim/pacing.js:8` | comment-drift | computed | The header comment still describes the metric as fixed 'letzte 10 Cycles (35–44)' of a 44-cycle run, while the code computes a relative tail (last fifth, TAIL = round(CYCLES*0.2)) over MAX_CYCLES (default 60 per line 23) precisely so 44/60/80 stay comparable. |
| L50 | `sim/probe.js:99` | comment-drift | computed | Position-predicate markers are probed with Array.from({length: 41}) over p = 0..40 and displayed as p+1 = 1..41, one position beyond the 40-card field the adjacent comment ('über die Positionen 1..40') and the deck size define. |
| L51 | `scripts/zh-sample-fixture.mjs:133` | bug | computed | ziel.replace(/\\\\/g, "/") in the generated file header only replaces doubled backslashes; a normal Windows path argument (single backslashes) passes through unchanged, so the 'Neu erzeugen' command baked into the generated module keeps backslashes — the inte… |
| L52 | `scripts/zh-sample-fixture.mjs:56` | duplication | computed | parseCsv here is a near-verbatim re-implementation of the RFC-4180 reader in scripts/text-voice-check.mjs:62-80 (same state machine, same quote/CR handling, German vs English identifiers being the only difference). |
| L53 | `sim/policies/pivot.js:55` | duplication | computed | The glacier-target block (3x3 cluster [0,1,2,5,6,7,10,11,12], fallback findIndex, pos<0 guard) and the isPrecisionOffer helper are duplicated verbatim from sim/policies/faction.js (lines 76-81 and 17). |
| L54 | `sim/cross.js:20` | duplication | computed | quantile/median/mean/fmt helpers are re-implemented near-verbatim in at least five sibling files of this batch: cross.js:18-21, balance.js:8-11, pivot-explore.js:15-16, batch.js:26-31, eval.js:19-25, pacing.js:26-32 — six private copies of the same interpolat… |
| L55 | `scripts/viewport-survey.mjs:458` | dead-code | computed | matrix.generated is initialized to null and never assigned before the file is written, so every matrix.json carries "generated": null — either a dead field or a forgotten stamp. (If the omission is deliberate for byte-identical reruns, as batch.js does explic… |
| L56 | `scripts/viewport-survey.mjs:452` | error-handling | computed | `--shots` takes its directory as argv[indexOf+1] without checking for a following flag, so `--shots --png` silently resolves the shot directory to a folder literally named '--png' (mkdirSync creates it) instead of falling back to the default capture dir. |
| L57 | `src/ui/CustomizeScreen.jsx:709` | comment-drift | measured | BlackholeScene's #vorschau-deck comment claims deck-tint mode shows 'DEIN Deck (Farben + Spielfeld)', but the battlefield at line 657 always uses the fixed PREVIEW_LOOK.blackhole.bf and never deckLook.bf — only the colors follow the active deck. |
| L58 | `src/ui/CustomizeScreen.jsx:948` | dead-code | measured | Dead prop chain 'sun': GlobalFxScenePreview accepts sun (default true, FxStage passes sun={false}) and forwards it to CubeMatrixPreview, whose signature ({ deckTint, wire }) ignores it; CubeMatrixField gets hardcoded sun={false} at line 861. |
| L59 | `src/ui/CustomizeScreen.jsx:1654` | dead-code | measured | PackDetail passes a1={viewPack.a1} to CardPreview (lines 1654, 1674) and BfPreview (lines 1661, 1673), but neither component declares or uses an a1 prop. |
| L60 | `src/ui/DevRunSetup.jsx:63` | react-purity | computed | toggleType calls setSchedule inside the setEnabled updater function; state updaters must be pure and are invoked twice under React StrictMode, so setSchedule is scheduled twice. The remap is idempotent, so no visible break today, but any future non-idempotent… |
| L61 | `src/ui/FormationPhase.jsx:70` | comment-drift | measured | Orphaned eslint-disable-next-line react-hooks/exhaustive-deps directive: it applies to line 71 (`const glacierLocked = state.glacierLocked || []`), which is not a hook call, so the directive is dead; the dep it discusses lives at the useMemo on line 74, which… |
| L62 | `src/ui/deckTint.js:33` | resource-lifetime | computed | Cache eviction is pure insertion-order FIFO (tintedUrl/get never refreshes recency) and revokes the evicted Object-URL immediately; after 24+ distinct src|a1|a2 combos in one session, a blob URL that is still bound to a visible <img> or Pixi texture can be re… |
| L63 | `src/ui/format.js:22` | correctness | computed | fmtScoreShort has a unit-boundary rounding gap: values just under a unit threshold round up past it, e.g. 999.95e9 formats as '1.000 Mrd.' instead of '1 Bio.' (same at the Mio/Mrd boundary), because rounding to one decimal happens after the unit is chosen. |
| L64 | `vite.config.js:28` | security | computed | The path-traversal check `file.startsWith(MEDIA_DIR)` lacks a trailing-separator boundary, so a sibling directory whose name begins with 'media' is reachable. |
| L65 | `vite.config.js:41` | bug | computed | Suffix byte ranges (`bytes=-N`, meaning the LAST N bytes per RFC 7233) are served as the FIRST N+1 bytes with a wrong Content-Range. |
| L66 | `vite.config.js:26` | error-handling | computed | `decodeURIComponent` on the raw URL is not guarded; malformed percent-encoding throws URIError out of the middleware. |
| L67 | `test/viewport-1280.test.js:178` | test-coverage | computed | The counter-edge closure scans only fractional max-widths (`\d+\.\d+px`); an integer hand-typed counter-edge such as `max-width: 1279px` escapes every assertion in the file. |
| L68 | `src/ui/TutorialSections.jsx:206` | bug-stale-data | computed | The overall tutorial progress counter uses seenSet.size, which counts stored lesson paths that no longer exist in the catalog (renames/removals the file itself anticipates at line 191), so 'done/total' can overcount and even exceed total; the adjacent per-sec… |
| L69 | `src/ui/StartScreen.jsx:232` | bug-stale-state | computed | In tryPlaySeed, a previously shown secret-code confirmation (secretMsg, green) is not cleared on the seed-error path, so after entering a valid test code and then an invalid seed, the green success message and the red error message render simultaneously (line… |
| L70 | `src/ui/UpgradeScreen.jsx:270` | duplication-and-drift | computed | verteilung() near-verbatim duplicates alsProzent() in ImpactBox (line 451-454) in the same file, and unlike ImpactBox it calls tierWeightsForShift(node.shift) WITHOUT the maxTier argument that ImpactBox's own comment (line 446-450) declares essential ('Ohne d… |
| L71 | `src/ui/useReducedFx.js:17` | duplication | measured | useMediaMatch is a third private re-implementation of the matchMedia-as-state hook: useIsWide.js:26 exports useMediaQuery whose comment explicitly says other callers should use it 'statt dieselben vier matchMedia-Zeilen zu kopieren', and usePrefersReducedMoti… |
| L72 | `test/announce-deck.test.js:186` | test-doctrine | measured | The guard `expect(koerper).not.toMatch(/b\.tier\.chrome/)` forbids a pattern over a raw source-text window of Battlefield.jsx that includes comments — a future benign comment inside that window mentioning the old expression (e.g. explaining why b.tier.chrome … |
| L73 | `test/announce-perf.test.js:48` | test-robustness | measured | `Number(bf.match(/BIG_ANNOUNCE_MS = (\d+)/)[1])` has no null guard: if the constant is renamed or reformatted, the test dies with a TypeError ('Cannot read properties of null') instead of a readable assertion — inconsistent with the same file's ladder guard (… |
| L74 | `src/ui/optionsBits.jsx:108` | comment-drift | measured | Header comment claims the dropdown list is 'eine echte Listbox, damit Screenreader und Pfeiltasten sie kennen', but no arrow-key handling exists — role="listbox"/role="option" alone provides no arrow navigation; keyboard access is Tab-only through the inner b… |
| L75 | `src/ui/music.js:147` | comment-drift | measured | Pool comment says overdrive+ starts at 'Score 60 Mio+' but the actual threshold is 90,000,000 (TIER_MIN.overdrive_plus, line 89), which also matches the plan comment on line 88 ('overdrive+ 90 Mio+'). The 60 is stale. |
| L76 | `src/ui/perfRecorder.js:169` | dead-code | measured | The byEvent filter '(e) => e.count > 0 || e.jank > 0' can never remove anything: entries are only ever created via perfMark (count++ to >=1) or the jank path in onFrame (jank++ to >=1), so the predicate is always true. |
| L77 | `src/ui/RunDetail.jsx:422` | duplication | measured | The tier roman-numeral conversion is hand-rolled as an inline array literal although romanOf is imported in this same file and used for the identical purpose in buildingFields (line 142). |
| L78 | `src/ui/RunDetail.jsx:285` | dead-code | computed | The overlay root pairs backdropFilter: blur(3px) with a fully opaque background (#0c0c10, no alpha), so the blur can never be visible but still declares a compositor backdrop filter; every other overlay in the batch uses a translucent scrim (#0c0c1099, #0c0c1… |
| L79 | `src/ui/PerfOverlay.jsx:72` | error-handling | computed | The clipboard write's promise rejection is not handled: try/catch only covers the synchronous call, so a rejected writeText (e.g. permission denied) produces an unhandled rejection while the UI still flips to the '✓ copied' state. |
| L80 | `src/ui/SeedChip.jsx:43` | cleanup | computed | The 1400 ms 'copied' reset timer is never cleared: it fires setCopied(false) after unmount (harmless no-op in React 18 but inconsistent hygiene), and rapid repeated copies stack timers so an early one can cut a later confirmation short. |
| L81 | `src/ui/GlobalLeaderboard.jsx:176` | i18n | measured | The own-row marker ' · du' is a hard-coded German literal next to the player name in every leaderboard list; English users see German. Small string, but the same list localizes everything else via t(). |
| L82 | `src/ui/fx/SupernovaPixi.jsx:97` | stale-closure | computed | seedStars (line 97: seed = i*2.3 + (trigger+1)*5) and the streak angle (line 177: (i/nS)*TAU + (trigger+1)) close over the trigger prop from the mount-time effect (deps [panelRef, cardRef]). Replays fired through startRef on trigger change reuse the mount-tim… |
| L83 | `src/ui/fx/SonnenPulsPixi.jsx:101` | stale-cache | computed | sunKeyRef is a component-level ref but the sun texture it keys lives in the per-effect Pixi app. If the main effect ever re-runs (panelRef/cardRef identity change), cleanup destroys the texture while sunKeyRef keeps the old key; on the rebuilt stage ensureSun… |
| L84 | `src/ui/fx/SupernovaPixi.jsx:124` | comment-drift | measured | Comment says 'lite → weniger Tunnel-Ringe/Speichen (10/16 statt 14/24)' but the code on the next line uses 8 rings (s.lite ? 8 : TUNE.T_RINGS), not 10. |
| L85 | `src/ui/multTier.js:18` | comment-drift | measured | multTierLevel's comment claims 'Geteilte Quelle mit multTierColor (kein Drift)', but the function re-hardcodes the four thresholds (2.10/1.70/1.30/1.001) as literals instead of deriving them from the TIERS array multTierColor uses — exactly the drift the comm… |
| L86 | `src/ui/GameOver.jsx:206` | performance | computed | computeFormations, glacierGridProps, architectCoverFor and milestoneBarState are recomputed on every render of GameOver without memoization, and useCountUp/useDpRollup drive setState at requestAnimationFrame rate for ~1-2 s after mount — so the full deck-form… |
| L87 | `src/ui/GameOver.jsx:151` | accessibility | measured | Full-screen modal overlays without dialog semantics: UnlockModal (GameOver.jsx:151) and the GameOver root (line 240), GlacierPick (GlacierPick.jsx:30), LeaderboardScreen (LeaderboardScreen.jsx:239) and LegendarySelect (LegendarySelect.jsx:67) render fixed ins… |
| L88 | `src/ui/fx/SonnenPulsPixi.jsx:28` | duplication | measured | The hex→[r,g,b] helper is duplicated near-verbatim four times across this batch — rgb() in ScorchFx.jsx:36, SonnenPulsPixi.jsx:28 and SupernovaPixi.jsx:33 (character-identical one-liners), plus the hexToRGB variant in starfieldPixi.js:121 — and intOf/rgbInt l… |
| L89 | `src/ui/fx/MossGrow.jsx:75` | dead-code | measured | Always-false guard: `const birthG = clamp01(bi); if (birthG > 1) continue;` — clamp01 caps at 1, so the filter never fires and never-drawable field points (bi >= 1) stay in the module-wide field array. The sibling FrostIce.jsx line 68 uses the working form `i… |
| L90 | `src/ui/fx/PixiStage.jsx:26` | comment-drift | measured | Header comment states 'DPR gedeckelt auf 2 ... bzw. 1.4 auf der lite-Stufe (Mobile), plus 30-fps-Cap auf lite', and lines 88-89 repeat '1,4'; line 98 says '30 fps'. The values actually delivered by mobileTier.js since 2026-08-18 are DPR_CAP_COARSE = 1.0 and D… |
| L91 | `src/ui/fx/neonsurfShader.js:22` | comment-drift | measured | Comment claims 'Auflösungsfaktor dieser Ebene: mobil 0,75' and points to FieldCompositor.jsx as the source — but FieldCompositor's neonsurf layer has scaleCoarse: 1 since #dpr-1 (FieldCompositor.jsx:55), with a long comment explaining the 0.75 -> 1.0 move. |
| L92 | `src/ui/fx/CardIonStorm.jsx:167` | comment-drift | measured | Section comment 'wandernde Runner (bewegter Blitzrahmen)' (and header line 6 'wandernde Runner-Bögen') contradicts the config: TUNE.RUN_SPEED is 0 (line 21, documented there as '0 = stehende Bögen'), so head = ((t/1000)*0 + r/RUNNERS)*N — the runners never wa… |
| L93 | `src/ui/fx/CardEdgeGlow.jsx:16` | duplication | measured | EDGE_TUNE (rand/halo/atem/farbe), CARD_CORNER=12, HREF=360 and the halo-layer/kern-line math (lines 63-86) are a near-verbatim second copy of cardFx/edgeGlow.js (EDGE_TUNE lines 20-26, drawEdgeGlow lines 86-113). edgeGlow.js is Pixi-free (imports only fxMath)… |
| L94 | `src/ui/fx/CardIonStorm.jsx:49` | duplication | measured | buildPerim (rounded-rect perimeter sampled into N points via segment list + while-advance) re-implements cardFx/edgeGlow.js buildPerim (lines 33-58) near-verbatim; the only delta is that the IonStorm variant also emits outward normals. |
| L95 | `src/ui/fx/FireHead.jsx:260` | duplication | measured | frnd() is byte-identical to fxMath.vhash (fxMath.js:78-81) — `Math.sin(a * 127.1 + b * 311.7) * 43758.5453` fract — and CardIonStorm.jsx line 45 carries a third copy (hash/sjit). fxMath's header explicitly says vhash was consolidated there; two of this batch'… |
| L96 | `src/ui/fx/HologridSlicePixi.jsx:52` | duplication | measured | Local roundRect() duplicates fxMath.roundRectPath (fxMath.js:91-100) verbatim, including the radius clamp that fxMath's comment describes as the exact point where earlier copies drifted. The file imports mix/clamp01 from fxMath but not roundRectPath. |
| L97 | `src/ui/fx/PrismaKaskadePixi.jsx:23` | duplication | measured | rgb(hex) and intOf(c) are copied identically into four Pixi effect files in this batch — PrismaKaskadePixi.jsx:23-24, HoloCubePixi.jsx:29-30, HologridSlicePixi.jsx:49-50, LaserFaecherPixi.jsx:28-29 (CubeMatrixField.jsx:159 and FireHead.jsx:28-29 carry array/t… |
| L98 | `src/ui/fx/FireHead.jsx:112` | performance | computed | update() runs every Pixi ticker frame and calls card.getBoundingClientRect() plus panel.getBoundingClientRect() with no justifying comment at the site — the sibling CardFxStage.jsx carries an explicit justification for its per-frame measurement (lines 168-172… |
| L99 | `src/ui/fx/BlackholeFx.jsx:274` | performance | computed | In drawStars the loop-invariant `ctx.fillStyle = rgba(STAR, aMul)` is recomputed inside the per-star loop: one identical string allocation per star per drawn frame (~150 stars x 2 layers x ~30 fps ≈ 9k throwaway strings/s), in a file that elsewhere caches a g… |
| L100 | `src/ui/fx/FieldCompositor.jsx:310` | error-handling | computed | After three tick failures the ticker stops, but tickFails is never reset and applyRun() (wired to every visibilitychange and every `active` prop toggle) unconditionally restarts the stopped ticker — a permanently broken layer then re-errors and re-warns once … |
| L101 | `src/ui/fx/GottChromeWord.jsx:38` | correctness | computed | SVG defs ids derive from idKey with default "x" (`gc-x`/`gm-x`). If two instances mount concurrently without an explicit idKey (the file's stated use spans in-game announcements AND the shop preview), the duplicate document ids make both `url(#gc-x)` fills an… |
| L102 | `test/ecke.test.js:212` | dead-code | computed | The first loop of 'die Bahn ist an den Marker gebunden' is vacuous: zeile is prefix-of-line + m[1], where m[1] is a non-empty capture, so expect(zeile).toBeTruthy() can never fail. The real check is the second loop (lines 217-218); the first loop is dead weig… |
| L103 | `test/buehne-desktop.test.js:191` | test-quality | computed | The ghostEffekt slice can silently widen its scope: if the end anchor 'const playerGhosts' disappears from Battlefield.jsx, indexOf returns -1 and slice(start, -1) yields everything to near-EOF; the >500 length check still passes and 'return nachZug(' could m… |
| L104 | `test/audio-voices.test.js:16` | test-quality | computed | stealOrder is an in-test transcription of the selection algorithm in src/ui/audio.js ('Dieselbe Auswahl wie in audio.js'); the four behavior tests (lines 35-63) exercise this copy, not the shipped code. Only the two source-text regexes (lines 30-32) tie the t… |
| L105 | `test/audio-voices.test.js:32` | test-quality | computed | Negative pattern over the whole RAW file including comments: a benign explanatory comment in audio.js quoting the old code ('while (voices.length > SFX_MAX_VOICES) { const old = voices.shift()') turns this guard red without any behavior change. No comment-str… |
| L106 | `test/battlefield-gottgleich.test.js:43` | test-quality | computed | Inconsistent comment handling inside one file: the 500000-literal count (lines 21-23) carefully strips comments ('Kommentare zaehlen nicht mit'), but the negative guard not.toMatch(/gottBase\s*=\s*isCrit/) runs over the raw SRC including comments, so a commen… |
| L107 | `test/corner-art.test.js:345` | test-quality | computed | expect(cornersJsx).not.toMatch(/filter/) bans the bare word 'filter' anywhere in raw CardCorners.jsx including comments and prose; a comment like 'no runtime filter here' turns it red. Similarly the <img> count at line 364 counts raw text, so a JSX snippet in… |
| L108 | `test/families-engine.test.js:18` | duplication | computed | constDeck, identity, scenario and litCrit (lines 18-36) are near-verbatim copies of the same helpers in test/engine.test.js (lines 19-42, incl. the multi-line litCrit rationale comment). The header says 'Teststil analog engine.test.js', but a change to the en… |
| L109 | `test/corner-art.test.js:146` | duplication | computed | webpSize re-implements the same minimal lossy-WebP header parser as test/cosmetic-assets.test.js webpSize (lines 29-36): RIFF/WEBP/'VP8 ' checks plus readUInt16LE(26/28) & 0x3fff. Two copies of binary-format parsing is the kind of thing that diverges silently… |
| L110 | `test/desktop-perf.test.js:40` | duplication | computed | stripComments is duplicated character-for-character in test/deck-tafel.test.js line 260, with weaker variants in test/cube-mobil.test.js line 25 and test/ecke.test.js line 192. The cube-mobil variant strips only FULL-LINE // comments (/^\s*\/\/.*$/gm), so a t… |
| L111 | `test/tutorial-sections.test.js:210` | comment-code-drift | measured | Comment contradicts the assertion: the comment says a failure here means 'ein Inhalts-Task hat in T1s Datei geschrieben statt in seine eigene' (content was ADDED to T1's file), but expect(totalLessons()).toBeGreaterThan(0) can only fail when lessons are REMOV… |
| L112 | `test/up-ruhe.test.js:101` | raw-file-guard | measured | The 'alles hängt am 1280er Block' negative guard scans the RAW base section of index.css including comments (css is not comment-stripped before the slice at line 99). A benign rationale comment in the base part of index.css that quotes '.up-navrow' or '.up-vn… |
| L113 | `test/shop-state-colour.test.js:59` | raw-file-guard | measured | The '#54e08a exactly once' count runs over the raw CustomizeScreen.jsx including comments. A future rationale comment in that file naming the old colour literal (the exact style this repo's tests use extensively) makes the count 2 and the guard red on a benig… |
| L114 | `test/st-ruhe.test.js:99` | error-handling | measured | Three regex matches are dereferenced without a null check: desk.match(/\.st-kpis > div.../)[0] (line 99), desk.match(/\.st-box.../)[0] (line 106), and desk.match(/\.st-close.../g).pop() (line 120). If the protected rule is renamed or moved out of the desktop … |
| L115 | `test/screens-desktop.test.js:29` | duplication | measured | The brace-depth desktop-block extractor is copy-pasted near-verbatim in three of this batch's files: screens-desktop.test.js:29-38, st-ruhe.test.js:27-35, and up-ruhe.test.js:17-25, all keyed on the shared DESKTOP_BLOCK_AT constant from test/desktopBreakpoint… |
| L116 | `test/showcase-look.test.js:100` | magic-count-guard | measured | Pins raw occurrence counts of the INTENDED form: exactly 9 look={look(" call sites (line 100) and exactly 5 useContext(DeckLookCtx) (line 105). A tenth legitimate scene or a sixth legitimate context reader turns these red although nothing is wrong — the exact… |
| L117 | `test/showcase-look.test.js:73` | vacuous-guard | measured | The tiered-deck test silently becomes a no-op if no pack with more than one tier exists: 'if (!tiered) return;' exits green without any signal. If tiered packs were ever removed or restructured, the assertion that tier decks resolve to their own tier colour w… |
| L118 | `test/sim-formation-solver.test.js:31` | magic-literal | measured | phasesChecked is compared to the transcribed literal 13 instead of being recomputed from the live source (DECISION_SCHEDULE.filter(d => d === "formation").length, already imported-adjacent in schedule.test.js). At the next schedule rebalance this test goes re… |
| L119 | `test/victory-perks.test.js:57` | dead-assertion | measured | The assertion expect(stats).toMatch(/const showPerks = !anonymized/) is strictly subsumed by line 55's longer match of the same line and can never fail independently; its accompanying comment claims it verifies that anonymization 'die Familien mitnimmt', whic… |
| L120 | `test/i18n-guards.test.js:340` | comment-drift | measured | Comment says 'Sieben Namen dazu' (seven names) but the adjacent list at lines 344-348 contains 13 keys (deck_kosmos, deck_oni, deck_drache, deck_serie1500, deck_sparfuchs, deck_sonne, deck_sunset, deck_beach, deck_wale, deck_onboarding, deck_gottgleich, deck_… |
| L121 | `test/mobile-tier.test.js:76` | comment-drift | measured | Comment 'über dem Handy-Deckel von 1,4 — der Regler gewinnt' contradicts the same file: line 42 pins DPR_CAP_COARSE to exactly 1.0 and its comment explains 1.4 was the old estimate that was replaced. |
| L122 | `test/mobile-tier.test.js:56` | dead-code | measured | Test 'nimmt ohne window den Desktop an (SSR-sicher, kein Absturz beim Import)' asserts only `frameMinMs(false) === 0`, byte-identical to the assertion already made at line 32; it never exercises a no-window import path itself. |
| L123 | `test/legendaries-v03.test.js:152` | weak-guard | measured | Conditional assertion `if (s.formationEnergy !== undefined) expect(s.formationEnergy).toBeLessThanOrEqual(FORMATION_ENERGY)` silently degrades to no check: if the reducer renames or stops setting formationEnergy, the Ballast cost half of L_BALL is unverified … |
| L124 | `test/leg-gleich.test.js:86` | ratchet-hazard | computed | Forbid-guards match the whole raw file including comments: `expect(leg).not.toMatch(/leg\.intro/)` (line 84) and `expect(cat).not.toMatch(/"leg\.intro\./)` scan LegendarySelect.jsx and both catalogs unstripped; a benign comment mentioning the removed key (e.g… |
| L125 | `test/overlay-nesting.test.js:62` | weak-guard | computed | Portal detection accepts `overlayPortal(` or `createPortal(` anywhere in the 260 chars preceding the overlay class literal, without stripping comments — a comment mentioning overlayPortal( directly above a non-portaled `fixed inset-0` element satisfies the gu… |
| L126 | `test/hub-knopf.test.js:20` | duplication | measured | The brace-counting deskBlock IIFE (indexOf DESKTOP_BLOCK_AT, depth counter, slice) is duplicated near-verbatim in six files of this batch: hub-knopf.test.js:20-28, kante-anlauf.test.js:20-28, levelup-wings.test.js:37-46, lv-ruhe.test.js:20-28, marke.test.js:3… |
| L127 | `test/kante-anlauf.test.js:57` | dead-code | measured | `num(block, name, fallback)` declares a `fallback` parameter that no caller passes (all four calls at lines 61-64 pass two args); on a failed match it returns undefined and the assertion fails with a generic 'undefined is not less than 14' instead of a target… |
| L128 | `test/hub-deck-bg.test.js:57` | magic-literal | measured | `expect(rule[0].match(/min\(1,/g) || []).toHaveLength(4)` transcribes the gradient stop count as a literal 4 instead of recomputing the relationship its message claims ('jede Stützstelle braucht den min(1, …)-Deckel') — adding or removing a legitimate stop wi… |
| L129 | `test/formations-perks.test.js:11` | comment-drift | measured | Header comment states the computeFormations signature as '(order, deck, roles, perks, skills, anchors, pe, familyTiers)' and line 18 says 'familyTiers als 8. Argument'; the real signature (src/game/formations.js:205) is '(order, deck, roles, _perks, skills, a… |
| L130 | `test/glacier-roles-c1.test.js:55` | comment-drift | computed | Comment 'gepoolt auf 4 → bricht' contradicts the scenario: masses are 0 and 24 (line 51, comment there correctly says 'Pool-Schnitt 12'), so verschmelzenPool raises pos0 to 12, not 4. The '4' is copied from the unit test at line 46 (masses 0 and 8). At a pool… |
| L131 | `test/glacier-legendary-l1.test.js:59` | comment-drift | computed | Within one test the comments contradict each other and the asserted semantics: line 55 says 'weit weg voll → Pool-Schnitt 12' (average semantics) and line 59 says 'auf 6 gepoolt → bricht', while the uebergletscherPool unit test at lines 29-31 in the same file… |
| L132 | `test/fx-seams.test.js:27` | ratchet-hazard | computed | ohneKommentare strips block comments and full-line // comments only (regex '^\s*//.*$'); a trailing end-of-line comment in one of the five Prunk files (e.g. 'app.init(o); // resolution: capped in pixiGott') survives the strip and turns the negative guard at l… |
| L133 | `test/guide-desktop.test.js:81` | ratchet-hazard | measured | The guard scans the ENTIRE raw index.css (comments included) with /--gs:\s*([\d.]+)/ and requires exactly one match with value '1'. index.css already discusses the removed shrink stages in prose (lines 4428-4430 write '--gs 1,0', line 7646 'mit --gs .95') — t… |
| L134 | `test/graph-labels.test.js:33` | ratchet-hazard | computed | Negative guards 'not.toMatch(/\baxes \?/)' and 'not.toMatch(/\{axes &&/)' run over raw Sparkline.jsx including comments; a benign comment explaining the old two-stage API (e.g. 'früher: axes ? voll : kompakt') turns the suite red without any behavior change. … |
| L135 | `test/fx-panel.test.js:64` | ratchet-hazard | computed | The negative 'keine hart notierte Brett-Zahl' check (aspect-ratio: 668) runs against 'desktop' — the raw CSS slice WITH comments — although the file defines a comment-stripped 'desktopBare' at line 24 precisely for this hazard and even documents it ('Ratschen… |
| L136 | `test/fx-preview-cost.test.js:56` | ratchet-hazard | computed | 'expect(fx("SonnenPulsPixi.jsx")).not.toMatch(/resLite/)' scans the raw effect file including comments; a comment in SonnenPulsPixi.jsx merely mentioning resLite (plausible, since the other four Prunks document it extensively per fx-seams.test.js:25-27) turns… |
| L137 | `test/fx-prewarm.test.js:40` | ratchet-quality | computed | The file is built almost entirely from exact-string toContain ratchets of long code lines (e.g. line 40 a full if-statement, line 59 a 100+-char chained promise expression, line 64 a full-statement regex). These are relationship-free transcriptions: any white… |
| L138 | `test/glacier-v0.test.js:9` | duplication | computed | The helper block (identity, flat, oppOf, zeros, falses, noCrit, scen, runCycle, plus lockAt/withMass variants) is re-implemented near-verbatim in at least 14 of the glacier test files in this batch: glacier-best-trick(8-18), glacier-consume-timing(9-19), glac… |
| L139 | `test/guide-desktop.test.js:30` | duplication | computed | The brace-counting deskBlock extractor (find DESKTOP_BLOCK_AT, walk braces to depth 0) is re-implemented near-verbatim in three files of this batch: guide-desktop.test.js:30-39, glossary-desktop.test.js:55-64 and go-ruhe.test.js:35-43. The repo already shares… |
| L140 | `test/rd-ruhe.test.js:22` | duplication | computed | The deskBlock extraction (lines 21-29) is a near-verbatim duplicate of test/rahmen-huelle.test.js lines 24-33, but drops that file's `if (at < 0) return ""` guard. If DESKTOP_BLOCK_AT is renamed/removed, `css.indexOf(DESKTOP_BLOCK_AT)` returns -1 and `css.ind… |
| L141 | `test/rahmen-huelle.test.js:95` | test-quality | computed | The three negative guards at lines 94-96 (`not.toMatch(/Kbd|kbd=/)`, `not.toMatch(/useEnter|"Enter"/)`, `not.toMatch(/useEffect/)`) run over the raw, un-stripped source of RunConfirm.jsx including comments: a benign comment in that file mentioning 'Enter', 'K… |
| L142 | `test/registry-guards.test.js:176` | test-quality | computed | The Coverage-Gate (Guard 3) counts a registry ID as 'covered by a test' if the ID string appears anywhere in any test file, including inside comments: `TEST_BLOB.includes(id)` on raw file contents. A skill/perk/family mentioned only in an explanatory comment … |
| L143 | `test/panel-tokens.test.js:496` | test-quality | computed | withoutFallbacks uses `var\(\s*--[a-zA-Z0-9-]+\s*,[^()]*\)` — the `[^()]*` fallback part cannot contain parentheses, so a fallback like `var(--c, rgba(0,0,0,.5))` or a nested `var(--a, var(--b))` is not neutralised and its literal would be reported by the axi… |
| L144 | `test/panel-tokens.test.js:1242` | test-quality | computed | styleValue returns only the FIRST property whose name starts with the requested prefix (`\b${prop}[A-Za-z]*\s*:` + .match). For the prefix 'border', a style object carrying e.g. `borderTop: "1px solid #fff", borderBottom: "1px solid #000"` yields only the bor… |
