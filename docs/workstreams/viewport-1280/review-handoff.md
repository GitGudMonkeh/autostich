# Codex Review Handoff — `#viewport-1280`, commit 3 (the flip to 1280)

**Reviewer role: independent assessment only. Do not implement.** Findings return to the Claude
worker in this worktree (`feature/viewport-1280`), per `docs/engineering/git-workflow.md` — *Reviewer
ownership*. Codex reviews; Codex does not implement.

This document prepares a review. **It is not a review, and it contains no assessment of the work.**
Every gate row below states whether the gate was run while this document was being assembled.

---

## 0. Blocking notice

| | |
| --- | --- |
| **Acceptance gate §8.1 — pixel half** | **not demonstrated.** `phone-proof.mjs compare` never reads the PNGs; 7 of 10 committed pairs differ at byte level. See §3.1 — this is the most important thing in this document |
| **Hazards without a status at handoff** | **0 of 8** — §6, supplied by the worker on 2026-08-22 |
| **Definition-of-done items unticked** | **7 of 7** — §7. The contract writes them as plain bullets, so none carries a tick mark |
| **Push state** | head **is** on `origin/feature/viewport-1280`; the range is fetchable |
| **Worktree** | **dirty** at the time of writing — see §9 |

**Two deviations from the contract, both deliberate, both the owner's decision:**

1. **§6 places the Codex handoff after commit 4.** Commit 4 (the survey) has not started. This review
   covers **commit 3 alone**, at the owner's instruction, so that the measurement tooling is checked
   before the survey builds ~170 evidence cells on top of it.
2. **Contract §12 (*Expected file surface*) was added after commit 3 was already committed.** It was
   derived by the worker from §4, §9 **and the diff it is used to check**, then approved by the
   owner. This is stated plainly in §6 below because it materially limits what the scope check
   proves.

---

## 1. Context

| | |
| --- | --- |
| **Context** | `#viewport-1280` — the desktop layout applies from 1280 px instead of 1400 px |
| **Contract** | `docs/workstreams/viewport-1280/task-contract-T1b.md` §4 (commit 3) |
| **Branch** | `feature/viewport-1280` — pushed, own upstream, **not** merged into `dev` |
| **Diff** | `d3f65b4322a7dc08abc9e4aea2942caff324dc74..c8af0f763de82bbb409a2085c3761b51de05c792` |
| **Size** | 84 files, +20355 / −408 (insertions dominated by `geometry.json`, ~344 kB of evidence) |
| **Gates** | six run in this session, all exit 0 — §5 |

SHAs, not branch names, so the range survives branch deletion
(`task-lifecycle.md` — *Evidence package*).

One commit:

```
c8af0f76  refactor: lower the desktop threshold to 1280 px
```

Ancestry verified: `git merge-base --is-ancestor <base> <head>` exit **0**.

---

## 2. What was agreed

The binding statement is the contract, not this document:
`docs/workstreams/viewport-1280/task-contract-T1b.md`. Read §4 (commit 3), §9 (non-goals) and §12
(expected file surface) before the diff.

Contract §8, *Acceptance gate*, quoted verbatim. **Items 3, 4 and 5 belong to commit 4** and are out
of range for this review:

> 1. The 390 px phone proof: 0 structural differences on geometry, 0.0000 % of pixels beyond the noise
>    threshold, DE **and** EN, comparing across the flip.
> 2. The completeness guard fails on a reinstated 1400 site — **demonstrated, not asserted.**
> 3. The survey script runs reproducibly from the repository and writes machine-readable evidence,
>    including the typography inventory.
> 4. Findings cover every listed surface × 5 sizes × 2 languages. **What was not measured is named**,
>    including the two board states of §5.2.
> 5. Every §1.5 prediction from the planning report is marked held or refuted.
> 6. Gates green, unpiped, in this order:
>
>    ```bash
>    npm test
>    npm run lint -- --max-warnings=0
>    npm run build
>    npm run gen:db
>    ```
>
>    Plus the `VITE_PREVIEW=1` build. Commit 3 changes `src/`, so unlike commits 1 and 2 this is the
>    point where both build variants actually matter.

