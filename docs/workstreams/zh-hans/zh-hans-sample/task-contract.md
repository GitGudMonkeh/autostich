# Task contract — zh-hans-sample

Tier **C**. It hangs under the `feature/zh-hans` integration branch, alongside `task/zh-hans-plan`
(`task-lifecycle.md` — *Tier C*, `git-workflow.md` — *Multi-agent feature integration branch*).

`task/zh-hans-plan` ceded the design round to this task in `831e8612`, with its file surface. This
contract is the only one that binds the CJK branch, `docs/design-sprache.md`, the CJK part of
`src/index.css`, `src/assets/fonts/**` and `index.html`.

## Identity

| Field | Value |
| --- | --- |
| Branch | `task/zh-hans-sample` |
| Base | `feature/zh-hans` @ `d9763883bb5e1a2d5433d33f4de1121bb9da0cf9` |
| Owner | Repository owner (GitGudMonkeh) |
| Integrator | TODO — assign before integration. Deliberately a different session from the one that ran the visual gate: without a requested independent review it is the only second look this task gets. |
| Concurrency | one writer; sequential sessions may continue the task in the same worktree |

No reviewer row: no independent review was requested. Review is optional and risk-based
(`AGENTS.md` — *Independent review*).

## Local workspace

| Field | Value |
| --- | --- |
| Worktree | `C:/Code/Autostich-worktrees/zh-hans-sample` |
| Branch checked out there | `task/zh-hans-sample` |
| Upstream | `origin/task/zh-hans-sample`, its own remote, set when the branch was first pushed. It deliberately does **not** track its base `feature/zh-hans`. |
| Preview port | 5198 |
| Preview URL | http://localhost:5198 |
| Server invocation | `npm run dev -- --port 5198 --strictPort` |

**Note on the port.** The allocator reads the reserved table in `NEW_MACHINE_SETUP.md` (5173, 5180)
and `grep -rn "Preview port" docs/workstreams`. Run in the cockpit that grep sees only up to 5189,
because the ledger is per-branch while the ports are not. Measured across the unmerged branches:
`task/spanish-locale` records up to 5196, `task/zh-hans-plan` records 5197. Hence 5198. Same blind
spot `zh-hans-plan` recorded as Z7.

## Scope

Four parts, in this order.

1. **Land the returned sample as a fixture.** The filled `zh-Hans` column in
   `docs/workstreams/zh-hans/zh-hans-sample/sample-order.csv`, with the terminology list and the fit
   warnings.

   **Superseded on 2026-08-26.** This read "it is a fixture, not a locale", on the reasoning that a
   partial catalogue would break parity or force a seam this task does not own. Both premises fell:
   `task/spanish-locale` is integrated, and its seam is built to carry an announced-but-not-ready
   catalogue. The fixture was registered as `ready: false`, then translated the rest of the way at
   the owner's instruction, and the ratchet took it to `ready: true`. See *Approved architecture* A7.

2. **A harness that renders the sample in the real surfaces.** The design round has to be judged
   where the text actually sits — the eyebrow above its readout, the description in its panel, the
   tutorial lesson in its column — not in a specimen sheet. Behind the existing `VITE_PREVIEW` gate,
   so nothing reaches production.

3. **Draft the CJK branch against that text.** The `@font-face` block for the self-hosted Noto Sans
   SC slices, the `:lang(zh-Hans)` rules, and the ladder floors of A2. Iterate on what the harness
   shows, not on what sounds plausible.

4. **Close it with a visual gate, then write it down.** The gate is the deliverable, not a formality.
   Only after it passes does the branch go into `docs/design-sprache.md` — in German, appended to
   that document's fixed template (`AGENTS.md` — *Appending to an existing German document*).
   Everything else this task writes is English.

**State: part 1 is done** (`3ce1a68e`). Parts 2 to 4 are open.

## Non-goals and tripwire

| Non-goal | Why |
| --- | --- |
| Translating anything | Translation is external, and this task's whole point is that the text arrives before the design. |
| The full 2,639-key order | It goes out after this round closes, from `zh-hans-plan` part 5. |
| ~~Registering `zh-Hans` as a selectable language~~ | **Reversed by the owner on 2026-08-26.** The dependency was gone once `task/spanish-locale` integrated, and the catalogue is complete. See A7. |
| Changing German or English wording | Both text passes closed recently. The wording rule below is how that is verified. |
| Changing Latin typography | The CJK branch stands beside it, never in its place. |
| A profanity filter for Hanzi | Deliberately unsolved in round 1 (A3), with its consequence already named. |

