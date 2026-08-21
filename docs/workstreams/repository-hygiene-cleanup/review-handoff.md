# Review Handoff — repository-hygiene-cleanup

**Reviewer role: independent assessment only. Do not implement.** Findings return to the Claude
worker in this worktree (`feature/repository-hygiene-cleanup`), per `docs/engineering/git-workflow.md`
— *Reviewer ownership*.

**This document is input to a review. It is not an assessment and it records no approval.**

**Round 2 — prepared for re-review.** Round 1 returned *changes requested*. The four requested fixes
have been applied and are listed in §0. Sections that `/prepare-review` left as `TODO` are now filled
by the worker; the hazard statuses in §5 are supplied here for the first time.

---

## 0. What changed since round 1

Four fixes were requested and all four are applied. **No fix changed the deletion scope, touched
`test/`, altered the npm-test timeout, or widened the cleanup.**

| # | Requested | Applied |
| --- | --- | --- |
| 1 | `docs/README.md` — remove volatile file counts, keep the index purpose | The per-directory *Files* column is gone; *"These three PDFs"* → *"The PDFs above"*; *"Two files in this directory"* → *"Generated files here"*. A line now states why counts are not kept here, citing `AGENTS.md` — *House rules*. Every table, status column and routing row is unchanged |
| 2 | `review-handoff.md` — remove mandatory `TODO`s; fill reviewer questions, evidence limits, reading order, hazard statuses | This document. §2, §5, §7, §8, §9, §10 are filled |
| 3 | `task-contract.md` — record the npm-test timeout as an owner-approved criterion reduction; do not claim full gate success | *Downgrade record* rewritten. It now opens **"One acceptance criterion was reduced, and the reduction is owner-approved"**, attributes the decision to the owner on 2026-08-22, and states in terms that the gate set did **not** pass |
| 4 | `evidence-package.md` — add reproducible commands/output for the three removed PNGs only | New **§3 E7**, ten commands (R1–R10) with their real output, every one reading the base tree by SHA so it reproduces after the deletion and after the branch is gone |

**These fixes are currently uncommitted.** See §8 — this is the one thing a reviewer must know before
reading a diff range.

---

## Blocking notice

| Signal | Count | State |
| --- | ---: | --- |
| Hazards without a status | **0** | all nine carry a worker status in §5, supplied 2026-08-22 |
| Hazards whose status is *not measured* | **1** | **H8**, Windows/Linux divergence — the one genuinely open risk |
| Unticked Definition-of-done boxes | **3** | §6; one is a live item, two are the steps this handoff precedes |
| Acceptance-gate conjuncts met | **1 of 2** | proof standard met; **gate set did not pass** — owner-approved reduction, §6 |
| Review fixes committed | **no** | §8 |
| Head commit on a remote branch | **no** | §8 — a reviewer cannot fetch this range yet |
| Gates run in the session that generated this | **0 of 4** | §4 |

---

| | |
| --- | --- |
| **Context** | repository-hygiene-cleanup — Tier B feature workstream |
| **Branch** | `feature/repository-hygiene-cleanup` (**not pushed**, no upstream, not merged into `dev`) |
| **Committed diff** | `370f1b0f36de99ed2066e7f184479b0ad59bc7d0..1b41b4a2a7efd355a9d6cef654f4b9f4f29fa9dc` |
| **Size, committed** | 7 files changed, +1418 · 3 binary deletions contribute no line deletions |
| **Round-2 fixes** | **uncommitted**, 3 files, +175/−18 — see §8 |
| **Worktree** | `C:/Code/Autostich-worktrees/repository-hygiene-cleanup` |
| **Gates** | not run in the generating session — §4 |

Four commits (*measured*):

```
1b41b4a2  docs: record commit SHAs in the hygiene evidence package
b943e743  docs: add repository hygiene workstream records
681186e7  docs: add docs/ index separating live from historical material
11773733  chore: remove unreferenced debug screenshots from repo root
```

Committed change set (*measured*):

```
A  docs/README.md
A  docs/workstreams/repository-hygiene-cleanup/evidence-package.md
A  docs/workstreams/repository-hygiene-cleanup/planning-report.md
A  docs/workstreams/repository-hygiene-cleanup/task-contract.md
D  go-b0.png
D  go-b1.png
D  unlock.png
```

