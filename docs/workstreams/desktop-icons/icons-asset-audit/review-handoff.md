# Review Handoff — icons-asset-audit

**You are the independent reviewer.** Produce an assessment; findings return to the worker, who
implements them. Do not implement, do not push, do not promote
(`docs/engineering/git-workflow.md` — *Reviewer ownership*).

This document was assembled by `/prepare-review`. **It contains no review outcome and no approval.**
Every claim below is marked *measured* (observed by running a command in the generating session),
*observed*, *inferred*, or *proposed* (`AGENTS.md` — *House rules*).

---

## Blocking notice

| Item | State |
| --- | --- |
| Hazards with no recorded status anywhere | **0 of 5** — all five carry a status in the contract and in the evidence package (*measured*) |
| Unticked Definition-of-done boxes | **0 of 9** (*measured*) |
| Push state | **Pushed.** `cc1d2a63` is contained in `origin/task/icons-asset-audit` (*measured*, 2026-08-22) |

When `/prepare-review` ran, the head was on no remote and this row read as a blocker. The branch has
since been pushed by the worker, so `git fetch` reaches the range
(`git-workflow.md` — *Pushing and durable state*). Nothing was merged, promoted, or opened as a pull
request.

**Note the branch head is ahead of the review range.** Every commit after `cc1d2a63` on
`task/icons-asset-audit` is this handoff document and its corrections — no source, asset or script
change. The range to review is `863febe5..cc1d2a63` regardless of where the branch head currently
sits. Confirm with:

```bash
git log --oneline --name-only cc1d2a632642c10531b52a27894bd49b592587c3..origin/task/icons-asset-audit
```

---

## Header

| Field | Value |
| --- | --- |
| Task | icons-asset-audit — Tier C foundation task of the `desktop-icons` workstream |
| Contract | `docs/workstreams/desktop-icons/icons-asset-audit/task-contract.md` |
| Worktree | `C:/Code/Autostich-worktrees/icons-asset-audit` |
| Branch | `task/icons-asset-audit` |
| Base SHA | `863febe54fce513c4171314eb8cfc0d86f997408` |
| Head SHA | `cc1d2a632642c10531b52a27894bd49b592587c3` |
| Ancestry check | `merge-base --is-ancestor` exit **0** — the range is real (*measured*) |
| Range size | 52 files changed, 1111 insertions(+), 14 deletions(-) (*measured*) |
| Worktree state | clean — the head commit **is** the state the worker is looking at (*measured*) |
| Gate summary | 4 required gates run in this session: 3 exit 0, `npm test` exit 1 — see *Gate results* |

SHAs are quoted rather than branch names so the range survives branch deletion
(`task-lifecycle.md` — *Evidence package*).

### Commits in range

```
cc1d2a63 feat(icons): map all 98 desktop icons and bake the ice set
b6cf3f8b docs: add task contract for icons-asset-audit
```

---

## What was agreed

The binding scope statement is the contract linked above. Read it before the diff; it wins over any
summary, including this one.

Its **Acceptance gate**, quoted verbatim:

> **Every one of the 98 source files has a recorded, name-verified (not visually guessed) mapping to
> a final repo path in the established or newly-proposed convention, and the generalized
> `skill-art-build.py` produces a correctly named, correctly baked delivery WebP for at least one
> full non-lightning archetype, reproducibly.**
>
> A mapping asserted from visual similarity alone — without checking the corresponding `name`/`label`
> field in `skills.js` or `perks.js` — fails this gate even if it happens to be correct. The standard
> is the cross-check, not the outcome.

---

## The claims to check

Worker's list, hardest first. Each names the claim, where it is evidenced, and what would falsify it.

1. **`zinsezins.png` → `L_ZINS` is the weakest row in the whole mapping.** Every other skill/perk row
   is an exact `name`/`label` match; this one is a deduction over a closed set (one source file and
   one perk left unpaired after 20 exact matches). Evidence: `asset-mapping.md` — *The one
   elimination*. Falsified by: any other reading of which legendary perk that artwork depicts.
