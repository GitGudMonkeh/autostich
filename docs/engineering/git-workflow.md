# Git Workflow

Canonical Git model for Autostich. Applies to every agent and every human.

The short version lives in `AGENTS.md`. This document contains the operational details.

---

## 1. Permanent branch model

### Ancestry — the invariant

```text
main -> test -> dev
```

Every commit reachable from `main` must be reachable from `test`.

Every commit reachable from `test` must be reachable from `dev`.

`dev` is therefore the furthest-ahead permanent branch.

### Promotion — direction of travel

```text
task/feature work
       |
       v
      dev
       |
    --ff-only-->
       |
      test
       |
    --ff-only-->
       |
      main
```

Nothing is authored directly on `test` or `main`.

---

## 2. Branch purposes

| Branch | Purpose | Writers | Deployment |
| --- | --- | --- | --- |
| `main` | Production | nobody directly; promotion from `test` only | Pages root `/autostich/` |
| `test` | Acceptance testing | nobody directly; promotion from `dev` only | `/autostich/test/` |
| `dev` | Stable internal development / preview | feature integration only | `/autostich/pixi/` |
| `feature/*` | Cohesive feature or independent feature | one owner/integrator | CI only |
| `task/*` | One scoped worker task | one worker | CI only |
| `archive/*` | Frozen historical snapshots | nobody during normal development | only if explicitly configured |
| `gh-pages` | Generated deployment output | CI only | published Pages content |

`dev` is not the scratch branch.

Parallel implementation should happen on short-lived branches/worktrees below `dev`.

---

## 3. Choosing feature vs task branches

### Independent change

For a change that can be implemented, reviewed, and merged independently:

```text
dev
 |
 +-- feature/<short-topic>
```

Example:

```text
feature/controller-support
```

After validation:

```text
feature/controller-support
        |
        v
       dev
```

No integration branch is needed.

### Large feature with multiple workers

For one larger feature that should ship as a coherent unit:

```text
dev
 |
 +-- feature/main-game-screen-rework
        |
        +-- task/mgs-layout
        +-- task/mgs-playfield
        +-- task/mgs-controls
        +-- task/mgs-tests
```

Here:

- `feature/main-game-screen-rework` is the **feature integration branch**.
- Each `task/*` branch belongs to one worker.
- Workers integrate into the feature branch.
- The completed feature branch integrates into `dev`.

This avoids introducing a separate `integration/*` namespace unless a future use case genuinely needs one.

---

## 4. Branch creation

Always start from current remote state.

### Independent feature

```bash
git fetch origin
git switch -c feature/<topic> origin/dev
```

### Multi-agent feature integration branch

```bash
git fetch origin
git switch -c feature/<feature-name> origin/dev
```

Push it when it becomes durable/shared:

```bash
git push -u origin feature/<feature-name>
```

### Worker task under a feature

A worker task must branch from the current feature integration branch, not from stale `dev`.

Example:

```bash
git fetch origin
git switch -c task/mgs-layout origin/feature/main-game-screen-rework
```

If the feature branch exists only locally, establish the intended base explicitly before starting parallel workers.

---

## 5. Worktree ownership

The default model is:

> One active writer = one task = one branch = one worktree.

Example:

```text
task/mgs-layout
    |
    +-- worktree
          |
          +-- Claude session A: implementation
          +-- Claude session B: later review fixes
          +-- Claude session C: later debugging
```

Multiple **sequential sessions** may continue the same task/worktree.

Multiple simultaneous writers may not.

### Worktree lifetime

A worktree normally lives for approximately the lifetime of its task/PR.

Keep the same worktree for:

- implementation,
- normal bug fixes discovered during the task,
- review feedback,
- additional tests for the same task,
- debugging the same acceptance criteria.

Create a new task/worktree for a genuinely separate piece of work.

Do not turn one long-lived worker worktree into a miscellaneous sequence of unrelated tasks.

The main `dev` checkout is different: it is the stable repository/cockpit checkout, not a worker task workspace.

---

## 6. Creating a worktree

From the stable repository checkout:

```bash
git fetch origin
git worktree add ../Autostich-worktrees/<task-name> \
  -b task/<task-name> \
  origin/<base-branch>
```

Example:

```bash
git worktree add ../Autostich-worktrees/mgs-layout \
  -b task/mgs-layout \
  origin/feature/main-game-screen-rework
```

Then:

```bash
cd ../Autostich-worktrees/mgs-layout
npm ci
```

`node_modules/` is per-worktree.

A fresh worktree does not inherit dependencies from another checkout.

Do not trust test/lint results before `npm ci` has completed in the current worktree.

Nimbalyst may create/manage worktrees for us. The same ownership and lifecycle rules still apply.

---

## 7. Worker ownership

A worker owns exactly one scoped task branch/worktree.

A worker may:

- inspect repository code,
- modify files within task scope,
- run validation,
- make coherent commits,
- push its own branch when authorized,
- update its own work after review feedback,
- produce a handoff.

A worker must not:

