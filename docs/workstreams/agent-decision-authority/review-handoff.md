# Codex Review Handoff — Agent Decision Authority

> ## Review is closed — no further review is expected
>
> **Owner decision, 2026-08-22: independent review is no longer a required step.** Mandatory Codex
> review between worker and integration produced more review pingpong than it caught, and was removed
> from the workflow. The canonical rule — independent review is optional and risk-based, and normal
> integration readiness is scope and contract, required validation and evidence, branch state, and
> unresolved blockers — arrives with the `feature/review-convergence` branch.
>
> **This document is now a record, not a request.** It describes four review rounds that did happen:
> one full review and three follow-up rounds, whose findings and dispositions are in
> [`task-contract.md`](./task-contract.md) — *Review round 1* through *Closure review round 1*. The
> last open item, round-4 finding 2, was fixed; no reviewer confirmed that fix, and this document
> does not claim otherwise.
>
> **What is measured, and stands on its own:** the four gates, Linux CI green at the head, all
> fourteen must-not-touch entries object-identical to the base commit, and the three live rule
> documents unchanged since `a2357b47`. Those are the integration-readiness facts, and none of them
> depends on a review verdict.

**Reviewer role: independent assessment only. Do not implement.** Findings return to the Claude
worker in this worktree (`docs/engineering/git-workflow.md` — *Reviewer ownership*).

This document prepares a handoff. It does not review, it approves nothing, and every gate row below
states whether the gate was run in the session that generated it.

**Blocking notice.** Hazards with no status recorded anywhere: **0** — all eight carry a status in
the contract, quoted below and *not* promoted into this document's status column. Unticked
definition-of-done boxes: **1** — `npm test`, with a downgrade record, and green in Linux CI at this
head SHA. Push state: the head commit **is** on `origin/feature/agent-decision-authority`, so the
range is fetchable.

**Round 2.** The first review returned *changes requested*; all four findings were accepted and
fixed. What changed, and what a second reviewer should look at first, is in *Round 2* immediately
below. Sections 2, 5, 6 and 9 were written for round 1 and are annotated where round 2 supersedes
them; they are kept rather than rewritten so the two rounds stay comparable.

| | |
| --- | --- |
| **Context** | Agent Decision Authority — owner/agent decision boundary, documentation only |
| **Branch** | `feature/agent-decision-authority` (pushed, own upstream, **not** merged into `dev`) |
| **Live-rule finalization range** | `863febe54fce513c4171314eb8cfc0d86f997408..a2357b4708578bff3d73c1945b76c0de074b50a8` — base to the commit at which the three live rule documents reach their final state. It **does** contain earlier revisions of this document and both rounds of review fixes; it is defined by where the rules stop changing, not by which files it touches |
| **Package-record tail** | everything after `a2357b47`. Defining property: **no live rule document changes here** — verified by blob hash, `AGENTS.md` `65662e6a`, `task-lifecycle.md` `d443937a`, `git-workflow.md` `528961ac` identical at `a2357b47` and at the package head. **Not** review records only: the tail also carries binding contract changes — *Expected file surface*, *Definition of done*, hazard statuses, gate evidence — and those are **in scope for review** |
| **Size** | 6 files, +1146/−5 over the live-rule finalization range · no evidence images |
| **Gates** | **Linux CI green at the live-rule finalization commit `a2357b47`** (run `32579560825`). Locally: lint / build / gen:db exit 0, `npm test` exit 1 on a pre-existing Windows timeout — see *Gate results* |
| **Worktree** | clean at handoff — the head commit is the state the worker is looking at |

**Seven commits in the live-rule finalization range**
(*measured*, `git log --oneline 863febe5..a2357b47 | wc -l`):

```
96e4ee4e  docs: define the owner/agent decision boundary in AGENTS.md
5da398d9  docs: record the agent-decision-authority planning report and contract
aff76af2  docs: record the owner's answer to Q1 in the contract
175bfbf2  docs: add the reviewer handoff and record the Linux CI result
e0caa513  docs: address the round-1 review findings
d63e471a  docs: update the handoff for review round 2
a2357b47  docs: address the round-2 review findings
```

*Corrected at round 3:* the previous version said six and omitted `d63e471a` — the same defect the
round-3 refresh was meant to remove, committed while removing it. The count is now derived from
`git log`, not typed.

The commit carrying *this* update is not in that list and cannot be: a handoff cannot contain its own
SHA. That is what the *Package-record tail* row above is for. Stated once here rather than left to
be noticed — round 2 finding 2 was, in part, exactly this drift going unmarked.

**Reproduce the claim that the rules are final at `a2357b47`.** Both sides are named explicitly.
**Do not use `HEAD`** — the review is performed without checking this branch out, so `HEAD` is the
reviewer's own branch and every file reports `DIFFERS` for the wrong reason. That was round-4
finding 1, reported by a reviewer who ran the previous version of this command exactly as written.

