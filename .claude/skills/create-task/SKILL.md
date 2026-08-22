---
name: create-task
description: Set up a task — audit, branch, worktree, deps, contract scaffold
argument-hint: <task-slug> <A|B|C> [--base <branch>] [--feature <branch>] [--pixels]
allowed-tools: Bash(git fetch origin:*), Bash(git rev-parse:*), Bash(git merge-base:*), Bash(git for-each-ref:*), Bash(git ls-remote:*), Bash(git rev-list:*), Bash(git worktree list:*), Bash(git worktree add:*), Bash(git log:*), Bash(git status:*), Bash(git -C:*), Bash(npm --prefix:*), Read, Grep, Glob, Write
---

**Owner-invoked only.** A session does not run this on its own initiative; it names the
skill and lets the owner run it.

Set up one task: run the cleanup audit, verify the repository is in a fit state, then create the
branch, the worktree, the dependencies and a contract scaffold whose non-derivable sections are
headings only.

**You produce the mechanically derivable half of a task setup and stop.** Everything requiring
judgement — the tier, the scope, the non-goals, the acceptance gate — is a heading you leave for a
human. A plausible guess in any of those places reads as a decision that nobody made.

Rules are cited, not restated. Tiers, the contract shape and the visual gate are
`docs/engineering/task-lifecycle.md`. Branch model, worktree ownership and creation are
`docs/engineering/git-workflow.md`. Ports and per-worktree setup are
`docs/engineering/NEW_MACHINE_SETUP.md`. Gates, roles and reporting honesty are `AGENTS.md`. Where
this file and those disagree, those win.

Arguments: `$ARGUMENTS`

---

## Prohibitions

These bind for the whole command. The `allowed-tools` list is only a first line of defence.

- **Never `push`**, never `-u`/`--set-upstream`, never open a pull request, never merge, never
  promote. The branch you create stays local and untracked.
- **Never delete anything** — no `git branch -d`/`-D`, no `git worktree remove`, no file deletion —
  and never use a force flag anywhere, including inside a printed command.
- **Never roll back.** If a later step fails, what earlier steps created stays. Undoing a worktree is
  a deletion.
- **Never overwrite.** Create files only at paths that do not exist. Never append a suffix to a
  colliding branch name or worktree path to make room.
- **Never guess the tier.** It is given or the command stops.
- **Never write scope content** — scope, non-goals, tripwire, approved architecture, task-specific
  inputs, acceptance gate, expected file surface, hazards, definition of done. Emit the heading and
  `TODO — <what is needed>`.
- **Never run a validation gate.** Setup produces no gate result worth reporting.
- **Never edit `AGENTS.md`, `CLAUDE.md`, `docs/engineering/**`, or any other rule document.**
- **Never write into an existing worktree** other than the one this run creates.
- **Never take the V1 baseline yourself.** Prompt; a human decides what state to capture.

---

## Step 1 — parse the arguments, before touching the repository

| Argument | Required | Meaning |
| --- | --- | --- |
| `<task-slug>` | yes | kebab-case, no `feature/` or `task/` prefix; becomes the branch suffix and the worktree directory name |
| `<A\ | B\ | C>` | yes | the tier |
| `--base <branch>` | no | default `dev` for Tier A/B; ignored for Tier C, whose base is the feature branch |
| `--feature <branch>` | Tier C only | the feature integration branch the task hangs under |
| `--pixels` | no | the work will move pixels |

**Stop and ask, creating nothing, if:**

- the tier is absent, or is not one of `A`, `B`, `C` — never infer it from the slug, the base or the
  wording of the request;
- the slug is absent, or contains a `/`, whitespace, or a leading `feature`/`task` prefix;
- the tier is `C` and `--feature` is absent.

When you stop, say which argument was missing and what the two or three valid values are. Do not
proceed with a default.

## Step 2 — the cleanup audit, printed first

Read `.claude/skills/cleanup-task/SKILL.md` and follow its steps 1–7 as written, printing its sections
A–F. **Do not restate its rules here and do not reimplement its logic** — a second copy of the
deletion-safety conditions is the exact drift this layer is built to avoid.

**Execute nothing it prints.** It proposes; a human disposes.

The audit is informational and **does not gate this command.** A repository with stale branches is
still a repository a task can be created in. Report the audit, then continue.

