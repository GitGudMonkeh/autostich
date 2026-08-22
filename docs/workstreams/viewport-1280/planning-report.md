# Desktop Layout from 1280 px (`#viewport-1280`) — Planning Report

**Status:** proposal. Nothing implemented, no branch created, no source file changed.
**Written:** 2026-08-22 · **Base:** `dev` at `863febe5`, clean working tree, single worktree.
**Author:** Claude Code session (planning role).
**Revision:** second pass. Sections 2, 3, 5 and 6 were replaced after the owner asked for a durable
fix rather than a small change now and a large one later, and granted licence to reshape the desktop
framing. Section 1.6 is new.

## Goal

The desktop layout must apply from **1280×720** instead of 1400 px, so that the itch.io browser embed
(1280×720) shows the desktop build rather than the phone build. Target sizes are **1280×720 ·
1600×900 · 1920×1080** (all 16:9). 2560×1440 is explicitly out of scope. The phone layout does not
change.

The alternative — a fullscreen button, or leaving the embed small — was rejected by the owner: the
first and for many visitors the only session must already show the correct build.

## Decisions on record

| Question | Decision |
| --- | --- |
| Anchor size for measurement | **1280 px window width.** Acceptance criterion 1 (no page scrolling) guarantees no scrollbar exists, so the 8 px a scrollbar would cost can never be missing. 1272 is not measured separately. |
| Scale of the fix | **Durable, in one go.** Not a mechanical value change now and an architecture later. The named breakpoint moves into T1; the fixed-lane problem gets a structural answer, not per-screen patches. |
| Surface licence | **Frames may be resized or tightened.** The owner supplied screenshots at 1600×900 showing the available slack. |
| Scrolling versus readability | **Readability wins.** In-panel scrolling is permitted and expected. The outer document still never scrolls. |
| Text floor for *this* workstream | **A regression rule, not a taste rule:** no text at 1280 is smaller than the same text at 1920. |
| Absolute text sizes | **Deferred to a separate strand.** See §1.6 and §5. A blanket floor applied to 27 unnamed sizes yields 27 unnamed sizes with a higher minimum. |
| Guide `--gs` | **Removed.** Fixed desktop sizes plus an internal scroller, like the other 16 panels. |
| Hub column pair at 1280 | Measure, then decide. The screenshot evidence (§1.5) suggests this is a light case, not a contested one. |
| Language of this workstream's documents | **English**, per `AGENTS.md`. German stays in the in-place source comments being carried forward, to avoid a translation-only diff in ratchet-guarded files. |

---

## 0. Corrections to the brief

The task brief was checked against the code. Three of its premises do not hold.

| Premise in the brief | What the code says |
| --- | --- |
| "headless via Playwright, like the previous passes" | **The project does not use Playwright.** `scripts/cdp.mjs` is a dependency-free Chrome DevTools Protocol client, and its header comment rejects Playwright explicitly: a new devDependency plus a browser download in every worktree and every CI run, to drive a browser the machine already has. The measurement pass must build on `cdp.mjs`. |
| "the threshold lives in two places" | **Four.** JSX utilities, `index.css` media queries, the `DESKTOP_MIN` constant in `src/ui/useIsWide.js`, and the test anchors that slice `index.css` into a phone half and a desktop half using the literal string `"@media (min-width: 1400px)"`. The fourth is the expensive one. |
| "a `CLAUDE.md` section `#viewport-1280`" | `CLAUDE.md` is a thin harness adapter since the instruction migration. The historical log lives in `docs/decisions/engineering-log-2026-08.md`; workstream material lives in `docs/workstreams/<name>/`. This directory is the delivery target. |

### 0.1 The decision this workstream overturns

`src/index.css` states, above the desktop block, why the threshold is 1400 and not 1280 — in the
original German:

> *Warum 1400 und nicht der `xl`-Standard 1280: das Spaltenpaar misst 1520 px. Bei 1280 bliebe kein
> Rand, der Entwurf klappt dort bewusst auf eine Spalte zurück. 1400 ist die erste Breite, bei der das
> Paar mit Luft steht (fluid gedeckelt, s. `.hub-pair`).*

1280 was considered and rejected once. Overturning that is legitimate — the constraint changed, the
itch.io embed did not exist when the rule was written — but it must happen deliberately and in
writing. Whichever way the hub question resolves, **that comment must be replaced**, not left standing
next to code that contradicts it.

---