```bash
git fetch origin feature/agent-decision-authority

RULES=a2357b47                                    # live-rule finalization commit
PKG=origin/feature/agent-decision-authority       # or an explicit package-tail SHA

for f in AGENTS.md docs/engineering/task-lifecycle.md docs/engineering/git-workflow.md; do
  a=$(MSYS_NO_PATHCONV=1 git rev-parse --verify "$RULES:$f")
  b=$(MSYS_NO_PATHCONV=1 git rev-parse --verify "$PKG:$f")
  [ "$a" = "$b" ] && echo "identical  $a  $f" || echo "DIFFERS  $f"
done
```

Expected: three `identical` lines — `65662e6a`, `d443937a`, `528961ac`.

*Terminology note, round 4:* what earlier rounds and the round-4 review text call the **content
range** / **content head** is now the **live-rule finalization range** / **live-rule finalization
commit**, throughout both documents. Same commits, one name, so the contract and this handoff can no
longer describe them differently.

**Read first:** [`task-contract.md`](./task-contract.md) — the binding scope statement. Its
*Approved architecture* section carries the rule text that was approved verbatim, and its *Non-goals
and tripwire* section carries the boundary this change was not allowed to cross.

---

## 0. Round 2 — what changed since the first review

Codex reviewed `175bfbf2` and returned **changes requested**: two high findings, two medium. All four
were accepted; none was argued down. The dispositions, with the reviewer's own reasoning, are
recorded in [`task-contract.md`](./task-contract.md) — *Review round 1*.

| # | Finding | Fix, in one line |
| --- | --- | --- |
| 1 High | The roles-table row was a second definition — the exact F10 breach this change exists to prevent. | The row is now `**Repository owner** — see *Decision authority* below.` |
| 2 High | The dependency gate was recorded but never implemented: no House rule reserved dependencies, so the canonical rule did not cover them. | `AGENTS.md` — *House rules* reserves it; `task-lifecycle.md` applies that rule instead of asserting the gate. |
| 3 Medium | "Open question" meant blocking, non-blocking and reviewer-directed in three different places. | The planning gate defers to the report's *Blocking?* column; handoff open questions are reviewer-directed by definition. |
| 4 Medium | The range added a third workstream file against a contract that said two were the only additions. | The handoff is named in *Expected to be added*; the live-rule finalization range and the package-record tail are distinguished. |

Two further changes follow from the reviewer's answers rather than from a finding: the F10
done-criterion was **reformulated** (the old single-line grep could not see the `task-lifecycle.md`
pointer across its line break and counted dated workstream records as live rule sites), and the Q1
prompt sentence was **shortened** from a procedural paraphrase to a citation.

**What round 2 should look at first.**

1. **Finding 2's fix creates a new House rule.** That is a governance change, authorized by the owner
   rather than assumed, and it is the largest thing this task now does that its original scope did
   not contain. Whether the rule is worded at the right strength — "No new dependency without asking
   first", with the durable-cost rationale attached — is the open question of this round.
2. **Finding 1's fix may have gone too far the other way.** The row is now so short that the owner's
   domain is named only by the section it points at. Whether a reader of the roles table alone still
   learns that the owner exists in the decision model is a judgement.
3. **A defect found while fixing and deliberately left unfixed.** `task-lifecycle.md` names three
   house-rule gates: a new glyph, a new dependency, a breakpoint change. After finding 2 the first
   two are each backed by a House rule; **"a breakpoint change" is not.** It is finding 2's defect one
   clause over, it predates this task, and reserving breakpoints would be a new governance decision
   with no owner input behind it. Recorded in the contract for the owner, not invented here. A
   reviewer may disagree that leaving it is right.

*Measured at round 2:* gates re-run after the fixes — `npm test` exit 1 on the same pre-existing
Windows timeout with the same file green in isolation, lint / build / `gen:db` exit 0. All fourteen
must-not-touch entries still object-identical to the base commit.

---

## 0b. Round 3 — what changed since the second review

Codex reviewed `d63e471a` and returned **changes requested**: all four round-1 findings confirmed
fixed, two new medium findings. Both accepted, both fixed. Dispositions in
[`task-contract.md`](./task-contract.md) — *Review round 2*.

| # | Finding | Fix |
| --- | --- | --- |
| 1 Medium | The breakpoint gate was still misclassified as a house-rule gate. Not inventing breakpoint governance was right, but the alternative was missed: a responsive breakpoint moves visible layout, so the **tie-break already assigns it to the owner**. | `task-lifecycle.md` routes each gate to the source that actually reserves it — House rules for a glyph and a dependency, *Decision authority* for a breakpoint. No new governance. |
| 2 Medium | The round-2 package presented round-1 data as current: a commit count that disagreed with its own list, a reproduce command pinned to a superseded head, CI claims on the old SHA, and the contract still carrying the pre-fix corrective block while this document asserted byte-identity with it. | The contract marks the superseded block and records the current approved text beside it. This document is refreshed to the live-rule finalization commit throughout — ranges, commit list, section map, reproduce command, CI, provenance. |

