# Branch Reconciliation Plan — make `main -> test -> dev` a single ancestry chain

> Status: **PROPOSED — not executed.** No commit, no push, no merge, no rebase, no ref change has
> been performed. This document is for review and approval.
>
> Verified read-only on 2026-08-20 against `dev` @ `0f17612a`, git 2.55.0.windows.3.
> Revised 2026-08-20 after external review.
>
> **Purpose: history-only reconciliation.** `test` becomes an ancestor of `dev` while `dev`'s
> content stays **byte-identical**. This changes the commit graph and nothing else.

---

## 1. Current branch topology

### Remote (`git ls-remote --heads origin`) — authoritative

```
7c78dd38f4d71d5491480405a7cf92bc35582c6b  refs/heads/Autostich/pixi
fc1abc52310d2ecde1be61555917d9b9a18f953f  refs/heads/archive/first-playable
0f17612a86597e8cfccacc67fe851f577beff349  refs/heads/dev
167c9e7f12fd75b868e4cd012d46b1e260def558  refs/heads/gh-pages
be99ea8818faf2a9df1579262c4c40607b4a015d  refs/heads/main
b0ef9ed5bc96f9907633a124588183cc0f5daa2d  refs/heads/test
```

### Correction to the briefing: `Autostich/pixi` exists **remotely**

The briefing said to treat `Autostich/pixi` as stale/local-only *unless `git ls-remote origin`
proves otherwise*. **It proves otherwise.**

| Location | Status |
| --- | --- |
| Remote `origin` | **Exists** — `refs/heads/Autostich/pixi` @ `7c78dd38` |
| Local branch (`refs/heads/`) | **Does not exist** |
| Local remote-tracking (`refs/remotes/`) | Exists — `refs/remotes/origin/Autostich/pixi` @ `7c78dd38` (a mirror, not independent work) |

It carries 5 commits of skill-emblem art not in `dev`. **Out of scope for this task and untouched by
this plan.** It must not be deleted as assumed cruft.

### Heads and trees

| Branch | Commit | Tree |
| --- | --- | --- |
| `main` | `be99ea88` | `f8f807daff7a` |
| `test` | `b0ef9ed5` | `be8f3745854f` |
| `dev` | `0f17612a` | `8f44d3360089` |
| `Autostich/pixi` | `7c78dd38` | `686ac6514792` |

### Ancestry matrix (`git merge-base --is-ancestor`)

```
origin/main  ancestor of origin/test  : YES     <- main -> test intact
origin/test  ancestor of origin/dev   : NO      <- THE BREAK
origin/main  ancestor of origin/dev   : YES
origin/dev   ancestor of origin/test  : NO
origin/dev   ancestor of origin/main  : NO
```

`git merge-base origin/test origin/dev` = `be99ea88` — i.e. the two branches diverge at `main`.

```
                     b0ef9ed5  test
                    /
be99ea88  main ----+
                    \
                     ... 49 commits ...  0f17612a  dev
```

### The divergence, in full

- Commits only on `test` (`dev..test`): **exactly one** — `b0ef9ed5 "chore: prepare test branch rename"`.
- Commits only on `dev` (`test..dev`): **49**.
- `b0ef9ed5` touches **one file**: `.github/workflows/deploy-test.yml` (3 insertions, 12 deletions).

Comparing that file between the branches, `dev` differs by exactly **one added line** and is the
*superset* — both already have `branches: [test]`, and `dev` additionally retains an explanatory
comment that `b0ef9ed5` had stripped:

```diff
 permissions:
   contents: write

+# Gleiche Gruppe wie der main-Deploy → serialisiert die gh-pages-Pushes (kein Race).
 concurrency:
   group: gh-pages-publish
   cancel-in-progress: false
```

**This confirms the premise:** the equivalent test-deployment configuration is already represented
in `dev`.

### The one file that exists on `test` but not on `dev`

```
$ git diff --name-status --diff-filter=D origin/test origin/dev
D    .github/workflows/deploy-balancing.yml
```

