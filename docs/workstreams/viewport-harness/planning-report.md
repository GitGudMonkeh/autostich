# Desktop Viewport Harness (#400) — Planning Report

**Status:** planning only. No code changed, no branch created, no commit, no push.
**Base:** `dev` at `dd36c3ef`, working tree clean at the time of analysis.
**Scope under review:** a preview-only tool that simulates fixed desktop viewport sizes reproducibly.
Not a new layout, not scaling, not Steam wrapper work.

Claims below are marked where it matters: *measured* (read out of the current tree),
*inferred* (follows from the code but not executed), *proposed* (a design suggestion).

---

## 1. Current architecture

### 1.1 Where the desktop layout is dimensioned

Layout lives in `src/index.css`, not in components. It is dimensioned from **three** sources, and all
three read the **real browser viewport**:

**a) Width media queries.** The whole desktop pass hangs off `@media (min-width: 1400px)`.
The breakpoint is mirrored in JS as `DESKTOP_MIN` in
[useIsWide.js](/C:/Code/Autostich/src/ui/useIsWide.js), with a comment stating the two must move
together.

**b) Height and width *combination* queries.** This is the part that is easy to miss and decisive for
the technical choice. Measured on `dev`:

| Query | What it tunes |
| --- | --- |
| `(min-width: 1400px) and (max-height: 950px)` | Upgrade tree, stats/leaderboard/gameover, options card, hub rhythm, guide — five separate blocks |
| `(min-width: 1400px) and (max-height: 820px)` | Guide scale step `--gs: .82` |
| `(min-width: 1400px) and (max-height: 900px)` | `--rn-chrome: 380px` |
| `(min-width: 1400px) and (max-width: 1920px)` | `--as-corner-lane` for six screen heads |
| `(min-width: 1400px) and (max-width: 1760px)` | `--as-corner-lane` for the options head |
| `(min-width: 1750px) and (min-height: 1000px)` | Guide scale step `--gs: 1.2` |
| `(max-width: 1399.98px)` | The mobile-side counterpart |

The rationale comments name concrete devices — "1920×1200 laptop at 125 % = CSS 1536×791",
"1080p at 125 % = 864 px height". The layout is *deliberately* height-sensitive. A harness that
simulates width but not height would miss most of these blocks.

**c) Viewport-unit calc chains.** In `.rn-shell` (the run screen shell):

```css
--rn-w:  min(1600px, calc(100vw - 80px));
--bf-w:  min(var(--rn-w), calc((100dvh - var(--rn-chrome)) * 2.5));
--bf-h:  calc(var(--bf-w) / 2.5);
--card-s: calc(var(--bf-w) * 0.11 / 104 / 1px);
--bf-gap: calc(var(--bf-w) * 0.0325);
--bf-deckgap: calc(var(--bf-w) * 0.01);
```

Everything on the run screen — stage width, card scale, both card gaps, and (per
`test/buehne-desktop.test.js`) the card flight distance — derives from `100vw` and `100dvh`.
Also `.app-root { min-height: 100dvh }`, `.overlay-root { height: 100dvh }`, and
`.hub-pair, .hub-foot { zoom: clamp(0.85, tan(atan2(100vw, 1920px)), 1) }`.

Reproduce the survey:

```bash
grep -n "@media" src/index.css
grep -n "100vw\|100dvh\|100vh" src/index.css
```

### 1.2 Which components know the window size

