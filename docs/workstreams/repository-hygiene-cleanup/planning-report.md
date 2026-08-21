# Planning Report — Repository Hygiene Cleanup

**Tier B — feature workstream.** Companion document: `task-contract.md` in this directory.
Where this report and the contract disagree, **the contract wins**
(`docs/engineering/task-lifecycle.md` — *The task contract*).

**Status: planning. Nothing has been deleted, moved, or ignored.** Every measurement below was taken
read-only. No file outside this workstream directory was created or modified.

**Branch:** `feature/repository-hygiene-cleanup`
**Base:** `origin/dev` @ `370f1b0f36de99ed2066e7f184479b0ad59bc7d0`
**Measurement date:** 2026-08-21

Claims are marked by category per `AGENTS.md` — *House rules*: **measured**, **observed**,
**inferred**, **proposed**.

---

## 1. The finding that reframes the task

**Measured.** Tracked content is **214,087,916 bytes** across **876 files**. `media/` alone is
**156,028,330 bytes — 72.9 %** of it. The `.git` directory is **540 MB**; the working tree excluding
`.git` and `node_modules` is **233 MB**.

**Measured.** Every candidate this report identifies as removable or archivable, taken *together*,
totals roughly **13.9 MB — 6.5 %** of tracked bytes, and almost all of that is one directory
(`docs/workstreams/viewport-harness/evidence/`, 10,835,815 bytes) whose removal is the least
clear-cut decision in the whole set.

**Measured.** Five tracked blob hashes each appear at more than one path (§4.4). Git stores a blob
**once** regardless of how many paths point at it. Deleting a duplicate path therefore returns
**zero** repository bytes — it returns working-tree bytes and one less thing to be confused by.

**Inferred, and this is the load-bearing conclusion:**

> **This task cannot meaningfully reduce repository size, and should not try.**
> Size lives in `media/` (live, guarded, deployed) and in history. The only lever against history is a
> rewrite, which §6.1 rejects outright. What this task *can* deliver is **navigability and
> truthfulness** — that every tracked path is one a reader can account for.

A hygiene task that quietly re-scopes itself into a size-reduction task is the failure mode this
section exists to prevent. If a later session finds itself reaching for `filter-repo`, that is the
tripwire, not a clever idea.

---

## 2. Current repository hygiene situation

### 2.1 Tracked bytes by top-level directory

| Directory | Bytes | Share | Files |
| --- | --- | --- | --- |
| `media/` | 156,028,330 | 72.9 % | 54 |
| `src/` | 34,739,053 | 16.2 % | 486 |
| `docs/` | 18,462,996 | 8.6 % | 132 |
| `design/` | 1,824,351 | 0.9 % | 1 |
| `test/` | 1,223,254 | 0.6 % | 135 |
| *(repository root)* | 970,346 | 0.5 % | 15 |
| `public/` | 518,635 | 0.2 % | 7 |
| `sim/` | 124,647 | 0.1 % | 21 |
| `scripts/` | 89,440 | < 0.1 % | 10 |
| `maintenance/` | 69,159 | < 0.1 % | 5 |
| `.claude/` | 23,496 | < 0.1 % | 3 |
| `.github/` | 8,335 | < 0.1 % | 5 |
| `bench/` | 5,874 | < 0.1 % | 2 |

All **measured** (`git ls-files -s` piped through `git cat-file --batch-check`; the reproduce command
is in §5.6).

### 2.2 What is actually untidy

**Observed.** The repository is not disorganised in its engineered parts. `src/`, `test/`, `sim/`,
`scripts/`, `.github/` and `docs/engineering/` are coherent, and every file in `scripts/`,
`maintenance/` and `bench/` resolves to at least one live consumer (§4.3).

Four things are untidy, in descending order of confidence:

1. **Three debug screenshots sit in the repository root** — `go-b0.png`, `go-b1.png`, `unlock.png`.
   **Measured:** zero references anywhere in the repository. **Measured:** each was committed inside
   an unrelated feature commit (`23434476` "Siegesbildschirm: Durchlauf-Graph nach unten…" for the
   two `go-b*` files; `e1f849db` "Freischaltungen bekommen auf dem Desktop ein eigenes Fenster" for
   `unlock.png`). **Inferred:** they are working screenshots that were swept up by a broad `git add`.
2. **`docs/` root is a flat drawer of 25 loose files** mixing live design specification, historical
   plans, three PDFs and six `.sql` files, with no index distinguishing which is which. Compare
   `docs/engineering/` and `docs/decisions/`, both of which have one.
3. **A 10.8 MB screenshot evidence set** from the completed viewport-harness workstream, containing
   duplicate blobs, sits in `docs/` — and `task-lifecycle.md` — *Committing evidence* has an explicit
   rule about when that is right and when it is not.
4. **One empty untracked directory** (`.agents/`) and a **27 MB `dist/`** in the working tree.
   `dist/` is correctly `.gitignore`d; neither is a repository-content problem.

### 2.3 State surfaced but out of scope

**Measured.** Local `dev` is **one commit ahead of `origin/dev`** — `215bce4c` *"feat: add create
task command"* is not pushed. `AGENTS.md` — *Roles and source of truth* requires durable work to
reach GitHub. This is surfaced, not acted on; it belongs to whoever owns that commit.

**Measured.** Ancestry holds: `origin/main` → `origin/test` and `origin/test` → `origin/dev` both
exit 0.

**Measured.** All nine non-permanent branches (local and remote) return
`git rev-list --count origin/dev..<branch> = 0`, i.e. every one is contained in `dev`. Both task
worktrees are clean. **Branch and worktree cleanup is a non-goal of this task** (§7) and belongs to
`/cleanup-task`; the numbers are recorded here only so the next session does not re-measure them.

---

## 3. The one decision that cannot be corrected cheaply

`task-lifecycle.md` — *Tier B* requires this report to name it explicitly.

> **Whether the viewport-harness screenshot evidence set is removed.**

**Measured.** `docs/workstreams/viewport-harness/evidence/` is 10,835,815 bytes over 23 files, and
`scripts/viewport-proof.mjs` — the generator — is committed.

`task-lifecycle.md` — *Committing evidence* permits keeping images only when *"they are the evidence,
that is when the finding is visual and a reader must see it to judge it"*, and otherwise expects them
regenerable — *"which is only honest if the generating script is committed and deterministic."*

Both halves are arguable here, and that is exactly the problem:

- **For removal:** the generator is committed, the workstream's own contract made determinism an
  acceptance criterion, and the T2 report carries the numeric findings.
- **Against removal:** the viewport harness's decisive acceptance criterion was a *visual* match
  between a harness capture and a real CDP capture. Those images **are** the evidence for the claim,
  in the precise sense the rule protects. Their determinism was proven **on one host, at that host's
  DPR** — a regenerated set on different hardware is a different measurement, not a reproduction.

`git rm` is revertible in principle. What is *not* cheaply recoverable is the standing of the
evidence: once a reviewer must regenerate it on their own machine to see it, the artefact that passed
review no longer exists in reviewable form.

**Proposed:** treat the evidence set as **out of scope for removal in this task** and refer the
decision to the viewport-harness workstream owner as Open Question **Q1** (§9). It is the single
largest candidate by bytes and the single weakest by evidence — a combination that should never be
resolved by whoever happens to be holding the cleanup broom.

---

## 4. Categories of artefacts

Four categories, as required. **Placement in a category is a proposal; nothing here authorises a
deletion.** Every entry must still pass the evidence standard in §5 at the time it is acted on.

### 4.1 Safe to remove

Entry requires: **measured zero references**, **recoverable from history**, and **no test, workflow,
build step or document consumes it.**