- switch to another worker's branch,
- modify another worktree,
- merge sibling worker branches,
- rebase sibling worker branches,
- integrate the larger feature,
- push directly to `dev`,
- push directly to `test`,
- push directly to `main`,
- force-push shared branches without explicit authorization,
- perform unrelated cleanup/refactors.

If a worker needs substantial changes in another worker's owned scope, surface the collision rather than silently taking ownership.

---

## 8. Integrator ownership

For a multi-agent feature, the integrator owns:

```text
feature/<feature-name>
```

Example:

```text
feature/main-game-screen-rework
```

Workers own the `task/*` branches below it.

The integrator:

1. reads each task contract and handoff,
2. reviews the full worker diff,
3. determines dependency/integration order,
4. integrates one completed task at a time,
5. runs relevant validation after meaningful integrations,
6. resolves genuine cross-task integration conflicts,
7. sends implementation defects back to the owning worker where appropriate,
8. runs full feature validation,
9. integrates the finished feature into `dev`.

The integrator should not simultaneously implement large overlapping worker tasks directly on the feature branch.

The feature branch should remain a controlled integration target.

---

## 9. Reviewer ownership

Codex is currently used as an independent reviewer.

The reviewer:

- reads requirements,
- reads the relevant diff,
- identifies correctness/regression/architecture/testing risks,
- reports findings,
- does not implement by default.

Review does not replace automated gates.

Implementation defects normally return to the owning Claude worker.

Integration-level issues are coordinated by the Claude integrator.

---

## 10. Validation

Required project gates:

```bash
npm test
npm run lint -- --max-warnings=0
npm run build
npm run gen:db
```

When player-visible text changes:

```bash
npm run loc:export
```

Do not pipe validation commands unless the shell preserves failure propagation.

Bad:

```bash
npm test | tail -20
```

Prefer:

```bash
npm test
```

or explicitly use appropriate `pipefail` semantics.

---

## 11. Integrating worker tasks

Integrate workers deliberately, not simply in completion order.

Possible dependency order:

```text
foundation
   |
state/interfaces
   |
components
   |
controls
   |
polish
   |
feature tests
```

A worker branch may be integrated by the repository's chosen merge/PR strategy.

The strict linear-history requirement applies specifically to:

```text
dev -> test -> main
```

Worker/feature integration below `dev` may use normal merge commits when they improve traceability and preserve task boundaries.

Do not squash useful task history automatically merely for aesthetics.

---

## 12. Promotion — fast-forward only

Permanent-branch promotion is special.

### Before promotion

Refresh remote state:

```bash
git fetch origin
```

Verify ancestry:

```bash
git merge-base --is-ancestor origin/main origin/test
git merge-base --is-ancestor origin/test origin/dev
```

Both must succeed.

### Promote `dev` to `test`

Start from a clean local `test` branch.

```bash
git switch test
git merge --ff-only origin/test
git merge --ff-only origin/dev
git push origin test
```

The first merge ensures the local branch is caught up with the remote without introducing history.

### Promote `test` to `main`

```bash
git fetch origin
git switch main
git merge --ff-only origin/main
git merge --ff-only origin/test
git push origin main
```

### If `--ff-only` fails

Stop.

Do not remove the flag.

Do not create an ordinary merge commit as a quick fix.

The failure means the permanent-branch ancestry invariant has been broken.

Diagnose first.

---

## 13. Diagnosing ancestry problems

```bash
git fetch origin

git merge-base --is-ancestor origin/main origin/test
git merge-base --is-ancestor origin/test origin/dev
```

Find unique commits:

```bash
git log --oneline origin/dev..origin/test
git log --oneline origin/test..origin/dev
```

Find divergence:

```bash
git merge-base origin/test origin/dev
```

Visualize:

```bash
git log --graph --oneline --decorate --all -30
```

Compare content when needed:

```bash
git rev-parse origin/test^{tree}
git rev-parse origin/dev^{tree}
```

Equal tree hashes mean equal repository content, regardless of commit counts.

---

## 14. Forbidden permanent-branch promotion patterns

Do not use these for:

```text
dev -> test -> main
```

### Direct commits

Never author a quick fix directly on `test` or `main`.

Fix it upstream and promote it.

### Squash promotion

Do not squash `dev` into `test` or `test` into `main`.

A squash creates a new downstream commit without preserving upstream ancestry.

### Ordinary merge promotion

Do not create an ordinary/no-ff merge during permanent-branch promotion.

### Independent cherry-picks

Do not cherry-pick the same change separately onto `dev`, `test`, and `main`.

Promote the same history instead.

---

## 15. Deliberate ancestry reconciliation

If permanent ancestry is already broken but the downstream content is genuinely represented upstream, a reviewed history-only reconciliation may be appropriate.

One sanctioned example is:

```bash
git merge -s ours <downstream-branch>
```

This creates ancestry without importing the other tree.

This is exceptional maintenance, not a normal workflow.

Do not confuse:

```bash
-s ours
```

with:

```bash
-X ours
```

`-s ours` selects the `ours` merge strategy and discards the other tree entirely.

`-X ours` is only a conflict-resolution preference and still imports non-conflicting changes.