---

## 3. The claims to check

**Worker-supplied, 2026-08-22.** Ordered by how much the worker doubts them, not by size.

### 3.1 The pixel half of the acceptance gate is not demonstrated — start here

**Measured.** Contract §3.1 requires "Pixel comparison — the existing text-mask / noise-threshold
method", and §8.1 requires "0.0000 % of pixels beyond the noise threshold". Neither happens:

- `compare()` in `scripts/phone-proof.mjs` reads `applicable-390.txt` and `geometry.json` **only**.
  It never opens a PNG. Verified by reading the function and by grep.
- `geometry.json` carries `metrics` and node boxes. **No pixel digest.** Comparing it therefore
  cannot compare pixels even indirectly.
- Direct byte comparison of the committed pairs: **3 identical, 7 differing** — `de-hub`, `en-hub`,
  `en-leaderboard` identical; the other seven differ by −583 B to +705 B.
- The text-mask / noise-threshold method **does exist**, fully implemented, in
  `scripts/viewport-proof.mjs` (mask rasterisation, noise threshold, structural-versus-noise split).
  It was never wired into `phone-proof.mjs`.

**Not classified, deliberately.** A differing PNG byte count is not a statement that the layout moved
— separating rasterisation noise from a structural difference is exactly what the unused method is
for, and what a human visual gate decides (`task-lifecycle.md` — *Visual review*). This document does
not say what the images show.

**Inferred, and the reviewer should weigh it:** element geometry is identical on all 10 captures —
every node's tag and rounded box, in document order — which is a strong independent signal that the
layout did not move. It is not the criterion the contract wrote down.

**Worker correction on the record.** The commit message of `c8af0f76` says "geometry and pixels
identical on five screens in DE and EN". The geometry half is measured; **the pixel half was never
measured** and the worker took it from the tool's own header comment, which claims a comparison
`compare()` does not perform. The overstatement is the worker's.

### 3.2 The worker repaired a proof and then certified the repair

`phone-proof.mjs` proof 1 never evaluated the width of a minified compound query. The worker found
it, fixed it, and produced the counter-check for it. The counter-check has a **named gap**:

- It moved `.lv-rig { --lv-h: min(92dvh, 760px) }` to 761px — a **top-level** rule. That exercises
  the "still catches a real change" direction.
- **Measured:** the applicable set at 390 px contains **0 compound conditions**. So there is nothing
  in this stylesheet that the repaired split must *keep*. The fix is verified only in the "drops
  correctly" direction; the "keeps correctly" direction is untested because no fixture exists.

Press on `recanonicalise()` in particular: it re-splits a stored `rest` string that was itself
produced by joining on `" and "`. The worker believes this is idempotent and stable under the sort;
that belief is not proven by a test.

### 3.3 The completeness guard's exception list is eleven judgement calls

Each entry asserts that a surviving `1400` is *not* the threshold. The one the worker is least sure
of: `index.css` "Auf 1400+ px stehen sechs Kacheln je Zeile" — read as a measurement at a named
width, but it could equally be read as a claim about the desktop range, which now starts at 1280.

### 3.4 Guard assertion 5 cannot fail independently

`test/desktopBreakpoint.js` throws at import time when the two halves drift, so assertion 5 in
`test/viewport-1280.test.js` never gets to run in that case. Contract §4.1 anticipated this and asked
for it to be stated as an assertion anyway. Sabotage D shows the throw, not the assertion. Whether
that is acceptable or a vacuous test is a reviewer's call.

### 3.5 Prose carried into files the contract did not name

`docs/engineering/conventions.md` and two `docs/art/**/README.md` were edited because they state the
threshold as a live fact. The contract's §4 list does not name them. Scope judgement.

