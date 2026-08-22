# Task Contract — T1: Threshold, Guard, Survey (`#viewport-1280`)

**Status:** proposed, **not started.** No branch created, no worktree created, no source file changed.
**Companion document:** `planning-report.md` in this directory.
This contract is the binding scope statement. Where it and the planning report disagree, **this
contract wins.**

---

## 1. Identity

| Field | Value |
| --- | --- |
| **Task** | `#viewport-1280` T1 — threshold move, completeness guard, measurement survey |
| **Branch** | `feature/viewport-1280` (to be created from `dev`) |
| **Base** | `dev` @ `863febe54fce513c4171314eb8cfc0d86f997408` |
| **Owner** | Claude worker, single writer |
| **Integrator** | Not separately staffed. Integrates into `dev` after review. |
| **Reviewer** | Codex, as independent reviewer, **before** integration. Codex reviews; Codex does not implement. |
| **Concurrency** | One writer. Sequential Claude sessions may continue this task in the same worktree. Never two simultaneous writers. |

Ancestry must be verified before the branch is created:

```bash
git fetch origin
git merge-base --is-ancestor origin/main origin/test
git merge-base --is-ancestor origin/test origin/dev
```

Both must exit 0.

---

## 2. Local workspace

| Field | Value |
| --- | --- |
| **Worktree** | `C:\Code\Autostich-worktrees\viewport-1280` |
| **Branch checked out there** | `feature/viewport-1280` |
| **Upstream** | **None.** The branch deliberately does not track `origin/dev`. |
| **Production preview port** | `5181` |
| **Preview URL** | `http://localhost:5181` |

`npm ci` must have completed in this worktree before any test or lint result means anything.
`node_modules/` is per-worktree and is not shared with `C:\Code\Autostich`.

**Port 5181, not 5180.** 5180 is pinned by the `#400` viewport-harness contract for a *dev* server
with `VITE_PREVIEW=1`. This task measures a **production** build. Two different servers on one port
would make it impossible to say afterwards which build a measurement described.

The measurement server must be started as:

```bash
npm run build
npm run preview -- --port 5181 --strictPort
```

`--strictPort` is **mandatory**. Without it Vite silently moves to the next free port and every
measurement below would be about an unknown server. If 5181 is occupied, the run must fail loudly —
find out what holds it rather than moving the measurement.

---

## 3. Scope — four commits, in this order

The ordering is the method, not a preference. It is what separates "did the rename break something"
from "does 1280 break something".

### Commit 1 — Test anchors compute instead of slicing on a literal

~27 occurrences across 20 test files currently do `css.indexOf("@media (min-width: 1400px)")` to cut
`index.css` into a phone half and a desktop half. Replace with a computed anchor:

```js
import { DESKTOP_MIN } from "../src/ui/useIsWide.js";
const DESKTOP_AT = `@media (min-width: ${DESKTOP_MIN}px)`;
```

**Threshold value: unchanged at 1400. Suite must be green. No behaviour change, no visual change.**

This commit exists first because it is the only one that touches 20 test files while guaranteeing
green. After it, every red test in this task is a real signal.

### Commit 2 — R1: one threshold, one name

- `@theme { --breakpoint-dt: 1280px }` … **no.** In this commit the value is **still 1400**:
  `@theme { --breakpoint-dt: 1400px }`.
- Codemod every `min-[1400px]:` JSX utility (~134 occurrences, 10 files) to `dt:`.
- `DESKTOP_MIN` in `src/ui/useIsWide.js` is derived from the same source rather than typed again.
- After this commit **no arbitrary `min-[Npx]:` variant remains anywhere in `src/**`.**

**Hard gate: the compiled CSS must be byte-identical to the compiled CSS of commit 1.**

```bash
npm run build            # before and after, compare the emitted CSS asset
```

If it is not identical, the codemod is wrong. This proof is stronger than any ratchet: it shows the
rename changed nothing, at the only level that matters — the output.

