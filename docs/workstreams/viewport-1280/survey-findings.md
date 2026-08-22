# Survey findings — `#viewport-1280` commit 4

**Measured 2026-08-22** on the production build at `c8af0f76` (threshold 1280), through
`scripts/viewport-survey.mjs`. Raw matrix: `evidence/survey/matrix.json`. Generated table:
`evidence/survey/findings-table.md`.

**Nothing here was repaired.** Contract §9 makes every layout fix a non-goal of T1b. This document is
the input to T2.

---

## 1. What was measured

| | |
| --- | --- |
| Sizes | 1920×1080 (reference) · 1600×900 · 1536×791 · 1400×700 · 1280×720 |
| Languages | DE and EN |
| Surfaces | 10 — hub, upgrades, shop-packs, leaderboard, stats, guide, glossary, options, feedback, privacy |
| Cells | **100, none unreached** |
| Build | production, real CDP viewport, `vite preview --port 5181 --strictPort` |

Determinism controls are the ones `phone-proof.mjs` earned: reduced motion, seeded `Math.random`,
muted, telemetry off, minimal effect tier, images forced eager and awaited, **every animation pinned
to `currentTime` 0**. Without the last one a screen can differ from itself by 0.66 % of its pixels
(`evidence-T1.md` §7.6.1).

### 1.1 Every number is a delta against 1920

This is the decision the survey stands or falls on. Measured on the first trial run: the shop reports
**20 overflowing elements and 13 outside their panel at 1280 — and exactly the same 20 and 13 at
1920.** Those are a property of the screen, or of the probe's panel heuristic. They are not a
consequence of the threshold move, and reporting them raw would have buried the surfaces where the
count really does go from zero to non-zero.

So every figure below is what the narrower viewport **adds** over the same surface, in the same
language, at 1920×1080. Absolute values stay in `matrix.json`.

---

## 2. Findings, sorted by damage

| Surface | Worst added overflow | Outside panel | Overflowing elements | Truncated | Shrunk text | Page scroll |
| --- | --- | --- | --- | --- | --- | --- |
| `guide` | **1331.1 px** (de 1280×720) | **18** (de 1400×700) | **20** (de 1400×700) | — | **60** (de 1600×900) | 0×15 px |
| `glossary` | **746.5 px** (de 1280×720) | **26** (en 1280×720) | **25** (en 1280×720) | — | — | 0×15 px |
| `privacy` | **278.8 px** (de 1400×700) | **4** (de 1536×791) | **6** (de 1536×791) | — | — | 0×15 px |
| `upgrades` | **116 px** (de 1400×700) | **1** (de 1400×700) | **14** (de 1400×700) | — | — | 0×15 px |
| `options` | **103.6 px** (de 1280×720) | — | **2** (de 1400×700) | — | — | 0×15 px |
| `shop-packs` | 2.8 px | **6** (de 1400×700) | **6** (de 1400×700) | **7** (de 1280×720) | — | 0×15 px |
| `feedback` · `hub` · `leaderboard` · `stats` | — | — | — | — | — | 0×15 px |

### 2.1 The guide is the worst case, and it is a text problem

`--gs`, the guide's own scale factor, measured on `.gd-page`:

| 1920×1080 | 1600×900 | 1536×791 | 1400×700 | 1280×720 |
| --- | --- | --- | --- | --- |
| `1.2` | `.9` | `.82` | `.82` | `.82` |

The floor `.82` is reached at **1536**, not at 1280. What that does to the text, measured:

- at **1600×900** already: "Kernidee" 13.2 px → **9.9 px**; the pillar labels "Mono / Motor / Tempo /
  Serie" 12.6 px → **9.45 px**. 60 nodes shrink.
- at **1280×720**: the smallest sizes on the screen are **8.61 px** and **9.02 px** (35 nodes),
  against 12.6 px and 13.2 px for the same nodes at 1920.

**This is the only surface in the survey with any text shrinkage at all.** Nine of ten surfaces have
none. It is also the surface the owner's own visual gate flagged independently as `V1280-03`
(*"guide pages lassen sich nicht scrollen"*) — the same construction seen from the other side: `--gs`
shrinks text precisely so the page does not have to scroll.

### 2.2 The narrowest window is not the worst one

Four of the six damaged surfaces peak at **1400×700**, not at 1280×720 — `privacy`, `upgrades`,
`options` (element count) and `shop-packs`. And the page-scroll finding is unanimous: **every one of
the ten surfaces scrolls 15 px vertically at 1400×700, and none scrolls at 1280×720.**

1400×700 is the shortest window in the matrix. **The band's damage is driven by height at least as
much as by width**, which the planning report did not anticipate — §1.5 reasons almost entirely about
width, and only row 8 is height-aware.

### 2.3 Common cause

`guide`, `glossary`, `privacy` and `options` share a shape: a fixed pixel lane next to a flexible one,
where the lost width lands entirely on the flexible side. That is the class the planning report named
as R2 and predicted for rows 3–7. It holds — but the surfaces it actually damages are not the ones
predicted (see §3).

---