**This is intentional, not a loss.** `dev`'s tip commit `0f17612a "chore: remove obsolete balancing
deployment"` deleted it deliberately, and the workflow is genuinely dead: it triggers on
`branches: [balancing]`, and `git ls-remote origin` shows **no `balancing` branch exists**. Keeping
`dev`'s tree keeps the deletion, which is the desired outcome.

It is called out here because a silently dropped file is the classic failure mode of an `ours` merge,
and this is the only file to which that applies.

---

## 2. Permanent branch contract

This is the standing rule the reconciliation exists to restore. It applies from now on, not just to
this operation.

### Ancestry (the invariant)

```
main  ->  test  ->  dev
```

Every commit reachable from `main` is reachable from `test`; every commit reachable from `test` is
reachable from `dev`. `dev` is always the furthest ahead.

Machine-checkable at any time:

```bash
git merge-base --is-ancestor origin/main origin/test   # must exit 0
git merge-base --is-ancestor origin/test origin/dev    # must exit 0
```

### Promotion (the direction of travel)

```
dev  ->  test  ->  main
```

**Promotion is FAST-FORWARD ONLY.** Future promotions must be equivalent to:

```bash
# promote dev into test
git checkout test
git merge --ff-only dev

# promote test into main
git checkout main
git merge --ff-only test
```

`--ff-only` is not a preference, it is the enforcement mechanism: if the invariant above has been
broken, the command **fails loudly instead of silently creating a merge commit** that would deepen
the divergence.

### Rules

1. **No direct commits on `test` or `main`.** They are pure mirrors of upstream. All work lands on
   `dev` (via `feature/*`) and travels downstream by fast-forward only.
2. **No squash merges and no ordinary merge commits as a promotion mechanism** — unless the
   resulting downstream topology is deliberately reconciled afterwards. Both create a commit on the
   downstream branch that the upstream branch does not have, which is precisely how the current
   break was produced.
3. **The same work must not be cherry-picked or rebased onto several branches separately.** This
   repo has already paid for that once: identical content existed as two or three distinct commit
   objects, commit counters read "26 ahead", and the trees were byte-identical the whole time.
   Compare with `git rev-parse <branch>^{tree}`, never with commit counts.

### How the current break happened, and what this operation is

`b0ef9ed5` was committed **directly onto `test`** (rule 1 violated) and the equivalent change was
made separately on `dev`. The operation in §3 is exactly the "deliberate reconciliation afterwards"
that rule 2 permits — a one-time, explicitly reviewed repair, not a routine move.

---

## 3. Exact proposed Git commands

Run from the repository root, on branch `dev`.

### Working tree state — NOT clean, and that is expected

The working tree currently contains **two untracked files**:

```
docs/workstreams/setup/baseline-report.md
docs/workstreams/setup/branch-reconciliation-plan.md
```

`git status --porcelain` therefore reports `?? docs/workstreams/` rather than nothing.

**This does not block the merge.** `-s ours` writes no files, so it cannot conflict with untracked
paths, and `git merge` only refuses when untracked files would be *overwritten*. There must,
however, be **no untracked or modified files outside `docs/workstreams/setup/`** — anything else is
unrelated work that must be dealt with first.

> **Consequence for the pinned constants.** Every SHA and tree hash in this document is pinned to
> `dev` @ `0f17612a`, i.e. to the state **with these two documents still uncommitted**. If they are
> committed *before* the merge, `dev`'s HEAD and tree both change and the constants below become
> stale. In that case re-derive them first and update this document:
>
> ```bash
> git rev-parse HEAD            # new pre-merge dev SHA
> git rev-parse 'HEAD^{tree}'   # new expected tree hash
> ```

### Preconditions

```bash
git rev-parse --abbrev-ref HEAD          # must print: dev
git status --porcelain                   # must print ONLY: ?? docs/workstreams/
git fetch origin                         # refresh refs before acting
git rev-parse HEAD                       # must be 0f17612a86597e8cfccacc67fe851f577beff349
git rev-parse origin/test                # must be b0ef9ed5bc96f9907633a124588183cc0f5daa2d
```

### The operation — a single history-only merge

