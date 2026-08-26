# Task contract — zh-hans-plan

Tier **C**. The pass would be B; it is C because the CJK branch changes typography across every
screen and needs its own visual gate per design round (`task-lifecycle.md` — *Tier C*).

## Identity

| Field | Value |
| --- | --- |
| Branch | `task/zh-hans-plan` |
| Base | `feature/zh-hans` @ `d9763883bb5e1a2d5433d33f4de1121bb9da0cf9` |
| Owner | Repository owner (GitGudMonkeh) — settled the decision block during the planning session |
| Integrator | TODO — assign before integration (`AGENTS.md` — *Roles and source of truth*) |
| Concurrency | one writer; sequential sessions may continue the task in the same worktree |

No reviewer row: no independent review was requested. Review is optional and risk-based
(`AGENTS.md` — *Independent review*).

**The base is not durable yet.** `feature/zh-hans` exists only locally — `origin/feature/zh-hans`
does not exist at the time of setup. The SHA above is what the worktree was cut from and is durable;
the branch name is not, until a human pushes it.

## Local workspace

| Field | Value |
| --- | --- |
| Worktree | `/home/user/Autostich-worktrees/zh-hans-plan` |
| Branch checked out there | `task/zh-hans-plan` |
| Upstream | none — the branch deliberately does not track its base |
| Preview port | 5197 |
| Preview URL | http://localhost:5197 |
| Server invocation | `npm run dev -- --port 5197 --strictPort` |

**Note on the port.** `create-task` step 8 allocates the lowest free integer from 5181 upward across
the reserved table in `NEW_MACHINE_SETUP.md` (5173, 5180) and `grep -rn "Preview port"
docs/workstreams` (5180–5195). That algorithm yields **5196**. 5196 is taken: it is recorded in
`docs/workstreams/spanish-locale/task-contract.md` on `task/spanish-locale`, an unmerged branch the
working tree cannot see. The port ledger is per-branch; the ports are not. 5197 was allocated
instead, and the deviation is recorded here rather than left to surface as a `--strictPort` failure.

## Scope

Five parts, in this order. Part 1 is done; the rest are not.

1. **Feasibility, measured.** Done — `planning-report.md`. Font bytes, catalogue size, role coverage,
   and the three premises of the brief that did not survive measurement.
2. **The sample order goes out.** Done as an artefact — `sample-order.csv` (115 strings) and
   `sample-order.md`. Not done as an act: a human sends it and a translator returns it.
3. **The design round, on the returned sample.** The CJK branch is drafted against real Chinese text,
   passes a visual gate, and only then is written into `docs/design-sprache.md` — in German, appended
   to that document's fixed template (`AGENTS.md` — *Appending to an existing German document*).
4. **`zh-Hans` registered in code.** Depends on `task/spanish-locale` — see *Approved architecture*.
   Adds only what is genuinely CJK on top of the seam Spanish builds: the font faces, the
   `:lang(zh-Hans)` rules, the pre-mount `lang` script, the third case in `fmtDayMonth`, and the
   correction to the comment at `src/index.css:788`.
5. **The full order.** All 2,639 keys, in the form of `sample-order.md`, naming the frozen source SHA.

## Non-goals and tripwire

| Non-goal | Why |
| --- | --- |
| Writing Chinese text | Translation is external. This task ends with a handover. |
| Traditional Chinese | `zh-Hans` is named so `zh-Hant` can sit beside it later without renaming the first. Nothing else here anticipates it. |
| Changing German or English wording | Both text passes closed recently. A wording change here is a third pass nobody asked for. |
| Changing Latin typography | The CJK branch stands **beside** it, never in its place. |
| Building the N-language seam | Owned by `task/spanish-locale`. See *Approved architecture*. |

**Tripwire 1 — the language boundary.** If a rule written for the CJK branch also fires under
`lang="de"` or `lang="en"`, stop. The branch hangs on the language, not on the stylesheet at large.
This is where the Latin typography that was just unified gets lost quietly. Verifiable: every rule the
branch adds is inside a `:lang(zh-Hans)` selector, and the diff shows no edit to an unqualified
`--text-*` value or `.ty-*` rule.

**Tripwire 2 — guards.** If a change weakens a guard instead of generalising it over N languages,
stop. A parity guard that stops asserting is not a guard that passed.