## 3. Prediction accounting (contract §8.5)

Every row of `planning-report.md` §1.5, marked against measurement.

| # | Site | Predicted | Measured | Verdict |
| --- | --- | --- | --- | --- |
| 1 | `.go-blist` (victory) | real overflow ~70–90 px | — | **not measured** — victory needs a live run |
| 2 | Guide `--gs` `.82` | labels 10 → 8.2, tags 10.5 → 8.6, body 13 → 10.7 | `.82` from 1536 down; 12.6 → 9.45, 13.2 → 9.9, floor 8.61 px | **HELD, and worse** — the step engages at 1536, not 1280 |
| 3 | `.cz-split` / `.cz-shotlab` (shop) | high | 2.8 px added overflow; **7 truncated deck names** at 1280 | **HELD in kind, not in severity** — the damage is truncation, not overflow |
| 4 | `.st-readout` (stats) `1fr 620px` | high | **zero** added overflow, outside, truncation or shrinkage at every size | **REFUTED** |
| 5 | `.lb-page` / `.lb-body` (leaderboard) | medium | **zero** on every metric at every size | **REFUTED** |
| 6 | `.up-vgrid` `repeat(6, minmax(0,1fr))` | ~210 px per node at 1400, ~190 at 1280 | 215 px at 1920, **147 px at 1400, 128.5 px at 1280** | **HELD in direction, REFUTED in magnitude** — a third narrower than predicted |
| 7 | `.up-facbody` / `.gd-desk` / `.gl-desk` / `.fb-form` / `.un-first` | medium, −120 px each | guide and glossary badly hit; `.fb-form` (feedback) **zero on every metric** | **SPLIT** — held for the guide and glossary, refuted for feedback |
| 8 | Run stage `--rn-w` / `--bf-w` | not a regression; 1280×720 better than 1400×700 | — | **not measured** — needs a live run |
| 9 | `.hub-pair` zoom floor `0.85` | ~1449 zoomed px at 1280 | zoom is **0.85 at 1600, 1536, 1400 and 1280**; 1 only at 1920 | **HELD, floor reached far earlier** than the row implies |
| 10 | `#ecke` `--as-corner-lane: 92px` | band reaches to 1280, 92 px unverified there | **92 px at every size, 1920 down to 1280** | **HELD** — constant, now verified. Whether 92 px is *right* at 1280 is a design question |
| 11 | `.lv-rig` wings | 178 px each | — | **not measured here**; computed at 162 px and recorded in `evidence-T1.md` §7.7, confirmed visually as `V1280-04` |

**Score: 5 held, 2 refuted, 2 split, 3 not measured.**

The two clean refutations matter more than the hits. Rows 4 and 5 were rated "high" and "medium" and
produce **no measurable damage at any size in either language**. Both were derived by reading grid
track lists out of the stylesheet; the targeted probe found that `.st-readout` is not a grid at all
(padding plus a left border) and that `.lb-page` / `.lb-body` are grid *items*, not containers. The
prediction reasoned about a construction that is not where it was thought to be.

---

## 4. What was NOT measured

Named, per contract §5.4 and acceptance §8.4.

### 4.1 Seven of the fifteen surfaces in §5.2

`perk choice` · `skill choice` · `formation phase with buildings / architect contour` · `architect` ·
`victory screen` · `run details` · `run dialogs`.

All seven sit behind a live run. The survey drives the production build, and the only direct route
into a chosen run state — `DevRunSetup`, which takes a per-round schedule of
`skill` / `perk` / `formation` / `shop` — is `VITE_PREVIEW`-gated and folded out of production. The
likely route is a `RESTORE_RUN` snapshot injected into `localStorage`; it is not built.

**This is the largest gap in commit 4 and it is not a small one:** three §1.5 predictions (rows 1, 8,
11) and two of the owner's four visual findings (`V1280-01`, `V1280-04`) live on those screens.

### 4.2 Named in the contract, still not measured

- **The running-trick board state** (§5.2). It shows the trick-breakdown row the buildings state does
  not, so it puts more content in the same height. Neither board state was reached at all.
- **The empty formation-phase state** — strictly less dense, the lower risk of the two.

### 4.3 Other gaps

- **Shop tabs.** Only `packs` was measured; `challenges` and `effects` were not.
- **Upgrade tree branches.** The general branch and one faction page were measured; the faction
  branch as a whole was not enumerated.
- **Leaderboard tabs.** Global only; `ranked` was not measured.
- **The username modal** (`.un-first`, §1.5 row 7) — reachable only on first start.
- **2560×1440** — out of scope by the planning report's own decision.

---

## 5. Typography inventory (contract §5.3 item 6)

Collected for all 100 cells and stored in `matrix.json` under `cells[*].type`: per text-carrying
element, the computed size, weight, opacity, font family, nearest panel ancestor, structural path,
and the first 40 characters of its text.

This is **input for S2 and not a criterion here** (contract §7). The one text rule T1b does enforce is
the regression rule — nothing at a narrower width smaller than the same node at 1920 — and by that
rule exactly one surface fails: the guide (§2.1).
