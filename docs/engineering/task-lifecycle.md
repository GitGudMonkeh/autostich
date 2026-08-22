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
| Visual review (§8, V1–V4) | when pixels move — reduced scope | when pixels move — full scope | **always**, and repeated per design iteration |
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
| **Start** | Before implementation | Scope and tier; the decision block's questions (§4); whatever the House rules reserve — a new glyph, a new dependency; and, where pixels will move, which state the V1 baseline captures |
| **End** | Before integration | The V3 visual gate (§8) and the integration authorization (§10), answered together |

A question that could have waited for one of those two stops and was raised on its own instead is a
defect in the process, not diligence.

**Not stops:** technical choices (`AGENTS.md` — *Decision authority*), committing and pushing the
task's own branch (`AGENTS.md` — House rules), and anything the planning report itself marked
non-blocking.

---

## 3. Tier A — standard task

```text
task note -> branch -> [V1 baseline, if pixels will move] -> implement -> gates
  -> self-review
  -> [V2 capture -> V3 human visual gate -> V4 classification, if pixels moved]
  -> integrate -> cleanup
```

**Task note.** Ten to twenty lines, in the branch's first commit message or an uncommitted scratch
file: goal, non-goals, expected file surface, known hazards, done criteria. It exists so that "what
was I supposed to change" has an answer that is not the diff.

**Self-review** means reading the whole diff against the note before integrating — not re-reading the
code you just wrote.

**Conditional visual gate.** If the change moves pixels, Tier A runs the **whole** §8 lifecycle —
V1 baseline, V2 capture, V3 human review gate, **and V4 classification.** What shrinks is the
*scope*, never the set of steps: the affected screen at the sizes that matter, rather than a full
capture set. A Tier A change that skips V1 is the one that makes "was it always like that"
unanswerable a week later, and one that skips V4 turns a real finding back into a chat message.

**Where Tier A records V4.** In the **task note or the handoff** — Tier A has no workstream
directory, and it does not get one for this. The classification table from §8 is written inline
there; findings that leave the task still get a backlog ID, exactly as in the higher tiers. The
recording surface is smaller; the requirement is identical.

If the change moves no pixels, V1–V4 do not apply.

No planning report, no workstream directory, no evidence beyond the gate output.

---

## 4. Tier B — feature workstream

```text
planning session -> planning report -> task contract -> branch + worktree
  -> [V1 baseline, if pixels will move]
  -> implementation -> gates
  -> [V2 capture -> V3 human visual gate -> V4 classification, if pixels moved]
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

**The visual gate sits before integration**, and its findings are classified there (§8) — and before
any independent review, where one was requested. The baseline (V1) is taken **after the worktree
exists and before implementation begins** — that is the only point at which the "before" state is
still real.

---

## 5. Tier C — large UI / architecture workstream

Everything in Tier B, plus:

- A **feature integration branch** with `task/*` branches below it (`git-workflow.md` §3, §8).
- A **measurement task as a named deliverable**, not a bullet inside the implementation task. If
  proving the work correct is a sub-bullet, it is the thing that gets cut under time pressure.
- **V1 and V2 as full capture sets** — every affected screen, at every canonical viewport size, DPR
  recorded. Tier C is where the baseline is least optional: a multi-screen redesign has no other way
  to tell a regression from a pre-existing quirk.
- **V3 run again after every design iteration**, each round producing its own V2 and its own
  classification. One review at the end of a Tier C workstream reviews the last change, not the work.
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
| Identity | Branch, **base SHA** (a SHA, not a branch name), owner, concurrency rule — and a reviewer only where an independent review was requested |
| Local workspace | Worktree path, preview port, the exact server invocation |
| Scope | The parts, in the order they must happen |
| Non-goals **and tripwire** | What is out of scope, and the signal that a rejected approach has crept back in |
| Approved architecture | Binding statements, not suggestions |
| Task-specific inputs | Sizes, screens, data — whatever the work is measured against |
| Acceptance gate | The single criterion that decides success or failure |
| Expected file surface | Indicative. Anything outside it is recorded and reported before it is changed — not blocked on an owner answer unless the departure is itself a scope change |
| Known hazards | See §11 — each must be resolved before handoff |
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

Always commit the **metadata and the classification table** — small, diffable, and carrying the actual
claims.

Commit **captured images only when they are the evidence**, that is when the finding is visual and a
reader must see it to judge it. Otherwise keep them regenerable, which is only honest if the
generating script is committed and deterministic.

**The same test governs generated data** — geometry dumps, survey matrices, measurement JSON. Commit
the table that carries the claim, not the machine output behind it, unless a reader must see the raw
rows to judge the finding. Captured output is heavy and permanent: `viewport-1280` committed 11 MB of
evidence, one file of which is 268,070 lines, and Git keeps it for good. Decide per workstream rather
than by habit.

---

## 8. Visual review

Autostich is a visual product. The test suite does not render the UI and cannot see a visual
regression (`testing.md` §10). Visual review is therefore a **gate, not a courtesy** — it has caught a
defect that passed every automated layer.

**This is the canonical flow. Every tier that moves pixels follows it**, differing only in how much
is captured, never in which steps happen.

```text
V1  pre-change baseline capture      <- BEFORE the first pixel moves
      |
    implementation + gates
      |
V2  post-change capture              <- same sizes, same DPR, same state as V1
      |
V3  human visual review gate         <- a person compares V1 and V2
      |
V4  classification                   <- every finding gets a row and an ID
      |
    fix tasks, for defects only
```

### V1 — pre-change baseline capture

**Taken before implementation starts, not reconstructed afterwards.** A review that sees only the
"after" cannot separate "this change did it" from "it was always like that", and reconstructing a
baseline from a reverted working tree is exactly when the wrong state gets captured.

Record the sizes, the DPR and the application state, because V2 has to match them. **Which state to
capture is asked at the *Start* stop** (§2), together with everything else the owner settles there —
not as a round of its own once the worktree exists.

### V3 — human visual review gate

**A person looks at the screens. Judgement stays human.** Tooling captures, diffs and attributes
differences; it does not decide whether a layout is good, and **an agent must not report a visual
result as approved.**

This is a gate: **the work does not proceed to integration until it has been passed**, and its
findings are classified first. Where an independent review was requested, classification also spares
the reviewer re-litigating something already known to be out of scope.

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

## 10. Integration and cleanup

Integration mechanics, promotion and ancestry diagnosis are `git-workflow.md` §11–§13. At lifecycle
level only two things matter.

**Integration is authorized, not assumed.** Readiness is a precondition, not the decision — the
authorization is separate and explicit. It is asked **together with the visual gate**, as the single
*End* stop in §2, not as a further round after it.

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

## 11. Two standing rules

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

## 12. Provenance

The tiers and rules above are generalized from the first two workstreams that ran end to end: the
agent instruction refactor (`docs/workstreams/setup/`) and the Desktop Viewport Harness
(`docs/workstreams/viewport-harness/`). The contract shape in §6 is that workstream's contract; the
classification table in §8 is the one its validation actually used.

Those are historical records of particular tasks, not standing instruction. This document states the
current rules.
