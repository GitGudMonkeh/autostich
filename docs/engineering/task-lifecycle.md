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

## 2. Choosing a tier, and where the owner is needed

| | **A — Standard task** | **B — Feature workstream** | **C — Large UI / architecture workstream** |
| --- | --- | --- | --- |
| Shape | Known file surface, no architectural fork | A real design choice, or a new seam | A new layout or architecture across several screens |
| Planning report | no | yes, **with rejected options** | yes |
| Task contract | short note | full | full, one per task |
| Workstream directory | no | yes | yes |
| Measurement / proof task | no | when the central claim needs proof | yes, as a first-class deliverable |
| Independent review | optional, risk-based | optional, risk-based | optional, risk-based |
| Branch shape | one branch off `dev` | one branch off `dev` | `feature/*` with `task/*` below it |

**Tier A is the default.** A task is Tier A unless one sentence says why it is not, written where the
task starts — the task note, or the message that sets the work going. No sentence, no apparatus.

Escalating later costs one planning session. Starting one tier too high costs the whole apparatus on
work that never needed it, and nobody notices, because the result looks thorough either way.

A tier follows from the *shape* of the work, not its size in lines. It is Tier B when the work makes
a design choice that outlives it — a one-line breakpoint change qualifies, because the number becomes
the rule. It is Tier A when it carries out a decision already taken, however many files that touches.

### The owner's two stops

Across every tier the owner is stopped **twice**. The rest of the lifecycle runs without them.

| Stop | When | Settled in one pass |
| --- | --- | --- |
| **Start** | Before implementation | Scope and tier; the decision block's questions (§4); whatever the House rules reserve — a new glyph, a new dependency |
| **End** | Before integration | The integration authorization (§9) |

A question that could have waited for one of those two stops and was raised on its own instead is a
defect in the process, not diligence.

**Not stops:** technical choices (`AGENTS.md` — *Decision authority*), committing and pushing the
task's own branch (`AGENTS.md` — House rules), and anything the planning report itself marked
non-blocking.

---

## 3. Tier A — standard task

```text
task note -> branch -> implement -> gates
  -> self-review
  -> integrate -> cleanup
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
  -> implementation -> gates
  -> evidence package
  -> [independent review -> review fixes, if one was requested]
  -> integration -> cleanup
```

**Planning report.** Its value is the **rejected** options and the reasons they were rejected — not
the description of the chosen one. A report that lists only the approach taken has recorded nothing
the code will not show. It should also name the one decision that cannot be corrected cheaply later,
so that decision gets made deliberately rather than by default.

**Nothing is implemented until the owner has settled the report's blocking open questions** — where
an open question is a product, design, gameplay, priority or scope question (`AGENTS.md` — *Decision
authority*). A technical question is not an open question: it is resolved in the report with the
rejected options recorded, or named explicitly as a decision delegated to the worker.

**The owner-facing part is a decision block at the top of the report, and it is short.** A few lines
on what is being built, then the questions the owner must answer — **at most three, 400 words for the
whole block**. Each carries a recommended answer and its reason, so that silence is an answer and
only disagreement costs a round trip. A question the report marks non-blocking is recorded further
down, not raised here. This block is the *Start* stop from §2: owner gates are settled in it, not
discovered in review — a new glyph and a new dependency are reserved by the House rules, and a
responsive breakpoint change moves visible layout and is the owner's under `AGENTS.md` — *Decision
authority*.

**Everything below the decision block is written for whoever implements and reviews the work.** Its
length is not capped and the owner is not expected to read it. A report that buries two owner
questions inside five thousand words has not asked them; it has hidden them.

---

## 5. Tier C — large UI / architecture workstream

Everything in Tier B, plus:

- A **feature integration branch** with `task/*` branches below it (`git-workflow.md` §3, §8).
- A **measurement task as a named deliverable**, not a bullet inside the implementation task. If
  proving the work correct is a sub-bullet, it is the thing that gets cut under time pressure.
- A **downgrade record** for any acceptance criterion reduced during the work (§10).

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
| Identity | Branch, **base SHA** (a SHA, not a branch name), owner, concurrency rule — and a reviewer only where an independent review was requested |
| Local workspace | Worktree path, preview port, the exact server invocation |
| Scope | The parts, in the order they must happen |
| Non-goals **and tripwire** | What is out of scope, and the signal that a rejected approach has crept back in |
| Approved architecture | Binding statements, not suggestions |
| Task-specific inputs | Sizes, screens, data — whatever the work is measured against |
| Acceptance gate | The single criterion that decides success or failure |
| Expected file surface | Indicative. Anything outside it is recorded and reported before it is changed — not blocked on an owner answer unless the departure is itself a scope change |
| Known hazards | See §10 — each must be resolved before handoff |
| Definition of done | Checkboxes, ticked only when true |

Two properties make a contract work, and both are cheap:

1. **Naming the must-not-touch files** makes scope compliance verifiable by blob hash rather than by
   inspection. A reviewer can prove a file did not change instead of reading it.
2. **A tripwire converts a judgement call into a stop signal.** "If the diff starts touching this
   file, stop" is enforceable at a glance; "be careful with this file" is not.

---

## 7. Evidence package

The evidence package states what was proven, how, and **what was not proven**. It is what makes the
work checkable by anyone who did not do it — the integrator, the owner, or an independent reviewer
where one was requested. It is required on its own terms, not because a review is coming.

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