| Path | Bytes | Evidence | Recovery |
| --- | --- | --- | --- |
| `go-b0.png` | 197,508 | Zero hits, whole-repo `grep -rF` excluding `.git`, `node_modules`, `dist` — **measured** | `git checkout 23434476 -- go-b0.png` |
| `go-b1.png` | 206,893 | as above — **measured** | `git checkout 23434476 -- go-b1.png` |
| `unlock.png` | 289,590 | as above — **measured** | `git checkout e1f849db -- unlock.png` |

**Total: 693,991 bytes — 0.32 % of tracked content.** The number is deliberately stated: this
category is about correctness of the root directory, not about bytes.

**Local-only, not a repository change** (listed so nobody counts them as deliverables):

- `.agents/` — an empty, untracked directory. **Measured:** contains nothing; Git does not track it.
- `dist/` — 27 MB of build output, correctly matched by `.gitignore`. Deleting it locally is
  reversible with `npm run build`.

### 4.2 Archive candidates

Entry means: **has no live consumer, but has historical value.** §6.3 rejects moving these; the
proposal is an index, not a relocation. Each still needs §5 evidence before anything happens.

| Path(s) | Bytes | Why a candidate |
| --- | --- | --- |
| `docs/Autostich-Balancing-Report.pdf`, `-v2.pdf`, `Autostich-Patchnotes_main-zu-Autostich_Test.pdf` | 415,816 | **Measured:** zero references. Last touched 2026-07-25 / 07-27. Point-in-time reports; PDFs are opaque to review and to `grep`. |
| `docs/localization/strings_de_banners.csv`, `strings_de_delta_since_85921f7.csv`, `strings_de_delta_test_2026-08-02.csv`, `uebersetzer-liste_test_2026-08-02.md` | 38,465 + | **Measured:** 0–1 references, all from historical prose. **Inferred:** completed translator deliveries — a delivery record, which is a business artefact, not a code artefact. Owner call, not an agent call (**Q2**). |
| `docs/prototypes/*.html` (8 files) | 266,471 | **Measured:** 0–3 references, all from `docs/decisions/engineering-log-2026-08.md`. Standalone effect-tuning pages, superseded by shipped code. Cited **by path** in the log — see §6.3. |
| `docs/autostich-test-stand.md`, `docs/fb8-supabase-migration.sql` | small | **Measured:** zero references; last touched 2026-07-24 / 07-27. |
| `design/brand/logo-source.png` | 1,824,351 | **Measured:** zero references; added by `5f9ee2e0` "App-Icons: neues Neon-A-Logo für PWA/Home-Screen". **Inferred:** the master art the `public/icon-*.png` set was derived from. A brand source having no code reference is *expected*, so zero references is **not** evidence against it. **Proposed: keep.** Listed here only so its zero-reference status is on the record and not rediscovered as a finding. |

### 4.3 Keep — and why the evidence says so

Recorded because "no obvious consumer" is the failure mode that deletes a live file.

| Path(s) | The consumer that makes it live |
| --- | --- |
| `media/**` (156 MB, 54 files) | `test/music-assets.test.js` asserts *"keine Datei in `media/music/` ist verwaist (jede wird referenziert)"* — a **standing orphan guard**. `.github/workflows/deploy-media.yml` publishes the directory. `vite.config.js` mounts it in dev. **The largest directory in the repository is also its best-guarded.** |
| `docs/username-profanity-guard.sql` | `test/profanity-sql.test.js` compares the checked-in file **byte-for-byte** against `scripts/gen-profanity-sql.mjs`. |
| `docs/localization/strings_de_pixi_2026-08-15.csv` (511,363 B) | `test/loc-csv.test.js` reads it by absolute path and compares it to the catalogs. |
| `scripts/skill-art-build.py` | `test/skill-art.test.js:104` reads it **as raw text** — a source-text ratchet (`AGENTS.md` — *Hazard*). |
| `scripts/check-preview-exclusion.mjs`, `scripts/cdp.mjs`, `scripts/viewport-proof.mjs`, `scripts/loc-todo.mjs` | Referenced by `test/test-viewport.test.js`, `docs/engineering/NEW_MACHINE_SETUP.md`, `docs/localization/i18n.md`. |
| `bench/fx.html`, `bench/fx.jsx`, `maintenance/*.mjs`, `maintenance/index.html` | Mutually referenced dev tooling; `maintenance/index.html` additionally appears in `src/App.jsx`, `vite.config.js`, `scripts/gen-db.mjs` and both i18n catalogs. |
| `docs/engineering/**`, `docs/decisions/**`, `AGENTS.md`, `CLAUDE.md`, `README.md` | Current rules and the historical log. Out of scope by §7. |
| `src/**`, `test/**`, `public/**`, `sim/**`, `.github/**` | Product, guards, PWA shell, balance tooling, CI. |