2. **The two owner-pre-resolved rows cannot be name-verified and were not.** `gletscherzturz.png` →
   `SK_ICE_14` and `Lawine.png` → `SK_ICE_L03` are carried through on the owner's planning decision,
   not on a registry match — the source filenames are a typo and a short form. Evidence:
   `asset-mapping.md`, method column `owner, pre-resolved`. They are now baked into committed
   filenames, so a wrong one is a wrong icon on a shipped skill.
3. **"The bake computation is unchanged."** Claimed in `evidence-package.md` §5 on the grounds that
   rebuilding the 21 lightning delivery copies left `git status` empty. Re-runnable:
   `python3 scripts/skill-art-build.py` from the worktree, then `git status`. If that comes back
   non-empty on the reviewer's machine, the claim is environment-dependent and the generalization is
   not neutral after all.
4. **The per-lot light decision for ice rests on a metric this task built.** §6 argues ice ships
   un-aligned because its light spread is factor 4.6 against lightning's shipped 18.8. Both numbers
   come from the new `measure` mode. Its area/band/hue columns were validated against the seven
   documented perkcat figures and reproduce them within ~1 point — but its `cv` column provably does
   **not** reproduce the READMEs' "Streuung" (it disagrees on ordering, not just scale) and is
   labelled as not comparable. Press on whether a self-built metric is an adequate basis for a
   ship/don't-ship call, and on `SK_ICE_L03` (light 150.6 against a lot median of 60.7).
5. **`ARCHETYPE_SIZE = 21` is a new hard gate on the default invocation.** `bake` now refuses a lot
   whose master count differs. This changed observable behaviour: before, the default run emitted 6
   partial fire delivery copies. If any archetype is ever not 21, the default build goes silent for
   it. Evidence: `scripts/skill-art-build.py`, `LOTS` table and `cmd_bake`.
6. **Plant is numbered 02–18, with no `SK_PLANT_01`.** Read off `SKILL_DEFS`; recorded in
   `asset-mapping.md` — *Naming conventions*. If that reading is wrong, 21 not-yet-ingested plant
   files get misnamed by `icons-skills` downstream.
7. **The legendary-perk filename convention binds `icons-perks`.** Unprefixed
   `<PERK_DEFS key>_<slug>.webp`, chosen so the parsed token equals the registry key and
   `artIdFromFile` can be reused verbatim. Evidence: `asset-mapping.md` — *Naming conventions*, and
   the regex quoted there. Falsified by any `PERK_DEFS` key that does not survive that regex.
8. **The mapping table is read at build time from `docs/workstreams/`.** `scripts/skill-art-build.py`
   resolves `MAP` to `docs/workstreams/desktop-icons/icons-asset-audit/asset-mapping.tsv`. Whether a
   build script should depend on a workstream document is a design question, not a defect claim.

---

## Scope compliance

Every entry of the contract's **Must not be touched** list, verified by git object hash at both ends
of the range. A tree hash proves the whole subtree byte-identical, recursively — including that
nothing was *added* into it. All rows below are *measured*.

| Entry | Type | Base hash | Head hash | Verdict |
| --- | --- | --- | --- | --- |
| `src/ui/**` | tree | `8f5f48fdfbac92d625f2d2369578f8dd9e00e776` | `8f5f48fdfbac92d625f2d2369578f8dd9e00e776` | unchanged |
| `test/**` | tree | `2d586cf549949049eb9e993aa49b8cf847d71267` | `2d586cf549949049eb9e993aa49b8cf847d71267` | unchanged |
| `docs/art/skills/lightning/**` | tree | `a5a791abc7bee2252d382ae34ca5fc00fcb63996` | `e8f0dc6f1f9569ef9b2c78ae536170e1af3dc066` | **CHANGED** |
| `src/assets/skills/lightning/**` | tree | `bb4102c71853b175d41a96a2488f9e34a3fd5b6c` | `99d1b6002890bdff236ff3a9e7845b9fafc0b9fe` | **CHANGED** |
| `AGENTS.md` | blob | `696f110907a25e3022a838c4af2c92c3380d5a6c` | `696f110907a25e3022a838c4af2c92c3380d5a6c` | unchanged |
| `CLAUDE.md` | blob | `af4493607150456cd0f79a20d2b4853a18902ba5` | `af4493607150456cd0f79a20d2b4853a18902ba5` | unchanged |
| `docs/engineering/**` | tree | `7be190c29d4c9c52143f62a8f0c360a289251e91` | `7be190c29d4c9c52143f62a8f0c360a289251e91` | unchanged |
| `docs/decisions/**` | tree | `67eef85f0161fe478d060a7df01ef5ff20780884` | `67eef85f0161fe478d060a7df01ef5ff20780884` | unchanged |