**Range validity — *measured*.** `git merge-base --is-ancestor <base> <head>` exits **0**. No rebase
or force-push has invalidated the range. SHAs are quoted rather than branch names so the range
survives branch deletion (`task-lifecycle.md` — *Evidence package*).

---

## 1. What was agreed

The binding scope statement is `task-contract.md` in this directory. It is **not** restated here.
Companion documents: `planning-report.md` (rejected options, evidence standard) and
`evidence-package.md` (per-path proof).

All ten contract sections named by `task-lifecycle.md` — *The task contract* are present (*measured*).
No section absent.

The contract's **Acceptance gate**, quoted verbatim:

> **No path leaves its current location without a recorded, reproducible zero-live-reference proof
> (E1–E5 of `planning-report.md` §5), and the full gate set passes on the result.**
>
> A file removed because `grep` found nothing — without accounting for dynamic loading — **fails this
> gate even if the suite is green.** A green suite does not prove a removed file was dead; it proves
> no test read it.

**The gate has two conjuncts, and only the first is met.** The proof standard is satisfied for all
three removed paths (§3, and `evidence-package.md` §3 E1–E7). The gate set **did not pass** —
`npm test` exits 1. That is now recorded as an owner-approved criterion reduction in the contract's
*Downgrade record*, not as a pass. This handoff makes no claim of gate success anywhere.

---

## 2. The claims to check

Four claims carry this task. Each is stated as a claim, with where to check it and what would falsify
it — so a reviewer can attack it rather than re-derive it.

**C1 — the three removed files were dead, and were proven dead rather than guessed dead.**
Check `evidence-package.md` §3, E1–E7. The contract's *Approved architecture* #6 forbids basename
`grep` as evidence, because 19 live files under `src/assets/skills/` match no string anywhere and are
loaded through `import.meta.glob`. **Falsified by:** any consumer of the three paths that the E1
sweeps could not see — a runtime string built at execution time, an external reference, or a consumer
outside the tracked tree. R6 is the check that closes the dynamic-loading route; press on whether its
scope (`src test scripts sim`) is wide enough.

**C2 — the removal is recoverable by one recorded command.**
Check E6 and R10. **Falsified by:** a blob that no longer hashes to the recorded SHA, or a recovery
anchor that stops resolving once the branch is deleted. Note R10 proves the object is intact without
writing to your tree.

**C3 — `docs/README.md` transcribes each document's self-declared status rather than judging it.**
This is the honesty constraint the owner set when resolving Q4 through Q5. Check the *How to read the
Status column* section, then spot-check three rows against the documents themselves.
**Falsified by:** any row whose status is an inference the source document does not support — the
failure mode is a document quietly marked *historical* because it looked old. `telemetry.md` is
deliberately left `unclassified` and is the test case for whether the rule was actually followed.

**C4 — nothing outside the approved scope changed.**
Check §3 of this document. **Falsified by:** any object hash differing between base and head for a
must-not-touch entry, or a change hiding in the one entry that cannot be hashed (row 14).

---

## 3. Scope compliance — verified by object hash

**Method (*measured*).** Each must-not-touch entry from the contract's *Expected file surface* was
resolved at both ends of the range with `git rev-parse --verify`. A directory resolves to a **tree**
hash, which proves the subtree byte-identical recursively — including that nothing was **added**
beneath it. `--verify` is used because the bare form echoes an unresolvable argument and exits 0,
which would report a wildcard entry wrongly in either direction.

The contract's list is 10 bullets carrying **14 entries** — three bullets list several paths.

