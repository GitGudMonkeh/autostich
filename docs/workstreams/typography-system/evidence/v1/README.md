# S0 evidence — survey reach, the V1 baseline, and what it does not prove

**Task:** `#typo-system` S0 (`task-contract-S0.md`) · **Branch:** `task/typo-v1-survey`
**Base:** `feature/typo-system` at `413aa226` · **Run date:** 2026-08-23

---

## 1. Inventory, re-measured against the real base

Contract part 1. The source-side counts are **unchanged** from the planning report — the freeze held:

| Measure | Planning report | Measured at `413aa226` |
| --- | --- | --- |
| Size utilities in `src/**` | 770 | **770** |
| …carrying `dt:` | 35 | **35** |
| `font-size` declarations in `index.css` | 164 | **164** |
| `font-[NNN]` in JSX | 0 | **0** |
| The five named ratchets | 5, at their recorded lines | **5, all confirmed at their lines** |

### 1.1 Delta: the RENDERED inventory has moved, and the report's figures are stale

The contract says report the delta, do not silently adopt either figure. There is one:

| Measure | Planning report §1.3 | This run |
| --- | --- | --- |
| Distinct rendered sizes (de @ 1920, menus) | 39 | **37** |
| Text nodes in the 9–27 px band | 3701 | **5022** |

The node count grew because this run measures **two more screens** (§2). The distinct-size count fell
because **`dev` moved between the two measurements** — see §4.1, which is the finding that matters.

### 1.2 Role-table check (planning report §3.2) — passes, with one correction

Re-run against this run's data: **all seven rows occupied, none empty.**

| Token | Step | Nodes |
| --- | --- | --- |
| `--text-micro` | 9 | 559 |
| `--text-meta` | 11 | 1025 |
| `--text-body` | 13 | 1859 |
| `--text-body-lg` | 15.5 | 1051 |
| `--text-title` | 18.5 | 284 |
| `--text-head` | 22.5 | 76 |
| `--text-figure` | 27 | 149 |

**Correction to the planning report: there are THREE equidistant values, not two.**

| Size | Nodes | Between | Resolved upward to |
| --- | --- | --- | --- |
| 10 px | 408 | 9 and 11 | 11 |
| **12 px** | **698** | **11 and 13** | **13** |
| 17 px | 22 | 15.5 and 18.5 | 18.5 |

12 px was missed, and it is the **single heaviest value in the tree**. The mapping is unaffected —
§3.2 already lists 12 in the `--text-body` row — but a codemod written to "apply the tie rule to 10
and 17" would have let a nearest-neighbour implementation resolve 698 nodes arbitrarily. **S1 must
apply the tie rule to all three.**

---

## 2. Survey reach extended

Contract part 2. Two surfaces added to `scripts/viewport-survey.mjs`, both **inside the 4-minute
time box**, measured on one cell before the budget was spent:

| Surface | Utilities it exercises | Time per cell |
| --- | --- | --- |
| `architect` | `ArchitectScreen.jsx` — **79**, the heaviest file in the tree | **47 s** |
| `victory` | `GameOver.jsx` — **38** | **52 s** |

Route: play forward with turbo and poll, the method already proven for the perk choice.
`DevRunSetup` was **rejected** (contract A1): it is `VITE_PREVIEW`-gated and the survey measures the
production build on purpose.

**Two dead ends worth recording**, because both cost a probe run:

- **`.arch-toggle` is not an architect class.** It lives in `ArchPanels.jsx`, which `ArchitectScreen`
  does not import — only `FormationPhase` and `ChronikOverview` do. The first probe reached step 7 of
  8 and then waited out the full 120 s for a class that renders on a different screen. The marker is
  now `[data-tut="arch-board"]`. **`ArchitectScreen` has no root class of its own** — finding for S2,
  which edits that file anyway.
- **The end screen needs no full run.** `END_RUN` (`reducer.js:308`) ends a run voluntarily and goes
  straight to it. The surface still walks to round 4 first, deliberately: an end screen from round 1
  has no perks, no skills and no score, so half its sections never render and would go unmeasured.

