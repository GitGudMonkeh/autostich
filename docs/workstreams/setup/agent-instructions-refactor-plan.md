# Agent Instruction Refactor Plan — from logbook to routing layer

> Status: **APPROVED IN PRINCIPLE. Batches 1–3 implemented.** Batch 4 requires re-evaluation
> before it is scoped (see §17). Batch 5 (README refresh) not started.
>
> **Batch 3 corrected several claims in this document.** Where a section below is superseded, a
> marker points at §16. The original analysis is left as written — it records what was believed and
> when, which is the point of keeping this file.
>
> Originally analysed against `dev` @ `0f17612a`. **Revised 2026-08-20** after the branch
> reconciliation landed; see §0 for what changed. Companion documents: `baseline-report.md`
> (environment facts) and `branch-reconciliation-plan.md` (branch contract, now executed).

---

## 0. State changes since this plan was first written

### Branch reconciliation is COMPLETE

The history-only merge described in `branch-reconciliation-plan.md` has been executed, verified,
and pushed. Verified against the live remote:

| Fact | Verified value |
| --- | --- |
| Reconciliation merge | `9ea33d1a` "chore: reconcile test ancestry into dev" |
| First parent | `0f17612a` (pre-merge `dev`) |
| Second parent | `b0ef9ed5` (`test`) |
| Tree preserved | **YES** — `git diff --quiet 9ea33d1a^1 9ea33d1a` is empty |
| `main` ancestor of `test` | YES |
| **`test` ancestor of `dev`** | **YES — the break is repaired** |
| `main` ancestor of `dev` | YES |
| `dev` / `origin/dev` | synchronized |

The ancestry chain `main -> test -> dev` now holds, so `dev -> test` promotion is a genuine
fast-forward and `git merge --ff-only` will succeed. The branch contract in
`branch-reconciliation-plan.md` §2 is in force and is the source for
`docs/engineering/git-workflow.md`.

### Do not hard-code a "current" SHA

`dev` has advanced past `0f17612a`. Any SHA in this document is a **historical reference to the
state analysed**, never a claim about current state. To describe the repository now, read it:

```bash
git rev-parse --short HEAD
git rev-parse 'HEAD^{tree}'
```

The line numbers cited in §1–§2 remain valid: `CLAUDE.md` is unchanged apart from the Batch 1
banner prepended at the top, which shifts the body down by a fixed offset.

### `Autostich/pixi` — verified state differs from the briefing

The revised briefing states that `Autostich/pixi` no longer exists on the remote and should be
classified stale/local-only. **Three independent live `git ls-remote origin` queries on 2026-08-20
still returned `refs/heads/Autostich/pixi` @ `7c78dd38`.** Locally there is no branch, only the
remote-tracking mirror `refs/remotes/origin/Autostich/pixi`, and `git fetch --prune` did not remove
it — which is itself evidence the remote ref is live, since `--prune` deletes mirrors of refs the
remote no longer has.

**Operationally this plan follows the instruction:** `Autostich/pixi` is out of scope, is not
treated as remote work needing rescue, and blocks nothing. **Factually the ref is still present**,
so no document should assert it was deleted until a live query says so. Recheck with:

```bash
git ls-remote --heads origin | sort
```

If the branch is genuinely to be retired, deleting it is a deliberate, separately approved act.

### Language decision — SETTLED

The open question in §15 is answered. **Engineering language is English.** Full policy in §4a.

---

## 1. Current-state assessment

### The file

`CLAUDE.md` is **2762 lines** across **117 headings**. It is not a configuration file — it is a
high-quality **engineering logbook**: dated, `#tag`-indexed decision records containing
measurements, rejected approaches, traps, and the reasoning behind guard tests. Representative
quality: *"`contain: layout` am Overlay bringt NICHTS — gemessen, bitte nicht nochmal probieren"*,
with the measurement method, the numbers, and the structural explanation. **This content is an
asset and must survive the refactor intact.**

The problem is not quality, it is **delivery**. The file is auto-loaded into every session, so every
worker pays ~2762 lines of context to reach the ~130 lines that apply to its task — and the first
32 lines, the ones an agent reads most attentively, are **actively wrong**.

### Composition, measured

