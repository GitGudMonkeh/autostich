---
description: Assemble the handoff for a deliberately requested independent review, from a task contract and its diff
argument-hint: <contract-path> [--base <sha>] [--head <sha>] [--run-gates] [--closure <finding-ids>]
allowed-tools: Bash(git rev-parse:*), Bash(git merge-base:*), Bash(git log:*), Bash(git diff:*), Bash(git cat-file:*), Bash(git status:*), Bash(git branch:*), Bash(git -C:*), Bash(MSYS_NO_PATHCONV=1 git:*), Bash(npm test:*), Bash(npm run:*), Bash(npx vitest run:*), Read, Grep, Glob, Write
disable-model-invocation: true
---
Assemble the evidence package and the reviewer handoff for one task, from its contract and its diff,
and write `review-handoff.md` beside the contract.

**Independent review is optional and risk-based** (`AGENTS.md` — *Independent review*). This command
is for a review that was deliberately requested; it is not a step every task passes through, and a
task that produces no handoff is not thereby incomplete.

**You prepare for a reviewer. You are not the reviewer.** Nothing you produce is an assessment,
an approval, or a verdict on the work. Every fact in the document is one you measured in this
session, or it is marked as a gap.

Rules are cited, not restated. The evidence package and the handoff are
`docs/engineering/task-lifecycle.md` — *Evidence package* and *Handoff to independent review*. Hazard
and downgrade rules are the same document — *Two standing rules*. The visual gate is the same
document — *Visual review*. Reviewer scope is `docs/engineering/git-workflow.md` — *Reviewer
ownership*. Gates and reporting honesty are `AGENTS.md` — *Validation gates* and *House rules*. Where
this file and those disagree, those win.

Arguments: `$ARGUMENTS` — first positional is the contract path; `--base <sha>` and `--head <sha>`
override the derived range; `--run-gates` opts into running the gates in this session; `--closure`
names the open finding IDs and makes this a closure handoff (`AGENTS.md` — *Independent review*).

---

## Prohibitions

These bind for the whole command. The `allowed-tools` list is only a first line of defence.

- **Never state a review outcome**, and never write a sentence that implies approval, sign-off,
  readiness, or that the work is good. You are assembling input to a review that has not happened.
- **Never claim a gate result you did not observe in this session.** A result written in the
  contract, in an evidence package, in a commit message, or earlier in this conversation is a **prior
  claim**, not a gate result. Quote it as such, attributed, or leave the row *not run*.
- **Never pipe a gate command** (`AGENTS.md` — *Validation gates*). Bare commands only.
- **Never resolve a hazard.** You may demand a status and report where one is already written down.
  You may not decide one.
- **Never classify a visual finding.** V3 and V4 are human (`task-lifecycle.md` — *Visual review*).
  You may report that captures exist and whether they are committed; never what they show.
- **Never claim scope compliance for an entry you could not hash.** Print it in its own row as
  `not mechanically verifiable — reviewer must judge`.
- **Never edit anything** — not source, not tests, not the contract, not a rule document, not the
  diff. Your only write is one new file at a path that does not exist.
- **Never `push`, merge, rebase, promote, open a pull request, delete, or use a force flag** — in any
  form, executed or printed as executable.
- **Never omit the open-questions section.** See step 12.

---

## Step 0 — state the posture and the review type

Open the report with one line: this prepares a handoff, it does not review, it approves nothing, and
every gate row states whether it was run in this session.

Then state the **review type**, which the handoff must carry unambiguously
(`AGENTS.md` — *Independent review*, `task-lifecycle.md` §9):

- **Without `--closure`: `Review Type: Full`.** The reviewer may examine the whole agreed scope.
- **With `--closure <ids>`: `Review Type: Closure`.** Reproduce the IDs verbatim and put the closure
  questions at the top of the document: per ID, closed or not closed; then, did these fixes cause a
  regression. State that settled scope is not reopened and that a new finding blocks only where the
  current fix created it or it is a genuine blocker.

**You do not decide the review type**, and never infer it from how many rounds you can see in the
workstream. It is `--closure` or it is full.

## Step 1 — parse the arguments

