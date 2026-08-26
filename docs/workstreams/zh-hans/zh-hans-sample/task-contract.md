# Task contract — zh-hans-sample

Tier **C**. It hangs under the `feature/zh-hans` integration branch, alongside `task/zh-hans-plan`
(`task-lifecycle.md` — *Tier C*, `git-workflow.md` — *Multi-agent feature integration branch*).

Scaffold produced by `/create-task`; Scope, Non-goals, Acceptance gate and Definition of done were
supplied by the owner. The remaining `TODO` sections are still decisions, not formatting gaps.

## Identity

| Field | Value |
| --- | --- |
| Branch | `task/zh-hans-sample` |
| Base | `feature/zh-hans` @ `d9763883bb5e1a2d5433d33f4de1121bb9da0cf9` |
| Owner | Repository owner (GitGudMonkeh) — supplied Scope, Non-goals, Acceptance gate and Definition of done |
| Integrator | TODO — assign before integration (`AGENTS.md` — *Roles and source of truth*) |
| Concurrency | one writer; sequential sessions may continue the task in the same worktree |

No reviewer row: no independent review was requested at setup. Review is optional and risk-based
(`AGENTS.md` — *Independent review*).

The base is durable. Unlike at `task/zh-hans-plan` setup time, `origin/feature/zh-hans` now exists on
the remote and points at this exact SHA, which is also the source commit the sample order quotes.

## Local workspace

| Field | Value |
| --- | --- |
| Worktree | `C:/Code/Autostich-worktrees/zh-hans-sample` |
| Branch checked out there | `task/zh-hans-sample` |
| Upstream | none — the branch deliberately does not track its base |
| Preview port | 5198 |
| Preview URL | http://localhost:5198 |
| Server invocation | `npm run dev -- --port 5198 --strictPort` |

**Note on the port.** `create-task` step 8 allocates the lowest free integer from 5181 upward across
the reserved table in `NEW_MACHINE_SETUP.md` (5173, 5180) and
`grep -rn "Preview port" docs/workstreams`. Run in the cockpit checkout that grep sees only up to
5189, because the ledger is per-branch while the ports are not. Measured across the unmerged
branches: `task/spanish-locale` records up to 5196 and `task/zh-hans-plan` records 5197. 5198 was
allocated instead of the cockpit-only answer, and the deviation is recorded here rather than left to
surface as a `--strictPort` failure. This repeats the deviation `task/zh-hans-plan` already
documented under Z7; the allocation algorithm has a known blind spot across branches.

## Scope

Four parts, in this order. The task **starts blocked**: part 1 has no input until the sample order
returns from the translator.

1. **Land the returned sample as a fixture.** The filled `zh-Hans` column from
   `docs/workstreams/zh-hans/zh-hans-plan/sample-order.csv`, committed as evidence, plus the
   translator's terminology list and their fit warnings.

   **It is a fixture, not a locale.** 115 of 2,639 keys is not a catalogue, and registering a partial
   one would either break catalogue parity or force the seam that `task/spanish-locale` owns. Nothing
   in `src/i18n/**` is registered by this task.

2. **A harness that renders the sample in the real surfaces.** The design round has to be judged
   where the text actually sits — the eyebrow above its readout, the description in its panel, the
   tutorial lesson in its column — not in a specimen sheet. Behind the existing `VITE_PREVIEW` gate,
   so nothing reaches production.

3. **Draft the CJK branch against that text.** The `@font-face` block for the self-hosted Noto Sans
   SC slices, the `:lang(zh-Hans)` rules, and the size-ladder values fixed in *Approved architecture*
   A2 of `zh-hans-plan`. Iterate on what the harness shows.

4. **Close it with a visual gate, then write it down.** The gate is the deliverable, not a formality.
   Only after it passes does the branch go into `docs/design-sprache.md` — in German, appended to
   that document's fixed template (`AGENTS.md` — *Appending to an existing German document*).

## Non-goals and tripwire