### 4.4 Unclear — needs evidence or an owner decision

| Item | What is measured | What is missing |
| --- | --- | --- |
| **Duplicate audio blobs.** `media/music/last_light.m4a` = `point_of_no_return.m4a` (blob `4fc54602`, 2,955,246 B); `neon_night_drive.m4a` = `soft_reset.m4a` (blob `5824f352`, 2,581,700 B) | Byte-identical. Both names in each pair are referenced by the track list, so the orphan guard is satisfied by both. | Whether two tracks *should* sound identical. A game-design question (**Q3**). Note: removing a duplicate path frees **no repository bytes** (§1). |
| **Duplicate evidence blobs.** `determinism-a/-b`, `harness-` and `real-1280x720@1x.png` are all blob `f57b1ba3`; two further pairs collide. | Byte-identical — **measured**. | Whether identity across `harness-` and `real-` is the *finding* (the acceptance criterion was that they match) or an artefact of the capture script. **Inferred: it is the finding**, which is an argument for keeping the set. Folded into **Q1**. |
| **Orphaned assets under `src/assets/` (34.7 MB).** | A basename sweep reports 19 apparent orphans. **Measured: at least 18 of them are false.** `src/ui/skillArt.js:21` loads them via `import.meta.glob("../assets/skills/*/*.webp", …)`, so no filename appears anywhere in source. | A resolver-aware or build-artefact-based analysis. **Not attempted in this task.** See §5.1 — this is the concrete proof that basename grep is not an evidence standard. |
| **`docs/` loose design documents** — `eis-rework.md`, `stein-fraktion.md`, `rarity-system.md`, `gameplay-redesign.md`, `progression-*.md`, `archetyp-*.md`, `desc-check.md`, `autostich-v2-plan.md`, `sim-harness-plan.md`, `tutorial-guided-run-plan.md`, `telemetry.md`, and the `.sql` schema files. | Reference counts 0–6, **but the count is not a verdict**: most hits are historical mentions in `engineering-log-2026-08.md`, not live dependencies. | Owner knowledge of which are live specification and which are superseded. No agent can derive this (**Q4**). |
| **`.git` at 540 MB vs. 214 MB of current content.** | **Measured.** | Nothing — §6.1 rejects the only available lever. Recorded so the gap is not repeatedly rediscovered. |

---

## 5. Evidence required before deletion

**No path leaves its current location without all of E1–E7 recorded in the workstream.** "I grepped
and found nothing" is not one of them.

### E1 — A reference sweep that survives dynamic loading

Basename grep alone is **disqualified as evidence**, and this repository proves why: 19 files under
`src/assets/skills/` match no string in the codebase and are all live, loaded through
`import.meta.glob` (§4.4). Required for every candidate:

1. full path, basename, and basename without extension;
2. the parent directory name;
3. every `import.meta.glob` pattern in `src/` checked for whether it would match the path
   (`grep -rn "import.meta.glob" src`);
4. dynamic construction — any template literal or path join that could produce the name.

Record the commands **and** their zero output. A sweep whose output is not recorded did not happen.

### E2 — Build-graph evidence, for anything an asset pipeline could reach

`npm run build`, then confirm the artefact is absent from `dist/`. Applies to everything under
`src/`, `public/`, `media/` and `design/`. A file that survives into `dist/` is live regardless of
what grep said.

