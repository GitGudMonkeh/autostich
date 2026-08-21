# Task Contract — repository-hygiene-cleanup

**Tier B — feature workstream** (`docs/engineering/task-lifecycle.md` — *Tier B — feature
workstream*).

**Status: approved 2026-08-21, implementation complete, awaiting independent review.** The approval
gate is closed — every open question was answered by the owner and the decisions are recorded under
*Open questions* below. Companion documents: `planning-report.md` and `evidence-package.md` in this
directory.

This contract is the binding scope statement. Where it and the planning report disagree, **this
contract wins**.

---

## Identity

| Field | Value |
| --- | --- |
| **Task** | repository-hygiene-cleanup |
| **Branch** | `feature/repository-hygiene-cleanup` |
| **Base** | `origin/dev` @ `370f1b0f36de99ed2066e7f184479b0ad59bc7d0` |
| **Owner** | TODO — staffing decision; see `AGENTS.md` — *Roles and source of truth* |
| **Integrator** | TODO — staffing decision; see `AGENTS.md` — *Roles and source of truth* |
| **Reviewer** | TODO — staffing decision; see `AGENTS.md` — *Roles and source of truth* |
| **Concurrency** | One writer. Sequential sessions may continue this task in the same worktree. Never two simultaneous writers. |

Ancestry verified at setup time: `origin/main` → `origin/test` and `origin/test` → `origin/dev`,
both `git merge-base --is-ancestor` checks exit 0. **Re-verified during planning on 2026-08-21**,
both exit 0.

---

## Local workspace

| Field | Value |
| --- | --- |
| **Worktree** | `C:/Code/Autostich-worktrees/repository-hygiene-cleanup` |
| **Branch checked out there** | `feature/repository-hygiene-cleanup` |
| **Upstream** | **None.** The branch deliberately does not track its base. |
| **Preview port** | `5181` |
| **Preview URL** | `http://localhost:5181` |

Server invocation:

```bash
npm run dev -- --port 5181 --strictPort
```

`--strictPort` is mandatory (`docs/engineering/NEW_MACHINE_SETUP.md` — *Preview server and ports*).

`npm ci` must have completed in this worktree before any test or lint result from it means anything.
`node_modules/` is per-worktree and is not shared with `C:/Code/Autostich`.

**Note for the implementation session:** this task is expected to need no preview server at all. The
port is reserved because the scaffold reserved it, not because a browser is in scope.

---

## Scope

Four parts, **sequential**, same branch, same worktree. Parts P3 and P4 are conditional on approval.

### P1 — Planning — **complete**

Read-only inventory and classification of every tracked artefact, producing `planning-report.md`:
the current hygiene situation, the four artefact categories, the evidence standard, the rejected
options, and open questions Q1–Q5.

**Delivered.** Nothing was deleted, moved or ignored.

### P2 — Approval gate — **closed 2026-08-21**

The owner settled Q1–Q5. Decisions are recorded verbatim under *Open questions*. Net effect on
scope: the approved removal set is **exactly the three root debug screenshots**, and the approved
addition is **exactly `docs/README.md`**. Everything else in `planning-report.md` §4.2 and §4.4 was
ruled **keep** or **defer** and is now a non-goal of this task.

### P3 — Removal of the approved set — **complete**

For each path the owner approves, in this order:

1. Record the full evidence set E1–E6 (planning report §5) **before** the removal, including the
   commands and their output.
2. `git rm` the path. One commit per artefact category (planning report §6.4) — never one sweeping
   commit.
3. Each commit message carries, per removed path: the **blob SHA** and the **last commit containing
   it**, so recovery is `git checkout <commit> -- <path>`.
4. Demonstrate the recovery command once, for real, on one removed path — then restore the removal.

The approved P3 set is the three unreferenced root debug screenshots (`go-b0.png`, `go-b1.png`,
`unlock.png`; 693,991 bytes) and **nothing else**.

### P4 — `docs/` index — **complete** (Q5 approved)

A `docs/README.md` in the shape of `docs/decisions/README.md`: a table marking each loose document
*live specification* or *historical*, with a date. **A pure addition. No file is moved or renamed**
— planning report §6.3 rejects relocation because `docs/decisions/engineering-log-2026-08.md` cites
these paths and must not be rewritten.

