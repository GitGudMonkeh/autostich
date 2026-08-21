# T2 — Measurement / Proof: is the Desktop Viewport Harness trustworthy?

**Verdict: yes, for layout.** At every required size the harness reproduces the real viewport's
metrics, media queries and layout *exactly*. At 1280×720 the two renders are **pixel-identical**.
One difference exists, it is fully root-caused, and it is a property of iframes rather than of the
harness — see §6.

Nothing in `src/` was changed for T2. The harness architecture from T1 is unmodified; the validation
did not prove it wrong.

| | |
| --- | --- |
| Date | 2026-08-21 (`report@1x.json` stamp `2026-08-21T12:52:51Z`, `@2x` `12:53:44Z`) |
| Browser | HeadlessChrome/151.0.0.0 — Chrome 151.0.7922.169, Windows |
| Host | Windows 11, dev server `http://localhost:5180` (`--strictPort`, `VITE_PREVIEW=1`) |
| Device scale factors | 1 and 2, both fixed by CDP for *both* halves |
| Tooling | `scripts/viewport-proof.mjs` + `scripts/cdp.mjs` (no new dependency) |
| Evidence | `docs/workstreams/viewport-harness/evidence/` |

Reproduce in full:

```bash
node scripts/viewport-proof.mjs            # DPR 1 — the reference set
VP_DPR=2 node scripts/viewport-proof.mjs   # DPR 2 — the supplementary set
```

The script starts and stops its own dev server if 5180 is free, and uses an already-running one
otherwise. Exit code 0 only if layout is identical at every size **and** the determinism check
passes.

---

## 1. What was compared, and why in that order

**A — harness:** the app inside `TestViewportHarness`'s iframe, in a browser window of a
**deliberately different** size (frame + 220 px in each direction). That padding is the point: if the
app were reading the host window rather than its own frame, every measurement below would come out as
the window size, not the frame size.

**B — real viewport:** the same app state through `Emulation.setDeviceMetricsOverride` — the actual
CDP viewport — in the same browser process, same device scale factor, same seeded profile.

Four comparisons, ordered weakest-evidence-last:

1. **Viewport metrics** — `innerWidth/innerHeight/clientWidth/clientHeight/scrollWidth/scrollHeight/DPR`.
2. **Media queries** — every width/height query `index.css` actually contains. This matters most
   here: the desktop pass is height-sensitive, so a harness that got width right and height wrong
   would look almost correct and be worthless.
3. **Layout fingerprint** — every element in the document, in document order, with tag, class list
   and bounding box rounded to 0.01 px. Selector-free and immune to anti-aliasing. A different
   element list means the DOM differs; a different box means the layout differs.
4. **Pixels** — the visual record, and the weakest of the four. Reported with noise and non-noise
   separated, and every non-noise pixel attributed to a source (§5).

### Determinism controls

Controlled at the source, not corrected afterwards:

- `prefers-reduced-motion: reduce` via `Emulation.setEmulatedMedia`. The app already honours this
  everywhere, so **no test-only branch was added to `src/`**. Verified to propagate into the iframe.
- `Math.random` replaced by a seeded PRNG through `Page.addScriptToEvaluateOnNewDocument`, before any
  application script, in every frame. Without it the menu picks a random music track and two captures
  of "the same state" would legitimately differ.
- Seeded profile: `lang: de`, `muted`, `telemetry: false`, `reducedFx: an`, fixed username.
- `beforeinstallprompt` suppressed in **both** halves — see §6.

Captured state: the **hub** (start screen) with a username set. That is the screen the later desktop
refinement works on. An earlier run captured the first-visit welcome dialog instead, which also
compared clean — including the portaled overlay's geometry.

---

## 2. Result — DPR 1 (the reference set)

| Size | Outer window (harness) | inner W×H harness / real | clientWidth H / R | Nodes H / R | Metric+MQ diffs | Layout diffs |
| --- | --- | --- | --- | --- | --- | --- |
| 1280×720 | 1500×940 | 1280×720 / 1280×720 | 1272 / 1272 | 165 / 165 | **0** | **0** |
| 1600×900 | 1820×1120 | 1600×900 / 1600×900 | 1600 / 1600 | 165 / 165 | **0** | **0** |
| 1920×1080 | 2140×1300 | 1920×1080 / 1920×1080 | 1920 / 1920 | 165 / 165 | **0** | **0** |
| 2560×1440 | 2780×1660 | 2560×1440 / 2560×1440 | 2560 / 2560 | 165 / 165 | **0** | **0** |