### E3 — Test-suite evidence, before and after

Full `npm test` on the base commit and on the result, compared run to run. Additionally, for each
candidate, check whether any test reads it **as raw text** — the source-text ratchet hazard
(`AGENTS.md` — *Hazard: source-text ratchet tests*). Three such couplings already exist and are
listed in §4.3.

### E4 — CI and workflow evidence

`grep -rn "<path>" .github/workflows/`. `deploy-media.yml` triggers on `media/**` and publishes it;
`deploy.yml` reasons about which directories it must *not* prune. A path can be live to CI while
being invisible to `src/`.

### E5 — Documentation evidence, with live and historical separated

`grep -rn "<basename>" docs README.md AGENTS.md CLAUDE.md`, then classify **every hit**:

- **live** — a current document instructing a reader to use the file → **not removable**;
- **historical** — `docs/decisions/engineering-log-2026-08.md` recording that it once existed →
  does not block removal, but see §6.3 on paths cited in the log.

**Reference counts must never be reported as verdicts.** The counts in §4 include self-mentions and
historical prose; they are a triage signal and nothing more.

### E6 — Recorded recoverability

For every removed path, the removal commit message carries the **blob SHA** and the **last commit
containing it**, so recovery is one command:

```bash
git checkout <commit> -- <path>
```

This is what makes `git rm` reversible in practice rather than in theory.

### E7 — Gates

`AGENTS.md` — *Validation gates*, in order, unpiped: `npm test`, `npm run lint -- --max-warnings=0`,
`npm run build`, `npm run gen:db`. Plus `npm run loc:export` if anything under
`docs/localization/` is touched. Never reported as passing unless the real command completed.

### 5.6 Reproduce commands for §2.1

```bash
git ls-files -s | awk '{print $2"\t"$4}' > blobs.txt
cut -f1 blobs.txt | git cat-file --batch-check='%(objectname) %(objectsize)' > sizes.txt
paste <(cut -f2 blobs.txt) <(awk '{print $2}' sizes.txt) \
  | awk -F'\t' '{split($1,a,"/"); d=(index($1,"/")?a[1]:"(root)"); s[d]+=$2} END{for(k in s) printf "%12d  %s\n", s[k], k}' \
  | sort -rn
```

Duplicate blobs:

```bash
cut -f1 blobs.txt | sort | uniq -d
```

---

## 6. Options considered, and why they were rejected

`task-lifecycle.md` — *Tier B* is explicit that this section, not the description of the chosen
approach, is the value of a planning report.

### 6.1 REJECTED — history rewrite to reclaim the 540 MB `.git`

`git filter-repo` / BFG over `media/` history is the **only** approach that would actually shrink the
repository, and it is rejected without qualification:

- It **breaks the permanent ancestry invariant** `main → test → dev` that `AGENTS.md` — *Branch model*
  calls a permanent invariant, and would require force-pushing all three.
- It **invalidates every SHA in the repository's own records** — task contracts (`origin/dev` @
  `370f1b0f…`, `dd36c3ef…`), evidence packages, and the engineering log. `task-lifecycle.md` — §7
  requires evidence to quote SHAs *precisely because* they are durable. A rewrite makes those
  documents silently wrong rather than loudly broken.
- Every clone and every existing worktree would need re-cloning.
- The benefit is **zero for the working developer.** Nobody is blocked by clone size today.

**This is the tripwire of the whole task.** If a session starts discussing `filter-repo`, `--force`,
or "just squash the media history", the task has left its scope.

### 6.2 REJECTED — `.gitignore` the artefacts instead of removing them

Superficially safer: nothing is deleted. Rejected because it is **worse than either alternative**.
The files stay tracked (ignore rules do not apply to tracked paths), so nothing changes on disk or in
the repository; what changes is that a future `git status` stops mentioning them. It buys the
*appearance* of cleanliness by disabling the tool that would report the problem. Where a file should
not be tracked, remove it and add the rule; where it should be tracked, leave it visible.

### 6.3 REJECTED — move historical documents into `docs/archive/`