```bash
git merge -s ours origin/test -m "chore(git): reconcile test into dev (history-only, tree unchanged)

test carried one unique commit (b0ef9ed5, 'chore: prepare test branch rename') that never
reached dev, so test was not an ancestor of dev and the main -> test -> dev chain was broken.

Its content is already represented in dev: dev's .github/workflows/deploy-test.yml is
functionally identical (branches: [test]) and additionally retains one explanatory comment
that b0ef9ed5 had stripped.

Merged with strategy 'ours' so the dev tree is preserved byte-for-byte while test becomes an
ancestor of dev. No file changes. This restores the fast-forward-only promotion path
dev -> test -> main."
```

### The command is `-s ours`, **not** `-X ours`

|  | Meaning | Effect here |
| --- | --- | --- |
| **`git merge -s ours origin/test`** | **strategy** `ours` | **CORRECT.** Discards the other tree entirely. `dev`'s tree is kept byte-for-byte. |
| `git merge -X ours origin/test` | strategy *option* to the default `ort` strategy | **WRONG.** Performs a real merge and only resolves *conflicting* hunks in `dev`'s favour. Non-conflicting changes from `test` are still applied — including **re-adding the deleted `deploy-balancing.yml`**. |

This one-character difference is the single most important line in this document.

### Explicitly NOT part of this operation

- `test` is **not** moved. It stays at `b0ef9ed5`. **No `dev` work is promoted to `test`.**
- No rebase, no history rewrite, no force-push, no branch deletion.
- `main`, `gh-pages`, `archive/first-playable` and `Autostich/pixi` are untouched.
- No push. Pushing is a **separate decision** after the post-operation checks below.

---

## 4. Why it is safe

1. **`-s ours` preserves `HEAD`'s tree by definition.** The merge records `test` as a second parent
   and discards its tree entirely. This is the standard, intended Git tool for exactly this case:
   recording "this branch's content is already accounted for."
2. **Nothing is lost, and the delta is fully enumerated.** The only commit unique to `test` touches
   one file, and `dev` already holds a functionally identical, slightly better-commented version.
   The only file unique to `test` is a workflow `dev` deliberately deleted, for a branch that no
   longer exists.
3. **`main -> test` is already intact** and is not touched.
4. **The constraint is respected.** The operation is one-directional: `test` becomes an ancestor of
   `dev`. No current `dev` work reaches `test`.
5. **Fully reversible before push** — see §6. **After push it is effectively permanent**; that
   asymmetry is the reason the checks in §5 are blocking gates.
5. **It repairs the promotion path.** Once `test` is an ancestor of `dev`, the eventual `dev -> test`
   promotion becomes a genuine fast-forward and `git merge --ff-only` will succeed, as the contract
   in §2 requires.
7. **No application code, workflow file, or configuration changes.** Zero tracked files touched.

### Honesty about what has and has not been proven

Tree preservation is asserted from two things: the **documented, deterministic behaviour of
`-s ours`**, and the **complete enumeration of the `test`/`dev` delta above** (69 added, 44 modified,
1 deleted file — all accounted for). It has **not** been demonstrated by executing a dry-run merge,
because doing so would require creating a commit object or mutating the index, which this task
forbids. It is therefore proven by the blocking gates in §5: if any of them fails, the operation is
rolled back rather than pushed.

---

## 5. Proof that the dev tree will not change

### Recorded pre-operation state

|  | Value |
| --- | --- |
| `dev` HEAD (pre-merge SHA) | `0f17612a86597e8cfccacc67fe851f577beff349` |
| **`dev` tree** | **`8f44d33600898b6b97428d2dd75d462b3e0f7c73`** |
| `origin/test` HEAD | `b0ef9ed5bc96f9907633a124588183cc0f5daa2d` |
| Working tree | **not clean** — 2 untracked files under `docs/workstreams/setup/`, 0 modified tracked files |

### Expected post-operation state

