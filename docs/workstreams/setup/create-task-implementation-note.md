# Implementation Note — `/create-task`

Written 2026-08-21, before implementation. Scope: **`/create-task` only.** `/prepare-review` is
approved but deliberately not started.

Design source: `command-layer-design.md` §2.1, §3, §4, §5, and its implementation order §6 step 2.
Precedent: `cleanup-task-implementation-note.md` and `.claude/commands/cleanup-task.md`.

Rules remain in `AGENTS.md`, `docs/engineering/task-lifecycle.md` and
`docs/engineering/git-workflow.md`. This note records **how the command is built**, not what the
process is.

---

## 1. Command file structure

One file: `.claude/commands/create-task.md`, project-scoped and committed.

**Frontmatter**

| Field | Value | Why |
| --- | --- | --- |
| `description` | one line | shown in `/help` |
| `argument-hint` | `<task-slug> <A\ | B\ | C> [--base <branch>] [--feature <branch>] [--pixels]` | design §3 |
| `allowed-tools` | see §2 | narrowest set that still performs a class-2 setup |
| `disable-model-invocation` | `true` | a command that creates branches and worktrees must fire only when a human types it |

`model` deliberately unset — inherit the session model.

**Body — steps in fixed order.** The ordering principle is design §2.1 *Safety boundaries*: every
check that can fail cheaply runs before any state is created.

| Step | Does | Class |
| --- | --- | --- |
| — | Preamble: posture, cited rules, prohibition list | — |
| 1 | Parses arguments; **stops** if the tier is missing or not `A`/`B`/`C` | — |
| 2 | Runs the cleanup audit **by reference** to `.claude/commands/cleanup-task.md` | 0 |
| 3 | Cockpit detection — `--git-dir` vs `--git-common-dir` | 0 |
| 4 | Ancestry: `main`→`test`, `test`→`dev`; **abort** on failure | 0 |
| 5 | Base resolution to a **SHA** | 0 |
| 6 | Derives branch, worktree and contract paths | — |
| 7 | Collision checks: local branch, remote branch, worktree path, branch already checked out | 0 |
| 8 | Port allocation | 0 |
| 9 | Prints the derived-field table — the last moment before anything exists | — |
| 10 | `git worktree add` at the resolved SHA | 2 |
| 11 | Scaffold: Tier A prints, Tier B/C writes one file at a path that does not exist | 1 |
| 12 | `npm --prefix <worktree> ci` | 2 |
| 13 | V1 baseline prompt, only with `--pixels` | — |
| 14 | Output, outcome, and what a human must do next | — |

**There is no separate fetch step.** The audit's own step 1 runs `git fetch origin`, so step 2
satisfies the freshness requirement for steps 4–8. The command re-fetches explicitly only if the
audit could not run, and says so.

**Why the scaffold is written before `npm ci` (step 11 before step 12).** `npm ci` is the longest and
most failure-prone step, and its failure must not cost the contract. Design §2.1 already fixes that a
failed `npm ci` leaves the worktree standing; writing the contract first means it also leaves the
contract standing.

The body is written as directives to Claude, not as prose describing the command to a user
(design §5.2).

---

## 2. Allowed tools

```text
Bash(git fetch origin:*), Bash(git rev-parse:*), Bash(git merge-base:*),
Bash(git for-each-ref:*), Bash(git ls-remote:*), Bash(git rev-list:*),
Bash(git worktree list:*), Bash(git worktree add:*),
Bash(git log:*), Bash(git status:*), Bash(git -C:*),
Bash(npm --prefix:*),
Read, Grep, Glob, Write
```

**`git branch` is absent, deliberately.** `Bash(git branch:*)` is a prefix rule and would therefore
also permit `git branch -d` and `git branch -D`. The command never needs it: `git worktree add -b`
is the only branch-creating form it uses, and it has no destructive spelling.

**`git worktree add` is allowed; `git worktree remove` is not.** Prefix scoping separates them
cleanly, so the class-3 ceiling is expressible in the allowlist here — unlike in `/cleanup-task`.

**`Write` but no `Edit`.** The command creates one file at a path that does not exist and never
modifies an existing one. Absence of `Edit` is what makes "never overwrites" checkable from the
frontmatter rather than only from the body.

**Three entries the allowlist cannot scope safely, stated plainly** (same posture as
`cleanup-task-implementation-note.md` §2):

- `Bash(git fetch origin:*)` also permits `git fetch origin --prune`.
- `Bash(git -C:*)` permits **any** git subcommand in another worktree, including destructive ones.
  It is required by the step-2 audit, which measures per-worktree cleanliness with
  `git -C <path> status --porcelain`.
- `Bash(npm --prefix:*)` also permits `npm --prefix <path> publish`.

So the allowlist is a first line of defence, **not the control.** The control is the prohibition list
in the command body plus `disable-model-invocation: true`, which means a human is present and
watching every call.