The tidiest-looking option, and the one most likely to be reached for. Rejected:

- **The engineering log cites these files by path**, and `docs/decisions/README.md` states the log is
  preserved as written, *"not reformatted, not spell-corrected, and not rewritten."* A rename breaks
  every citation and cannot be repaired without editing the record that must not be edited.
- **Git history is already the archive**, and a better one: it carries the date, the author and the
  commit rationale, none of which a `docs/archive/` directory preserves.
- **A move gains nothing measurable.** The bytes stay, the clone size stays, the file count stays.
  Only the directory listing looks shorter.

**Proposed alternative:** an **index** in `docs/`, in the shape of `docs/decisions/README.md` — a
table marking each loose document *live specification* or *historical*, with a date. Labelling
achieves the actual goal (a reader can tell what is current) at zero risk to paths, tests or
citations. Whether to build it is **Q5**.

Rejected sub-variant: a frozen `archive/*` branch for individual files. `git-workflow.md` reserves
`archive/*` for **whole-repository snapshots** (`origin/archive/first-playable`). Filing loose
documents there makes them harder to find than history does.

### 6.4 REJECTED — one sweeping "hygiene" commit

Rejected in favour of one commit per §4 category. A single large deletion commit is the shape that
makes a partial revert impossible: recovering one wrongly deleted file means either reverting the
whole commit or hand-restoring paths. Per-category commits also mean each carries its own §5 evidence
in its message.

### 6.5 REJECTED — deleting duplicate paths to save space

`media/music/point_of_no_return.m4a` and `docs/…/determinism-b-1280x720@1x.png` look like free wins.
They are not: Git already stores each blob once (§1), so the repository saves **nothing**. Duplicates
are worth resolving only where the duplication is itself a **defect** — which for the audio pair is a
design question (**Q3**) and for the evidence set is probably the finding, not a fault (**Q1**).

### 6.6 REJECTED — doing nothing

The status quo has a real cost: three debug screenshots in the repository root, and 25 loose
documents with no way to tell live from historical. Both are small; both mislead a new reader or
agent on their first look at the repository, which is when misleading is most expensive.

### 6.7 The chosen shape — proposed, pending approval

1. Remove the three root debug screenshots (§4.1), each with §5 evidence, in **one commit**.
2. Refer everything in §4.2 and §4.4 to the owner as **Q1–Q5** before touching it.
3. If Q5 is approved, add the `docs/` index — a pure addition, no moves.
4. Run E7 gates; hand off.

The deliverable is deliberately small. The scope of what may *later* be removed safely is the larger
product, and it is a document, not a diff.

---

## 7. Non-goals

Out of scope. Touching any of these is a scope breach, not a judgement call.

| Non-goal | Why |
| --- | --- |
| **Any history rewrite** — `filter-repo`, BFG, `rebase` of shared history, force-push | §6.1. Breaks the ancestry invariant and every recorded SHA. |
| **Branch cleanup, local or remote** | Explicitly excluded by the task request. `/cleanup-task` owns it, with its own safety conditions (`git-workflow.md` — *Cleanup*). §2.3 records the state, no more. |
| **Worktree removal** | Same. Both existing worktrees are clean and in use. |
| **Any change under `src/`** | Not a refactor. Product code is not hygiene surface. |
| **Any change under `test/`** | This is the tripwire — see below. |
| **`media/**` deletion, deduplication or re-encoding** | Guarded, deployed, live. Its size is not this task's problem (§1). |
| **`AGENTS.md`, `CLAUDE.md`, `docs/engineering/**`, `docs/decisions/**`** | Rule and record documents. `docs/decisions/**` must not be rewritten at all. |
| **Pushing `dev`'s unpushed commit `215bce4c`** | Surfaced in §2.3; belongs to its owner. |
| **`node_modules/`, `dist/`, `sim/out/`** | Already ignored. Local cleanup, not a repository change. |
| **Opening a PR, pushing, merging, promoting** | `AGENTS.md` — *House rules*. Not authorised by this task. |
| **Reducing repository or clone size as a goal** | §1. Not achievable without §6.1. |