---

## 3. V1 baseline

Contract part 3. **150 cells, 0 not reached.**

- **15 surfaces** × **1920×1080 · 1600×900 · 1536×791 · 1400×700 · 1280×720** × **de and en**
- `matrix.json` (7.2 MB) — computed size, weight, family, opacity and panel ancestor per text node
- `capture/` — **210 screenshots, 30 MB**

**State: fresh and deterministic**, per planning report §8.1d Q12b. No personal save, no accumulated
unlocks. Enforced by the survey's existing controls: reduced motion, seeded `Math.random`, seeded
username, muted, telemetry off, minimal effect tier, install prompt suppressed, images forced eager
and awaited, animations pinned to time 0. `localStorage.as_activerun` is cleared before every
surface, so an in-run cell cannot contaminate a menu cell.

### 3.1 Screenshot format and DPR — a decision, with its arithmetic

**WebP quality 95, not PNG.** Measured on a busy screen: 85 KB against 359 KB at DPR 1, 208 KB
against 887 KB at DPR 2. The full set as PNG is ~180 MB, and it is captured **twice** (V1 and V2).
Lossy is the right trade for screenshots a *person* compares and the wrong one for anything a machine
diffs, so `cdp.mjs` keeps PNG as its default and `pixel-diff.mjs` / `phone-proof.mjs` are untouched.

**DPR 2 only at 1280×720 and 1920×1080.** The binding viewport and the reference. A sub-pixel
rounding defect that shows in neither is not worth doubling the evidence for. Result: 30 MB, not 180.

### 3.2 Reproduce

```bash
npm run build
node scripts/viewport-survey.mjs --out docs/workstreams/typography-system/evidence/v1 \
                                 --shots docs/workstreams/typography-system/evidence/v1/capture
```

Narrow a debug run with `--size`, `--lang`, `--surface`. A `--surface` run deliberately writes **no**
`matrix.json`: a partial matrix silently replacing a full one is the evidence-corruption failure this
survey exists to prevent.

---

## 4. Findings

### 4.1 The stored viewport-1280 baseline is stale — and the survey is deterministic

**This had to be separated, because S1's entire acceptance gate is "re-run the survey, expect zero
deltas". If the survey were non-deterministic, that gate would be worthless.**

Comparing this run against the stored `viewport-1280/evidence/survey/matrix.json` showed **610 nodes
with a different size, 1075 paths not found, 46 cells with a different node count.** The examples all
sat on the guide screen at a clean ratio — 13.2 → 11, 18 → 15, 21.6 → 18, exactly 1.2.

Two explanations were possible and they have opposite consequences, so it was **measured, not
argued**: the same tree was surveyed **twice** and the two runs compared.

| Same tree, two runs | Result |
| --- | --- |
| Text nodes compared | 2604 |
| Deltas in size / weight / family | **0** |
| Paths not found | 5 (all leaderboard, §4.2) |

**The survey is deterministic for everything S1 measures.** The 610 deltas are therefore what the
planning report warned about in §6.5 — the stored numbers are *"a baseline, not a constant"*, measured
before the icons work landed. **The stale file must not be used as S1's oracle.** `evidence/v1/` is.

### 4.2 The leaderboard has network-dependent rows — S1's gate must tolerate it

The five unmatched paths are global-leaderboard entries — `"Durchlauf 0"`, `"0/27"`, `"#19"` — fetched
live, so the row *count* varies between runs. **Their sizes are stable** (9.5 px/450, 10 px/450,
12 px/450 in both runs); only how many rows exist changes.

**Consequence for S1, stated so it is not discovered as a failure:** the zero-delta check must compare
nodes **present in both** runs and must not treat an absent path as a delta. Otherwise the leaderboard
alone will fail a gate that is otherwise green, and the natural reaction — loosening the gate — would
be the wrong fix.

### 4.3 Overflow, measured and NOT repaired