No entry fell into the *not mechanically verifiable* class — every bullet in the list resolved to a
blob or a tree at both ends.

**The two CHANGED entries, named and not judged** (*measured*):

```
M  docs/art/skills/lightning/SK_LIGHTNING_01_blitzableiter.webp
M  docs/art/skills/lightning/SK_LIGHTNING_L01_donnergott.webp
M  src/assets/skills/lightning/SK_LIGHTNING_01_blitzableiter.webp
M  src/assets/skills/lightning/SK_LIGHTNING_L01_donnergott.webp
```

The contract's own bullet reads `` `docs/art/skills/lightning/**`, `src/assets/skills/lightning/**` —
except the two named replacements ``. Whether these four files are the two permitted replacements,
and whether that carve-out covers them, is **the reviewer's judgement, not this document's**.

**One further fact the reviewer should weigh** (*measured*, offered without a verdict):
`docs/art/skills/README.md` changed in this range. It is **not** on the must-not-touch list, and it
is **not** listed in the contract's *Expected file surface* → *Written by this task* either. The
contract heads that table "Indicative, not a licence. Anything outside this is surfaced before it is
changed."

### Reproduce

```bash
W="C:/Code/Autostich-worktrees/icons-asset-audit"
BASE=863febe54fce513c4171314eb8cfc0d86f997408
HEAD=cc1d2a632642c10531b52a27894bd49b592587c3
for P in src/ui test docs/art/skills/lightning src/assets/skills/lightning \
         AGENTS.md CLAUDE.md docs/engineering docs/decisions; do
  echo "$P"
  MSYS_NO_PATHCONV=1 git -C "$W" rev-parse --verify "$BASE:$P"
  MSYS_NO_PATHCONV=1 git -C "$W" rev-parse --verify "$HEAD:$P"
done
```

**Windows note, learned by hitting it in the generating session.** `MSYS_NO_PATHCONV=1` disables
path translation for *every* argument, including the one after `-C`. With an MSYS-style worktree path
(`/c/Code/...`) all eight lookups fail with `fatal: cannot change to ...` and exit 128 — which, read
carelessly, looks like eight clean *nothing to verify* rows. The `-C` path above is therefore in
Windows form. On Linux either form works.

---

## Gate results

Run in this session from the contract's worktree, unpiped, in the order `AGENTS.md` —
*Validation gates* gives. Exit codes are the real ones. All rows *measured*.

| Gate | Run in this session | Exit | Result |
| --- | --- | --- | --- |
| `npm test` | yes | **1** | 1 failed / 2047 passed, 135 files — see below |
| `npm run lint -- --max-warnings=0` | yes | 0 | clean |
| `npm run build` | yes | 0 | built in 5.32 s |
| `npm run gen:db` | yes | 0 | 219 entries |
| `VITE_PREVIEW=1 npm run build` | yes | 0 | built in 5.52 s — **not required**, see below |
| `npm run loc:export` | no | — | **not applicable**, see below |

**Why the two conditional gates read as they do** — decided from the diff, not from habit, as
`AGENTS.md` requires. `npm run loc:export` applies when the diff touches `src/i18n/**` or
player-visible text: `git diff --name-only <base> <head> -- src/i18n` is empty, and the only `src`
paths in the range are `.webp` assets (*measured*). The both-variants build applies when the diff
touches preview-gated code: no changed file appears among the files containing `VITE_PREVIEW`
(*measured*). The preview build was run anyway and passed; it is reported as run-but-not-required
rather than as a satisfied condition.