**Tripwire — the concrete stop signal:**

> **If the diff needs to touch anything under `test/`, stop.**

That signal is chosen because it is self-proving: a hygiene removal that requires editing a test has,
by definition, removed something a test depends on — which means it was live, and the removal is
wrong. The correct response is to restore the file and record it under §4.3 as *keep*, never to adjust
the test. `AGENTS.md` — *House rules*: **do not weaken tests simply to achieve green CI.**

Secondary tripwire: **any use of `--force`, `-f`, `-D`, `filter-repo`, or `push`** — including inside
a printed command — means §6.1 has crept back in.

---

## 8. Acceptance criteria

### The decisive criterion

> **No path leaves its current location without a recorded, reproducible zero-live-reference proof
> (E1–E5), and the full gate set (E7) passes on the result.**
>
> A file removed because grep found nothing — without accounting for dynamic loading — **fails this
> gate even if the suite is green.** A green suite does not prove a deleted file was dead; it proves
> no test read it.

That last sentence is the criterion's whole point. `src/assets/skills/` (§4.4) is a live example of
files that grep cannot see and that no test would miss.

### Also required

1. Every removal commit names the **blob SHA** and the **last containing commit** (E6), and the
   recovery command is demonstrated once for real, not merely written down.
2. Every §4 category has an explicit verdict: *removed*, *kept — with the consumer named*, or
   *deferred to an open question with an ID*.
3. Open questions Q1–Q5 are **answered by the owner or explicitly deferred with a reason.** An
   unanswered question is not a silent yes.
4. `test/` is byte-identical to the base commit — verifiable by blob hash, not inspection:
```bash
   git diff --stat 370f1b0f36de99ed2066e7f184479b0ad59bc7d0 HEAD -- test/     # must be empty
```
5. `media/**`, `AGENTS.md`, `CLAUDE.md`, `docs/engineering/**` and `docs/decisions/**` likewise
   unchanged.
6. Gates run unpiped and reported honestly (`AGENTS.md` — *Validation gates*, *House rules*).
7. If any acceptance criterion is reduced during the work, a **downgrade record** is written into the
   contract's Definition of Done (`task-lifecycle.md` — *Two standing rules*).

### Not required

No visual review. **Measured/inferred:** the §4.1 candidates are unreferenced root PNGs outside the
build graph — no pixel moves. If the task ever grows to touch a path that reaches `dist/`, V1–V4
apply in full and the baseline must be taken **before** the change.

---

## 9. Open questions — to be settled before implementation

`task-lifecycle.md` — *Tier B*: **nothing is implemented until the owner has settled these.**

| ID | Question | Who decides | Blocking? |
| --- | --- | --- | --- |
| **Q1** | Does `docs/workstreams/viewport-harness/evidence/` (10.8 MB) stay? §3 argues the harness-vs-real captures *are* the evidence and that "regenerable" is weaker than it looks, since determinism was proven on one host at one DPR. | Viewport-harness workstream owner — **not** this task | Yes, for that directory |
| **Q2** | Are the completed translator deliveries (`strings_de_banners.csv`, the two `strings_de_delta_*.csv`, `uebersetzer-liste_test_2026-08-02.md`) a business record that must be retained? | Owner | Yes, for those files |
| **Q3** | `last_light.m4a` = `point_of_no_return.m4a` and `neon_night_drive.m4a` = `soft_reset.m4a` are byte-identical. Two tracks that sound the same — intended or an export accident? Note that resolving it frees no repository bytes. | Game design | No — reportable either way |
| **Q4** | Which of the ~15 loose `docs/*.md` design documents are live specification and which are superseded? No agent can derive this; reference counts are contaminated by historical log mentions. | Owner | Yes, for those files |
| **Q5** | Build a `docs/` index (§6.3) marking each loose document live or historical? Pure addition, no moves, no path breakage. | Owner | No — the alternative is to leave `docs/` unindexed |