Its step 1 runs `git fetch origin`. That satisfies the fetch this command needs; do not repeat it. If
the audit could not run at all, run `git fetch origin` explicitly here and say that the audit was
skipped and why.

## Step 3 — refuse to run outside the cockpit checkout

```bash
git rev-parse --path-format=absolute --git-dir --git-common-dir
```

Two equal paths means the cockpit checkout. Two different paths means a linked worktree.

**Different → abort**, naming both paths. Creating a worktree from inside another worker's worktree
is the first step toward two simultaneous writers, which `AGENTS.md` — *Worktree and agent ownership*
forbids outright.

## Step 4 — ancestry

```bash
git merge-base --is-ancestor origin/main origin/test
git merge-base --is-ancestor origin/test origin/dev
```

Report the two exit codes **separately**, by name. An aggregate "ancestry OK" is not a measurement.

**Either non-zero → abort.** Ancestry repair is a deliberate procedure
(`git-workflow.md` — *Deliberate ancestry reconciliation*), never a side effect of task setup. Print
nothing that repairs it.

## Step 5 — resolve the base to a SHA

Tier A and B: the base ref is `origin/<--base, default dev>`.
Tier C: the base ref is the `--feature` branch — `origin/<feature>` if it exists on the remote,
otherwise the local `<feature>`.

```bash
git rev-parse <base-ref>
```

- **Does not resolve → abort**, naming the ref. Do not fall back to `dev`.
- **Tier C, the feature branch resolves neither remotely nor locally → stop and ask.** Print the
  creation command from `git-workflow.md` — *Branch creation*, **Multi-agent feature integration
  branch** — for a human to run. Do not create it yourself: establishing a shared integration base as
  a side effect of task setup is what that section's warning about establishing the base explicitly
  before starting parallel workers exists to prevent.
- **Tier C, the feature branch exists only locally** → proceed, and say so plainly in the report: the
  base is not durable until a human pushes it.

Record the full 40-character SHA. The contract carries the SHA, not the branch name — a branch name
moves, and `task-lifecycle.md` — *The task contract* requires the durable form.

## Step 6 — derive the names

| Value | Tier A / B | Tier C |
| --- | --- | --- |
| Branch | `feature/<task-slug>` | `task/<task-slug>` |
| Worktree | `<repo-parent>/Autostich-worktrees/<task-slug>` | same |
| Contract | `docs/workstreams/<task-slug>/task-contract.md` | `docs/workstreams/<feature-slug>/<task-slug>/task-contract.md` |

`<feature-slug>` is the `--feature` branch with its `feature/` prefix removed. `<repo-parent>` is the
parent of `git rev-parse --show-toplevel`; never hard-code a drive letter or a home directory.

Tier A writes no contract at all — see step 11.

## Step 7 — collision checks

Run **all four** and report all four. Never stop at the first hit; a human deciding what to do next
needs the whole picture.

```bash
git for-each-ref --format='%(refname:short)|%(worktreepath)' refs/heads/<branch> refs/remotes/origin/<branch>
git ls-remote --exit-code --heads origin <branch>
git worktree list --porcelain
git -C <worktree-path> rev-parse --show-toplevel
```

| Check | Collision when |
| --- | --- |
| Local branch | the `refs/heads/` row exists |
| Remote branch | `ls-remote` exits 0, or the `refs/remotes/origin/` row exists |
| Branch already checked out | `%(worktreepath)` is non-empty for either row |
| Worktree path in use | it appears in `worktree list`, or `git -C` reaches it at all |

**Any collision → stop and ask.** Name every one that fired and the path or ref it fired on. Do not
append `-2`, do not reuse the existing worktree, do not write into it.

`git worktree add` also refuses a path that exists and non-empty. Treat that refusal as a safety
feature and never work around it with `--force`.

## Step 8 — allocate the preview port

Read the reserved table in `NEW_MACHINE_SETUP.md` — *Preview server and ports*, then:

```bash
grep -rn "Preview port" docs/workstreams
```

Allocate the **lowest integer from 5181 upward** that is in neither set. **Never probe the port** —
`--strictPort` is what makes a collision fail loudly at the moment it matters.

If either source cannot be read, allocate 5181 and mark the allocation `inferred — verify`.

## Step 9 — print the derived-field table, then create

This is the last moment at which nothing exists. Print a table of every value from steps 5–8, each
marked *measured*, *inferred* or *proposed* (`AGENTS.md` — *House rules*), then continue.