## 1. Current state

### 1.1 Where the threshold lives

Counts were taken on 2026-08-22 at `863febe5`. They are inventory, not invariants; recompute with:

```bash
grep -ro "min-\[1400px\]" src/ | wc -l
grep -rn "min-width:\s*1400\|max-width:\s*1399" src/index.css
grep -rln 'indexOf("@media (min-width: 1400px)' test/
```

| Site | Extent | Note |
| --- | --- | --- |
| JSX utilities `min-[1400px]:` | ~134 occurrences across 10 files | `StartScreen.jsx` carries by far the most; then `UpgradeScreen`, `CustomizeScreen`, `RunDetail`, `PrivacyModal`, `LeaderboardScreen`, and one line each in `StatsScreen`, `OptionsModal`, `FeedbackModal`, `App.jsx` |
| `index.css` media queries | 13 blocks | 2 × `(min-width: 1400px)`; 5 × `+ (max-height: 950px)`; one each `+ (max-height: 900px)`, `+ (max-height: 820px)`, `+ (max-width: 1920px)`, `+ (max-width: 1760px)`; 1 × `(max-width: 1399.98px)` as the counter-edge |
| JS constant | 1 line | `DESKTOP_MIN = 1400` in `src/ui/useIsWide.js` — already correctly centralised |
| Test anchors | ~27 occurrences across 20 files | `css.indexOf("@media (min-width: 1400px)")`. The string is a **structural tool**, not a claim about the number |
| Prose and comments | ~250 mentions of "1400 px" | `index.css`, `App.jsx`, `src/i18n/de.js`, `src/i18n/en.js`, test headers, `docs/decisions/` |

**No collision with Tailwind's standard breakpoints.** The codebase uses only `sm:` / `md:` / `lg:`
(640 / 768 / 1024). `xl:` (= 1280 px) and `2xl:` appear nowhere. 1280 is free.

### 1.2 Architecture

- **Two layouts, one switch.** Everything desktop-side sits inside media queries; below the threshold
  the JSX classes are dead hooks. `useIsWide()` covers only the cases where the **DOM structure**
  differs and a media query cannot answer the question — the shop's pack detail (body portal below the
  threshold, second grid column above it) and the upgrade tree (tabs versus deck column). Layout
  belongs in the stylesheet, and that should stay true.
- **The bracket technique.** `.gd-cols`, `.gl-body`, `.cz-fxfoot`, `.lv-rig`, `.rn-head` / `-body` /
  `-main` / `-bank`, `.lb-pagescroll` are `display: contents` below the threshold. The phone layout is
  therefore DOM- and pixel-identical. This is the single reason the threshold move can be low risk at
  all: the wrappers exist at every width and only acquire a `display` inside the desktop block.

#### 1.2.1 Three shrink mechanisms that do not know about each other

This is the actual long-term defect, and it matters more than the number 1400.

| Mechanism | Where | Construction |
| --- | --- | --- |
| `--gs`, four measured steps | Guide | CSS custom property, bound to width **and** height |
| `zoom: clamp(0.85, tan(atan2(100vw, 1920px)), 1)` | Hub | CSS `zoom`, on `.hub-pair` / `.hub-foot` |
| `shotFactor()`, floor `SHOT_F_MIN = 0.45` | Shop preview | **JavaScript**, measures the overhang at runtime |

Each is well argued in isolation. Together they are why every new window size triggers a new
measurement round. Add roughly a dozen grids carrying one fixed pixel lane, and no consistent scroll
policy, and the shape of the problem is clear: **the desktop pass is tuned per size rather than built
to be size-agnostic.**

There is also a calc chain that is genuinely height-driven and correct as it stands: `--rn-chrome` →
`--bf-w` → `--bf-h` → `--card-s` for the run stage. It is not part of the defect.

### 1.3 Existing measurement infrastructure

The workstream needs to build almost nothing:

| Asset | What it gives us |
| --- | --- |
| `scripts/cdp.mjs` | Browser launch, `Emulation.setDeviceMetricsOverride`, `prefers-reduced-motion`, seeded `Math.random`, screenshots. Deliberately **without** `--hide-scrollbars`: a scrollbar is part of the layout under test |
| `scripts/viewport-proof.mjs` | A full layout fingerprint (tag · classes · rounded box for every element), a media-query table, and a pixel comparison with a text mask and a noise threshold at 8/255 |
| `src/ui/testViewport.js` | `TEST_VIEWPORTS` is **already** 1280×720 · 1600×900 · 1920×1080 · 2560×1440 |
| `docs/workstreams/viewport-harness/evidence/` | Reference captures and `report@1x.json` / `report@2x.json` |

