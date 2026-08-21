# AGENTS.md — Autostich

Canonical, vendor-neutral instructions for every coding agent working in this repository
(Claude Code, Codex, and any future agent).

**This file is the canonical source of current agent instructions.**
If older instruction text elsewhere in the repository conflicts with this file, follow `AGENTS.md`.

Read this file first. Then read only the deeper document your task actually needs — see the routing
table at the end.

---

## Project at a glance

- **Autostich** — a roguelite auto-battler card game with German and English product UI.
- **Stack:** Vite + React 18 + Pixi.js. Tailwind v4 via the Vite plugin (no `tailwind.config`).
- **Package manager:** npm only (`package-lock.json`). No yarn, no pnpm.
- **Node:** `^20 || ^22 || >=24`. CI pins Node 22.
- **Deploy:** GitHub Pages under `/autostich/`, published through GitHub Actions to `gh-pages`.
- **Layout:**
  - `src/game/` — game/domain logic, no React
  - `src/ui/` — React UI and visual/effect layers
  - `src/i18n/` — German and English localization catalogs
  - `test/` — Vitest
  - `sim/` — balance simulation tooling

---

## Roles and source of truth

| Concern | Rule |
| --- | --- |
| Durable source of truth | **GitHub.** Important work must not live only in a local worktree, terminal, Nimbalyst session, Claude session, or Codex session. |
| Local cockpit | **Nimbalyst** — session orchestration, workstream visibility, review context, local Git/worktree management. |
| Implementation | **Claude Code** workers. |
| Integration | **Claude Code** feature integrator. |
| Review | **Codex** is initially used as an independent reviewer only; it does not implement. |
| Concurrency | **One simultaneous writer per worktree.** Never run two writing agents in the same worktree at the same time. |

A task is not complete merely because code exists locally.

Durable work must eventually be:

1. validated,
2. committed,
3. pushed,
4. represented in the relevant handoff / PR / workstream documentation when applicable.

---

## Branch model

### Ancestry — permanent invariant

```text
main -> test -> dev
```

Every commit reachable from `main` must be reachable from `test`.
Every commit reachable from `test` must be reachable from `dev`.
`dev` is therefore the furthest-ahead permanent branch.

Verify when needed:

```bash
git merge-base --is-ancestor origin/main origin/test
git merge-base --is-ancestor origin/test origin/dev
```

Both commands must exit successfully.

### Promotion — direction of travel

```text
feature/task -> dev --ff-only-> test --ff-only-> main
```

Canonical promotion commands:

```bash
git checkout test
git merge --ff-only dev
```

then:

```bash
git checkout main
git merge --ff-only test
```

### Branch rules

1. **Feature and task work branches from `dev`** and integrates back into `dev`.
2. **Promotion is fast-forward only.**
   `--ff-only` is the enforcement mechanism. `If ancestry is broken, promotion must fail loudly.`
3. **No direct commits on `test` or `main`.**
   They are promotion branches, not authoring branches.
4. **Do not use squash merges or ordinary merge commits for `dev -> test -> main` promotion.**
   That creates downstream commits that upstream does not contain and breaks the ancestry invariant.
5. **Do not independently cherry-pick or rebase the same change onto several permanent branches.**
   Promote the same commit history forward.
6. **Do not use commit counts as proof that branches are equivalent.**
   Compare ancestry and, when content equivalence matters, tree hashes:

```bash
   git rev-parse <branch>^{tree}
```

Detailed Git/worktree rules:
`docs/engineering/git-workflow.md`

---

## Before you start

For a normal implementation task:

```bash
git fetch origin
git rev-parse --abbrev-ref HEAD
```

Confirm that you are in the intended branch/worktree before editing.

For every fresh worktree:

```bash
npm ci
```

`node_modules/` is per-worktree and is not shared.
Until `npm ci` has run in the current worktree, test/lint failures may simply indicate missing
dependencies rather than an implementation defect.

---

## Validation gates

Required local gates for implementation/integration work:

```bash
npm test
npm run lint -- --max-warnings=0
npm run build
npm run gen:db
```