| Argument | Required | Meaning |
| --- | --- | --- |
| `<contract-path>` | yes | path to a `task-contract.md`, absolute or repo-relative |
| `--base <sha>` | no | overrides the base; default is the SHA recorded in the contract's Identity section |
| `--head <sha>` | no | overrides the head; default is `HEAD` of the worktree the contract names |
| `--run-gates` | no | run the gates in this session; without it, every gate row reads *not run* |
| `--closure <finding-ids>` | no | comma-separated open finding IDs. Its presence makes the handoff **Review Type: Closure**; without it the handoff is **Review Type: Full** |

**Stop, writing nothing, if** the contract path is absent, or does not exist on disk. Name what was
missing. Never search for "a likely contract" and never proceed against a default path — the contract
is the binding scope statement and picking one is not a derivation.

Note the worktree the contract lives in: run every `git` command below with `git -C <that worktree>`,
because the contract's branch is usually not checked out where this command was invoked.

## Step 2 — locate the contract's sections

Read the contract. Locate these sections **by name**, in the spelling of
`task-lifecycle.md` — *The task contract*: Identity, Local workspace, Scope, Non-goals and tripwire,
Approved architecture, Task-specific inputs, Acceptance gate, Expected file surface, Known hazards,
Definition of done.

Match the **name stem**, tolerating a leading `1.`-style number and trailing qualifiers — a real
contract in this repository heads its hazards section *Known hazards carried into T1*, and an exact
match would report it absent. **Print which heading you matched for each name**, so a wrong match is
visible rather than silent.

A name with no match is **`section absent`**. Record it, carry it into the document, and continue.
Never substitute a default, never infer the content from another section, and never quietly drop the
row (design coupling rule 2 — every parse degrades loudly).

## Step 3 — resolve the range to SHAs

Base: `--base`, else the SHA in the Identity section. Head: `--head`, else:

```bash
git -C <worktree> rev-parse HEAD
```

Resolve both to full 40-character SHAs:

```bash
git -C <worktree> rev-parse --verify <base>
git -C <worktree> rev-parse --verify <head>
```

**Either fails to resolve → abort**, naming which. If the Identity section records a branch name
rather than a SHA, say so plainly and resolve it, marking the base *inferred from a branch name —
the branch may have moved*. The document quotes SHAs, never branch names
(`task-lifecycle.md` — *Evidence package*), so that the range survives branch deletion.

## Step 4 — verify the range is real

```bash
git -C <worktree> merge-base --is-ancestor <base-sha> <head-sha>
```

**Non-zero → abort. Write nothing.** The base is not an ancestor of the head, which means a rebase or
a force-push has happened, and every count, hash and diff below would be fiction. Report both SHAs,
state that the intended range is now a human decision, and stop. Do not guess a merge base, do not
fall back to `origin/dev`, and do not emit a partial handoff.

## Step 5 — range facts

```bash
git -C <worktree> log --oneline --no-decorate <base-sha>..<head-sha>
git -C <worktree> diff --shortstat <base-sha> <head-sha>
git -C <worktree> diff --stat <base-sha> <head-sha>
```

Record the commit list, the file count, and insertions/deletions. Also record whether the worktree is
clean:

```bash
git -C <worktree> status --porcelain
```

Non-empty means the head commit is **not** the state the worker is looking at. Say so, and list the
paths — a reviewer reading a range that excludes uncommitted work needs to know that.

## Step 6 — push state

```bash
git -C <worktree> branch -r --contains <head-sha>
```

Empty output means the head is on no remote branch. Emit the handoff anyway, flagged prominently:
**a reviewer cannot fetch this range yet** (`git-workflow.md` — *Pushing and durable state*). Do not
push it, and do not suggest that you could have.

## Step 7 — scope compliance, by object hash

Take the must-not-touch list from the *Expected file surface* section.

**One list item may carry several entries.** A real contract in this repository writes
`` `AGENTS.md`, `CLAUDE.md` `` and `` `package.json`, `package-lock.json`, `vite.config.js`,
`eslint.config.js` `` as single bullets. Split on the commas and treat each path as its own entry, or
the check silently covers the first path in each bullet and reports the rest as verified when they
were never looked at. Strip the trailing prose a bullet may carry — `` `test/**` — the tripwire ``
is the entry `test/**` plus a comment.

Classify **every** entry — none is dropped:

| Entry shape | Treatment |
| --- | --- |
| A file path | compare its **blob** hash at base and head |
| A directory, or a path ending in a trailing `/**` wildcard | strip the wildcard and compare its **tree** hash at base and head |
| A wildcard that is not trailing (`src/**/*.jsx`), a prose constraint ("the run-screen layout"), or a pointer into another document | `not mechanically verifiable — reviewer must judge` |