The measurement pass is a **new probe on existing machinery**, not a new tool.

One constraint: `testViewport.js` and `TestViewportHarness.jsx` are gated behind
`import.meta.env.VITE_PREVIEW === "1"` and are folded out of a production build. The measurement pass
must therefore use a **real CDP viewport against a production build** served by `vite preview` — not
the in-app harness.

### 1.4 Measured baseline at 1280×720

From `docs/workstreams/viewport-harness/evidence/report@1x.json`, hub screen, real CDP viewport:

| Size | Desktop branch active | Document height / window | Client width |
| --- | --- | --- | --- |
| **1280×720** | **no** | **781 / 720 → 61 px of page scrolling** | **1272** (scrollbar costs 8 px) |
| 1600×900 | yes | 900 / 900 | 1600 |
| 1920×1080 | yes | 1080 / 1080 | 1920 |
| 2560×1440 | yes | 1440 / 1440 | 2560 |

Two things follow. The phone layout **already scrolls** at 1280 today. And at 1280 a vertical
scrollbar costs 8 px of width, which can reappear elsewhere as horizontal overflow.

### 1.5 Computed pressure points

Everything in this table is **computed from the CSS, not measured**, except where the source column
says otherwise. Producing the measured version is the point of T1. It is recorded so the measurement
pass has a hypothesis to confirm or refute, and so a later reader can see which predictions held.

| # | Site | At 1400 | At 1280 | Assessment |
| --- | --- | --- | --- | --- |
| 1 | `.go-blist > .grid` (victory) `repeat(3, minmax(300px, 1fr))` beside a 360 px board | ~970 px column | ~850 px column, grid demands ≥900 px plus gaps | **Real overflow, ~70–90 px.** `minmax(300px, …)` cannot shrink |
| 2 | Guide `--gs` step `.82` (applies at 1280×720, height ≤ 820) | `.82` measured at 1400×700 | labels `10 px → 8.2`, tags `10.5 → 8.6`, pillar body `13 → 10.7` | **Now a defect, not a feature.** It is the one place in the project that shrinks text to avoid scrolling — the trade the owner has reversed |
| 3 | `.cz-split` / `.cz-shotlab` (shop) fixed 520 px lane | ~820 px right | ~700 px right (−15 %) | high |
| 4 | `.st-readout` (stats) `1fr 620px` | | −120 px on the `1fr` lane | high |
| 5 | `.lb-page` `420px 1fr`, `.lb-body` `300px 1fr` (leaderboard) | | −120 px on the `1fr` lane | medium |
| 6 | `.up-vgrid` (tree) `repeat(6, minmax(0, 1fr))` | ~210 px per node | ~190 px per node | medium — truncation risk in node text |
| 7 | `.up-facbody` `1fr 330px`; `.up-desk` / `.gd-desk` / `.gl-desk` `300px 1fr`; `.fb-form` `1fr 400px`; `.un-first .un-body` `340px 1fr` | | −120 px each on the `1fr` lane | medium |
| 8 | Run stage: `--rn-w = min(1600px, 100vw − 80px)`, `--rn-chrome: 380px` at ≤900 height, `--bf-w = min(--rn-w, (100dvh − chrome) × 2.5)` | 1400×700 → board 800 | 1280×720 → board **850**, height budget 380 + 340 = 720 | **Not a regression.** Height-driven; 1280×720 is better than the already-measured 1400×700 |
| 9 | `.hub-pair` — design width 1520 px, `zoom` floor `0.85` | 1376 zoomed px | ~1449 zoomed px instead of 1520, fills the width | **Light case.** Owner screenshot at 1600×900 shows the hub carrying an empty band over roughly the lower third; the 1520 px is air the design *takes*, not air it *needs* |
| 10 | `#ecke` bands `(min-width: 1400px) and (max-width: 1920px / 1760px)` → `--as-corner-lane: 92px` | computed for 1400+ | band now reaches down to 1280, where 92 px is unverified | medium |
| 11 | `.lv-rig` `minmax(0,1fr) 924px minmax(0,1fr)` | wings 238 px each | **wings 178 px each** (built for 320 / 356) | **document only** in T1; own task afterwards |