Run them in that order unless the task explicitly requires a narrower iterative check first.
The CI/deployment workflows enforce the corresponding project checks, but the exact workflow differs
by branch.

### Important shell rule

**Never pipe a gate command unless failure propagation is preserved.**

Bad:

```bash
npm test | tail -20
```

A failing test run can appear successful because the shell reports the exit code of the final pipe
stage.

Prefer bare commands:

```bash
npm test
```

or explicitly enable pipe failure handling when appropriate:

```bash
set -o pipefail
```

Never report a gate as passing unless the real command completed successfully.

### Additional localization gate

When player-visible text changes:

```bash
npm run loc:export
```

The generated localization exports are validated by tests. A catalog change without regeneration can
make CI fail even when the underlying UI code is otherwise correct.

---

## Hazard: source-text ratchet tests

**This is the most important repository-specific testing hazard.**

A substantial part of the test suite verifies UI wiring by reading `src/**` as raw text and matching
class names, constants, JSX structures, imports, or other literal patterns.

Consequences:

- A purely cosmetic refactor can turn tests red without changing runtime behavior.
- Reflowing JSX, renaming a class, moving a constant, or changing a comment can invalidate a ratchet.
- Some guards have historically matched their own explanatory comments.
- A green suite does not prove visual/UI correctness.
- A red ratchet does not automatically prove a behavior regression.

When a ratchet fails:

1. read the exact assertion,
2. determine whether behavior changed or only source spelling/structure changed,
3. inspect the underlying invariant,
4. update the guard only if the guard is genuinely wrong.

**Never weaken or delete a guard merely to make CI green.**

Project preference:

- guards should verify meaningful relationships where possible,
- guards should avoid matching their own comments,
- important guards should be counter-checked by deliberately breaking the protected seam and proving
  the guard fails.

More detail:
`docs/engineering/testing.md`

---

## Language policy

There are three language layers.

| Layer | Language |
| --- | --- |
| Engineering | **English** |
| Product UI | **German + English**, through localization |
| Historical engineering records | Preserve as written, including German |

### Engineering language

All **new** engineering/code-side material should be English, including:

- `AGENTS.md`
- the thin `CLAUDE.md` adapter
- `docs/engineering/**`
- `docs/workstreams/**`
- architecture and technical documentation
- new code comments
- agent roles and workflows
- task contracts
- handoffs
- review notes
- commit messages
- PR descriptions
- new test names/descriptions where practical

### Code identifiers

Code identifiers remain English.

### Product UI

Player-visible text must continue to support **German and English** through the localization system.
Do not hard-code player-facing strings in JSX when they belong in the i18n catalogs.

This includes, where player-visible:

- text content
- `title`
- `aria-label`
- `placeholder`
- `alt`

Use:

- `src/i18n/de.js`
- `src/i18n/en.js`

and existing localization conventions.

Player-facing terminology should follow the established localization reference material rather than
inventing synonyms for already-defined terms.

Relevant docs:

- `docs/localization/i18n.md`
- `docs/text-style-guide.md`

### Existing historical German material

Do not mass-translate existing German code comments or historical engineering records.
New English comments may coexist with older German comments.
Avoid large translation-only diffs, especially in files covered by source-text ratchet tests.

### Appending to an existing German document

One narrow exception to the engineering-English rule above.

An entry **appended to an existing German document that follows a fixed German template** stays in
that document's language, and the deviation is noted where it is made. A single English entry in the
middle of such a list breaks the template the rest of the file depends on, which costs more than the
language consistency gains.

This is an exception for appending to legacy documents, not a general licence.

---

## Platform: Windows development, Linux CI

Current primary development is Windows.
CI runs on Linux.
A Linux development laptop is also part of the intended setup.
Assume the repository must remain usable on both Windows and Linux.

### `.gitattributes`

**`.gitattributes` is load-bearing. Do not weaken it casually.**

It controls line-ending behavior and specific file exceptions.
Changing it can create platform-specific failures, especially for source-text tests that expect LF.

When CI and local results disagree unexpectedly, check:

- line endings,
- case sensitivity,
- shell behavior,
- generated files,

before assuming a logic regression.

### Portable tooling