### Then

Gates (see *Definition of done*), self-review of the whole diff against this contract, evidence
package (`task-lifecycle.md` — §7), handoff to independent review. **Integration is authorized, not
assumed.**

---

## Non-goals and tripwire

Touching any of these is a scope breach, not a judgement call.

| Non-goal | Why |
| --- | --- |
| **Any history rewrite** — `git filter-repo`, BFG, rebase of shared history, force-push | Breaks the permanent `main → test → dev` ancestry invariant (`AGENTS.md` — *Branch model*) and invalidates every SHA recorded in task contracts, evidence packages and the engineering log. Planning report §6.1. |
| **Reducing repository or clone size as a goal** | Not achievable without the above. 72.9 % of tracked bytes are `media/`, which is live, guarded and deployed. Planning report §1. |
| **Branch cleanup, local or remote** | Excluded by the task request. `/cleanup-task` owns it, with its own safety conditions (`git-workflow.md` — *Cleanup*). |
| **Worktree creation or removal** | Same. Both existing worktrees are clean and in use. |
| **Any change under `src/`** | This is not a refactor. Product code is not hygiene surface. |
| **Any change under `test/`** | The tripwire — below. |
| **`media/**` — deletion, deduplication or re-encoding** | Guarded by a standing orphan test, published by `deploy-media.yml`, mounted by `vite.config.js`. |
| **`AGENTS.md`, `CLAUDE.md`, `docs/engineering/**`** | Rule documents. Not edited by a task that they govern. |
| **`docs/decisions/**`** | Historical record, explicitly preserved as written (`docs/decisions/README.md`). |
| **Pushing `dev`'s unpushed commit `215bce4c`** | Surfaced in planning report §2.3; belongs to its owner, not to this task. |
| **`node_modules/`, `dist/`, `sim/out/`, `.agents/`** | Untracked or already ignored. Local tidying, not a repository change, and not a deliverable. |
| **Opening a PR, pushing, merging, promoting** | `AGENTS.md` — *House rules*. Not authorized by this task. |
| **Weakening, adjusting or deleting any test** to accommodate a removal | `AGENTS.md` — *House rules*. The tripwire exists to catch exactly this. |

### Tripwire

> **If the diff needs to touch anything under `test/`, stop.**

Self-proving by construction: a hygiene removal that requires editing a test has, by definition,
removed something a test depends on — so the file was live and the removal is wrong. The correct
response is to restore the file and reclassify it as *keep*, naming the consumer. Never to adjust the
test.

### Secondary tripwire

> **Any appearance of `--force`, `-f`, `-D`, `filter-repo`, `push`, or "squash the media history"** —
> including inside a command merely printed for a human — means the rejected size-reduction approach
> has crept back in. Stop.

---

## Approved architecture

Binding statements, not suggestions.

1. **Removal means `git rm` on the current branch. History is the archive.** No history rewrite, no
   `archive/*` branch for individual files, no `docs/archive/` directory. Git history already carries
   the date, the author and the rationale; a relocation carries none of them and breaks path
   citations.
2. **A file that should not be tracked is removed, not `.gitignore`d.** Ignore rules do not apply to
   tracked paths, so ignoring one changes nothing except that `git status` stops reporting it —
   buying the appearance of cleanliness by disabling the tool that reports the problem.
3. **Nothing under `docs/` is moved or renamed.** `docs/decisions/engineering-log-2026-08.md` cites
   these paths and is preserved as written; a rename creates a dangling citation that cannot be
   repaired without editing the record that must not be edited. Where a document's status is unclear,
   the remedy is a **label**, never a move.
4. **One commit per artefact category**, never one sweeping hygiene commit — so that recovering one
   wrongly removed file does not mean reverting everything.
5. **Every removal is recoverable by a single recorded command.** The blob SHA and last containing
   commit go in the commit message, and the recovery is demonstrated once for real.
6. **Basename `grep` is not evidence.** Proven in this repository: 19 files under
   `src/assets/skills/` match no string anywhere and are all live, loaded through
   `import.meta.glob("../assets/skills/*/*.webp", …)` at `src/ui/skillArt.js:21`. The full E1–E5
   standard applies to every candidate.