| File | What it reads | Notes |
| --- | --- | --- |
| [useIsWide.js](/C:/Code/Autostich/src/ui/useIsWide.js) | `matchMedia("(min-width: 1400px)")` | `useMediaQuery` is the shared helper; used where the **DOM structure** differs, not just the arrangement |
| [CustomizeScreen.jsx:485](/C:/Code/Autostich/src/ui/CustomizeScreen.jsx) | `matchMedia("(max-width: 640px)")` | local `useIsMobile` |
| [mobileTier.js](/C:/Code/Autostich/src/ui/fx/mobileTier.js) | `matchMedia("(pointer: coarse)")` | evaluated **once** and cached — a mid-session change is explicitly not a supported case |
| [storage.js:660](/C:/Code/Autostich/src/game/storage.js) | `matchMedia("(pointer: coarse)")` | device default for `reducedFx` |
| [PerfOverlay.jsx](/C:/Code/Autostich/src/ui/PerfOverlay.jsx) | `innerWidth`/`innerHeight`/`devicePixelRatio` | see §2 — already a viewport readout |
| [telemetry.js:87](/C:/Code/Autostich/src/game/telemetry.js) | `innerWidth`/`innerHeight` | goes into the client-info payload |
| [feedbackContext.js:55](/C:/Code/Autostich/src/ui/feedbackContext.js) | `innerWidth`/`innerHeight` | report context string |
| [CardFxStage.jsx:181](/C:/Code/Autostich/src/ui/fx/CardFxStage.jsx) | `innerWidth`/`innerHeight` | normalises pointer position for the tilt |

**Everything else measures its own element, not the window.** The field compositor and the Pixi
stage both use Pixi's `resizeTo: host` and render into `position: absolute; inset: 0` hosts;
`CardGrid`, `ArchitectScreen` and the customize preview board use `ResizeObserver` on their frame.
This is the good news: the FX layer follows whatever the DOM does and needs no harness awareness.

### 1.3 Overlay portals

One rule, one helper: [overlayPortal.jsx](/C:/Code/Autostich/src/ui/overlayPortal.jsx) —
`createPortal(node, document.body)`, with an SSR branch that returns the node unchanged so
`renderToStaticMarkup` still works in tests.

The reason is recorded in the file and re-stated in the guard: `backdrop-filter` (and equally
`filter`, `transform`, `perspective`, `contain`, `will-change`) makes an element the **containing
block** for `position: fixed` descendants. Measured in the repo's history: with `scrollTop 600`, an
overlay rendered inside such an ancestor sat at `top = −600px`.

[test/overlay-nesting.test.js](/C:/Code/Autostich/test/overlay-nesting.test.js) enforces it:

- every class literal containing `fixed inset-0` anywhere in `src/**/*.jsx` must have
  `overlayPortal(` or `createPortal(` within the preceding 260 characters;
- exactly two documented exceptions must still exist (an orphaned exception is also a failure);
- no file except the helper may call `createPortal` directly;
- a self-check that the grabber finds enough sites at all.

**Consequence for #400:** any new full-screen element written as `fixed inset-0` is caught by this
guard. Design around it rather than adding a third exception.

---

## 2. Existing preview infrastructure

### 2.1 The gate

`import.meta.env.VITE_PREVIEW === "1"`, set by `ci.yml`, `deploy-test.yml` and `deploy-pixi.yml`,
**never** by `deploy.yml` (main). Vite substitutes the value at build time, so in a main build the
expression becomes `undefined === "1"` and the branch is dead code the minifier removes. *Inferred* —
there is currently no guard that proves the removal on the built artefact (see §6.1).

Current preview-only surfaces, all in [App.jsx](/C:/Code/Autostich/src/App.jsx): the ENV badge, the
`PerfOverlay` mount, the game-over perf dump, `onSecretSeed`, `onDevRun`. Plus namespace separation
in `storage.js` (`preview_` prefix), `telemetry.js` (dev table) and `leaderboard.js` (no writes).

### 2.2 The FPS counter — the precedent to copy

The `perfHud` switch is exactly the shape #400 asks for, and it is worth copying line for line:

- The row lives in [OptionsModal.jsx](/C:/Code/Autostich/src/ui/OptionsModal.jsx) inside the
  **graphics** section, wrapped in `{import.meta.env.VITE_PREVIEW === "1" && ( … )}`.