|  | Expected |
| --- | --- |
| `HEAD^1` (first parent) | `0f17612a...` — the pre-merge `dev` commit |
| `HEAD^2` (second parent) | `b0ef9ed5...` — the `test` commit |
| `dev` HEAD | new merge commit |
| **`dev` tree** | **`8f44d336...` — byte-identical** |
| Working tree | unchanged — same 2 untracked files, still 0 modified tracked files |
| Tracked files added / removed / modified | **none** |
| Working directory | unchanged, still clean |

### Mandatory verification (run immediately after the merge, before any push)

Every check below is a **blocking gate**. Each is written to exit non-zero on failure so it can be
run as a script.

```bash
PRE_DEV=0f17612a86597e8cfccacc67fe851f577beff349
TEST_SHA=b0ef9ed5bc96f9907633a124588183cc0f5daa2d
PRE_TREE=8f44d33600898b6b97428d2dd75d462b3e0f7c73

# GATE 1 — no content difference whatsoever against pre-merge dev.
#          --quiet exits 0 only if the diff is completely empty.
git diff --quiet "$PRE_DEV" HEAD \
  && echo "OK   1: content identical to pre-merge dev" \
  || { echo "FAIL 1: content changed"; exit 1; }

# GATE 2 — dev tree hash unchanged.
test "$(git rev-parse 'HEAD^{tree}')" = "$PRE_TREE" \
  && echo "OK   2: tree hash unchanged" \
  || { echo "FAIL 2: tree hash differs"; exit 1; }

# GATE 3 — first parent is the original dev commit (dev's history is continued, not replaced).
test "$(git rev-parse 'HEAD^1')" = "$PRE_DEV" \
  && echo "OK   3: HEAD^1 == pre-merge dev" \
  || { echo "FAIL 3: wrong first parent"; exit 1; }

# GATE 4 — second parent is the test commit (this is what creates the ancestry).
test "$(git rev-parse 'HEAD^2')" = "$TEST_SHA" \
  && echo "OK   4: HEAD^2 == test" \
  || { echo "FAIL 4: wrong second parent"; exit 1; }

# GATE 5 — the invariant from §2 now holds locally.
git merge-base --is-ancestor "$TEST_SHA" HEAD \
  && echo "OK   5: test is an ancestor of dev" \
  || { echo "FAIL 5: ancestry not established"; exit 1; }

git merge-base --is-ancestor origin/main HEAD \
  && echo "OK   5b: main is an ancestor of dev" \
  || { echo "FAIL 5b"; exit 1; }

# GATE 6 — test did not move; no dev work was promoted.
test "$(git rev-parse origin/test)" = "$TEST_SHA" \
  && echo "OK   6: test still at b0ef9ed5" \
  || { echo "FAIL 6: test moved"; exit 1; }

# GATE 7 — working tree unchanged: still only the two untracked docs.
test "$(git status --porcelain)" = "?? docs/workstreams/" \
  && echo "OK   7: working tree as expected" \
  || { echo "FAIL 7: unexpected working-tree state"; git status --porcelain; exit 1; }

# Visual confirmation (not a gate).
git log --graph --oneline -6
```

**If any gate fails, do not push. Roll back per §6 and re-open this plan.**

Gates 3 and 4 are the ones that distinguish a correct `-s ours` merge from a mistaken `-X ours`
or from a merge run on the wrong branch: only a two-parent commit with exactly these parents *and*
an unchanged tree is the intended result.

---

## 6. Rollback / recovery

**The asymmetry matters: before pushing this is trivially reversible; after pushing it is not.**

### Before pushing — trivial

If the merge is still in progress (conflict prompt, or you changed your mind mid-way):

```bash
git merge --abort
```

If the merge commit has already been created locally:

  `?? ``docs/workstreams/` before running it.
```bash
git reset --hard 0f17612a86597e8cfccacc67fe851f577beff349
git status --porcelain          # expect: ?? docs/workstreams/
git rev-parse 'HEAD^{tree}'     # expect: 8f44d33600898b6b97428d2dd75d462b3e0f7c73
```

Two notes on `git reset --hard` here:

- It is safe **because no tracked file is modified**. Verify `git status --porcelain` shows only
- It does **not** delete untracked files, so the two planning documents survive the rollback intact.