### `npm test` — both results, as the rule requires

`NEW_MACHINE_SETUP.md:96` — *Windows: full-suite timeouts are a load artifact* requires that every
failing file also be run in isolation and both results reported.

| Run | Command | Exit | Result |
| --- | --- | --- | --- |
| Full suite | `npm test` | 1 | `test/i18n-guards.test.js > "jeder Katalog-Schlüssel wird auch irgendwo benutzt"` — **`Error: Test timed out in 5000ms.`** |
| Isolation | `npx vitest run test/i18n-guards.test.js` | 0 | 27 passed / 27, duration 2.09 s |

The failure is a **timeout, not an assertion failure** (*measured* — the log line is
`Error: Test timed out in 5000ms.`, not an `AssertionError`). It did **not** reproduce in isolation.
`NEW_MACHINE_SETUP.md:109-110` states the classification for exactly this pair of results: *"A
timeout that reproduces in isolation is a real failure; one that does not is a load artifact — and
that label does not extend to any other failure in the same file."* No other failure occurred in that
file or any other.

Applying that documented rule is *inferred*, not measured. The two exit codes are the measurements.

---

## Hazards

One row per hazard, text quoted verbatim from the contract including its ID.

**The status column was left unset by `/prepare-review` and has since been filled by the worker**
(2026-08-22), as `task-lifecycle.md` — *Two standing rules* requires before handoff. It was not
copied from the contract's own closing column: the *Recorded elsewhere* column keeps those as
attributed prior claims, because a status recorded at one time is a different claim from a status
asserted at handoff. Where the two agree, they agree independently.

Two of the five are deliberately not a clean "measured", and say so in the cell rather than in a
footnote: **H3** is not measured at all, and **H5** is measured only for the one directory that
exists. Neither is a status this task can close.

| # | Hazard (verbatim) | Status at handoff (worker, 2026-08-22) | Recorded elsewhere |
| --- | --- | --- | --- |
| H1 | Filename↔ID mapping errors across 98 files with no cross-file precedent except skills | ☑ **measured** — all 98 rows carry a recorded method; no ID claimed twice; all 86 generated filenames round-trip through `artIdFromFile`. **Bounded:** 1 of 98 rows (`zinsezins.png`) rests on elimination, not on a field match | `task-contract.md:176` — "**Measured — closed.** 63 exact `name`, 20 exact `label`, 2 owner-resolved, 12 pixel-diff, 1 by elimination…"; `evidence-package.md:227` — "**Measured — closed.** 63 by exact `name`, 20 by exact `label`…" |
| H2 | Local PNG resolution/format may not meet the resolution the existing masters assume (skills: 1024px) | ☑ **measured** — all 98 sources read for dimensions, bit depth and colour type. 91 are 1254×1254 (downscaled to the 1024 master, never upscaled), 5 corner sources are exactly 1536×1024, 2 fire sources are non-square and take the black-pad path | `task-contract.md:177` — "**Measured — closed, favourably.** 91 of 98 are 1254×1254, so downscaled not upscaled…"; `evidence-package.md:228` — "**Measured — closed, favourably.** All 98 sources are PNG, 8-bit truecolour…" |
| H3 | Bloom-bake parameters calibrated for a 277px skill-card strip may not suit perk-category/corner render contexts | ☑ **not measured, and why** — the bloom radius is a CSS length divided through the render zone's width, and the perk-tile, corner-panel and legendary-tile zones do not exist yet (their wiring is Phase 2). Measuring against an undecided zone would yield a number that looks authoritative and is not. Deferred into code rather than prose: those lots carry `calibrated=False` and `bake` refuses them | `task-contract.md:178` — "**Not measured — deliberately, and now enforced in code.** Those render zones do not exist yet…"; `evidence-package.md:229` — "**Not measured — deliberately, and now enforced in code.**" |
| H4 | Whether `docs/art/perkcats/` and `docs/art/corners/` are master-only or already delivery-ready is unresolved | ☑ **measured** — master-only. Perkcats are 1024², the same master size as the skill lot whose delivery copies are 384 px; the corners README labels its files "(Master, 1536 × 1024)"; neither lot has any `src/assets/` counterpart. Both need their own delivery bake, which H3 still gates | `task-contract.md:179` — "**Measured — closed.** Master-only; see Q1."; `evidence-package.md:230` — "**Measured — closed.** Master-only; see Q1." |
| H5 | Windows/Linux path and case-sensitivity risk when introducing new asset directories | ☑ **measured for what exists** + ☑ **not measured, and why** for the rest. Measured: exactly one new directory pair was created (`docs/art/skills/ice/`, `src/assets/skills/ice/`) — all-lowercase ASCII, sibling-consistent with `lightning/`, reached through `import.meta.glob`/`pathlib` and not through a hard-coded separator; no German source filename enters the repo, the umlaut directory `legendäre/` stays on the artist's disk. Not measured: the Linux leg was not run locally (CI covers it), and `legendaries/` does not exist yet, so its case risk is open for `icons-perks` | `task-contract.md:180` — "**Partially measured.** One new directory pair created… Linux verified by CI, not locally."; `evidence-package.md:231` — "**Partially measured.**" |