**Tripwire 3 — the seam.** If the diff starts editing `src/i18n/index.js` `LOCALES`/`CATALOGS`, the
three formatters beyond `fmtDayMonth`'s third case, `scripts/export-strings.mjs`, or
`test/i18n-guards.test.js`, stop. Those belong to `task/spanish-locale`, and two contracts editing
one seam is the collision this ordering exists to avoid.

## Approved architecture

**A1 — Ordering: Spanish first, this task inherits.** `task/spanish-locale` is Tier B, has a full
contract, and its staffing row records that the owner settled its decision block before
implementation. It claims the N-language seam by name — `LOCALES` with `ready: false`,
`READY_LOCALE_IDS`, the guards generalised along a forbid/require split, one CSV per target language.
**This task treats that seam as a precondition and does not build it.** Rejected: building it here at
the harder case and letting Spanish inherit — which was the planning session's own first
recommendation, withdrawn when the Spanish contract was measured to already exist and to already be
decided.

**A2 — The size ladder, under `:lang(zh-Hans)` only.** `text-micro` 9 px → **12 px**, `text-meta`
11 px → **13 px**. Both current values sit under the legibility floor for Hanzi, and `text-meta`
carries labels, eyebrows, counters, chips, version stamps and seeds — a large part of the surface.
This is a change to **roles**, never to call sites (`conventions.md` — *A menu does not introduce a
size*). The reflows it causes are reviewed at the visual gate on the returned sample, not argued in
advance. Rejected: leaving the ladder and widening individual tight surfaces — the exact mistake
`conventions.md` names.

**A3 — The name filter stays unsolved in round 1.** `scripts/gen-profanity-sql.mjs` and
`docs/username-profanity-guard.sql` work over NFKD normalisation and word-boundary matching. Neither
carries for Hanzi: there are no word boundaries, and evasion runs through homophones. **Named
consequence: Chinese players can set names the filter does not see.** A homophone filter is its own
workstream with its own word list; folding it in here would deliver a filter nobody measured.

**A4 — Font: self-hosted Google slices.** The 101 pre-sliced `woff2` files of Noto Sans SC with their
`unicode-range` declarations, beside the existing `latin` / `latin-ext` pair. Measured: 101 unique
files cover 16,279 codepoints in 4,516,508 B, and weights 400/500/600 resolve to the *same* files —
the face is variable, so three weights cost what one costs. Chosen because it needs **no new build
dependency** (`AGENTS.md` — *House rules*), and because slicing keeps `font-display: swap` from ever
having megabytes behind it (H5). Rejected: one full file per weight (pointless once the face is known
to be variable, and H5 itself); subsetting from the delivered text (smallest, but needs a subsetter in
the build and must re-run on every text change — a key added later renders as a box); serving from
Google (contradicts self-hosting, third party in the load path).

**A5 — Language of the artefacts.** English throughout, except the `docs/design-sprache.md` entry,
which stays German because that document has a fixed German template (`AGENTS.md` — *Appending to an
existing German document*), and the translation package, which follows the form of the English
exemplar.

## Task-specific inputs

| Input | Value | Kind |
| --- | --- | --- |
| Frozen source SHA for the package | `d9763883bb5e1a2d5433d33f4de1121bb9da0cf9` | measured |
| Catalogue | 2,639 keys per language, parity holds; 112,748 German characters | measured |
| Export CSV | 2,800 data rows | measured |
| `uppercase` sites | 147 — 21 CSS rules, 124 utility uses | measured |
| Letter-spacing | 142 `tracking-*` utilities, 42 `letter-spacing` rules | measured |
| Font | 101 files · 16,279 codepoints · 4,516,508 B, all three weights | measured |
| Roles carrying translatable text | `text-micro` 13 · `text-meta` 187 · `text-body` 126 · `text-body-lg` 50 · `text-title` 8 · `text-head` 2 · `text-figure` **0** | measured |
| Sample | 115 strings, 10,552 German characters | measured |

## Acceptance gate

> **The full order can go to the translator with no open design question that affects their text.**

It is one criterion and it is not met early. It presupposes the whole chain: the sample delivered and
returned, the CJK branch drafted against it and through a visual gate, the size ladder settled rather
than estimated, `zh-Hans` registered in code, and the package naming the frozen SHA. A package that
goes out while the size ladder is open buys a translation that is paid for twice.