### 3.6 The `:hover` finding was documented, not repaired

At 1280 the 12.9" iPad in landscape (1366 CSS px) enters the desktop block, where `:hover` rules apply
without `@media (hover: hover)`. §9 forbids the repair. Whether documenting is a sufficient response
to a behaviour change this commit introduces is a reviewer's call, not the worker's.

---

## 4. Scope compliance

### 4.1 What this proves, and what it does not

**Measured.** Every entry in contract §12 category A resolved at both ends of the range and compared
equal. A tree hash proves the whole subtree byte-identical, recursively, including that nothing was
**added** into it.

**Inferred, and the limit matters.** §12 was written *after* commit 3, partly from the diff it now
checks. A scope list derived from the change it verifies cannot surface a breach the author did not
already notice — it can only confirm what was already believed. **Treat category A as a floor, not as
a scope proof**, and judge scope from §4 and §9 of the contract independently.

### 4.2 Category A — must not change (hash-verified)

| Entry | Type | Hash at both ends | Result |
| --- | --- | --- | --- |
| `docs/decisions/**` | tree | `67eef85f0161` | unchanged |
| `docs/workstreams/viewport-harness/**` | tree | `8e82be859140` | unchanged |
| `sim/**` | tree | `556011d3373f` | unchanged |
| `src/assets/**` | tree | `75b3aba805c2` | unchanged |
| `src/main.jsx` | blob | `c3b745988dbf` | unchanged |
| `index.html` | blob | `cfe6344a30ba` | unchanged |
| `package.json` | blob | `4130c1641333` | unchanged |
| `package-lock.json` | blob | `7eed7f16416b` | unchanged |
| `vite.config.js` | blob | `9c7ec59c4765` | unchanged |
| `eslint.config.js` | blob | `3ebdf1a7dc83` | unchanged |
| `AGENTS.md` | blob | `696f110907a2` | unchanged |
| `CLAUDE.md` | blob | `af4493607150` | unchanged |
| `.gitattributes` | blob | `c05763671cec` | unchanged |
| `.github/**` | tree | `7fb56236b0a1` | unchanged |
| `public/**` | tree | `50549c726e16` | unchanged |

### 4.3 Category B — behaviour frozen, comment-only changes permitted

Not a hash comparison: these paths **did** change. The check is that the diff contains no non-comment
line.

| Entry | Non-comment lines in the diff | Note |
| --- | --- | --- |
| `src/game/**` | **0** | one comment line in `storage.js` |
| `src/i18n/**` | **0** | corroborated independently: `npm run loc:export` ran and produced no tracked-file change |

### 4.4 Category C — not mechanically verifiable, reviewer must judge

- **The phone layout below the threshold.** The proof is `scripts/phone-proof.mjs`, not a hash — and
  that tool was modified in this same commit. See §3 and §10.
- **Height media queries** 950 / 900 / 820 / 1000 — occurrence counts measured equal across the range
  (5 / 1 / 1 / 1). No guard asserts this; a later commit could move one unnoticed.
- **`scripts/cdp.mjs`** — unchanged in this range, but named in §12 as a scope question rather than a
  free hand.
- **`gameover.best.hint`** — measured present and unchanged in both catalogues.
- **No layout repair anywhere** (§9). Only a reading of the diff can establish this.

### 4.5 Reproduce

```bash
B=d3f65b4322a7dc08abc9e4aea2942caff324dc74
H=c8af0f763de82bbb409a2085c3761b51de05c792
for p in docs/decisions docs/workstreams/viewport-harness sim src/assets src/main.jsx \
         index.html package.json package-lock.json vite.config.js eslint.config.js \
         AGENTS.md CLAUDE.md .gitattributes .github public; do
  a=$(MSYS_NO_PATHCONV=1 git rev-parse --verify "$B:$p")
  b=$(MSYS_NO_PATHCONV=1 git rev-parse --verify "$H:$p")
  [ "$a" = "$b" ] || echo "CHANGED: $p"
done
# expected: no output

# category B
git diff $B $H -- src/game src/i18n | grep '^[-+]' | grep -v '^[-+][-+]' \
  | grep -vE '^[-+]\s*(//|/\*|\*)'
# expected: no output
```