If the cockpit checkout is dirty (`git status --porcelain`), **warn and proceed** —
`git worktree add` does not require a clean tree — and name the dirty paths, so they are not later
mistaken for this task's work.

## Step 10 — create the worktree

```bash
git worktree add ../Autostich-worktrees/<task-slug> -b <branch> <base-sha>
```

The relative path form is `git-workflow.md` — *Creating a worktree*, and it avoids a drive-letter
argument. The **SHA**, not the base branch name, so the worktree matches the contract exactly even if
the remote moved during this run.

No upstream is set, deliberately. Read the absolute path back for the contract:

```bash
git -C ../Autostich-worktrees/<task-slug> rev-parse --show-toplevel
```

## Step 11 — the scaffold

Section **names** come from `task-lifecycle.md` — *The task contract*, in that order, plus a closing
open-questions section. Emit them **unnumbered**: `/prepare-review` will locate them by name, and a
numeric heading goes stale silently when a contract adds or drops a section.

Fill **only** these fields. Everything else is the heading followed by `TODO — <what is needed>`,
naming what the human has to supply.

| Field | Value |
| --- | --- |
| Branch | from step 6 |
| Base | `<base-ref>` @ `<40-char SHA>` from step 5 |
| Concurrency | one writer; sequential sessions may continue the task in the same worktree |
| Worktree | absolute path from step 10 |
| Branch checked out there | from step 6 |
| Upstream | none — the branch deliberately does not track its base |
| Preview port / URL | from step 8 |
| Server invocation | `npm run dev -- --port <port> --strictPort` |

Owner and Integrator are `TODO`, pointing at `AGENTS.md` — *Roles and source of truth*. A Reviewer
row is emitted only where the task explicitly requested an independent review; review is optional and
risk-based (`AGENTS.md` — *Independent review*).
Staffing a task is a decision, not a derivation.

### Tier A — print, write nothing

Write no file and create no workstream directory. Print a task-note template for the human to put in
the branch's first commit message or a scratch file, with the five headings
`task-lifecycle.md` — *Tier A — standard task* requires: goal, non-goals, expected file surface,
known hazards, done criteria. Include the derived table above as context, then state that Tier A
records V4 in the task note or handoff, not in a workstream directory.

### Tier B and C — write one file

Write the contract at the step-6 path. **If that path already exists, write nothing** — print the
scaffold in the report instead and say which path collided.

Write it inside the **new worktree**, not the cockpit checkout, so it is committed with the task and
the cockpit stays clean. That worktree is the only one you may write into, and only because this run
created it seconds earlier and nothing else is writing there yet.

## Step 12 — dependencies

```bash
npm --prefix <absolute-worktree-path> ci
```

`node_modules/` is per-worktree and is not shared
(`NEW_MACHINE_SETUP.md` — *Per-worktree setup*).

**On failure: report the exit code, leave the worktree and the contract exactly as they are, and
print the manual finish for a human.** Do not retry in a loop, do not delete anything, do not remove
the worktree — that is class 3. State plainly that no test or lint result from that worktree means
anything until this succeeds.

## Step 13 — the visual baseline, only with `--pixels`

Print the V1 prompt: this is the moment to capture the baseline, before the first pixel moves, and
`task-lifecycle.md` — *Visual review* is the procedure. Name what must be recorded alongside it —
sizes, DPR, application state — because V2 has to match them.

**Do not capture it.** A human chooses the state.

## Step 14 — output

In this order:

**A. Audit** — the sections `/cleanup-task` produced, unmodified.

**B. Derived fields** — the step-9 table, each row marked *measured*, *inferred* or *proposed*.

**C. What was created** — branch, worktree, contract path (or, for Tier A, "nothing written"), and
the `npm ci` result. Never list something you did not create.

**D. What a human must do next** — the `TODO` sections to fill, in the order the contract needs them;
whether the base branch still needs pushing (Tier C, local-only feature branch); the V1 capture, if
`--pixels`; and the `npm ci` finish, if step 12 failed.

**E. Outcome** — exactly one of `PROCEED`, `STOP-AND-ASK` or `ABORT`, with the reason.

Never describe planned work as completed, and never report a step you did not run. State the class
ceiling once: this command's ceiling is class 2 — local state only. Nothing here was pushed, merged,
deleted or reviewed.