Zero differences across **all 165 elements** at every size — same element list, same classes, same
bounding boxes to 0.01 px.

Note the 1280 row: `clientWidth` is 1272, not 1280, in **both**. The page scrolls at that height, so
the scrollbar takes 8 px. The harness reproduces that rather than presenting a scrollbar-free
fiction — which is why no `--hide-scrollbars` flag is used.

### Media queries

All ten evaluate identically in both halves at every size. Sampled at 1920×1080 (harness = real):

| Query | 1920×1080 |
| --- | --- |
| `(min-width: 1400px)` | true |
| `(max-width: 1399.98px)` | false |
| `(min-width: 1400px) and (max-width: 1920px)` | true |
| `(min-width: 1400px) and (max-width: 1760px)` | false |
| `(min-width: 1400px) and (max-height: 950px)` | false |
| `(min-width: 1400px) and (max-height: 900px)` | false |
| `(min-width: 1400px) and (max-height: 820px)` | false |
| `(min-width: 1750px) and (min-height: 1000px)` | true |
| `(pointer: coarse)` | false |

The height-conditioned queries resolve against the *simulated* height — the thing a
width-only harness would have got wrong.

### Derived values

`100dvh` and the `zoom` chain follow the frame, not the window:

| Size | `.app-root` min-height H / R | `.hub-pair` zoom H / R |
| --- | --- | --- |
| 1280×720 | 720px / 720px | 1 / 1 (scope inactive below 1400) |
| 1600×900 | 900px / 900px | **0.85 / 0.85** (the clamp floor) |
| 1920×1080 | 1080px / 1080px | 1 / 1 |
| 2560×1440 | 1440px / 1440px | 1 / 1 |

`body` carries `transform: none` and `filter: none` in both documents at every size.

---

## 3. Result — DPR 2 (supplementary)

Identical conclusion: 0 metric, 0 media-query, 0 layout differences at all four sizes, 165/165 nodes.
Numbers in `report@2x.json`. Only the 1280×720 images were kept for this set; the rest are
regenerable with the command above.

---

## 4. Determinism

| | DPR 1 | DPR 2 |
| --- | --- | --- |
| Same viewport | yes | yes |
| Same layout (all 165 nodes) | yes | yes |
| **Byte-identical PNG** | **yes** | no |
| Differing pixels | **0 (0.0000 %)** | 6 of 3 686 400 (0.0002 %), max Δ1 |
| Beyond-noise pixels | 0 | 0 |

Two cold captures — separate navigations, fresh document each time. At DPR 1 the two PNG files are
**byte-for-byte identical**. At DPR 2, six pixels differ by one level out of 255, which is
rasterisation jitter and not visible.

Files: `determinism-a-1280x720@1x.png`, `determinism-b-1280x720@1x.png` (and `@2x`).

---

## 5. Pixel comparison — matching areas, differences, and which is which

The task said to expect anti-aliasing noise and to document it separately. Rather than assert a
classification by eye, every differing pixel is **attributed**:

- deltas ≤ 8/255 → noise;
- deltas > 8/255 → checked against a mask of every text-bearing element's box (dilated 2 px for glyph
  overhang and this UI's text glow), including form controls, since a **placeholder is not a DOM text
  node**;
- and separately against the CSS `zoom` scopes (`.hub-pair`, `.hub-foot`).

| Size (DPR 1) | Differing | Beyond noise | Beyond noise **not on a glyph** | Of those, inside the `zoom` scope |
| --- | --- | --- | --- | --- |
| 1280×720 | **0 (0 %)** | **0** | **0** | – |
| 1600×900 | 48.31 % | 3 736 (0.26 %) | **0** | 3 710 / 3 736 (99.3 %) |
| 1920×1080 | 48.15 % | 4 480 (0.22 %) | **0** | 4 454 / 4 480 (99.4 %) |
| 2560×1440 | 40.84 % | 4 434 (0.12 %) | **0** | 4 408 / 4 434 (99.4 %) |