`--verify` is not optional: without it `git rev-parse` echoes an unresolvable argument and exits 0.
`MSYS_NO_PATHCONV=1` is required on Windows because `revision:path` is the argument shape MSYS
mangles (`CLAUDE.md` — *Platform note*); it is harmless on Linux.

---

## 5. Gate results

**All six were run in this session**, from this worktree, unpiped, with the real exit code recorded.
None of these rows is a quoted prior claim.

| Gate | Run here | Exit | Result |
| --- | --- | --- | --- |
| `npm test` | yes | 0 | 136 files, 2057 tests, all passing |
| `npm run lint -- --max-warnings=0` | yes | 0 | 0 warnings |
| `npm run build` | yes | 0 | built |
| `npm run gen:db` | yes | 0 | 219 entries |
| `npm run loc:export` | yes | 0 | no tracked-file change — see §4.3 |
| `VITE_PREVIEW=1 npm run build` | yes | 0 | built |

`loc:export` was run because the diff touches `src/i18n/**`. Both build variants were run because the
diff touches preview-gated code (`src/ui/testViewport.js`); `AGENTS.md` — *Validation gates* is what
decides that, not habit.

No test file failed, so the both-results rule for full-suite versus isolated runs
(`NEW_MACHINE_SETUP.md` — *Windows: full-suite timeouts are a load artifact*) did not need to be
applied. Cumulative test time ~70 s.

---

## 6. Hazards

Contract §10, verbatim. **The status column was set by the worker on 2026-08-22**, as a separate act
from generating this document — every status is a measurement from the session that produced
`c8af0f76`, not a planning-time claim promoted forward (`task-lifecycle.md` — *Two standing rules*).
The *Recorded elsewhere* column remains what was already written down, quoted and located.

| # | Hazard (verbatim from contract §10) | Status at handoff | Recorded elsewhere |
| --- | --- | --- | --- |
| 1 | **The order in §2.** Capture the phone baseline first. It is the one step that cannot be recovered. | ☑ **measured** — baseline captured at `d3f65b43`, before the flip; `before/` verified byte-unchanged against the committed baseline | `evidence-T1.md` §7.6 — *"`before/` was never written to; verified with `git diff` against the committed baseline (empty)."* |
| 2 | **Source-text ratchets.** Commit 3 changes a number in ~11 media queries and ~250 comments. Read each failing assertion and decide whether *behaviour* changed or only *spelling*. **Never weaken a guard to reach green.** | ☑ **measured** — full suite exit 0, 136 files / 2057 tests; no ratchet failed at any point | `evidence-T1.md` §7.1 — *"**Not one source-text ratchet broke.** That is the return on commit 1: all 33 anchors already compute from `DESKTOP_MIN`."* |
| 3 | **Prose that guards match.** One anchor already keyed on a German comment heading containing "ab 1400 px" (fixed in commit 1). Assume there are more of that shape and check before assuming a real failure. | ☑ **measured** — ~250 comments carried, suite green; no guard keyed on carried prose failed | none found for commit 3; `evidence-T1.md` §2.1 records the commit-1 instance |
| 4 | **`i18n` comment prose.** `de.js` and `en.js` carry comments claiming "ab 1400 px". They are comments, not strings, so `loc:export` is not triggered — but leaving them stale makes the localisation files lie. | ☑ **measured** — 0 non-comment lines in the `src/i18n` diff; `loc:export` exit 0, no tracked-file change | this document §4.3 and §5 — comment-only diff, `loc:export` exit 0 with no tracked-file change |
| 5 | **Scrollbar cascade.** At 1280 a vertical scrollbar leaves 1272 px of client width, so a surface that overflows slightly in height can also overflow in width. Record both axes; address height before width when reporting causes. | ☑ **not applicable** to commit 3 — no width is measured in this range; the hazard belongs to commit 4 | none found — this is a commit-4 measurement concern |
| 6 | **Windows / Git Bash.** `MSYS_NO_PATHCONV=1` for `revision:path` arguments; prefer `git hash-object <path>` and `git show --raw <rev>` where they avoid the colon. | ☑ **measured** — every `revision:path` argument in this session used `MSYS_NO_PATHCONV=1`; §4.5 reproduces it | none found in `evidence-T1.md` |
| 7 | **Escaping in built CSS.** Inside a bracketed Tailwind value the dot is escaped in the selector too (`tracking-\[\.2em\]`). An unescaped search needle finds nothing and looks exactly like a regression. This already cost one false alarm. | ☑ **not applicable** to commit 3 — no bracketed Tailwind value was searched for here; the variant rewrite was commit 2 | `evidence-T1.md` §4 records the commit-2 false alarm |
| 8 | **`.gitattributes` is load-bearing.** When CI and local disagree, check line endings, case sensitivity and generated files before assuming a logic regression. | ☑ **measured** — hash-verified unchanged, §4.2 | this document §4.2 — hash-verified unchanged |