**The codemod must be a script, not hand edits.** A hand-edited rename cannot be re-run, cannot be
reviewed as a transformation, and makes the byte-identity proof a coincidence rather than a
consequence.

**Threshold value: still 1400. Suite green. No visual change.**

### Commit 3 — Flip the value

`--breakpoint-dt: 1400px` → `1280px`. One line.

Also in this commit, because they are the same decision:

- the counter-edge `@media (max-width: 1399.98px)` → `1279.98px`, derived from the token, not typed;
- the completeness guard (§5) and its sabotage check;
- prose carried forward in `index.css`, `App.jsx`, `src/i18n/de.js`, `src/i18n/en.js` and test headers
  — every "ab 1400 px" that is now false;
- the rationale block above the desktop section of `index.css` replaced (see §7).

**Phone counter-proof required in this commit** (§6). Everything that moves, moves here.

### Commit 4 — The measurement probe

A new script on `scripts/cdp.mjs`, committed, re-runnable after every later repair round. Output
schema in §8. Runs against the production build on port 5181.

**No layout repairs in any of the four commits.**

---

## 4. Non-goals and tripwire

Explicitly **not** in T1:

- **Any layout repair.** What overflows is measured and written down, not fixed. This holds even when
  the fix would be one line. Repairs are T2.
- **R2 and R3** (elastic lanes, declared scrollers). T2.
- **Removal of the guide's `--gs`.** Decided, but it is a repair. T2.
- **Absolute text sizes / the named type scale.** Strand S2. T1 only *inventories* them.
- **The level-up wings.** Document the actual value at 1280 (middle lane fixed 924 px, wings ~178 px
  each, built for 320 / 356) and leave it standing. Decision is T3.
- **The height media queries** 950 / 900 / 820.
- **Any change to the phone layout.**
- **A third layout tier**, `xl:`, or a global `zoom`.
- **Unrelated cleanup** in touched files.

### Tripwire

If commit 2's compiled CSS is **not** byte-identical, stop. Do not proceed to commit 3, do not
"adjust the expectation". A non-identical output means the codemod changed something nobody intended,
and finding that out after the value flip costs the whole diagnostic value of the ordering.

### Secondary tripwire

If the phone counter-proof at 390 px shows **any** structural difference or any pixel beyond the noise
threshold, stop and report. That is a defect, not a tolerance to be widened.

---

## 5. The completeness guard

A test that **computes** rather than compares spellings. Four assertions:

1. No `1400` remains anywhere in `src/**` except a **named** exception list, each entry justified in
   the test itself.
2. Every `min-width: N px` with N > 1000 in `index.css` is either the desktop token's value or on the
   exception list — currently `{1750}`, the guide's large step in
   `(min-width: 1750px) and (min-height: 1000px)`.
3. Exactly one counter-edge exists and it equals *(desktop threshold − 0.02)*.
4. No arbitrary `min-[Npx]:` variant survives in `src/**`. The named variant is the only route.

**Sabotage check, demonstrated in the task record:** reinstate one site at 1400, run the guard, show it
fails, revert. Per `AGENTS.md`, an important guard is counter-checked by deliberately breaking the seam
it protects. A guard that has never been seen to fail is not evidence.

---

## 6. Phone counter-proof

At **390 px**, DE **and** EN, across hub · shop · upgrade tree · level-up · stats:

- **Geometry fingerprint** — tag plus rounded bounding box per element, in document order. Class names
  are **excluded** from the comparison key, because commit 2 changes them by design. Expectation: 0
  structural differences.
- **Pixel comparison** — the existing text-mask / noise-threshold method from
  `scripts/viewport-proof.mjs`. Expectation: 0.0000 % beyond the noise threshold.

Both halves are captured before commit 1 and after commit 3, in the same browser, same flags, same
seeded state.

---

## 7. The rationale block that must be replaced

`src/index.css` currently states, above the desktop section:

> *Warum 1400 und nicht der `xl`-Standard 1280: das Spaltenpaar misst 1520 px. Bei 1280 bliebe kein
> Rand, der Entwurf klappt dort bewusst auf eine Spalte zurück. 1400 ist die erste Breite, bei der das
> Paar mit Luft steht (fluid gedeckelt, s. `.hub-pair`).*

