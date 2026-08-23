# S2 evidence — the collapse, the retune, and what the numbers actually say

**Task:** `#typo-system` S2 (`task-contract-S2.md`) · **Branch:** `task/typo-s2-scale`
**Base:** `feature/typo-system` at `0ee3bdad` · **Date:** 2026-08-23

**This is the task where the product changed.** V1 → V2, measured.

---

## 1. Acceptance criteria, one by one

| Criterion | Target | Measured | |
| --- | --- | --- | --- |
| Distinct rendered sizes collapse | 39 → ladder + display | **36 → 26**; **88.8 % of menu nodes now sit on a ladder step** | see §1.1 |
| Displacement in the corridor | ~42 % moved > 5 % | **41.9 %** of 26 445 nodes | ✅ |
| Worst case | ~10 % | **28.6 %** | ❌ **see §2 — the prediction was wrong, not the result** |
| Weights back on the ladder | 400/500/600 + named exceptions | 650 and 800 **gone**; 700 → 29, 900 → 9, both named | ✅ |
| Phone unmoved | structural | no value outside the desktop media query was edited | ✅ |
| Nothing unreadable at 1280×720 | hard gate | no new truncation beyond +1/+4 nodes, none illegible | ✅ |
| Overflow at 1280×720 | record, do not fix | **402 → 430** (de), **401 → 426** (en) | recorded, §4 |

### 1.1 The residue is enumerated, not estimated

19 sizes remain off the ladder. **All of them are on one of the four permanent exemption lists**, and
none is migration debt:

| Sizes | Source |
| --- | --- |
| 7.48 · 8.16 · 16.32 | container-query text — `clamp(7px, 11cqw, 11px)` and friends, evaluated |
| 8 (121) | card marks in `CardGrid.jsx` |
| 10 · 10.5 · 13.5 · 14.5 · 15 · 18 | the `--gs` family on the guide |
| 22 | the wordmark, through `--wm-size` |
| 9.5 · 14 · 16 · 16.8 · 19 · 25 | inline `fontSize` computed from game state |
| 30 · 38.4 | display sizes, deliberately above the ladder |

---

## 2. The worst case missed its prediction, and the prediction was the thing that was wrong

**Predicted 10.0 %. Measured 28.6 %.** The example is `architect`, 7 px → 9 px.

**Why.** The §3.1 scale fit was computed over the **9–27 px band**, which is 93.9 % of menu text.
Sizes *below* 9 — 7, 7.5, 8, 8.5 — were never in the fit. They are nonetheless migrated, into
`--text-micro` (9 px), and 7 → 9 is +28.6 %.

**Inside the band the fit actually measures, the number holds**: 43.8 % of the 24 256 in-band nodes
moved more than 5 %, against a predicted ~42 %.

So this is not a defect in the collapse; it is a **gap in the analysis that produced the criterion**.
The honest statement is: the ladder moves sub-9 px text by up to 28.6 %, that was never predicted
because those sizes sat outside the fitted band, and the criterion should have said so.

**Is it harmful?** 7 → 9 px is +2 px absolute on text that was at the edge of legibility. It is
plausibly an improvement. That judgement is the owner's at V3, which is why it is written here as a
number rather than argued away.

---

## 3. The weight ladder — and the leak nobody had found

24 CSS declarations moved to 600 in commit 2. **101 nodes were still rendering at 700 afterwards.**

**The cause was Tailwind's preflight**: `b, strong { font-weight: bolder }`, and `bolder` from 400
resolves to **700** — a rung the ladder does not have. 92 `<b>`/`<strong>` elements in the JSX. The
`@theme` remap cannot reach them: it rewrites the `font-bold`/`font-extrabold` *utilities*, not the
element default. Exactly the same shape of leak as the 24 stylesheet declarations, one layer further
down, and invisible to every grep for `font-weight`.

One rule closed it. 700 fell **101 → 29**.

A last inline `fontWeight: 650` in `GuideOverlay.jsx` was the final off-ladder rung; removed, because
`<strong>` now carries 600 project-wide and the weight was doing nothing the colour was not.

**What survives, and why:**

| Weight | Nodes | Reason |
| --- | --- | --- |
| 700 | 29 | The glossary's serif info button — **Georgia is not a variable face**. It ships 400 and 700 and nothing between, so 600 would be synthesised or ignored. Two nodes per screen because the button sits in the header everywhere. Annotated at both declarations |
| 900 | 9 | Card numbers (`Card.jsx`) and the large in-game announcement — game-piece text, exempt |
| 450 | 108 | `.ty-num-sm` and the wordmark. **Pre-existing**: the `#typo` log documents a 400/500/600 ladder, and 450 was already outside it before this workstream. Not introduced here; named as a finding for the menu pass |

