# Implementation Note — `/cleanup-task`

Written 2026-08-21, before implementation. Scope: **`/cleanup-task` only.** `/create-task` and
`/prepare-review` are approved but not started.

Design source: `command-layer-design.md` §2.3, §3, §4, §5. Rules remain in `AGENTS.md`,
`docs/engineering/task-lifecycle.md` and `docs/engineering/git-workflow.md`; this note records how
the command is built, not what the process is.

---

## 1. Command file structure

One file: `.claude/commands/cleanup-task.md`, project-scoped and committed.

**Frontmatter**

| Field | Value | Why |
| --- | --- | --- |
| `description` | one line, under 60 characters | shown in `/help` |
| `argument-hint` | `[--worktrees-only\|--branches-only]` | the only two arguments |
| `allowed-tools` | see §2 | narrowest set that still measures the four safety conditions |
| `disable-model-invocation` | `true` | the command must fire only when a human types it |

`model` is deliberately unset — inherit the session model.

**Body — eight steps, in fixed order**

| Step | Does |
| --- | --- |
| 0 | States the posture: audit only, class-0 tools, nothing is deleted |
| 1 | `git fetch origin` — **never** `--prune` (§3) |
| 2 | Worktree inventory: path, branch, cleanliness |
| 3 | Branch inventory via `git for-each-ref`, protected refs excluded |
| 4 | Containment measurement |
| 5 | Base resolution from the task contract — only where step 4 leaves it open |
| 6 | Remaining safety conditions: unpushed commits, uncommitted workstream artefacts, worktree-held branches |
| 7 | Output: audit tables, proposed commands, unassessed list, approval-gated remote section |

The body is written as directives to Claude, not as prose describing the command to a user.

---

## 2. Allowed tools

```text
Bash(git fetch origin:*), Bash(git worktree list:*), Bash(git for-each-ref:*),
Bash(git rev-list:*), Bash(git rev-parse:*), Bash(git merge-base:*),
Bash(git log:*), Bash(git status:*), Bash(git -C:*),
Read, Grep, Glob
```

**`git for-each-ref` is used instead of `git branch`.** `Bash(git branch:*)` is a prefix rule and
would therefore also permit `git branch -d` and `git branch -D`. `for-each-ref` has no destructive
form and returns more per call — refname, object, upstream, tracking state and, verified on
git 2.55.0, `%(worktreepath)`.

**Two entries the allowlist cannot express safely, stated plainly.**

- `Bash(git fetch origin:*)` also permits `git fetch origin --prune`.
- `Bash(git -C:*)` permits **any** git subcommand in another worktree, including destructive ones.
  It is needed because per-worktree cleanliness is one of the four deletion conditions and
  `git -C <path> status --porcelain` is the way to measure it; prefix scoping cannot express
  "read-only `git -C`".

So the allowlist is a first line of defence, **not the control.** The control is the explicit
prohibition list in the command body, plus `disable-model-invocation: true`, which means a human is
present and watching every call.

No `Write` and no `Edit`: the command writes nothing.

---

## 3. Safety checks

Encoded in the body, in this order of authority:

1. **Class ceiling 0/3.** No delete, no push, no merge, no promotion, no PR, no force flag, in any
   form, executed or implied as executable. Destructive commands are *printed* for a human.
2. **Protected refs, never named in a proposed command:** `main`, `test`, `dev`, `archive/*`,
   `gh-pages`, and `origin/HEAD` — which `for-each-ref` reports as a bare `origin` row and which
   must be filtered rather than treated as a branch.
3. **The four deletion conditions** (`command-layer-design.md` §2.3, from batch 4 §8), all measured,
   none assumed: commits reachable from the correct base; worktree clean with nothing unpushed;
   workstream artefacts per the split rule in *Refinement 2*; remote deletion explicitly approved by
   a human. Conditions 1–3 are blocking; condition 4 blocks a worktree removal and a
   contract-backed branch, and is reported rather than enforced where no contract exists.
4. **`git fetch` without `--prune`.** Pruning deletes remote-tracking refs, which can be the only
   local reachability anchor for commits on a branch deleted upstream. `--prune` is printed as a
   proposed command instead.
5. **A branch checked out in a worktree is never proposed for deletion.** The worktree is reported
   instead. Git's own refusal — of `branch -d` on a checked-out branch, and of `worktree remove` on a
   dirty tree — is treated as a safety feature, never worked around.
6. **`-d` only, never `-D`; `worktree remove` without `--force`.**
7. **Remote deletions live in their own section**, headed by the sentence that says they are
   unapproved, and are never mixed into the local command block.

### Refinement 1 — containment against `dev` is a sufficient condition

`command-layer-design.md` §2.3 carries batch 4's rule that `dev` may never be assumed as the
integration base. Specifying the measurement sharpened it, and the command implements the sharper
form:

> `git rev-list --count origin/dev..<branch>` = 0 is a **sufficient** condition that every commit on
> the branch is reachable from `dev`, whichever base the branch was cut from. Containment is
> transitive, so this is a fact, not an inference, and it may be reported as measured.
>
> A **nonzero** count proves nothing on its own — the branch may be fully merged into a feature base
> that `dev` does not yet contain. That is the case batch 4 was protecting, and there the base must
> come from the contract. No contract naming the branch → `base unknown — not assessed`, and no
> deletion command.

The safety property is unchanged: no command is printed for a branch whose commits are not provably
preserved. What changes is that the audit stops withholding a verdict it can actually prove, which
today is the difference between a useful report and one where every row reads *not assessed*.

### Refinement 2 — condition 4 is split by operation

**Added 2026-08-21 after the first validation run, by owner decision.** The condition as first
written read as a blanket blocker: any uncommitted file under `docs/workstreams/` could withhold
every branch in the audit. Worse, it fires most reliably on the session that is writing the
workstream's own documents, which is exactly when the audit is being used.

The rule now splits by what the operation can actually destroy:

| Operation | Rule |
| --- | --- |
| **Worktree removal** | Requires a clean worktree. Uncommitted artefacts live in a working tree, not on a branch, so this is the operation that can lose them. Blocking. |
| **Branch deletion, contract found** | Verify the artefacts the contract references are committed. Uncommitted → withheld, paths named. Blocking. |
| **Branch deletion, no contract** | Report `no contract found — artefact condition not mechanically verifiable`. **Not** a deletion blocker. |

Conservatism is unchanged where it protects work: nothing is deleted automatically, conditions 1–3
still bind in full, and an unknown *base* still withholds the branch (step 5). The distinction is
that an unknown base is a state in which the work might not be preserved, whereas an unknown artefact
state cannot make a branch deletion lossy — deleting a branch does not touch an uncommitted file.

### What the first run can and cannot exercise

Measured today, no branch in this repository has unpushed commits, a dirty worktree, or divergence
from `dev`. The first run therefore exercises containment, protected-ref exclusion, the
worktree-held-branch path and the remote approval gate — and **cannot** exercise the unpushed,
dirty-worktree, base-unknown-with-divergence or ambiguous-contract paths. Those need scratch
branches, which is a separate authorization (`command-layer-design.md` §7).
