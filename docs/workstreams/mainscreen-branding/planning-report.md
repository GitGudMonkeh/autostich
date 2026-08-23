# Mainscreen Branding — Planning Report

**Status:** planning only. No code changed, no branch created, no commit, no push.
**Base at time of analysis:** `feature/desktop-icons` @ `863febe5` — identical to `origin/dev` @
`863febe5`, working tree clean (*measured*).
**Tier:** B — feature workstream (`docs/engineering/task-lifecycle.md` — *Tier B — feature
workstream*), with one clause borrowed from Tier C (see §6.1).
**Owner decisions:** taken 2026-08-22, recorded in §8.1. Where this report and the future task
contract disagree, the contract wins.
**Revision:** second pass, 2026-08-22. The first pass assumed that "below 1400 px" means "phone".
`feature/viewport-1280` retires that assumption; §0.3, §1.3, §1.4, §5, §7, §8 and §9 were rewritten
accordingly. **Read §0.3 before anything else.**

Claims are marked where it matters: *measured* (read out of the tree), *inferred* (follows from the
code but was not executed), *proposed* (a design suggestion).

---

## Goal

Make the desktop mainscreen read as the product's own brand and feel premium:

1. present the wordmark more prominently,
2. introduce a tagline beneath it — "Legen. Stechen. Eskalieren." (DE) / "Order. Trick. Escalate."
   (EN),
3. create and place a new grid-logo element,
4. give the top-right status panel (Signature Deck) more weight.

Desktop only. Part of the larger desktop rework, following `feature/desktop-icons`.

Two reference images exist as **design direction only, never as a live state**: "Direction 01 —
Signature Deck" for the panel, and a second image from which **only the grid element** is relevant —
its wordmark, its tagline text ("Stack. Trick. Multiply.") and its layout are not target values.

---

## 0. Two corrections to the brief

### 0.1 There is no current tagline

*Measured.* `grep -rn "Assemble\|Adapt\|Ascend"` over `src/`, `test/`, `index.html`, `public/` and
`design/` returns nothing relevant. `src/i18n/de.js:1331` and `src/i18n/en.js:1291` go straight from
`start.logo.alt` to `start.progress.onboarding`. `src/ui/StartScreen.jsx:385` renders the
`<h1 class="as-wordmark">` and the next element is the bonus bar.

"Assemble. Adapt. Ascend." exists **only inside the Direction-01 mockup image**.

Consequence: item 2 is an **addition**, not a replacement. Nothing to rename, no CSV row to rewrite,
no guard to relax — but equally, **no vertical slot exists for it**, and the head zone is the
tightest part of the layout (§1.3).

### 0.2 The reference grid is 5 x 6, not 5 x 8

*Measured*, by cropping and enlarging the region from the second reference image: five columns, six
rows, 30 rounded-square outlines, three of them accented (r2c5, r3c2, r5c4). The brief specifies
5 x 8 (40 cells).

An earlier draft of this report speculated that 40 might encode the number of decks. **That is wrong
and has been withdrawn:** the game currently has **53 decks and 53 battlefields** (*measured* —
`Object.keys(DECK_DEFS).length` and `BATTLEFIELD_DEFS` in `src/game/cosmetics.js`). Several comments
in `src/index.css` still say "alle 40 Decks"; those comments are stale. The number 40 carries no
current meaning.

**Decision (owner, 2026-08-22): 5 x 6, as in the reference image.** It is the shape that was actually
seen and approved, it is near-square, and it therefore spends far less of the scarcest resource in
this layout — vertical space (§1.3).

### 0.3 "Below 1400 px" is no longer "phone" — and the smallest desktop is the most important one

*Measured*, on `feature/viewport-1280` (in independent review at `7341c11f`, not yet on `dev`):

- `DESKTOP_MIN` moves from **1400 to 1280** (`src/ui/useIsWide.js:21`, commit `c8af0f76`).
- The breakpoint is being **named rather than spelled out** (commit `1f43b101`). Writing a fresh
  `min-[1400px]` literal now would re-introduce exactly what that workstream is removing.
- Its stated goal: *"so that the itch.io browser embed (1280×720) shows the desktop build rather than
  the phone build"*, and its target sizes are **1280×720 · 1600×900 · 1920×1080** — all 16:9, with
  **2560×1440 explicitly out of scope**.