Use `--verify` on every comparison:

```bash
MSYS_NO_PATHCONV=1 git -C <worktree> rev-parse --verify "<base-sha>:<path>"
MSYS_NO_PATHCONV=1 git -C <worktree> rev-parse --verify "<head-sha>:<path>"
```

**`--verify` is not optional, and this is the reason.** Without it, `git rev-parse` echoes an
argument it cannot resolve and **exits 0** — measured, on a wildcard entry. The exit code therefore
tells you nothing, and the entry lands in one of two wrong rows depending on how you compare the
output: reported *changed* when nothing changed, or reported *unchanged* when nothing was checked.
With `--verify`, every unresolvable argument exits 128 with empty stdout. Treat any stdout that is
not a 40-character hex string as a failed resolution regardless of exit code, and never read a failed
resolution as a result.

`MSYS_NO_PATHCONV=1` is required because `revision:path` is the argument shape MSYS mangles
(`CLAUDE.md` — *Platform note*). On Linux it is harmless.

Then, per entry:

- **Both resolve and are equal** — `unchanged`, with the hash and whether it is a blob or a tree
  (`git cat-file -t`). A tree hash proves the whole subtree byte-identical, recursively, including
  that nothing was **added** into it.
- **Both resolve and differ** — `CHANGED`. This is a scope breach unless the contract permits it.
  **Report it; do not judge it.** Name the files with
  `git -C <worktree> diff --name-status <base-sha> <head-sha> -- <path>`.
- **Resolves at one end only** — the path was added or removed in the range. Report which, with the
  hash that exists.
- **Neither resolves** — `path not present at either end — nothing to verify`, which is a fact about
  the contract's list, not a pass.

Print the reproduce command for the whole check, so the reviewer can re-run the claim rather than
trust it. If the *Expected file surface* section is absent, or contains no must-not-touch list, state
that scope compliance **could not be verified by hash, and why**. Do not substitute a diff summary:
a list of what changed is not a proof that something did not.

## Step 8 — hazards

Take the *Known hazards* section. Emit **one row per hazard**, with the hazard text quoted
**verbatim**, including its ID.

Three columns:

| Column | Filled by | Content |
| --- | --- | --- |
| Hazard | you | verbatim from the contract |
| Status at handoff | **the worker** | an unticked triplet — *measured* / *not measured, and why* / *not applicable* |
| Recorded elsewhere | you | a verbatim quote with `file:line`, or `none found` |

**The status column is always unset.** A contract's hazards table often carries its own status column
— *status at planning*, or similar. That is a different claim at a different time: a hazard measured
at planning may have been invalidated by the implementation that followed. Quote it in the *Recorded
elsewhere* column, attributed and located, and **never promote it into the handoff status.**
`task-lifecycle.md` — *Two standing rules* requires the status before handoff, and only the worker
can supply it.

Search for recorded statuses in the contract and in any evidence package in the same workstream
directory. Count the hazards with **no** recorded status anywhere: that count drives the outcome in
step 13, and it is stated in the document's opening notice.

## Step 9 — gates

**Without `--run-gates`:** every gate row reads `not run in this session — no result`. That is the
whole row. If the contract or an evidence package records a result, it may appear in a separate
*prior claims* column, quoted verbatim with its source and date, and labelled as a claim you did not
verify.

**With `--run-gates`:** run them from the contract's worktree, in the order `AGENTS.md` —
*Validation gates* gives, **unpiped**, and record the real exit code of each:

```bash
npm test
npm run lint -- --max-warnings=0
npm run build
npm run gen:db
```

Add `npm run loc:export` when the diff touches `src/i18n/**` or any player-visible text, and both
build variants when the diff touches preview-gated code — `AGENTS.md` names when each applies; do not
decide it from habit.

**Both-results rule for `npm test`.** On the Windows host a full-suite failure may be a load artifact
(`NEW_MACHINE_SETUP.md` — *Windows: full-suite timeouts are a load artifact*). For every failing
file, also run it in isolation and **report both results**, distinguishing a timeout from an
assertion failure. One result alone is not reportable.

A gate you started and could not finish is `not run` — never `passed`. Never report a gate as passing
unless the real command completed successfully.

## Step 10 — definition of done