**Matching areas.** At 1280×720 the two images are identical, every channel, every pixel. At the
other sizes every panel, border, gradient, icon, glow and layout edge matches within ≤ 8/255.

**Differences, and their classification.**

1. *Noise (≤ 8/255)*: the large "differing" percentages are almost entirely the dim background
   gradient differing by one to eight levels — invisible, and the reason a raw "% of pixels differ"
   number is a poor metric for this app. Visible as blue in the diff images.
2. *Beyond noise (> 8/255)*: **100 % of these fall on text glyphs**, at every size and both DPRs.
   Zero fall anywhere else. Orange in the diff images.

**Why glyphs, and only ≥ 1400 px.** 99.4 % of the beyond-noise pixels lie inside the CSS `zoom`
scope that `index.css` applies to `.hub-pair`/`.hub-foot`, which only exists in the desktop pass. At
1280×720 that scope is inactive and the renders are byte-identical; from 1400 px up it is active and
glyphs inside it rasterise slightly differently in an iframe than in a top-level document. The
remaining 26 pixels per size are the corner tools' labels at the top-left — also text.

This is *reported as measured correlation*: the pixels are attributed, the scope containment is
counted, and Chrome's exact reason for rasterising glyphs differently under a `zoom` scope in a
nested browsing context has **not** been determined. It does not need to be for the harness to be
trusted, because the layout — position, size, structure — is provably identical. Raising DPR to 2
halves the noise but does not remove the glyph differences, so it is not purely LCD subpixel
antialiasing.

Diff image legend: black = identical · blue = ≤ 8/255 · orange = > 8/255 on a glyph · white =
> 8/255 not on a glyph (none occur).

---

## 6. The one known difference: the PWA install link

**Measured, not asserted** — the suppression is lifted and both contexts re-checked at the end of
every run:

| | Real viewport | Harness frame |
| --- | --- | --- |
| Install link present | **yes** (`📲 Installieren`) | **no** |

**Cause.** Chrome fires `beforeinstallprompt` only in a **top-level browsing context**, never inside
an iframe. `src/ui/PwaInstall.jsx` returns `null` without that event, so its three nodes are absent
in the harness.

**Assessment.** This is a browsing-context capability, not a layout fault, and it is conditional in
production anyway — the link only appears when the browser's own installability heuristics fire. It
does not affect any other element's position or size.

**How the comparison handles it.** `beforeinstallprompt` is suppressed in *both* halves during the
measurement, so the layout comparison is about layout. That is controlling a variable, not masking a
result: the difference is measured separately and reported here.

**Consequence to carry forward:** the harness cannot be used to review the PWA install link. Nothing
else known is affected.

---

## 7. Acceptance gate

| Requirement | Result |
| --- | --- |
| Harness at 1280×720 matches a real CDP 1280×720 viewport at the same DPR | **PASS — pixel-identical**, and 0 metric / 0 media-query / 0 layout differences |
| Two identical harness captures are deterministic | **PASS — byte-identical PNG at DPR 1** |
| Screenshots differ structurally | **No.** Every beyond-noise pixel is on a text glyph; nothing else differs beyond 8/255 |
| Viewport measurements differ | **No.** Identical at all four sizes, both DPRs |
| Media queries resolve differently | **No.** All ten identical at all four sizes |

The harness is trustworthy for layout, which is what it exists for.

---

## 8. Reference screenshots

All at DPR 1 unless noted; `report@1x.json` carries the full metadata per capture (viewport, DPR,
outer window, frame rect, metrics, media-query results, node counts, pixel statistics).

| Size | Through the harness | Through a real viewport | Diff |
| --- | --- | --- | --- |
| 1280×720 | `harness-1280x720@1x.png` | `real-1280x720@1x.png` | `diff-1280x720@1x.png` |
| 1600×900 | `harness-1600x900@1x.png` | `real-1600x900@1x.png` | `diff-1600x900@1x.png` |
| 1920×1080 | `harness-1920x1080@1x.png` | `real-1920x1080@1x.png` | `diff-1920x1080@1x.png` |
| 2560×1440 | `harness-2560x1440@1x.png` | `real-2560x1440@1x.png` | `diff-2560x1440@1x.png` |
| 1280×720 @2x | `harness-1280x720@2x.png` | `real-1280x720@2x.png` | `diff-1280x720@2x.png` |

