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
| --- | --- | --- | --- | --- |
| `go-b0.png` | `40189f51b8e98552941fb92b24c657bf68d4d8fb` | 197,508 | `23434476` *Siegesbildschirm: Durchlauf-Graph nach unten, Nullen bleiben stehen* | base `370f1b0f` |
| `go-b1.png` | `28fbfd021955be16f05a3a52435591687509079f` | 206,893 | `23434476` (same commit) | base `370f1b0f` |
| `unlock.png` | `7004e18aad384c793b5b7e4bcd7f6e66eb39429f` | 289,590 | `e1f849db` *Freischaltungen bekommen auf dem Desktop ein eigenes Fenster (*#unlock*-fenster)* | base `370f1b0f` |

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

### E7 — reproducible verification block

**Added 2026-08-22 at the review-fix round**, because E1–E6 above state results without always
giving the reader a command to re-derive them. Everything below is scoped to **the three removed
paths only**.

Every command here reads the **base tree by SHA** rather than the working tree, so it produces the
same output today, after the deletion, and after this branch is gone. Run from the task worktree;
`MSYS_NO_PATHCONV=1` is required on Windows Git Bash for `revision:path` arguments
(`CLAUDE.md` — *Platform note*) and is harmless on Linux.

```bash
BASE=370f1b0f36de99ed2066e7f184479b0ad59bc7d0
HEAD=1b41b4a2a7efd355a9d6cef654f4b9f4f29fa9dc
```

**R1 — the blobs exist at base, with the recorded sizes.**

```bash
for p in go-b0.png go-b1.png unlock.png; do
  MSYS_NO_PATHCONV=1 git rev-parse --verify "$BASE:$p"
  MSYS_NO_PATHCONV=1 git cat-file -s "$BASE:$p"
done
```

```console
go-b0.png    40189f51b8e98552941fb92b24c657bf68d4d8fb  197508 bytes
go-b1.png    28fbfd021955be16f05a3a52435591687509079f  206893 bytes
unlock.png   7004e18aad384c793b5b7e4bcd7f6e66eb39429f  289590 bytes
```

Total **693,991 bytes**, matching the figure in the table above.

**R2 — the paths are absent at head.** `--verify` exits 128 rather than echoing the argument.

```bash
for p in go-b0.png go-b1.png unlock.png; do
  MSYS_NO_PATHCONV=1 git rev-parse --verify "$HEAD:$p" >/dev/null 2>&1
  printf '%-12s rev-parse exit=%s\n' "$p" "$?"
done
```

```console
go-b0.png    rev-parse exit=128
go-b1.png    rev-parse exit=128
unlock.png   rev-parse exit=128
```

**R3/R4 — provenance and removal, per path.**

```bash
git log --diff-filter=A --format='%h %s' "$BASE" -- <path>        # added by
git log --diff-filter=D --format='%h %s' "$BASE..$HEAD" -- <path> # removed by
```

```console
go-b0.png    added 23434476  Siegesbildschirm: Durchlauf-Graph nach unten, Nullen bleiben stehen
go-b1.png    added 23434476  (same commit)
unlock.png   added e1f849db  Freischaltungen bekommen auf dem Desktop ein eigenes Fenster (#unlock-fenster)
all three    removed 11773733  chore: remove unreferenced debug screenshots from repo root
```

All three were removed in **one** commit, which is the single artefact category this task approved.

**R5 — reference sweep against the base tree, excluding this workstream's own documents.**
Excluding them is deliberate: references created by this task's own analysis are not live
dependencies, and including them would let the task cite itself as a consumer.

```bash
git grep -n -F -e "go-b0.png" -e "go-b1.png" -e "unlock.png" \
  "$BASE" -- . ':!docs/workstreams/repository-hygiene-cleanup'
git grep -n -F -e "go-b0" -e "go-b1" \
  "$BASE" -- . ':!docs/workstreams/repository-hygiene-cleanup'
```

```console
(no matches outside this workstream)
(no matches outside this workstream)
```

**R6 — every `import.meta.glob` in the tracked source, at base.** This is the check H1 exists for.

```bash
git grep -n -F "import.meta.glob" "$BASE" -- src test scripts sim
```

```console
…:src/ui/skillArt.js:17:   Kosten: `import.meta.glob` mit `?url` + `eager` liefert nur die URL-Strings …
…:src/ui/skillArt.js:21:const FILES = import.meta.glob("../assets/skills/*/*.webp", { eager: true, query: "?url", import: "default" });
```

Two lines, **one glob** — line 17 is the rationale comment, line 21 is the call. Its pattern is
`../assets/skills/*/*.webp`, which cannot match a `.png` at the repository root.

**R7 — CI and workflow sweep at base.**

```bash
git grep -n -E "go-b0|go-b1|unlock\.png" "$BASE" -- .github
```

```console
(zero hits in .github)
```

**R8/R9 — the `unlock` stem, and the claim that actually matters.**

The load-bearing question is not how many times the stem appears; it is whether **any** occurrence
names an image file. That is mechanically checkable:

```bash
git grep -n -E "unlock[^ ]*\.(png|jpg|jpeg|webp|gif|svg)" \
  "$BASE" -- . ':!docs/workstreams/repository-hygiene-cleanup'
```

```console
ZERO hits naming an image file
```

> **Correction to E1.4, recorded rather than quietly fixed.** E1.4 above states *"The bare stem
> `unlock` appears 42 times."* That figure is **not reproduced** by the sweep here: measured at base
> on 2026-08-22, excluding this workstream, the stem occurs **450 times across 39 files**. The
> discrepancy is one of sweep scope, not of substance — 39 files plus this workstream's own documents
> is close to 42, so the original figure was most likely a *file* count reported as an occurrence
> count. **The number was decorative; R9 is the claim that carries weight**, and it is unchanged: no
> occurrence of the stem names an image file. The original wording is left as written, with this
> correction beside it.

**R10 — recovery, proved without mutating the working tree.** E6 demonstrated recovery by checking a
file out and re-applying the removal. That is not something a reviewer should have to do to their own
tree, so here is the equivalent proof that the stored blob still hashes to the recorded SHA:

```bash
for p in go-b0.png go-b1.png unlock.png; do
  MSYS_NO_PATHCONV=1 git rev-parse --verify "$BASE:$p"
  MSYS_NO_PATHCONV=1 git cat-file blob "$BASE:$p" | git hash-object --stdin
done
```

```console
go-b0.png    recorded=40189f51…  rehashed=40189f51…  MATCH
go-b1.png    recorded=28fbfd02…  rehashed=28fbfd02…  MATCH
unlock.png   recorded=7004e18a…  rehashed=7004e18a…  MATCH
```

All three **MATCH** (*measured*). The actual recovery command remains
`git checkout <base> -- <path>`, recorded in the removal commit message per E6; this block proves the
object it would restore is intact without asking the reviewer to write to their tree.

**R11 — dynamic path construction, the reproducible form of E1.3.** E1.3 above stated its result
without a command. Four sweeps, all at base.

```bash
# a — template literals containing .png
git grep -n -E '`[^`]*\.png' "$BASE" -- src test scripts sim bench maintenance vite.config.js index.html
# b — new URL(...) on the runtime surface
git grep -n -F "new URL(" "$BASE" -- src
# c — string concatenation onto a .png literal
git grep -n -E '\+ *"[^"]*\.png"|"[^"]*\.png" *\+' "$BASE" -- src scripts sim
# d — every .png literal on the runtime and build surface
git grep -n -E '\.png' "$BASE" -- src index.html vite.config.js public
```

```console
a — 10 hits, all scripts/viewport-proof.mjs, all of the shape
    join(OUT, `harness-${vp.id}@${DPR}x.png`) / `real-…` / `diff-…` / `determinism-…`
b — (zero hits under src/)
c — (no hits)
d — index.html:11              favicon-64.png          (public/)
    index.html:18              apple-touch-icon.png    (public/)
    public/manifest.webmanifest:13-15   icon-192.png, icon-512.png, icon-maskable-512.png
    src/index.css:617          comment: "statt logo-wordmark.png"
    src/ui/StartScreen.jsx:377 comment: "statt logo-wordmark.png"
    src/ui/cosmeticAssets.js:8-9  comments: "entspricht card-front.png / card-back.png"
```

**Sweep (d) is the decisive one, because it is exhaustive rather than targeted.** Every `.png`
literal on the runtime and build surface is listed above, and **none of them is `go-b0.png`,
`go-b1.png` or `unlock.png`**. The five real references are `public/` icons, which Vite copies
verbatim; the four `src/` hits are **comments** recording that a PNG was *replaced* by text or by a
`.webp`.

Sweep (a) confirms the only template-literal `.png` construction writes into the viewport-proof
output directory and is prefixed `harness-`/`real-`/`diff-`/`determinism-`, so it cannot produce a
repository-root name. Sweep (b) is scoped to `src/` deliberately: `new URL(` occurs ~100 times under
`test/`, every one of them `readFileSync(new URL("../src/…"))` — tests reading source as text, which
is the ratchet surface, not an asset consumer. Widening (b) to `test/` produces noise, not evidence.

**R12 — build-graph evidence, the reproducible form of E2.** E2 above asserted that no
byte-identical PNG existed in `dist/`; it gave no command. Run 2026-08-22 at head:

```bash
npm run build      # unpiped; exit code captured separately
find dist -name '*.png' -type f -exec git hash-object {} \;
```

```console
npm run build  ->  exit 0, "✓ built in 6.04s", 1204 modules transformed
dist PNG count: 5
3344ec6de9ee129865fb1de1c74ca257d33cc618
989b282584735fa0ed49c950313068b93800d430
b5e8ceb2bc360a3a26c3dcbf25a949db0405cc16
bea68bb012e3889748f2fa171e093ea58312c1c9
f49c91dd4194300e18dfb37353ea84cbf5c55431

intersection with the three removed blobs:
no match  40189f51b8e98552941fb92b24c657bf68d4d8fb
no match  28fbfd021955be16f05a3a52435591687509079f
no match  7004e18aad384c793b5b7e4bcd7f6e66eb39429f
```

**This run is the post-removal form, and it is weaker than E2's original.** With the files already
deleted, their absence from `dist/` is partly guaranteed by the deletion — which is exactly the
circularity E2's ordering was designed to avoid. It is reported at its real strength, not dressed up:
it confirms the current build ships none of the three, and nothing more.

**The pre-removal form, for anyone re-running it**, needs the base tree. It writes to the working
tree, so it belongs in a scratch checkout rather than in a reviewer's worktree:

```bash
git checkout 370f1b0f36de99ed2066e7f184479b0ad59bc7d0
npm ci && npm run build
find dist -name '*.png' -type f -exec git hash-object {} \;   # compare against the three blob SHAs
```

**What actually carries C1 is R11(d), not R12.** An exhaustive enumeration of every `.png` literal on
the build surface at *base* — where all three files still existed — settles whether they could enter
the build graph at all, and it needs no build and no checkout. R12 is corroboration.

**What R1–R12 do not establish.** They prove the three paths were unreferenced in the tracked tree at
base, are gone at head, and are recoverable. They say nothing about the two *other* gate conjuncts —
see §5 and §6 — and nothing about any path this task did not remove.

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
| --- | --- | --- | --- |
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