Hazards with no recorded status anywhere: **0 of 5** (*measured*).

---

## Definition of done

**Unticked boxes: 0.** All 9 boxes in the contract's *Definition of done* are ticked (*measured*).

**Downgrade record:** none found in the contract (*measured*). No search hit for `downgrade`,
`reduced` or `abgesenkt`. This command does not write one and does not infer whether a criterion was
reduced — `task-lifecycle.md` — *Two standing rules* makes that the worker's record to keep.

---

## Evidence and its limits

Documents present in the workstream directory (*measured*):

| Path | Size |
| --- | --- |
| `docs/workstreams/desktop-icons/icons-asset-audit/task-contract.md` | 15,698 B |
| `docs/workstreams/desktop-icons/icons-asset-audit/asset-mapping.md` | 15,997 B |
| `docs/workstreams/desktop-icons/icons-asset-audit/asset-mapping.tsv` | 15,230 B |
| `docs/workstreams/desktop-icons/icons-asset-audit/evidence-package.md` | 18,725 B |

Captured images in that directory: **0 files, 0 bytes** (*measured*). Uncommitted files in that
directory: **0** (*measured*) — everything present is committed.

`task-lifecycle.md` — *Committing evidence*: metadata and classification tables are always committed;
images only when they **are** the evidence. This command reports that state and cites the rule; it
decides nothing about whether image evidence was required here.

**Limits — stated by the worker.**

**The app was never launched.** No screen was exercised at any viewport. No browser, no dev server,
no screenshot. Everything in the evidence package was measured by decoding image files and by
running the build script and the gates.

**Host:** Windows 11, Node v24.18.0, Python 3.12.10 with Pillow 12.3.0 and numpy 2.5.2. Nothing was
run on Linux.

**What this leaves uncovered, and it is the sharpest limit here:** this task changes what the game
renders, without ever having looked at it. The 21 new files under `src/assets/skills/ice/` make ice
skill cards show art at ≥1400 px — automatically, because `skillArt.js` binds art to a skill by
filename alone — and the two replaced lightning files change two icons that were already shipping.
None of that was viewed in the running application at the real viewport.

Contact sheets and a 277 × 210 strip rendering were produced during the work and used to make the
per-lot light decision and to retract an earlier silhouette-collision claim. **They were written to
a temporary directory and are not committed**, so they are not available to the reviewer and are not
evidence in the `task-lifecycle.md` sense. Their absence is a gap, not a decision that images were
unnecessary.

Whether the *Visual review* gate applies here, and at which V-level, is **not classified in this
document** — V3 and V4 are human (`task-lifecycle.md` — *Visual review*).

---

## Known state a reviewer will hit

*Measured* in the generating session:

- **The branch is pushed, and its head is ahead of the review range.**
  `git branch -r --contains cc1d2a63` returns `origin/task/icons-asset-audit` (*measured*,
  2026-08-22). Everything after `cc1d2a63` is this handoff document and its corrections — documentation
  only. Review `863febe5..cc1d2a63`, not the branch head.
- **The worktree was clean at the time the range was measured.** Nothing is excluded from the range
  by uncommitted work. The only files added afterwards are this handoff and its commit.
- **`npm test` fails on the full suite and passes in isolation** — see *Gate results*. Expect exit 1
  from a bare `npm test` on a Windows host.
- **The contract lives only on this branch.** It was added in `b6cf3f8b`; the main checkout is on
  `feature/desktop-icons` and does not contain it. Repo-relative paths to it will not resolve from
  the main checkout.
- **`scripts/skill-art-build.py` requires Python with Pillow**, which `NEW_MACHINE_SETUP.md` does not
  list as a prerequisite. A reviewer re-running the script needs it installed.

Added by the worker, so none of it gets reported as a bug found in review:

- **`npm test` exits 1 on a bare full-suite run, and this predates the task.** The failing assertion
  is `test/i18n-guards.test.js > "jeder Katalog-Schlüssel wird auch irgendwo benutzt"`, and the
  failure is `Error: Test timed out in 5000ms.` — a **timeout, not an assertion failure**. Run in
  isolation the same file exits 0 with **27 passed / 27 in 2.09 s**, so the timeout does not
  reproduce. Both results are the ones `/prepare-review --run-gates` recorded in this range; they are
  quoted here, not re-generated. The same failure was also observed on a clean tree at the base
  commit before any file in this task was touched. `NEW_MACHINE_SETUP.md:96` — *Windows: full-suite
  timeouts are a load artifact* is the governing rule and gives the classification for exactly this
  pair of results.
- **A default `python3 scripts/skill-art-build.py` now prints two skip lines** for fire and plant
  ("6 of 21 masters", "0 of 21 masters"). That is the intended completeness gate, not an error, and
  it leaves the worktree clean.
- **`npm run build` prints a chunk-size warning** for the `index` and `pixi` chunks. It is
  pre-existing and unrelated to this range.
- **Python's PATH entry is not picked up by shells that were already open** when it was installed.
  A session started earlier needs the explicit interpreter path
  (`%LOCALAPPDATA%\Programs\Python\Python312\python.exe`) or a fresh terminal.
- **`scripts/bf-helligkeit.mjs` was equally unrunnable** on this host before the Python install, for
  the same missing-prerequisite reason. It is untouched by this range and now happens to work.

---

## Open questions for the reviewer

Seven, worker-stated.

1. **`docs/art/skills/README.md` is in the range but in neither contract list — was that intended?**
   **Answered by the worker: yes, deliberate and approved before the fact.** The contract's *Expected
   file surface* requires that anything outside the table be "surfaced before it is changed"; it was
   surfaced to the owner with the reasoning, and the owner chose "Ja, korrigieren" on 2026-08-22. The
   change is 27 insertions / 5 deletions and is **documentation only** — two motif rows corrected
   (`01` was "Spitze auf Fels", now a ring; `L01` was "Wolfskopf aus Sturm", now a figure), the
   silhouette matrix corrected, and a dated note that the 19.08 measurement tables above it describe
   the superseded images. The reason it mattered: that matrix is the checklist future fire/ice/plant
   art is generated against, and it listed "Nadel" as taken when the replacement freed it.
   **The question that remains** is narrower and is the reviewer's: should the contract's *Expected
   file surface* table have been amended to list this file, rather than the change resting on the
   surfacing rule alone?
2. **Do the two changed lightning trees fall under the contract's carve-out?** The worker's position
   is that they are intended to — see *Scope compliance*, where the four files are named. That
   judgement is explicitly not made here.
3. **Is a self-built metric an adequate basis for the ice ship/don't-ship call?** See *The claims to
   check* item 4. The alternative was to apply the documented cap to `SK_ICE_L03` alone, which the
   worker declined because the sibling lightning lot ships two images at the same ratio un-capped.
