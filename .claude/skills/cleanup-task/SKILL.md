---
name: cleanup-task
description: Audit worktrees and branches; propose cleanup, never execute it
argument-hint: [--worktrees-only|--branches-only]
allowed-tools: Bash(git fetch origin:*), Bash(git worktree list:*), Bash(git for-each-ref:*), Bash(git rev-list:*), Bash(git rev-parse:*), Bash(git merge-base:*), Bash(git log:*), Bash(git status:*), Bash(git -C:*), Read, Grep, Glob
---

**Owner-invoked only.** A session does not run this on its own initiative; it names the
skill and lets the owner run it.

Audit this repository's worktrees and non-permanent branches, and report what could be cleaned up.

**You are auditing. You are not cleaning up.** Every destructive command you produce is printed for a
human to read and run. You execute none of them.

Rules are cited, not restated. Cleanup safety is `docs/engineering/git-workflow.md` — *Cleanup*.
Worktree ownership is the same document — *Worktree ownership*. Reporting honesty is `AGENTS.md` —
*House rules*. Where this file and those disagree, those win.

Arguments: `$ARGUMENTS` — `--worktrees-only` skips steps 3–6, `--branches-only` skips step 2. No
argument runs everything.

---

## Prohibitions

These bind for the whole command. They are the control; the `allowed-tools` list is only a first
line of defence.

- **Never execute** a deletion of any kind: `git branch -d`/`-D`, `git worktree remove`,
  `git push --delete`, `git update-ref -d`, or any equivalent.
- **Never execute** `push`, `merge`, `rebase`, `cherry-pick`, `reset --hard`, `checkout`/`switch`, or
  a promotion.
- **Never run `git fetch --prune`.** Print it as a proposed command instead. Pruning deletes
  remote-tracking refs, and such a ref can be the only local reachability anchor for commits on a
  branch that was deleted upstream.
- **Never use a force flag** — `-D`, `--force`, `-f` — anywhere, including inside a printed command.
- **Never name a protected ref in a proposed command:** `main`, `test`, `dev`, `exp`, `archive/*`,
  `gh-pages`.
- **Never guess an integration base.** See step 5.
- **Never propose promotion**, and never present `test` being behind `dev` as an action. Promotion is
  a deliberate release decision, not a cleanup step.
- **Never write, edit or create a file.**

---

## Step 0 — state the posture

Open the report with one line: this is an audit, nothing will be deleted, and every command shown is
for a human to run.

## Step 1 — refresh

```bash
git fetch origin
```

Plain, without `--prune`. If it fails (offline), say so and continue: every measurement below is then
against possibly stale remote-tracking refs, and the report must say that in place of a result.

## Step 2 — worktree inventory

```bash
git worktree list --porcelain
```

For each worktree, measure cleanliness in that worktree, not in this one:

```bash
git -C <path> status --porcelain
```

Empty output means clean. Record for each worktree: path, checked-out branch, clean or dirty, and —
when dirty — the paths, because a dirty worktree is the single most common reason a cleanup must not
proceed.

The cockpit checkout (the one holding `dev`) is a permanent workspace, not a task worktree. List it
for completeness and never propose removing it.

## Step 3 — branch inventory

```bash
git for-each-ref --format='%(refname:short)|%(objectname:short)|%(upstream:short)|%(upstream:track)|%(worktreepath)' refs/heads refs/remotes
```

Then filter out, before anything else:

- the protected refs listed under Prohibitions, local and remote;
- `origin/HEAD`, which this format reports as a bare `origin` row and which is a symbolic ref, not a
  branch.

What remains is the audit set: local and remote `feature/*` and `task/*` branches.

## Step 4 — containment

For each branch in the audit set:

```bash
git rev-list --count origin/dev..<branch>
```

**Read the result exactly this way.**

- **Count = 0** — every commit on the branch is reachable from `dev`, whichever base the branch was
  cut from. Containment is transitive, so this is a **measured fact**, not an inference. The work is
  preserved in `dev`. Record it as *contained in `dev`*.
- **Count > 0** — this proves nothing on its own. The branch may be fully merged into a feature base
  that `dev` does not yet contain. Go to step 5.

## Step 5 — base resolution, only for branches that step 4 left open

Find the contract that names the branch:

```bash
git rev-list --count <base>..<branch>
```

where `<base>` comes from the **Identity** section of the task contract that names this branch. Find
it by searching `docs/workstreams/**/task-contract.md` for the branch name (use Grep, then Read the
Identity section). The recorded base may be a SHA — that is preferable, and works here unchanged.