**`npm --prefix <worktree> ci` — measured, not assumed.** The obvious alternative, `cd <worktree> &&
npm ci`, cannot be prefix-scoped in` allowed-tools`.` --prefix` was verified to resolve the *prefix*
project rather than the working directory: run from the cockpit with `--prefix` pointing at a
throwaway empty package, `npm ci --dry-run` reported `up to date` instead of Autostich's dependency
set. *Measured 2026-08-21.*

---

## 3. Derived values, and where each is derived from

Everything in this table has exactly one correct answer, which is why the command may compute it.
Anything not in this table is a heading with `TODO — <what is needed>` beneath it.

| Value | Derivation | Cited rule |
| --- | --- | --- |
| Branch name, Tier A/B | `feature/<task-slug>` off `origin/dev` | `git-workflow.md` — *Choosing feature vs task branches*, **Independent change** |
| Branch name, Tier C | `task/<task-slug>` off the feature integration branch | same document — **Large feature with multiple workers**; `task-lifecycle.md` — *Tier C* |
| Base SHA | `git rev-parse origin/<base>`, written as a SHA | `task-lifecycle.md` — *The task contract*, Identity |
| Worktree path | `<repo-parent>/Autostich-worktrees/<task-slug>` | `NEW_MACHINE_SETUP.md` — *Per-worktree setup* |
| Preview port | lowest free from 5181 up, minus reserved and minus every recorded `Preview port` | `NEW_MACHINE_SETUP.md` — *Preview server and ports* |
| Server invocation | `npm run dev -- --port <port> --strictPort` | same section — `--strictPort` mandatory |
| Concurrency rule | one writer; sequential sessions allowed | `AGENTS.md` — *Worktree and agent ownership* |
| Contract section headings | the names in `task-lifecycle.md` — *The task contract* | design §3, coupling rule 1 |

**Three readings that are derived rather than quoted. Flagged because they are judgements, and a
judgement inside an automated command should be visible.**

1. **Tier A and B get `feature/*`, not `task/*`.** `task-lifecycle.md` — *Choosing a tier* gives the
   branch shape as "one branch off `dev`" for A and B, and names `feature/*` with `task/*` below it
   only for C. `git-workflow.md` — *Choosing feature vs task branches* routes an independently
   mergeable change to `feature/<short-topic>` and reserves `task/*` for a worker task under a
   feature integration branch. The two read together give the rule above. *Inferred.* Note that
   `task/viewport-harness` in this repository is a standalone `task/*` branch and therefore does not
   follow it; it predates the current wording.
2. **Tier C requires `--feature`, and does not create it.** If `--feature` is absent, or names a
   branch that resolves neither locally nor on the remote, the command **stops and asks** and prints
   the exact `git switch -c` command from `git-workflow.md`. It does not create the integration
   branch itself. Creating a shared integration base as a side effect of task setup is exactly what
   *"establish the intended base explicitly before starting parallel workers"* warns against, and
   design §2.1 lists a single branch as the command's output. *Derived from design §2.1 + rule.*
3. **Tier C contract path is `docs/workstreams/<feature-slug>/<task-slug>/task-contract.md`.**
   Tier C has one contract per task, so the Tier B path `docs/workstreams/<slug>/task-contract.md`
   cannot hold two. The filename stays `task-contract.md` rather than becoming
   `<slug>-task-contract.md` because `/cleanup-task` step 5 locates a branch's base by searching
   `docs/workstreams/**/task-contract.md`; a renamed file would silently drop every Tier C branch
   into `base unknown — not assessed`. *Derived, and the coupling is the reason.*

**Contract headings carry no numbers.** `task-lifecycle.md` — *The task contract* requires
name-based reference because a numeric citation goes stale silently, and design §3 makes that a
coupling rule with `/prepare-review`. The existing viewport-harness contract numbers its headings;
new scaffolds do not. *Deliberate deviation from the specimen.*

---

## 4. Safety checks

Encoded in the body, in this order of authority:

1. **Class ceiling 2** (design §4). Class 3 is unreachable: no push, no upstream, no PR, no merge,
   no promotion, no delete, no force flag, in any form, executed or implied as executable.
2. **Cockpit only.** `git rev-parse --path-format=absolute --git-dir --git-common-dir` returns two
   equal paths in the cockpit and two different ones inside a linked worktree — *measured on this
   host, both cases.* Different → **abort.** Creating a worktree from inside another worker's
   worktree is the first step toward two writers.
3. **Never overwrites, never appends a suffix.** Four collision checks, all before step 10: local
   branch exists, remote branch exists, worktree path exists on disk, branch already checked out in
   some worktree. Any one → **stop and ask**, naming which collided.
4. **Ancestry is a hard abort**, never a warning. Repair is a deliberate procedure
   (`git-workflow.md` — *Deliberate ancestry reconciliation*), never a side effect of task setup.