## Expected file surface

Indicative. Anything outside it is recorded and reported before it is changed.

**This task writes:**

- `docs/workstreams/zh-hans/zh-hans-plan/**` — report, contract, sample order, package
- `docs/design-sprache.md` — the CJK branch, appended in German (part 3)
- `src/index.css` — the `@font-face` block, the `:lang(zh-Hans)` rules, and the correction at
  `src/index.css:788` (part 4)
- `src/assets/fonts/**` — the Noto Sans SC slices (part 4)
- `index.html` — the pre-mount `lang` script (part 4)
- `src/i18n/index.js` — **`fmtDayMonth` only**, the third case (part 4)

**Must not change** — verifiable by blob hash:

- `src/i18n/de.js`, `src/i18n/en.js` and every other catalogue module: no German or English wording
  changes in this task
- `src/i18n/index.js` beyond `fmtDayMonth`: `LOCALES`, `CATALOGS`, `SEP`, `fmtNum`, `fmtPct` belong to
  `task/spanish-locale`
- `scripts/export-strings.mjs`, `test/i18n-guards.test.js`, `test/loc-csv.test.js`,
  `test/format.test.js`: same owner
- `docs/engineering/conventions.md`: the CJK branch changes role *values* under a language selector,
  never the rule above them

## Known hazards

Measured during planning, not inherited from the brief. The brief's H1–H12 are reduced to what
survived.

| # | Hazard | State |
| --- | --- | --- |
| **Z1** | Pre-mount `lang`: `App.jsx:424` already sets `document.documentElement.lang`, so the attribute follows the language. Only the frame before React mounts still claims `de`, and a system fallback can render Japanese glyph forms in it. | **open** — small, part 4. Replaces the brief's H1, which as stated is refuted. |
| **Z2** | CJK line breaking has no spaces. `word-break`, `line-break` and `overflow-wrap` need review under `:lang(zh-Hans)`. | **open** — part 3. The brief's soft-hyphen clause has no subject: measured, `U+00AD` occurs **zero** times in `src/`. |
| **Z3** | `font-display: swap` on a multi-megabyte face is a visible reflow, not a flicker. Mitigated by A4's slicing; must still be checked on a cold first load. | **open** — part 4. |
| **Z4** | The bottom of the ladder is below the Chinese legibility floor. A2 decides the values; the reflows they cause are the design round's real work. | **decided (A2), reflows open** — part 3. |
| **Z5** | The name filter does not carry for Hanzi. | **accepted, unsolved (A3).** Consequence named. |
| **Z6** | Source-text ratchets read `src/**` as text, and `npm run loc:export` runs with the suite while its CSV is also the deliverable. | **open** — every part that touches `src/**`. |
| **Z7** | Port 5196 is claimed on an unmerged branch and invisible to the allocator. | **handled** — 5197, recorded under *Local workspace*. |
| **Z8** | Chinese punctuation is full-width and the style guide does not cover it. Left unstated, the translator decides it inconsistently. | **handled** — `sample-order.md` §5 states the rules. Carries into the full package. |

## Definition of done

- [ ] Part 1 — feasibility measured and written (`planning-report.md`)
- [ ] Part 2 — sample order produced and handed to a human to send
- [ ] Part 3 — CJK branch drafted on returned Chinese text, through a visual gate, appended to
      `docs/design-sprache.md` in German
- [ ] Part 4 — `zh-Hans` registered in code on top of the Spanish seam; `src/index.css:788` corrected
- [ ] Part 5 — full order written, naming the frozen source SHA
- [ ] Gates green and reported bare: `npm test`, `npm run lint -- --max-warnings=0`, `npm run build`,
      the preview build, `npm run gen:db`, `npm run loc:export`
- [ ] No file from the must-not-change list altered, verified by blob hash
- [ ] Every hazard above resolved or explicitly carried, with its consequence stated

## Open questions

None outstanding. Three were put to the owner during planning and all three are settled — recorded as
A1, A2 and A3.

One item is a dependency rather than a question: **part 4 cannot start until `task/spanish-locale` is
integrated.** Parts 1–3 and 5 do not depend on it.