- `perfHud` is **not** in `DEFAULT_OPTIONS`. It only ever exists in a saved profile;
  `undefined` is falsy, so "off" needs no default. A preview-only key therefore adds nothing to the
  production option surface. *Measured* — `grep -n perfHud src/game/storage.js` returns nothing.
- Its i18n keys exist in **both** catalogs regardless of build (catalogs are not gated), and the
  description says "Test branch only".
- The consumer is gated a second time at the mount site in `App.jsx`.

Under Vitest, `import.meta.env.VITE_PREVIEW` is unset, so preview rows do not render — which is why
`test/options-sections.test.js` can render the options overlay with `renderToStaticMarkup` and count
exactly four sections without knowing about `perfHud`. A new preview-only row inherits that property.

### 2.3 PerfOverlay already contains half of #400

This is the most useful finding of the analysis. `PerfOverlay.jsx` already carries a **viewport
readout**, written for exactly this problem:

```js
const VIEWPORT_MARKS = [1920, 1536, 1280];
```

It shows `w×h` (green when the width hits a mark of the target band), plus DPR — and its comment
states why the developer window is unusable as a reference: on a scaled or ultrawide monitor it
differs strongly from what a standard player sees. It listens on **two** sources deliberately:
`window.resize` for real window drags and pure DPR changes, and a `ResizeObserver` on
`document.documentElement` because **DevTools device emulation and a CDP-set viewport do not fire a
`resize` event on `window`**.

Two conclusions follow:

1. #400 does not need to build a readout. Whatever renders the app at a virtual size should render
   `PerfOverlay` *inside* that virtual viewport, and the existing readout becomes the harness's own
   proof of what it is showing.
2. Someone has already anticipated a CDP-driven viewport as a working mode. See option E in §3.

---

## 3. Technical options

### A) CSS / container-based virtual viewport (fixed-size stage box)

Put the stage in a `width: 1280px; height: 720px; overflow: hidden` container.

**This does not work as specified, and its failure mode is dangerous.** CSS media queries and `vw` /
`vh` / `dvh` are scoped to the **viewport**, never to a container. Inside a 1280×720 box on a
2560×1440 window, the app would still evaluate:

- `min-width: 1400px` → **true** (should be false at 1280);
- `max-height: 950px` → **false** (should be true at 720);
- `--rn-w` = `min(1600px, 2560px − 80px)` = **1600px** (should be ~1200px);
- `--bf-w` from `100dvh` = **1440px**, not 720px;
- `.hub-pair` zoom factor from `100vw` = 2560, i.e. **1.0** instead of the 0.85 floor.

The result is not "the app at 1280×720". It is "the 2560-wide desktop layout, clipped to a
1280×720 window". It would look plausible and be wrong — and it would then be used to make design
decisions, which is the worst possible outcome for a tool whose entire purpose is to be trusted.

Making it faithful means migrating every `min-width`/`max-height` block to container queries and
replacing the `100vw`/`100dvh` chains with `--vw`/`--vh` custom properties fed from JS. That is the
layout rewrite the issue explicitly excludes, and it would touch every desktop ratchet
(`buehne-desktop`, `screens-desktop`, `menu-desktop`, `desktop-perf`) at once.

- Overlays: unaffected in principle, but the container would need `overflow: hidden`, and if anyone
  later adds `contain` or `transform` to it, every portal-less `fixed` element inside breaks.
- Pixi/FX: fine — they size from their host.
- Ratchets: severe. Effectively a rewrite of the desktop CSS.

**Verdict: reject.**

### B) Preview wrapper with `transform: scale()` or `zoom`

`transform` is excluded by the issue, and the repository has three separate records of why:
`overlayPortal.jsx`, `overlay-nesting.test.js`, and the `#perf-C` block in `index.css`. A transformed
ancestor becomes the containing block for `position: fixed`.

`zoom` deserves a moment because the codebase **already uses it** (`.hub-pair, .hub-foot`), so it
looks like a sanctioned tool. It is not, at root level — and the reasons are already measured in the
tree:

- `index.css`, hub block, note 1: *"`zoom` sits on the two layout containers, NOT on `.hub-root`.
  `zoom` scales the entire coordinate system below it — including `position: fixed`."* Applying it at
  the root is explicitly called out as the thing that breaks the deck floor band.
- `index.css` around the run-detail board: `getBoundingClientRect()` returns **zoom-scaled** values
  while an SVG is drawn in the **unscaled** system — measured as a frame offset of exactly the zoom
  factor. Every FX layer in `src/ui/fx/` places itself from `getBoundingClientRect()`.

And neither variant fixes the core problem: media queries and `vw`/`dvh` still read the real window.
Same falseness as option A, plus broken overlays and broken FX placement.

**Verdict: reject.**

### C) Canvas / Pixi-based approach

A category error for this issue. The thing under test is DOM and CSS layout; Pixi renders into
`position: absolute; inset: 0` hosts sized by `resizeTo: host` and would simply follow the DOM. There
is no mechanism here to simulate a media query. Nothing to build.

**Verdict: reject.**

### D) Same-origin iframe harness — **recommended for the in-app switch**

Render the app inside an `<iframe>` whose content box is exactly 1280×720 (etc.). An iframe's content
box **is a viewport**. Inside it, natively and with no application change:

- media queries — including every `max-height` block — evaluate against the virtual size;
- `100vw` / `100dvh` / `svh` / `lvh` resolve to the virtual size;
- `matchMedia` and therefore `useIsWide` / `DESKTOP_MIN` behave correctly;
- `document.body` — the portal target — **is** the virtual viewport's body, untransformed and
  unfiltered;
- `ResizeObserver`, `visualViewport`, `env(safe-area-inset-*)` and Pixi's `resizeTo: host` all follow;
- `PerfOverlay`, rendering inside the frame, reports the virtual size (§2.3).

The rules from the issue are satisfied structurally rather than by discipline: the lock is on the
frame, not on the app; `document.body` and the portals are never touched; overlays get the same
virtual size because they live in the same virtual viewport; and "off" is literally today's code path
with no wrapper element at all.

**Costs and consequences to accept** (*inferred* unless marked):

1. **The switch requires a reload of the top document.** The option is persisted in `localStorage`,
   which both documents share (same origin), so the state survives. A cold boot is arguably *more*
   reproducible than a live resize.
2. **The frame is real pixels.** 2560×1440 does not fit on a 1920 monitor. First scope should let the
   outer page scroll rather than scale — a scaled frame produces resampled screenshots and stops
   being pixel-exact. This is a real limitation and belongs in the success criteria, not hidden.
3. **`useBackGuard` pushes a history entry inside the frame.** Iframe navigation joins the top-level
   session history, so browser-Back behaves differently in the harness. Preview-only; must be named.
4. **DPR is not simulated.** The harness fixes CSS pixels, not device pixels. `dprCap` in the field
   compositor and the `--num-scale` interaction still follow the host monitor. `PerfOverlay` already
   displays DPR next to the size, which is exactly why it must render inside the frame.
5. Service-worker registration (PROD builds only, which includes the preview deploys) and audio
   autoplay gating both need a look from inside a frame. Neither is expected to be a blocker — audio
   is already behind a user interaction — but neither has been verified.
6. Telemetry and feedback reports would carry the virtual viewport. In preview builds telemetry goes
   to the dev table anyway, and arguably that is the correct value to record.

**Verdict: recommended.** It is the only in-app approach that produces a *true* picture.

### E) Browser-driven viewport (CDP / Playwright) — **recommended as the complement**

Set a real viewport with a controlled `deviceScaleFactor` from outside the browser window. The render
is then independent of the developer's monitor, window chrome and OS scaling — which is what actually
makes screenshots comparable **between agents and between sessions**, the stated motivation for the
issue.