Always commit the **metadata and the tables that carry the claims** — small and
diffable.

Commit **captured images only when they are the evidence**, that is when the finding is visual and a
reader must see it to judge it. Otherwise keep them regenerable, which is only honest if the
generating script is committed and deterministic.

**The same test governs generated data** — geometry dumps, survey matrices, measurement JSON. Commit
the table that carries the claim, not the machine output behind it, unless a reader must see the raw
rows to judge the finding. Captured output is heavy and permanent: `viewport-1280` committed 11 MB of
evidence, one file of which is 268,070 lines, and Git keeps it for good. Decide per workstream rather
than by habit.

---

## 8. Handoff to independent review

**Only when an independent review was requested.** Review is optional and risk-based
(`AGENTS.md` — *Independent review*); a task that was not sent for review produces no handoff, and
its absence is not a gap. Reviewer scope, and where findings return to, are `git-workflow.md` §9.

A handoff carries:

- what was agreed — a pointer to the contract, not a restatement of it,
- the evidence package (§7),
- **known state the reviewer will hit**, including pre-existing failures not caused by this work, with
  the measurement that shows it,
- **open questions** — **reviewer-directed**: decisions the owner deferred, and the worker's own
  uncertainties, stated as questions rather than hidden as defects. A question that needs an owner
  decision belongs in the contract's *Open questions*, not here,
- a suggested reading order.

A handoff with no open questions is usually one that has not looked hard enough.

### Review type

The canonical rule is `AGENTS.md` — *Independent review*. This section is how a requested review is
run.

Every handoff states its type in one line. A reviewer who cannot find one treats the review as
**full**, which is the conservative default.

| Type | When | What it examines |
| --- | --- | --- |
| **Full** | The first independent review of the workstream | The whole agreed scope |
| **Closure** | Every review after it | The named open findings, and regressions caused by their fixes |

### Full review

Examines the agreed scope and returns blocking findings, non-blocking findings, an approval, or
changes requested. **Non-blocking findings are recorded as follow-ups when they are raised**, not
left to be rediscovered in a later round — that is what turns one review into many.

### Closure review

The handoff **names the open finding IDs** it is asking about. The review answers, per ID, closed or
not closed, and then one further question: did these fixes cause a regression. Nothing else is
required of it, and areas already confirmed sound are not re-examined.

A closure review that returns "closed, closed, no regression" is an **approval**.

### New findings during a closure review

A new finding may block the workstream again only where it was **created by the current fix**, or is
a **genuine blocker** — a correctness defect, data loss, a security problem, a broken build or test
suite, or a violated project invariant.

Everything else is a **follow-up**: recorded, not blocking. Follow-ups go where the workstream's
record already goes — the handoff or the contract — and become their own task through `/create-task`
if they should outlive the workstream. No new document and no backlog system is created for them.

### Review budget

The numbers are canonical in `AGENTS.md` — *Independent review*; what follows is how they are applied.

One full review plus one closure review is the normal case. A further closure round is permitted only
where a known blocking finding is still unfixed, or its fix caused a new regression. **There is no
second full review.**

The budget is a ceiling on process, not on judgement: a genuine blocker found late is still a
blocker. What the budget forbids is re-opening settled scope to look for more.

---

## 9. Integration and cleanup

Integration mechanics, promotion and ancestry diagnosis are `git-workflow.md` §11–§13. At lifecycle
level only two things matter.

**Integration is authorized, not assumed.** Readiness is a precondition, not the decision — the
authorization is separate and explicit. It is the single *End* stop in §2.

**What readiness means** is `AGENTS.md` — *Independent review*: scope and contract met, required
validation and evidence present with the relevant gates passed, branch clean and committed, known
blockers resolved or documented. **An independent review is not among those conditions** unless one
was requested for this task.

**Run the cleanup audit at the start of the next task, not the end of the last one.** The end of a
task is when attention is lowest, which is exactly why cleanup is the step that does not happen.
Before creating a new worktree, list the existing worktrees and the branches already contained in
their integration base, and clear them. Deletion rules and their safety checks are `git-workflow.md`
§20; a remote branch still needs explicit approval.

---

## 10. Two standing rules

### Every hazard named in the contract must be resolved before integration

A hazard listed in the contract's hazards section is a prediction. Before the work is integrated —
and before any review handoff, where one was requested — each one is marked **measured**, **not
measured, and why**, or **not applicable**.

A hazard named and then left open is a question the contract already paid for and then threw away.
It surfaces later — in integration, in a requested review, or in production — at a worse moment and
at a higher price.

### A reduced acceptance criterion needs a downgrade record

If a criterion is dropped, deferred, or replaced by something weaker, record it as one line in the
Definition of Done: what was promised, what was delivered instead, who decided, and what gap
therefore remains.

Prose in a report is not enough. The Definition of Done is where someone looks when they ask whether
the work is finished, and an untouched checkbox beside a quietly downgraded criterion is the failure
mode this rule exists to prevent.

---

## 11. Provenance

The tiers and rules above are generalized from the first two workstreams that ran end to end: the
agent instruction refactor (`docs/workstreams/setup/`) and the Desktop Viewport Harness
(`docs/workstreams/viewport-harness/`). The contract shape in §6 is that workstream's contract.

Those are historical records of particular tasks, not standing instruction. This document states the
current rules.
