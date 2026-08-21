# docs — index

What is in this directory, and **which of it is current**. `docs/` grew as a flat drawer mixing live
specification, historical plans, generated files and point-in-time reports, with no way to tell them
apart from the filenames. This index is that way.

**It is an index, not a rulebook.** It does not restate any rule and it does not supersede anything.

| You want… | Read |
| --- | --- |
| Current rules every agent must follow | `AGENTS.md` (repository root) |
| Current engineering documentation | `docs/engineering/` — has its own routing table in `AGENTS.md` |
| Why an existing system was built the way it is | `docs/decisions/` — start at its `README.md` |
| What a particular loose document in `docs/` is | the tables below |

---

## How to read the Status column

**The Status column transcribes what each document says about itself.** Where a document carries its
own status line, that line is quoted or summarised and the wording is the document's, not this
index's. Where a document declares nothing, the status is `unclassified` — **not** a quiet guess that
it is obsolete.

| Status | Meaning |
| --- | --- |
| **live** | The document declares itself current, or a current rule document routes to it |
| **living** | The document declares itself a *lebendes Dokument* — updated across sessions, self-declared source of truth for its area |
| **draft** | The document declares itself a draft, concept or proposal awaiting agreement |
| **built** | The document describes work it declares as implemented; it now reads as a record of intent plus what changed |
| **generated** | Produced by a script. **Never hand-edit** — regenerate |
| **historical** | A point-in-time record. Accurate when written; not current instruction |
| **unclassified** | The document declares no status and none is derivable. Ask the owner |

**Dates are the last commit that touched the file** (measured 2026-08-21), not a review date. A recent
date means the file was edited, not that its contents were re-checked.

### Warning: legacy branch names

Several documents below name a target branch that **no longer exists**. Verified 2026-08-21 — none of
`Autostich_Test`, `balancing`, `Autostich/pixi` or `test/sim` resolves as a local or remote ref. The
current branch model is `main → test → dev` (`AGENTS.md` — *Branch model*).

Treat every branch name, test count and "current state" claim inside these documents as **historical**,
exactly as `docs/decisions/README.md` requires for the engineering log. The *design* content of a
document can be perfectly current while its branch references are stale.

---

## Design and specification documents

| File | Status | Date | What it is |
| --- | --- | --- | --- |
| `archetyp-effekte-eigenstaendig.md` | **living** | 2026-08-14 | Standalone archetype effects. Declares itself *"Lebendes Dokument … die Quelle der Wahrheit, die den Clear überlebt"* — read before working in this area |
| `archetyp-karteneffekte.md` | **living** | 2026-08-12 | One Pixi card effect per faction; specification, decisions and implementation status |
| `stein-fraktion.md` | **draft** / living | 2026-08-18 | Stone faction. Declares *"Status: KONZEPT. Nur Vision, Fundament und Abgrenzung. Noch keine Skills, noch keine Zahlen."* |
| `eis-rework.md` | **draft** | 2026-08-15 | Ice redesign. *"Design steht auf Mechanik-Ebene"*; numbers deliberately last. Names target branch `balancing` — **gone** |
| `gameplay-redesign.md` | **live** | 2026-08-07 | Gameplay screen rebuild. Declares *"freigegeben, Umsetzung ausstehend"* — approved, implementation pending |
| `progression-decisions.md` | **live** | 2026-08-08 | Binding, versioned decision state for the progression system. Declares it *"ergänzt/überschreibt"* the long-form design doc |
| `progression-tree.md` | **draft** | 2026-08-04 | Progression tree + start screen, *"Entwurf zur gemeinsamen Abstimmung"* (v0). Superseded in part by `progression-decisions.md`, which says so itself |
| `rarity-system.md` | **draft** | 2026-07-26 | Rarity families for perks and shop items. *"Design-Spezifikation, Stand 26.07.2026"*; describes a target state |
| `tutorial-guided-run-plan.md` | **built** | 2026-08-15 | Guided run. Declares *"Status: GEBAUT (Wellen W0–W4)"*; §13.9 records what was decided differently during implementation |
| `sim-harness-plan.md` | **built** (in part) | 2026-08-15 | Balance simulation harness. Declares S0–S4 + balance guard implemented, S5 open. Names branch `test/sim` — **gone**; the tooling lives in `sim/` |
| `feature-backlog.md` | **live** | 2026-08-21 | Feature backlog; each entry points at its GitHub issue |
| `desc-check.md` | **live** (convention) | 2026-07-25 | The check-on-change convention keeping player-visible descriptions from drifting from code |
| `telemetry.md` | **unclassified** | 2026-08-16 | Anonymous run telemetry for the beta playtest. Declares no status; companion to `telemetry-schema.sql` |
| `autostich-v2-plan.md` | **historical** | 2026-07-24 | V2 rebuild plan written against branch `Autostich_Test` — **gone**. Retained for rationale |
| `autostich-test-stand.md` | **historical** | 2026-07-24 | State of the `Autostich_Test` build on 2026-07-24. A dated snapshot of a branch that no longer exists |

