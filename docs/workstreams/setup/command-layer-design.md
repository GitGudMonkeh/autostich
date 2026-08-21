# Agent Command Layer — Design Report

> **Status: approved, and partly implemented.** `/cleanup-task` was built and validated on
> 2026-08-21 — `.claude/commands/cleanup-task.md`, with its build record in
> `cleanup-task-implementation-note.md`. `/create-task` and `/prepare-review` are **designed only**
> and deliberately not built. §2.3 carries one amendment from that validation run; the rest of this
> report is as written.
>
> **Written 2026-08-21**, against the repository as it stood that day, as the follow-up to
> `batch4-design-review.md` §5 (`/create-task`, `/prepare-review`, `/cleanup-task` — designed, not
> built). Batch 4 ranked the commands and named their risks; this report specifies them.
>
> **Measurements below are dated.** Verify against the repository rather than reading any number
> here as current.
>
> Scope was set deliberately narrow: three commands. `/plan-workstream`, `/prepare-integration` and
> the subagents are out of scope and are not designed here.

---

## 1. Current workflow friction

Batch 4 measured the friction from the record of two completed workstreams. This section re-measures
it live, because the interesting question is not whether F1 and F2 happened once — it is whether they
regenerate after being cleared.

**They regenerate within the same day.** Batch 4 §0 recorded the cleanup and promotion backlog as
cleared by owner decision. Measured a few hours later, in the same repository:

| Measurement | Command | Result |
| --- | --- | --- |
| Worktrees | `git worktree list` | 2 — `C:/Code/Autostich` on `dev`, `C:/Code/Autostich-worktrees/agent-workflow-evolution` on `feature/agent-workflow-evolution` |
| That worktree's branch vs `dev` | `git rev-list --count origin/dev..feature/agent-workflow-evolution` | **0** — fully contained, at `dev`'s exact head `380b0a2d` |
| Non-permanent local branches | `git branch -vv` | 4, each `rev-list --count origin/dev..<b>` = **0** |
| Non-permanent remote branches | `git branch -r` | 5, each `rev-list --count origin/dev..origin/<b>` = **0** |
| Promotion state | `git rev-list --count origin/test..origin/dev` | **4** behind |
|  | `git rev-list --count origin/main..origin/test` | **64** behind |
| Ancestry | `git merge-base --is-ancestor`, both pairs | intact, exit 0 |

Read together with batch 4 §0 — which recorded *four* contained branches — the set has grown to five,
and `test` fell behind `dev` again within hours of being fast-forwarded. Ancestry is intact
throughout: nothing is broken, and nothing is at risk. That is exactly the shape of friction a
command layer addresses, and exactly the shape a rule does not: **the state is always recoverable,
always visible to a single command, and reliably not looked at.**

Three further friction points are re-confirmed from the batch 4 record and matter to the designs
below:

- **F5 — named hazards ship unresolved.** The viewport-harness contract named its hazards; three
  reached the reviewer unclosed, and all three then needed no code change. The cost was a review
  round trip that the contract had already paid for in advance.
- **F6 — `npm test` is red on the Windows host and it is not the branch.** Timeouts, not assertions.
  Every session re-derives this. Any command that reports gates must handle it rather than inherit it.
- **F11 — documents get referenced before they exist.** Relevant because commands will *consume*
  documents. A command that reads a contract section which is absent must say so, not assume.

**One friction point this report adds, from the batch 4 review itself:** F10 — the drift the refactor
exists to remove is created by writing a second copy of a rule. A command file is a document. Three
command files that restate the gate list, the tier definitions and the deletion rules would be
exactly F10 in a new directory. §5.3 is the countermeasure.

---

## 2. Command proposals

### 2.1 `/create-task`



| **Purpose** | Produce the mechanically derivable half of a task setup — the Identity and Local workspace sections of the contract, the branch, the worktree, dependencies, the port — and stop before anything requiring judgement. Run the cleanup audit first. |
| **Trigger** | An approved plan (Tier B/C) or an agreed task note (Tier A). Human-typed only. Never model-invoked. |
| **Required input** | Task name (slug), **tier (A/B/C)**, base branch. Optional: feature integration branch, a flag stating that the work will move pixels. |
| **Output** | The cleanup audit, printed first; then a branch, a worktree, `npm ci`, an allocated port, and a tier-appropriate scaffold whose non-derivable sections are headings only. |

**What it may automate.** Everything with exactly one correct answer:

- `git fetch origin`, both ancestry checks (`main`→`test`, `test`→`dev`), reported as exit codes.
- Resolving the base branch to a **SHA** (`git rev-parse origin/<base>`), and writing that SHA — not
  the branch name — into the contract's Identity section.
- Branch name from the convention, worktree path from `<repo-parent>/Autostich-worktrees/<task-name>`.
- `npm ci` in the new worktree.
- Port allocation: lowest free port from 5181 upward, excluding the reserved table in
  `NEW_MACHINE_SETUP.md` §6 (measured today: 5173, 5180) and every port already recorded in a
  `Preview port` row of an existing task contract (measured today: 5180). The allocation is
  *proposed and recorded*, never probed — `--strictPort` is what makes a collision fail loudly.
- The scaffold's **section headings**, in the order and under the names of `task-lifecycle.md` §6.
- If the work will move pixels: printing the V1 baseline prompt, which is the only reliable moment to
  take it (`task-lifecycle.md` §8).

**What it must never automate.**

- **The tier.** Given, never guessed. A Tier B scaffold on a Tier A task manufactures ceremony;
  the reverse silently removes a review gate.
- **Any scope content** — scope, non-goals, tripwire, approved architecture, acceptance gate,
  hazards, definition of done. A pre-filled non-goals list is worse than an empty one, because it
  reads as a decision that nobody made.
- Pushing the branch, setting upstream, opening a PR.
- Reusing, removing or writing into an existing worktree.
- Running validation gates. Setup produces no gate result worth reporting.
- Taking the V1 baseline itself. It prompts; a human decides what state to capture.
- Editing `AGENTS.md`, `docs/engineering/**`, or any rule document.

**Safety boundaries.**

- **Runs only from the cockpit checkout.** Detected, not assumed: `git rev-parse --git-dir` differs
  from `--git-common-dir` inside a linked worktree. If they differ, abort — creating a worktree from
  inside another worker's worktree is the first step toward two writers.
- **Never overwrites.** If the branch exists locally or on the remote, or the worktree path exists,
  the command aborts and reports which one collided. It does not append a suffix.
- **No auto-rollback.** If `npm ci` fails, the worktree stays and the command prints how to finish
  manually. Rolling back would mean deleting a worktree, which is a class-3 action (§4) and never
  automatic.
- **Ordered so checks precede state.** Audit, fetch, ancestry, collision checks, port allocation —
  all before `git worktree add`. Nothing is created until everything that can fail cheaply has passed.
- Nimbalyst may create and manage worktrees (`git-workflow.md` §6). The command reads
  `git worktree list` first and refuses to create a second worktree for a branch already checked out.

**Failure cases.**

| Case | Behaviour |
| --- | --- |
| Ancestry check fails | **Abort.** Ancestry repair is a deliberate procedure (`git-workflow.md` §15), never a side effect of task setup. |
| Base branch not fetched / stale | Fetch first; if the base still does not resolve, abort naming the ref. |
| Branch or worktree path exists | Abort, report the collision, print nothing destructive. |
| Tier not supplied | Stop and ask. Never infer from the task name. |
| `npm ci` fails | Report the exit code; leave the worktree; state that no test or lint result is meaningful yet. |
| Port table unreadable / no contract corpus | Allocate from 5181 and mark the allocation `inferred — verify`. |
| Running under Git Bash on Windows | Any `revision:path` argument carries `MSYS_NO_PATHCONV=1` (`CLAUDE.md`). Prefer forms that take no colon argument. |
| Dirty cockpit checkout | Warn, proceed — `git worktree add` does not require a clean tree — and name the dirty paths so they are not mistaken for the new task's work. |

---

### 2.2 `/prepare-review`

Named for what it does. It prepares for a reviewer; it does not review, and it cannot approve.