**Tripwire 1 — the language boundary.** If a rule the branch adds also fires under `lang="de"` or
`lang="en"`, stop. Verifiable at a glance: every added rule sits inside a `:lang(zh-Hans)` selector,
and the diff shows no edit to an unqualified `--text-*` value or `.ty-*` rule. This is where the
Latin typography that was just unified gets lost quietly.

**Tripwire 2 — a size at a call site.** If the fix for a tight surface is a number in the JSX rather
than a role value under the language selector, stop. `conventions.md:130` verbatim: *A menu picks a
role, or changes a role for everyone. A menu does not introduce a size.*

**Tripwire 3 — the seam.** If the diff starts editing `src/i18n/index.js` `LOCALES`/`CATALOGS`, the
formatters, `scripts/export-strings.mjs` or `test/i18n-guards.test.js`, stop. Those belong to
`task/spanish-locale`.

**Tripwire 4 — designing without the text.** If part 3 starts before part 1 has landed real Chinese
strings, stop. CJK typography drafted against Latin placeholder text looks settled and is not.
Currently satisfied: the strings are in.

## Approved architecture

**A1 — Ordering: Spanish owns the seam.** `task/spanish-locale` claims `LOCALES`, `READY_LOCALE_IDS`,
`CATALOGS`, the formatters and the generalised guards. This task treats that seam as a precondition
and does not build it. Inherited verbatim from `zh-hans-plan` A1.

**A2 — The ladder floors, under `:lang(zh-Hans)` only.** `text-micro` 9 px → **12 px**, `text-meta`
11 px → **13 px**. Both current values sit under the legibility floor for Hanzi, and `text-meta`
carries labels, eyebrows, counters, chips, version stamps and seeds. This is a change to **roles**,
never to call sites. Inherited verbatim from `zh-hans-plan` A2 and **not reopened**.

**A2a — How A2 maps onto a graded ladder.** Measured: the ladder is not one value per family. It is
`--text-micro-1..4` at 7 / 8 / 9 / 9.5 px and `--text-meta-1..4` at 10 / 10.5 / 11 / 11.5 px
(`src/index.css:99` and `:105`). A2 names one step per family; the other six sit below the same
floor, most of them further below it.

A2's reason is a floor, so it is applied as a floor: **under `:lang(zh-Hans)` no step of the micro
family is below 12 px and no step of the meta family is below 13 px; a step at or above its floor
keeps its value.** Since every current step is below its floor, both families collapse to a single
value under Chinese.

That collapse is the known consequence and it is real: the four graded micro steps render
identically in Chinese, and so do the four meta steps. It is a starting rule, not a finding. If the
gate shows the lost gradation reads badly, the fallback is a shifted ladder that keeps the steps
(micro 12 / 12.5 / 13 / 13.5, meta 13 / 13.5 / 14 / 14.5) and that choice belongs to the owner at the
gate. **This paragraph resolves a gap A2 leaves; it does not reopen A2.**

**A3 — The name filter stays unsolved in round 1.** `scripts/gen-profanity-sql.mjs` and
`docs/username-profanity-guard.sql` work over NFKD normalisation and word-boundary matching. Neither
carries for Hanzi. **Named consequence: Chinese players can set names the filter does not see.**
Inherited verbatim from `zh-hans-plan` A3 and not reopened.

**A4 — Font: self-hosted Google slices.** The 101 pre-sliced `woff2` files of Noto Sans SC with their
`unicode-range` declarations, beside the existing `latin` / `latin-ext` pair. Measured by
`zh-hans-plan`: 101 files, 16,279 codepoints, 4,516,508 B, and weights 400/500/600 resolve to the
*same* files because the face is variable. No new build dependency, no subsetter. Inherited verbatim
from `zh-hans-plan` A4 and not reopened.