4. **H3 and H5 are not closed, by design.** H3 is not measured at all; H5 is measured only for the
   directory that exists. Both hand real work to `icons-perks`. Is deferring H3 into a
   `calibrated=False` flag an acceptable resolution for a foundation task, or should the render zones
   have been settled here?
5. **Should a build script read from `docs/workstreams/`?** `scripts/skill-art-build.py` resolves its
   mapping table there. The alternative was to derive names from the registry at runtime, which
   fails on the three non-derivable filenames.
6. **Q1/Q2/Q3 in the contract are answered, two of them attributed to an owner decision dated
   2026-08-22.** A reviewer may want to confirm that attribution independently, since those answers
   bind `icons-perks` and `icons-corners`.
7. **Does the *Visual review* gate apply?** This range adds 42 image artefacts and changes what the
   game renders, and no visual capture is committed — see *Evidence and its limits*. The worker
   cannot classify this; V3 and V4 are human.

---

## Suggested reading order

42 of the 52 files are `.webp` binaries and carry almost no reviewable signal on their own. Proposed
order — roughly 30 minutes to the first useful objection:

1. **`task-contract.md`** — *Scope*, *Non-goals and tripwire*, *Acceptance gate*. The binding
   statement; everything else is a claim about meeting it.
2. **`asset-mapping.md`** — *How each mapping was verified* and *Reconciliation* (the prose, not the
   98 table rows). This is where the acceptance gate is either met or not.
3. **`scripts/skill-art-build.py`** — the module docstring first, then `LOTS` / `cmd_bake` /
   `cmd_ingest`. The only real code in the range. Note the four constants the ratchet in
   `test/skill-art.test.js` pins.
4. **`evidence-package.md`** §4 (reconciliation method and counter-check), §5 (the unchanged-bake and
   reproducibility proofs), §6 (the light decision). §9 records a claim the worker made and then
   retracted after measuring it; the retraction is the interesting part.
5. **`git diff` of `docs/art/skills/README.md`** — small, and it is the one file outside both
   contract lists. See open question 1.
6. **`asset-mapping.tsv`** — spot-check rows against `src/game/skills.js` and `src/game/perks.js`.
   The `method` column tells you which rows are worth spot-checking: start with the single
   `by-elimination` row and the two `owner-pre-resolved` ones.
7. **The `.webp` files** — only if something above raises a question. `docs/art/skills/ice/` are the
   masters, `src/assets/skills/ice/` the baked delivery copies of the same 21 motifs.

---

## Provenance

Generated by `/prepare-review` on **2026-08-22** from
`docs/workstreams/desktop-icons/icons-asset-audit/task-contract.md`, range
`863febe54fce513c4171314eb8cfc0d86f997408..cc1d2a632642c10531b52a27894bd49b592587c3`.

**Completed by the worker on the same day.** `/prepare-review` left five sections as `TODO` and the
hazard status column unset, both by design — they carry judgement only the worker can supply. Those
are now filled: *The claims to check*, *Evidence and its limits*, the remainder of *Known state a
reviewer will hit*, *Open questions for the reviewer*, *Suggested reading order*, and all five hazard
statuses. **No gate was re-run for this completion** — every gate figure quoted above is the one
`/prepare-review --run-gates` measured in this range. The worker-written sections state positions and
limits; they contain no assessment of whether the work is correct, which remains the reviewer's.

All ten contract sections required by `task-lifecycle.md` — *The task contract* were located by name;
none was `section absent`.

**What this command did not verify:**

- It did not review the diff, assess the code, or form any opinion on whether the work is correct.
- It did not decide any hazard status, and did not promote a recorded status into the status column.
- It did not classify any visual finding, and did not look at what any image shows.
- It did not verify that the two changed lightning trees fall within the contract's carve-out — it
  reported the change and named the files.
- It did not run the isolation pass for any file other than the one that failed.
- It did not push, merge, rebase, promote, delete, or open a pull request.
