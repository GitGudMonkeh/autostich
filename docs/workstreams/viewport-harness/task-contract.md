# Task Contract — Desktop Viewport Harness (#400)

**Status:** approved, setup complete, **implementation not started.**
**Supersedes nothing.** Companion document: `planning-report.md` in this directory.
This contract is the binding scope statement. Where it and the planning report disagree, this
contract wins.

---

## 1. Identity

| Field | Value |
| --- | --- |
| **Task** | Desktop Viewport Harness (#400) |
| **Branch** | `task/viewport-harness` |
| **Base** | Synchronized `dev` — `origin/dev` @ `dd36c3ef82131396cf06adad5482b432363eea92` |
| **Owner** | Claude Worker (single writer) |
| **Integrator** | Not separately staffed. Single-worker task; integrates into `dev` directly after review. |
| **Reviewer** | Codex, as independent reviewer, **before** integration into `dev`. Codex reviews; Codex does not implement. |
| **Concurrency** | One writer. Sequential Claude sessions may continue this task in the same worktree. Never two simultaneous writers. |

Ancestry verified at setup time: `origin/main` → `origin/test` → `origin/dev` all hold
(`git merge-base --is-ancestor`, both directions exit 0).

---

## 2. Local workspace

| Field | Value |
| --- | --- |
| **Worktree** | `C:\Code\Autostich-worktrees\viewport-harness` |
| **Branch checked out there** | `task/viewport-harness` |
| **Upstream** | **None.** The branch deliberately does not track `origin/dev`. |
| **Preview port** | `5180` |
| **Preview URL** | `http://localhost:5180` |

Vite must be started as:

```bash
npm run dev -- --port 5180 --strictPort
```

`--strictPort` is **mandatory**. Without it Vite silently falls forward to the next free port, and
every screenshot, every CDP viewport comparison and every "I checked it at 1280×720" claim would
then be about an unknown server. If the port is occupied, the run must fail loudly — find out what
is holding 5180 rather than moving the harness.

`npm ci` must have completed in this worktree before any test/lint result means anything.
`node_modules/` is per-worktree and is not shared with `C:\Code\Autostich`.

---

## 3. Scope

Three **sequential** parts, same branch, same worktree.

### T1 — Harness

- Shared viewport-size definition (React-free module, so guards can **recompute** rather than
  transcribe — `docs/engineering/testing.md` §4).
- Preview-only option row in **Options → Graphics & performance**, using the existing
  `import.meta.env.VITE_PREVIEW === "1"` gate.
- Same-origin iframe harness.
- Boot decision in `src/main.jsx` (harness shell vs. normal `<Autostich/>` mount).
- i18n keys in **both** catalogs, plus `npm run loc:export`.
- Structural guards.
- Production-build exclusion proof — on the **built artefact**, not only in source.
- Overlay safety: `overlay-nesting.test.js` passes with **no new exception**.
- Counter-checks for every new guard, per `docs/engineering/testing.md` §5, recorded.

### T2 — Measurement / proof

**Not optional.** The harness is not finished until its output has been validated against a real
browser viewport.

- CDP/Playwright viewport tooling.
- Deterministic screenshot workflow.
- Compare a harness-rendered viewport against a real browser viewport of the same size at the same
  DPR.
- Reference screenshots for **1280×720**, **1600×900**, **1920×1080**, **2560×1440**.
- The host DPR must be shown or recorded alongside every comparison (see §5).

### T3 — Independent review

- Prepare the completed feature diff plus the T2 evidence for Codex.
- Codex reviews independently.
- Any implementation change arising from review returns to **this** Claude worker, in **this**
  worktree. Codex does not implement.

---

## 4. Non-goals — explicitly out of scope

Touching any of these is a scope breach, not a judgement call:

- Removing or reducing fluid layout
- Changing desktop breakpoints (`1400px` / `DESKTOP_MIN` and friends stay as they are)
- Main Game Screen refinement
- Steam wrapper integration
- Fullscreen / 4K scaling
- Container-query migration
- Global `transform` or `zoom`
- `index.css` desktop-layout redesign
- Gameplay changes

**Tripwire:** if the diff starts touching `src/index.css`, stop. That is the signal that the rejected
CSS/container approach has crept back in.

---

## 5. Approved architecture

The following are binding architectural statements, not suggestions.

1. **The iframe content box is the simulated viewport.** Not a container, not a scaled box.
2. **Media queries, `vw`/`vh`/`dvh`, `matchMedia`, portals and Pixi must evaluate inside that
   viewport naturally** — by virtue of it being a real viewport, with no application-side awareness
   of the harness. If any of them needs to be told about the harness, the design is wrong.
3. **`document.body` must not be transformed.** No `transform`, `filter`, `backdrop-filter`, `zoom`,
   `perspective`, `contain` or `will-change` on the body of either document.
4. **The `overlayPortal` architecture remains intact.** `createPortal(node, document.body)` stays the
   one rule; no direct `createPortal` outside the helper; no third entry in the
   `overlay-nesting.test.js` exception list.
5. **"Off" uses the current normal application boot path** — the existing
   `createRoot(document.getElementById("root")).render(<Autostich />)`, with no wrapper element and
   no harness CSS.
6. **DPR is explicitly NOT simulated by the in-app harness.** The harness fixes CSS pixels only.
   Device pixels continue to follow the host monitor and OS scaling.
7. **The host DPR must be shown or recorded when comparing screenshots.** `PerfOverlay` already
   displays size and DPR, and rendering it inside the frame makes it the harness's own readout —
   there is no need to build a second one.

---

## 6. Approved UI decision

The Test Viewport row uses the **existing** glyph:

```
▥
```

No new glyph is introduced. This is the same glyph the FPS/perf row already carries, which is
consistent: both are preview-only measurement tools in the same section.

The row sits in the **graphics** section, inside the existing preview gate block, so there is one
gate rather than two.

---

## 7. Required sizes

The canonical CSS viewport sizes:

| Size | Role |
| --- | --- |
| 1280×720 | Below the 1400 px desktop breakpoint — exercises the mobile-side fallback |
| 1600×900 | Mid desktop band |
| 1920×1080 | The anchor the desktop pass was tuned against |
| 2560×1440 | **Validation size only** |

**2560×1440 is a validation size, not a fourth future layout tier.** It exists to prove the harness
behaves at a size larger than the host window, not to justify a new layout step.

Note (from the planning report, restated because it will come up during T1): a 2560×1440 frame does
not fit on a 1920 monitor. First scope lets the outer page scroll. It must **not** be scaled to fit —
a scaled frame yields resampled screenshots and stops being pixel-exact, which defeats §8.

---

## 8. Critical acceptance gate

The issue is **not** complete merely because the iframe displays the requested dimensions.

> **The decisive acceptance criterion:** a screenshot produced through the harness at 1280×720 must
> match the same application state rendered with a real CDP/browser viewport of 1280×720 at the same
> DPR.

If those differ materially, the harness is considered **untrustworthy** and the task is **not
complete**. A harness that shows a plausible but wrong picture is worse than no harness, because it
would then drive design decisions.

Also required:

1. Two identical harness captures of the same state are deterministic.
2. The production build contains no active viewport-switch implementation — proven on the built
   artefact. **Marker trap:** the i18n catalogs ship in *every* build, so a catalog key is a
   structurally useless marker. Pick something that exists only inside the gated branch, and
   counter-check that it actually disappears.
3. "Off" behaves like the current production path.
4. No new `overlay-nesting.test.js` exception.
5. All required project gates pass:
```bash
   npm test
   npm run lint -- --max-warnings=0
   npm run build
   npm run gen:db
   npm run loc:export     # player-visible text changes
```
   Never piped without `set -o pipefail`. Never reported as passing unless the real command
   completed successfully.

---

## 9. Expected file surface for T1

Indicative, not a licence. Anything outside this needs to be surfaced before it is changed.

**New**

| File | Purpose |
| --- | --- |
| `src/ui/testViewport.js` | Size table + helper, React-free so guards recompute |
| `src/ui/TestViewportHarness.jsx` | Outer chrome + iframe, preview-only |
| `test/test-viewport.test.js` | Structural guards + counter-checked seams |

**Edited**

| File | Change |
| --- | --- |
| `src/main.jsx` | Boot branch |
| `src/ui/OptionsModal.jsx` | One row inside the existing preview gate (glyph `▥`) |
| `src/i18n/de.js`, `src/i18n/en.js` | Title, description, off-label |
| `docs/localization/strings_de_pixi_2026-08-15.csv` | Regenerated by `npm run loc:export` — never hand-edited |
| `src/ui/PerfOverlay.jsx` *(optional)* | Derive `VIEWPORT_MARKS` from the shared table ∪ `{1536}` instead of a hand-typed list |
| `.github/workflows/*.yml` *(if the build guard runs in CI)* | One grep step on the non-preview build |

**Must not be touched:** `src/index.css`, `src/ui/overlayPortal.jsx`, anything in `src/ui/fx/`,
the run-screen layout, `vite.config.js`.

---

## 10. Known hazards carried into T1

Named here so they are not rediscovered as bugs:

1. **`overlay-nesting.test.js` matches `fixed inset-0` anywhere in a class literal**, across all
   `src/**/*.jsx`. The harness shell must not use that class combination — and must not be granted an
   exception.
2. **`OptionsModal.jsx` is on the `i18n-guards.test.js` `MIGRATED` list.** No hard-wired display text
   with three or more letters. The "Off" label **must** come from a catalog key. `"1280×720"` has no
   letters and passes as data.
3. **`loc-csv.test.js`** compares the generated translator CSV against the catalog. Run
   `npm run loc:export` and commit the result, or CI goes red.
4. **Source-text ratchets are comment-sensitive.** Before editing any comment in a guarded file,
   check whether the guard strips comments (`docs/engineering/testing.md` §6–§8). A guard that
   forbids a spelling can match its own rationale comment.
5. **`useBackGuard` pushes a history entry.** Inside an iframe that joins the top-level session
   history, so browser-Back behaves differently in the harness. Preview-only; verify, then document.
6. **Service worker and audio autoplay from inside a frame** are unverified. Neither is expected to
   block; both need a look.
7. **`mobileTier.js` caches `pointer: coarse` once per session.** Not affected by a size change, but
   worth knowing before chasing a phantom.

---

## 11. Definition of done

- [ ] T1 implemented, all new guards counter-checked and the counter-check recorded
- [ ] T2 executed: harness output validated against a real CDP viewport at matching DPR, at all four sizes
- [ ] Reference screenshots produced for 1280×720, 1600×900, 1920×1080, 2560×1440, each with host DPR recorded
- [ ] Two identical harness captures shown to be deterministic
- [ ] Production build proven free of the switch, on the artefact, with a counter-checked marker
- [ ] "Off" proven to use the current boot path
- [ ] `overlay-nesting.test.js` green with no new exception
- [ ] All project gates green, `loc:export` regenerated
- [ ] T3: diff + evidence prepared, Codex review passed, review fixes applied by this worker
- [ ] Integration into `dev` authorized and performed

**Reporting discipline:** distinguish *measured*, *observed*, *inferred*, *proposed*. Never claim a
gate ran if it did not. Never describe planned work as completed.

---

*Contract issued at setup. Implementation has not started.*