**Worth recording plainly:** on finding 1 the worker was half right. Declining to invent breakpoint
governance was correct. Concluding that the only options were "invent a House rule" or "leave it
broken" was not — the rule this task created already answered it, and the worker failed to apply its
own tie-break to the case in front of it. That is a missed application, not a missing rule, and it is
the kind of miss this handoff exists to expose rather than smooth over.

**What round 3 should look at.**

1. **Is the corrected gate sentence right?** `task-lifecycle.md` now names three gates and routes each
   to a different authority in one sentence. Readability against precision is a judgement.
2. **Does the contract's superseded/current block pair read unambiguously?** A future reader must not
   mistake the superseded block for the live requirement. It is marked, but marking is not proof.
3. **Is anything else in this document still round-1 data?** Finding 2 was a class of error, not a
   single instance. Every SHA-bearing line was refreshed; a reviewer disbelieving that is behaving
   correctly.

*Measured at round 3:* gates re-run after the fixes — `npm test` exit 1 on the same pre-existing
Windows timeout, the same file green in isolation, lint / build / `gen:db` exit 0. Linux CI green at
`a2357b47`. All fourteen must-not-touch entries object-identical to the base commit. The F10 count at
the live-rule finalization commit: `AGENTS.md` 3, `task-lifecycle.md` 2, `git-workflow.md` 1 — matching the
contract's enumerated expectation, with the second `task-lifecycle.md` hit being the new application.

---

## 0c. Round 4 — what changed since the third review

Codex reviewed `d954d3d9`: round-2 finding 1 confirmed fixed, round-2 finding 2 **only partly**
fixed. No new findings in the three live rule documents — the reviewer's summary was that the live
governance is ready to integrate and the review package is not. Dispositions in
[`task-contract.md`](./task-contract.md) — *Review round 3*.

Four residual instances of one class, all fixed: a commit list that said six over a range of seven
(omitting `d63e471a`), a "full changed-file list" of five over a range of six (omitting this
document), a done criterion calling the live sites "enumerated" while omitting the breakpoint
application, and several round-1 statements standing unmarked as current.

**The class, stated plainly.** Every round produced the same defect: a statement of current state,
true when written, silently false afterwards. Round 3's fix introduced a fresh instance of the defect
it was fixing. Patching instances was not working, so two things changed:

- **Citations into this workstream are by section, never by line.** Base-commit line numbers in the
  contract's *Scope* and *Task-specific inputs* and in the planning report stay — those are dated
  measurements against `863febe5`, correct as history and labelled as such.
- **Counts are derived, not typed**, and re-verified mechanically before handoff. That audit caught
  what this round's review did not: the *Expected file surface* row had moved from `:141` to `:147`
  while a done criterion still asserted a present fact using the base number.

*Measured at round 4:* the audit passes — commit count and list, file count and list, contract
section map, and the absence of line-number citations into the contract all agree with `git` and with
the contract as it stands. Gates re-run: `npm test` exit 1 on the same pre-existing Windows timeout,
the file green in isolation, lint / build / `gen:db` exit 0.

---

## 0d. Round 5 — the two round-4 findings

Codex reviewed `ff144a5c`: the three live rule documents integration-ready with no new findings, and
all four round-3 findings confirmed fixed. Two medium findings remained, both in the review package,
both fixed here.

| # | Finding | Fix |
| --- | --- | --- |
| 1 Medium | The reproduce command compared against `HEAD`. The review runs **without checkout**, so `HEAD` is the reviewer's own branch — running the command as written reported `DIFFERS` for all three live documents and appeared to refute a claim that is in fact true. | Both sides are named explicitly: `RULES=a2357b47` and `PKG=origin/feature/agent-decision-authority`, with `HEAD` called out as the thing not to use, and the expected output stated. |
| 2 Medium | The contract and this document defined the two ranges differently, and the contract's definition was wrong: it said the handoff was "not part of" a range that contains it via `175bfbf2` and `d63e471a`. | One terminology in both documents, taken from the reviewer's own suggestion: **live-rule finalization range** and **package-record tail**, defined by where the rules stop changing rather than by which files a range touches. |

Finding 1 is the sharper of the two: the command was correct in the worktree it was written in and
wrong in the only context it was ever going to be run in. It was verified by the author against the
wrong environment.

*Measured at round 5:* gates re-run — `npm test` exit 1 on the same pre-existing Windows timeout, the
file green in isolation, lint / build / `gen:db` exit 0. The mechanical audit passes. No live rule
document changed: `AGENTS.md`, `task-lifecycle.md` and `git-workflow.md` are byte-identical to
`a2357b47`.

