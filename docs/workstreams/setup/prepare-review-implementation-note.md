# Implementation Note — `/prepare-review`

Written 2026-08-22, before implementation. Scope: **`/prepare-review` only.** `/cleanup-task` and
`/create-task` exist, are validated, and are **not modified by this work.**

Design source: `command-layer-design.md` §2.2, §3, §4, §5, and its implementation order §6 step 3.
Precedent: `cleanup-task-implementation-note.md`, `create-task-implementation-note.md`, and the two
command files themselves.

Rules remain in `AGENTS.md`, `docs/engineering/task-lifecycle.md` and
`docs/engineering/git-workflow.md`. This note records **how the command is built**, not what the
process is.

---

## 1. Command file structure

One file: `.claude/commands/prepare-review.md`, project-scoped and committed.

**Frontmatter**

| Field | Value | Why |
| --- | --- | --- |
| `description` | one line | shown in `/help` |
| `argument-hint` | `<contract-path> [--base <sha>] [--head <sha>] [--run-gates]` | design §3, plus open question 3 |
| `allowed-tools` | see §2 | narrowest set that still reads a range and writes one file |
| `disable-model-invocation` | `true` | a command that emits a durable review document must fire only when a human types it |

`model` deliberately unset — inherit the session model.

**Body — steps in fixed order.** The ordering principle is the same as `/create-task`: every check
that can invalidate the whole output runs before any of it is assembled, and the one write is last.

| Step | Does | Class |
| --- | --- | --- |
| — | Preamble: posture, cited rules, prohibition list | — |
| 1 | Parses arguments; **stops** if the contract path is missing or does not exist | — |
| 2 | Locates the contract's sections by name; records each as present or *section absent* | 0 |
| 3 | Resolves base and head to full SHAs | 0 |
| 4 | **Ancestry of the range** — base must be an ancestor of head; **abort** if not | 0 |
| 5 | Range facts: commit list, file/insertion/deletion counts | 0 |
| 6 | Push state of the head commit | 0 |
| 7 | Scope compliance by object hash, per must-not-touch entry | 0 |
| 8 | Hazard rows, verbatim, status unset | 0 |
| 9 | Gates — `--run-gates` runs them unpiped, otherwise every row reads *not run* | 0 |
| 10 | Definition-of-Done extract: every unticked box | 0 |
| 11 | Evidence-image state | 0 |
| 12 | Writes `review-handoff.md` at a path that does not exist | 1 |
| 13 | Output, outcome, and what a human must do next | — |

**Why the write is step 12 and not earlier.** Every preceding step can degrade to a named gap, and a
gap belongs *in* the document. Only the step-4 ancestry failure aborts, and it aborts before anything
is written, because a handoff whose diff range is meaningless is worse than no handoff.

The body is written as directives to Claude, not as prose describing the command to a user
(design §5.2).

---

## 2. Allowed tools

```text
Bash(git rev-parse:*), Bash(git merge-base:*), Bash(git log:*), Bash(git diff:*),
Bash(git cat-file:*), Bash(git status:*), Bash(git branch:*), Bash(git -C:*),
Bash(MSYS_NO_PATHCONV=1 git:*),
Bash(npm test:*), Bash(npm run:*), Bash(npx vitest run:*),
Read, Grep, Glob, Write
```

**The list was trimmed to what the body actually invokes**, verified rather than assumed: the body's
git surface is `rev-parse`, `diff`, `status`, `merge-base`, `log`, `cat-file`, `branch` and nothing
else. `git ls-files`, `git ls-tree`, `git for-each-ref` and `git rev-list` were in the first draft and
were removed once Finding 2 replaced the expansion step with a tree comparison and a
`git diff --name-status` drill-down. An allowlist entry with no caller is a permission granted for
nothing.

**`Bash(MSYS_NO_PATHCONV=1 git:*)` is a separate entry, deliberately.** Prefix matching is anchored at
the start of the command string, and every hash comparison in this command begins with the
environment assignment rather than with `git` — so `Bash(git rev-parse:*)` does not cover it. Without
this entry each of those calls prompts. *Inferred from how prefix rules are written, not measured
against the permission engine;* if it turns out to prompt anyway, that is a safe failure — a prompt
in a command whose invocation is already human-typed.

**`git fetch` is absent.** The command measures a local range and a local contract. It reports the
push state it observes; refreshing remote-tracking refs is not its job, and a fetch inside a
document-generating command would make the same invocation produce different documents on different
days for reasons unrelated to the work.