**One common cause covers most of it.** Rows 3–7 are the same defect repeated: one fixed pixel lane
plus one `minmax(0, 1fr)` lane, so 120 px of lost window width lands entirely on the flexible lane.
That is what R2 (§3) addresses as a class rather than as a dozen cases.

**Evidence supplied by the owner.** Two screenshots at 1600×900, DPR 1.13. The hub shows substantial
vertical slack. The upgrade tree already scrolls internally — the scrollbar is visible beside the node
area and a node row is cut mid-card — which confirms that in-panel scrolling is already the lived
practice on that very screen. The screenshots are not committed; the observations above are what they
were read for.

### 1.6 Typography inventory — why the text floor is deferred

Measured 2026-08-22:

| Fact | Value |
| --- | --- |
| `font-size` declarations inside the desktop media blocks of `index.css` | **149** |
| Distinct values among them | **27** |
| Consecutive values between 10.5 and 15 px with no gap | **11** — 10.5 · 11 · 11.5 · 12 · 12.5 · **12.8** · 13 · 13.5 · 14 · 14.5 · 15 |
| Desktop text-size overrides in JSX (`min-[1400px]:text-[Npx]`) | 31, spread over 12 values |
| JSX `text-[<13px]` with **no** desktop override | ~362 occurrences (upper bound: includes game-piece text and `sm:` pairs) |
| …of which in `CardGrid.jsx` + `ArchitectScreen.jsx` | 62 — card marks and board counters, legitimately exempt |

**The desktop pass has no type scale.** It has 27 individually tuned numbers, including 12.8 px and
16.5 px, which are one-off nudges rather than steps. A minimum size applied across that produces 27
unnamed sizes with a higher minimum, at a cost of several hundred edits, and leaves the next
readability change just as expensive as this one.

The durable answer is a **named scale** — on the order of six to eight roles (`--tx-title`,
`--tx-head`, `--tx-body`, `--tx-label`, `--tx-caption`, `--tx-num`, `--tx-piece`) — after which
"everything a step more legible" is one edit per role. That is the same shape as R1 for the threshold
and R2 for the lanes: replace scattered literals with named tokens.

**Ordering matters: layout first, then type.** Tuning sizes against fixed-pixel lanes means tuning
twice — every raised line creates a fresh overflow in a rigid lane, which then gets trimmed away, and
after R2/R3 the trade is wrong again.

The measurement probe therefore carries a cheap addition: for every text node it records computed
size, weight, opacity, nearest panel ancestor, language and screen. Clustering those values reveals
the implicit scale that already exists, and **that clustered inventory is the typography strand's
input** — a decision over six to eight numbers with evidence attached, rather than over 400 sites or a
guessed floor.

---

## 2. Options

The question is no longer "how do we change the number". It is "what makes the desktop pass stop
needing a repair round per window size".

### A) Value change in place, architecture later

Change `min-[1400px]:` → `min-[1280px]:` and `1400px` → `1280px`, patch the overflows per screen,
leave the fixed lanes and the three shrink mechanisms as they are.

**Rejected by the owner**, and the inventory supports that: it is the smallest change that satisfies
today's acceptance criteria and it leaves every structural cause in place. The next target size
repeats the whole exercise.

### B) Named breakpoint only

`@theme { --breakpoint-dt: 1280px }`, JSX moves to `dt:`. Fixes the threshold's duplication and
nothing else. **Necessary but not sufficient** — it is R1 below, one third of the answer.

### C) Threshold as a CSS custom property

**Rejected.** Media queries cannot read custom properties. `@custom-media` is not Baseline, and a
PostCSS step would be new build infrastructure for one number.

### D) A third layout tier for 1280–1400

**Out of scope**, and rightly: a third tier triples the surface to verify and would introduce a second
visible jump at 1400.

### E) Global `zoom` to fit the 1400 layout into 1280

**Rejected as a strategy.** Both traps are already documented in this repository: `zoom` scales
`position: fixed` with it — which is why the hub zoom sits on `.hub-pair` / `.hub-foot` and not on
`.hub-root`, or the deck floor band would become a rectangle in the picture — and `zoom` breaks SVG and
canvas coordinates, described in `index.css` for the run details, where the building outline's frame
landed off by exactly the zoom factor. A global zoom walks into both at once. It also produces no 1280
layout, only a shrunken 1400 one, and shrinking is precisely what the readability decision rules out.