### After pushing — NOT undoable by a normal revert

This is the correction that matters most, because the intuitive move is wrong:

> **`git revert` cannot remove the ancestry created by an `ours` merge.**

A revert creates a *new commit that changes content*. It does not remove the merge commit from the
graph. And here the merge changed no content at all, so:

- `git revert -m 1 <merge-sha>` would produce an **empty or near-empty** revert (Git will likely
  refuse it as "nothing to commit"), and
- **`test` would remain an ancestor of `dev` regardless.** The second parent link is a permanent
  property of the commit graph, not a diff that can be undone.

Once pushed, removing `test` from `dev`'s ancestry requires **deliberate history rewriting**:
resetting `dev` back to `0f17612a`, force-pushing, and repairing every clone and worktree that had
already fetched the merge.

That is a shared-history rewrite. **It must never be an agent's own decision** — it requires
explicit maintainer approval, coordination with anyone holding a clone, and awareness that
`deploy-pixi.yml` will have already deployed from the merged state.

**Practical guidance:** treat the push as the point of no return. Everything reversible happens
before it. This is not a reason to avoid the operation — establishing this ancestry is the
*intended, desired* permanent outcome — but it is a reason to run every gate in §5 first.

### Safety net

`git reflog` retains the pre-merge position for the default 90 days:

```bash
git reflog show dev | head
```

---

## 7. What will be checked after the operation

### Immediately, locally (blocking — see §5)

1. `git diff --quiet 0f17612a HEAD` exits 0 (no content difference at all).
2. `dev` tree hash equals `8f44d33600898b6b97428d2dd75d462b3e0f7c73`.
3. `HEAD^1` equals `0f17612a...` (pre-merge `dev`).
4. `HEAD^2` equals `b0ef9ed5...` (`test`).
5. `git merge-base --is-ancestor b0ef9ed5 HEAD` exits 0; likewise for `origin/main`.
6. `origin/test` still points at `b0ef9ed5` — no `dev` work promoted.
7. Working tree still shows only the two untracked planning documents.

### Before any push — decisions to confirm with the maintainer

- **Pushing `dev` triggers `deploy-pixi.yml`**: a full `npm ci` -> test -> lint -> build ->
  `gen:db` -> publish to `/autostich/pixi/`. It shares the non-cancelling `gh-pages-publish`
  concurrency group. Pushing `dev` is not a free operation.
- **The suite cannot be verified locally first**: `node_modules/` is absent in this checkout, so
  npm test and npm run lint currently exit 1. Since the merge changes **no tracked files**,
  the content CI will see is byte-identical to what `dev` already deployed, so the risk is low —
  but this is an inference, not a local test run.
- **The push is the point of no return** (see §6).

### After a push (if approved)

1. GitHub Actions: confirm the `deploy-pixi.yml` run for `dev` completed and was not queue-dropped
   by the shared `gh-pages-publish` concurrency group.
2. Re-run the §2 invariant against refreshed remote refs:

```bash
   git fetch origin
   git merge-base --is-ancestor origin/main origin/test   # must exit 0
   git merge-base --is-ancestor origin/test origin/dev    # must now exit 0
```

3. Confirm the chain reads as one ancestry line: `main` -> `test` -> `dev`.
4. Confirm `origin/test` still points at `b0ef9ed5` — no `dev` work was promoted.
5. **Confirm the contract is now enforceable**: a future `git merge --ff-only dev` on `test` would
   succeed. This can be checked without performing it — with the invariant restored,
   `git merge-base --is-ancestor origin/test origin/dev` succeeding *is* the fast-forward condition.

### Follow-up work unblocked by this (separate tasks, not part of it)

- Decide the fate of `Autostich/pixi` and its 5 unmerged art commits.
- Rename `deploy-pixi.yml` -> `deploy-dev.yml`.
- Record the §2 branch contract in `AGENTS.md` once it exists, so it binds every agent vendor.
- Update the stale branch sections of `CLAUDE.md` and `README.md`
  (both still reference the removed `Autostich_Test` branch).