Prefer:

- `node:path`
- `fileURLToPath`
- repository-relative paths

Avoid:

- hard-coded drive letters,
- hard-coded `/home/...` paths,
- platform-specific path separators,
- shell assumptions that are not documented.

If a documented command depends on a shell, state which shell.
GitHub Actions uses Linux/bash semantics.

Machine setup:
`docs/engineering/NEW_MACHINE_SETUP.md`

---

## Worktree and agent ownership

The core rule is:

> One active writer = one task = one branch = one worktree.

A task may use several **sequential** agent sessions in the same worktree.

Allowed:

```text
task/mgs-layout
  Claude session A -> implementation
  Claude session B -> later review fixes
  Claude session C -> later debugging
```

Not allowed:

```text
same worktree
  Claude session A \
  Claude session B  > writing simultaneously
  Claude session C /
```

Workers must not:

- switch to another worker's branch,
- edit another worktree,
- merge sibling branches,
- rebase sibling branches,
- push directly to `main`,
- push directly to `test`,
- force-push shared branches without explicit approval,
- perform unrelated cleanup/refactors.

Cross-task collisions must be surfaced rather than silently resolved.

Full lifecycle:
`docs/engineering/git-workflow.md`

---

## House rules

- **No new icons or glyphs** that are not already part of the established system without asking first.
- **Do not open pull requests unless explicitly requested.**
- **Do not commit or push unless the task/workflow explicitly authorizes it.**
- **Do not weaken tests simply to achieve green CI.**
- **Do not rewrite shared history on your own initiative.**
- **Do not delete branches/worktrees containing uncommitted or unpushed work.**
- **Do not restate volatile counts in durable documentation.**
  Prefer “run `npm test` for the current result” over hard-coded test counts.
- **Match surrounding code style.**
  There is currently no formatter enforcing style automatically.
- **Report uncertainty honestly.** Distinguish:
  - measured,
  - observed,
  - inferred,
  - proposed.
- Never claim a gate ran if it did not.
- Never describe planned work as completed.

---

## Routing table

Read deeper documentation only when the current task needs it.

| If your task involves… | Read |
| --- | --- |
| Branching, worktrees, promotion, integration, cleanup | `docs/engineering/git-workflow.md` |
| Writing/fixing tests or diagnosing a confusing red suite | `docs/engineering/testing.md` |
| Code layout, build structure, bundling, media strategy | `docs/engineering/architecture.md` |
| UI/design engineering conventions, i18n, naming | `docs/engineering/conventions.md` |
| Worker / integrator / reviewer responsibilities | `docs/engineering/git-workflow.md` §7–§9 |
| Task tiers, task contract, evidence, visual review, handoff, cleanup timing | `docs/engineering/task-lifecycle.md` |
| Setting up a development machine | `docs/engineering/NEW_MACHINE_SETUP.md` |
| Player-visible text and translation | `docs/localization/i18n.md`, `docs/text-style-guide.md` |
| Why an existing system was built a certain way | `docs/decisions/` — start at `docs/decisions/README.md` |
| Current multi-agent setup work | `docs/workstreams/setup/` |

If a referenced document is missing:

- do not invent its contents,
- fall back to `AGENTS.md`,
- inspect the current code/tests/configuration,
- state any uncertainty.

---

## Historical engineering log

Historical engineering records live in:

```text
docs/decisions/
```

Start at `docs/decisions/README.md`. The main log is
`docs/decisions/engineering-log-2026-08.md` — dated `#tag` records, measurements, rejected
approaches, traps, and implementation rationale.

Read them on demand only:

- do not read the entire log by default,
- search only when the task needs historical context,
- treat it as context, not current instruction,
- treat branch/test-count/current-state claims inside it as historical,
- follow explicit status markers — `SUPERSEDED IN PART`, `REFUTED`, `CORRECTED`,
- an entry without a status marker is not thereby current,
- where status is unclear, verify the claim against current code and current documentation.

`AGENTS.md` and `docs/engineering/` remain the sources for current rules.

Example targeted search:

```bash
grep -n "#perf-dpr" docs/decisions/engineering-log-2026-08.md
```