- The phone layout itself does not change. The band **1280–1399 px flips from phone to desktop.**

Two consequences, and both reshape this plan rather than annotate it:

**(a) The itch.io embed is not an edge case — it is the first, and for many visitors the only,
session.** That inverts the design order in §3: the head zone is composed **at 1280×720 first** and
allowed to grow upward, instead of being composed at 1920×1080 and then checked at 1280.

**(b) 1280×720 is the hardest size this workstream has, by a wide margin.** At 720 px height, *every*
short-desktop block fires (`max-height: 950 / 900 / 820`). *Measured on that branch:*
`@media (min-width: 1280px) and (max-height: 950px)` already tightens `.hub-play` from **22 px to
14 px** row gap and `.hub-pair` from 80 px to 56 px column gap — the layout is already spending
reserves there, before a tagline and a grid element are added.

**The non-goal in §5 is therefore restated in terms of the *phone layout*, never as a pixel
number.** Everything at or above `DESKTOP_MIN` — including the itch.io embed — is in scope.

---

## 1. Current state

### 1.1 Relevant files

| File | What lives there |
| --- | --- |
| `src/ui/StartScreen.jsx` (891 lines) | The whole hub. Wordmark `:385`; column brackets `hub-play` `:375` / `hub-stand` `:591`; status panel `:597`-`:700`; vector-mark data constants `:91`-`:140` |
| `src/index.css` | **All dimensioning.** `.as-wordmark` `:635`; `.hub-play .as-wordmark` (mobile) `:668`; `.as-wm-glow` `:688`; desktop block: `.hub-pair` `:1502`, `zoom` `:1534`, `.hub-play` `:1540`, `.as-glass` `:1553`, desktop wordmark `:1707`/`:1725`, desktop glow `:1729` |
| `src/i18n/de.js:1331`, `src/i18n/en.js:1291` | `start.logo.alt` — the localized wordmark |
| `src/App.jsx:1121` | Feeds the panel: `deckId`, `bfId`, `deckBack`, `lastRun`, `activeFx`, `musicTitle` |
| `src/App.jsx:1143`, `src/ui/UsernameModal.jsx:70` | Second and third `.as-wordmark` instances — **out of scope, but they share the class** |
| `docs/localization/strings_de_pixi_2026-08-15.csv` | Generated view of the catalogs, guarded by a ratchet |

### 1.2 Architecture facts that constrain the work

1. **There are no vector asset files.** *Measured* — `find src public -name "*.svg"` returns nothing.
   Every mark in the hub is inline JSX SVG built from **path-data constants** (`GLYPHS`,
   `CHIP_PATHS`, `CHIP_DOTS`, `src/ui/StartScreen.jsx:91`) rendered by small components (`TileGlyph`,
   `ChipIcon`). The comment above them records *why* it is data and not JSX: the i18n ratchet's
   `>...<` grabber reads a table of `<>...</>` fragments as hard-coded display text.

2. **The wordmark is text on purpose.** `src/ui/StartScreen.jsx:377` — `logo-wordmark.png` was
   dropped because a raster carries a **fixed palette**, and the desktop hub tints from the active
   deck. `design/brand/logo-source.png` is the only remaining brand raster and is referenced by
   nothing in the build.

3. **Deck-driven colour above `DESKTOP_MIN`.** `--deck-a1` / `--deck-a2` drive the wordmark gradient, its
   glow, the panel ring and the CTA. A new element with a fixed palette re-introduces exactly what
   the `#logo` decision removed.

4. **Desktop is one design scaled, not a fluid layout.**
   `.hub-pair, .hub-foot { zoom: clamp(0.85, tan(atan2(100vw, 1920px)), 1) }` (`src/index.css:1534`),
   pair width `min(1520px, 100%)`, grid `700fr 740fr`, column gap 80 px.

   **This is the answer to "prominence without breaking other resolutions": there is no independent
   1280 / 1600 / 1920 layout to break.** Width only changes the zoom factor. Getting it right at 1920
   and verifying the 0.85 floor at 1280 covers most of the risk. *Inferred, directly from the rule.*