5. **The tier is given, never guessed.** Missing or unrecognized → stop and ask. A Tier B scaffold on
   a Tier A task manufactures ceremony; the reverse silently removes a review gate.
6. **No auto-rollback.** A failed `npm ci` leaves the worktree and the contract in place and prints
   how to finish by hand. Rolling back means removing a worktree, which is class 3.
7. **No invented scope.** Only the §3 table is filled. Every other section is a heading followed by
   `TODO — <what is needed>`. A pre-filled non-goals list reads as a decision nobody made.
8. **The audit does not gate creation.** Step 2 is informational and read-only; a dirty repository
   state is reported, not treated as a blocker. Making setup fail on an unrelated stale branch would
   train the operator to skip the audit.
9. **Writing into the new worktree is the one write outside the current one, and it is bounded.**
   Design §4 invariant 1 has a command refuse to write outside the worktree it stands in. The
   exception is inherent to this command's job, and it is safe for a specific reason: the target
   worktree was created seconds earlier by this command and has no other writer by construction. It
   never writes into any other existing worktree.
10. **The audit is referenced, never copied.** Step 2 reads `.claude/commands/cleanup-task.md` and
    follows it. Design §6 step 2 requires exactly this — a second copy of the deletion-safety logic
    is the failure it names.

**Windows / Git Bash.** `git worktree add` is given the **relative** path
`../Autostich-worktrees/<slug>`, following `git-workflow.md` — *Creating a worktree*. That avoids a
drive-letter argument entirely; the absolute path recorded in the contract is read back with
`git -C <path> rev-parse --show-toplevel` afterwards. No `revision:path` argument is used, so the
`MSYS_NO_PATHCONV=1` prefix from `CLAUDE.md` does not arise — if a future edit introduces one, that
rule applies.

---

## 5. Expected first test

Not yet run. The command is implemented and left unused on purpose; this section is the expected
output **recorded before the run**, which is the property that makes it a test rather than a demo
(`testing.md` §5 — a guard that is merely green is not evidence).

**Preconditions.** A real Tier B invocation requires owner authorization, because it creates a branch
and a worktree. Measured state of this repository, 2026-08-21: two worktrees (`C:/Code/Autostich` on
`dev`, `C:/Code/Autostich-worktrees/agent-workflow-evolution` on `feature/agent-workflow-evolution`);
ports 5173 and 5180 reserved; `5180` the only port recorded in a contract.

**Scenario 1 — the cheap negative controls, which need no authorization at all.** Both must stop
before any state is created:

| Invocation | Expected | What it tests |
| --- | --- | --- |
| `/create-task scratch-probe` | Stops at step 1: tier missing. Nothing fetched, nothing created. | The tier is never inferred from a slug |
| `/create-task agent-workflow-evolution B` | Steps 2–6 run, then step 7 reports the branch collision — `feature/agent-workflow-evolution` exists locally, on the remote, **and** is checked out in a worktree, all three named — and stops. No suffix proposed. | The collision check fires on a real collision, and reports all of it rather than only the first hit |

**Scenario 2 — one real Tier B setup, expectations recorded first:**

| Expectation | Why it is the test |
| --- | --- |
| The cleanup audit is printed **first**, and its content matches a bare `/cleanup-task` run in the same state | The audit is referenced, not reimplemented |
| Ancestry reported as two exit-0 checks, named individually | An aggregate "ancestry OK" is not a measurement |
| Base recorded as a **40-character SHA**, and `git rev-parse origin/dev` at that moment returns the same value | The contract holds a durable identifier, not a moving branch name |
| Port allocated as **5181** — 5173 and 5180 excluded by the reserved table, 5180 also by the viewport-harness contract row | The exclusion set is read, not assumed empty |
| `git worktree list` gains exactly one entry, and the cockpit's `git status` gains nothing | Setup does not dirty the cockpit |
| The contract fills only the §3 fields; every other section reads `TODO — …` | No invented scope |
| No output contains `push`, `-u`, `--set-upstream`, `pull request`, `merge`, or any delete | The class-2 ceiling holds |
| Ends with an explicit statement of what a human must do next | Design §3, closing rule |

**What a first run cannot exercise**, stated so a green run is not over-read: the ancestry-abort
path, the non-cockpit abort, the `npm ci` failure path, the worktree-path-exists collision, the
Tier C `--feature` stop, and the unreadable-port-table fallback. Each needs a deliberately broken
precondition, which is a separate authorization.

---

## 6. Deliberately not done

- **`/prepare-review` is not started.** Design §6 step 3.
- **`CLAUDE.md` is not modified.** Design §5.3 places one pointer to the command layer there. It is
  worth one edit listing all three commands, once all three exist — not three edits.
- **The command is not run against a real task in this session.**