From the *Definition of done* section, list **every unticked box, verbatim**, with the count. Do not
summarize them, do not reorder them into something tidier, and do not omit one because its
accompanying text explains why it is unticked — that explanation is exactly what the reviewer needs
to weigh.

Also carry the **downgrade record** verbatim if the section has one
(`task-lifecycle.md` — *Two standing rules*). If a criterion was reduced and no record exists, say
that the record is missing. Do not write one.

## Step 11 — evidence state

Locate the workstream directory's evidence, if any. Report:

- which evidence documents exist, by path;
- whether any captured images are committed or uncommitted
  (`git -C <worktree> status --porcelain <evidence-dir>`);
- the count and total size of image files.

Apply `task-lifecycle.md` — *Committing evidence*: metadata and classification tables are always
committed; images only when they **are** the evidence. **Report the state and cite the rule. Decide
nothing**, and never say what an image shows.

## Step 12 — write the handoff

Path: `review-handoff.md`, in the same directory as the contract.

**If that path already exists, write nothing.** Print the document in the report instead and name the
collision. You have no `Edit` tool and you never overwrite.

The document follows the shape of the existing handoff in
`docs/workstreams/viewport-harness/codex-review-handoff.md`. Sections you can measure, you fill.
Sections that carry judgement are a heading plus `TODO — <what is needed>`, naming what the worker
must supply. A plausible guess in any of them reads as a claim nobody made.

| Section | Filled by |
| --- | --- |
| Opening posture — independent assessment only, findings return to the worker, do not implement | you, citing `git-workflow.md` — *Reviewer ownership* |
| Blocking notice — open hazard count, unticked DoD count, push state | you |
| **Review type** — `Full` or `Closure`; when closure, the open finding IDs, verbatim from `--closure` | you |
| Header table — context, branch, **diff range as SHAs**, size, gate summary | you |
| Commit list | you |
| What was agreed — a **pointer** to the contract, plus its *Acceptance gate* quoted verbatim | you |
| The claims to check | `TODO` — the worker states what a reviewer should press on |
| Scope compliance — step 7's table and reproduce command | you |
| Gate results — step 9's table | you |
| Hazards — step 8's three-column table | you, status column unset |
| Definition of done — unticked boxes and any downgrade record | you |
| Evidence and its limits — what exists; **which screens, which host, what was not covered** | you for the file state, `TODO` for the limits |
| Known state a reviewer will hit — push state, dirty worktree, pre-existing failures | you for what you measured, `TODO` for the rest |
| **Open questions for the reviewer** | `TODO` — **mandatory, never omitted** |
| Suggested reading order | `TODO` |
| Provenance — generated by `/prepare-review`, the date, and what it did not verify | you |

**The open-questions section is mandatory.** Where there genuinely are none, the only permitted
content is: *None after checking hazards and deferred decisions.* An absent section is not an option
— `task-lifecycle.md` — *Handoff to independent review* notes that a handoff with no open questions
is usually one that has not looked hard enough.

Mark every claim by category — measured, observed, inferred, proposed (`AGENTS.md` — *House rules*).
A hash you compared is measured. A verdict drawn from it is inferred. A generated handoff that reads
as uniformly confident is worse than one that marks its own soft spots.

## Step 13 — output

In this order:

**A. What was read** — the contract path, and the step-2 section map, including every
`section absent`.

**B. The range** — base and head as full SHAs, the ancestry check with its exit code, the commit
list, the size, and the worktree's clean/dirty state.

**C. Scope compliance** — the step-7 table, including every `not mechanically verifiable` row.

**D. Gates** — the step-9 table, each row stating run-in-this-session or not-run.

**E. Hazards and done criteria** — the open-hazard count and the unticked-box count.

**F. What was written** — the handoff path, or the reason nothing was written. Never list a file you
did not create.

**G. What a human must do next** — the `TODO` sections to fill, the hazard statuses to supply, the
gates to run if they were not, and the push if the head is not on a remote.

**H. Outcome** — exactly one of:

- `PROCEED` — the document is written and every hazard has a recorded status;
- `PROCEED WITH BLOCKERS` — the document is written; name the count of hazards without a status and
  of unticked boxes;
- `ABORT` — the range was invalid (step 4) or the contract was missing (step 1); nothing was written.

State the class ceiling once: this command's ceiling is **class 1** — it creates one file at a path
that did not exist. Nothing was pushed, merged, deleted, approved or reviewed. Never describe planned
work as completed, and never report a check you did not run.