Every file name states its size, DPR and which side it came from. Total evidence ≈ 11 MB.

---

## 8a. Defect found by manual review after T2 passed — and why T2 missed it

**Reported 21.08.2026:** "switching in the options gives me the mobile version at every resolution".

**Reproduced, root-caused, fixed, regression-guarded.** Classification: **harness defect** — not a
browser rendering difference, not an existing layout issue.

**What happened.** The switch is reachable from two documents: the options overlay of the normal app
(top document) and the options overlay of the app running *inside* the harness frame. In the second
case `window` is the iframe. `reloadAfterViewportChange` reloaded `window`, so the iframe reloaded
`?vp=off`, the app inside came back at the frame's existing size, and **the top document never
re-read the option**. The frame kept whatever size it was created with.

Consequence: after the first size was chosen, every later change was silently ignored — "Off"
included, so there was also no way back out. It presented as "mobile at every resolution" because the
first entry is 1280×720, which is legitimately below the 1400 px breakpoint and simply stayed.

Measured before the fix (entered at 1280×720, then picked 1920×1080 from inside the frame):

| | Value |
| --- | --- |
| Stored option | `1920x1080` ✔ |
| Frame size | **1280×720** ✘ |
| `min-width: 1400px` inside | **false** ✘ |
| Caption | **"1280 × 720"** ✘ |

After the fix, same sequence, measured end to end: 1280 → 1920 → 2560 → 1600 → Off, each step
producing the correct frame size, the correct media-query result, and Off returning to the normal app.

**Why both existing guards were blind — the part worth remembering.**

- The **unit guard** passed a fake `window` with *no frame around it*. It asserted the reload was
  deferred, which was the interesting question at the time, and could not see which document was
  being reloaded because there was only ever one.
- The **CDP comparison** seeded `localStorage` directly and reloaded the top document itself. It never
  clicked the row, and never switched size *from inside the frame*.

Both were green, and the bug was in the seam neither crossed. This is the "green does not prove
correctness" case from `docs/engineering/testing.md` §10 in its most literal form: the comparison
proved the harness renders a viewport faithfully, which was true, while the control that gets you
into that viewport was broken.

`test/test-viewport.test.js` now covers it with a `window` whose `top` is a *different* object,
asserting the top reloads and the frame does not, plus the same-document and cross-origin-throw
cases. Counter-checked: reverting to `w.location.reload()` turns it red.

**Standing lesson for the harness:** a control reachable from two documents must say which document
it acts on. Anything else added to the harness UI later needs the same question asked of it.

---

## 8b. Handed over, not fixed: the 1280–1399 px band

Raised during the same manual review: at 1280×720 the harness shows the **phone layout**.

**That is correct behaviour, and the harness proves it.** The desktop pass hangs off
`@media (min-width: 1400px)`; 1280 is below it. 1280×720 was also the one size in §5 where the
harness capture and a real CDP viewport came out **pixel-identical** (max Δ0) — a real 1280 px window
shows exactly the same thing. Contract §7 lists that size precisely to exercise the mobile-side
fallback.

The finding underneath it is real, though: devices in that band have desktop input and desktop
expectations. The **Steam Deck** is 1280×800 native, and 1080p laptops at 150 % Windows scaling land
on exactly 1280 CSS px. Serving them the iPhone-SE-tuned layout is a gap.

**Decision (owner, 21.08.2026): accepted as-is and deferred.** It would be a *third* layout beside
phone and desktop — a new design, not an adjustment — and that is too much work to fold into #400.
Breakpoint changes are a Non-Goal of this task (contract §4) and `index.css` is the tripwire.

Recorded as **FB-13** in `docs/feature-backlog.md`, with the device analysis, the affected files and
the ratchets it would touch. It is an input to the Main Game Screen Desktop Refinement.

Worth stating plainly, because it is the point of the whole task: this was a line in a CSS comment
before, and it is now two clicks away in the options. The harness surfacing it *is* the harness
working.

---