5. **Height is the scarce axis.** *Measured* — the desktop pass carries
   `(min-width: DESKTOP_MIN) and (max-height: 950px | 900px | 820px)` blocks. The head zone already borrows
   space: `.hub-play .as-wordmark { --wm-size: 88px; margin-top: -70px }`. And `src/index.css:1717`
   records the measured ceiling verbatim: *"ab 98 px läuft die Marke in die Lücke zur Stand-Spalte"* —
   **roughly 10 px of headroom.** "More present" therefore cannot mean "just bigger".

6. **The phone boundary is a clean seam — except in one place.** The panel is desktop-gated at `:597`;
   the column brackets are `display: contents` below the threshold (`src/index.css:1379`). But
   `.as-wordmark` and `.hub-play .as-wordmark` have **base (phone) rules**. Editing those is how a
   "desktop-only" change leaks onto phones.

   **Scope the new rules to `DESKTOP_MIN`, never to a spelled-out pixel value** (§0.3). Line numbers
   and the exact utility spelling in this table are pre-`viewport-1280`; re-derive them against the
   merged tree rather than trusting them.

7. **Two skins.** `data-skin="crt"` is the **default** (`src/game/storage.js:540`); `"off"` is the
   plain look. Both need visual coverage.

### 1.3 The head-zone budget — the actual constraint

**The binding case is 1280×720, not 1920×1080** (§0.3). The 1920 figures below are context; the 1280
figures are the constraint.

|  | 1920×1080 | **1280×720** |
| --- | --- | --- |
| `zoom` factor | 1.0 | **0.85** (clamp floor) |
| `.hub-play` row gap | 22 px | **14 px** — already reduced on `feature/viewport-1280` |
| `.hub-pair` column gap | 80 px | **56 px** — likewise |
| Short-desktop blocks active | `max-height: 950` only | **all three** (950 / 900 / 820) |

Wordmark 88 px, pulled up 70 px. A tagline line costs roughly `font-size x line-height + gap`; the
grid element costs its own height + gap. That is **two new rows in a column that has already spent
its reserves at the size that matters most.** *Inferred, from the rules above.*

This is why §6.3 puts a measurement step first, and why that measurement is taken **at 1280×720
before any other size**. The composition is decided against numbers, not against a guess — and if the
numbers do not permit both a tagline and a grid element at 1280, that is a design decision to bring
back to the owner (§8.2, Q9), not a thing to solve by shrinking text below the readability floor that
`viewport-1280` establishes.

### 1.4 Dependencies

- **`feature/viewport-1280` — the blocking one.** In independent review at `7341c11f`; 105 files,
  ~42.5k insertions (*measured*). It moves `DESKTOP_MIN`, renames the breakpoint anchors, removes the
  guide's `--gs` scale step, permits frames to be resized, adds `test/viewport-1280.test.js`, and
  modifies `test/hub-panels.test.js`, `test/menu-desktop.test.js` and `test/i18n-guards.test.js` —
  **the same three guard files this workstream must touch.** Starting before it merges means
  rebuilding the work against a moved floor. Every line number and guard reference in §1.1 and §1.5
  is pre-merge and must be re-derived afterwards.
- `feature/desktop-icons` (Tier C) is live: `task/icons-asset-audit` @ `cc1d2a63`, two commits ahead
  of `dev`, touching `docs/art/**` and mapping tables — **not** `StartScreen.jsx` or `index.css`
  (*measured*). The stated sequencing is therefore a **priority call, not a merge hazard**, with one
  genuine benefit: that workstream fixes what "an icon" means in this repository, and the grid mark
  is a new one. Landing afterwards lets the grid cite that convention instead of inventing a parallel
  one.
- Preview ports: `5180` reserved for `scripts/viewport-proof.mjs`, `5181` recorded by
  `repository-hygiene-cleanup`, `5182` recorded by `icons-asset-audit`. See §6.4 for the allocation
  hazard.

### 1.5 Guards that will fire