| Non-goal | Why |
| --- | --- |
| Translating anything | Translation is external, and this task's whole point is that the text arrives before the design. |
| The full 2,639-key order | It goes out after this round closes, from `zh-hans-plan` part 5. |
| Registering `zh-Hans` as a selectable language | Depends on the N-language seam, which `task/spanish-locale` owns. |
| Changing German or English wording | Both text passes closed recently. |
| Changing Latin typography | The CJK branch stands beside it, never in its place. |
| A profanity filter for Hanzi | Deliberately unsolved in round 1 (`zh-hans-plan` A3), with its consequence already named. |

**Tripwire 1 — the language boundary.** If a rule the branch adds also fires under `lang="de"` or
`lang="en"`, stop. Verifiable at a glance: every added rule sits inside a `:lang(zh-Hans)` selector,
and the diff shows no edit to an unqualified `--text-*` value or `.ty-*` rule. This is where the
Latin typography that was just unified gets lost quietly.

**Tripwire 2 — a size at a call site.** If the fix for a tight surface is a number in the JSX rather
than a role value under the language selector, stop. `conventions.md`: *a menu picks a role, or
changes a role for everyone; a menu does not introduce a size.* A Chinese one-off is the same mistake
in a different language.

**Tripwire 3 — the seam.** If the diff starts editing `src/i18n/index.js` `LOCALES`/`CATALOGS`, the
formatters, `scripts/export-strings.mjs` or `test/i18n-guards.test.js`, stop. Those belong to
`task/spanish-locale`.

**Tripwire 4 — designing without the text.** If part 3 starts before part 1 has landed real Chinese
strings, stop. Designing CJK typography against Latin placeholder text is the circle this whole round
exists to break, and it produces a branch that looks settled and is not.

## Approved architecture

TODO — binding statements for this task. `zh-hans-plan` A1–A5 bind their own branch; name here which
of them this task inherits verbatim and which it restates.

## Task-specific inputs

TODO — name the inputs the work is measured against. `zh-hans-plan` carries a measured table that
this task can inherit or supersede.

## Acceptance gate

> **No open typography question remains that would change what the translator writes.**

One criterion, and it is deliberately about the *translator*, not about the screens. A branch that
merely looks good still fails it if any of these is unanswered: how small text may go, whether a
description has to be shortened to fit, whether an eyebrow keeps its meaning without capitals, or how
a line may break.

It is met when the branch has been judged at a visual gate on **real Chinese text in the real
surfaces**, the size ladder is settled rather than estimated, and every fit warning the translator
returned has an answer — either the layout takes it, or the full order carries a stated limit for
that string.

A package that goes out while one of those is open buys a translation that is paid for twice.

## Expected file surface

TODO — the indicative file list, and the must-not-change files named explicitly so scope compliance is
verifiable by blob hash (`task-lifecycle.md` — *The task contract*). See *Open questions*: this
branch has already changed two files that `zh-hans-plan` puts on its own must-not-change list.

## Known hazards

TODO — each hazard must be resolved before handoff (`task-lifecycle.md` §10). `zh-hans-plan` carries
Z1–Z8; name which of them this task owns.

## Definition of done

- [ ] The returned sample is committed as a fixture, with the translator's terminology list and fit
      warnings, and the source SHA they quoted back matches the one the order named
- [ ] The preview harness renders the sample in the real surfaces, behind `VITE_PREVIEW`
- [ ] The CJK branch is drafted: `@font-face` slices, `:lang(zh-Hans)` rules, ladder values per
      `zh-hans-plan` A2
- [ ] Visual gate passed on real Chinese text, with its evidence recorded — screens, host, browser,
      and **what it did not cover** (`task-lifecycle.md` §7)
- [ ] Every fit warning answered: layout takes it, or the string gets a stated limit for the full order
- [ ] The branch is written into `docs/design-sprache.md`, in German, in that document's template
- [ ] No rule fires outside `:lang(zh-Hans)` — verified, not assumed
- [ ] Nothing on the must-not-change list altered, verified by blob hash
- [ ] Gates green and reported bare: `npm test`, `npm run lint -- --max-warnings=0`, `npm run build`,
      the preview build, `npm run gen:db`, `npm run loc:export`
- [ ] Cold-load check done: `font-display: swap` with the sliced face causes no visible reflow (Z3)

## Open questions

TODO — the owner's call on the four contradictions the contract-versus-`zh-hans-plan` check surfaced.
They are recorded in `lieferung.md` §7 rather than decided here, because each one is a scope or
ownership decision.