- Zero application code, zero production risk, zero ratchet risk.
- `PerfOverlay` already handles this mode explicitly (§2.3).
- The local cockpit already has browser tooling available; a checked-in script would make it
  reproducible rather than ad-hoc.
- It does **not** replace option D: a script cannot replace a developer clicking through the UI at
  1280×720, and the issue asks for an in-app switch.

**Verdict: recommended alongside D.** If only one could be built, E delivers more of the stated
goals (reproducible screenshots, visual review, agent comparison) for a fraction of the risk — but
the issue as written asks for D, and D is what a human needs to *use* the layout.

---

## 4. Recommended approach

**Build D as the #400 deliverable, and E as a second, sequential task in the same workstream.**
D gives a reproducible *layout*; E gives a reproducible *screenshot*. Neither alone covers the
motivation in the issue.

### 4.1 Shape of D

**Option key** — `testViewport`, values `null | "1280x720" | "1600x900" | "1920x1080" | "2560x1440"`.
Not added to `DEFAULT_OPTIONS`, following the `perfHud` precedent: absent means off, and the
production option surface gains nothing.

**Shared size table** — a new React-free module, e.g. `src/ui/testViewport.js`:

```js
export const TEST_VIEWPORTS = [
  { id: "1280x720",  w: 1280, h: 720  },
  { id: "1600x900",  w: 1600, h: 900  },
  { id: "1920x1080", w: 1920, h: 1080 },
  { id: "2560x1440", w: 2560, h: 1440 },
];
```

React-free on purpose: `docs/engineering/testing.md` §4 asks guards to **recompute** rather than
transcribe, and `architecture.md` §2 names this extraction pattern (`previewScale.js`,
`mobileTier.js`, `packSort.js`) as a deliberate architectural decision in service of it. The guard
then derives the expected frame size from this table instead of typing `1280` a second time.

**Options row** — extend the *existing* `{import.meta.env.VITE_PREVIEW === "1" && ( … )}` block in
the graphics section to hold both rows, so there is **one** gate rather than two. Use the existing
`Segmented` control with `stack` (as the `reducedFx` row does) — five choices are too wide for the
narrow layout otherwise.

**Boot decision** — `src/main.jsx`. If preview build **and** a persisted viewport **and** not already
inside the harness, render a thin harness shell instead of `<Autostich/>`. Recursion is broken by
construction: the iframe `src` carries a flag (e.g. `?vp=off`) that `main.jsx` checks.

**Harness shell** — a new `src/ui/TestViewportHarness.jsx` containing *only* outer chrome: a centred
iframe at the chosen pixel size, a hairline frame, a caption. **No** `transform`, `filter`,
`backdrop-filter`, `zoom`, `contain` or `will-change` anywhere in it, and **no** `fixed inset-0` class
literal (see §6.4).

### 4.2 Open question for the owner

`Row` takes an `icon`, and the desktop pass relies on it (`.op-rowicon` carries the row state from
1400 px up). House rule: **no new icons or glyphs without asking.** The existing options glyphs are
`⊕ ≋ ☾ ⇢ ✶ ▥ ⊘ ✧ ♪ ⇡ ◆ ✕ ⚔ ▤ ⌗`. Either one of these is reused for the viewport row, or a new glyph
needs approval. This needs a decision before implementation, not during.

---

## 5. Files likely affected

**New**

| File | Purpose |
| --- | --- |
| `src/ui/testViewport.js` | Size table + parse helper, React-free so guards can recompute |
| `src/ui/TestViewportHarness.jsx` | Outer chrome + iframe, preview-only |
| `test/test-viewport.test.js` | The guards from §6 |
| `scripts/shoot-viewports.mjs` *(task 2)* | CDP/Playwright screenshot script |

**Edited**

