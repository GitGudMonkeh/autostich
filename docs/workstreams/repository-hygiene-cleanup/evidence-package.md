# Evidence Package — Repository Hygiene Cleanup

For independent review. Companion documents: `task-contract.md` (binding scope) and
`planning-report.md` (analysis, rejected options) in this directory.

Claims are marked **measured**, **observed**, **inferred** or **proposed** (`AGENTS.md` —
*House rules*). Everything below was produced on **2026-08-21** on **Windows 11 / Git Bash**,
Node per `package.json` engines, in the worktree
`C:/Code/Autostich-worktrees/repository-hygiene-cleanup`.

---

## 1. Diff range

| Field | Value |
| --- | --- |
| **Base** | `370f1b0f36de99ed2066e7f184479b0ad59bc7d0` (`origin/dev` at task creation) |
| **Branch** | `feature/repository-hygiene-cleanup` — local, no upstream, never pushed |

| Commit | Category | What it does |
| --- | --- | --- |
| `11773733` | removal | `chore: remove unreferenced debug screenshots from repo root` |
| `681186e7` | addition | `docs: add docs/ index separating live from historical material` |
| `b943e743` | records | `docs: add repository hygiene workstream records` — planning report, contract, and this file at the state it had when committed |

One commit per artefact category, as the contract requires, so that reverting one does not revert the
others. The reviewable diff is `370f1b0f..681186e7`; `b943e743` adds only this workstream's own
documents. The **head is the branch tip**, which is one commit beyond `b943e743`: the tip amends this
table into place, and so cannot name itself.

SHAs rather than branch names, so this document survives branch deletion
(`task-lifecycle.md` — §7).

### Change surface — complete

```text
 go-b0.png  | Bin 197508 -> 0 bytes
 go-b1.png  | Bin 206893 -> 0 bytes
 unlock.png | Bin 289590 -> 0 bytes
 3 files changed, 0 insertions(+), 0 deletions(-)
```

Plus four added files, none of which existed before:

- `docs/README.md` — the index (P4, Q5-approved)
- `docs/workstreams/repository-hygiene-cleanup/planning-report.md`
- `docs/workstreams/repository-hygiene-cleanup/task-contract.md`
- `docs/workstreams/repository-hygiene-cleanup/evidence-package.md` — this file

**Nothing was moved or renamed. No existing file outside this workstream directory was edited.**

---

## 2. Scope compliance — verified, not asserted

Reproduce:

```bash
git diff --stat 370f1b0f36de99ed2066e7f184479b0ad59bc7d0 -- \
  test/ src/ media/ AGENTS.md CLAUDE.md docs/engineering/ docs/decisions/ \
  .gitattributes package.json package-lock.json vite.config.js eslint.config.js \
  .github/ public/ sim/ scripts/ bench/ maintenance/ design/ docs/localization/ \
  docs/workstreams/viewport-harness/
```

**Measured: empty output.** Every must-not-touch path in the contract's *Expected file surface* is
byte-identical to the base commit — including `test/` (the tripwire), `media/`, and the
viewport-harness evidence set that Q1 ruled must stay.

**The tripwire never fired.** No test was read, edited, weakened or skipped at any point.

---

## 3. What was removed, and the evidence for each

Three unreferenced debug screenshots from the repository root. **693,991 bytes — 0.32 %** of tracked
content. The number is small by design; `planning-report.md` §1 establishes that this task's
deliverable is navigability, not bytes.