**Not rejected as a local remedy.** For a single screen that cannot be fitted any other way, `zoom`
stays legitimate — the hub does it today.

### F) Elastic lanes, floors, and in-panel scrolling — **recommended**

Detailed as R1–R3 in §3. It replaces the three shrink mechanisms with one policy, turns every fixed
pixel lane into a clamped elastic one, and makes in-panel scrolling the declared idiom rather than an
accident. It is the largest change here and the only one that ends the per-size repair cycle.

**Cost, stated plainly.** More work up front, and a diff that touches ratchet-guarded files more
broadly than A would. The owner has accepted that trade explicitly.

---

## 3. Recommended approach

### R1 · One threshold, one name

`@theme { --breakpoint-dt: 1280px }`; `dt:` in the JSX; `DESKTOP_MIN` reads the same value. The number
exists **once**.

The earlier objection to this — that renaming ~134 class names breaks the DOM fingerprint used as the
phone proof — is withdrawn, because a stronger proof is available. The rename is a mechanical codemod,
and it is verified by comparing the **compiled CSS before and after**. If the output is identical
except for the media-query value, the rename provably changed nothing. The phone comparison runs on
geometry rather than class names, so it stays valid alongside.

### R2 · Lanes are elastic, with a floor

Every fixed pixel lane becomes `clamp(floor, preferred, ceiling)`, with the floor derived from what
that lane must show legibly and written down beside it. After this there is no bare pixel number left
in a desktop grid. This resolves §1.5 rows 3–7 as a class.

### R3 · The frame yields before the text; what does not fit, scrolls

Padding, gaps and lane widths shrink first. Text does not shrink to make something fit. When the floor
is reached the panel scrolls internally, using the idiom already present **16 times** in `index.css`:

```css
min-height: 0; overflow-y: auto; overscroll-behavior: contain; padding-right: 6px;
```

The outer document never scrolls. Silent scrolling counts as a defect — the affordance must be
visible.

Under R3 the guide's `--gs` is removed outright: fixed desktop sizes plus a scroller. That deletes the
third shrink mechanism. `shotFactor()` and the hub `zoom` are reviewed against R3 in T2; neither is
assumed correct merely because it exists.

### 3.1 T1 commit sequence — the ordering is the method

| # | Commit | Threshold | Proof | Visible change |
| --- | --- | --- | --- | --- |
| 1 | Test anchors compute from `DESKTOP_MIN` instead of slicing on the literal | 1400 | suite green | none |
| 2 | **R1:** `--breakpoint-dt` in `@theme`, codemod JSX → `dt:`, `DESKTOP_MIN` reads it | **still 1400** | **compiled CSS byte-identical** | **none** |
| 3 | Flip the value 1400 → 1280 | 1280 | guard + sabotage check + phone proof at 390 px | everything, at once |
| 4 | Build the measurement probe and run it | 1280 | findings, DE and EN | none |

**Why commit 2 precedes commit 3 rather than joining it.** While the value is still 1400, the rename
of ~134 sites must be *provably* inert — byte-identical compiled CSS, or the codemod is wrong. The
question "did the rename break anything?" is therefore closed before the question "does 1280 break
anything?" is asked. Merged, every red test would have two possible causes and the answer would be a
guess.

**Why commit 1 comes first.** It is the only one that touches 20 test files while guaranteeing a green
suite. After it, every red test is a real signal.

### 3.2 The completeness guard

Computes rather than compares:

- no `1400` remains anywhere in `src/**` except a **named** exception list;
- every `min-width: N px` with N > 1000 in `index.css` is either `DESKTOP_MIN` or on the exception list
  — currently `{1750}`, the guide's large step;
- exactly one counter-edge exists, equal to `DESKTOP_MIN − 0.02`;
- no `min-[Npx]:` arbitrary variant survives at all after R1 — the named variant is the only route.

Then a **sabotage check**: reinstate one site at 1400 and demonstrate the guard fails.

### 3.3 The phone counter-proof

At 390 px, layout fingerprint on **geometry** plus pixel comparison, DE and EN, across hub, shop,
tree, level-up and stats. Expectation: 0 structural differences, 0.0000 % of pixels beyond the noise
threshold. Any deviation is a defect, not a tolerance.

---

## 4. Scope

**In scope**