---

## 0e. Closure round 1 — result and fixes

Finding 1 **closed**: the reviewer ran the reproduce block unchanged, without checkout, and got three
`identical` lines with the expected hashes. Finding 2 **not closed**, and its own fix caused the
regression — the round-4 rename retired *content range* but left the *review-package range* name
behind in three places, including a back-reference to a row that no longer exists under that name.

| Defect | Fix |
| --- | --- |
| A back-reference pointing at a header row under the name the rename had just retired | Points at *Package-record tail*, which is what the row is called |
| The retired name surviving in this document's round-2 table and the contract's round-1 record, against a contract that claims "these two names and no others" | Both use *package-record tail* |
| The tail defined as "workstream record only — this document and the contract's review sections", while `git diff a2357b47..22edf14a` also changes *Expected file surface*, *Definition of done* and gate evidence | The tail is defined by its **defining property** — no live rule document changes in it — and both documents state that it carries binding contract changes which **are in scope for review** |

The third is the one that mattered. The first two are cosmetic drift; the third could have led a
later reviewer to skip binding sections of the contract because a header row told them the tail held
only review records. *Measured:* the tail's contract diff touches *Expected file surface* at `:245`,
*Definition of done* at `:307`, the gate evidence at `:350`, and the two review records.

**On the rename that caused this.** A rename is not a search-and-replace of one string; it is a
change of vocabulary, and the vocabulary had two words in it. Round 4 retired *content range* and
verified that *content range* was gone — the verification matched the edit rather than the intent,
so the second stale name and the back-reference that depended on it survived a check designed to
catch exactly that. The audit now asserts the absence of **both** retired names.

---

## 1. What was agreed

The contract is the binding scope statement; this document does not restate it. Its *Acceptance
gate*, quoted verbatim:

> The boundary is defined in **exactly one** place; `task-lifecycle.md:96` no longer blocks
> implementation on a technical question; and the owner side of the boundary — `conventions.md`,
> the icon House rule, and the visual gate V1–V4 — is **byte-identical to the base commit, verified
> by blob or tree hash rather than by inspection.**
>
> All three clauses must hold. A change that adds the rule while altering the owner side has failed
> this gate even if the rule text is perfect.

Section map of the contract, **generated from the file rather than typed** (*measured*): Identity
`:12`, Local workspace `:25`, Scope `:41`, Non-goals and tripwire `:77`, Approved architecture
`:102`, Task-specific inputs `:201`, Acceptance gate `:216`, Expected file surface `:230`, Known
hazards `:282`, Definition of done `:302`. No section absent. The contract additionally carries
*Review round 1* through *Review round 4*, cited by name because the line numbers of this
workstream's own documents have moved in every round.

---

## 2. The claims to check

**Round 1, superseded in part — kept for comparison.** Item 1 was confirmed as a finding and fixed;
items 2 and 3 were checked and cleared by the reviewer; item 4 was cleared subject to finding 3,
which is fixed. The round-2 claims are in §0.

Ordered by where the worker thinks a finding is most likely, not by size.

1. **Is `AGENTS.md:40` a pointer or a second definition?** This is the closest call in the change.
   The role-table row carries a one-line form of the boundary three lines above the section that
   defines it. *Approved architecture* item 1 permits pointers and forbids restatements, and F10 is
   the failure mode the whole design exists to avoid. The worker's reasoning (*inferred*): drift
   needs distance, the row sits in the same file adjacent to the definition, and it says "Defined
   once below" rather than standing on its own. A reviewer may weigh that differently, and the
   cheapest fix — shortening the row to a bare pointer — is available.

2. **Is the *Expected file surface* row the right strength?** (Cited at round 1 as
   `task-lifecycle.md:144`; the row is at `:147` at the live-rule finalization commit.) This wording
   was *delegated* to the worker, not
   approved in advance, so it has had the least scrutiny of the five edits. It now reads "recorded
   and reported before it is changed — not blocked on an owner answer unless the departure is itself
   a scope change". The question is whether that sharpens the *Expected file surface* discipline or
   quietly weakens it: a worker who reads it loosely could treat any departure as merely reportable.

3. **Does `git-workflow.md:242` grant technical authority or scope authority?** The bullet is placed
   after "modify files within task scope," so that "that scope" has an antecedent — the contract
   named line 240, which would have put it *before* its own referent. A reviewer should confirm that
   this is drafting and not scope creep, and that "take the technical implementation decisions
   inside that scope" cannot be read as permission to redefine the scope.

4. **Does the corrected `:96` still stop what it should stop?** It must still block implementation on
   a genuine product, design, gameplay, priority or scope question (H5/R5, over-correction), and it
   must still name the house-rule gates including a new dependency (H7). Both are *measured* as
   present; whether the sentence achieves it in practice is a reading, not a measurement.