### 3.1 A number that moved and turned out not to be ours

Weight 450 grew 72 → 108 between V1 and V2, which looked like an unexplained side effect.
Traced per screen: **the entire growth is on the `leaderboard` (26 → 62)**, and every other screen is
unchanged to the node. Those are the network-dependent live rows S0 §4.2 identified. No typography
cause. Checked rather than assumed, because an unexplained weight change is exactly what should not
be waved through.

---

## 4. Overflow at 1280×720 — measured, NOT repaired

Per the owner's decision (planning report §8.1d Q11b) layout breakage is accepted and handed to the
menu-and-panel rework. **This is that handover list.**

| | V1 | V2 |
| --- | --- | --- |
| de, overflowing nodes | 402 | **430** |
| en, overflowing nodes | 401 | **426** |
| de, truncated | 14 | 15 |
| en, truncated | 11 | 15 |

The increase is modest because most of the overflow **already existed** — the V1 baseline recorded
147 overflowing nodes on the end screen alone, 157–170 on the glossary, at every viewport, before a
single typography change. The retune added ~28 nodes, not 430.

**What still blocks and did not occur:** no text is clipped to nothing, overlapped into illegibility,
or pushed out of reach. The truncation counters moved by +1 and +4 nodes, all of them ellipsised
labels that were already ellipsising.

---

## 5. Two accidents worth keeping

**The collapse block collided with seventeen test files.** It opens with
`@media (min-width: 1280px) {` — the same text seventeen desktop tests use with `indexOf` to locate
*the* desktop block. Placed earlier in the file, it silently became the block they measured. All
seventeen failed at once, which is the only reason it surfaced before the visual gate rather than
after it. The block now sits at the end of `index.css`.

**The plan contained an impossible promise, and it had to be resolved here.** `task-contract-S1` A2
expected the provisional variants to be renamed away, leaving seven clean names at every call site.
That cannot coexist with a frozen phone: a class renders one size, and `text-meta-1` (10 px, 135
sites) and `text-meta-3` (11 px, 159 sites) differ on the phone too. Collapsing both onto `text-meta`
moves the phone.

Resolution: the variants stay as the phone's value carriers and resolve **through** the role token on
desktop, inside the one media query. One edit to a role still moves every desktop call site; the
phone keeps today's values; a later mobile strand deletes the override and the variants together, so
the deferral is a deletion rather than a second migration. Recorded in `conventions.md` so the next
reader does not copy the variants into new code.

---

## 6. The one-edit test

The workstream's goal, restated as an experiment: change one token value, rebuild, and every screen
using that role moves.

Performed, not asserted: `--text-body` re-pointed from 13 px to 12.5 px, rebuilt, re-surveyed
(de @ 1920), then restored.

| | |
| --- | --- |
| Nodes rendering at 13 px | **739** |
| …that followed the single edit | **722** |
| …that did not | **17** |

**All 17 are on the guide**, and they are the `--gs` family — `calc(13px * var(--gs))`, a permanent
exemption because it is fit-to-box rather than a scale step. Nothing inside the system failed to
follow. One edit, one block, no call site touched.

Had this failed, the workstream would not have delivered regardless of how the screens look. The 17
are quoted rather than rounded away because "722 of 739" is the honest shape of the claim.

---

## 7. Gates

`npm test` (139 files) · `npx eslint . --max-warnings=0` · `npm run build` · `npm run gen:db` —
all bare, all unpiped, all green after every commit.

## 8. What this does NOT prove

**Nothing about whether it looks good.** The suite does not render. 41.9 % of menu text moved, and
whether that reads as one product is the question V3 exists to answer — **by a person**. No agent
reports that result as approved.

The 168 utilities on screens the survey cannot reach (S0 §5) carry no machine check in either
direction. `DeckDetail` and `BuildSummary` are the largest; they should be opened deliberately at V3.

---

## 9. V3 — the material for the human gate

`evidence/v3/compare.html` — **150 before/after pairs**, every screen at every viewport in both
languages, V1 left and V2 right, same state and same DPR. Open it from this directory; the paths are
relative to `evidence/`.

`evidence/v3/pairs/` — six pre-rendered pairs for the screens where the change is easiest to read:
guide, glossary, upgrades, hub, victory (all at 1280×720) and stats at 1920×1080.

**This is material, not a verdict.** V3 is a person comparing them (`task-lifecycle.md` §8), and no
agent reports the result as approved. The classification table (V4) is written after that, and every
finding gets an ID — including the ones that turn out to be *expected*: the lighter headings from the
weight ladder, and the ~42 % of text that moved by design.