- R1, R2, R3 as above, including removal of the guide's `--gs`.
- Threshold lowered at all four sites, proved by the guard in §3.2.
- Threshold-agnostic test anchors in the 20 affected test files.
- Prose carried forward: `index.css`, `App.jsx`, `src/i18n/de.js`, `src/i18n/en.js`, test headers. The
  log under `docs/decisions/` stays **unchanged** — historical record, not current text.
- The rationale block in `src/index.css` replaced (§0.1).
- Phone counter-proof at 390 px, DE and EN.
- The measurement script **committed**, reusable after every repair round, including the typography
  inventory described in §1.6.
- Measurement pass: 5 sizes × 2 languages × the full surface list, production build.
- Findings table sorted by damage, with a common-cause hypothesis where several screens agree.
- Repair as one architecture task (T2), not as rounds of patching.
- Gates: `npm test`, `npm run lint -- --max-warnings=0`, `npm run build`, `npm run gen:db`; plus the
  `VITE_PREVIEW=1` build, because `testViewport.js` and `TestViewportHarness.jsx` are preview-gated and
  CI builds both variants.

**Surfaces to measure**

Hub · shop (packs / challenges / effects) · upgrade tree (general + faction) · guide · glossary ·
stats · leaderboard (global + ranked) · run details · victory screen · options · perk choice · skill
choice · formation phase / board · architect · run dialogs (quit / restart).

**Sizes:** 1280×720 (anchor) · 1400×700 · 1536×791 · 1600×900 · 1920×1080. **Languages:** DE and EN.

**Per surface × size, record**

- whether the page scrolls, and by how many pixels;
- overflow beyond the panel edge, in pixels;
- truncated text (ellipsis / line-clamp), with its source location;
- elements outside their panel;
- every text node with a computed size smaller than the same node at 1920 (the regression rule);
- the typography inventory of §1.6, as raw data for the later strand.

**Explicitly out of scope**

- 2560×1440 as a target size. It remains a harness validation size only.
- A third layout tier.
- Any change to the phone layout.
- The height media queries 950 / 900 / 820 as such — `--gs` is removed because it shrinks *text*, not
  because it is height-bound.
- **Absolute text sizes and the named type scale.** Separate strand, §5. This workstream enforces only
  the regression rule.
- Repairing the level-up wings at 178 px inside T1 — documented there, decided in T3.
- A global `zoom` as a layout strategy.
- Introducing the `xl:` standard breakpoint.
- Unrelated cleanup in touched files.

---

## 5. Task split

**One writer, one worktree, sequential.** Practically every repair lands in `src/index.css` — one file
of ~5500 lines, additionally sliced position-dependently by 20 test files. Parallel writers would
produce conflicts there faster than they saved time.

| Task | Content | Depends on |
| --- | --- | --- |
| **T1 · Threshold, guard, survey** | The four commits of §3.1, the guard of §3.2, the phone proof of §3.3, and the measurement pass. No layout repairs. | — |
| **T2 · The architecture** | R2 and R3 across the desktop pass: elastic lanes, declared scrollers, `--gs` removed. Includes the hub decision and a review of `shotFactor()` and the hub `zoom` against R3. | T1 |
| **T3 · Level-up decision** | 178 px wings: leave as is, make the middle lane elastic under R2, or drop the wings below some width. A design question, not a repair. | T1 numbers; independent of T2 |
| **T4 · Acceptance and records** | Full pass against the criteria, phone proof, engineering-log entry, replacement of the §0.1 rationale. | T2, T3 |
| **S2 · Typography scale** *(separate strand)* | Name the roles, set their values, replace the 27 tuned literals. Driven by the clustered inventory from T1. | T2 — layout must be elastic first (§1.6) |

T2 and T3 are what the earlier revision split into two repair rounds. Merging them is the point: run
separately they would be exactly the "small fix now, large fix later" the owner rejected.

The only sensible parallelism is **independent review**: while T2 runs, Codex can review T1. That is
the role split `AGENTS.md` already prescribes.

---

## 6. Acceptance criteria

### 6.1 For T1

1. Commit 2 leaves the compiled CSS byte-identical apart from the media-query value — **shown, not
   asserted.**
2. The guard fails when a 1400 site is artificially reinstated — **demonstrated, not asserted.**
3. Phone at 390 px: 0 structural differences in the geometry fingerprint, 0.0000 % of pixels beyond
   the noise threshold, DE **and** EN.
4. The measurement script runs reproducibly from the repository and writes machine-readable evidence,
   including the typography inventory.