| Guard | Protects | Action |
| --- | --- | --- |
| `test/i18n-guards.test.js:338` | `start.logo.alt` pinned literally to `AUTOSTICH` / `AUTOTRICK` | Keep the key. Any "wordmark as image" idea dies here — correctly |
| `test/i18n-guards.test.js:180` | EN text must differ from DE | New tagline keys pass |
| `test/i18n-guards.test.js:288` terminology table | `Stich(e\ | en)? -> trick` | "Stechen" does **not** match `\bStich(e\ | en)?\b` (*measured by reading the regex*) — the DE tagline passes |
| `test/i18n-guards.test.js:567` | Every catalog key must be reached by a literal `t("key")` | Keys must be wired, not staged |
| `test/loc-csv.test.js` | Generated CSV against the catalogs | Run `npm run loc:export`, commit the CSV |
| `test/hub-panels.test.js:207`-`:235` | `.as-kpi` container query, `--kpi-n`, the `min(27px, ...)` cap, the `text-[27px]` literal in JSX | **The panel restyle touches all four.** They are meaningful — they keep KPI values inside their cell. Update deliberately, never delete |
| `test/menu-desktop.test.js:86` | `un-wm as-wordmark select-none hidden` verbatim | Do not touch `UsernameModal.jsx` |
| `test/overlay-nesting.test.js` | Any new `fixed inset-0` | Design around it |
| `AGENTS.md` house rule | No new glyphs without asking | The owner has granted this **for the grid element only** |

---

## 2. Solution options

### 2.1 How the grid mark is built

| Option | Pros | Cons | Risks |
| --- | --- | --- | --- |
| **A1** Raster (WebP/PNG) | Any visual complexity; art-tool workflow | Fixed palette; would be the only brand raster in the build; DPR variants needed | Re-creates the exact failure that retired `logo-wordmark.png`; will not deck-tint |
| **A2** Standalone `.svg` file | Editable in an art tool; single source | **No `.svg` exists anywhere in `src/` or `public/`** — introduces a new import and bundling pattern; tinting relies on `currentColor` discipline the file cannot enforce | Precedent-setting, in a workstream that is not about asset pipelines |
| **A3** Inline SVG component from a data constant — **chosen** | Matches `GLYPHS` / `CHIP_PATHS` exactly, including the recorded i18n-ratchet reason; `currentColor` makes it deck-tintable for free; geometry and accent pattern are **one editable table**, so grid size and "which cells are accented" are a one-line change; the rationale comment lives next to the data | Geometry must be authored numerically rather than drawn | If it animates, it spends **glow budget** — see R3 |
| **A4** CSS grid of `<div>`s | No SVG at all | Not one tintable shape; geometry lands in the stylesheet, away from its rationale | Drifts from every other mark in the hub |

**Interaction with the localized wordmark.** The mark must be **language-independent and sized
intrinsically, not as a percentage of the wordmark's rendered width** — DE `AUTOSTICH` (10
characters) is wider than EN `AUTOTRICK` (9), and the mobile cap comment records that the German
string is the measuring stick. A percentage-sized mark would change size on language toggle.
*Chosen:* fixed intrinsic size, block-centred under the tagline.

### 2.2 Wordmark prominence

| Option | Pros | Cons | Risks |
| --- | --- | --- | --- |
| **B1** Raise `--wm-size` | One line | About 10 px of headroom before the measured collision at 98 px | Overshoot runs the mark into the gap to the right column — in German first |
| **B2** Frame it: tagline + grid + head-zone composition — **chosen** | This is what the reference actually does. The mockup wordmark is **not much larger**; it is *framed* (eyebrow above, tagline below, grid beneath). Prominence from composition costs no width | Costs vertical space (§1.3) | Head zone on short desktops — R1 |
| **B3** Re-typeset (weight / tracking / case) | Strongest identity lever | `.as-wordmark` is shared by **three** call sites including the run header; and it is the one element the `#typo` pass deliberately left untouched | Silently changes the run header and the username modal |

### 2.3 Panel prominence

| Option | Pros | Cons | Risks |
| --- | --- | --- | --- |
| **C1** Chrome only (heavier ring, glass, heading) | Cheapest; touches almost no ratchet | Will not read as the reference | No visible change for the owner |
| **C2** Reference-faithful, including "Build DNA" | Closest to Direction 01 | **"Build DNA" does not exist.** *Measured* — no formation/engine/element/effect summary is computed for the hub; `computeFormations` is run-scoped (`src/App.jsx:616`). The mockup's four chips are **placeholder values for data that would have to be invented** | A visual workstream quietly grows a game-data summary layer |
| **C3** C2 minus Build DNA — **chosen** | Named header, heavier deck art, the **existing** battlefield and FX lines restyled as the attribute chip row, KPI row retained and re-weighted. Delivers the reference's read using data that already flows into the component | Not pixel-identical to the mockup's chip row | Needs the four `as-kpi` guards updated with care |