**What is already measured and does not need re-checking:** the canonical `## Decision authority` text
is byte-identical to the block approved in the contract — transferred programmatically and compared,
not retyped, and unchanged through both review rounds.

**Corrected after round 2.** The `:96` corrective edit is **no longer** identical to the block
approved at planning: rounds 1 and 2 changed it. The contract now carries both — the superseded
original, marked as such, and the current approved text, which is what byte-identity is measured
against from round 2 onward. Verified at the live-rule finalization commit: the superseded block does
**not** appear in `task-lifecycle.md`, and the current block does.

---

## 3. Scope compliance

Every entry of the contract's *Must not touch* list, by object hash. All fourteen resolve at both
ends and are equal (*measured*, re-run at the live-rule finalization commit `a2357b47` after the
round-2 fixes). A tree hash proves the whole subtree byte-identical, recursively, including that
nothing was added into it.

| Entry | Type | Hash at base and head | Result |
| --- | --- | --- | --- |
| `CLAUDE.md` | blob | `af4493607150456cd0f79a20d2b4853a18902ba5` | unchanged |
| `.claude/**` | tree | `09d8fd3fb0933a022cb9ffc509bac7465f2f8801` | unchanged |
| `docs/engineering/conventions.md` | blob | `3bd5082e5973305648e7fd276fa877fff4ba8861` | unchanged |
| `docs/engineering/testing.md` | blob | `033c1ba0bdabdacea06b381d8a082036eec18c11` | unchanged |
| `docs/engineering/architecture.md` | blob | `9bffcfa3c2d111c8142dec9bf61304cc93dd2655` | unchanged |
| `docs/engineering/NEW_MACHINE_SETUP.md` | blob | `bda0850d704567359d3b3d458b4c92fc4f80b6ba` | unchanged |
| `src/**` | tree | `342f7f43a02be6f9933408841307ab8f40450cb6` | unchanged |
| `test/**` | tree | `2d586cf549949049eb9e993aa49b8cf847d71267` | unchanged |
| `docs/localization/**` | tree | `8d77e56028885fe130e6bf47836162f935279708` | unchanged |
| `docs/decisions/**` | tree | `67eef85f0161fe478d060a7df01ef5ff20780884` | unchanged |
| `package.json` | blob | `4130c1641333d8e213642f9b3a60ac20585413a8` | unchanged |
| `package-lock.json` | blob | `7eed7f16416b4de56ac880f6e0b65e291115c366` | unchanged |
| `vite.config.js` | blob | `9c7ec59c4765d6e34aefc4e685fc7c10a1aac06f` | unchanged |
| `eslint.config.js` | blob | `3ebdf1a7dc83f433495dc6d76d4ad9abfe8cbc96` | unchanged |

No entry was unverifiable. Full changed-file list over the live-rule finalization range — **six files**
(*measured*, `git diff --name-only 863febe5 a2357b47`):

```
M  AGENTS.md
M  docs/engineering/git-workflow.md
M  docs/engineering/task-lifecycle.md
A  docs/workstreams/agent-decision-authority/planning-report.md
A  docs/workstreams/agent-decision-authority/review-handoff.md
A  docs/workstreams/agent-decision-authority/task-contract.md
```

*Corrected at round 3:* the previous list omitted this document, which the range does contain — an
earlier revision of it, added by `175bfbf2`.

Re-run the claim rather than trusting it:

```bash
W="C:/Code/Autostich-worktrees/agent-decision-authority"
B=863febe54fce513c4171314eb8cfc0d86f997408
H=a2357b4708578bff3d73c1945b76c0de074b50a8
for e in CLAUDE.md .claude/** docs/engineering/conventions.md docs/engineering/testing.md \
         docs/engineering/architecture.md docs/engineering/NEW_MACHINE_SETUP.md src/** test/** \
         docs/localization/** docs/decisions/** package.json package-lock.json vite.config.js \
         eslint.config.js; do
  p=${e%/\*\*}
  a=$(MSYS_NO_PATHCONV=1 git -C "$W" rev-parse --verify "$B:$p" 2>/dev/null)
  b=$(MSYS_NO_PATHCONV=1 git -C "$W" rev-parse --verify "$H:$p" 2>/dev/null)
  if [ ${#a} -ne 40 ] || [ ${#b} -ne 40 ]; then echo "FAILED RESOLUTION  $e"
  elif [ "$a" = "$b" ]; then echo "unchanged  $a  $e"
  else echo "CHANGED  $a -> $b  $e"; fi
done
```

**Two traps in that command, both measured on this host** (Git 2.55.0.windows.3, Git Bash):

1. `MSYS_NO_PATHCONV=1` suppresses path conversion for *every* argument, including `-C`. With a
   POSIX worktree path (`-C /c/Code/...`) all fourteen entries fail to resolve with
   `cannot change to ... No such file or directory`. The `-C` argument must be in Windows form. The
   first run of this check failed exactly that way and was caught, not reported as a result.