| # | Entry | Type | Hash at base and head | Verdict |
| ---: | --- | --- | --- | --- |
| 1 | `test/**` — the tripwire | tree | `2d586cf549949049eb9e993aa49b8cf847d71267` | unchanged |
| 2 | `src/**` | tree | `342f7f43a02be6f9933408841307ab8f40450cb6` | unchanged |
| 3 | `media/**` | tree | `f2246c5a89dcc5028606efd8d83a179a01d67c2d` | unchanged |
| 4 | `AGENTS.md` | blob | `696f110907a25e3022a838c4af2c92c3380d5a6c` | unchanged |
| 5 | `CLAUDE.md` | blob | `af4493607150456cd0f79a20d2b4853a18902ba5` | unchanged |
| 6 | `docs/engineering/**` | tree | `7be190c29d4c9c52143f62a8f0c360a289251e91` | unchanged |
| 7 | `docs/decisions/**` | tree | `67eef85f0161fe478d060a7df01ef5ff20780884` | unchanged |
| 8 | `.gitattributes` | blob | `c05763671ceca4a0023c19a4434c66a93c85363c` | unchanged |
| 9 | `package.json` | blob | `4130c1641333d8e213642f9b3a60ac20585413a8` | unchanged |
| 10 | `package-lock.json` | blob | `7eed7f16416b4de56ac880f6e0b65e291115c366` | unchanged |
| 11 | `vite.config.js` | blob | `9c7ec59c4765d6e34aefc4e685fc7c10a1aac06f` | unchanged |
| 12 | `eslint.config.js` | blob | `3ebdf1a7dc83f433495dc6d76d4ad9abfe8cbc96` | unchanged |
| 13 | `.github/workflows/**` | tree | `a9a5a2055580d3a87456b69b1a6ada963bb879d3` | unchanged |
| 14 | Every path listed under *Keep* in `planning-report.md` §4.3 | — | — | **not mechanically verifiable — reviewer must judge** |

Rows 1–13 are *measured*. Row 14 is an indirection into another document; no hash can verify it, and
it is printed rather than dropped.

### Two further must-not-touch paths, declared outside that section

The contract's *Open questions* creates two more must-not-touch paths that are **not** in the
*Expected file surface* list — `task-contract.md:370` and `:371`. A reviewer working only from the
file-surface section would miss that the scope surface is split across two sections.

| Entry | Source | Type | Hash at base and head | Verdict |
| --- | --- | --- | --- | --- |
| `docs/workstreams/viewport-harness/` | Q1 decision | tree | `8e82be859140ca6c31d8c6a74d17b17f34d1ca01` | unchanged |
| `docs/localization/` | Q2 decision | tree | `8d77e56028885fe130e6bf47836162f935279708` | unchanged |

### The round-2 fixes stay inside the same surface

*Measured* on the uncommitted working tree: `git status --porcelain` restricted to all 15 protected
paths returns **empty**. The three modified files are `docs/README.md`,
`docs/workstreams/repository-hygiene-cleanup/task-contract.md` and
`.../evidence-package.md` — all three already inside this task's *written by this task* surface.

**Reproduce** — expected: every pair identical, every command exit 0.

```bash
W=C:/Code/Autostich-worktrees/repository-hygiene-cleanup
BASE=370f1b0f36de99ed2066e7f184479b0ad59bc7d0
HEAD=1b41b4a2a7efd355a9d6cef654f4b9f4f29fa9dc
for e in test src media docs/engineering docs/decisions .github/workflows \
         AGENTS.md CLAUDE.md .gitattributes package.json package-lock.json \
         vite.config.js eslint.config.js \
         docs/workstreams/viewport-harness docs/localization; do
  MSYS_NO_PATHCONV=1 git -C "$W" rev-parse --verify "$BASE:$e"
  MSYS_NO_PATHCONV=1 git -C "$W" rev-parse --verify "$HEAD:$e"
done
```

---

## 4. Gate results

**No gate was run in the session that generated this document**, and none was run during the
round-2 fixes. The fixes changed three Markdown files and no code.

| Gate | Run in this session | Result |
| --- | --- | --- |
| `npm test` | **no** | not run in this session — no result |
| `npm run lint -- --max-warnings=0` | **no** | not run in this session — no result |
| `npm run build` | **no** | not run in this session — no result |
| `npm run gen:db` | **no** | not run in this session — no result |

### Prior claims — quoted, not verified

**Claims recorded by the worker**, quoted from `evidence-package.md` §5, dated 2026-08-21. They were
**not** observed by the generating session and are not gate results in this document.

| Gate | Claimed exit | Claimed result |
| --- | ---: | --- |
| `npm test` | **1** | "1 failed / 2047 passed of 2048 — **pre-existing**, see §6" |
| `npm run lint -- --max-warnings=0` | **0** | "Clean" |
| `npm run build` | **0** | "Built in 5.77 s" |
| `npm run gen:db` | **0** | "219 entries generated" |

Also claimed there: `npm run loc:export` — *"not applicable, and deliberately not run"*; preview build
(`VITE_PREVIEW=1`) — *"not applicable… This change touches no code at all"*.