**A4a — The slices are not in the repository.** Measured on this branch: `src/assets/fonts/` holds
five `woff2` files (Geist ×2, Geist Mono ×2, Orbitron) and no Noto. Vendoring them is part 3 work and
adds roughly 4.5 MB of binaries to the branch. A4 forbids a subsetter and a new dependency, so the
route is: fetch the Google Fonts stylesheet for Noto Sans SC with a `woff2`-capable user agent, take
the `src` URLs and their `unicode-range` values from it, download the 101 files into
`src/assets/fonts/noto-sans-sc/`, and write the `@font-face` block by hand from the same data. The
stylesheet is the source of the ranges; they are not to be typed from memory.

**A7 — Chinese ships. Decided by the owner on 2026-08-26.** The 2,660-key catalogue is translated
in house from the German, `ready: true`, and offered in the language picker. English remains
`DEFAULT_LOCALE`; nothing preselects Chinese.

Three consequences are recorded rather than left to be discovered. **The terminology is now frozen
in a guard table** (`TERMS["zh-Hans"]`) although it has not been through the external reading, so an
external correction lands as a change to that table and to every string it governs, not as a note in
a document. **The word-form boundary in `src/i18n/glossaryText.js` was generalised**, because it
assumed a script with spaces and therefore blocked almost every Chinese match; German, English and
Spanish keep the boundary they had. **The design round has not run yet**: parts 3 and 4 of *Scope*
are open, so Chinese currently ships in Latin typography, at a size ladder that A2 measured as below
the legibility floor for Hanzi.

**A8 — S6, the eyebrow hierarchy. Decided by the owner on 2026-08-26: letter-spacing .05em.**
The eyebrow ranked by four signals at once and lost three of them to the script: uppercase does
nothing to Han, Geist Mono carries no CJK glyph, and A2's floor pushed the label UP, so the size
step down to its own readout fell from 1.45x to 1.23x. Opacity was left carrying the rank alone.

The decision restores the fourth signal rather than inventing a fifth. Letter-spacing is what the
Latin side ranks with; .14em was the wrong amount, not the wrong device. It applies only where
something was designed as an eyebrow — `uppercase` and a tracking class together — so running text
with tracking stays at zero. Rejected with reasons: weight 600 fills in the counters of dense Han at
13 px, and colour is reserved in this repository for meaning. Both variants were photographed at
411x840 and decided by looking.

**A5 — Language of the artefacts.** English throughout, except the `docs/design-sprache.md` entry,
which stays German because that document has a fixed German template
(`AGENTS.md` — *Appending to an existing German document*).

**A6 — The wording rule is checked by the parsed catalogue, not by a blob hash.** `831e8612` moved
the check, because this task legitimately makes structural edits to the catalogue modules while every
visible string stays identical, and a blob hash fires on a moved bracket. What must not move is the
**wording**.

The check is `scripts/wording-digest.mjs`, added on this branch so the rule is runnable rather than
asserted. It imports both catalogue modules, so tuning numbers interpolated from constants resolve,
and reports three numbers per language. Two decide: *wording changed*, and *removed keys whose text
does not survive anywhere in the new catalogue*. The third, removed and added key counts, is
structure and is informative only.

**The digest is a tripwire, not a lock.** It is re-set exclusively through the dated entry under
*Task-specific inputs*, which carries both digests, before and after. A silent rebasing is the one
move that makes the check worthless.

## Task-specific inputs

### Wording baseline — established 2026-08-26 (part 0)

Measured with `node scripts/wording-digest.mjs d9763883bb5e1a2d5433d33f4de1121bb9da0cf9`.

| | `de` | `en` | Keys |
| --- | --- | --- | --- |
| Before — base `d9763883` | `615d19739252f1f1` | `7fe8b50ef8b38992` | 2,639 |
| After — branch at `750dd16f` | `647925870381a286` | `3d83990115323c95` | 2,635 |

**Verdict: purely structural.** Both deciding numbers are zero in both languages: no key present in
both has a changed value, and no removed key lost its text.

**What moved.** Commit `84c16954` merged six keys into two, identically in both catalogues:

| Removed | Into |
| --- | --- |
| `form.hint.pre`, `form.hint.within`, `form.hint.post` | `form.hint` |
| `glacierpick.intro.a`, `glacierpick.intro.rigid`, `glacierpick.intro.b` | `glacierpick.intro` |