7. **A reference count is not a verdict.** Counts include historical mentions in the engineering log.
   Every hit is classified *live* or *historical* before it decides anything.
8. **`media/**` is out of bounds**, including its two byte-identical audio pairs. Deduplication there
   would free zero repository bytes and is a game-design question, not a hygiene one.

---

## Task-specific inputs

The repository state this work is measured against. All **measured** on 2026-08-21 at base
`370f1b0f36de99ed2066e7f184479b0ad59bc7d0`; full tables and reproduce commands in `planning-report.md`
§2.1 and §5.6.

| Input | Value |
| --- | --- |
| Tracked content | **214,087,916 bytes**, **876 files** |
| `media/` share | 156,028,330 B — **72.9 %** — live, guarded, deployed |
| `.git` directory | **540 MB** — reducible only by a rejected approach |
| Working tree, excl. `.git` and `node_modules` | 233 MB |
| Duplicate blob hashes | **5** (2 in `media/music/`, 3 in the viewport-harness evidence set) |
| Proposed *safe to remove* set | `go-b0.png`, `go-b1.png`, `unlock.png` — **693,991 B, 0.32 %** |
| Largest deferred candidate | `docs/workstreams/viewport-harness/evidence/` — 10,835,815 B, 23 files |
| Files reading a repository path **as raw text** (ratchet couplings) | `scripts/skill-art-build.py` (`test/skill-art.test.js:104`); `docs/localization/strings_de_pixi_2026-08-15.csv` (`test/loc-csv.test.js:23`); `docs/username-profanity-guard.sql` (`test/profanity-sql.test.js:23`) |
| Standing orphan guard | `test/music-assets.test.js` — no file in `media/music/` may be unreferenced |
| Branch state | All 9 non-permanent branches (local + remote) contained in `origin/dev`; both worktrees clean — **context only, out of scope** |
| Unpushed work | local `dev` is 1 commit ahead of `origin/dev` (`215bce4c`) — **surfaced, out of scope** |

---

## Acceptance gate

The single criterion that decides success or failure:

> **No path leaves its current location without a recorded, reproducible zero-live-reference proof
> (E1–E5 of `planning-report.md` §5), and the full gate set passes on the result.**
>
> A file removed because `grep` found nothing — without accounting for dynamic loading — **fails this
> gate even if the suite is green.** A green suite does not prove a removed file was dead; it proves
> no test read it.

The task fails this gate if a single path is removed on reference-count evidence alone, **whether or
not the removal turns out to have been correct.** The standard is the proof, not the outcome — a
lucky guess is the failure mode this gate exists to prevent.

Scope compliance is verifiable rather than assertable:

```bash
git diff --stat 370f1b0f36de99ed2066e7f184479b0ad59bc7d0 HEAD -- test/ src/ media/ \
  AGENTS.md CLAUDE.md docs/engineering/ docs/decisions/     # must be empty
```

---

## Expected file surface

Indicative, not a licence. Anything outside this is surfaced before it is changed.

**Written by this task**

| Path | Change |
| --- | --- |
| `docs/workstreams/repository-hygiene-cleanup/planning-report.md` | New — **written** |
| `docs/workstreams/repository-hygiene-cleanup/task-contract.md` | This file — **written** |
| `docs/workstreams/repository-hygiene-cleanup/evidence-package.md` | New — at handoff, if P3 runs |
| `docs/README.md` | New — **only if Q5 is approved.** Pure addition. |

**Removed by this task — only after P2 approval**

| Path | Blob | Last containing commit |
| --- | --- | --- |
| `go-b0.png` | 197,508 B | `23434476` |
| `go-b1.png` | 206,893 B | `23434476` |
| `unlock.png` | 289,590 B | `e1f849db` |

Any further removal requires a P2 answer naming it.

**Must not be touched** — verifiable by blob hash rather than inspection:

- `test/**` — the tripwire
- `src/**`
- `media/**`
- `AGENTS.md`, `CLAUDE.md`
- `docs/engineering/**`
- `docs/decisions/**`
- `.gitattributes` — load-bearing (`AGENTS.md` — *Platform*)
- `package.json`, `package-lock.json`, `vite.config.js`, `eslint.config.js`
- `.github/workflows/**`
- Every path listed under *Keep* in `planning-report.md` §4.3