| File | Change |
| --- | --- |
| `src/main.jsx` | Boot branch: harness shell vs. `<Autostich/>` |
| `src/ui/OptionsModal.jsx` | One row inside the existing preview gate |
| `src/i18n/de.js`, `src/i18n/en.js` | Title, description, off-label |
| `docs/localization/strings_de_pixi_2026-08-15.csv` | Regenerated by `npm run loc:export` |
| `src/ui/PerfOverlay.jsx` *(optional)* | Derive `VIEWPORT_MARKS` from `TEST_VIEWPORTS` ∪ `{1536}` instead of a hand-typed list |
| `.github/workflows/*.yml` *(if the build guard runs in CI)* | One grep step on the non-preview build |

**Deliberately untouched:** `src/index.css`, the run-screen layout, `overlayPortal.jsx`, everything in
`src/ui/fx/`, `vite.config.js`. If a proposed change starts touching `index.css`, that is the signal
that option A has crept back in.

---

## 6. Tests, invariants and risks

### 6.1 Proving production contains no switch

Three layers, because the first alone only proves intent:

1. **Source-text guard** — every reference to the harness (`testViewport`, `TEST_VIEWPORTS`,
   `TestViewportHarness`) in `OptionsModal.jsx` and `main.jsx` sits inside a
   `import.meta.env.VITE_PREVIEW === "1"` window. Must be **comment-stripped**
   (`docs/engineering/testing.md` §6), because the rationale comment will name the gate.
2. **Build guard** — build with `VITE_PREVIEW` unset and grep `dist/assets/*.js` for a marker that
   only the gated code contains. **Trap to avoid:** the i18n catalogs ship in *every* build, so
   `options.testvp.title` is a useless marker — it will always be present. Use something that exists
   only inside the gated branch, e.g. the literal `"2560x1440"` or the component name. This layer is
   what actually proves the minifier removed the branch; nothing in the tree proves that today, for
   `perfHud` either.
3. **Counter-check** — `docs/engineering/testing.md` §5: remove the gate deliberately, prove both
   guards go red, restore, and record that the counter-check was done.

### 6.2 Proving "off" is unchanged

Structural rather than behavioural, because the project has no component-test setup — and
`testing.md` §4 says to say so in the guard's comment when that is the case.

- `main.jsx` on the default path still does `createRoot(document.getElementById("root")).render(<Autostich />)`.
- The harness branch is reachable only under `VITE_PREVIEW === "1"` **and** a set option.
- No harness element wraps the app on the default path (no wrapper class introduced into `#root`).
- `test/options-sections.test.js` continues to see exactly four sections and four sticky headings —
  it renders under Vitest where `VITE_PREVIEW` is unset, so the new row is absent. *Inferred from the
  existing `perfHud` behaviour; verify by running the file.*

### 6.3 Proving virtual viewports are deterministic

The unit-level guard should **compute**: the frame's `width`/`height` are derived from
`TEST_VIEWPORTS`, and the test recomputes them from the same table rather than transcribing pixels.

But determinism at the pixel level is an **observed** property and needs a browser. The acceptance
test for the whole issue is:

> A screenshot taken through the harness at 1280×720 must match a screenshot taken through a real
> CDP-set 1280×720 viewport at the same DPR.

If those two differ, the harness is lying and the issue is not done. This is precisely why task 2
(option E) belongs in the same workstream — it is the measuring instrument for task 1.

Plus: the same harness screenshot taken twice must be byte-identical.

### 6.4 Proving overlays stay correct

The app's document is untouched by design, so the strongest guard is structural:

- `TestViewportHarness.jsx` contains no `transform`, `filter`, `backdrop-filter`, `zoom`, `contain`,
  `will-change` and no `fixed inset-0` class literal.
- The outer document renders no second `<Autostich/>` instance.
- `test/overlay-nesting.test.js` continues to pass unchanged, and **no third exception is added to
  its list**. Adding one would silently weaken a guard that has caught the same bug three times.

Manual/browser check, because green does not prove visual correctness (`testing.md` §10): in the
harness, open the glossary, scroll the body down, then open the options overlay — it must sit at the
frame's top edge, not at `−scrollTop`.