**Recommended minimum approval to unblock implementation:** Q1, Q2 and Q4 answered — or explicitly
deferred, which would reduce this task to the three root screenshots plus, if Q5 is granted, the
index. That outcome is a legitimate result, not a failure: §1 already establishes that the honest
deliverable here is the classification, not the byte count.

---

## 10. Risks

| # | Risk | Likelihood | Impact | Mitigation |
| --- | --- | --- | --- | --- |
| R1 | **Deleting a dynamically loaded file.** Proven live hazard: 19 apparent orphans under `src/assets/skills/` are all reachable only through `import.meta.glob`. | Medium if E1 is skipped | High — a silently missing game asset that no test catches | E1 is mandatory and disqualifies basename grep as evidence; E2 checks `dist/` |
| R2 | **Source-text ratchet breakage.** Three files are read as raw text by tests (`skill-art-build.py`, `strings_de_pixi_2026-08-15.csv`, `username-profanity-guard.sql`). Removing or moving one turns the suite red for a reason that reads like a logic failure. | Low — all three are in §4.3 *keep* | High — and the wrong fix is to weaken the guard | E3; the `test/` tripwire (§7); §4.3 names each consumer |
| R3 | **Scope creep into size reduction**, ending in a history rewrite. The 540 MB `.git` is a standing temptation. | Medium — it is the obvious "real" fix | Very high — broken ancestry, invalidated SHAs, forced re-clone | §1 reframes the task; §6.1 rejects it; secondary tripwire on `--force`/`filter-repo` |
| R4 | **Deleting evidence for a completed workstream** before its owner has ruled. | Medium if Q1 goes unanswered | High — the artefact that passed review stops existing in reviewable form | §3; Q1 is blocking for that directory |
| R5 | **Losing a business record** — translator deliveries look like stale CSVs to an engineer. | Medium | Medium — externally significant, internally invisible | Q2 is blocking |
| R6 | **Treating a reference count as a verdict.** The counts in §4 include historical log mentions. | High if the table is read without §5 | Medium | E5 requires classifying every hit live vs. historical; §4.2 marks it explicitly |
| R7 | **Breaking engineering-log citations by moving files**, in a record that must not be rewritten. | Low now that §6.3 rejects moves | Medium — an unrepairable dangling citation | §6.3; index instead of relocation |
| R8 | **A false sense of completion.** The task delivers ~0.3 % of tracked bytes and can read as "hygiene done" while `docs/` stays unindexed and Q1–Q5 stay open. | Medium | Medium — the untidiness returns with the next unanswered question | §8 requires an explicit verdict per category and a resolution per open question |
| R9 | **Concurrency.** Two worktrees exist; a second writer here would violate `AGENTS.md` — *Worktree and agent ownership*. | Low | High | One writer, stated in the contract's Identity section |

---

## 11. What this planning session did and did not do

**Did — measured, read-only:**

- Sized every tracked blob and aggregated by directory (§2.1); found the five duplicate blob hashes.
- Ran whole-repository reference sweeps for every root artefact, every file in `scripts/`, `bench/`,
  `maintenance/`, `design/`, and all 68 non-art `docs/` files, alongside last-commit dates.
- Traced the provenance of the three root screenshots to their commits.
- Confirmed the `import.meta.glob` false-orphan hazard against `src/ui/skillArt.js:21`.
- Verified ancestry, branch containment for all nine non-permanent branches, and worktree cleanliness.

**Did not:**

- Delete, move, rename or `.gitignore` anything.
- Run any validation gate — none was needed, and reporting one would be a false claim.
- Perform a resolver-aware orphan analysis of `src/assets/` (§4.4 — explicitly not attempted).
- Assess `README.md` (26 KB) for overlap with `docs/engineering/` — **not measured**, and it is
  excluded by §7 in any case.
- Make any decision reserved to the owner. Q1–Q5 are open.

*Report issued at planning. Implementation has not started, and is blocked on §9.*