| Path | Blob SHA | Bytes | Added by | Recovery anchor |
| --- | --- | ---: | --- | --- |
| `go-b0.png` | `40189f51b8e98552941fb92b24c657bf68d4d8fb` | 197,508 | `23434476` *Siegesbildschirm: Durchlauf-Graph nach unten, Nullen bleiben stehen* | base `370f1b0f` |
| `go-b1.png` | `28fbfd021955be16f05a3a52435591687509079f` | 206,893 | `23434476` (same commit) | base `370f1b0f` |
| `unlock.png` | `7004e18aad384c793b5b7e4bcd7f6e66eb39429f` | 289,590 | `e1f849db` *Freischaltungen bekommen auf dem Desktop ein eigenes Fenster (#unlock-fenster)* | base `370f1b0f` |

**Measured:** each blob is present at the base commit (`git cat-file -e <base>:<path>` → exit 0), and
each was added inside a commit about an unrelated feature. **Inferred:** they are working screenshots
caught by a broad `git add`, not intentional repository content.

### E1 — reference sweep that survives dynamic loading

Basename `grep` alone is explicitly **not** accepted as evidence in this workstream
(`task-contract.md` — *Approved architecture* #6). All four sub-checks were run.

**E1.1 — path, basename and stem.** `grep -rnF` over the whole repository excluding `.git`,
`node_modules`, `dist`, for `go-b0.png`, `go-b1.png`, `unlock.png`, `go-b0`, `go-b1`, `unlock`.

**Measured:** the only files matching the three filenames are **this workstream's own two
documents**. Zero hits in `src/`, `test/`, `scripts/`, `sim/`, `bench/`, `maintenance/`, `public/`,
`index.html`, `vite.config.js`, `.github/`, or any other document.

**E1.2 — every `import.meta.glob` in the repository.** This is the check that matters, because it is
the one that would have been skipped.

```bash
grep -rn "import.meta.glob" src test scripts sim bench maintenance vite.config.js
```

**Measured — exactly one glob exists:**

```js
// src/ui/skillArt.js:21
const FILES = import.meta.glob("../assets/skills/*/*.webp", { eager: true, query: "?url", import: "default" });
```

It matches `.webp` files under `src/assets/skills/<dir>/`. **It cannot match a `.png` at the
repository root.** This same glob is what makes 19 live files under `src/assets/skills/` look like
orphans to a naive sweep — the hazard recorded as H1.

**E1.3 — dynamically constructed paths.** **Measured:** the only template-literal `.png`
construction in the repository is in `scripts/viewport-proof.mjs`, which writes
`harness-`/`real-`/`diff-`/`determinism-` names into the viewport evidence output directory. It
cannot produce a repository-root name. Zero hits for root-relative asset references
(`new URL("../<file>.png")` shape).

**E1.4 — the 42 `unlock` hits, classified individually.** The bare stem `unlock` appears 42 times, so
it was checked rather than waved through. **Measured:** every hit is either (a) this workstream's own
documents, or (b) a JavaScript identifier or i18n key — `unlockAllProfile`, `unlockAllCosmetics`,
`unlockProgress`, `unlockLabel`, `src/i18n/unlockText.js`, `achievement.gameover.unlock-heading`.
**Not one references an image file.** `src/game/cosmetics.js:4` states in its own header that the
module deliberately imports no image assets.

### E2 — build-graph evidence

Run **before** the removal, while all three files were still on disk — so absence from `dist/` proves
they are outside the build graph, rather than being trivially guaranteed by their deletion. This
ordering is the point of the check.

`npm run build` → exit 0, then:

- **Filename match in `dist/`:** one hit, `dist/assets/unlockText-CtVZdiEd.js` — the compiled
  `src/i18n/unlockText.js` module, **not** the PNG.
- **Content match in `dist/`:** every `.png` in `dist/` hashed with `git hash-object` and compared
  against the three blob SHAs. **Measured: no byte-identical file exists in `dist/` for any of the
  three.** Vite hashes asset filenames, so a filename check alone would not have been sufficient.

### E3 — test-suite evidence, before and after

See §5. **The suite behaves identically before and after**, including its one pre-existing failure.

### E4 — CI and workflow evidence

```bash
grep -rlE "go-b0|go-b1|unlock\.png" .github/
```

**Measured: zero hits.** No workflow references any of the three. `deploy-media.yml` triggers on
`media/**`; `deploy.yml` reasons about `assets/` and the slot directories. None names a
repository-root image.

### E5 — documentation evidence, live vs historical

**Measured:** the only documents naming these files are `planning-report.md` and `task-contract.md`
in this workstream — i.e. references created *by this task's own analysis*, which are **not** live
dependencies. Zero references in `README.md`, `AGENTS.md`, `CLAUDE.md`, `docs/engineering/**`,
`docs/decisions/**`, or any other document.

### E6 — recorded recoverability, demonstrated for real

Not merely written down. Executed:

```console
$ git checkout 370f1b0f36de99ed2066e7f184479b0ad59bc7d0 -- go-b0.png
$ git hash-object go-b0.png
40189f51b8e98552941fb92b24c657bf68d4d8fb      # identical to the recorded blob
```

**Measured: recovery is byte-exact.** The removal was then re-applied, and the final working tree
contains no `.png` at the repository root. Each of the three is recoverable by one command; the
commit message carries the blob SHA and the anchor.

---

## 4. What was added

`docs/README.md` — an index for `docs/`, approved as **Q5** and resolving **Q4** as its vehicle.

**A pure addition. No file was moved, renamed or edited to create it** — required, because
`docs/decisions/engineering-log-2026-08.md` cites these paths and is preserved as written
(`docs/decisions/README.md`).

### The honesty constraint, and how the index meets it

Q4 asked which loose `docs/*.md` documents are live and which are superseded. **An agent cannot
derive that.** Inventing a verdict would read as a decision nobody made.

What it does instead: **it transcribes each document's own self-declared status.** **Measured:** most
documents in `docs/` carry a status line in their own header — *"Lebendes Dokument"*, *"Status:
KONZEPT"*, *"freigegeben, Umsetzung ausstehend"*, *"Status: GEBAUT"*, *"Entwurf zur gemeinsamen
Abstimmung"*. The index quotes those. Where a document declares nothing, it is marked
**`unclassified`** — explicitly *not* a quiet guess that it is obsolete. One document
(`telemetry.md`) is currently in that state and is the only outstanding item from Q4.

### A finding produced while building the index

**Measured, and worth a reviewer's attention:** four branch names referenced as current targets by
documents in `docs/` **no longer exist** — `Autostich_Test`, `balancing`, `Autostich/pixi`,
`test/sim`. None resolves as a local or remote ref (verified 2026-08-21 against
`git for-each-ref refs/heads refs/remotes`).

Affected: `autostich-v2-plan.md`, `autostich-test-stand.md`, `eis-rework.md` (*"Ziel-Branch:
`balancing`"*), `sim-harness-plan.md` (*"Branch `test/sim`"*), `stein-fraktion.md`, and the patch-notes
PDF. The index carries an explicit warning that branch names, test counts and "current state" claims
in these documents are historical — the same treatment `docs/decisions/README.md` prescribes for the
engineering log. **A document's design content can be entirely current while its branch references are
stale**, so this is a labelling matter, not grounds for removal.

### Also recorded in the index

- The two **generated** files that a test compares byte-for-byte against their generator
  (`username-profanity-guard.sql`, `localization/strings_de_pixi_2026-08-15.csv`), each marked *never
  hand-edit* with its regeneration command. **Inferred:** this is the most likely way a future
  contributor turns the suite red in `docs/`.
- The three PDFs, flagged as the only files in `docs/` that cannot be diffed, searched or reviewed.

---

## 5. Gate results

Run in the contract's order, in the task worktree, **unpiped or with `set -o pipefail`**, with exit
codes captured explicitly.

| Gate | Command | Exit | Result |
| --- | --- | ---: | --- |
| 1 | `npm test` | **1** | 1 failed / 2047 passed of 2048 — **pre-existing**, see §6 |
| 2 | `npm run lint -- --max-warnings=0` | **0** | Clean |
| 3 | `npm run build` | **0** | Built in 5.77 s |
| 4 | `npm run gen:db` | **0** | 219 entries generated |

**Measured:** after `gen:db`, `git status --porcelain` showed only the three intended deletions and
the untracked new documents — the generator dirtied nothing.

**`npm run loc:export` — not applicable, and deliberately not run.** No player-visible text changed
and nothing under `docs/localization/` or `src/i18n/` was touched (proven in §2). Running it would
have produced a diff this task is not authorised to make.

**Preview build (`VITE_PREVIEW=1`) — not applicable.** That gate binds when a change touches code
behind the preview gate. **This change touches no code at all**: three binary deletions and one new
Markdown file.

---

## 6. Known state the reviewer will hit

> **`npm test` exits 1 at the base commit, before any change in this task.**

**Measured — the failure is identical before and after:**

```text
FAIL  test/i18n-guards.test.js > i18n · Abdeckung wächst mit
      > jeder Katalog-Schlüssel wird auch irgendwo benutzt
Error: Test timed out in 5000ms.
```

It is a **timeout, not an assertion failure**. Four independent lines of evidence that it is
unrelated to this work:

1. **It fails at the base commit**, measured before the first removal — 1 failed / 2047 passed.
2. **It passes in isolation.** `npx vitest run test/i18n-guards.test.js` → **27 passed in 2.24 s**,
   against a 5,000 ms limit. The scan is CPU-bound and only exceeds the limit under full-suite
   parallel load on this host.
3. **The test cannot see this change.** It reads `.js`/`.jsx` files under `src`, `src/ui`, `src/game`
   and `src/i18n` only (`test/i18n-guards.test.js:570`). It never reads `docs/` or the repository
   root, and §2 proves `src/` is byte-identical to base.
4. **The pass/fail counts are unchanged**: 2047 passed at base, 2047 passed after.

**Observed, and reported rather than smoothed over:** one full-suite run showed **2** failures
instead of 1 — a second timeout in the same run. Two subsequent runs showed 1. The named failure is
always the same test and always a 5,000 ms timeout. **Inferred:** load-dependent flakiness on this
host, with the margin between the ~2.2 s real cost and the 5 s limit narrow enough to cross under
contention.

**Not fixed here, deliberately.** The fix is a `testTimeout` on that test — an edit to `test/`, which
is this task's tripwire. Raising a timeout to make a hygiene task look green is exactly what the
tripwire exists to prevent. **Proposed:** a separate backlog item, owned by whoever owns the suite.

**Not measured:** whether this test also times out in CI on Linux. This host is Windows; CI is Linux
and its machine profile differs. A reviewer on other hardware may not reproduce it at all.

---

## 7. The limits of this evidence

Stated plainly, per `task-lifecycle.md` — §7.

- **Host:** one Windows 11 machine, Git Bash. **Nothing was verified on Linux**, which is what CI
  runs. Line-ending and case-sensitivity behaviour is unverified here (hazard H8, below).
- **No browser was opened.** No preview server was started and no screen was rendered. For a change
  of three binary deletions and one Markdown addition this is appropriate, but it means **no visual
  claim of any kind is made.**
- **The index's statuses are transcriptions, not judgements.** Where a document's self-declared status
  is itself out of date, the index inherits that. It records what each document claims, with a date,
  not what is true.
- **`telemetry.md` remains unclassified.** The one Q4 item the index could not resolve honestly.
- **The `src/assets/` orphan question is untouched** — `planning-report.md` §4.4 explicitly did not
  attempt it, and nothing here changes that. 34.7 MB remains unaudited.
- **Nothing proves the removed screenshots were never useful to a human**, only that no code, test,
  workflow, build step or document consumes them. That is the strongest available claim; it is not
  the same claim.

---

## 8. Hazard resolution

Every hazard named in the contract, resolved before handoff (`task-lifecycle.md` — *Two standing
rules*).

| # | Hazard | Resolution |
| --- | --- | --- |
| H1 | Dynamically loaded assets invisible to `grep` | **Measured.** E1.2 enumerated every `import.meta.glob`; the only one cannot match a root `.png`. E1.3 and E1.4 covered dynamic construction and the 42 `unlock` hits |
| H2 | Source-text ratchet tests | **Measured.** `test/` byte-identical to base (§2). All three raw-text couplings were classified *keep* and none was touched |
| H3 | Engineering-log path citations broken by a move | **Not applicable.** Nothing was moved or renamed; the index is a pure addition |
| H4 | Scope creep into history rewrite | **Measured.** No `filter-repo`, no force flag, no push. Only `git rm` on the current branch |
| H5 | Removing evidence for a completed workstream | **Not applicable.** Q1 ruled *keep*; §2 proves `docs/workstreams/viewport-harness/` is untouched |
| H6 | Localization CSVs are generated views | **Measured.** Nothing under `docs/localization/` was touched, so `loc:export` was correctly not run. The index records the coupling for future contributors |
| H7 | CI-only consumers | **Measured.** E4 — zero hits in `.github/` |
| H8 | Windows/Linux divergence | **Not measured, and this is the main open risk.** Gates ran on Windows only. **Inferred low:** the change is two binary deletions and one new LF Markdown file, with no rename and no case change — the shapes that usually cause divergence are absent |
| H9 | Concurrency | **Measured.** One writer, one worktree, throughout |

---

## 9. Suggested reading order for the reviewer

1. **§2 scope compliance** — one command establishes that the entire must-not-touch surface,
   including `test/` and `media/`, is byte-identical to base. Everything else is bounded by that.
2. **§6 known state** — run `npm test` expecting exit 1, so the pre-existing timeout is not mistaken
   for a regression.
3. **§3 E1.2 and E1.4** — the two checks that would have been skipped by a careless pass, and the
   reason the removals are safe rather than lucky.
4. **`docs/README.md`** — the substantive deliverable. Worth more scrutiny than the deletions.
5. **`planning-report.md` §6** — the rejected options, if the question "why so little?" comes up.

---

## 10. Open questions for the reviewer

A handoff with no open questions has not looked hard enough.

1. **Is `docs/README.md` correct where it transcribes a status?** The index reports what each document
   claims about itself. A reviewer who knows the project may spot a document whose self-declared
   status is stale — that is a finding this task cannot produce on its own.
2. **`telemetry.md` is `unclassified`.** Should it carry a status line, or is it live by default?
3. **The stale-branch finding (§4) affects six documents.** Should each get a one-line "branch
   references are historical" note in its own header, or is the index-level warning sufficient?
   Editing them was out of scope here.
4. **Does the `i18n-guards` timeout also occur in CI on Linux?** Unmeasured. If it does, it is a real
   suite defect and not merely a local flake, and it needs its own task.
5. **`design/brand/logo-source.png` (1.8 MB) has zero references** and was ruled *keep* on the
   inference that a brand master is expected to have none. Worth confirming that inference is right.

---

*Evidence package issued at handoff. Nothing has been pushed, merged or promoted. Integration into
`dev` is authorized separately, not implied by this document.*