### 6.5 Existing tests likely to react

| Test | Why | Expected |
| --- | --- | --- |
| `overlay-nesting.test.js` | Scans **all** `src/**/*.jsx` for `fixed inset-0` anywhere in a class literal | Passes if §6.4 is respected; goes red the moment the harness uses that class combination |
| `i18n-guards.test.js` | `OptionsModal.jsx` is on the `MIGRATED` ratchet list — no hard-wired display text with 3+ letters. Also: every catalog key must be used somewhere | The "Off" label **must** come from a catalog key. `"1280×720"` has no letters and passes as data |
| `loc-csv.test.js` | The translator CSV is a generated view of the catalog | Run `npm run loc:export` and commit the CSV, or CI goes red |
| `options-sections.test.js` | Counts sections, sticky headings and jump chips | Unaffected — the new row is inside a section and preview-gated |
| `desktop-perf.test.js` | Iterates every `src/ui/*.jsx`, requires `as-ring` count == `as-ring-run` count | A new file with neither is fine (0 == 0) |
| `hook-deps-budget.test.js` | Per-file budget for `exhaustive-deps` exceptions; new files need an entry only if they have one | Aim for zero exceptions in the new files |
| `buehne-desktop.test.js`, `screens-desktop.test.js`, `menu-desktop.test.js` | All read `index.css` | Unaffected as long as `index.css` is not touched — which is the plan |

### 6.6 Risks, ranked

1. **The tool could lie** (highest). Every approach short of a real viewport produces a
   plausible-but-wrong picture that would then drive design decisions. Mitigated only by the
   harness-vs-CDP comparison in §6.3. This risk is the reason options A and B are rejected rather
   than merely disfavoured.
2. **Scope creep into a layout rewrite.** If option A is chosen "because an iframe feels heavy", the
   work turns into migrating `index.css` to container queries. Guard against it by watching whether
   the diff touches `index.css` at all.
3. **A silently weakened overlay guard.** Adding a third exception to `overlay-nesting.test.js` would
   be the cheapest way out of a self-inflicted problem and the most expensive in the long run.
4. **Frame-level behaviour** — history/back (`useBackGuard`), audio autoplay, service-worker
   registration from inside the frame. Low severity, preview-only, but unverified.
5. **DPR is not part of the simulation.** Must be stated, not discovered later.
6. **Build-guard marker choice.** Picking a marker that ships in every build (an i18n key) would give
   a guard that is structurally incapable of failing — the exact failure mode `testing.md` §5 was
   written about.

---

## 7. Workstream and branch recommendation

**Branch:** `feature/viewport-harness` off `origin/dev`, per `docs/engineering/git-workflow.md`.
Because this should be a single-worker job (below), `task/viewport-harness` off `origin/dev` is
equally correct and lighter — a `feature/*` integration branch only earns its keep when several
`task/*` branches feed it.

**Recommendation: `task/viewport-harness` off `origin/dev`, one worktree, one writer.**

**Multiple workers or one?** — **One.** The change is two new files, three edited files, one new
test, and no `index.css` work. The hard part is judgement — *does the harness tell the truth?* — not
volume, and judgement does not parallelise. Splitting it would create the coordination cost the
one-writer-per-worktree rule exists to avoid, and the two halves (option row and harness shell) are
useless separately.

**Task split — sequential, same worktree:**

| # | Task | Content |
| --- | --- | --- |
| T1 | Harness | Size module, harness shell, boot branch, options row, i18n, guards from §6.1/6.2/6.4, counter-check |
| T2 | Measurement | CDP/Playwright screenshot script, the harness-vs-real-viewport comparison from §6.3, the four reference screenshots |
| T3 | Review | Codex as independent reviewer, per `AGENTS.md` |

T2 is what turns T1 from "a thing that looks right" into "a thing that is proven right". It could be
a separate `task/` branch with a different owner if desired, since it touches nothing under `src/` —
but it must land after T1 and before the issue is called done.