2. `--verify` is what caught it. Without `--verify`, `git rev-parse` echoes an unresolvable argument
   to **stdout**; a stdout comparison then sees two identical echoed strings and reports
   *unchanged* for an entry that was never checked. Treat any stdout that is not a 40-character hex
   string as a failed resolution regardless of exit code.

---

## 4. Gate results

Run in the session that generated this handoff, from the contract's worktree, unpiped, in the order
`AGENTS.md` — *Validation gates* gives. Exit codes are the real ones (*measured*).

| Gate | Run in this session | Exit | Result |
| --- | --- | --- | --- |
| `npm test` | yes | **1** | 2047/2048 passed; one timeout, see below |
| `npx vitest run test/i18n-guards.test.js` | yes | **0** | 27/27 passed in 2.63 s |
| `npm run lint -- --max-warnings=0` | yes | **0** | clean |
| `npm run build` | yes | **0** | built in 5.95 s |
| `npm run gen:db` | yes | **0** | 219 entries |
| **GitHub Actions `32579560825`** (Linux, live-rule finalization commit `a2357b47`) | not by this session — read from the run | **success** | `npm test`, lint, build, **preview-slot build**, `gen:db` all success |
| `npm run loc:export` | no | — | not applicable: the diff touches no `src/i18n/**` and no player-visible text (*measured* — no `src/` path appears in the range) |
| Preview build (`VITE_PREVIEW=1`) | no | — | not applicable: the diff touches no preview-gated code, by the same measurement |

**`npm test` is red, and the both-results rule applies.** The failing file is
`test/i18n-guards.test.js`, test `"jeder Katalog-Schlüssel wird auch irgendwo benutzt"`, failing on
`Test timed out in 5000ms` — **a timeout, not an assertion failure** (*measured*, distinguished from
the error text). The same file run in isolation passes 27/27 in 2.63 s (*measured*).

The `npm run build` gate was redirected to a file, not piped; `$?` is npm's own exit code and
failure propagation is intact (`AGENTS.md` — *Validation gates* forbids pipes, not redirects).

**Linux CI settles it.** The same suite, at the same head commit, passes in the environment that
enforces the gate. The local red is a Windows load artefact and nothing else — `NEW_MACHINE_SETUP.md`
describes exactly this. The CI conclusion was read from the run, not produced by this session.

---

## 5. Hazards

> **Historical snapshot — generated at round 1.** The hazard *text* is unchanged, but H6 and H7 were
> both found defective in review and their contract statuses were rewritten; the *Recorded elsewhere*
> column below quotes the contract as it stands, by section rather than by line number. Read the
> contract's *Known hazards* table for the current wording.

One row per hazard, text quoted verbatim from the contract. **The status column is deliberately
unset**: a status recorded at another time is a different claim, and only the worker can supply the
status at handoff (`task-lifecycle.md` — *Two standing rules*). The contract's own statuses are
quoted in the third column, attributed and located, and are **not** promoted.

| Hazard (verbatim) | Status at handoff | Recorded elsewhere |
| --- | --- | --- |
| **H1** Design gets relabelled as "technical" — spacing, colour, glyphs, wording claimed as implementation detail. The most expensive misfire. | *measured* / *not measured, and why* / *not applicable* — unset | `task-contract.md` — *Known hazards*, **H1**: "**measured** — the canonical text was byte-compared against this contract's approved block; `conventions.md` blob `3bd5082e` is identical at base and HEAD. How future sessions apply the tie-break is not measurable here." |
| **H2** Autonomy read as a scope licence — unrequested refactors, added work. | unset | `task-contract.md` — *Known hazards*, **H2**: "**measured** — 'within the approved scope' is present in the inserted text; the House rule against unrelated cleanup is outside the diff. Three files changed, all on the *Expected to change* list; the tripwire did not fire." |
| **H3** Autonomy read as a licence for irreversible actions — push, PR, delete, history rewrite. | unset | `task-contract.md` — *Known hazards*, **H3**: "**measured** — the sentence that the House rules are not relaxed is present verbatim; `CLAUDE.md` blob `af449360` and the `.claude` tree `09d8fd3f` are identical at base and HEAD." |
| **H4** Silent decisions with no trace. | unset | `task-contract.md` — *Known hazards*, **H4**: "**measured** — the record clause naming the four existing surfaces is present verbatim, and no file was created outside `docs/workstreams/agent-decision-authority/`." |
| **H5** Over-correction — the planner stops raising genuine product questions. | unset | `task-contract.md` — *Known hazards*, **H5**: "**measured** — the 'cuts both ways' sentence is present verbatim, and the corrected `:96` still blocks implementation on a product, design, gameplay, priority or scope question." |
| **H6** Third-copy drift (F10) — the rule echoed into commands and other docs. | unset | `task-contract.md` — *Known hazards*, **H6**: "**measured** — one definition and three pointer sites at handoff. The grep is single-line and cannot see the `:96` pointer, whose citation wraps a line break in the approved text; a multiline-aware re-count confirms three." |
| **H7** "A new dependency" is technical under the new rule but listed as a house-rule gate. | unset | `task-contract.md` — *Known hazards*, **H7**: "**measured** — 'a new dependency' is still named among the house-rule gates at the corrected `:96`, and *Approved architecture* item 5 is committed alongside the change." |
| **H8** The rule is not enforceable by tests — `testing.md:246`, verified in planning. Held by review alone. | unset | `task-contract.md` — *Known hazards*, **H8**: "**not measured, and why** — unenforceable by construction, re-verified this session: five `test/` files mention `docs/engineering`, all in header comments, none via `readFileSync`. `testing.md:246` holds. Held by review alone; not fixable within this task." |