**Layout safety for all three:** the panel sits inside `.hub-pair`, so it inherits the `zoom` and the
containing-block traps recorded at `src/index.css:1524` — no `position: fixed`, and
`backdrop-filter` only where `.as-glass` already puts it.

---

## 3. Recommended approach

**A3 + B2 + C3, composed smallest-first.**

**Design order is 1280x720 → 1600x900 → 1920x1080**, not the other way round (§0.3). The head zone
that survives 720 px of height will scale up comfortably; one composed at 1920 and then squeezed will
not, and 1280 is the size most visitors actually see.

- Grid mark as an **inline SVG component driven by a data table**, in **its own module** (*proposed:*
  `src/ui/BrandGrid.jsx`), so the head region and the panel region are not both edited at the top of
  `StartScreen.jsx`. `currentColor` throughout; colour comes from the deck variables at the call
  site.
- Tagline as **two new catalog keys**, wired with `t()`, in a desktop-only slot.
- Wordmark stays at 88 px; prominence comes from the composed head zone.
- Panel restructured around existing data, KPI row kept, its four guards updated deliberately with a
  counter-check each.

---

## 4. Scope

1. New i18n keys (*proposed:* `start.tagline`) in both catalogs, wired in `StartScreen.jsx`;
   `npm run loc:export` re-run and the regenerated CSV committed.
2. New grid mark: own module, data-driven geometry and accent pattern, `currentColor`, deck-tinted,
   **desktop-only**, with a comment recording the geometry, the accent rationale, and why it is data
   rather than JSX.
3. Head-zone recomposition **from `DESKTOP_MIN` upward**: wordmark + tagline + grid, inside the
   measured height budget, **composed at 1280x720 first** and verified at every short-desktop block.
4. Status panel restyle **from `DESKTOP_MIN` upward**: header treatment, deck-art weight, attribute
   row built from the existing `bfName` / `fxNames`, KPI row retained.
5. Guard updates for every ratchet the change legitimately invalidates, **each counter-checked** by
   deliberately breaking the protected seam and proving the guard goes red
   (`docs/engineering/testing.md`).
6. Full V1-V4 visual review per §7.
7. All four gates plus `npm run loc:export`, plus **both build variants** (ordinary and
   `VITE_PREVIEW=1`).
8. Small owner-initiated changes raised while the work is in front of the owner, admitted through the
   scope annex — §9. This is part of the agreed scope, not an exception to it.

---

## 5. Non-goals

- **No change to the phone layout** — that is, below `DESKTOP_MIN`, **not** "below 1400 px" (§0.3).
  Explicitly including the base `.as-wordmark` and `.hub-play .as-wordmark` rules. Consequence,
  accepted by the owner: phone players do not see the new tagline. A later pass may add it; this one
  does not.
- **The 1280–1399 band is expressly in scope**, because after `viewport-1280` it is desktop and it is
  where the itch.io embed lives. Anything that reads "mobile" in an older note must be re-read as
  "phone".
- **No product-name change** — `start.logo.alt` keeps its pinned DE/EN values. Visual presentation
  only.
- **No "Build DNA" derived data** — named follow-up (§6.5), not silently dropped.
- No change to the run-header (`src/App.jsx:1143`) or username-modal (`src/ui/UsernameModal.jsx:70`)
  wordmark instances.
- No deck-palette or `--deck-a1` / `--deck-a2` changes; no Pixi or FX-layer work.
- No new raster brand assets; `design/brand/logo-source.png` stays unreferenced.
- No replacing the text wordmark with an image.
- No unrelated cleanup in `StartScreen.jsx` or `index.css`.

---

## 6. Tier, branch structure and worker split

### 6.1 Tier B, with one Tier C clause

Tier C was considered and rejected. Its distinguishing marker — a new layout or architecture **across
several screens** — does not apply: this is one screen, two regions, and the grid mark follows the
existing inline-SVG pattern rather than introducing a new seam. `task-lifecycle.md` §2 is explicit:
*"When in doubt, pick the lower tier and escalate."*

Tier B already requires everything this work needs: a planning report **with rejected options** (this
document), a full task contract, a workstream directory, full-scope visual review when pixels move,
and independent review.