This is a recorded decision that T1 overturns. Leaving it in place would put a justification next to
code that contradicts it. Replace it with the current reasoning: the itch.io embed at 1280×720, the
decision to show the desktop build there, and a pointer to this workstream.

**Language:** German, in place. This is existing source prose in a ratchet-guarded file; a
translation-only diff is explicitly avoided per `AGENTS.md`.

---

## 8. The measurement pass

### 8.1 Matrix

| Axis | Values |
| --- | --- |
| **Sizes** | 1280×720 (anchor) · 1400×700 · 1536×791 · 1600×900 · 1920×1080 |
| **Languages** | DE and EN. Single-language measurement produces an incomplete finding — the longest strings differ per language. |
| **Build** | Production (`npm run build` + `npm run preview`), real CDP viewport via `Emulation.setDeviceMetricsOverride`. **Not** the preview harness — it is `VITE_PREVIEW`-gated and absent from a production build. |

### 8.2 Surfaces

Hub · shop (packs / challenges / effects) · upgrade tree (general + faction) · guide · glossary ·
stats · leaderboard (global + ranked) · run details · victory screen · options · perk choice · skill
choice · **formation phase with buildings / architect contour** · architect · run dialogs (quit /
restart).

**Board state: the buildings / architect-contour state only.** This is a deliberate coverage
decision by the owner. It renders board, bars, bank and perk column, so the run-screen chrome is
covered, and it includes the SVG contour that is the known `zoom` hazard.

**Named measurement gap, to be repeated verbatim in the findings:** the *running trick* state is not
measured. It shows the trick-breakdown row, which the buildings state does not, and therefore places
*more* content in the same height. The empty formation-phase state is also not measured; it is
strictly less dense than the buildings state and is judged the lower risk of the two omissions.

### 8.3 Per surface × size × language, record

1. Page scrolling: yes/no and by how many pixels, both axes.
2. Overflow beyond the panel edge, in pixels, with the offending element.
3. Truncated text — `scrollWidth > clientWidth` under `text-overflow: ellipsis`, or `line-clamp` in
   effect — with source location.
4. Elements outside their panel. **Panel is defined as** the nearest ancestor carrying
   `overflow: hidden`, an `as-panel*` class, or its own background. This definition is fixed here so
   every later round measures the same thing.
5. **Text shrinkage:** every text node whose computed size at this width is smaller than the same
   node's computed size at 1920. This is the regression rule and it is the only text criterion T1
   enforces.
6. **Typography inventory** (input for strand S2, not a criterion here): per text node — computed
   size, weight, opacity, nearest panel ancestor, screen, language.

### 8.4 Reporting

Raw matrix as JSON evidence under `docs/workstreams/viewport-1280/evidence/`.

The prose findings table is **aggregated**: one row per surface carrying the **worst** value, plus the
language and size at which it occurred. Roughly 170 raw cells are not a readable finding. Sort by
damage, largest overflow first, and state a common-cause hypothesis wherever several surfaces show
the same shape.

---

## 9. Acceptance gate

1. Commit 2's compiled CSS is byte-identical to commit 1's — **shown in the record, not asserted.**
2. The completeness guard fails on a reinstated 1400 site — **demonstrated, not asserted.**
3. Phone at 390 px: 0 structural differences on geometry, 0.0000 % of pixels beyond the noise
   threshold, DE and EN.
4. The measurement script runs reproducibly from the repository and writes machine-readable evidence
   including the typography inventory.
5. Findings cover every listed surface × 5 sizes × 2 languages. **What was not measured is named** —
   including the two board states of §8.2.
6. Gates green, in this order, unpiped:

   ```bash
   npm test
   npm run lint -- --max-warnings=0
   npm run build
   npm run gen:db
   ```

   Plus the preview build, because `testViewport.js` and `TestViewportHarness.jsx` are preview-gated
   and CI builds both variants. A change that only breaks under `VITE_PREVIEW=1` otherwise surfaces in
   CI.