---

## 6. Definition of done

> **Historical snapshot — generated at round 1.** The F10 criterion and the `:96` criterion have both
> been rewritten since; the counts below are as at round 1. The contract is authoritative.

Fourteen boxes ticked, **one unticked** (*measured* at round 1). The unticked box, verbatim:

```
- [ ] `npm test` — passed, unpiped. Any failing file also run in isolation, both results reported
      (`NEW_MACHINE_SETUP.md` — Windows full-suite timeouts are a load artefact).
      **Not ticked** — the full suite is red on a pre-existing timeout. See the downgrade line below.
```

It stays unticked because the criterion is the **local** gate (`AGENTS.md` — *Validation gates*
requires the local run), not because the change breaks tests: Linux CI is green at the live-rule
finalization commit `a2357b47`.

The downgrade record exists — `task-contract.md` — *Definition of done*, immediately after the
checkbox list. Quoted verbatim as of the live-rule finalization commit; it has since gained a dated
CI paragraph recording the Linux result at `a2357b47`, which is not reproduced here:

> **Downgrade — `npm test`.** *Promised:* a green full suite. *Delivered:* 2047 of 2048 tests green in
> two consecutive full runs, with `test/i18n-guards.test.js > "jeder Katalog-Schlüssel wird auch
> irgendwo benutzt"` failing on `Test timed out in 5000ms` — a timeout, not an assertion. The same file
> passes 27/27 in 3.03 s when run alone, and the identical failure reproduces at the clean base commit
> `863febe5` with this task's changes stashed, so it is pre-existing and not caused by this change.
> *Decided by:* the implementing session, as a technical call under *Approved architecture* rather than
> an owner question. *Gap that remains:* the Windows full-suite timeout is untouched here and outside
> this task's scope — a repository-level condition, and the one thing this handoff does not deliver
> green.

---

## 7. Evidence and its limits

**File state** (*measured*): the workstream directory holds `planning-report.md` and
`task-contract.md`. Both are committed; the directory is clean. **No image files** — zero PNG, JPG
or WEBP. No visual gate applies: the contract records that this change moves no pixels, so V1–V4
were not entered. This document is the third file in the directory.

**Limits.** What rests on inspection or reasoning rather than measurement, and should not be read as
verified:

- **That the rule text is correct.** Everything measured about it is presence and byte-identity. No
  measurement in this task speaks to whether the boundary is drawn in the right place.
- **H1 to H5 measure that a countermeasure is present in the text, not that it works.** How a future
  session applies the tie-break, or whether a planner keeps raising genuine product questions, is
  behaviour and is outside anything this task can measure. H8 states the structural reason: no test
  reads these documents, so nothing here is regression-protected.
- **The Q1 finding that no repository file holds planning prompts** rests on a directory listing of
  `docs/workstreams/setup/` and a keyword grep, not on an exhaustive search of the repository.
- **No visual evidence exists because no pixels moved.** That is supported by the measured fact that
  no `src/` path appears in the range, but the conclusion "no visual gate applies" is an inference
  from the diff, not a capture.

---

## 8. Known state a reviewer will hit

*Measured, in the session that generated this handoff:*

- **`npm test` is red on this Windows host** and will be red for the reviewer too if they run it
  there. One test, a 5000 ms timeout, passing in isolation. The contract's downgrade record states
  it reproduces at the clean base commit with this task's changes stashed. **That reproduction is a
  prior claim from the worker's session, quoted here, not re-run when this handoff was generated.**
- **The F10 check is no longer a single-line grep** — *superseded at round 1, corrected here at
  round 3.* The old criterion could not see the `task-lifecycle.md` pointer, whose citation wraps a
  line break, and it counted this workstream's dated records as live rule sites. The contract now
  enumerates the live sites and pairs them with a multiline-aware search that **locates while a human
  classifies**. At the live-rule finalization commit: `AGENTS.md` 3, `task-lifecycle.md` 2,
  `git-workflow.md` 1 — one definition, three pointers, one application.
