# Codex Review Handoff — Desktop Viewport Harness (#400)

**Reviewer role: independent assessment only. Do not implement.** Findings return to the Claude
worker in this worktree (`task/viewport-harness`), per task contract §1.

| | |
| --- | --- |
| **Context** | Desktop Viewport Harness (#400) |
| **Branch** | `task/viewport-harness` (pushed, own upstream, **not** merged into `dev`) |
| **Diff** | `dd36c3ef..908570cc` |
| **Size** | 15 files, +2749/−4 · plus 23 evidence PNG/JSON (11 MB) |
| **Gates** | lint / build / gen:db exit 0 · `npm test` see §5 |

Three commits:

```
bdc516ee  feat: add desktop viewport harness
bf678921  test: validate viewport harness with CDP
908570cc  docs: document viewport harness evidence
```

**Read first:** `task-contract.md` (binding scope — §4 non-goals, §5 architecture, §8 acceptance
gate), then `T2-measurement-report.md` (evidence; §8a–§8c are the honest parts).

---

## 1. Architecture correctness

**The claim to check:** the desktop layout is dimensioned from the *real* viewport — the
`min-width: 1400px` pass, several `max-height` blocks, and the `100vw`/`100dvh` chain behind
`--rn-w`/`--bf-w`. None of that can be scoped to a container. Therefore a fixed-size box inside a
large window keeps evaluating the large window and shows a plausible but **wrong** picture. An
iframe content box is a real viewport, so everything resolves by itself.

| Aspect | Where | What to verify |
| --- | --- | --- |
| iframe viewport approach | `src/ui/TestViewportHarness.jsx`, `src/ui/testViewport.js` | The app has **no** knowledge of the harness. If any mechanism had to be told about it, the design is wrong. |
| no transform / zoom / container simulation | `TestViewportHarness.jsx`; guard in `test/test-viewport.test.js` | No `transform`, `filter`, `backdrop-filter`, `zoom`, `perspective`, `contain`, `will-change` anywhere in the shell. |
| overlay safety | `test/overlay-nesting.test.js` (**byte-identical to base**, `02b52411…`) | Still exactly **2** exceptions. No third one was added. The shell is not a full-screen overlay and does not call `createPortal`. |
| preview-only behaviour | `src/main.jsx`, `src/ui/OptionsModal.jsx` | One gate, not two. `main.jsx` reaches the shell only through a **dynamic** import inside the gated branch. |

**Two details that are load-bearing, not cosmetic** — both worth a sceptical look:

1. The frame is `box-sizing: content-box` with `border: 0`. `index.css` sets
   `* { box-sizing: border-box }` globally; under that, a 1 px border would come out of the declared
   size and the simulated viewport would silently be **1278 px** wide instead of 1280. The visible
   hairline is an `outline`, which takes no layout space.
2. Switching size reloads the **top** document, not the frame it was clicked from. See §5 — this was
   a shipped defect found by manual review after all guards were green.

---

## 2. Scope compliance

Verified by hash against the base commit, not by inspection:

| Must not change | Result |
| --- | --- |
| `src/index.css` | **unchanged** — `c1b3ccfd858cd6dab7df30fefd83456947ce686b` identical in `dd36c3ef` and `HEAD` |
| `src/ui/overlayPortal.jsx` | **unchanged** — `6ad171f1ca0893d595528f45d4cd666d80352303` |
| `src/game/**` (gameplay) | **0 files** in `git diff --name-only dd36c3ef..HEAD` |
| `src/ui/fx/**` (FX architecture) | **0 files** |
| Breakpoints / `DESKTOP_MIN` | untouched |
| Main Screen components | untouched |

The only two existing app files touched are pure additions: `main.jsx` +27/−2 (boot branch),
`OptionsModal.jsx` +21/−2 (one row inside the existing preview gate).

**Reproduce:**

```bash
git diff --name-only dd36c3ef..908570cc -- src/index.css src/ui/overlayPortal.jsx src/game src/ui/fx
# expected: empty
```

---

## 3. Testing evidence

| Layer | Artefact | Result |
| --- | --- | --- |
| T1 guards | `test/test-viewport.test.js` (380 lines, 27 tests) | Table and pure functions computed not transcribed; harness structural safety; gate checked **behaviourally** by rendering the options overlay with `VITE_PREVIEW` stubbed on and off |
| Production exclusion | `scripts/check-preview-exclusion.mjs` | Builds twice; each marker must be **present** in preview and **absent** in main. A marker missing from both is a hard error, not a pass |
| CDP comparison | `scripts/viewport-proof.mjs` + `scripts/cdp.mjs` | 0 metric, 0 media-query, 0 layout differences at all four sizes, DPR 1 and 2. 1280×720 **pixel-identical** |
| Determinism | same script | Two cold captures **byte-identical** at DPR 1 |

**Points a reviewer should press on:**

- **Counter-checks.** Twelve seams were sabotaged one at a time and each guard confirmed to fall
  before being restored. Recorded in the T2 report. Worth spot-checking one.
- **The marker trap, measured:** the i18n catalogs are never gated and ship whole, so
  `options.testvp.*` occurs **8 times in a production bundle**. Any catalog key would have been a
  structurally blind marker. The script asserts this in both directions.
- **Two guard families in one file, deliberately.** The CSS-property check strips comments (the
  shell's rationale comment names every forbidden property); the full-screen-overlay check reads
  **raw**, because `overlay-nesting.test.js` does. Mixing these up cost one red suite — a comment
  merely *mentioning* the utility classes made that guard report the file as an unportalled overlay.
- **Pixel differences are attributed, not hand-waved.** 100 % of beyond-noise pixels fall on text
  glyph boxes; 99.4 % of those sit inside the CSS `zoom` scope that only exists above 1400 px. Zero
  fall anywhere else.

---

## 4. Open questions for the reviewer

Independent judgement wanted on these four. None is a defect; each is a decision the owner deferred.

1. **Is unmeasured run-screen validation acceptable to defer?**
   The CDP comparison covers the **hub**, not an active run. `.rn-shell`, `--bf-w`/`--bf-h`,
   `--card-s`, card positions and FX host bounds were **never captured**. The architectural reason to
   expect them to hold is the same one that holds elsewhere, but that is *inferred*, not *measured*.
   T2.5 was to close this by measurement and was closed as documentation instead (T2 report §8c, §9).

2. **Should the evidence PNGs remain in the repo?**
   23 files, 11 MB, in commit `908570cc`. Fully regenerable via `node scripts/viewport-proof.mjs`.
   Trade-off: durable evidence versus repository weight. Commit 3 is the place to trim.

3. **Should the preview exclusion script be wired into CI?**
   It exists and passes, but `.github/workflows/**` was deliberately **not** touched — a deploy
   pipeline change felt like it needed explicit approval. `ci.yml` already runs two builds; the
   non-preview one is the candidate. Note it takes two additional full builds (~12 s).

4. **Is the FB-13 language exception acceptable?**
   `AGENTS.md` requires English for new engineering material. FB-13 in `docs/feature-backlog.md` is
   written in **German** to match that document, which is German throughout with a fixed template. A
   single English entry mid-list would have broken it. Deliberate deviation; flagged rather than
   hidden.

---

## 5. Known state a reviewer will hit

**`npm test` is red on this Windows host, and it is not caused by this branch.**
All failures are **timeouts**, never assertions, and every affected file passes in isolation.
Measured over multiple full runs:

| | Failures per run |
| --- | --- |
| `task/viewport-harness` | 0 · 1 · 1 · 1 · 1 · 2 |
| **`dev` @ `dd36c3ef`, unmodified** | 1 · **3** |

`dev` is worse under the same load. The recurring one is
`i18n-guards › jeder Katalog-Schlüssel wird auch irgendwo benutzt` (~5.0–6.7 s against a 5 s limit);
`faction-panels` and `lightning`/`plant` join it under heavier load. Pre-existing host-load
condition, **test not modified** (`docs/engineering/testing.md` §12.2). CI is Linux/Node 22 and this
says nothing about it.

**A defect was found by manual review *after* T1 and T2 were both green** — T2 report §8a. Switching
size from inside the harness frame reloaded the frame instead of the top document, so every change
after the first was silently ignored, "Off" included. Both guards were blind: the unit guard passed a
fake `window` with no frame around it, and the CDP comparison seeded `localStorage` instead of
clicking the row. Fixed, regression-guarded, counter-checked. **The comparison still does not
exercise the click path** — worth weighing when judging how much the green evidence proves.

**One difference is a browser capability, not a fault.** Chrome fires `beforeinstallprompt` only in a
top-level browsing context, so the PWA install link cannot appear inside the harness (3 nodes).
Suppressed in *both* halves during measurement so the comparison is about layout; measured and
reported separately.

**FB-13 is explicitly not a harness defect.** Between 1280 and 1399 px CSS width a desktop device
gets the phone layout — correct behaviour of the current breakpoint, and 1280×720 is precisely where
harness and real viewport are pixel-identical. Owner decision: accepted as-is, deferred to the
Desktop Refinement as a third layout tier.

---

## 6. Suggested reading order

1. `docs/workstreams/viewport-harness/task-contract.md` — what was agreed
2. `docs/workstreams/viewport-harness/T2-measurement-report.md` §8a–§8c — what went wrong and what is unproven
3. `src/ui/testViewport.js` — ~55 lines of logic, the rest rationale
4. `src/ui/TestViewportHarness.jsx` — chrome only
5. `src/main.jsx`, `src/ui/OptionsModal.jsx` — the two insertion points
6. `test/test-viewport.test.js` — the guards
7. `docs/workstreams/viewport-harness/planning-report.md` — why the three rejected approaches were rejected

Everything is reproducible:

```bash
npx vitest run test/test-viewport.test.js   # 27 guards
node scripts/check-preview-exclusion.mjs    # production exclusion, on the artefact
node scripts/viewport-proof.mjs             # CDP comparison; starts/stops its own dev server
```