---

## 7. Definition of done

Contract §11 writes its criteria as plain bullets rather than checkboxes, so **none of the seven
carries a tick mark**. All seven are listed verbatim; none is omitted or reordered.

- Capture tool committed and re-runnable; 390 px baseline captured **before** the flip.
- Threshold at 1280 at all four sites, with the completeness guard seen to fail under sabotage.
- Prose carried forward; the 1400-over-1280 rationale replaced.
- Phone counter-proof recorded, DE and EN.
- Survey script committed; findings written as an aggregated table sorted by damage, with named gaps
  and every prediction marked held or refuted.
- All gates green including the preview build.
- Branch pushed. Handed to Codex. **No pull request**, no integration.

Trailing condition, verbatim:

> **Not done** if any acceptance item is asserted rather than shown, or if a layout repair was made
> along the way because it "was only one line".

**Downgrade record: none present in the contract.** Two agreements were changed after the fact — the
review point (§6, now after commit 3) and the addition of §12 — and neither is recorded as a
downgrade in the contract's own terms. This document reports that the record is missing; it does not
write one.

---

## 8. Evidence and its limits

### 8.1 What exists

| Path | Contents |
| --- | --- |
| `docs/workstreams/viewport-1280/evidence-T1.md` | the written record; §7 covers commit 3 |
| `docs/workstreams/viewport-1280/planning-report.md` | the plan, including the §1.5 predictions |
| `evidence/phone-390/before/` | 10 PNG, `geometry.json`, `applicable-390.txt` — captured before the flip |
| `evidence/phone-390/after/` | 10 PNG, `geometry.json`, `applicable-390.txt` — captured after |

20 PNG files, 2.7 MB; evidence directory 3.6 MB total. **All committed** — `git status --porcelain`
over the evidence directory is empty.

Per `task-lifecycle.md` — *Committing evidence*: metadata and classification tables are always
committed; images only when they **are** the evidence. Here the pixel comparison is an acceptance
criterion (contract §8.1), so the images are the evidence rather than an illustration of it. **This
document reports that state and cites the rule; it decides nothing, and it says nothing about what
any image shows.**

### 8.2 Limits

**Worker-supplied, 2026-08-22.** All measured unless marked.

**Which screens.** Five, reachable from the hub without a live run: `hub`, `upgrades`, `shop`,
`leaderboard`, `stats` — each in DE and EN, so 10 captures per side.