S0 measures and does not repair (contract non-goal 3), and the owner has accepted layout breakage
(planning report §8.1d Q11b). Recorded for the menu-and-panel rework:

| Screen | Observation |
| --- | --- |
| `victory` | **147 overflow / 147 outside at every viewport**, plus **71 nodes SHRUNK** against the 1920 reference. The largest single finding in the set |
| `glossary` | 157–170 overflow, growing as the viewport narrows |
| `shop-packs` | 20–26 overflow, 2–4 truncated at 1280×720 |
| `guide` | 11–20 overflow |
| 1400×700 | every menu screen scrolls 15 px vertically — the only viewport that does |

These exist **before** any typography change. They are the V1 baseline's own state, which is exactly
why V1 is taken before the first edit: without it, V3 could not tell "this change did it" from "it was
always like that".

### 4.4 An accident, and the fix that came out of it

The survey's output directory was **hard-wired** to the viewport-1280 strand's evidence folder, and
the writer *merges* into whatever `matrix.json` it finds there. The first full S0 run therefore
rewrote another workstream's committed evidence. It was caught by `git status`, the file was restored
with `git checkout --`, and this run's data was kept.

`--out <dir>` now exists, with the default unchanged so existing invocations behave as before.
**Evidence belongs to the workstream that produced it**, and a tool that silently merges into someone
else's file will eventually do it when nobody is watching.

---

## 5. Coverage, and the reduced criterion

Contract part 4. **578 of 770 size utilities (75 %)** now sit on screens the zero-delta gate reaches —
up from roughly two thirds. The two additions carry 117 of that gain.

**Not machine-checked — 192 utilities across 26 files:**

| Utilities | Files |
| --- | --- |
| 20 · 19 | `DeckDetail` · `BuildSummary` |
| 13 · 13 · 13 | `LegendarySelect` · `FormationPhase` · `FamilyTargetSelect` |
| 11 · 11 · 10 · 10 | `UsernameModal` · `RunDetail` · `RunConfirm` · `ChronikOverview` |
| 8 · 6 · 4 · 4 · 4 | `panelKit` · `CardDetail` · `TargetSelect` · `GlacierPick` · `FormationPanel` |
| 3 × 4, 2 × 4, 1 × 2 | `UpdateBanner` · `TutorialOverlay` · `LayoutPerks` · `GlacierFormLegend` · `RunLoader` · `PwaInstall` · `CollapsibleField` · `BuildPanel` · `PerfOverlay` · `App` |
| **24** | `DevRunSetup` (15) · `DevPerkCatalog` (9) — **preview-gated, not in the shipped build** |

Excluding the dev-only pair, the real residual is **168 utilities, 22 % of the migration.**

`FormationPhase` and `RunConfirm` are *traversed* by the architect and victory paths but not
*measured* as surfaces — passing through is not measuring, and they are counted as uncovered.

### 5.1 Downgrade record (`task-lifecycle.md` §11)

**Reduced criterion:** S1's zero-delta gate covers 75 % of the migrated surface, not 100 %.

**Why it was not driven higher:** each remaining screen needs its own navigation path and its own
game state, and the long tail is 26 files averaging seven utilities each. The two that carried real
weight — 117 utilities between them — were taken. Beyond that the cost per covered utility rises
steeply while the value falls.

**Compensation, named rather than improvised later:**

1. The screens above are **migrated under human review at V3** instead of the machine gate.
2. **S1's handoff must list them by name**, so the V3 reviewer knows where to look hardest.
3. `DeckDetail` and `BuildSummary` (39 utilities between them) are the two largest and should be
   opened deliberately during V3, not left to chance.

**What this does not cover, stated plainly:** a wrong token on one of those 168 call sites will not be
caught by any automated layer. It will be caught by a person looking, or not at all.

---

## 6. Gates

`npm test` · `npx eslint . --max-warnings=0` · `npm run build` — all run bare and green at the
committed state. `git diff --stat` against the base is `scripts/` and evidence only: **zero `src/**`
lines**, which is what makes this task reviewer-free.