**Integration:** `task/viewport-harness → dev` after the full gate set
(`npm test`, `npm run lint -- --max-warnings=0`, `npm run build`, `npm run gen:db`, plus
`npm run loc:export` because player-visible text changes). Promotion `dev → test → main` stays
fast-forward only and is not part of this task.

---

## 8. Success criteria

1. A preview build shows **Options → Graphics & performance → Test viewport** with
   Off / 1280×720 / 1600×900 / 1920×1080 / 2560×1440.
2. A production build (`VITE_PREVIEW` unset) contains **no** switch — proven on the *built artefact*,
   not only in source, with a marker whose disappearance has been counter-checked.
3. **Off** is byte-for-byte the current boot path: no wrapper element, no iframe, no new CSS.
4. At each size, the app inside the harness reports that size — `PerfOverlay`'s readout inside the
   frame shows it, and `min-width: 1400px` / `max-height: 950px` / `--rn-w` / `--bf-w` evaluate
   against the virtual size, not the host window.
5. Overlays open at the frame's top edge at any scroll position; `overlay-nesting.test.js` passes
   with **no new exception**.
6. A harness screenshot at 1280×720 matches a real CDP 1280×720 screenshot at the same DPR
   (§6.3). *This is the criterion that decides whether the issue succeeded.*
7. The same harness screenshot taken twice is byte-identical.
8. `document.body` and the overlay portals carry no `transform`, `filter` or `zoom` in either
   document.
9. All gates green, `npm run loc:export` regenerated and committed.
10. Every new guard has had its counter-check performed and recorded.

### 8.1 How this changes the later Main Screen Refinement

**Caveat, stated plainly:** no "Main Screen Planning Report" exists in this repository —
`grep -rn "Main Screen|Desktop Refinement|#400" docs` returns nothing. The points below are derived
from the current code and the desktop rationale comments in `index.css`, not from that report. They
should be checked against it.

What #400 makes easier:

- **The measurement problem disappears.** Every `max-height` block in `index.css` was tuned against a
  named device ("1536×791", "864 px"). Today those are reproduced by resizing a browser window by
  hand; afterwards they are a radio button.
- **Success criteria can name a viewport instead of a feeling.** "Fits without scrolling at
  1920×1080" becomes checkable rather than arguable.
- **Agent comparison becomes possible.** Two agents proposing two layouts can be compared on
  identical images.

What becomes newly possible:

- A **regression set**: four screenshots per screen, refreshed per change. Not visual-diff CI —
  antialiasing and font rendering make that brittle — but a human-reviewable before/after.
- **The band below 1400 px becomes testable too.** 1280×720 is *below* the desktop breakpoint, so the
  harness also exercises the mobile-side fallback on a desktop machine, which today needs DevTools.

Success criteria that should be reformulated afterwards:

- Replace "works on desktop" with an explicit list of viewports and what "works" means at each one
  (no scroll / scroll allowed / degraded but legible).
- State **DPR separately** from CSS size. The harness fixes CSS pixels; 1920×1080 at DPR 1 and at
  DPR 1.5 are different rendering problems, and the FX resolution cap treats them differently.
- Name 1280×720 explicitly as a **sub-breakpoint** case, so nobody reads it as a desktop-layout target.

---

## 9. Recommended next step

1. **Decide the open glyph question** (§4.2) — reuse an existing options glyph, or approve a new one.
2. **Confirm the approach** — option D (iframe) plus option E (CDP script) as one workstream, single
   worker, `task/viewport-harness` off `origin/dev`.
3. Then, and only then, create the worktree, run `npm ci` in it, and start T1.

Nothing else should begin before step 1 and 2 are settled: the glyph is a house-rule gate, and
picking option A or B by default is the one decision that cannot be corrected cheaply later.

---

*Planning report — no implementation. Uncommitted; delete or relocate freely.*