Then:

- **Exactly one contract, base resolves, count = 0** → contained in its own base. Assessed.
- **Exactly one contract, count > 0** → genuinely unmerged. Assessed, **no deletion command.**
- **No contract names the branch** → `base unknown — not assessed`. **No deletion command.**
- **More than one contract names it** → `base ambiguous — not assessed`, list both paths. **No
  deletion command.**
- **The recorded base no longer exists** → `base missing — not assessed`, name the missing ref. **No
  deletion command.**

Falling back to `dev` here is exactly the mistake this step exists to prevent: it would produce a
confident, wrong "safe to delete" for the branches most likely to still hold unmerged work.

## Step 6 — the remaining safety conditions

Conditions 1–3 are **blocking**: any one unmet means the branch is listed with the reason and **no
command is printed for it.** Condition 4 is blocking for a worktree removal and for a branch that has
a contract; where no contract exists it is **reported, not enforced** — see below.

1. **Commits preserved** — step 4 count = 0, or step 5 resolved with count = 0.
2. **Nothing unpushed.** From the `%(upstream:track)` field, or:
   ```bash
   git rev-list --count <upstream>..<branch>
   ```
   Report any ahead-count with the SHAs. A local branch with no upstream is not thereby unsafe if
   condition 1 holds — say which of the two applies rather than merging them into one verdict.
3. **Not checked out in a worktree.** `%(worktreepath)` non-empty means a worktree holds it. Report
   the worktree; propose removing the worktree first, and only if that worktree is clean. Git refuses
   to delete a checked-out branch and refuses to remove a dirty worktree — treat both refusals as
   safety features, never work around them.
4. **Workstream artefacts.** Three cases, because the risk is not the same in each.

   - **Worktree removal — requires a clean worktree.** This is where the condition has real force:
     uncommitted artefacts live in a working tree, not on a branch, so removing the worktree is the
     operation that can lose them. Step 2 already measured cleanliness. Git's refusal to remove a
     dirty worktree is a safety feature; never work around it.
   - **Branch deletion, contract found.** Verify that the workstream artefacts the contract
     references are committed:
     ```bash
     git status --porcelain <workstream-directory-named-by-the-contract>
     ```
     Uncommitted files there withhold the branch, with the paths named.
   - **Branch deletion, no contract.** Report, verbatim:
     `no contract found — artefact condition not mechanically verifiable`
     and **do not** use it as a deletion blocker. Deleting a branch cannot lose an uncommitted file;
     conditions 1–3 are what protect committed work, and they still bind in full. Blocking here would
     stop every branch in the repository whenever any file under `docs/workstreams/` happened to be
     uncommitted — a false stop, not a safe one, and one that would fire most often on the session
     that is writing the workstream's own documents.

   **This does not loosen step 5.** An unknown *base* still withholds the branch and prints no
   command, because that is a state where the work might not be preserved. An unknown *artefact*
   state is different in kind: it is reported, and conditions 1–3 still decide.

## Step 7 — output

Produce exactly these sections, in this order.

**A. Worktrees** — table: path, branch, clean/dirty, contained, proposal or reason withheld.

**B. Branches assessed** — table: branch, local/remote, base used and where it came from, count,
unpushed, worktree, **artefacts**, verdict. The artefacts column carries one of three values:
*committed*, *uncommitted — withheld* (paths named beneath the table), or the verbatim
`no contract found — artefact condition not mechanically verifiable`.

**C. Not assessed** — every branch from step 5 that could not be resolved, each with its reason
(`base unknown`, `base ambiguous`, `base missing`). Head this section with the sentence: *no deletion
command is printed for these.*

**D. Proposed local commands** — a fenced block, prefixed by *printed for a human to run; nothing
below was executed*. Use `git branch -d` (never `-D`) and `git worktree remove` (never `--force`).
Order matters: remove a worktree before deleting the branch it holds.

**E. Remote deletions — not approved** — a separate section, never merged into D, headed with:
*Remote branch deletion requires explicit approval (`git-workflow.md` — Cleanup). The commands below
are unapproved and must not be run until a human authorizes each one.*

**F. What a human must do next** — one short list. State plainly that nothing was deleted and no file
was modified.

Mark every claim by category — measured, observed, inferred, proposed (`AGENTS.md` — *House rules*).
A count you ran is measured. A verdict you derived from it is inferred. Never report a check you did
not run, and where a condition could not be measured, say which one and why instead of omitting it.