Each removed value still stands verbatim inside the value that replaced it, which is why the
surviving-text count is zero. The rendered sentence is character-identical: the three old fragments
joined by a space equal the new value with its `**` markers removed, in both languages, at both
sites.

**From `750dd16f` onward the two "after" digests must not move.** The earlier values recorded by
`zh-hans-plan` (`019f8bf9f0696e97`, `8c2e0d7828f244cb`) came from a different implementation and are
not reproducible by the script in this repository; the script here is the reference from now on.

### Wording baseline — re-established 2026-08-26, after taking dev

Measured with `node scripts/wording-digest.mjs origin/dev`. The branch has merged `origin/dev`
twice since the first entry, and dev moved the German and English wording both times, so the
baseline moves with it. That is the entry the rule asks for; it is not a silent rebasing.

| | `de` | `en` | Keys |
| --- | --- | --- | --- |
| Base — `origin/dev` | `4305f140ef6827c5` | `bba41bc71d4f4f30` | 2,664 |
| This branch | `a9320c064807749f` | `483e0a3c6bb77ea3` | 2,660 |

**Verdict: still purely structural.** Zero wording changes in either language, zero removed keys
whose text is lost. The four-key gap is the same merge as before: six fragment keys became two, and
every removed value still stands verbatim inside the value that replaced it.

**What dev changed and this branch answered.** `unlock.games` and `unlock.games.one` were retired
upstream in favour of `unlock.completedGames` and `unlock.completedRun`. The two new keys are
translated; the two retired ones are dropped from the Chinese catalogue rather than left to rot,
because a translation without a source is an orphan the parity guard rightly rejects.
`scripts/zh-add.mjs` now does that on its own and names each dropped key, instead of refusing to
write.

### Wording baseline — moved on purpose, 2026-08-26, with the owner's approval

**This is the first entry that records a real wording change, not a structural one.** The rule says
stop and report when the wording moves. It moved, it was reported, and the owner approved it, so it
is written down here rather than waved through.

| | `de` | `en` | Keys |
| --- | --- | --- | --- |
| Base — `origin/dev` | `a9320c064807749f` | `483e0a3c6bb77ea3` | 2,660 |
| This branch | `f91613773c8e3a10` | `483e0a3c6bb77ea3` | 2,660 |

English is untouched: those names were already English. What changed is that German and Spanish had
been carrying the English ones.

**The seven, in German:** Sunset Rider → Sonnenreiter, Malibu Wave → Malibu-Welle, Moonwhale →
Mondwal, Genesis → Ursprung, Ascension → Aufstieg, Eldritch → Tiefenschrecken, Insert Coin → Münze
einwerfen. Spanish got its own seven in the same pass. The German name lives in
`src/game/cosmetics.js`, not in the catalogue; `de.js` pulls it from that registry.

**Five names stayed** because there is nothing to translate in a coinage: Glazius, Voltaris, Pyrros,
Salar, Solfatara. **Biolumen is the one asymmetric case** and it is deliberate: it stays a coinage in
German, English and Spanish, whose readers can read Latin script, and is rendered as 生物荧光 in
Chinese, whose readers cannot.

**The rule is now enforced, not just stated.** The positive guard in `test/i18n-guards.test.js` knew
six descriptive cosmetic names and now knows thirteen. The class exemption above it is why this went
unnoticed for so long: it excuses every `cosmetic.*.name` from the must-differ rule, so nobody saw
that seven of them were English everywhere. It took the Chinese screenshot to surface it.

**And the check itself had a hole, which this change exposed.** `scripts/wording-digest.mjs` used to
splice the reference `de.js` next to the working modules and import it. That is sound only while the
catalogue's imports are unchanged — and the deck names come from `src/game/cosmetics.js`, so the
baseline read them out of the working tree and reported zero changes where seven had happened. The
tool now lays the reference out as a full detached worktree, exactly as the briefing's procedure
said, and removes it afterwards. **The earlier entries stand:** at those points nothing outside the
catalogue modules had moved, so the shortcut still measured the right thing.

### Measured inputs