**Never pipe a gate command** unless failure propagation is preserved. `npm test | tail -20` reports
the exit code of `tail`.

---

## 10. Expected file surface

| Path | Change |
| --- | --- |
| `src/index.css` | `@theme` token; 13 media-query sites; the rationale block; prose |
| `src/ui/useIsWide.js` | `DESKTOP_MIN` derived from the token |
| `src/ui/{StartScreen,UpgradeScreen,CustomizeScreen,RunDetail,PrivacyModal,LeaderboardScreen,StatsScreen,OptionsModal,FeedbackModal}.jsx`, `src/App.jsx` | codemod `min-[1400px]:` → `dt:` |
| `src/i18n/de.js`, `src/i18n/en.js` | comment prose only — **no string changes**, so `npm run loc:export` is not triggered |
| `test/` — 20 files | computed anchor |
| `test/viewport-threshold.test.js` *(new)* | the completeness guard |
| `scripts/viewport-survey.mjs` *(new)* | the measurement probe |
| `docs/workstreams/viewport-1280/` | findings, evidence, task record |

If the change reaches outside this surface, that is a finding to report, not a licence to widen scope.

---

## 11. Known hazards carried into T1

1. **Source-text ratchets.** A substantial part of the suite reads `src/**` as raw text. Commit 2
   changes ~134 class names; commit 3 changes a number in ~13 CSS sites and ~250 comments. Read each
   failing assertion and decide whether *behaviour* changed or only *spelling*. **Never weaken a guard
   to reach green.**
2. **`i18n` comment prose.** `de.js` and `en.js` carry ~15 comments claiming "ab 1400 px". They are
   comments, not strings — but leaving them stale makes the localisation files lie.
3. **Windows / Git Bash.** `MSYS_NO_PATHCONV=1` is required for `revision:path` arguments. Prefer
   `git hash-object <path>` and `git show --raw <rev>` where they avoid the colon entirely.
4. **Scrollbar cascade.** At 1280 a vertical scrollbar leaves 1272 px of client width, so a surface
   that overflows slightly in height can also overflow in width. Record both axes; do not attribute a
   width overflow without checking the height first.
5. **Determinism.** The probe must reproduce the existing controls: `prefers-reduced-motion: reduce`,
   seeded `Math.random` before any application script, muted audio, telemetry off, minimal effect tier,
   a seeded username so the hub renders instead of the welcome dialog.
6. **`.gitattributes` is load-bearing.** When CI and local disagree, check line endings, case
   sensitivity and generated files before assuming a logic regression.

---

## 12. Definition of done

- Four commits, in order, each with its stated proof.
- Guard in place and seen to fail under sabotage.
- Phone counter-proof recorded, DE and EN.
- Measurement script committed and re-runnable.
- Findings written as an aggregated table sorted by damage, with named measurement gaps.
- All gates green including the preview build.
- Branch pushed. **No pull request** unless separately requested.
- Handoff note for Codex review in this directory.

**Not done** if any acceptance item is asserted rather than shown, or if a layout repair was made
along the way because it "was only one line".

---

## 13. Decisions on record

Carried from the planning report so this contract stands alone:

| Question | Decision |
| --- | --- |
| Anchor size | 1280 px window width. Criterion "no page scrolling" makes the 1272 case unreachable. |
| Scale of the fix | Durable, in one go. The named breakpoint is in T1; the architecture (R2/R3) is T2. |
| Surface licence | Frames may be resized or tightened — in T2, not T1. |
| Scrolling vs readability | Readability wins. In-panel scrolling is permitted; the outer document never scrolls. |
| Text criterion in T1 | Regression rule only: nothing smaller at 1280 than at 1920. |
| Absolute text sizes | Deferred to strand S2, driven by the T1 inventory. |
| Guide `--gs` | Removed — in T2. |
| Board state measured | Buildings / architect contour only; the two omissions named in §8.2. |
| Document language | English for this directory; German for in-place source prose. |