**One Tier C clause is adopted deliberately and must be written into the task contract:** V1-V4 is
**repeated per design iteration**, not run once. Branding work iterates; that is the single point at
which Tier B would otherwise be too thin.

### 6.2 Branch structure

```text
origin/dev  ->  feature/mainscreen-branding  ->  dev
```

Single-level. No feature integration branch, because there is only one task.

| Value | Derived by `/create-task` (Tier B) |
| --- | --- |
| Branch | `feature/mainscreen-branding` |
| Base | `origin/dev` (default) |
| Worktree | `<repo-parent>/Autostich-worktrees/mainscreen-branding` |
| Contract | `docs/workstreams/mainscreen-branding/task-contract.md` |

The branch is created by the command itself; Tier B needs no pre-established integration base.

Invocation, once §8.1 Q8 is satisfied:

```text
/create-task mainscreen-branding B --pixels
```

### 6.3 Worker split: one worker, three sequenced commits

A split into "head" and "panel" workers was considered and rejected: both touch `StartScreen.jsx`
**and** `index.css`, so two worktrees would force an `index.css` merge in a file whose comments are
load-bearing. That is a poor trade for a moderate surface.

| Step | Work | Blocked by |
| --- | --- | --- |
| **C1** | Measure the head-zone height budget at the four viewports, before any pixel moves. Doubles as the V1 baseline | nothing |
| **C2** | Tagline keys + grid mark module + head composition | C1 |
| **C3** | Panel restyle | C2 (shared files only) |

If the measured budget is tight, the **grid element shrinks, not the wordmark** — the wordmark's size
is already at its measured ceiling.

### 6.4 Port allocation hazard

*Measured.* `/create-task` step 8 allocates the lowest free port from 5181 upward, taken from the
reserved table plus `grep -rn "Preview port" docs/workstreams`. Run from the cockpit, that grep sees
only **5180** and **5181** — the **5182** of the running `icons-asset-audit` lives in a contract on
`feature/desktop-icons` and is invisible here. The command will therefore **propose 5182 and
collide**.

Not silently: `--strictPort` makes the dev server fail loudly. But avoidable — take **5183**, or run
the command only after the icons contract has landed on `dev`.

### 6.5 Named follow-up, deliberately not created

`mainscreen-build-dna` — Tier B. The four attribute chips from Direction 01 require new derived deck
data (§2.3, C2). It gets its own contract if and when the owner asks for it.

---

## 7. Acceptance criteria

**Visual — the full V1-V4 protocol** (`docs/engineering/task-lifecycle.md` §8), repeated per design
iteration:

1. V1 baseline captured **before the first pixel moves**; V2 at matching sizes, DPR and application
   state.
2. Capture matrix: the three 16:9 layout tiers **1280x720, 1600x900, 1920x1080** x **{crt, off}** x
   **{DE, EN}**, on at least one dark and one bright battlefield. 2560x1440 is a *validation* size
   only, per `src/ui/testViewport.js` and `viewport-1280` §Goal — capture it once, do not tune to it.
   **1280x720 is reviewed first and is the size that can fail the task**, because it is the itch.io
   embed (§0.3).
3. **Uniform look across all of them:** wordmark, tagline and grid stay optically aligned and
   proportional at every zoom step; the German wordmark never touches the right column at any size;
   the head zone neither clips nor scrolls at 1280x720, where all three short-desktop blocks fire.
   The outer document never scrolls — `viewport-1280` acceptance criterion 1, which this work must not
   break.
3a. **No text on the mainscreen is smaller at 1280 than the same text at 1920** — `viewport-1280`'s
   regression rule. A tagline or grid label shrunk to buy head-zone room violates it.
4. V3 is a **human** gate. An agent may capture, diff and attribute — it may not report the visual
   result as approved.
5. V4: every finding gets an ID and exactly one classification row.
6. **Mobile proved unchanged**, not asserted: captures at 1399 px and at a phone width show V1
   identical to V2.

**Automated and procedural:**

7. `npm test`, `npm run lint -- --max-warnings=0`, `npm run build`, `npm run gen:db` — bare commands,
   unpiped, all green.
