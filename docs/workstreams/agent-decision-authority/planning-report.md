# Planning Report — Agent Decision Authority

**Tier B.** Written 2026-08-22 against `origin/dev` @ `863febe54fce513c4171314eb8cfc0d86f997408`,
which is the base of `feature/agent-decision-authority`. Every line number below was verified against
that commit in this worktree.

**Measurements are dated.** Verify against the repository rather than reading any line number here as
permanently current.

---

## 1. The problem

The workflow works. What does not work is where questions land.

Too many **technical** questions return to the owner. The owner is not a software developer and
should not be making implementation decisions. An experienced engineer does not delegate a technical
multiple-choice question upward; they analyse, choose, record the choice, and continue.

The owner's domain is product, design, art direction, gameplay, balancing, priorities and scope —
*what* is built and *how it should feel*. The agent's domain is *how it is technically built*.

---

## 2. Why it happens — the structural finding

**The owner does not appear in the role model at all.**

`AGENTS.md` — *Roles and source of truth* (line 30) carries six rows: Durable source of truth, Local
cockpit, Implementation, Integration, Review, Concurrency. It answers **which agent does which work**.
It does not answer **who decides what**, and it never names the owner.

That is the root cause. Where the owner's domain is undefined, everything is implicitly the owner's
domain. An agent that honestly reports uncertainty — House rule *Report uncertainty honestly*, with
its measured/observed/inferred/proposed categories — has no documented place to point at that says
"this one is yours to settle." **Under the current text, escalating is the compliant behaviour.** The
agents are not deviating from the rules; they are following them.

