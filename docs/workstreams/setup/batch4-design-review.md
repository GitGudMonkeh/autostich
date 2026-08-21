# Agent Workflow Evolution — Batch 4 Design Review

> **Status: approved, and partly implemented.** The documentation decisions in §4 are implemented;
> the commands in §5 and the subagents in §6 are **designed only** and deliberately not built.
> Implementation status is recorded in `agent-instructions-refactor-plan.md` §18.
>
> **Held 2026-08-21**, after the first two workstreams had run end to end: the agent instruction
> refactor itself and the Desktop Viewport Harness (#400).
>
> **Measurements below are dated.** They record the repository as it stood at the review, which is the
> point of keeping this file. Several have since been acted on — see §0. Do not read any measurement
> here as current state; verify against the repository.

The brief was deliberately narrow: **not** to design a perfect system, but to collect observed
friction, document the lifecycle that actually happened, and introduce only necessary automation.

---

## 0. State changes since the review

| Finding at review | Since |
| --- | --- |
| `origin/Autostich/pixi` held commits not in `dev` | **Deleted** by owner decision. Recorded SHA before deletion: `7c78dd38f4d71d5491480405a7cf92bc35582c6b` |
| `origin/test` far behind `origin/dev` | **Promoted.** `dev → test` fast-forwarded; trees verified identical. `test → main` deliberately not promoted |
| Merged task/feature branches outstanding | `task/viewport-harness` is gone; the four `feature/agent-instructions-refactor*` / `agents-post-migration-fix` branches remain, all fully contained in `dev` |
| Viewport evidence artefacts undecided | **Kept**, by owner decision |
| CI preview-exclusion step undecided | **Not added yet**, by owner decision |

---

## 1. The workflow as it actually ran

```text
Idea -> Planning session -> Planning report -> Task contract -> Branch + worktree
  -> Implementation -> Validation -> Evidence package -> Independent review
  -> Review fixes -> Approval -> Integration -> Cleanup
```

Two observations frame everything below.

**It is not slow.** The entire viewport-harness workstream — planning report, contract, implementation,
measurement, evidence, review handoff, review response — ran within a single day, in five commits.
The argument against ceremony here cannot be cost.

**The diagram is missing a step and undersells another.** The missing one is the **human visual
review**, which found the workstream's only real defect. The undersold one is the *rejected options*
section of the planning report, which is where that document's value actually sat.

---

## 2. Observed friction

Measured at review time against the repository and the committed record.

| # | Friction | Source |
| --- | --- | --- |
| F1 | **Branch cleanup does not run.** Worktree cleanup had happened; branch cleanup had not. Several merged local and remote branches outstanding, each fully contained in its integration base | `git rev-list --count <base>..<branch>` = 0 for each |
| F2 | **Promotion does not run, and nothing asks about it.** `test` far behind `dev`, ancestry intact, so promotion was a clean fast-forward that simply had not been requested | `git merge-base --is-ancestor`, `git rev-list --count` |
| F3 | **The decisive defect was found by a human, after both automated layers were green.** Switching viewport size from inside the harness frame reloaded the frame instead of the top document, so every change after the first was silently ignored — "Off" included. The unit guard passed a fake `window` with no frame around it; the CDP comparison seeded `localStorage` instead of clicking the row | `T2-measurement-report.md` §8a |
| F4 | **An acceptance criterion was downgraded and only prose recorded it.** T2.5 was scoped as a run-screen measurement and closed as documentation. The gap stands: run-screen geometry under the harness is *inferred*, not *measured* | `T2-measurement-report.md` §8c, §9 |
| F5 | **The reviewer flagged the evidence package incomplete on exactly the hazards the contract had already named.** Three hazards named as unverified in the contract shipped unclosed. All three were then closed with **no code change needed** | contract hazards section; `T2-measurement-report.md` §8d |
| F6 | **`npm test` is red on the Windows host and it is not the branch.** Timeouts, never assertions; measured worse on unmodified `dev` than on the branch. Documented in `testing.md` and re-derived per session anyway | `codex-review-handoff.md` §5 |
| F7 | **Planning under-scoped a mechanical sweep by roughly threefold.** Batch 3 estimated a handful of citation sites; the measured surface was substantially larger, one target was misclassified, one file was missing from the inventory, and one citation was already broken — a mechanical swap would have preserved the breakage | `agent-instructions-refactor-plan.md` §16 |
| F8 | **Evidence weight is unresolved.** The captured evidence is a meaningful fraction of a repository that already carries heavy binary media, and is fully regenerable from a committed script | commit adding the evidence; reviewer open question |
| F9 | **Language policy had no rule for appending to a legacy German document.** A backlog entry was written in German to match a German document with a fixed template — deliberate, flagged rather than hidden | `codex-review-handoff.md` §4 |
| F10 | **Batch 4 as originally planned would have created the drift the refactor exists to remove.** `roles.md` and `task-lifecycle.md` would have restated `git-workflow.md`. The plan caught this itself and refused to decide | `agent-instructions-refactor-plan.md` §17 |
| F11 | **Documents get referenced before they exist.** The planning report had to verify a referenced-but-absent document by grep; the routing table carried several `*(planned)*` rows | `planning-report.md` §8.1 |

**The pattern across F1, F2, F4 and F5:** the workflow is strong at the front and weak at the back.
Planning and contract are excellent. Everything after "the code is green" depends on someone
remembering.

---

## 3. Lifecycle tiers

### Which steps are load-bearing

| Step | Verdict | Why |
| --- | --- | --- |
| Task contract | Keep, always | Naming the must-not-touch files made scope compliance verifiable **by blob hash** rather than by inspection. Its hazards section predicted four of the issues that later mattered |
| Planning report | Tier B/C only | Its value was the *rejected* options, and naming the decision that could not be corrected cheaply later |
| Evidence package | Keep, proportional | It is what makes independent review possible at all |
| Independent review | Tier B/C | Caught F5 |
| **Human visual review** | **Add as a named gate** | Caught F3 — the only real defect. Was not in the lifecycle at all |
| Validation gates | Keep, always | Cheap, non-negotiable |
| Branch + worktree setup | Keep, mechanise | Every field is derivable |
| Cleanup | Keep, move earlier | See §8 |

### Migration-only, do not generalise

The branch reconciliation, the baseline report, the branch-reconciliation plan and the citation sweep
were one-off repairs. So was the **batch structure itself** — a migration device for a single
refactor, not a lifecycle. Nothing about a normal task should be organised into numbered batches.

### The three tiers

Implemented in `docs/engineering/task-lifecycle.md` §2–§5. In short:

- **Tier A — standard task.** Known file surface, no architectural fork. Task note, implement, gates,
  self-review, integrate, clean up. No planning report, no workstream directory.
- **Tier B — feature workstream.** A real design choice or a new seam. Planning report with rejected
  options, full contract, evidence package, visual review when pixels moved, independent review.
  *#400 was this.*
- **Tier C — large UI / architecture workstream.** Feature integration branch with task branches,
  measurement as a named deliverable, before/after captures, visual review as a numbered gate,
  downgrade records.

A tier follows from the **shape** of the work, not its size in lines.

### Two rules that fall out of the friction

1. **Every hazard named in the contract must be resolved before the review handoff** — each marked
   *measured*, *not measured and why*, or *not applicable*. Removes F5.
2. **A reduced acceptance criterion needs a downgrade record in the Definition of Done.** Prose in a
   report is not enough. Addresses F4.

---

## 4. Documentation decisions

### `roles.md` — rejected

`git-workflow.md` already carries worker ownership (§7), integrator ownership (§8), reviewer
ownership (§9), the integration procedure (§11) and the task decision guide (§22); `AGENTS.md`
carries the roles table. A separate document would have restated a third — F10 exactly.

**Decision:** do not create it. Point the routing table at `git-workflow.md` §7–§9 instead. One line
changed, no new drift surface.

### `task-lifecycle.md` — create, narrowly

It carries only what nothing else carries: the tiers, the contract shape, the evidence-package
definition, the visual review gate, the classification table, the hazard and downgrade rules, and the
handoff format.

It opens with an explicit **scope boundary** table and the rule that a sentence which could live in
`git-workflow.md`, `AGENTS.md`, `testing.md` or `NEW_MACHINE_SETUP.md` belongs there. That boundary is
the safeguard against becoming a second copy of `git-workflow.md`, and it is stated in the document
rather than merely intended.

### `NEW_MACHINE_SETUP.md` — create; cheapest win

Genuinely missing and otherwise answerable only by reading several documents: prerequisites, the
per-worktree `npm ci` rule, the preview-port convention and `--strictPort`, the CDP tooling and its
`CHROME_PATH` override, the `vite preview --base` trap, the Windows full-suite timeout condition, and
what CI does that the local gates do not.

Git behaviour — path conversion, `core.*` differences, line endings — stays in `git-workflow.md` §18
and is linked, not restated.

### `AGENTS.md`

Routing table retargeted, `*(planned)*` markers dropped, the stale `NEW_MACHINE_SETUP` fallback
paragraph removed, and a language rule added for **appending to an existing German document with a
fixed template** (closes F9).

### Considered, not adopted

A `docs/workstreams/README.md` index. Worth doing eventually — there is no entry point to the
workstream directories — but low priority and not part of this batch.

---

## 5. Command designs — designed, not built

Ranked by value-to-risk. **None is implemented.**

### `/create-task` — build first

- **Value:** highest ratio in the set. Every field of a contract's identity and workspace sections is
  derivable: base SHA, ancestry verification, branch name, worktree path, port, owner, reviewer. It is
  the step that must be exact and is currently hand-typed.
- **Trigger:** an approved plan, or an agreed task note.
- **Input:** task name, **tier (A/B/C)**, base branch, optional feature integration branch.
- **Output:** fetch; both ancestry checks; branch from `origin/<base>` at a named SHA; worktree at the
  convention path; `npm ci`; port assigned. **Plus the cleanup audit printed first** (§8).
- **Tier-aware output.** The tier is an input because it changes what is scaffolded, per
  `task-lifecycle.md` §2:
  - **Tier A** — a task-note stub. No contract, no workstream directory.
  - **Tier B** — a contract skeleton with identity and workspace filled, the rest as headings, plus
    the workstream directory.
  - **Tier C** — the same, plus the feature integration branch as the base for later task branches,
    and a measurement task named in the scope section rather than left implicit.
  - **Any tier** — if the work will move pixels, prompt for the V1 baseline before implementation
    starts (`task-lifecycle.md` §8). That prompt is the only reliable moment to take it.
- **Risk:** inventing scope. It must stop after the workspace section and hand back. A pre-filled
  non-goals list would be worse than an empty one. Scaffolding a Tier B contract for what is really a
  Tier A task manufactures ceremony, so the tier must be given, never guessed.

### `/prepare-review` — build second

Named for what it does; it prepares for a reviewer and does not review.

- **Value:** the viewport-harness handoff is the specification — diff range, commit list, scope
  compliance verified by blob hash against the contract's must-not-touch list, the "expected: empty"
  reproduce command, gate results, and **a row per named hazard with its resolution status**. That last
  item is what removes F5.
- **Trigger:** implementation complete, gates run, before handing over.
- **Input:** contract path, base SHA, head SHA.
- **Output:** the handoff document, with "open questions for the reviewer" as a **mandatory** section.
  Mandatory means the section must be present and answered — never silently omitted. Where there
  genuinely are none, the permitted answer is the explicit sentence:

  > None after checking hazards and deferred decisions.

  That wording is deliberate: it asserts the two checks were actually made, so an empty section
  records a conclusion rather than an oversight. A blank or missing section is a defect in the
  handoff.
- **Risk:** producing something that looks like evidence but is only a diff summary. Two guards: never
  state a gate passed that it did not run, and print an unresolved hazard loudly rather than omitting
  it.

### `/cleanup-task` — build third, propose-only

- **Value:** the step that measurably does not happen (F1).
- **Trigger:** after integration — and, more usefully, at the start of the next task.
- **Input:** for each branch, **its integration base**, taken from the task contract's identity
  section. A task branched from a feature branch is not merged merely because `dev` contains its
  commits, so the base cannot be assumed.
- **Unknown base — report, never guess.** Where no contract is available, or the contract does not
  name a base, the branch is listed as **`base unknown — not assessed`** and **no deletion command is
  printed for it**. Falling back to `dev` would produce a confident, wrong "safe to delete" for
  exactly the branches most likely to still hold unmerged work.
- **Output:** every worktree and every task/feature branch with merged-status against its stated
  integration base, unpushed commits, worktree cleanliness, and the exact deletion commands
  **printed, not executed** — plus a separate, clearly marked list of the unassessed branches.
- **Risk:** the two commands that can destroy unpushed work. Encode `git-workflow.md` §20 — prefer
  `-d` over `-D`, treat a dirty-worktree refusal as a safety feature, never touch the permanent
  branches or `archive/*` or `gh-pages`, and **never auto-execute a remote delete**.

### `/prepare-integration` — build fourth, cautiously

- **Value:** real, but only once several task branches feed one feature branch. #400 was a
  single-worker task integrated by fast-forward; there was nothing to orchestrate.
- **Trigger:** review passed, before merging.
- **Input:** branch, contract path.
- **Output:** a go/no-go checklist — ancestry, base freshness, gates re-run in the worktree, unticked
  Definition-of-Done boxes named, generated artefacts current, evidence present, review outcome
  recorded, and an explicit prompt on whether promotion is wanted (addresses F2).
- **Risk:** performing the merge. It must not. Automating the merge is where a broken invariant
  becomes a broken repository.

### `/plan-workstream` — rejected for now

What it would add is a report skeleton. But the planning report's value was the reasoning inside the
rejections, and a template invites filling in sections that do not apply. The skeleton lives in
`task-lifecycle.md` instead; promote it to a command only if the shape holds across more tasks.

---

## 6. Subagent strategy — designed, not built

**The test:** a subagent earns its place when it reads a lot, returns a little, and returns something
that becomes a durable artefact. If the answer is one grep, it is not a subagent.

F7 is the value case: a blast radius estimated at a handful of sites measured substantially larger,
with one file missed entirely. A read-only sweep returning the measured surface would have corrected
the contract before it was signed.

| Scout | Use when | Do **not** use when | Returns |
| --- | --- | --- | --- |
| **Architecture** | Tier B/C planning, before the contract fixes the file surface | Tier A; surface already known | Measured file list, seams touched, tripwire candidates, must-not-touch list |
| **Test** | Before the contract, and again before editing a guarded file | Writing tests | Which ratchets read the blast radius, **which strip comments and which read raw**, which counter-checks will be needed |
| **History** | A *why* question about existing behaviour | Current rules — those are in `AGENTS.md` | The tag, the entry, **its status marker**, and an explicit verify-against-current-code note |
| **Visual** | Producing the V1/V2 captures and describing them | **Approving anything**; standing in for the V3 human gate | Capture files plus metadata written to `evidence/`, the diff, differences attributed — never a verdict. See the artefact rules below |

**Test Scout has the clearest return.** Confusing the two guard families — comment-stripping versus
raw-reading — cost one red suite during #400. "Does this guard strip comments?" is answerable in one
pass, before the edit.

**History Scout is the textbook case.** A large German log, self-indexing by tag, which `AGENTS.md`
forbids preloading. Huge read, small return, zero writes.

**Visual Scout must be constrained hard.** An agent looking at a screenshot cannot replace what found
F3. A Visual Scout that emits "looks good" would destroy the gate that worked.

### Visual Scout — artefact handling

The Visual Scout is the one scout that produces **binary** output, so it is the one exception to
"scouts never write", and the exception needs stating precisely — including why it does not break the
one-writer-per-worktree rule.

- **It produces V1 and V2 captures (`task-lifecycle.md` §8) plus their metadata**, written to the
  workstream's `evidence/` directory. Capture files are its deliverable; it cannot hand back a PNG as
  conversation text.
- **It writes only into `evidence/`.** No source file, no document, no contract, no generated
  artefact — those still come back as text for a human to place. `evidence/` holds no input to the
  build and no file any guard reads, so a write there cannot affect a gate result.

### Why this does not break one-writer-per-worktree

`AGENTS.md` and `git-workflow.md` §5 allow **one active writer per worktree**. The Visual Scout is a
writer, so it is subject to that rule rather than exempt from it.

- **It runs sequentially, never alongside the implementing session.** The main session starts it,
  waits for it, and resumes. Capture is a distinct step of the §8 lifecycle — V1 before
  implementation, V2 after gates — so it never needs to overlap with editing.
- **The main writer is idle while it runs.** That is what keeps the count at one. A scout capturing
  V2 while the worktree is still being edited would also be capturing an indeterminate state, so the
  correctness argument and the concurrency argument point the same way.
- **Its write set and the main writer's are disjoint** — `evidence/` versus everything else — so even
  a mistimed run cannot collide on a file. This is a second line of defence, not the rule; the rule
  is that it runs alone.
- **It never runs in another worker's worktree.** Like any scout, it operates in the task's own
  worktree.
- **It reports differences with attribution** — which element, which viewport, how large — and never
  a verdict. "Judgement stays human" (`task-lifecycle.md` §8, V3) binds the scout too.
- **What it commits is decided by the committing rule, not by the scout.** Metadata and the
  classification table always; images only when they *are* the evidence (§7). A scout that captured a
  full set has not thereby earned a full set in the repository.
- **The V3 gate consumes its output; it does not delegate to it.** A Visual Scout run is never a
  substitute for a person having looked.

**Orchestration.** The main session orchestrates. The other three scouts are read-only and never
write into the worktree at all. Results come back as text the main session pastes into the planning
report or contract — that is the durable form, and it means a human read it on the way through.

---

## 7. Visual review strategy

The proposed chain was right, with one thing missing and one misordered. The resulting flow is
canonical in `task-lifecycle.md` §8 as **V1 baseline → V2 capture → V3 human gate → V4
classification**; the reasoning is here.

**Missing: a pre-change baseline (V1).** A review that sees only the "after" cannot separate "this
change did it" from "it was always like that". #400 hit this — a finding surfaced and had to be
classified as pre-existing, correct behaviour. The baseline has to be taken *before* implementation
starts; reconstructing it later is when the wrong state gets captured.

**Misordered: the human gate (V3) belongs before the independent review**, with findings classified
first. #400 did this by accident and it worked: the classification kept the reviewer from
re-litigating a deferred design question.

**Artefacts:** the V1 and V2 capture sets (sizes × screen, DPR recorded), a metadata file per set,
the reviewer's annotations, and the classification table.

**Classification is a required output**, in four categories: defect in this task / expected platform
behaviour / pre-existing and out of scope / new design question. Only the first returns as work.

**Storage.** The workstream `evidence/` directory works. Always commit the metadata and the
classification table; commit captured images only when they *are* the evidence, and keep the rest
regenerable — which is only honest if the generating script is committed and deterministic.

**Against chat-only decisions — the cheapest rule in this review:** a visual finding is not a finding
until it has an ID. #400 satisfied this by transcribing the owner's chat sentence into the report
verbatim, with a date. That transcription is the mechanism.

---

## 8. Cleanup strategy

**When a branch may be deleted.** All four measured, not assumed: its commits are reachable from the
**correct** integration base; the worktree is clean with nothing unpushed; the workstream's durable
artefacts are committed; and for a remote branch, explicit approval (`git-workflow.md` §20 already
requires this).

**One check the existing rules do not state:** quote **SHAs, not branch names**, in durable review
documents, so a diff range survives branch deletion.

**Automate detection, never deletion.** `/cleanup-task` proposes; a human confirms and executes.

**The structural fix — run the audit at the start of the next task, not the end of the last one.**
The end of a task is when attention is lowest, which is exactly why F1 happened. Front-loading it
into `/create-task` costs nothing and catches everything. This is the highest-leverage change in the
cleanup story and requires no new discipline from anyone.

---

## 9. Rejected approaches

| Rejected | Why |
| --- | --- |
| `roles.md` | Would restate `git-workflow.md` §7–§9 — F10 |
| `/plan-workstream` as a command | Its value is a skeleton, which belongs in `task-lifecycle.md` until the shape has held for more tasks |
| Automated `dev → test → main` promotion | A deliberate release decision, not a forgotten mechanical step. `--ff-only` already fails loudly |
| Visual-diff CI | Rejected on brittleness, and the measurement supports it: essentially all beyond-noise pixel differences in #400 were text glyph rendering. A pixel gate would fire on fonts |
| A Visual Scout that approves | Would destroy the gate that found F3 |
| Any command that merges, pushes or deletes | The point at which a broken invariant becomes a broken repository |
| A second automated review layer | The missing layer was human eyes, not more agents |
| Committing full capture sets by default | Decide per workstream instead |

---

## 10. Implementation order

| Step | Item | Status |
| --- | --- | --- |
| 0 | Clear the cleanup and promotion backlog the process itself created | **done** — see §0 |
| 1 | `NEW_MACHINE_SETUP.md` | **done** |
| 2 | `task-lifecycle.md` + the `AGENTS.md` routing and language updates | **done** |
| 3 | `/create-task`, with the cleanup audit front-loaded | not started |
| 4 | `/prepare-review` | not started |
| 5 | `/cleanup-task`, propose-only | not started |
| 6 | Subagents — Test and History Scouts first; Architecture Scout for the next large workstream; Visual Scout last, capture-only | not started |
| 7 | `/prepare-integration` — only after a multi-task workstream has shown what integration friction looks like | not started |
| 8 | Batch 5 — README refresh | not started |

---

## 11. Provenance

This review was held against the repository as it stood on 2026-08-21 and against the two workstreams
in `docs/workstreams/`. Its sources are `agent-instructions-refactor-plan.md` §16–§17,
`viewport-harness/T2-measurement-report.md`, `viewport-harness/codex-review-handoff.md`,
`viewport-harness/task-contract.md` and `viewport-harness/planning-report.md`.

This is a **historical record of one review**, not standing instruction. The rules it produced are in
`AGENTS.md`, `docs/engineering/task-lifecycle.md` and `docs/engineering/NEW_MACHINE_SETUP.md`. Where
this document and those disagree about what the rule is, those win.