| **Purpose** | Assemble the evidence package and handoff (`task-lifecycle.md` §7, §9) from the contract and the diff, so the reviewer receives verified facts instead of assertions — and so every named hazard is forced to a status before handover. This is the F5 fix. |
| **Trigger** | Implementation complete, gates run, before handing over. Human-typed. |
| **Required input** | Contract path. Optional: base SHA and head SHA (defaults: the base SHA recorded in the contract's Identity section, and `HEAD`). |
| **Output** | A handoff document in the workstream directory, following the section shape of the viewport-harness handoff, with **open questions mandatory**. |

**What it may automate.**

- The diff range as **SHAs**, plus the commit list, plus file/insertion/deletion counts.
- Verifying that the contract's base SHA is genuinely an ancestor of the head SHA, and reporting
  loudly when it is not (rebase or force-push).
- **Scope compliance by blob hash**, for every must-not-touch path that is a real path:
  `git rev-parse <base>:<path>` against `git rev-parse <head>:<path>`, with `MSYS_NO_PATHCONV=1` on
  Windows. Directory entries are expanded through `git ls-files`.
- The "expected: empty" reproduce command, so the reviewer can re-run the claim.
- One table row per hazard, extracted **verbatim** from the contract's hazards section, with an
  unset status field.
- Gate results **it ran itself in this session**, as bare unpiped commands with their exit codes.
- A Definition-of-Done extract naming every unticked box.

**What it must never automate.**

- **Claiming a gate result it did not observe.** Every gate row is either *run in this session, exit
  N* or *not run — no result*. It never inherits a claim from conversation, from a previous session,
  or from the contract.
- **Resolving a hazard.** It can only demand a status; measuring is the worker's job.
- **Recording a review outcome**, or any sentence implying approval.
- **Classifying a visual finding.** V3/V4 are human (`task-lifecycle.md` §8).
- **Claiming scope compliance for a constraint that is not mechanically checkable.** Measured today,
  the viewport-harness contract's must-not-touch list is prose containing a directory glob and one
  conceptual entry — "the run-screen layout" — which no hash can verify. Such entries are printed in
  their own row as **not mechanically verifiable — reviewer must judge**. Silently dropping them is
  precisely how a diff summary comes to look like evidence.
- Editing source, the contract, or the diff. Pushing, merging, or opening a PR.
- Omitting the open-questions section. Where there genuinely are none, the only permitted content is
  the sentence batch 4 §5 fixed: *"None after checking hazards and deferred decisions."*

**Safety boundaries.**

- **Refuses to emit a clean handoff while hazards are unresolved.** It emits the document, prefixed
  with a blocking notice naming the count. A handoff that hides an open hazard costs a review round
  trip; one that shouts about it costs nothing.
- **Both-results rule for `npm test` on Windows** (F6, `NEW_MACHINE_SETUP.md` §5): full-suite result
  and targeted re-run, reported together, with timeouts distinguished from assertion failures.
- Never pipes a gate command (`AGENTS.md`, Validation gates).
- Quotes SHAs, never branch names, in the durable document — so the range survives branch deletion.
  Measured: the viewport-harness range `dd36c3ef..908570cc` is still resolvable today although
  `task/viewport-harness` is gone.

**Failure cases.**

| Case | Behaviour |
| --- | --- |
| Contract missing, or a named section absent | Report *section absent* and continue. Never substitute a default. |
| Base SHA not an ancestor of head | Stop and report. The diff range is meaningless until a human says which range is intended. |
| Head not pushed | Emit the handoff, flagged: a reviewer cannot fetch it yet. |
| No must-not-touch list in the contract | State that scope compliance could not be verified by hash, and why. Do not substitute a diff summary. |
| Gates not run in this session | Every gate row reads *not run*. |
| Evidence images uncommitted | List them; apply `task-lifecycle.md` §7 (metadata always, images only when they *are* the evidence). Decide nothing. |

---

### 2.3 `/cleanup-task`

Propose-only. It prints commands; a human executes them.



| **Purpose** | Make the state in §1 visible on demand: every worktree and every non-permanent branch, with merged status against **its own** integration base, unpushed commits, and worktree cleanliness. |
| **Trigger** | After integration, and — more usefully — as step 0 of `/create-task`, at the start of the *next* task, when attention is highest. |
| **Required input** | None. For each branch it resolves the integration base from the task contract's Identity section. |
| **Output** | An audit table, a set of deletion commands **printed, not executed**, and a separately headed list of branches it declined to assess. |

**What it may automate.** All of the detection, none of the deletion:

- `git worktree list`, per-worktree `git status --porcelain`, and per-branch upstream comparison.
- `git rev-list --count <base>..<branch>` against the base named in that branch's contract.
- Matching branch to contract by searching `docs/workstreams/**/task-contract.md` for the branch name.
- Composing the exact deletion commands, using `-d` and never `-D`, `git worktree remove` without
  `--force`, and `git push origin --delete` only inside a separately headed, explicitly unapproved
  section.

**What it must never automate.**

- **Any deletion**, local or remote, of a branch, a worktree, or a ref.
- **Assuming `dev` as the base.** A task branched from a feature branch is not merged merely because
  `dev` contains its commits. Where the base is unknown, the branch is listed as
  **`base unknown — not assessed`** and *no deletion command is printed for it* — the fallback would
  produce a confident, wrong "safe to delete" for exactly the branches most likely to hold unmerged
  work.
- Touching `main`, `test`, `dev`, `archive/*` or `gh-pages` in any printed command
  (`git-workflow.md` §20).
- Force flags, in any form, anywhere in its output.
- Proposing promotion. Promotion is a deliberate release decision (batch 4 §9), and `--ff-only`
  already fails loudly.

**Safety boundaries.**

- **A branch is proposed for deletion only when all four conditions are measured**, per batch 4 §8:
  commits reachable from the *correct* base; worktree clean with nothing unpushed; the workstream's
  durable artefacts committed; and, for a remote branch, explicit human approval.
  **Amended 2026-08-21** after the first validation run, by owner decision: the artefact condition is
  split by operation. A **worktree removal** requires a clean worktree — that is the operation which
  can lose an uncommitted artefact. A **branch deletion** verifies the artefacts a contract
  references; where **no contract names the branch**, the audit reports
  `no contract found — artefact condition not mechanically verifiable` and does **not** treat it as a
  deletion blocker, because deleting a branch cannot lose an uncommitted file. Conditions 1–3 bind
  unchanged, and an unknown *base* still withholds the branch. Recorded in
  `cleanup-task-implementation-note.md` — *Refinement 2*.
- **`git fetch` without `--prune` during the audit.** Pruning deletes remote-tracking refs, and a
  remote-tracking ref can be the only local reachability anchor for commits on a branch deleted
  upstream. `--prune` is printed as a proposed command instead of run as a side effect of looking.
- A dirty-worktree refusal from Git is reported as a **safety feature**, not an error to work around.
- A branch checked out in another worktree cannot be deleted; the command reports which worktree
  holds it rather than proposing to remove that worktree.

**Failure cases.**

| Case | Behaviour |
| --- | --- |
| No contract found for a branch | `base unknown — not assessed`. No deletion command. |
| Two contracts name the same branch | `base ambiguous — not assessed`, both paths listed. |
| The recorded base branch no longer exists | Containment unmeasurable → not assessed, with the missing ref named. |
| Unpushed commits | Listed with their count and SHAs; no deletion command printed. |
| Stale remote-tracking refs | Reported; `git fetch --prune` printed as a proposed command. |
| Artefacts uncommitted in the workstream directory | Branch withheld from the deletion list, with the paths named. |

---

## 3. Input/output contracts

|  | `/create-task` | `/prepare-review` | `/cleanup-task` |
| --- | --- | --- | --- |
| **Argument hint** | `<task-slug> <A\ | B\ | C> [--base <branch>] [--feature <branch>] [--pixels]` | `<contract-path> [--base <sha>] [--head <sha>]` | `[--worktrees-only\ | --branches-only]` |
| **Preconditions** | Run from the cockpit checkout; network for `fetch` and `npm ci` | Contract exists; head commit exists | None |
| **Reads** | remote refs, `git worktree list`, existing contracts (ports), `NEW_MACHINE_SETUP.md` §6 | contract, `git log`/`diff`/`rev-parse`, gate output it ran itself | worktrees, branches, upstreams, contracts |
| **Writes** | one branch, one worktree, `node_modules/`, one scaffold file | one handoff document | **nothing** |
| **Prints** | audit, derived-field table, the human's to-fill list | blocking notices, then the document path | audit table, proposed commands, unassessed list |
| **Outcomes** | `PROCEED` / `STOP-AND-ASK` (tier, collision) / `ABORT` (ancestry) | `PROCEED` / `PROCEED WITH BLOCKERS` (open hazards) / `ABORT` (range invalid) | `PROCEED` only — it cannot fail destructively |

Every command ends with an explicit statement of what a human must do next. None ends by implying it
finished the lifecycle step it served.

**Two coupling rules, because these commands talk to each other through documents:**

1. `/create-task` emits section headings under the **names** used in `task-lifecycle.md` §6, and
   `/prepare-review` locates sections by those names — never by number. That document already
   requires name-based citation, because a contract may add or drop a section and a numeric citation
   goes stale silently.
2. A contract is a **semi-structured input**, not a data format. Every parse degrades loudly:
   *section absent*, *row absent*, *not mechanically verifiable*. No command may fill a gap.

---

## 4. Safety model

Four classes. A command's class ceiling is a property of the command, stated in its own file.

| Class | Action | Who may do it |
| --- | --- | --- |
| **0** | Read-only inspection: `status`, `log`, `rev-list`, `rev-parse`, `worktree list`, `fetch` | Any command, silently |
| **1** | Creating a file at a path that does not exist | `/create-task`, `/prepare-review` — never overwriting |
| **2** | Local state: branch create, `worktree add`, `npm ci` | `/create-task` only, after every class-0 check has passed |
| **3** | Destructive or outward-facing: any delete, `push`, `merge`, promotion, PR, force flag | **No command, ever.** Printed for a human to execute |

Five invariants sit above the classes:

1. **One writer per worktree.** A command detects which worktree it stands in and refuses to write
   outside it. `/create-task` is the only command that creates one, and only from the cockpit
   checkout.
2. **No review gate is bypassable by a command.** No command may record a gate as passed that it did
   not run, mark a hazard resolved, classify a visual finding, or state that a review passed.
   Judgement stays human — for the visual gate this is already binding (`task-lifecycle.md` §8, V3),
   and the command layer extends it to gates and hazards.
3. **No invented scope.** Commands emit headings; humans emit content. Anything derivable is derived
   and shown with the command that derived it; anything else is `TODO — <what is needed>`, never a
   plausible guess.
4. **Honesty of provenance.** Every generated document marks each claim *measured*, *observed*,
   *inferred* or *proposed* (`AGENTS.md`, House rules). A generated handoff that reads as uniformly
   confident is less useful than one that marks its own soft spots.
5. **Loud degradation.** Missing input produces a named gap, never a default. This is the F11
   discipline applied to machine readers.

**Human confirmation points** — the places where a command must stop and a person must act:

| Point | Command | Why |
| --- | --- | --- |
| Tier selection | `/create-task` | Determines which gates exist |
| V1 baseline capture | `/create-task` | Only reliable moment; state must be chosen |
| Every hazard status | `/prepare-review` | Requires measurement |
| Gate results not run in-session | `/prepare-review` | Cannot be inherited |
| Every deletion, local or remote | `/cleanup-task` | Class 3 |
| Promotion | none | Deliberately not in the command layer |

---

## 5. File structure

### 5.1 Where command files live

```text
.claude/
  commands/
    create-task.md
    prepare-review.md
    cleanup-task.md
```

- **Project-scoped, not personal.** `~/.claude/commands/` is per-machine and per-user; these commands
  encode repository process, and the repository is the durable source of truth. A command that lives
  only on the Windows host is a rule that does not exist on the Linux laptop.
- **Committed.** Measured: `.gitignore` excludes only `.claude/settings.local.json` and
  `.claude/worktrees/`; `.claude/launch.json` is already tracked. So `.claude/commands/*.md` is
  committed by default, which is what makes the layer durable.
- **Flat, not namespaced.** Three commands. Namespacing is worth it at roughly fifteen.
- **Outside the ratchet surface.** Measured: no file under `test/` or `scripts/` reads `.claude`.
  Adding these files cannot turn the suite red — and equally, no guard will catch a stale citation
  inside them. §5.3 addresses that with citation style rather than with a new guard.

### 5.2 Command syntax in this environment

Verified against the installed `plugin-dev/command-development` skill and against real command files
in the installed marketplace, not from memory:

| Feature | Form | Use here |
| --- | --- | --- |
| File format | Markdown, `.claude/commands/<name>.md` → `/<name>` | yes |
| `description` | one line, shown in `/help` | yes |
| `argument-hint` | documents arguments for autocomplete | yes — see §3 |
| `allowed-tools` | e.g. `Bash(git:*)`, scoped rather than `Bash(*)` | yes, scoped per command |
| `disable-model-invocation` | prevents programmatic invocation | **yes, `true` on all three** |
| `model` | per-command model | no — inherit |
| Arguments | `$ARGUMENTS`, `$1`…`$9` | yes |
| File refs | `@path` inlines file contents at invocation | sparingly — see below |
| Bash pre-execution | `` !`git status` `` — output inlined before the prompt runs; requires the matching `allowed-tools` entry | yes, for cheap context only |

**Two decisions worth stating.**

**Commands, not skills.** The installed documentation marks `.claude/commands/` as a legacy format
and prefers `.claude/skills/<name>/SKILL.md`. Commands are still the right choice for these three:
they take positional arguments with an `argument-hint`, and — decisively — command frontmatter
documents `disable-model-invocation`, which is exactly the property wanted. A command that creates
branches and worktrees must fire only when a human types it. *Measured:* that control is documented
for commands; no documented equivalent for skills was found. *Proposed:* revisit if the format is
actually deprecated, and treat the migration as mechanical.

**Bash pre-execution stays small.** `` !`…` `` runs at invocation, before any check has passed. It is
right for `git worktree list`; it is wrong for `npm ci`, for a gate, or for anything whose failure
needs handling. Everything conditional runs as a normal tool call inside the command body, where the
result can be branched on.

**Commands are instructions to Claude, not descriptions for a user.** Each file is written as a
directive — "verify ancestry; abort if either check fails" — never as prose about what the command
will do.

### 5.3 Interaction with the canonical documents

The layer's main hazard is F10 — a command file that restates a rule is a fourth copy that drifts.
One rule prevents it:

> **A command may contain procedure. It may not contain rules.**
> Procedure is step order, the exact read-only invocations it runs, and the shape of its output.
> Rules — the gate list, the tier definitions, the deletion safety conditions, the promotion model —
> are cited by document and **section name**, never copied.

| Document | Role for the command layer | What a command may do | What it must never do |
| --- | --- | --- | --- |
| `AGENTS.md` | Canonical, vendor-neutral rules: gates, house rules, language, roles | Cite by section name; execute gates unpiped as it specifies | Restate the gate list; add a rule; be referenced *from* `AGENTS.md` |
| `task-lifecycle.md` | Tiers, contract shape, evidence, visual gate, hazard and downgrade rules | Emit its section names as headings; require a hazard status; require the mandatory open-questions section | Redefine a tier; decide a tier; shortcut V1–V4 |
| `git-workflow.md` | Branch model, worktree ownership, integration, cleanup safety | Run its inspection commands; print its deletion commands verbatim | Execute a class-3 command; assume an integration base; promote |

**`AGENTS.md` is not modified by this work, deliberately.** It is vendor-neutral and canonical, and a
Codex session cannot run a Claude command. The commands change how fast the process is executed, not
what the process is. The single pointer belongs in `CLAUDE.md`, the Claude adapter, as a short list of
the three commands with one-line purposes — which is exactly what that file is for.

**Citation style:** section **names**, not numbers, matching the discipline `task-lifecycle.md` §6
already applies to contracts. A renumbered section silently invalidates a numeric citation; a renamed
one is visible.

---

## 6. Implementation order

| Step | Item | Rationale |
| --- | --- | --- |
| 0 | **Owner decisions** (see open questions) — Tier A task-note path, handoff filename, whether `/prepare-review` may run gates | Each one changes a command's contract; deciding after the file exists means rewriting it |
| 1 | **`/cleanup-task`** — read-only audit, propose-only | Dependency of step 2, and the safest thing to validate the harness with: it writes nothing, and today's expected output is already measured (§1) |
| 2 | **`/create-task`**, calling step 1's audit as its step 0 | Highest value in the set; must not carry a second copy of the deletion logic |
| 3 | **`/prepare-review`** | Largest surface, and the acceptance test already exists (§7) |
| 4 | Re-measure §1 after the next real Tier B task | Whether the friction actually fell is a measurement, not an assumption |

**Deviation from batch 4 §10, stated deliberately.** That review ordered `/create-task` first,
`/cleanup-task` third, ranked by value-to-risk. This report builds the audit first, for two reasons
that only became visible when specifying the commands: `/create-task` front-loads the audit
(batch 4 §8), so building `/create-task` first would either duplicate the deletion-safety logic or
ship with a stub step 0; and the read-only, propose-only command is the right one to discover the
harness's rough edges with. Value order is unchanged — `/create-task` remains the highest-value
command. Only the build order moves.

---

## 7. First test scenario

The point of a first scenario is not that the command runs. It is that **the expected output was
written down before the command produced it**, and that a case which must *not* be proposed for
deletion is deliberately created. That is the repository's own counter-check discipline
(`testing.md` §5 — a guard that is merely green is not evidence) applied to the command layer.

**Target: `/cleanup-task`, against the state measured in §1.**

*Preconditions — require owner authorization, since they create branches:*

1. A **negative control**: a scratch branch off `dev` with one commit that is never pushed.
2. An **unknown-base control**: a scratch branch with no task contract naming it.

*Expected output, recorded before the run:*

| Expectation | Why it is the test |
| --- | --- |
| The four contained local branches and five contained remote branches from §1 appear as merged against `dev`, each with `rev-list --count` = 0 shown | Detection works at all |
| `feature/agent-workflow-evolution` is reported as contained **and** its worktree as clean, at `dev`'s head | The worktree/branch pairing is resolved, not conflated |
| The negative control appears with its unpushed commit and **no deletion command** | The safety condition fires. A run where everything is deletable proves nothing |
| The unknown-base control appears under `base unknown — not assessed`, with no deletion command | The fallback batch 4 explicitly forbade is genuinely absent |
| No printed command contains `-D`, `--force`, `push --delete` outside the approval-gated section, or any of `main`/`test`/`dev`/`archive/*`/`gh-pages` | The class-3 ceiling holds |
| `test` being 4 behind `dev` is **not** raised as an action | Promotion is deliberately out of scope |
| Nothing was deleted; `git worktree list` and `git branch -a` are identical before and after | Propose-only is real |

*Then the controls are deleted by hand — which is also the first exercise of the human-confirmation
step the design depends on.*

**Second scenario, once `/prepare-review` exists: a replay with a known-good answer.** Measured
today, all four viewport-harness SHAs (`dd36c3ef`, `bdc516ee`, `bf678921`, `908570cc`) remain
reachable from `origin/dev` although `task/viewport-harness` is gone. So the command can be pointed
at `docs/workstreams/viewport-harness/task-contract.md` with range `dd36c3ef..908570cc`, and its
output compared against the handoff a human actually wrote for that review. Three things the
comparison must show:

- the blob-hash scope table reproduces, including `src/index.css` unchanged at
  `c1b3ccfd858cd6dab7df30fefd83456947ce686b`;
- `src/ui/fx/` is expanded through `git ls-files` rather than skipped, and *"the run-screen layout"*
  appears as **not mechanically verifiable — reviewer must judge**;
- all five contract hazards appear as rows with unset status, and the run reports
  `PROCEED WITH BLOCKERS`.

A generated handoff that is *thinner* than the human one is the expected result and not a failure —
the human sections carry judgement. A generated handoff that is *more confident* than the human one
is a defect in the command.

---

## Open questions for the owner

1. **Tier A task-note path.** `task-lifecycle.md` §3 allows the first commit message or an
   uncommitted scratch file. A scratch file at the worktree root shows up as untracked in every
   `git status` for the life of the task. Options: accept the noise; add one `.gitignore` line; or
   have `/create-task` print the note for the commit message instead of writing a file.
   *Recommendation:* print it, write nothing — it keeps `/create-task`'s class-1 surface at zero for
   Tier A.
2. **Handoff filename.** The existing example is `codex-review-handoff.md`; the reviewer role is
   currently Codex but `AGENTS.md` is vendor-neutral. *Recommendation:* `review-handoff.md`.
3. **May `/prepare-review` run gates itself?** Running them is non-destructive and makes the results
   first-hand; not running them keeps the command fast and the responsibility with the worker.
   *Recommendation:* allowed, opt-in by flag, and every row always states which of the two it was.
4. **Machine-readable contract fields?** Parsing Markdown tables by row label is workable today, but
   the must-not-touch list is prose (measured, §2.2). *Recommendation:* defer. Add structure only if
   parsing actually proves fragile — a format change to the contract is a change to
   `task-lifecycle.md`, which is a larger decision than these commands.

---

## Provenance

Written 2026-08-21 in the cockpit checkout `C:\Code\Autostich` on `dev`, uncommitted, no branch
created. Sources: `AGENTS.md`, `docs/engineering/task-lifecycle.md`, `docs/engineering/git-workflow.md`,
`docs/workstreams/setup/batch4-design-review.md`, plus `NEW_MACHINE_SETUP.md` §6 for the port
convention and the viewport-harness contract and handoff as the specimen input/output pair. Command
syntax was verified against the installed `plugin-dev/command-development` skill and real command
files rather than from memory. The §1 measurements are `git` output from that day.

This is a design report. The rules remain in `AGENTS.md`, `docs/engineering/task-lifecycle.md` and
`docs/engineering/git-workflow.md`; where this document and those disagree, those win.