**The counterpart already exists and is correct.** `docs/engineering/conventions.md` defines the
design domain precisely: the eleven decision rules, rule 5 (line 50, "Notice it, name it, offer the
system-wide step — do not do it unasked"), rule 10 (line 72, "Do not invent what does not exist") and
the icon policy in §2 (line 89). That is the owner side of the boundary, and it is good. Only the
technical side is missing.

---

## 3. Where escalation is favoured today — measured

Ordered by force.

| ID | Location | Current text | Why it produces owner questions |
| --- | --- | --- | --- |
| **B1** | `task-lifecycle.md:96` | "**Nothing is implemented until the owner has settled the report's open questions.**" | **The strongest driver.** It turns *every* open question in a planning report into a blocking owner gate, with no distinction by question type. A planner who records a technical alternative as an open question has thereby blocked implementation and put a technical menu in front of the owner. |
| **B2** | `AGENTS.md:30` | Role table without an owner row and without a decision domain | The gap in §2. No sentence exists that an agent can rely on when deciding for itself. |
| **B3** | `git-workflow.md:238–246` | "A worker may: inspect / modify / run validation / commit / push / update / produce a handoff" | The list is purely about **Git actions**. Technical decision authority does not appear in it. A worker reading the list as exhaustive finds no permission to choose an architectural variant. |
| **B4** | `task-lifecycle.md:141` | "Expected file surface — Indicative. Anything outside it is **surfaced** before it is changed" | "Surfaced" is unqualified — to whom, and blocking or not. A careful worker reads it as "ask the owner before touching any file outside the list", which is a technical question in nearly every case. |

### What is explicitly *not* a driver

Checked, and no change is warranted:

- **The three commands.** Their stop-and-ask points are missing arguments, name collisions, broken
  ancestry and staffing (`create-task.md:58`, `:119`, `:162`, `:227`). None is a technical
  implementation question. "Never guess the tier" must stay exactly as written.
- **The visual gate V1–V4** (`task-lifecycle.md`, *Visual review*). Design, owner's, correctly stated.
- **`AGENTS.md:403`**, "Cross-task collisions must be surfaced rather than silently resolved." Scope
  and concurrency, not a technical choice.
- **The handoff's open-questions section** (`task-lifecycle.md:258`, `:262`). Those questions are
  **reviewer-directed, not owner-directed.** Correct where they are.

### An honest counter-finding

The open questions Q1–Q5 of the last planning report
(`docs/workstreams/repository-hygiene-cleanup/planning-report.md:449`) were re-classified under the
proposed rule: **all five are already legitimate owner questions** — evidence retention, a business
record, a game-design question, owner knowledge of which specifications are live, and a priority.
That table even already carries a *Who decides* column.

**The committed material is better than the lived practice.** The friction is arising predominantly
**inside sessions**, not in the reports. This bounds what the change can achieve — see §8, R9.

---

## 4. The one decision that cannot be corrected cheaply

**The location of the canonical rule.**

`AGENTS.md`, because that is where the question of who owns what is already answered, and because
every agent reads it. Once the rule exists in two places they drift, and the drift is invisible until
two sessions act on two different versions of the boundary.

`command-layer-design.md` names this failure mode **F10** — "the drift the refactor exists to remove
is created by writing a second copy of a rule." Everything outside `AGENTS.md` is therefore a
**pointer**, never a restatement.

---

## 5. Options considered, and why they were rejected

### 5.1 REJECTED — put the rule in `CLAUDE.md` as well

`CLAUDE.md` states its own charter: "Project rules — branch model, validation gates, the source-text
ratchet hazard, house rules — live in `AGENTS.md` and are deliberately not repeated here." A copy
there would be F10 in the file whose entire purpose is to avoid it. `CLAUDE.md` is not touched.

### 5.2 REJECTED — put the rule into the three commands

`.claude/commands/*.md` are deliberately mechanical and judgement-free. Their prohibitions
("Never guess the tier", "Never write scope content", "Never classify a visual finding") are correct
and must not be loosened — they guard a different boundary, between derivation and judgement, not
between owner and agent. Three more copies of the rule, three more drift sites.

### 5.3 REJECTED — separate rule variants for planner, worker and integrator

| Role | Needs its own variant? | Reason |
| --- | --- | --- |
| Worker | No — a pointer only | The canonical rule covers it fully. A worker acts inside an approved contract, which is the rule's precondition. |
| Integrator | No — nothing at all | Its conflicts are cross-task collisions, not technical choices. Already routed by `AGENTS.md:403` and `git-workflow.md` §7–§8, and that works. |
| Planner | **A clause, not a variant** | The only role where the current text **contradicts** the new rule. An uncorrected `task-lifecycle.md:96` overrides the rule in the planning context, making it inert. This is a correction at the point of contradiction, not a second copy. |
| Reviewer | One sentence, **inside** the canonical rule | A reviewer filing "should have asked the owner" as a finding re-introduces the friction. Placing the sentence in the canonical rule keeps it from becoming a fourth site. Codex reads `AGENTS.md`. |

### 5.4 REJECTED — a new process document, a decision log, or a `/plan-workstream` command

The guiding principle is minimal intervention. No new process system, no new documents.
`command-layer-design.md` also places `/plan-workstream` deliberately out of scope; this task does not
reopen that.

The record of a technical decision needs no new surface: the planning report's rejected options, the
contract's *Approved architecture* section, the handoff and the commit message already exist and are
already the places such records go.

### 5.5 REJECTED — make the *Who decides* column mandatory in the open-questions table

It already exists as lived practice
(`repository-hygiene-cleanup/planning-report.md:449`) and works without being a rule. Promoting it
would add one more rule to keep in sync for no measured gain. Left as a convention.

### 5.6 REJECTED — enforce the rule with a test

Not available. `testing.md:246` states that no test reads `AGENTS.md`, `CLAUDE.md`, `README.md`,
`docs/engineering/**` or `docs/decisions/**`. **Verified in this session:** five files under `test/`
mention `docs/engineering`, all five in header comments only, none via `readFileSync`. The claim
holds. See R9.

### 5.7 The chosen shape

One canonical rule, one corrective edit, one pointer. **Three files, five edits, under 45 lines.**

---

## 6. Non-goals

- No new document, no new directory, no new command.
- No change to tiers A/B/C, the contract shape, the branch model, the promotion rules, or the roles.
- No change to `conventions.md`, the icon policy, or the visual gate V1–V4 — these **are** the owner
  side of the boundary.
- No change to `CLAUDE.md` or to `.claude/**`.
- No source code, no tests, no localization.
- Not a relaxation of any House rule. Irreversible and destructive actions stay exactly as gated.

---

## 7. Acceptance criteria

The decisive criterion is in the contract's *Acceptance gate*. Also required:

1. The boundary is defined in exactly one place; every other mention is a pointer.
2. `task-lifecycle.md:96` no longer blocks implementation on a technical question.
3. `git-workflow.md` §7 names the authority by pointer.
4. The must-not-touch list is unchanged, verified by blob or tree hash rather than by inspection.
5. The four standard gates pass. No `loc:export` — no player-visible text. No preview build — no
   preview-gated code.

---

## 8. Risks

| ID | Risk | Severity | Countermeasure |
| --- | --- | --- | --- |
| **R1** | **Design relabelled as "technical."** Spacing, colour, glyphs, wording declared implementation details. The most expensive misfire. | High | The tie-break clause ("what a player sees, hears or feels"), the explicit owner list, and `conventions.md` left byte-identical. |
| **R2** | **Autonomy read as a scope licence** — unrequested refactors, added work. | High | "Within the approved scope" is in the rule text. The House rule against unrelated cleanup and the contract tripwire are untouched. |
| **R3** | **Autonomy read as a licence for irreversible actions** — push, PR, delete, history rewrite. | High | An explicit sentence that the House rules are not relaxed. Command prohibitions untouched. |
| **R4** | **Silent decisions with no trace.** Autonomy without a record makes the planning report worthless. | Medium | The record clause names four already-existing surfaces. |
| **R5** | **Over-correction** — the planner stops raising genuine product questions. | Medium | The rule is written symmetrically; the "cuts both ways" sentence is part of it. `task-lifecycle.md:96` still blocks on real product questions. |
| **R6** | **Third-copy drift (F10).** The rule gets echoed into commands and docs over time. | Medium | Pointers only. The acceptance criterion is expressed as a grep so a violation becomes visible. |
| **R7** | **"A new dependency"** is technical under the new rule but is currently listed at `task-lifecycle.md:96` as a house-rule gate. | Low but real | **Resolved by owner decision: it stays an owner gate.** A dependency carries durable cost — licence, bundle size, maintenance — beyond the task. Recorded in the contract so it is not later read as an inconsistency. |
| **R8** | **Reviewer friction.** Codex reports autonomy as insufficient escalation. | Low | The reviewer sentence lives inside the canonical rule; Codex reads `AGENTS.md`. |
| **R9** | **Not enforceable by tests** (§5.6, measured). Held by review alone. Additionally: planning runs on the owner's free-form prompts, and no `/plan-workstream` command exists. **A documentation change alone does not reach that surface.** | Medium | Stated honestly rather than defined away. The second lever — a sentence in the owner's planning prompt citing the new section — is **out of scope here** and recorded as Q1. It changes nothing in the repository and is cheap to add once the rule exists to cite. |

---

## 9. Open questions

`task-lifecycle.md` — *Tier B*: nothing is implemented until the owner has settled these.

| ID | Question | Who decides | Blocking? |
| --- | --- | --- | --- |
| **Q1** | Should the owner's planning prompt be coupled to the new section, so the rule reaches the surface where the friction actually originates (§3, counter-finding; R9)? It changes nothing in the repository. | Owner | **No** — deliberately out of this task's scope |

Q1 is the only one. Every technical question raised during planning was resolved here or delegated to
the worker via the contract's *Approved architecture* section, which is the rule this task exists to
establish, applied to itself.

---

## 10. What this planning session did and did not do

**Did — measured, read-only:**

- Read `AGENTS.md`, `CLAUDE.md`, all six documents under `docs/engineering/`, all three files under
  `.claude/commands/`, and both completed workstreams.
- Verified every line number cited above against `863febe5` in this worktree.
- Verified that no test reads the rule documents, and that all five `test/` hits are header comments.
- Re-classified Q1–Q5 of the hygiene workstream under the proposed rule.

**Did not:**

- Change `AGENTS.md`, `task-lifecycle.md` or `git-workflow.md`. Implementation has not started.
- Run any validation gate — none was needed, and reporting one would be a false claim.
- Reach the session-prompt surface (R9, Q1).

*Report issued at planning. The rule text itself is binding in the contract's Approved architecture
section, not here.*