8. `npm run loc:export` run; CSV regenerated and committed; `test/loc-csv.test.js` green.
9. Both build variants succeed: ordinary and `VITE_PREVIEW=1`.
10. Every touched guard is **counter-checked** — break the seam, prove it goes red, restore. Recorded
    in the evidence package.
11. No guard weakened or deleted to reach green; each guard change carries a written justification.
12. New catalog keys reached by a literal `t()`; both brand guards still green.
13. Evidence package and review handoff, following the `icons-asset-audit` precedent.
14. Every scope-annex item (§9) recorded **before** it is implemented, and covered by the gates and by
    the visual captures for the viewports it affects.

---

## 8. Decisions, open questions and risks

### 8.1 Decisions taken by the owner, 2026-08-22

| # | Question | Decision |
| --- | --- | --- |
| Q1 | Grid geometry — 5 x 8 or the reference's 5 x 6 | **5 x 6.** The shape actually reviewed and approved; near-square, so it spends far less vertical space. The "40 cells" reading carried no meaning (§0.2) |
| Q2 | Grid placement | **Centred beneath the tagline, small.** Wordmark, tagline and mark then read as one lockup — which is what produces the premium impression. Beside the wordmark it competes; inside the panel it becomes a UI icon and loses its brand function |
| Q3 | Exact EN tagline | **"Order. Trick. Escalate."** — with the closing period, matching the German rhythm and the reference's own tagline. "Order" is kept deliberately: it is already the approved English term for the game's order phase, and "Trick" is already the approved English term for "Stich". The tagline therefore uses established in-game vocabulary rather than new synonyms |
| Q4 | Build DNA | **Out of scope** for this workstream (§6.5) |
| Q5 | Tagline on phones | **No — phones only.** Revised in the second pass: the original wording said "not below 1400 px", which after `viewport-1280` would have excluded the itch.io embed. The tagline **does** appear from `DESKTOP_MIN` upward, including 1280x720. It does not appear in the phone layout (§5) |
| Q6 | Wordmark size | **Stays at 88 px.** The measured collision point is 98 px; presence comes from composition |
| Q7 | CRT skin | **Identical in both skins.** The mark takes its colour from the active deck like everything else; a skin-specific variant would be a second thing to maintain for no gain |
| Q8 | Sequencing | **Start after both `feature/viewport-1280` and `feature/desktop-icons` have landed on `dev`.** `viewport-1280` is the blocking one (§1.4): it moves the breakpoint this work scopes against and edits the same three guard files |
| R3 | Glow | **Only the three accented grid cells glow.** The `#ruhe` rule — only the primary CTA glows — exists so the eye knows where to go. Three tiny cells read as texture, not as a second target. The panel does **not** gain a glow, unlike the reference image |

### 8.2 Remaining open question

- **Q1a** — if 5 x 8 was deliberate and carries a meaning not stated in the brief, that overrides
  §8.1 Q1. Raise it before C2 starts; afterwards it is a re-composition, not a parameter change.
- **Q9 — what gives way if 1280x720 cannot hold both.** *Open, and it is the one most likely to
  bite.* If C1's measurement shows the head zone at 1280x720 cannot carry wordmark + tagline + grid
  without clipping, the options are: drop the grid at 1280 only and show it from 1600 up; place the
  grid beside the wordmark instead of beneath it at 1280; or reduce the wordmark below 88 px at 1280
  only. **Shrinking the tagline is not an option** — acceptance criterion 3a forbids it. This is an
  owner decision and must not be resolved by a worker at implementation time.

### 8.3 Risks

| # | Risk | Mitigation |
| --- | --- | --- |
| **R1** | **Head-zone height at 1280x720 — the top risk of this workstream.** All three short-desktop blocks fire there, `.hub-play` has already been cut from 22 px to 14 px, and this is the itch.io embed, i.e. the most-seen size (§0.3, §1.3) | C1 measures **at 1280x720 first**, before any other size and before any pixel moves. If it does not fit, that is Q9 — an owner decision, not a worker's silent trade-off |
| **R1b** | `viewport-1280` is still in review and may move again before it merges | Re-derive every line number, guard reference and gap value against the merged tree (§1.4). Do not start C2 on pre-merge numbers |
| **R2** | Ratchet churn — four `as-kpi` guards plus whatever the head restructure invalidates | Update deliberately with counter-checks; never relax a guard to reach green |
| **R3** | Glow budget | Resolved — see §8.1 |
| **R4** | Deck tint against the mockup's fixed violet. The reference was rendered with one deck; the mark must survive all 53 | Deck-tinted from the start; visual review on a dark **and** a bright battlefield |
| **R5** | Scope creep into Build DNA | Explicit non-goal (§5) with a named follow-up (§6.5) |
| **R6** | `zoom` traps — a new element using `position: fixed` or a stray `backdrop-filter` inside `.hub-pair` hits the containing-block problems documented at `src/index.css:1524` | No `fixed` in the head zone; blur only where `.as-glass` already puts it |
| **R7** | Language regression — a size tuned on English clips in German | Tune in German; verify in both |

