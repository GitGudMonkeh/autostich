# Task Lifecycle

What happens in which order, and which artefact each step produces. Three tiers, so a bug fix does
not carry a workstream's ceremony and a workstream does not proceed on a bug fix's evidence.

This document describes the lifecycle. It does **not** describe Git.

---

## 1. Scope boundary

| Concern | Lives in |
| --- | --- |
| Branch creation, worktrees, promotion, cleanup commands | `docs/engineering/git-workflow.md` |
| Worker / integrator / reviewer ownership | `docs/engineering/git-workflow.md` §7–§9 |
| Gate commands, language policy, house rules | `AGENTS.md` |
| Ratchets, counter-checks, diagnosing a red suite | `docs/engineering/testing.md` |
| Machine prerequisites, ports, host conditions | `docs/engineering/NEW_MACHINE_SETUP.md` |
| **Step order, and what each step must produce** | this document |

**If a sentence could live in one of the first five, it belongs there and this document links to it.**
That rule is the only thing preventing this file from becoming a second copy of `git-workflow.md`.

---

## 2. Choosing a tier

| | **A — Standard task** | **B — Feature workstream** | **C — Large UI / architecture workstream** |
| --- | --- | --- | --- |
| Shape | Known file surface, no architectural fork | A real design choice, or a new seam | A new layout or architecture across several screens |
| Planning report | no | yes, **with rejected options** | yes |
| Task contract | short note | full | full, one per task |
| Workstream directory | no | yes | yes |
| Measurement / proof task | no | when the central claim needs proof | yes, as a first-class deliverable |
| Visual review | when pixels moved | when pixels moved | always, before **and** after |
| Independent review | optional | yes | yes |
| Branch shape | one branch off `dev` | one branch off `dev` | `feature/*` with `task/*` below it |

**When in doubt, pick the lower tier and escalate.** Escalating costs one planning session.
Over-scoping costs the entire ceremony on work that never needed it.

A tier follows from the *shape* of the work, not its size in lines. A one-line change to a breakpoint
is Tier B, because the decision is architectural.

---

## 3. Tier A — standard task

```text
task note -> branch -> implement -> gates -> self-review -> integrate -> cleanup
```

**Task note.** Ten to twenty lines, in the branch's first commit message or an uncommitted scratch
file: goal, non-goals, expected file surface, known hazards, done criteria. It exists so that "what
was I supposed to change" has an answer that is not the diff.

**Self-review** means reading the whole diff against the note before integrating — not re-reading the
code you just wrote.

No planning report, no workstream directory, no evidence beyond the gate output.

---

## 4. Tier B — feature workstream

```text
planning session -> planning report -> task contract -> branch + worktree
  -> implementation -> gates -> visual review -> evidence package
  -> independent review -> review fixes -> approval -> integration -> cleanup
```

**Planning report.** Its value is the **rejected** options and the reasons they were rejected — not
the description of the chosen one. A report that lists only the approach taken has recorded nothing
the code will not show. It should also name the one decision that cannot be corrected cheaply later,
so that decision gets made deliberately rather than by default.

**Nothing is implemented until the owner has settled the report's open questions.** House-rule gates
— a new glyph, a new dependency, a breakpoint change — are settled here, not discovered in review.

**Visual review comes before the independent review**, and its findings are classified first (§8). A
reviewer should not have to re-litigate a finding already known to be out of scope.

---

## 5. Tier C — large UI / architecture workstream

Everything in Tier B, plus:

- A **feature integration branch** with `task/*` branches below it (`git-workflow.md` §3, §8).
- A **measurement task as a named deliverable**, not a bullet inside the implementation task. If
  proving the work correct is a sub-bullet, it is the thing that gets cut under time pressure.
- **Before and after** capture sets, per screen, at every canonical viewport size.
- Visual review as a numbered gate with its own artefact, run again if the design iterates.
- A **downgrade record** for any acceptance criterion reduced during the work (§11).

Before splitting a Tier C workstream into parallel tasks, check the decision guide in
`git-workflow.md` §22 — it governs when tasks may run in parallel and when they must be serialized.

---

## 6. The task contract

The contract is the **binding scope statement**. Where it and a planning report disagree, the
contract wins.

Sections, in the order they are usually written. Refer to them by name, not by number — a contract
may add or drop a section, and a numeric citation from another document goes stale silently.

| Section | Purpose |
| --- | --- |
| Identity | Branch, **base SHA** (a SHA, not a branch name), owner, reviewer, concurrency rule |
| Local workspace | Worktree path, preview port, the exact server invocation |
| Scope | The parts, in the order they must happen |
| Non-goals **and tripwire** | What is out of scope, and the signal that a rejected approach has crept back in |
| Approved architecture | Binding statements, not suggestions |
| Task-specific inputs | Sizes, screens, data — whatever the work is measured against |
| Acceptance gate | The single criterion that decides success or failure |
| Expected file surface | Indicative. Anything outside it is surfaced before it is changed |
| Known hazards | See §11 — each must be resolved before handoff |
| Definition of done | Checkboxes, ticked only when true |