---

## Known hazards

Each must be marked **measured**, **not measured, and why**, or **not applicable** before handoff
(`task-lifecycle.md` — *Two standing rules*).

| # | Hazard | Status at planning |
| --- | --- | --- |
| H1 | **Dynamically loaded assets are invisible to `grep`.** `src/ui/skillArt.js:21` uses `import.meta.glob`, making 19 live files look orphaned. | **Measured** at planning. Re-measure per candidate under E1 in P3. |
| H2 | **Source-text ratchet tests.** Three files are read as raw text by the suite; removing or moving one turns the suite red in a way that reads like a logic failure (`AGENTS.md` — *Hazard*). | **Measured** — all three identified and classified *keep*. Re-check per candidate in P3. |
| H3 | **`docs/decisions/engineering-log-2026-08.md` cites `docs/` paths.** A move creates a dangling citation in a record that must not be rewritten. | **Measured.** Mitigated architecturally: no moves (Approved architecture #3). |
| H4 | **Scope creep into history rewrite.** The 540 MB `.git` is a standing temptation and the only "real" fix for size. | **Measured** and rejected. Secondary tripwire covers it. |
| H5 | **Removing evidence for a completed, reviewed workstream** before its owner has ruled. | **Not resolved — deferred to Q1**, which is blocking for that directory. |
| H6 | **Localization CSVs are generated views.** `loc-csv.test.js` compares one against the catalogs; touching anything under `docs/localization/` requires `npm run loc:export` (`AGENTS.md` — *Additional localization gate*). | **Measured.** The guarded CSV is classified *keep*; the historic exports are deferred to Q2. |
| H7 | **CI-only consumers.** A path can be live to a workflow while invisible to `src/` — `deploy-media.yml` triggers on `media/**`; `deploy.yml` reasons about which directories not to prune. | **Measured.** E4 makes the workflow sweep mandatory. |
| H8 | **Windows/Linux divergence.** CI is Linux; this session is Windows. Case-sensitivity and line endings can make a local result disagree with CI (`AGENTS.md` — *Platform*). | **Not measured** — no gate has been run yet. Applies from P3 onward. |
| H9 | **Concurrency.** Two worktrees exist. A second simultaneous writer here violates `AGENTS.md` — *Worktree and agent ownership*. | **Measured** — both worktrees clean, one writer. |

---

## Definition of done

Ticked only when true.

**Planning**

- [x] Planning report written, covering the situation, the four artefact categories, the evidence
      standard, non-goals, acceptance criteria and risks
- [x] Rejected options recorded **with their reasons** (`planning-report.md` §6)
- [x] The one decision that cannot be corrected cheaply named explicitly (`planning-report.md` §3)
- [x] Task contract completed — scope, non-goals, tripwire, architecture, inputs, acceptance gate,
      file surface, hazards
- [x] Open questions Q1–Q5 raised, each with an owner and a blocking/non-blocking marking
- [x] Nothing deleted, moved, renamed or `.gitignore`d during planning

**Approval gate (P2) — closed 2026-08-21**

- [x] Q1 answered — **KEEP** the viewport-harness evidence
- [x] Q2 answered — **KEEP** the translation delivery files
- [x] Q3 answered — **DEFER** to game design
- [x] Q4 answered — resolve via Q5, with `telemetry.md` left explicitly `unclassified`
- [x] Q5 answered — **APPROVED**: create `docs/README.md`, no moves or renames
- [x] Owner authorized the P3 removal set, naming every path

**Implementation (P3/P4) — complete**

- [x] E1–E5 evidence recorded, with commands and output, for **every** removed path
      (`evidence-package.md` §3)
- [x] E1.2 run specifically — every `import.meta.glob` in the repository enumerated and checked
      against each candidate
- [x] E2 run **before** removal, so absence from `dist/` proves exclusion from the build graph
      rather than being guaranteed by the deletion
- [x] One commit per artefact category; no sweeping hygiene commit
- [x] Every removal commit carries the blob SHA and the recovery anchor (E6)
- [x] Recovery demonstrated for real on `go-b0.png` — restored blob byte-identical to the recorded
      SHA, then the removal re-applied
- [x] Every category in `planning-report.md` §4 has an explicit verdict: removed / kept with the
      consumer named / deferred with an ID
- [x] `docs/README.md` index written — Q5 approved; pure addition, no moves

**Gates**

- [ ] `npm test` — **exit 1.** 1 failed / 2047 passed of 2048. The failure is **pre-existing at the
      base commit** and is a 5,000 ms timeout in `test/i18n-guards.test.js`, not an assertion
      failure. Identical before and after this work; the test reads only `.js`/`.jsx` under `src/**`,
      which §2 of the evidence package proves byte-identical to base. **Left unticked deliberately:**
      the command did not complete successfully, and `AGENTS.md` — *House rules* forbids reporting a
      gate as passing when it did not. Four independent lines of evidence: `evidence-package.md` §6
- [x] `npm run lint -- --max-warnings=0` — exit 0
- [x] `npm run build` — exit 0
- [x] `npm run gen:db` — exit 0; working tree not dirtied by the generator
- [x] `npm run loc:export` — **not applicable.** No player-visible text changed and nothing under
      `docs/localization/` was touched; running it would have produced a diff this task is not
      authorized to make
- [x] Preview build (`VITE_PREVIEW=1`) — **not applicable.** This change touches no code
- [x] Scope compliance proven by the *Acceptance gate* diff command, output empty

**Handoff**

- [x] Every hazard H1–H9 marked *measured*, *not measured and why*, or *not applicable*
      (`evidence-package.md` §8) — H8 (Windows/Linux) is the one open risk
- [x] Evidence package written (`task-lifecycle.md` — §7), stating its own limits
- [ ] Independent review passed; review fixes applied by this worker in this worktree
- [ ] Integration into `dev` **authorized** and performed

**Downgrade record.**

**One acceptance criterion was reduced, and the reduction is owner-approved.**

The *Acceptance gate* has two conjuncts: a proof standard for every removed path, **and** that "the
full gate set passes on the result". The first was met for all three removed paths. **The second was
not met and is not claimed.** `npm test` exits 1.

Recorded under `task-lifecycle.md` — *Two standing rules*: what was promised, what was delivered
instead, who decided, and what gap remains.

| Promised | Delivered | Who decided | Gap that remains |
| --- | --- | --- | --- |
| The full gate set passes, `npm test` included | Lint, build and `gen:db` exit 0. **`npm test` exits 1** — a 5,000 ms timeout in `test/i18n-guards.test.js`, present identically at the base commit, not an assertion failure. Four independent lines of evidence in `evidence-package.md` §6 | **Owner, 2026-08-22**, on the Codex review round: the criterion is reduced from *full gate set green* to *full gate set green except a pre-existing timeout that this task is forbidden to fix*. Fixing it means editing `test/`, which is this task's tripwire | **The suite is not green on this host, and this task does not deliver a green suite.** Whether the same test times out in CI on Linux is **unmeasured** — no CI run has been observed for this branch. The timeout needs its own task, owned by whoever owns the suite |

**What this record deliberately does not say.** It does not say the gate set passed. It does not say
the failure is harmless — only that it is pre-existing, reproduced at the base commit, and outside
the scope this contract permits the worker to touch. A reader asking "did the gates pass on this
work" gets **no** from this table, which is the answer the evidence supports.

Raising that test's timeout would have made this task's report look clean at the cost of editing the
one directory the contract forbids it to touch. That trade was declined, and the owner has accepted
the reduced criterion instead.

---

## Open questions

**Closed 2026-08-21.** The owner's decisions are recorded first; the original questions follow
unedited, so the record shows what was asked as well as what was answered.

### Decisions

| ID | Decision | Effect on scope |
| --- | --- | --- |
| **Q1** | **KEEP** — the viewport-harness evidence remains, because it is the visual evidence for a reviewed acceptance criterion. | `docs/workstreams/viewport-harness/` becomes a must-not-touch path. Verified byte-identical to base in `evidence-package.md` §2. |
| **Q2** | **KEEP** — the translation delivery files are historical business records. | `docs/localization/` becomes a must-not-touch path. Verified untouched; `loc:export` correctly not run. |
| **Q3** | **DEFER** — duplicate music is a game-design question, not a hygiene one. | `media/` untouched. The finding stands recorded in `planning-report.md` §4.4 for whoever picks it up. |
| **Q4** | **Resolve via Q5.** | The `docs/` index is the vehicle. See the honesty constraint below. |
| **Q5** | **APPROVED** — create `docs/README.md`. No moves or renames. | Delivered as a pure addition. |

**Net approved scope:** remove exactly `go-b0.png`, `go-b1.png`, `unlock.png`; add exactly
`docs/README.md`. Do not touch `media/`, `docs/engineering/`, `docs/decisions/`, or the viewport
evidence; move no documents; rewrite no history. Evidence collection precedes any `git rm`.

**How Q4 was resolved, and its one limit.** An agent cannot derive which design documents are live
and which are superseded — a guess there would read as a decision nobody made. The index therefore
**transcribes each document's own self-declared status** (*"Lebendes Dokument"*, *"Status: KONZEPT"*,
*"freigegeben, Umsetzung ausstehend"*, *"Status: GEBAUT"*), quoting the document rather than judging
it, and marks anything that declares nothing as **`unclassified`** rather than quietly assuming it is
obsolete. **One document — `telemetry.md` — remains `unclassified`** and is the single outstanding
item from Q4.