## Player-visible text

| File | Status | Date | What it is |
| --- | --- | --- | --- |
| `text-style-guide.md` | **live** | 2026-08-15 | Binding style guide for all player-visible text. Routed to from `AGENTS.md` — *Routing table* |
| `localization/` | **live** | 2026-08-21 | Localization workflow, translator packages and generated exports. Start at `localization/i18n.md`. **`localization/strings_de_pixi_2026-08-15.csv` is generated and guarded** — `test/loc-csv.test.js` compares it against the catalogs; regenerate with `npm run loc:export`, never hand-edit |
| `patchnotes/pixi-2026-08.md` | **historical** | 2026-08-19 | Patch notes, Pixi → test branch |

## Database and backend

All `.sql` files here are **applied by hand in the Supabase SQL editor**; nothing in the client runs
them.

| File | Status | Date | What it is |
| --- | --- | --- | --- |
| `username-profanity-guard.sql` | **generated** | 2026-08-16 | Generated by `scripts/gen-profanity-sql.mjs` from `src/game/profanityWords.js`. `test/profanity-sql.test.js` compares the checked-in file **byte-for-byte** against the generator — regenerate with `npm run gen:profanity-sql`. **Never hand-edit** |
| `supabase-schema.sql` | **live** | 2026-08-18 | Schema for the global leaderboard project |
| `telemetry-schema.sql` | **live** | 2026-08-16 | Schema for anonymous run telemetry |
| `autostich-reports-schema.sql` | **live** | 2026-08-15 | Feedback reporter table (#396) |
| `autostich-reports-discord.sql` | **live** | 2026-08-15 | Discord ping for new reports (#396) |
| `global-board-migration.sql` | **historical** (applied) | 2026-08-18 | One-off additive migration. Idempotent, but already applied |
| `fb8-supabase-migration.sql` | **historical** (applied) | 2026-07-27 | One-off additive migration for FB-8 leaderboard columns |

## Point-in-time reports

| File | Status | Date | What it is |
| --- | --- | --- | --- |
| `Autostich-Balancing-Report.pdf` | **historical** | 2026-07-25 | Balancing report, first version |
| `Autostich-Balancing-Report-v2.pdf` | **historical** | 2026-07-25 | Balancing report, second version |
| `Autostich-Patchnotes_main-zu-Autostich_Test.pdf` | **historical** | 2026-07-27 | Patch notes `main` → `Autostich_Test` — a branch that no longer exists |

**The PDFs above are the only opaque files in `docs/`.** They cannot be diffed, searched or
reviewed in a pull request. Prefer Markdown for anything new that is meant to be read by a reviewer.

## Subdirectories

| Directory | What it is |
| --- | --- |
| `engineering/` | **Current** engineering documentation. Routed to per task from `AGENTS.md` — *Routing table*. Read the one document the task needs |
| `decisions/` | **Historical** engineering records, `#tag`-indexed, German, preserved as written. Start at `decisions/README.md`. Read on demand only — never preload |
| `workstreams/` | Per-workstream planning reports, task contracts, evidence and handoffs. Historical records of particular tasks, not standing instruction |
| `localization/` | See *Player-visible text* above |
| `art/` | Source art references for skills, perk categories and card corners, with their own `README.md` per folder. Built into `src/assets/` by `scripts/skill-art-build.py` |
| `prototypes/` | **historical.** Standalone HTML effect-tuning pages from the visual-effect work, superseded by the shipped implementations. Cited by path from `decisions/engineering-log-2026-08.md` |
| `patchnotes/` | See *Player-visible text* above |

For what is actually in each directory, list it — a count written down here is stale the next time
someone adds a file (`AGENTS.md` — *House rules*).

---

## Adding a document here

- Give it a **status line in its own header**, with a date. This index transcribes that line; a
  document that declares nothing lands in `unclassified` and someone has to come and ask.
- If it names a branch, expect that name to age. Prefer a SHA where the reference has to stay true.
- If it is **generated**, say so in the file itself and name the script. Generated files here are
  compared against their generator by a test, and hand-editing one turns the suite red.
- Engineering material is written in **English** (`AGENTS.md` — *Language policy*). Existing German
  documents stay German and are not translated.

*Index added 2026-08-21 by the repository-hygiene-cleanup workstream. Statuses are transcribed from
each document's own header; dates are last-commit dates. No file was moved, renamed or edited to
create it.*