**Which screens are NOT captured**, and why it matters less than it looks: level-up card, perk and
skill choice, guide, glossary, options, the run screen, victory, run details, architect. None is
reachable by a click path from a seeded hub. This is the stated reason proof 1 exists — rule
applicability is decidable for *every* screen including the unreachable ones, and the level-up card
is specifically one of the `display: contents` brackets that no capture can reach.

**Host and determinism.** Windows 11, Chrome via CDP, production build served by
`vite preview --port 5181 --strictPort`. `deviceScaleFactor: 1` — DPR is pinned, so the captures are
not host-DPR dependent. Viewport 390 × 844. Controls: reduced motion, seeded `Math.random`, muted
audio, telemetry off, minimal effect tier, seeded username, install prompt suppressed. Scrollbars
**not** hidden, by design.

**What no artefact speaks to:**

- **The pixel criterion of §8.1** — see §3.1. This is the largest gap.
- **Any window width other than 390 px.** Nothing in this commit measures 1280 itself. That is
  commit 4's job and it has not started, so the layout consequences of the flip are at this point
  **unmeasured** — which is the contract's design (§9 forbids repairing them here), not an oversight.
- **Runtime behaviour of `useIsWide()` at the new threshold.** Only the constant was changed and the
  guard checks it equals the token; no test exercises the hook at 1279/1280.

Visual classification (V3 / V4) is a human step per `task-lifecycle.md` — *Visual review*, and is not
attempted here.

---

## 9. Known state a reviewer will hit

**Measured:**

- **Worktree is dirty.** `docs/workstreams/viewport-1280/task-contract-T1b.md` is modified and
  uncommitted — this is contract §12, added while assembling this handoff. `review-handoff.md`
  itself is untracked. Neither is in the reviewed range, so the range excludes work that exists on
  disk.
- **Head is pushed.** `origin/feature/viewport-1280` contains `c8af0f76`; the range is fetchable.
- **`dev`, `test` and `main` untouched.** `origin/dev` is at `863febe5` and is an ancestor of the
  head; nothing was merged, promoted or force-pushed. No pull request was opened.
- **The branch carries more than this range.** `origin/dev..HEAD` is 9 commits; this review covers
  the last one. Commits 1 and 2 are recorded in `evidence-T1.md` §§1–6.
- **`npm ci` is per-worktree.** Test or lint failures in a fresh checkout may mean missing
  dependencies rather than a defect (`AGENTS.md` — *Before you start*).

**Worker-supplied, 2026-08-22 — things that look like defects and are not:**

- **`npm run build` prints a chunk-size warning** ("Some chunks are larger than 500 kB"). Pre-existing
  on `dev`; not introduced here.
- **`before/applicable-390.txt` has 40 records, `after/` has 34.** Expected: the after side was written
  by the repaired evaluator, which correctly drops six blocks that cannot apply at 390 px. `compare`
  re-canonicalises both sides, so they meet at 34. See §3.2.
- **`git diff` shows ~250 comment edits.** All mechanical. The six lines that needed judgement were
  excluded from the script and edited by hand; they are listed in `evidence-T1.md` §7.2.
- **Eleven `1400`s survive in `src/`.** Intentional, enumerated in the guard's own exception list, and
  the guard fails if any entry goes stale.
- **Full-suite timeouts on this host are a known load artifact**
  (`NEW_MACHINE_SETUP.md`). None occurred in this session; cumulative test time ~70 s.
- **`npm ci` is per-worktree.** A fresh checkout will fail lint and test until it runs.

---

## 10. Open questions for the reviewer

**Worker-supplied, 2026-08-22.** These are questions, not proposals; the worker is not asking for a
particular answer.

1. **Does commit 3 stand without the pixel comparison?** (§3.1) The acceptance gate names a criterion
   no artefact satisfies. Three readings are open: wire the existing method in from
   `viewport-proof.mjs` and re-run before anything else; accept element geometry as the operative
   proof and amend §8.1 to say so; or treat the seven differing PNGs as a visual gate for a human.
   The worker has no view on which is right and did not act on any of them.