**`Bash(git branch:*)` is present here, unlike in `/create-task`.** It is needed for
`git branch -r --contains <head>`, the push-state measurement. It is a prefix rule and therefore also
permits `git branch -d`/`-D` — stated plainly rather than hidden. The control is the prohibition list
in the body plus `disable-model-invocation: true`.

**`Write` but no `Edit`.** The command creates one file at a path that does not exist and never
modifies an existing one — not the contract, not the source, not a rule document. Absence of `Edit`
is what makes "never rewrites the contract" checkable from the frontmatter rather than only from the
body.

**Gate entries are opt-in at runtime, not at the allowlist.** `Bash(npm test:*)` and
`Bash(npm run:*)` are permitted so that `--run-gates` can work at all; without the flag the command
runs none of them and every gate row reads *not run — no result*. `Bash(npm run:*)` also permits
scripts that are not gates; the body names the ones it may run and no others.

**Three entries the allowlist cannot scope safely, stated plainly** (same posture as the two existing
notes):

- `Bash(git -C:*)` permits **any** git subcommand in another worktree, including destructive ones. It
  is required because the contract's worktree is usually not the worktree the command runs in.
- `Bash(git branch:*)` permits deletion, as above.
- `Bash(npm run:*)` permits any script in `package.json`.

So the allowlist is a first line of defence, **not the control.**

---

## 3. What it derives, and what it never fills

Everything in this table has exactly one correct answer, which is why the command may compute it.

| Value | Derivation | Cited rule |
| --- | --- | --- |
| Base SHA | `--base`, else the Identity section's recorded base | `task-lifecycle.md` — *The task contract*, Identity |
| Head SHA | `--head`, else `HEAD` of the contract's worktree | design §2.2 |
| Range validity | `git merge-base --is-ancestor <base> <head>` | design §2.2 |
| Commit list | `git log --oneline --no-decorate <base>..<head>` | `task-lifecycle.md` — *Evidence package* |
| Size | `git diff --shortstat <base> <head>` | same |
| Push state | `git branch -r --contains <head>` | `git-workflow.md` — *Pushing and durable state* |
| Scope compliance | object hash per must-not-touch entry — §4 | `task-lifecycle.md` — *The task contract*, property 1 |
| Hazard rows | verbatim from the contract's hazards section | `task-lifecycle.md` — *Two standing rules* |
| Unticked DoD boxes | unticked checkbox rows in the Definition of done section | same |
| Gate rows | run in this session with an exit code, or *not run* | `AGENTS.md` — *Validation gates* |

**What it never fills**, restated because the whole value of the document depends on it: a review
outcome, an approval, a hazard status, a visual classification, a gate result it did not observe, or
a scope verdict for an entry it could not hash. Each of those is a heading, a `TODO`, or a verbatim
*not mechanically verifiable* row.

**Section location is by name stem, and the stem is matched loosely on purpose.** Measured across the
two contracts in this repository:

| Lifecycle name | `repository-hygiene-cleanup` | `viewport-harness` |
| --- | --- | --- |
| Identity | `## Identity` | `## 1. Identity` |
| Non-goals and tripwire | `## Non-goals and tripwire` | `## 4. Non-goals — explicitly out of scope` |
| Acceptance gate | `## Acceptance gate` | `## 8. Critical acceptance gate` |
| Expected file surface | `## Expected file surface` | `## 9. Expected file surface for T1` |
| Known hazards | `## Known hazards` | `## 10. Known hazards carried into T1` |

*Measured 2026-08-22.* An exact-string match would report five sections absent on the older contract
and produce a handoff that looks like a contract with no hazards and no scope. So the match tolerates
a leading `N.` and surrounding qualifiers, and **reports which heading it matched**, so a wrong match
is visible rather than silent. No match is *section absent* — never a substitution.

---

## 4. Three measurements that changed the implementation

Each was measured against this repository rather than assumed, and each would have produced a wrong
scope-compliance table — an entry reported as verified without being checked, or reported as breached
without having changed — if implemented the way the design report describes.

### Finding 1 — `git rev-parse <rev>:<path>` fails open on a glob. Use `--verify`.

Design §2.2 specifies `git rev-parse <base>:<path>` against `git rev-parse <head>:<path>`. Measured
2026-08-22 in this repository:

| Argument | Exit | stdout |
| --- | --- | --- |
| `git rev-parse "dd36c3ef:src/index.css"` | 0 | `c1b3ccfd858cd6dab7df30fefd83456947ce686b` |
| `git rev-parse "dd36c3ef:zzz/nope"` | **128** | `fatal: path 'zzz/nope' does not exist` + the argument echoed |
| `git rev-parse "dd36c3ef:test/**"` | **0** | the argument, **echoed verbatim** |
| `git rev-parse "dd36c3ef:zzz/**"` | **0** | the argument, echoed — for a path that does not exist |