---

## 9. Scope annex — owner changes during the work

The owner will notice small things while the screen is in front of them, and wants them fixed in the
same session rather than each becoming its own task and its own worker. That is legitimate and
expected for design work of this kind.

An unbounded contract, however, stops being a contract: a reviewer can no longer tell what was
agreed, and the task has no condition under which it ends. So the answer is not a loosely written
scope — it is an **explicit, recorded channel** with a boundary anyone can apply.

**This section must be carried into the task contract verbatim.**

### 9.1 The admission test

> **If it can be pointed at on the desktop mainscreen, it goes into the annex.
> If showing it means switching to another screen, it becomes its own task.**

Deliberately a test the owner can apply *by looking*, not one that requires reading code.

Three limits sit above it and do not bend:

1. **Nothing in the phone layout** — below `DESKTOP_MIN`, not "below 1400 px" (§0.3). The **entire
   desktop range including 1280x720 is admissible**, and an annex item raised while looking at the
   itch.io embed is as in-scope as one raised at 1920. What stays absolute is the phone non-goal:
   that is where a "small change" turns into a second layout pass.
   Corollary: an annex item accepted at one desktop size must be **re-checked at 1280x720** before it
   counts as done. That size is the constraint, and it is where a change that looked free at 1920 will
   fail.
2. **No guard weakened** to accommodate it (`AGENTS.md` — *House rules*). If an annex item legitimately
   invalidates a ratchet, it is updated and counter-checked like any other change (§4.5).
3. **No decision from §8.1 reversed.** That is a re-decision: it amends this plan and is recorded
   here, not slipped in as an annex line.

Everything else on the desktop mainscreen is admissible without further ceremony.

### 9.2 How an item is recorded

The task contract carries a running table. **The entry is written before the change is implemented**,
applying `docs/engineering/task-lifecycle.md` §8 — *A finding is not a finding until it has an ID*:

| ID | Date | Request, verbatim | File surface | Disposition |
| --- | --- | --- | --- | --- |
| A-01 |  |  |  | implemented / declined / escalated to its own task |

**Verbatim**, because a paraphrased request is a second design decision that nobody made.

### 9.3 What it costs, and why that is low here

Each annex item re-runs the gates and the visual captures for the viewports it affects. That is cheap
in this task specifically, because §6.1 already commits to repeating V1-V4 per design iteration — the
flexibility the owner is asking for is largely paid for by a clause the plan already contains.

### 9.4 When to stop adding and start splitting

Not a line count — two signals:

- an annex item needs a file outside the desktop mainscreen surface → its own task, no discussion;
- the annex has grown to where the review handoff can no longer be read in one sitting → the task is
  doing two things. Close it, open the next one.

### 9.5 What the reviewer gets

The annex table travels into the evidence package and the review handoff (§4.6, §7.13). **A reviewer
must never encounter an agreed change as unexplained diff** — that is the failure mode this section
exists to prevent, and it is the reason the annex is a table rather than a permission.

---

## Appendix — reproduce the measurements

```bash
# No current tagline anywhere in the tree
grep -rn "Assemble\|Adapt\|Ascend" src/ test/ index.html public/ design/

# Head-zone dimensioning, the zoom rule and the column pair
grep -n "as-wordmark\|zoom\|hub-pair\|hub-play" src/index.css

# No vector assets exist
find src public -name "*.svg"

# Deck and battlefield counts (the "40" in the CSS comments is stale)
node -e "import('./src/game/cosmetics.js').then(m=>console.log(Object.keys(m.DECK_DEFS).length))"

# State of the predecessor workstream
git log --oneline -3 task/icons-asset-audit
```