Two properties make a contract work, and both are cheap:

1. **Naming the must-not-touch files** makes scope compliance verifiable by blob hash rather than by
   inspection. A reviewer can prove a file did not change instead of reading it.
2. **A tripwire converts a judgement call into a stop signal.** "If the diff starts touching this
   file, stop" is enforceable at a glance; "be careful with this file" is not.

---

## 7. Evidence package

The evidence package is what makes independent review possible at all. It states what was proven, how,
and **what was not proven**.

Required:

- The diff range as **SHAs** — durable review documents quote SHAs, not branch names, so they survive
  branch deletion.
- Scope compliance, verified rather than asserted, with the command that reproduces it.
- Gate results, under the reporting rules in `AGENTS.md` (House rules).
- Every new guard's **counter-check**, recorded (`testing.md` §5). A guard that is merely green is not
  evidence.
- Reproduce commands, so a reviewer can re-run the claims instead of trusting them.
- **The limits of the evidence**, stated plainly: which screens, which host, which browser, and what
  was not covered.

`AGENTS.md` requires uncertainty to be reported by category. Apply it to the package as a whole: one
that reads as uniformly confident is less useful than one that marks its own soft spots.

### Committing evidence

Always commit the **metadata and the classification table** — small, diffable, and carrying the actual
claims.

Commit **captured images only when they are the evidence**, that is when the finding is visual and a
reader must see it to judge it. Otherwise keep them regenerable, which is only honest if the
generating script is committed and deterministic. Images are heavy and permanent; decide per
workstream rather than by habit.

---

## 8. Visual review

Autostich is a visual product. The test suite does not render the UI and cannot see a visual
regression (`testing.md` §10). Visual review is therefore a **gate, not a courtesy** — it has caught a
defect that passed every automated layer.

```text
baseline capture -> change -> capture -> human review -> classify -> fix tasks
```

**Capture a baseline.** A review that sees only the "after" cannot separate "this change did it" from
"it was always like that". Same sizes, same DPR, same state.

**Judgement stays human.** Tooling captures, diffs, and attributes differences. It does not decide
whether a layout is good, and an agent must not report a visual result as approved.

### Classification is a required output

Every finding lands in exactly one row:

| Classification | Disposition |
| --- | --- |
| Defect in this task | Fix task to the owning worker; regression guard added and counter-checked |
| Expected platform behaviour | Documented, no fix |
| Pre-existing, out of scope | Backlog entry with an ID |
| New design question | Backlog entry with an ID, named as input to a future workstream |

Only the first returns as work in this task.

### A finding is not a finding until it has an ID

A visual observation that exists only in a chat message is lost. Transcribe it — **verbatim, with a
date** — into the classification table, a backlog entry, or a fix task. That transcription is what
makes the decision durable; without it the workstream's most important review round leaves no trace.

---

## 9. Handoff to independent review

Reviewer scope, and where findings return to, are `git-workflow.md` §9.

A handoff carries:

- what was agreed — a pointer to the contract, not a restatement of it,
- the evidence package (§7),
- **known state the reviewer will hit**, including pre-existing failures not caused by this work, with
  the measurement that shows it,
- **open questions** — decisions the owner deferred, stated as questions rather than hidden as
  defects,
- a suggested reading order.

A handoff with no open questions is usually one that has not looked hard enough.

---

## 10. Integration and cleanup

Integration mechanics, promotion and ancestry diagnosis are `git-workflow.md` §11–§13. At lifecycle
level only two things matter.

**Integration is authorized, not assumed.** Gates green and review passed are preconditions, not the
decision.

**Run the cleanup audit at the start of the next task, not the end of the last one.** The end of a
task is when attention is lowest, which is exactly why cleanup is the step that does not happen.
Before creating a new worktree, list the existing worktrees and the branches already contained in
their integration base, and clear them. Deletion rules and their safety checks are `git-workflow.md`
§20; a remote branch still needs explicit approval.

---

## 11. Two standing rules

### Every hazard named in the contract must be resolved before handoff

A hazard listed in the contract's hazards section is a prediction. Before the review handoff each one
is marked
**measured**, **not measured, and why**, or **not applicable**.

Hazards that are named and then left open get found by the reviewer instead — a review round trip the
contract had already paid for in advance.

### A reduced acceptance criterion needs a downgrade record

If a criterion is dropped, deferred, or replaced by something weaker, record it as one line in the
Definition of Done: what was promised, what was delivered instead, who decided, and what gap
therefore remains.

Prose in a report is not enough. The Definition of Done is where someone looks when they ask whether
the work is finished, and an untouched checkbox beside a quietly downgraded criterion is the failure
mode this rule exists to prevent.

---

## 12. Provenance

The tiers and rules above are generalized from the first two workstreams that ran end to end: the
agent instruction refactor (`docs/workstreams/setup/`) and the Desktop Viewport Harness
(`docs/workstreams/viewport-harness/`). The contract shape in §6 is that workstream's contract; the
classification table in §8 is the one its validation actually used.

Those are historical records of particular tasks, not standing instruction. This document states the
current rules.