A missing path fails loudly. **A path containing a wildcard does not** — `rev-parse` passes the
unrecognized argument through and exits **0**. So an implementation that checks exit codes sees
success, and what it then reports depends entirely on how it compares stdout. Both outcomes were
measured on the real range `370f1b0f..1b41b4a2`:

| How stdout is compared | Result for `test/**` | Failure mode |
| --- | --- | --- |
| raw strings | `370f1b0f…:test/**` vs `1b41b4a2…:test/**` — differ | **false alarm** — a scope breach reported on six entries that never changed |
| with the revision prefix stripped, a normalization an implementer would plausibly write | `test/**` vs `test/**` — equal | **false pass** — the entry reported verified, never checked |

Neither is acceptable and the exit code hides both. The false pass is the more dangerous; the false
alarm is the more corrosive, because a scope table that cries breach on every run is a table people
stop reading. Measured on the first validation target: the hygiene contract's must-not-touch list
contains `test/**`, `src/**`, `media/**`, `docs/engineering/**`, `docs/decisions/**` and
`.github/workflows/**` — **six glob-shaped entries, including the task's own tripwire directory**,
every one of them landing in whichever of the two failure modes the implementation happened to pick.

The fix is `--verify`, which is loud on every unresolvable argument:

| Argument | Exit | stdout |
| --- | --- | --- |
| `git rev-parse --verify "dd36c3ef:src/index.css"` | 0 | the blob hash |
| `git rev-parse --verify "dd36c3ef:src/ui/fx"` | 0 | the **tree** hash |
| `git rev-parse --verify "dd36c3ef:test/**"` | **128** | `fatal: Needed a single revision` |
| `git rev-parse --verify "dd36c3ef:zzz/nope"` | **128** | `fatal: Needed a single revision` |

**Every hash comparison in this command uses `--verify`, and a non-zero exit is never read as a
result.** The command additionally treats any stdout that is not a 40-character hex string as a
failed resolution, so the belt holds if a future Git changes the wording.

### Finding 2 — a directory resolves to a tree hash. Prefer it to `ls-files` expansion.

Design §2.2 says directory entries are expanded through `git ls-files`. Measured, a directory
argument resolves directly:

```text
git rev-parse --verify "dd36c3ef:src/ui/fx"   ->  1997e85207b5ab30afd09120ee133a4ed6a98967   (tree)
git rev-parse --verify "908570cc:src/ui/fx"   ->  1997e85207b5ab30afd09120ee133a4ed6a98967   (tree)
git cat-file -t "dd36c3ef:src/ui/fx"          ->  tree
```

Equal tree hashes prove the **entire subtree** byte-identical, recursively, in one comparison. That
is strictly stronger than enumerating today's files and hashing each: enumeration cannot detect a
file **added** into a must-not-touch directory, because the added path is not in the base listing. A
tree hash detects it, because the tree changed.

So: **a trailing-wildcard entry has the wildcard stripped and is compared as a tree; expansion
through `git ls-files` is the drill-down used only when the trees differ**, to name which paths
moved. A wildcard that is not trailing — `src/**/*.jsx` — resolves under neither form and is reported
*not mechanically verifiable*.

*Deliberate deviation from design §2.2, recorded here with its reason.* The design's intent — every
must-not-touch entry either hashed or explicitly declared unverifiable — is unchanged and better
served.

### Finding 3 — one bullet is not one entry. Split on the commas.

The design speaks of "every must-not-touch path" as though the contract's list were one path per
line. Measured on the hygiene contract, it is not:

```text
- `test/**` — the tripwire                                                   1 path + prose
- `AGENTS.md`, `CLAUDE.md`                                                   2 paths
- `package.json`, `package-lock.json`, `vite.config.js`, `eslint.config.js`  4 paths
- Every path listed under *Keep* in `planning-report.md` §4.3                an indirection
```

**10 bullets, 14 entries.** An implementation that treats a bullet as an entry checks
`package.json` and reports the bullet verified — while `package-lock.json`, `vite.config.js` and
`eslint.config.js` are never looked at and appear, to a reader, to have been. The failure is quiet
and it lands on the config files, which is where an out-of-scope change is most likely to hide.

So step 7 splits each bullet on commas, strips trailing prose after an em dash, and reports the
**entry** count alongside the bullet count so the two can be compared at a glance.

### Counter-check of the scope primitive

`testing.md` §5 — a guard that is merely green is not evidence. The step-7 primitive was run against
the real range `370f1b0f..1b41b4a2`, then the protected seam was **deliberately broken** to prove it
fails. Run 2026-08-22, read-only, no handoff produced.

**Green half** — all 13 mechanically verifiable entries resolved: 6 trees, 7 blobs, every one
`unchanged`. On its own this proves nothing, which is the point of the other half.

**Broken half** — three paths that genuinely moved in this range, and the glob form:

| Probe | Expected | Measured |
| --- | --- | --- |
| `docs` — a tree containing an added file | must not report unchanged | base `323933c0…` vs head `32de5fa8…` → **CHANGED** |
| `go-b0.png` — removed by the task | must resolve at base only | base `40189f51…`, head unresolved → **asymmetric** |
| `docs/README.md` — added by the task | must resolve at head only | base unresolved, head `2ca44793…` → **asymmetric** |
| `test/**` unstripped, with `--verify` | must fail loudly | **exit 128, empty stdout** |
| `test/**` unstripped, bare | the behaviour being defended against | **exit 0**, argument echoed |

The `docs` row is the load-bearing one: it is a *tree* that changed only because a file was **added**
beneath it, which is the case a `ls-files` expansion of the base listing cannot see at all. Finding 2
is therefore counter-checked, not merely argued.

---

## 5. Safety checks

Encoded in the body, in this order of authority:

1. **Class ceiling 1** (design §4). Class 2 and 3 are unreachable: no branch, no worktree, no
   `npm ci`, no delete, no push, no merge, no PR, no force flag, in any form, executed or implied as
   executable. The command's only write is one new file.
2. **Never overwrites.** If `review-handoff.md` exists, the command writes nothing and prints the
   document in the report instead, naming the collision. `Edit` is absent from `allowed-tools`.
3. **Never claims a gate it did not observe.** Every gate row is *run in this session, exit N* or
   *not run — no result*. A result stated in the contract, in the evidence package, or earlier in the
   conversation is **not** a gate result and may only be quoted as a prior claim, attributed and
   dated. This is design §4 invariant 2 and the hardest rule in the command.
4. **Never pipes a gate** (`AGENTS.md` — *Validation gates*). Bare commands only.
5. **The range is a hard abort.** Base not an ancestor of head means a rebase or a force-push, and
   every count downstream would be fiction. Abort, write nothing, report both SHAs.
6. **A hazard status is demanded, never supplied.** See §6.
7. **No visual classification.** V3 and V4 are human (`task-lifecycle.md` — *Visual review*). The
   command may report that captures exist, are committed or are uncommitted; it may not say what they
   show.
8. **Loud degradation everywhere.** Missing section, unresolvable path, absent hazards table: each is
   a named gap in the document, never a default and never an omission.
9. **One writer.** The command writes into the contract's own workstream directory, in the worktree
   that holds the branch — the worktree whose worker invoked it. It writes nowhere else.

**Windows / Git Bash.** Every hash comparison is a `revision:path` argument, which is exactly the
shape MSYS mangles, so all of them carry `MSYS_NO_PATHCONV=1` (`CLAUDE.md` — *Platform note*).
*Measured 2026-08-22:* the unprefixed form also resolved correctly on this host for a path with no
leading slash, so the prefix is belt-and-braces rather than the only thing that works — it stays,
because the rule is a rule and the failure it prevents is silent.

---

## 6. The hazard-status trap, and how it is resolved

Design §2.2 requires one row per hazard, verbatim, **with an unset status field**. Applied naively to
the first validation target that produces a wrong document, and the reason is worth recording.

The `repository-hygiene-cleanup` contract's hazards table has nine rows and a column headed
**"Status at planning"**, in which seven rows read *Measured*. `task-lifecycle.md` — *Two standing
rules* requires a status **before handoff**, which is a different question at a different time: a
hazard measured at planning may have been invalidated by the implementation that followed it.

Copying that column into the handoff would therefore manufacture seven resolved hazards out of a
column that never claimed to be a handoff status. The command emits three columns:

| Column | Filled by | Content |
| --- | --- | --- |
| Hazard | the command | verbatim from the contract, including its ID |
| Status at handoff | **the human** | *measured* / *not measured, and why* / *not applicable* — an empty checkbox triplet, always unset by the command |
| Recorded elsewhere | the command | a verbatim quote plus `file:line` where a status is already written down, or `none found` |

The blocking count is the number of hazards for which the command found **no** recorded status
anywhere it read — the contract and any evidence package in the same workstream directory. That count
drives `PROCEED WITH BLOCKERS`. The command never judges whether a recorded status is *true*; it
reports that one exists and where.

---

## 7. Expected first test

Not yet run. **The command is implemented and deliberately not run against the target in this
session** — this section is the expected output recorded **before** the run, which is the property
that makes it a test rather than a demo (`testing.md` §5; design §7).

**Target: `docs/workstreams/repository-hygiene-cleanup/task-contract.md`**, invoked from the worktree
`C:/Code/Autostich-worktrees/repository-hygiene-cleanup`. Chosen because it is a real, completed
Tier B task awaiting independent review — the exact trigger condition — and because its state
exercises four failure paths that a synthetic target would not.

Measured preconditions, 2026-08-22:

| Fact | Value |
| --- | --- |
| Contract base | `370f1b0f36de99ed2066e7f184479b0ad59bc7d0` |
| Worktree HEAD | `1b41b4a2a7efd355a9d6cef654f4b9f4f29fa9dc` |
| `git merge-base --is-ancestor` base head | exit **0** — range valid |
| Upstream of `feature/repository-hygiene-cleanup` | **none** |
| `git branch -r --contains 1b41b4a2` | **empty** — head is on no remote |
| Unticked Definition-of-done boxes | **3** |
| Hazards in the contract | **9** (H1–H9) |
| Must-not-touch list | **10 bullets carrying 14 entries** — 6 trailing-wildcard globs, 7 single file paths, 1 indirection to `planning-report.md` §4.3 |
| Bullets carrying more than one path | **3** — `AGENTS.md, CLAUDE.md`; the four config files; and the tripwire bullet with trailing prose |

*Expected output, recorded before the run:*

| Expectation | Why it is the test |
| --- | --- |
| All **six** glob entries appear with **tree hashes**, base and head, not as echoed arguments | Finding 1 — the false pass is genuinely closed |
| **14 entries** are reported from **10 bullets** — the two multi-path bullets are split, not truncated to their first path | Finding 3 — a comma-separated bullet is not silently half-checked |
| `Every path listed under Keep in planning-report.md §4.3` appears as **not mechanically verifiable — reviewer must judge** | An indirection is not silently dropped |
| `.gitattributes`, `package.json`, `vite.config.js` and the other single files appear with **blob** hashes, base and head | The blob path still works alongside the tree path |
| Head is flagged **not pushed — a reviewer cannot fetch this range yet**, citing the empty `branch -r --contains` | The push-state failure case fires on a real case |
| All **nine** hazards appear as rows, status column **unset**, seven of them carrying a *Recorded elsewhere* quote from the contract's own "Status at planning" column with its `file:line` | §6 — a planning status is reported, never promoted to a handoff status |
| The **three** unticked DoD boxes are listed, including the `npm test` box, quoted rather than summarized | The document does not tidy away the one box the worker deliberately left unticked |
| Without `--run-gates`, **every** gate row reads *not run — no result*, and the contract's own recorded `exit 1` for `npm test` appears only as an attributed prior claim | Invariant 2 — the hardest rule, on a contract that hands the command a plausible result to steal |
| Outcome is `PROCEED WITH BLOCKERS` if any hazard has no recorded status, `PROCEED` otherwise — and the count is shown either way | The outcome is derived, not decorative |
| The open-questions section is present and non-empty | Design §2.2 — omission is forbidden |
| Nothing under `src/`, `test/`, the contract itself, or any rule document is modified; `git status` in the cockpit gains nothing | The class-1 ceiling holds |

**What a first run cannot exercise**, stated so a green run is not over-read: the ancestry abort, the
missing-contract stop, the *section absent* path, the handoff-file collision, the `--run-gates` path
and its Windows both-results rule, and the evidence-images-uncommitted case. Each needs a different
target or a deliberately broken precondition.

**The second scenario from design §7 — the viewport-harness replay** — remains available and is the
stronger test, because a human-written handoff exists to compare against. All four SHAs are still
reachable; `src/index.css` is still `c1b3ccfd858cd6dab7df30fefd83456947ce686b` at both ends, measured
today. It is deliberately not run here either.

---

## 8. Deliberately not done

- **The cleanup-task review is not run.** The command is implemented and left unused; §7 is the
  expectation recorded in advance.
- **`/cleanup-task` and `/create-task` are not modified.** No shared logic was extracted from them:
  neither the deletion-safety conditions nor the setup derivations are needed here, and a shared
  helper between three Markdown command files is not a thing this harness has.
- **`CLAUDE.md` is not modified.** Design §5.3 places one pointer to the command layer there. All
  three commands now exist, so that single edit is the natural next step — as one edit listing three
  commands, and as a decision the owner takes rather than one this task assumes.
- **No gate was run in this session.** Nothing was implemented that changes `src/` or `test/`, and
  this note claims no gate result.