- **Linux CI is green at the live-rule finalization commit.** GitHub Actions run `32579560825`, head SHA
  `a2357b4708578bff3d73c1945b76c0de074b50a8`: `npm test` **success**, lint success, build success,
  preview-slot build success, `gen:db` success. The Windows timeout in §4 does not exist in the
  environment that enforces the gate. A reviewer running the suite on Linux should expect green.
- The head commit is on `origin/feature/agent-decision-authority`; the worktree is clean.

*Not measured:*

- **Whether the timeout threshold is close to tripping on other machines.** The failing test took
  5165 ms against a 5000 ms limit in one run and 2.63 s in isolation. Nothing here characterises the
  margin on a different Windows host, and the load artefact is a repository-level condition this
  task neither introduced nor fixed.
- **Whether any other session holds this worktree.** The one-writer rule was observed by this
  session; it was not verified against other sessions.
- **The base-commit reproduction of the timeout** was run in the worker's session and is quoted
  above as a prior claim; it was not re-run when this handoff was generated.

---

## 9. Open questions for the reviewer

**Round 1, answered.** All five were answered by Codex and the answers adopted: the roles-table row
was a restatement (fixed); review-only enforcement stands, no test guard; no new repository surface
for the planning prompt, and the sentence was shortened to a citation; the grep criterion was
reformulated; and the dependency explanation was moved into the canonical House rules. The round-2
questions are in §0.

The original five, kept for comparison.

1. **Is the role-table row a restatement?** §2 item 1. The worker judged it a pointer; a reviewer
   who judges otherwise has found the one F10 breach this change could plausibly contain.

2. **H8 is permanent, not deferred.** No test reads `AGENTS.md`, `CLAUDE.md` or
   `docs/engineering/**` (`testing.md:246`, re-verified this session). This rule is therefore held by
   review alone, forever, unless a future task adds a guard — which would touch `test/`, off limits
   here. Is review-alone acceptable as the permanent state, or should a follow-up task create the
   guard?

3. **R9 stays open after Q1.** The owner answered Q1 "yes" on 2026-08-22, and the answer adds no
   repository change because no file holds the owner's planning prompts — the sentence is recorded
   in the contract instead. So the rule reaches the planning surface only as far as the owner
   carries it there by hand. Does that need a repository surface (a `/plan-workstream` command was
   deliberately left out of scope by `command-layer-design.md`), or is the hand-carried sentence
   enough?

4. **The done criterion cannot see its own subject.** The definition of done expresses the F10 check
   as `grep -rn "Decision authority"`, and the `:96` pointer wraps across a line break in the
   approved verbatim text, so the grep undercounts by one. The criterion was met on a
   multiline-aware recount. Should the criterion be reformulated for future tasks, or is the
   footnote enough?

5. **"A new dependency" is deliberately inconsistent.** It is technical under the new rule but
   remains an owner gate at `:96`, by owner decision recorded in *Approved architecture* item 5. Is
   the retention adequately explained where a future reader will meet it — at `:96` — or only in the
   contract, which a future reader has no reason to open?

---

## 10. Suggested reading order

> **Written at round 1, corrected at round 3** where an item had gone stale.

1. **[`task-contract.md`](./task-contract.md) — *Approved architecture*.** The rule text as approved,
   and items 1 to 5 that bind the drafting. Everything else is downstream of this.
2. **The `AGENTS.md` diff.** The new section and the role-table row together — §2 item 1 is decided
   here.
3. **`task-lifecycle.md`, the planning gate and the *Expected file surface* row.** The corrective
   edit — **no longer the block approved at planning**; rounds 1 and 2 changed it, and the contract
   carries both the superseded original and the current approved text — and the delegated wording,
   which was never pre-approved. §2 items 2 and 4.
4. **`git-workflow.md:242`.** One line — §2 item 3.
5. **§3 and §5 of this document.** Scope compliance and the hazard statuses, if the hash evidence
   matters to the verdict.
6. **[`planning-report.md`](./planning-report.md) §4 and §5.** Only if the *placement* of the
   canonical rule is in question — §5 lists what was rejected and why, which is where an argument for
   a different location has to start.

---

## Provenance

Generated by `/prepare-review` on 2026-08-22 against
`docs/workstreams/agent-decision-authority/task-contract.md`, range
`863febe54fce513c4171314eb8cfc0d86f997408..a2357b4708578bff3d73c1945b76c0de074b50a8`, refreshed at round 3.

**What this command did not verify:** it did not review the change, did not judge whether the rule
text is correct or well-placed, did not decide any hazard status, and did not assess whether the
acceptance gate is met — the hash evidence for its third clause is in §3, but reading that as a pass
is the reviewer's inference, not this document's claim. It did not re-run the base-commit
reproduction quoted in §8. It did not push, merge, delete, or open a pull request.