*Observed*, consistent with that last claim: the change set contains no file under `src/`, `test/` or
`src/i18n/`. Whether the two not-applicable rulings are correct is a reviewer's call.

**A re-run is worth requesting before integration**, because the last recorded run predates the
round-2 fixes. The fixes touch only Markdown, so the expectation is an unchanged result — which is a
prediction, not a measurement.

---

## 5. Hazards — statuses supplied by the worker

Nine hazards, all with a status, supplied **2026-08-22** at the review-fix round. Each is *measured*,
*not measured and why*, or *not applicable*, per `task-lifecycle.md` — *Two standing rules*.

The contract's own hazards table carries a *"Status at planning"* column. That is a different claim at
a different time and has **not** been reused as a handoff status; each status below rests on a
measurement taken at, or re-taken at, the current head.

| # | Hazard (abridged; verbatim in the contract) | Status at handoff | Basis |
| ---: | --- | --- | --- |
| H1 | Dynamically loaded assets are invisible to `grep` | **measured** | R6 — every `import.meta.glob` in `src test scripts sim` at base: exactly one, pattern `../assets/skills/*/*.webp`, which cannot match a repository-root `.png` |
| H2 | Source-text ratchet tests | **measured** | `test/` tree hash identical at base and head (`2d586cf5…`), so no test file changed. Separately verified: no test reads `docs/README.md` |
| H3 | Engineering-log path citations broken by a move | **not applicable** | Nothing was moved or renamed. `docs/decisions` tree hash identical at both ends (`67eef85f…`) |
| H4 | Scope creep into history rewrite | **measured** | Four ordinary commits; base is an ancestor of head (exit 0), so no rebase or force-push. No `filter-repo`, no force flag, nothing pushed |
| H5 | Removing evidence for a completed, reviewed workstream | **not applicable** | Q1 ruled *keep*. `docs/workstreams/viewport-harness` tree hash identical at both ends (`8e82be85…`) |
| H6 | Localization CSVs are generated views | **measured** | `docs/localization` tree hash identical at both ends (`8d77e560…`) — nothing touched, so `loc:export` is correctly not run |
| H7 | CI-only consumers | **measured** | R7 — zero hits for the three filenames in `.github` at base; `.github/workflows` tree hash identical at both ends (`a9a5a205…`) |
| H8 | Windows/Linux divergence | **not measured — and this is the one open risk** | See below |
| H9 | Concurrency | **measured, with a disclosure** | See below |

**H8 — not measured, and why.** Every gate result on record was produced on the Windows development
host. **No CI run has been observed for this branch, and none can have been: the branch is not
pushed** (§8), so no Linux run exists to compare against. The claim that the change is
divergence-safe is *inferred* — two binary deletions and one added LF Markdown file, with no rename
and no case change, are not the shapes that usually cause Windows/Linux divergence — and inference is
not measurement. **The first Linux evidence will arrive only after the branch is pushed and CI runs.**
A reviewer should treat this as the residual risk of the whole task.

**H9 — measured, with a disclosure.** One writer throughout; no two sessions wrote simultaneously.
The disclosure: the round-2 fixes were applied by a session invoked from the **cockpit checkout**
(`C:/Code/Autostich`) writing into **this** worktree, rather than by a session running inside it. The
worktree had no other writer, and every write landed in this workstream directory or `docs/README.md`
— but it was a cross-worktree write and is recorded rather than left to be discovered.

---

## 6. Definition of done — unticked boxes

**Three** boxes are unticked (*measured*), quoted verbatim including their explanatory text:

1. > `- [ ]` `npm test` — **exit 1.** 1 failed / 2047 passed of 2048. The failure is **pre-existing at
   > the base commit** and is a 5,000 ms timeout in `test/i18n-guards.test.js`, not an assertion
   > failure. Identical before and after this work; the test reads only `.js`/`.jsx` under `src/**`,
   > which §2 of the evidence package proves byte-identical to base. **Left unticked deliberately:**
   > the command did not complete successfully, and `AGENTS.md` — *House rules* forbids reporting a
   > gate as passing when it did not. Four independent lines of evidence: `evidence-package.md` §6

2. > `- [ ]` Independent review passed; review fixes applied by this worker in this worktree

3. > `- [ ]` Integration into `dev` **authorized** and performed