2. **Is `recanonicalise()` the right shape at all?** It keeps an old baseline valid across a parser
   fix, which is what it was asked to do. It also means a *wrong* evaluator silently rewrites history
   on both sides and produces agreement — a failure mode the old construction did not have.
3. **Should the `:hover` case have blocked commit 3?** (§3.6) §9 forbids the repair, but §9 was
   written before anyone noticed a device class crosses the threshold.
4. **Is contract §12 legitimate?** It was written after the work and partly from the diff (§4.1). If
   not, the scope check in §4.2 should be read as informational only.
5. **Was the flip safe to make before commit 4 measured anything?** The order is the contract's own
   (§2), but it means the branch currently ships a threshold whose layout consequences are unmeasured.
6. **`gameover.best.hint`** — dead product text, carried since commit 1, still awaiting an owner
   decision. Not a code question; flagged so it is not lost.
7. **`docs/feature-backlog.md`** — its "1280 to 1399 px gets the phone layout" entry is obsolete as of
   this commit. Left untouched because editing a backlog entry is a product decision.

---

## 11. Suggested reading order

**Worker-supplied, 2026-08-22.** File order would start with 250 comment edits and bury the two
places where this commit could actually be wrong.

1. **§3.1 of this document**, then `scripts/phone-proof.mjs` `compare()` — establish for yourself
   what is and is not proven before reading any claim that rests on it.
2. **`scripts/phone-proof.mjs` `widthVerdict()` and `recanonicalise()`** — the repaired proof, and
   §3.2's named gap in its counter-check.
3. **`test/viewport-1280.test.js`** — the guard, its exception list, and whether each of the five
   assertions can actually fail.
4. **`src/index.css`**: the `@theme` token (line ~60), the counter-edge (~1461), the replaced
   rationale block (~1521), and the `:hover` note (~2214).
5. **`evidence-T1.md` §7** — the worker's own account, to compare against what you found in 1–4.
6. **The remaining diff**, mechanically. `git diff --stat` first; the comment edits are uniform and
   the six hand-edited lines are named in `evidence-T1.md` §7.2.

---

## 12. Provenance

Generated by `/prepare-review` on 2026-08-22, from
`docs/workstreams/viewport-1280/task-contract-T1b.md`, over
`d3f65b4322a7dc08abc9e4aea2942caff324dc74..c8af0f763de82bbb409a2085c3761b51de05c792`.

**Measured in this session:** the range and its ancestry; commit list and size; push state; worktree
state; every category A hash in §4.2; the category B comment-only checks in §4.3; the height-query
counts and `gameover.best.hint` in §4.4; all six gate results in §5; the evidence file inventory and
its committed state in §8.1.

**Supplied by the worker afterwards, on 2026-08-22, and marked as such at each heading:** §3, the
hazard statuses in §6, §8.2, the second half of §9, §10 and §11. These are worker assertions, not
generated output; the split is preserved so a reader can tell which is which.

**Measured while filling those sections:** that `compare()` never reads a PNG; that `geometry.json`
holds no pixel digest; the 3-identical / 7-differing byte comparison of the committed PNG pairs; that
the text-mask method exists in `scripts/viewport-proof.mjs`; that the applicable set at 390 px holds
0 compound conditions; `deviceScaleFactor: 1`; the five captured screen ids.

**Not verified, and deliberately so:**

- **No section of this document is an assessment.** Nothing here approves, signs off, or states that
  the work is ready.
- Whether the contract's §12 scope list is *correct*, as opposed to *satisfied*. It postdates the
  work it checks; see §4.1.
- Anything the evidence images show.
- Contract sections `/prepare-review` looks for that this contract does not have, by those names:
  *Local workspace*, *Scope*, *Approved architecture*, *Task-specific inputs*. Each is
  **section absent**; none was substituted or inferred from a neighbouring section.