| Input | Value | Kind |
| --- | --- | --- |
| Frozen source SHA of the sample order | `d9763883bb5e1a2d5433d33f4de1121bb9da0cf9` | measured, quoted back in the delivery |
| Sample | 115 strings, 10,552 German characters | measured (`zh-hans-plan`) |
| Catalogue on this branch | 2,635 keys per language, parity holds | measured, see baseline above |
| Chinese width against German | median x0.74 of the German em width | measured, `lieferung.md` §3 |
| Widest Chinese string | `privacy.sec.telemetry.body`, 207 em against 277 em German | measured, `lieferung.md` §3 |
| Strings that get wider or stay equal | 14 of 115, all of them short labels | measured, `lieferung.md` §3 |
| Ladder, micro family | `--text-micro-1..4` = 7 / 8 / 9 / 9.5 px, `src/index.css:99` | measured |
| Ladder, meta family | `--text-meta-1..4` = 10 / 10.5 / 11 / 11.5 px, `src/index.css:105` | measured |
| `:lang(` selectors in `src/index.css` | **0** — the whole language-scoped layer is new | measured |
| `@font-face` blocks in `src/index.css` | 5, from line 795 | measured |
| Fonts in the repository | 5 `woff2`, none of them Noto | measured, A4a |
| `uppercase` sites | 147 — 21 CSS rules, 124 utility uses | measured (`zh-hans-plan`) |
| Letter-spacing | 142 `tracking-*` utilities, 42 `letter-spacing` rules | measured (`zh-hans-plan`) |
| Roles carrying translatable text | `text-micro` 13 · `text-meta` 187 · `text-body` 126 · `text-body-lg` 50 · `text-title` 8 · `text-head` 2 · `text-figure` 0 | measured (`zh-hans-plan`) |

### The terminology is a working draft, not an external delivery

The 115 translations, the terminology list and the fit warnings in `lieferung.md` were produced in
this workstream, not returned by an external translator. That is enough to design against —
typography does not ask who wrote the characters — and it is **not** enough to bind the full order.
Wherever a document here says *the translator*, it means the external translator who will receive the
full 2,639-key order, not the origin of the text this branch designs against.

## Acceptance gate

> **No open typography question remains that would change what the translator writes.**

One criterion, and it is deliberately about the *translator*, not about the screens. A branch that
merely looks good still fails it if any of these is unanswered: how small text may go, whether a
description has to be shortened to fit, whether an eyebrow keeps its meaning without capitals, or how
a line may break.

It is met when the branch has been judged at a visual gate on **real Chinese text in the real
surfaces**, the ladder is settled rather than estimated, and every fit warning the translator
returned has an answer — either the layout takes it, or the full order carries a stated limit for
that string.

A package that goes out while one of those is open buys a translation that is paid for twice.

## Expected file surface

Indicative. Anything outside it is recorded and reported before it is changed.

**This task writes:**

- `docs/workstreams/zh-hans/zh-hans-sample/**` — contract, delivery, fixture, gate evidence
- `docs/design-sprache.md` — the CJK branch, appended in German (part 4)
- `src/index.css` — the `@font-face` block, the `:lang(zh-Hans)` rules, and the correction to the
  comment at `src/index.css:788` (part 3)
- `src/assets/fonts/noto-sans-sc/**` — the 101 slices (part 3, A4a)
- `index.html` — the pre-mount `lang` script (part 3, S1)
- the preview harness and its entry point, behind `VITE_PREVIEW` (part 2)
- `scripts/wording-digest.mjs` — already added, A6

**Must not change:**

- the **wording** of `src/i18n/de.js` and `src/i18n/en.js`, verified by A6's digest rather than by
  blob hash. Structural edits to those files are permitted; a changed visible string is not.
- `src/i18n/index.js` `LOCALES`, `CATALOGS`, `SEP`, `fmtNum`, `fmtPct`, and the formatters:
  `task/spanish-locale`
- `scripts/export-strings.mjs`, `test/i18n-guards.test.js`, `test/loc-csv.test.js`,
  `test/format.test.js`: same owner
- `docs/engineering/conventions.md`: the CJK branch changes role *values* under a language selector,
  never the rule above them
- any unqualified `--text-*` value or `.ty-*` rule: tripwire 1

## Known hazards

Numbered `S*` as in the worker briefing. The `Z*` numbers are the same hazards as recorded by
`zh-hans-plan`, kept here so the two documents can be read against each other.