Box 1 is a live item and is now covered by the downgrade record below. Boxes 2 and 3 describe the
review and integration steps this handoff precedes; box 2 is **half** true after round 2 — the fixes
are applied, the review has not passed — and is deliberately left unticked rather than partially
ticked.

### Downgrade record — rewritten at round 2, quoted verbatim

> **One acceptance criterion was reduced, and the reduction is owner-approved.**
>
> The *Acceptance gate* has two conjuncts: a proof standard for every removed path, **and** that "the
> full gate set passes on the result". The first was met for all three removed paths. **The second was
> not met and is not claimed.** `npm test` exits 1.
>
> | Promised | Delivered | Who decided | Gap that remains |
> | --- | --- | --- | --- |
> | The full gate set passes, `npm test` included | Lint, build and `gen:db` exit 0. **`npm test` exits 1** — a 5,000 ms timeout in `test/i18n-guards.test.js`, present identically at the base commit, not an assertion failure | **Owner, 2026-08-22**, on the Codex review round | **The suite is not green on this host, and this task does not deliver a green suite.** Whether the same test times out in CI on Linux is **unmeasured**. The timeout needs its own task |

---

## 7. Evidence and its limits

**File state — *measured*.** Four documents; three committed, one untracked, three with uncommitted
round-2 edits.

| Path | State |
| --- | --- |
| `task-contract.md` | committed, **modified** at round 2 (downgrade record) |
| `planning-report.md` | committed, unmodified |
| `evidence-package.md` | committed, **modified** at round 2 (§3 E7 added) |
| `review-handoff.md` | **untracked** — this file |

**No captured images exist for this workstream** (*measured*). This task moved no pixels, so
`task-lifecycle.md` — *Visual review* V1–V4 does not apply and no visual finding is classified here.

### The limits of this evidence, stated plainly

- **Platform.** Every gate and every sweep was run on **Windows 11 / Git Bash**. Nothing has been run
  on Linux, and CI has never seen this branch. This is H8 and it is the largest gap.
- **Gate freshness.** The gate results on record are from **2026-08-21**, before the round-2 fixes.
  Nothing has been re-run since. The fixes are Markdown-only, so an unchanged result is *expected* —
  expected, not measured.
- **Scope proof has one hole by construction.** Row 14 of §3 — *"Every path listed under Keep in
  `planning-report.md` §4.3"* — is an indirection no hash can check. Thirteen of fourteen entries are
  proven; the fourteenth is a reviewer's judgement.
- **The reference sweeps cover the tracked tree only.** R5–R9 read the base tree by SHA. A consumer
  living outside version control — a local script, a bookmark, an external document — would not
  appear. For three debug screenshots at the repository root this is a small risk, but it is not zero
  and it is not measured.
- **A numeric claim in E1.4 does not reproduce.** The evidence package says the `unlock` stem appears
  42 times; a sweep at base on 2026-08-22 gives **450 occurrences across 39 files**. The correction is
  recorded beside the original in `evidence-package.md` §3 R8/R9 rather than silently patched. The
  *load-bearing* claim is unaffected and is now mechanically checked: **zero** occurrences name an
  image file.
- **Nothing here proves the removed files were never useful** — only that nothing in the tracked tree
  referenced them. "Unreferenced" and "worthless" are different claims; this task only ever asserted
  the first.

---

## 8. Known state a reviewer will hit

**1 — The round-2 fixes are uncommitted.** *Measured:* `git status --porcelain` shows three modified
files and this untracked handoff. **The committed range `370f1b0f..1b41b4a2` therefore does not
contain the review fixes.** To see them:

```bash
git -C C:/Code/Autostich-worktrees/repository-hygiene-cleanup diff
```

Committing them is the next step and requires authorization (`AGENTS.md` — *House rules*); this
session did not commit.

**2 — The head commit is on no remote branch.** *Measured:* `git branch -r --contains 1b41b4a2`
returns empty and the branch has no upstream. **A reviewer cannot fetch this range yet.** The work
exists only in this local worktree, which `git-workflow.md` — *Pushing and durable state* treats as
not yet durable. Pushing is a separate authorization and was not performed.

**3 — `npm test` exits 1, and this task does not fix it.** A 5,000 ms timeout in
`test/i18n-guards.test.js`, claimed present identically at the base commit. Not reproduced by the
generating session. The fix is an edit to `test/`, which is this task's tripwire, so the task is
forbidden to make it. Recorded as an owner-approved criterion reduction, §6.