The documented worked example is:

```text
docs/workstreams/setup/branch-reconciliation-plan.md
```

---

## 16. Pushing and durable state

GitHub is the **durable source of truth**.

Local work is real, but other agents, CI, and other machines cannot rely on it until it is pushed.

Therefore:

- Important work must not live only in an agent conversation.
- Important code must not remain indefinitely as uncommitted local changes.
- Important commits should be pushed before switching machines or ending a meaningful work period.
- Task decisions belong in handoffs, PRs, workstream docs, or other durable repository artifacts when relevant.

Do not interpret this as permission for agents to push whenever they want.

Push only when the task/workflow authorizes it.

---

## 17. Switching machines

The repository defines the durable project state.

Before switching machines:

```text
validate relevant work
    ->
commit
    ->
push
    ->
update handoff / PR when relevant
```

On the other machine:

```text
git fetch / clone
    ->
restore required branch
    ->
recreate local worktree
    ->
npm ci
    ->
open/create Nimbalyst session
    ->
read AGENTS.md + workstream + task + handoff
    ->
continue
```

Worktrees and agent sessions are local execution state.

They do not need to synchronize between machines.

---

## 18. Windows / Linux and line endings

Primary development currently happens on Windows.

CI runs on Linux.

A Linux development laptop is also part of the intended environment.

### `.gitattributes`

`.gitattributes` is load-bearing.

Do not weaken it without understanding the consequences.

The repository intentionally controls LF behavior and file-specific exceptions.

This matters especially because source-text ratchet tests may match newline-sensitive patterns.

When local and CI behavior unexpectedly differ, inspect:

- line endings,
- case sensitivity,
- generated files,
- shell semantics,

before assuming a logic regression.

### Windows specifics

Git may use:

```text
core.ignorecase=true
core.symlinks=false
core.filemode=false
```

Case-only renames and symlinks can therefore behave differently from Linux.

Avoid introducing platform-sensitive behavior without testing it.

### Git Bash path conversion

On Windows Git Bash, Git arguments containing both `:` and `/`, such as:

```text
origin/test:path/to/file
```

may be path-converted by MSYS.

When required, use:

```bash
MSYS_NO_PATHCONV=1 git <command>
```

Document shell-specific commands explicitly.

---

## 19. Deployment considerations

Pushing permanent branches may trigger deployment.

Current conceptual deployment mapping:

```text
main -> production Pages root
test -> /autostich/test/
dev  -> /autostich/pixi/
```

The `dev` branch name changed while the existing preview URL intentionally remained `/pixi/`.

Deployment workflows share `gh-pages` publication infrastructure.

After merges involving deployment or `media/**`, check GitHub Actions rather than assuming every queued publish succeeded.

Feature/task branches run CI but do not publish application previews by default.

---

## 20. Cleanup

Cleanup is intentionally conservative.

### Inspect first

```bash
git worktree list
git status --porcelain
git fetch --prune
```

### Remove a completed worktree

Only after verifying that all valuable work is committed/pushed:

```bash
git worktree remove <path>
```

Git refuses to remove a dirty worktree by default.

Treat that refusal as a safety feature.

### Prune stale records

```bash
git worktree prune
```

### Delete a local branch

Prefer:

```bash
git branch -d <branch>
```

`-d` refuses when commits appear unmerged.

Investigate instead of immediately replacing it with:

```bash
git branch -D
```

### Delete a remote task branch

Requires explicit approval.

Before proposing deletion:

```bash
git fetch origin
git log --oneline origin/dev..origin/<branch>
```

For a task merged through a feature integration branch, compare against that correct integration base as well.

Only then, when authorized:

```bash
git push origin --delete <branch>
```

Never independently delete or rewrite:

- `main`
- `test`
- `dev`
- `archive/*`
- `gh-pages`

---

## 21. Commit messages

New commit messages are English.

Existing conventional prefixes are appropriate:

```text
feat:
fix:
docs:
chore:
refactor:
test:
```

Write what changed and, when it is not obvious from the diff, why.

Good:

```text
fix: preserve keyboard focus after perk selection
```

Better when rationale matters:

```text
fix: keep preview deployment path stable after dev rename

The branch changed from Autostich/pixi to dev, but /pixi/ remains the existing
isolated preview namespace and localStorage boundary.
```

Do not open pull requests unless explicitly requested.

---

## 22. Quick decision guide

### Same task, more fixes/review feedback?

Use the **same branch/worktree**.

### Same task, old agent context is messy?

Start a **fresh sequential session in the same worktree**.

### Separate independently mergeable change?

Create a **new branch/worktree**.

### Several tasks form one larger feature?

Create:

```text
feature/<feature>
```

plus:

```text
task/<feature>-<task>
```

worker branches/worktrees below it.

### Several tasks all need heavy edits to the same hotspot file?

Do not parallelize them.

Serialize the work or establish a foundation/interface first.

### Feature ready?

Integrate it into `dev`, validate, then use the promotion pipeline:

```text
dev --ff-only-> test --ff-only-> main
```