| # | Hazard | State |
| --- | --- | --- |
| **S1** (Z1) | Pre-mount `lang`: `index.html:2` hardcodes `lang="de"` and `src/App.jsx:424` only sets it after React mounts. The frame before mount claims German, and a system fallback can render Japanese glyph forms in it. | **open** — part 3, `index.html` is in this surface |
| **S2** (Z2) | CJK line breaking has no spaces. `word-break`, `line-break` and `overflow-wrap` need review under `:lang(zh-Hans)`. Measured: `U+00AD` occurs zero times in `src/`, so the soft-hyphen clause of the original brief has no subject. | **open** — part 3 |
| **S3** (Z3) | `font-display: swap` on a large face is a visible reflow, not a flicker. Mitigated by A4's slicing; must still be checked on a cold first load. | **open** — part 3, cold-load check |
| **S4** (Z4) | The bottom of the ladder is below the Chinese legibility floor. A2 and A2a decide the values; the reflows they cause are the design round's real work. | **decided (A2, A2a), reflows open** — part 3 |
| **S5** (Z6) | Source-text ratchets read `src/**` as text. A purely cosmetic CSS change can turn the suite red without changing behaviour. Read the assertion before touching a guard, and never weaken one to get green. | **open** — every part touching `src/**` |
| **S6** | The eyebrows draw their hierarchy from four signals at once: uppercase, `letter-spacing: .14em`, 10 px and Geist Mono (`design-sprache.md` §6). In Chinese all four fail: uppercase does nothing, tracking is wrong, 10 px is under the floor, and Geist Mono has no CJK glyph at all. | **open, owner decision** — proposals to the gate, not decided by the worker (`AGENTS.md` — *Decision authority*) |
| **S7** (Z5) | The name filter does not carry for Hanzi. | **accepted, unsolved (A3)** |
| **S8** | Vendoring the slices adds roughly 4.5 MB of binaries to the branch, and the `unicode-range` values must come from the Google stylesheet rather than from memory. | **open** — part 3, A4a |

## Definition of done

- [x] The returned sample is committed as a fixture, with the terminology list and fit warnings, and
      the source SHA quoted back matches the one the order named
- [x] The real surfaces render the Chinese text behind `VITE_PREVIEW` — and, since the catalogue
      completed, through the ordinary language picker as well
- [x] The CJK branch is drafted: `@font-face` slices, `:lang(zh-Hans)` rules, ladder floors per A2
      and A2a
- [x] Visual gate run on real Chinese text, evidence in `gate/BEFUND.md` — device, browser, host,
      the eight surfaces, the numbers, and **what it did not cover** (`task-lifecycle.md` §7)
- [x] S6 answered by the owner at the gate, and written down (A8)
- [ ] Every fit warning answered: layout takes it, or the string gets a stated limit for the full order
- [ ] The branch is written into `docs/design-sprache.md`, in German, in that document's template
- [x] No rule fires outside `:lang(zh-Hans)` — verified by measurement, not assumed: on one DOM,
      switching only the lang attribute, tracking 0 against 1.3px and the ladder 13/12 against 11/9
- [~] The wording baseline: it MOVED once, deliberately and with the owner's approval, for the seven
      deck names. Recorded under *Task-specific inputs* with both digests. Not a tick and not a
      failure — an exception that is written down instead of waved through
- [x] Gates green and reported bare: `npm test`, `npm run lint -- --max-warnings=0`, `npm run build`,
      the preview build, `npm run gen:db`, `npm run loc:export`,
      `node scripts/check-preview-exclusion.mjs`
- [ ] Cold-load check done: `font-display: swap` with the sliced face causes no visible reflow (S3).
      Explicitly open: every gate image was taken AFTER `document.fonts.ready`, so none of them can
      speak to this

## Open questions

None blocking. Two were raised against this contract and both are now decided in it: the wording
baseline is pinned to this branch after the key merge (A6), and A2's floors are applied as floors
across the graded ladder with the collapse named as their consequence (A2a).

One item is a decision rather than a question: **S6 belongs to the owner and is answered at the
visual gate.** The worker prepares proposals and shows them in the harness; it does not settle them.