**4 — Two must-not-touch paths are declared outside the file-surface section**, in *Open questions*
Q1/Q2. Both verified unchanged (§3), but a reviewer reading only *Expected file surface* would not
know they were in scope.

**5 — `telemetry.md` remains `unclassified` in `docs/README.md`.** Deliberate: the index transcribes
self-declared status and that document declares none. It is the single outstanding item from Q4.

---

## 9. Open questions for the reviewer

Five. Each is a decision that was deferred or a judgement the worker should not make alone — none is
a defect.

1. **Is the Q4 resolution honest enough, or does `docs/README.md` still judge where it should
   transcribe?** The index quotes each document's self-declared status and marks the rest
   `unclassified`. Spot-check `stein-fraktion.md`, `gameplay-redesign.md` and `telemetry.md` against
   their sources. The failure mode to look for is a row where the worker's summary is more confident
   than the document it summarises.

2. **Is one `unclassified` row an acceptable outcome, or does Q4 need a second owner pass?**
   `telemetry.md` declares no status and none is derivable. The alternative — guessing — is what the
   Q4 resolution deliberately refused. Leaving it open means the index ships with a visible gap.

3. **Should the round-2 fixes be one commit or three?** The contract's *Approved architecture* #4
   requires one commit per artefact category and forbids a sweeping commit. Review fixes across three
   documents are arguably one category — "review fixes" — or three. The worker has not committed
   them, precisely because this is a decision the reviewer's rule should settle.

4. **Does the E1.4 count discrepancy warrant re-verifying the other numeric claims in the evidence
   package?** One number did not reproduce (§7). It was decorative and the load-bearing claim beside
   it is now mechanically checked — but a reviewer may reasonably want the byte counts and the
   "0.32 %" figure re-derived before integration.

5. **Is integration acceptable while H8 is unmeasured?** The branch has never been pushed, so CI has
   never run. The choice is to integrate on Windows-only evidence, or to require a push and a green
   Linux run first. That is a release decision, not a code one.

---

## 10. Suggested reading order

1. `task-contract.md` — *Scope*, *Non-goals and tripwire*, *Acceptance gate*. What was agreed, and the
   two-conjunct gate that §6 reports against.
2. `task-contract.md` — *Downgrade record*. Rewritten at round 2; the one place the task says plainly
   what it did not deliver.
3. §3 of this document — scope compliance. Thirteen hashes and one entry that cannot be hashed.
4. `evidence-package.md` §3 **E7 (R1–R10)** — the reproducible block. Start here rather than at E1:
   it is the shortest path to re-deriving the removal evidence yourself.
5. `evidence-package.md` §3 **E1.2 and the R8/R9 correction** — the dynamic-loading check, which is
   the one that would have been skipped, and the numeric correction beside it.
6. `docs/README.md` — *How to read the Status column*, then three spot-checked rows. This is C3.
7. §5 and §9 of this document — the hazard statuses, and H8 in particular.
8. `planning-report.md` §6 — the rejected options, if the question is *why this shape* rather than
   *is this shape correct*.

Everything in §3 and in `evidence-package.md` E7 is reproducible; the commands are printed beside
their output in both places.

---

## Provenance

Generated by `/prepare-review` on **2026-08-22** from
`docs/workstreams/repository-hygiene-cleanup/task-contract.md`, without `--run-gates`. Completed by
the worker at the round-2 review-fix pass on the same day: §2, §5, §7, §8, §9 and §10 are worker
content; §0, §3, §4 and §6 are command output.

**Measured by the command:** the section map; the range and its ancestry; the commit list and size;
the push state; 15 object-hash comparisons; the presence and location of each hazard's recorded
status; three unticked done-criteria; the workstream file state.

**Measured by the worker at round 2:** the uncommitted change surface against all 15 protected paths;
R1–R10 in `evidence-package.md` E7; the `unlock`-stem recount; that no test reads `docs/README.md`.

**Not verified by anything here:** every gate — none was run in either session. Whether the E1–E5
proofs are sound. Row 14 of §3. Any CI or Linux behaviour.

**Not done:** no review, no approval, no visual classification, no gate run, no commit, no push, no
merge, no pull request. **This document records no approval and none should be inferred from it.**