| Lines | Block | Class |
| --- | --- | --- |
| 1–32 | Branch selection + active branches + promotion chain | **F stale** |
| 33–82 | Desktop-Umbau: die ENTSCHEIDUNGSREGELN (11 rules) | **C** |
| 83–89 | Working state + push discipline (rebase, green gates) + "keep code and comments German" | **A** for the push discipline; **F** for the German-comments rule, superseded by §4a |
| 90–846 | Decision records: fx system, perf, compositor, mobile | **D** |
| 847–856 | Tuning-Größen (game constants reference) | **D/C** |
| 857–990 | Decision records: iOS, ranked rework, global board | **D** (+ **E** open migration) |
| 991–1002 | Medien / Deploy-Struktur (#F-01) | **C** |
| 1003–1046 | Sprache / i18n — "gilt für JEDEN neuen Anzeigetext" | **A/C** |
| 1047–1289 | Decision records | **D** |
| 1290–1321 | Merge health check `Autostich/pixi` → `Autostich_Test` | **F stale** |
| 1322–1337 | Datenschutz / telemetry honesty | **C** |
| 1338–1342 | "Sonstiges" | mixed **A/F** |
| 1343–2762 | Decision records: the desktop pass | **D** |

**≈ 2554 lines (92 %) are class D decision records.** Genuinely universal, always-needed rules are
**under 150 lines**. That ratio is the whole case for the refactor.

### What is already correct and must not be disturbed

- `.gitattributes` — load-bearing, with its rationale written in-file.
- `docs/localization/i18n.md`, `docs/text-style-guide.md`, `docs/localization/genre-terminologie.md`
  — CLAUDE.md already points at these rather than duplicating them. That pattern is the model.
- `.claude/launch.json` — 6 lines, `npm run dev` on port 5173. Correct, vendor-specific, stays.

### CI-safety check (performed)

```
grep readFileSync test/ | grep -i "claude\|readme"   ->  no matches
```

**No test and no workflow reads `CLAUDE.md` or `README.md`.** Moving or shrinking them cannot break
CI. Two caveats found:

1. **Five guard tests cite the list by name** in their header comments —
   `test/up-ruhe.test.js`, `st-ruhe`, `go-ruhe`, `rd-ruhe`, plus `scripts/skill-art-build.py`
   ("Dritter/Vierter/Fünfter/Sechster Screen nach der Liste in CLAUDE.md"). Not a CI dependency, but
   these citations become dangling if the ENTSCHEIDUNGSREGELN move without updating them.
2. **Two `docs/` files ARE read at runtime by tests** and must never be moved:
   `docs/localization/strings_de_pixi_2026-08-15.csv` (`test/loc-csv.test.js`) and
   `docs/username-profanity-guard.sql` (`test/profanity-sql.test.js`).

---

## 2. Classification summary

### A — Universal (→ `AGENTS.md`)

Facts every agent needs before touching anything:

- Branch contract: ancestry `main -> test -> dev`, promotion `dev -> test -> main`,
  **fast-forward only**, feature work branches from `dev`, no direct commits on `test`/`main`.
- Gate commands and their order; `--max-warnings=0`; never pipe a gate command.
- `npm ci` first in every worktree; npm only; lockfile v3.
- **Source-text ratchet tests exist** — the single most important repo-specific hazard.
- Language policy (§4a): new engineering material and new code comments in English; code identifiers
  in English; every player-visible string localized in German **and** English via the catalogs, never
  hard-coded in JSX; `npm run loc:export` after string changes; existing historical German material
  left as written.
- Never introduce an icon that is not already in the system without asking.
- Do not open PRs unless asked.
- `.gitattributes`/LF discipline in one sentence, with a pointer.
- Where to look for deeper knowledge (the routing table).

### B — Claude-specific (→ thin `CLAUDE.md` + `.claude/`)

- "Read `AGENTS.md` first" instruction and the import mechanism.
- Claude Code tool-usage preferences (e.g. prefer `Read`/`Grep` over shell equivalents).
- Windows shell note: this host runs Git Bash; `MSYS_NO_PATHCONV=1` is required for git arguments
  containing `:` and `/`.
- `.claude/launch.json`; future `.claude/commands/`, `.claude/agents/`, `settings.json`.
- Worktree conventions specific to the Claude harness (`.claude/worktrees/` is already gitignored).

### C — Durable engineering docs (→ `docs/engineering/`)

- The 11 ENTSCHEIDUNGSREGELN (lines 33–82) — the highest-value reusable block in the file.
- i18n rules (1003–1046), media/deploy structure (991–1002), privacy/telemetry honesty (1322–1337).
- Architecture: `src/game` vs `src/ui` split, chunking rules, the media-outside-the-graph decision.
- Testing philosophy: what a ratchet is, the "guards that compute, not compare spellings" rule, and
  the mandatory sabotage counter-check.

### D — Decision / history records (→ `docs/decisions/`, read on demand)

≈ 2554 lines of `#tag` records. **Preserved verbatim, never auto-loaded.**

### E — Workstream / feature-specific

- `#global` open Supabase migration (lines 946–957) — a live TODO, belongs in a workstream doc.
- `#370` Phase 4 open items; `Sonstiges` issue-status notes.
- The 2026-08-16 merge health check (1290–1321) — a completed operation record.

### F — Stale / contradictory (**must be corrected, highest priority**)

| Location | Problem |
| --- | --- |
| 3–13 | Mandatory "ask which branch first; do NOT work on `claude/neue-deck-archetypen-*`" — a branch that does not exist on the remote. |
| 14–21 | "Aktive Branches (Stand 2026-08-11)" lists `Autostich/pixi`, `Autostich_Test`, `balancing` as current. `Autostich_Test` and `balancing` **do not exist**; `dev`/`test` are unnamed. |
| 22–32 | Promotion chain `Autostich/pixi -> Autostich_Test -> main` — wrong branches, right principle. |
| 83–89 | "Gearbeitet wird ausschließlich auf `Autostich/pixi`" + rebase-onto-pixi instruction. |
| 1290–1321 | Whole section framed around the removed `Autostich_Test`. |
| 1339 | `cd` back to **`/home/user/autostich`** — a Linux path; development is on Windows `D:\Code\Autostich`. |
| Throughout | **Six mutually inconsistent test counts**: 1263, 1351, 1351, 1569, 1578, 1772. Actual: 134 test files. |
| 8 × | `Autostich_Test` mentioned; 7 × `Autostich/pixi` as the working branch. |

An agent reading lines 1–32 today would refuse to start, then check out a non-existent branch.

### G — Duplicate / redundant

- **A verbatim duplicated section**: lines 402–437 and 438–459 are both
  *"Level-up-Auswahl (Perk/Skill): gemessen — dieselbe Familie wie der Architekt-Mount"*. All 22
  lines of the second block are byte-identical to lines in the first. One is a truncated copy.
- **Superseded-in-place content**: the `#cleanup` list (90–103) says `starfield` was deleted;
  line 131 says it is back and *"die Löschung oben ist überholt"*. Same for the `#fx-spike` claim,
  contradicted 74 lines later, and `#deckglow` (registered in `#kompositor`, removed in
  `#deckglow-raus`). Readers must reconstruct the truth by reading in the right order.
- **`#cube-flimmern` explicitly documents its own wrong reasoning** (line 1759: *"die BEGRÜNDUNG
  oben ist an zwei Stellen falsch"*) rather than correcting it.
- README overlap: build/test/deploy commands are stated in both, and **both are stale**.

> **Judgement:** the superseded-in-place entries are *not* to be "cleaned up". A log that records
> what was believed, when, and why it changed is more valuable than a tidied one. They only need a
> **status marker** so a reader knows within one line whether an entry is current. See §7.

---

## 3. Proposed target file structure

```
AGENTS.md                                  NEW   ~180 lines   vendor-neutral project brain
CLAUDE.md                                  SHRINK  ~50 lines  Claude adapter / router

docs/engineering/                          NEW — canonical, read on demand
  architecture.md            code map, build pipeline, chunking, media strategy
  git-workflow.md            branch contract, worktrees, npm ci, promotion, platform rules
  testing.md                 gates, ratchet tests, guard conventions, sabotage check
  conventions.md             language policy + i18n rules, the 11 ENTSCHEIDUNGSREGELN, icon policy
  roles.md                   worker · integrator · reviewer
  task-lifecycle.md          start-task · handoff · integrate
  NEW_MACHINE_SETUP.md       Windows + Linux laptop bring-up

docs/decisions/                            NEW — history, never auto-loaded
  README.md                  index: #tag -> topic, how to search, status legend
  engineering-log-2026-08.md the current CLAUDE.md body, moved VERBATIM

docs/workstreams/setup/                    EXISTS
  baseline-report.md · branch-reconciliation-plan.md · agent-instructions-refactor-plan.md
```

**Total: 11 new files, 2 rewritten, 1 moved.**

### Two deliberate departures from the suggested layout

**(a) Six role/procedure files collapsed into two.** The suggestion listed `worker-role.md`,
`reviewer-role.md`, `integrator-role.md`, `start-task.md`, `handoff.md`, `integrate.md`. Each would
be 30–60 lines with heavy overlap (all three roles run the same gates, all three obey the same
branch contract), so six files means six places for the same sentence to drift — the exact failure
this repo documents repeatedly. `roles.md` + `task-lifecycle.md` keeps them adjacent and diffable.

*Reversal condition:* if handing Codex a single self-contained file proves operationally better,
split `reviewer-role.md` out. That is a 10-minute change and does not affect anything else.

**(b) The decision log moves as ONE file, not split by theme.** Splitting 2554 lines into per-topic
documents is a large manual transcription with real loss risk, and it would break the dense
cross-references between tags (`#kompositor` ↔ `#fx-spike` ↔ `#perf-dpr` ↔ `#deckglow-raus`). The
log is already self-indexing via `#tags`; `grep -n "#perf-dpr" docs/decisions/*.md` is a better
retrieval mechanism than a folder tree. A pure `git mv` also preserves `git log --follow`.

*Reversal condition:* if the file later becomes hard to navigate, split it then — with the index in
`README.md` already written, that is mechanical.

---

## 4. What belongs in `AGENTS.md`

Ordered so the first 40 lines are the ones that prevent damage. **Rules only, no history.**

1. **Identity & stack** (5 lines) — Autostich, Vite + React 18 + Pixi SPA, GitHub Pages, npm,
   Node 20/22/24 (CI pins 22).
2. **Roles & source of truth** (6) — GitHub authoritative; Nimbalyst cockpit; Claude Code =
   implementation + integration; Codex = reviewer only; **one simultaneous writer per worktree**.
3. **Branch contract** (20) — ancestry `main -> test -> dev`; promotion `dev -> test -> main`
   fast-forward only with the two `git merge --ff-only` commands; feature branches from `dev`; no
   direct commits on `test`/`main`; no squash/merge promotion commits; compare with tree hashes, not
   commit counts. *(Lifted from `branch-reconciliation-plan.md` §2, which already states it.)*
4. **Before you start** (8) — `npm ci` in every worktree; verify branch; `git fetch` first.
5. **Gates** (10) — `npm test`, `npm run lint -- --max-warnings=0`, `npm run build`,
   `npm run gen:db`; all must pass before handoff; **never pipe a gate command**.
6. **The ratchet hazard** (15) — ~40 of 134 test files regex-match literal `src/**` text; cosmetic
   edits can fail them; a red ratchet is not automatically a regression; a green suite does not prove
   UI correctness. Pointer to `docs/engineering/testing.md`.
7. **Language policy** (22) — the §4a rule below in full: engineering English, product UI localized
   DE + EN, historical records preserved as written. Pointer to `docs/engineering/conventions.md`.
8. **Platform** (10) — Windows dev / Linux CI; `.gitattributes` is load-bearing; LF; the
   green-CI-red-local signature. Pointer to `NEW_MACHINE_SETUP.md`.
9. **House rules** (8) — no new icons without asking; no PRs unless asked; don't weaken a guard test
   to make it pass; state uncertainty instead of inventing.
10. **Routing table** (25) — *"If your task is X, read Y first."* This is the load-bearing section:
    it is what lets everything else stay out of context. Documents not yet created are marked
    **(planned)** so nobody chases a dead link.

**Not in `AGENTS.md`:** any measurement, any `#tag`, any dated entry, any per-screen UI decision,
any test count stated as a number.

---

## 4a. Language policy (settled 2026-08-20)

Three layers, one rule each. This replaces the open question formerly in §15.

| Layer | Language | Applies to |
| --- | --- | --- |
| **Engineering** | **English** | `AGENTS.md`, `CLAUDE.md`, `docs/engineering/**`, `docs/workstreams/**`, architecture and technical docs, agent roles and workflows, task contracts, handoffs, review notes, commit messages, PR descriptions, **new code comments**, and test names/descriptions where practical |
| **Product UI** | **German + English** | Every player-visible string, via the i18n catalogs — never hard-coded in JSX. Includes `title`, `aria-label`, `placeholder`, `alt`. |
| **Historical records** | **Preserved as written** | The existing German engineering log. Moved verbatim in Batch 2; **not translated**. |

Unchanged by this decision: **code identifiers stay English** (they always were), and the frozen
DE↔EN terminology table in `docs/localization/uebersetzerpaket_pixi_2026-08-15.md` §3 still governs
player-facing vocabulary.

**Consequence for mixed files.** A source file may legitimately contain English comments (new) and
German comments (existing) side by side. That is expected and is not a defect to clean up — a
sweep rewriting existing German comments would produce a large, high-risk diff across files guarded
by source-text ratchet tests, for no functional gain. New comments are English; old comments stay.

---

## 5. What remains in `CLAUDE.md`

A **router, \~50 lines**, no project knowledge of its own:

1. One-line statement: *the canonical instructions are `AGENTS.md`; read it first.*
2. `@AGENTS.md` import (Claude Code resolves `@path` imports).
3. Claude-specific tool guidance — prefer `Read`/`Grep`/`Glob` over shell equivalents; parallelise
   independent calls.
4. **Windows shell note** — Git Bash on this host mangles git arguments containing `:` and `/`
   (`origin/test:path/file`); set `MSYS_NO_PATHCONV=1`. *(Discovered in this workstream; it will
   bite every Claude worker that inspects a file at a revision.)*
5. Worktree conventions for the Claude harness.
6. Pointer to `docs/decisions/` with an explicit instruction: **read on demand, do not preload.**

Everything currently in `CLAUDE.md` that is not in this list moves. Nothing is deleted.

---

## 6. What moves to `docs/engineering/`

| Target | Source | Notes |
| --- | --- | --- |
| `conventions.md` | CLAUDE.md 33–82 (ENTSCHEIDUNGSREGELN), 1003–1046 (i18n) | Rules 1–11 verbatim. The 5 guard-test comments citing "die Liste in CLAUDE.md" get updated to the new path in the same batch. |
| `architecture.md` | 90–136 (what the fx system *is*), 991–1002 (media), plus `vite.config.js` chunking rationale | Present tense, current state only. History stays in the log. |
| `testing.md` | Distilled from ~40 ratchet tests + the guard rules stated across the log | The one genuinely new synthesis: what a ratchet is, why guards compute rather than compare, the sabotage counter-check, the three known self-matching-comment traps. |
| `git-workflow.md` | `branch-reconciliation-plan.md` §2 + baseline §2/§6/§7 | Branch contract, worktrees, `npm ci`, promotion, LF discipline. |
| `roles.md`, `task-lifecycle.md` | New | Provider policy; per-role gates; handoff format. |
| `NEW_MACHINE_SETUP.md` | New, from baseline §6/§7 | Windows + Linux laptop; the `MSYS_NO_PATHCONV` note; disk budget per worktree. |
| `docs/decisions/` | 847–856 (tuning), 1322–1337 (privacy) | Reference material, on demand. |

> **CORRECTED IN BATCH 3 — see §16.** Two claims in the `conventions.md` row above proved wrong:
> the rules are documented in **English**, not verbatim German, and the citation surface is neither
> five files nor exclusively guard tests.

---

## 7. How historical knowledge is preserved

**Principle: nothing is deleted, nothing is rewritten, nothing is translated.**

1. **A pure rename, in its own commit.**
```bash
   git mv CLAUDE.md docs/decisions/engineering-log-2026-08.md
```
   Committed **with no content edits in the same commit**, so Git records a 100 %-similarity rename
   and `git log --follow` keeps the full history. Content edits (the header, the status markers)
   land in the *next* commit. Editing and moving together is what breaks rename detection.
2. **Stays in German, verbatim.** Translating 2554 lines of measurements would introduce errors into
   the most valuable content in the repository for no benefit — the log is read by agents, which
   read German fine.
3. **A new header** replaces only the stale lines 1–32, stating: this is a historical log, entries
   are dated and may be superseded, current rules live in `AGENTS.md`.
4. **Status markers, not edits, for superseded entries.** Where the log already contradicts itself
   (`starfield`, `#fx-spike`, `#deckglow`, `#cube-flimmern`), add a one-line marker at the top of the
   affected entry — e.g. `> SUPERSEDED by #deckglow-raus (18.08.2026)`. The original text stays
   untouched. A reader learns in one line whether an entry is current; the reasoning trail survives.
5. **The duplicated Level-up section (402–437 / 438–459)** is the one exception where deletion is
   correct: the second block is byte-identical to part of the first. Delete the copy, keep the
   longer original, note it in the commit message.
6. **`docs/decisions/README.md`** provides the index: `#tag` → one-line topic → line anchor, plus the
   status legend and the search recipe. This is what makes on-demand reading practical.
7. **Git is the ultimate backup.** Even if every step above went wrong, `git show <sha>:CLAUDE.md`
   returns the original.

---

## 8. Stale information that must be corrected

Priority order — item 1 is the acute hazard and should ship first:

1. **Lines 1–32, the branch block.** Replace with the current contract. Today it instructs an agent
   to stop and ask, then names branches that do not exist.
2. **Line 1339 — `/home/user/autostich`.** Wrong OS; development is Windows `D:\Code\Autostich`, and
   a Linux laptop is planned. Replace with a path-agnostic statement.
3. **All six test-count claims** (1263 / 1351 / 1351 / 1569 / 1578 / 1772). Do **not** restate a
   number in prose that will rot again — state *"run `npm test` for the current count"*. Same fix in
   README.
4. **`Autostich_Test` (8×) and `Autostich/pixi`-as-working-branch (7×).** Inside the log, these are
   correct historical record and stay. In any *instruction* context they must go.
5. **The 2026-08-16 merge health check (1290–1321)** — a completed operation; reframe as a dated
   record, not standing guidance.
6. **README.md** — "Entwickelt wird auf `Autostich_Test`", the stale test count, and the deploy
   description. *(Out of scope for this plan's edits; listed so it is not forgotten.)*
7. **`Autostich/pixi` still exists on the remote** with 5 unmerged commits — verified via
   `git ls-remote`. Any doc calling it stale is wrong. Its disposition is a separate decision.

---

## 9. Duplicate information that can be consolidated

| Duplication | Resolution |
| --- | --- |
| Level-up section, lines 402–437 ≡ 438–459 | Delete the shorter copy (§7 item 5). |
| Build/test/deploy commands in both CLAUDE.md and README.md, both stale | Single source: `AGENTS.md` §Gates. README links to it. |
| Branch model in CLAUDE.md, README.md, `baseline-report.md`, `branch-reconciliation-plan.md` | Single source: `docs/engineering/git-workflow.md`. All others link. |
| i18n rules in CLAUDE.md 1003–1046 and `docs/localization/i18n.md` | Keep `i18n.md` canonical; `conventions.md` states the short rule and links. **Continues the pattern CLAUDE.md already uses correctly.** |
| Perf rules restated across many `#perf-*` entries (DPR quadratic, cap resolution then compensate line width, `frameMinMs` tolerance) | Extract the *rules* into `architecture.md`; leave the *measurements* in the log. |
| Ratchet-test warnings scattered across ~6 entries | Consolidate into `testing.md`. |

---

## 10. Migration sequence

Five batches, each independently reviewable and revertible. **Each is one commit on a feature
branch off `dev`.**

**Batch 1 — stop the bleeding (additive only).**
Create `AGENTS.md` and `docs/engineering/git-workflow.md`. Add a short correction banner at the top
of `CLAUDE.md` pointing to `AGENTS.md` and marking the branch section obsolete. **Nothing removed.**
After this batch the acute hazard is gone even if the rest never ships.

**Batch 2 — the move.** Two commits, deliberately separated:
- 2a: `git mv CLAUDE.md docs/decisions/engineering-log-2026-08.md`, **no content change**.
- 2b: new thin `CLAUDE.md`; log header rewritten; duplicate section removed; status markers added;
  `docs/decisions/README.md` created.

**Batch 3 — engineering docs.** `conventions.md` (the 11 rules + i18n), `architecture.md`,
`testing.md`. Update the 5 guard-test header comments that cite "die Liste in CLAUDE.md".

**Batch 4 — roles & lifecycle.** `roles.md`, `task-lifecycle.md`, `NEW_MACHINE_SETUP.md`. First
batch that encodes provider policy, so it should follow a live worker/reviewer trial.

**Batch 5 — README refresh.** Fix the stale branch line and test count; link to `AGENTS.md`.

**Sequencing note:** Batch 1 may proceed independently of the branch reconciliation. Batches 2–5
should follow it, so the branch contract documented is the one actually in force.

---

## 11. Risks and safeguards

| Risk | Likelihood | Safeguard |
| --- | --- | --- |
| Historical knowledge lost in the move | Low, **high impact** | Pure `git mv`, no edits in the same commit; verbatim; `git show` recovery; diff the moved file against the original at the pre-move SHA and require an empty diff. |
| An agent loses context because `CLAUDE.md` shrank | Medium | The routing table in `AGENTS.md` is written *before* anything is removed (Batch 1 precedes Batch 2). |
| Rename detection fails; history looks deleted | Medium | Split 2a/2b. Verify with `git log --follow docs/decisions/engineering-log-2026-08.md`. |
| Guard-test comments cite a moved file | **Confirmed, 5 files** | Update in Batch 3. Comment-only; no CI impact. |
| A test reads a moved doc | **Ruled out** | No test reads `CLAUDE.md`/`README.md`. But `docs/localization/strings_de_pixi_2026-08-15.csv` and `docs/username-profanity-guard.sql` **are** read at runtime — **never move those**. |
| New docs drift from reality | High over time | One canonical location per fact; cross-links instead of restatement; no restated counts — point at the command. |
| Over-fragmentation | Medium | 11 files, capped. Each new engineering doc must justify why it is not a section of an existing one. |
| Status markers misapplied to correct entries | Low | Only apply where the log already says "überholt"/"widerlegt"/"falsch" in its own words — 4 known sites, listed in §2 G. |
| Translation errors | Avoided | The log is not translated. |
| Language choice for new docs | **Settled** | Engineering English; product UI localized DE + EN; historical records preserved as written. Full policy in §4a. |

---

## 12. Scope rules per document

> **REVISED IN BATCH 3.** This section previously set numeric line-count caps (250 / 80 / 400).
> Batch 1 and Batch 2 produced good documents that exceeded them, which showed the caps were
> measuring the wrong thing: length was a proxy for "contains material that belongs elsewhere", and
> the proxy failed. The qualitative rules below state what the caps were trying to protect. **Do not
> truncate good documentation to satisfy a line-count target.**

| File | Rule |
| --- | --- |
| `AGENTS.md` | Current rules plus routing. No historical measurements, no `#tags`, no dated entries, no volatile counts. If a point needs more than a short justification, the justification belongs in `docs/engineering/`. |
| `CLAUDE.md` | A thin Claude-specific adapter. If a statement is also true for Codex, it belongs in `AGENTS.md`. |
| each `docs/engineering/*.md` | One coherent current topic, present tense. Reasoning and measurements go to `docs/decisions/`; link rather than restate. A new document must justify why it is not a section of an existing one. |
| `docs/decisions/*` | Append-only. Existing entries are edited only to add status markers. |

Across all of them: **one canonical location per fact.** Duplication and restatement are the failure
mode this refactor exists to remove, and they are what to check for in review — not length.

**Enforcement:** these are review conventions, not tests.

---

## 13. Exact file inventory

### Created (11)

```
AGENTS.md
docs/engineering/architecture.md
docs/engineering/git-workflow.md
docs/engineering/testing.md
docs/engineering/conventions.md
docs/engineering/roles.md
docs/engineering/task-lifecycle.md
docs/engineering/NEW_MACHINE_SETUP.md
docs/decisions/README.md
docs/decisions/engineering-log-2026-08.md      (via git mv — see Moved)
docs/workstreams/setup/agent-instructions-refactor-plan.md   (this file, already created)
```

### Moved (1)

```
CLAUDE.md  ->  docs/decisions/engineering-log-2026-08.md      pure rename, own commit
```

### Modified (8)

```
CLAUDE.md                    rewritten as ~50-line adapter (new file at the old path)
README.md                    Batch 5: stale branch line, test count, link to AGENTS.md
test/up-ruhe.test.js         header comment: "die Liste in CLAUDE.md" -> new path
test/st-ruhe.test.js         same
test/go-ruhe.test.js         same
test/rd-ruhe.test.js         same
scripts/skill-art-build.py   same
docs/workstreams/setup/baseline-report.md   §4 updated once the refactor lands
```

> **INCOMPLETE — CORRECTED IN BATCH 3, see §16.** The citation list above undercounts the surface
> and misclassifies `scripts/skill-art-build.py`. The list of files actually changed is in §16.

### Explicitly unchanged

```
.claude/launch.json          correct as-is
.github/workflows/*.yml      instruction refactor touches no CI
src/**, sim/**, media/**     no application code
.gitattributes, .gitignore, eslint.config.js, vite.config.js, package.json
docs/localization/strings_de_pixi_2026-08-15.csv    READ BY TESTS — must not move
docs/username-profanity-guard.sql                   READ BY TESTS — must not move
all other existing docs/**
```

---

## 14. Rollback strategy

Every batch is one commit on a feature branch off `dev`; nothing reaches `dev` until reviewed.

**Per batch, before merge:** `git reset --hard origin/dev` — the branch is disposable.

**After merge to `dev`, before promotion:** `git revert <batch-sha>`. This works cleanly here in a
way it does **not** for the `ours` merge in `branch-reconciliation-plan.md`: these commits change
file *content*, so reverting the content genuinely undoes them.

**Recovering the original file at any time:**
```bash
git show 0f17612a:CLAUDE.md > CLAUDE.md.orig        # exact pre-refactor content
git log --follow docs/decisions/engineering-log-2026-08.md
```

**Verifying the move was lossless** (run in Batch 2a, before 2b):
```bash
git diff <pre-move-sha>:CLAUDE.md HEAD:docs/decisions/engineering-log-2026-08.md
# must print NOTHING
```

**Point of no return:** none. Unlike the branch reconciliation, this refactor creates no permanent
graph property. It is entirely content, therefore entirely revertible.

---

## 15. Recommended first implementation batch

**Batch 1 only — additive, four changed paths, no deletions.**

1. **Create `AGENTS.md`** per §4.
2. **Create `docs/engineering/git-workflow.md`** — branch contract, worktree conventions, `npm ci`,
   LF/platform rules. Largely assembled from `branch-reconciliation-plan.md` §2 and
   `baseline-report.md` §6–7, both already reviewed.
3. **Add a router banner to the top of `CLAUDE.md`**: canonical instructions now live in
   `AGENTS.md`; the branch section below is obsolete; the rest is a historical log pending its move.
   Prepended only — the historical body is not edited.
4. **Update this plan** (`docs/workstreams/setup/agent-instructions-refactor-plan.md`) to record
   state changes, the settled language policy, and Batch 1 status.

**Why this batch:**

- It **removes the acute hazard immediately** — no agent can follow the wrong branch instructions
  once the banner is there.
- It is **purely additive**. Nothing is moved or deleted, so it cannot lose knowledge and is
  trivially revertible.
- It is **small enough to read in full** — two new documents, a prepended banner, and this plan.
- It **de-risks the big move**: the routing layer is proven in use before `CLAUDE.md` shrinks.
- It **touches no code, no tests, no CI.**

**Review checklist for Batch 1:**

- [ ] `AGENTS.md` ≤ 250 lines and contains no `#tag`, no measurement, no dated entry.
- [ ] Branch contract matches `branch-reconciliation-plan.md` §2 exactly.
- [ ] No test count restated as prose anywhere.
- [ ] `git status` shows only the four intended paths (§15 Batch 1 status).
- [ ] `npm test` and `npm run lint -- --max-warnings=0` still pass (expected: unaffected).

### Both blocking decisions are now resolved

1. **Language** — settled: engineering English. Full policy in §4a.
2. **Ordering** — resolved by events: the branch reconciliation landed first, so the contract
   documented in Batch 1 is the one actually in force, which was the recommended sequence.

### Batch 1 implementation status (2026-08-20)

**Implemented, uncommitted, pending review.** Changed paths:

```
AGENTS.md                          NEW    vendor-neutral project brain
docs/engineering/git-workflow.md   NEW    canonical Git model
CLAUDE.md                          MOD    router banner prepended; body untouched
docs/workstreams/setup/agent-instructions-refactor-plan.md   MOD  this file
```

Deviations from the plan as written — none in scope, two in content:

- The routing table in `AGENTS.md` marks not-yet-created documents **(planned)** rather than linking
  to them. Linking to files that do not exist would send workers on dead-end reads.
- The `CLAUDE.md` banner is longer than "~10 lines" because it also carries the language policy and
  the do-not-preload instruction, both required by the revised briefing.

`CLAUDE.md`'s body is byte-identical to its previous state; only lines were prepended. Verify with:

```bash
git diff --stat CLAUDE.md      # expect: insertions only, 0 deletions
```

---

## 16. Batch 3 implementation status (2026-08-21)

**Implemented and committed** on `feature/agent-instructions-refactor-batch3`, in three commits:
engineering documents, citation migration, this plan update.

### Created

```
docs/engineering/conventions.md
docs/engineering/testing.md
docs/engineering/architecture.md
```

`AGENTS.md` drops the `*(planned)*` marker for those three only. The other planned documents keep
theirs.

### The eleven rules are documented in English

Superseding §6, which said "Rules 1–11 verbatim". The rules are **current standing guidance**, and
the language policy in §4a assigns new engineering material to English. `conventions.md` therefore
states them in English and cites the log as provenance. The German original in
`docs/decisions/engineering-log-2026-08.md` is **unchanged** — verified: the file's blob hash is
identical to the one on `origin/dev`. Nothing was translated in place, and nothing was removed.

### The citation surface was larger than estimated

§1 and §13 recorded five citation sites, described as guard-test comments. The measured surface was
**fourteen sites across ten files**, in three distinct categories:

| Category | Sites | Target |
| --- | --- | --- |
| Rule-list citations | 4 `*-ruhe` test headers + 4 comment blocks in `src/index.css` | `docs/engineering/conventions.md` |
| Historical measurement citations | `scripts/skill-art-build.py`, `docs/art/skills/README.md` | the decision log |
| Historical decision citations | `src/App.jsx`, `src/game/themes.js`, `src/ui/CustomizeScreen.jsx`, `src/ui/fx/FieldLayer.jsx`, `src/ui/fx/PixiStage.jsx`, `src/ui/fx/starfieldBudget.js` | the decision log, by tag |

Three specific corrections to this document:

1. **`scripts/skill-art-build.py` is a measurement citation, not a rule-list citation.** §1 quotes it
   as citing "Dritter/Vierter/Fünfter/Sechster Screen nach der Liste in CLAUDE.md". It does not. It
   cites the `phase:levelup` mount measurement. Retargeting it to `conventions.md` as planned would
   have created a fresh dangling reference, because that measurement deliberately stays in the log.
2. **`docs/art/skills/README.md` was missing from the inventory entirely.** It carries the same
   measurement citation, in the same sentence shape, and was found only by a full-repository sweep.
3. **`src/ui/fx/starfieldBudget.js` cited a `#perf` tag that does not exist.** The log has `#perf-*`
   variants only; there is no standalone `#perf`. The citation was already broken before this
   refactor and a mechanical path swap would have preserved the breakage. It now names the real
   section, *"Gottgleich-Prunk — Perf-Naht"*.

**Class B included.** The six source-comment citations in the third category were folded into this
batch rather than deferred. They were inside the batch's blast radius already, and splitting a
fourteen-site sweep across two batches invites the second half to be forgotten.

**Result:** no `CLAUDE.md` citation remains in `src/**`, `test/**`, `scripts/**`, or `docs/art/**`.
The intentionally historical references — `docs/decisions/README.md` describing the log's origin,
`AGENTS.md` describing the current adapter, and everything in `docs/workstreams/setup/` — are
untouched by design.

### German comments were not translated

Per §4a, each edit changed only the path or tag token inside the existing German sentence. Where a
longer path forced a rewrap, the wording is unchanged and every word is preserved. Comment text is
the only thing that changed in `src/**`, `test/**`, and `scripts/**` — no executable code,
selectors, JSX structure, constants, imports, or behaviour.

### Ratchet handling

The preflight established which guards read `src/index.css` and the edited JSX **without** stripping
comments, and confirmed that no assertion anywhere depends on the literal string `CLAUDE.md`. The
replacement text was checked against the counting guards: it introduces no guarded class name, CSS
value, or magic literal. The doctrine and the trap classes are now written up in
`docs/engineering/testing.md`.

### Validation

`npm test`, `npm run lint -- --max-warnings=0`, `npm run build`, and `npm run gen:db` were all run.
`npm run loc:export` was correctly not required — no player-visible string changed.

One pre-existing condition, recorded before any Batch 3 edit and unchanged by it:
`test/i18n-guards.test.js` hits the default per-test timeout in the full parallel run on the Windows
development host, and passes in isolation. It is a load artifact, not a defect, and the test was not
modified. Anyone seeing it should re-run the file alone and report both results — and should not
extend that label to any *other* failure in that file.

---

## 17. Batch 4 requires re-evaluation

**Do not implement Batch 4 as scoped in §10.** It assigns `roles.md` and `task-lifecycle.md` as new
documents, but `docs/engineering/git-workflow.md` — written in Batch 1 — already contains worker
ownership, integrator ownership, reviewer ownership, the integration procedure, and a task-level
decision guide.

Creating two documents that restate a third would reproduce exactly the drift this refactor exists to
remove. The open question is whether that material should stay in `git-workflow.md`, move out of it,
or be split differently — and it should be answered against the file as it now stands, not against
the original plan.

`NEW_MACHINE_SETUP.md` is unaffected by this and remains straightforwardly needed.

**The final Batch 4 file structure is deliberately not decided here.** It was decided afterwards, by
the design review in `batch4-design-review.md`; §18 records the outcome.

Batch 5 (README refresh) is unchanged: the stale branch line, the restated test counts, and the
deploy description in `README.md` are still outstanding.

---

## 18. Batch 4 outcome (2026-08-21)

**This section records the outcome only. The analysis behind it — observed friction with its
measurements, the lifecycle tiers, the rejected approaches, the command designs and the subagent
strategy — is in `batch4-design-review.md` in this directory.**

Decided by a design review held after the first two workstreams had run end to end — the agent
instruction refactor itself and the Desktop Viewport Harness (#400) — and approved by the owner.
The structure was answered against the files as they stand, as §17 required.

### `roles.md` — not created, deliberately

§17's concern was correct. `git-workflow.md` §7–§9 already carries worker, integrator and reviewer
ownership, and `AGENTS.md` carries the roles table. A separate document would have restated a third.

The routing table row now points at `git-workflow.md` §7–§9 instead. This is the one case where the
original plan's file list was reduced rather than delivered.

### Created

```
docs/engineering/task-lifecycle.md
docs/engineering/NEW_MACHINE_SETUP.md
```

`task-lifecycle.md` opens with an explicit **scope boundary** table naming what belongs to
`git-workflow.md`, `AGENTS.md`, `testing.md` and `NEW_MACHINE_SETUP.md`, with the rule that a sentence
which could live in any of them belongs there. That boundary is the safeguard against the drift §17
identified; it is stated in the document rather than only intended.

### Content that came from observed friction, not from the original plan

The lifecycle documents three tiers rather than one procedure, and adds two rules that neither the
original Batch 4 scope nor `git-workflow.md` contained:

- **Every hazard named in a task contract must be resolved before the review handoff.** In #400 the
  contract named three unverified hazards, the handoff shipped without closing them, and the reviewer
  found the gap. All three were then closed with no code change needed — a review round trip the
  contract had already paid for in advance.
- **A reduced acceptance criterion needs a downgrade record in the Definition of Done.** In #400 a
  measurement task was closed as documentation instead; the resulting gap is stated honestly in the
  measurement report's prose, but nothing in the Definition of Done showed it.

**Visual review is documented as a gate rather than a courtesy.** #400's only real defect passed both
automated layers and was found by a human looking at the screen. The lifecycle therefore requires a
baseline capture, keeps judgement human, and requires every finding to be classified and given an ID
before it can leave a chat message.

### `AGENTS.md` changes

- Routing table: roles row retargeted to `git-workflow.md` §7–§9; the three `*(planned)*` markers
  removed, since no planned engineering document remains.
- The `NEW_MACHINE_SETUP.md` fallback paragraph in the platform section removed — the file now exists,
  so the instruction to fall back to package metadata was about to become stale advice.
- Language policy gained a rule for **appending to an existing German document with a fixed template**.
  This was an open question flagged during #400's review, where a backlog entry was written in German
  to match a German document rather than breaking its template.

### Not built

Claude commands and subagent roles were designed in the review and deliberately **not** implemented in
this batch. The designs, the risks attached to each, and the recommended build order are in
`batch4-design-review.md` §5, §6 and §10.