### The questions as originally asked

Blocking as marked. Full context in `planning-report.md` §9.

| ID | Question | Who decides | Blocking? |
| --- | --- | --- | --- |
| **Q1** | Does `docs/workstreams/viewport-harness/evidence/` (10.8 MB, 23 files) stay? The generator is committed, but the harness-vs-real captures *are* the visual evidence for that workstream's decisive acceptance criterion, and their determinism was proven on one host at one DPR — so "regenerable" is weaker here than the rule assumes. | Viewport-harness workstream owner — **not** this task | **Yes**, for that directory |
| **Q2** | Are the completed translator deliveries (`docs/localization/strings_de_banners.csv`, `strings_de_delta_since_85921f7.csv`, `strings_de_delta_test_2026-08-02.csv`, `uebersetzer-liste_test_2026-08-02.md`) a business record that must be retained? | Owner | **Yes**, for those files |
| **Q3** | `media/music/last_light.m4a` = `point_of_no_return.m4a`, and `neon_night_drive.m4a` = `soft_reset.m4a`, byte-identical. Two tracks that sound the same — intended, or an export accident? Resolving it frees no repository bytes. | Game design | No — reportable either way |
| **Q4** | Which of the ~15 loose `docs/*.md` design documents are live specification and which are superseded? No agent can derive this: reference counts are contaminated by historical log mentions. | Owner | **Yes**, for those files |
| **Q5** | Build a `docs/README.md` index marking each loose document live or historical? Pure addition, no moves, no path breakage. | Owner | No — the alternative is to leave `docs/` unindexed |

**Minimum to unblock implementation:** Q1, Q2 and Q4. Deferring all three is a legitimate answer — it
reduces P3 to the three root screenshots, plus the index if Q5 is granted. `planning-report.md` §1
already establishes that the honest deliverable of this task is the classification, not the byte
count.

---

## New findings raised during implementation

Neither was known at planning; both are recorded rather than acted on, because acting on either would
have left the approved scope.

1. **Four branch names referenced as current targets by `docs/` documents no longer exist** —
   `Autostich_Test`, `balancing`, `Autostich/pixi`, `test/sim`. **Measured** 2026-08-21. Six
   documents are affected. `docs/README.md` carries an index-level warning; editing the documents
   themselves was out of scope. See `evidence-package.md` §4.
2. **`npm test` exits 1 at the base commit** — `test/i18n-guards.test.js` times out at 5,000 ms under
   full-suite load while passing in 2.24 s in isolation. **Pre-existing, unrelated, and deliberately
   not fixed:** the fix is an edit to `test/`, which is this task's tripwire. See
   `evidence-package.md` §6.

---

*Contract completed at planning; implementation completed 2026-08-21 within the approved scope.
Nothing has been pushed, merged or promoted. Integration into `dev` requires separate authorization.*