5. Findings cover 5 sizes × 2 languages × every listed surface. **What was not measured is named.**
6. All four gates green, plus the preview build.

### 6.2 For the workstream (T4)

At **1280×720 · 1600×900 · 1920×1080**, in **DE and EN**:

1. **No page scrolling:** `scrollHeight <= clientHeight` **and** `scrollWidth <= clientWidth` on every
   surface.
2. **No truncated text:** no element with `scrollWidth > clientWidth` carrying `text-overflow:
   ellipsis`, and no `line-clamp` in effect.
3. **No element outside its panel:** child boxes lie within the panel box, tolerance 0 px. *Panel* is
   defined as the nearest ancestor carrying `overflow: hidden`, an `as-panel*` class, or its own
   background — the definition is fixed in T1 so that every round measures the same thing.
4. **No text shrinkage:** no text node at 1280 has a smaller computed size than the same node at 1920.
5. **In-panel scrolling is declared, not accidental:** every panel that can overflow has an explicit
   scroll container using the R3 idiom, with a visible affordance.
6. **Phone bit-identical** at 390 px against the state before T1.
7. The level-up wings are a **named, justified exception** with the actual value recorded.

Criteria 1–5 are machine-checkable and therefore belong **in the measurement script**, not in a prose
checklist, so that every repair round is held to the same standard.

---

## 7. Risks and open questions

### 7.1 Risks, by damage

1. **The ratchet storm.** 27 anchors in 20 files react at once. Remedy: the commit sequence of §3.1.
   Get the ordering wrong and the rest of T1 is diagnostically blind.
2. **The codemod.** ~134 mechanical rewrites in ratchet-guarded files. Mitigated by the byte-identical
   CSS proof, which is stronger than any ratchet — but the codemod must be a script, not hand edits,
   or the proof means nothing.
3. **R2 floors are judgement calls.** Each lane's minimum comes from what it must show legibly, in the
   longer of the two languages. Derived from the T1 measurement, not chosen at the keyboard.
4. **The findings go stale during repair.** Every fix moves its neighbours. This is why the committed
   script is a load-bearing requirement of T1.
5. **DE/EN asymmetry.** Both languages doubles the matrix to roughly 170 cells. The report needs an
   aggregation that is not 170 rows: one row per surface with the **worst** value plus the language and
   size at which it occurred, full matrix in the JSON evidence.
6. **`#ecke` bands.** The 92 px lane is described in the source as computed for 1400–1920. Either
   recompute for 1280 or leave the band's lower bound at 1400 — one of the two, deliberately.
7. **Scrollbar cascade.** At 1280 a vertical scrollbar leaves 1272 px of client width, so a surface
   that overflows slightly in height can also overflow in width. Repairs address height before width.
8. **The preview gate.** A break that only appears under `VITE_PREVIEW=1` otherwise surfaces in CI.

### 7.2 Open questions

Resolved — recorded for the next reader:

- Anchor size: 1280 px window width.
- Scale of the fix: durable, in one go; the named breakpoint is in T1.
- Readability outranks not-scrolling; in-panel scrolling is the declared idiom.
- Text: regression rule now, named scale as strand S2.
- Guide `--gs`: removed.
- Document language: English for this directory.

Still open, answerable inside T1:

- **What counts as the surface "formation phase / board"?** The stage has several states (empty board,
  full board, trick in progress, announcement). T1 picks the states and says which it picked.
- **Does T3 change anything,** or are 178 px wings the permanent answer? T1 documents; the decision
  needs the measured numbers.
- **Do `shotFactor()` and the hub `zoom` survive R3?** Both shrink things to fit. Neither shrinks
  *text*, so neither violates the regression rule — but T2 should say why each stays, or remove it.

---

## 8. Recommended next step

Create `feature/viewport-1280` from `dev` in its own worktree, run `npm ci` there, and write the T1
task contract covering:

- the four commits of §3.1 in that order, with commit 2's byte-identical CSS proof as a hard gate;
- the guard and sabotage check of §3.2;
- the panel definition for criterion 3 (§6.2);
- the board states chosen for the "formation phase" surface;
- the measurement probe's output schema, including the typography inventory of §1.6;
- the replacement of the rationale block in `src/index.css` (§0.1) as an explicit deliverable.

T1 performs **no layout repairs.** That constraint survives from the original brief, not as a limit on
scope but as a sequencing rule: the survey has to describe the building before anyone moves a wall.