## 8c. T2.5 — run-screen validation: outcome

T2.5 was scoped as a CDP comparison of the active run screen. **The owner replaced it with a human
viewport review and closed it as documentation only (21.08.2026).** No measurement code was written
for it; no layout code was touched.

**Outcome of the human review:**

- The viewport harness itself works correctly.
- All four tested viewport sizes behave consistently.
- The remaining observations are layout/design questions in particular viewport ranges — **not**
  harness defects, and **not** in scope for #400.

**Viewports validated** — automated (§2–§5) and by hand:

| Size | Automated comparison | Human review |
| --- | --- | --- |
| 1280×720 | pixel-identical to a real viewport | reviewed |
| 1600×900 | 0 layout differences | reviewed |
| 1920×1080 | 0 layout differences | reviewed |
| 2560×1440 | 0 layout differences | reviewed |

**Stated plainly so it is not over-read:** the automated comparison covers the **hub**, not the
active run screen. `.rn-shell`, `--bf-w`/`--bf-h`, `--card-s`, card positions and the FX host bounds
were **never captured or compared**. The architectural reason to expect them to hold is the same one
that holds everywhere else — they derive from `100vw`/`100dvh` and from element rects inside a real
viewport — but that is *inferred*, not *measured*. It remains listed in §9. Whoever picks up the
desktop refinement should either run that comparison or treat run-screen geometry as unproven.

### Classification of every finding from validation

| # | Finding | Classification | Disposition |
| --- | --- | --- | --- |
| 1 | Switching size **from inside the frame** had no effect; "Off" did not exit either | **Harness defect** | **Fixed** — reload targets the top document. Regression guard added and counter-checked (§8a) |
| 2 | PWA install link (`📲 Installieren`) absent inside the harness | **Expected browser behaviour** — `beforeinstallprompt` fires only in a top-level browsing context | Documented (§6). Controlled in both halves during measurement. No fix; not fixable from the app |
| 3 | Text glyphs rasterise differently ≥ 1400 px (100 % of beyond-noise pixels, 99.4 % inside the CSS `zoom` scope) | **Expected browser rendering difference** | Documented (§5). Layout provably identical; no action |
| 4 | **FB-13** — 1280–1399 px shows the phone layout (Steam Deck 1280×800, 1080p at 150 % scaling, 1366×768, unmaximised windows) | **Not a harness defect. Not part of the viewport harness.** Future responsive/layout refinement item | **Deferred by owner decision.** Recorded as FB-13 in `docs/feature-backlog.md`; input to the Main Game Screen Desktop Refinement (§8b) |

Only finding 1 was a defect in this workstream, and it is fixed. Findings 2 and 3 are properties of
browsers. Finding 4 is a design question the harness made visible — which is what it was built for.

**No layout issue discovered during validation was fixed.** The purpose of this workstream is a
trusted measurement environment, not a UI redesign.

---

## 9. Limits of this evidence

Stated so nobody reads more into it than it carries:

- **One screen.** The hub, plus the welcome dialog in an earlier run. The run screen (`.rn-shell`,
  where `--bf-w` derives from `100dvh`) was **not** captured — it needs an active run to reach.
  T2.5 was to close this gap by measurement and was instead closed as documentation (§8c), so the gap
  stands: run-screen geometry under the harness is *inferred*, not *measured*. Extending
  `viewport-proof.mjs` to seed a run is the obvious next step if that screen matters.
- **One host, one browser.** Chrome 151 on Windows. Linux/CI rendering was not measured.
- **DPR is not simulated** — by design (contract §5.6). Both halves were pinned to the same device
  scale factor; the harness fixes CSS pixels only.
- **Effects are minimised** (`reducedFx: an`, reduced motion) for determinism. Full-effect rendering
  is frame-timing dependent and was deliberately not compared.
- **A green comparison proves sameness, not correctness.** It shows the harness renders what a real
  viewport renders. Whether that layout is any *good* at 1280×720 is the question the harness now
  exists to let a human answer.
- **The comparison says nothing about the control.** It seeds state and reloads by itself; it never
  clicks the option row. §8a is what that gap cost. The click path is now covered by unit guards and
  was verified end to end in a browser, but the pixel comparison still does not exercise it.
