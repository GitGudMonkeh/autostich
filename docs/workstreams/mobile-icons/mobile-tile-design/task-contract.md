# task-contract — mobile-tile-design (part 1: the variant comparison)

Workstream `mobile-icons`, Tier C. Planning report: [`planning-report.md`](./planning-report.md).

Tier C because the work introduces a new tile design across three selection screens and runs through
several design rounds, each needing its own V3 (`task-lifecycle.md` — *Tier C*).

**This contract covers part 1 only.** Part 1 produces the surface on which the design is chosen. Part 2
— implementing the chosen design in the application and aligning the emblems inside it — gets its own
contract once the owner has picked a variant at V3.

The owner's decisions of 2026-08-23 are recorded in the planning report as D1 (two variants: banner and
a top-right corner emblem), D2 (no interaction with `icon-position-review`), D3 (phones only, below
640 px), D4 (no tile and no type may change size) and D5 (one ornament per head, not the mirrored pair).
They are binding here.

---

## Identity

| | |
| --- | --- |
| **Branch** | `task/mobile-tile-design`, under `feature/mobile-icons` |
| **Base** | `feature/mobile-icons` @ `2eddf9d3eceb2168851481a38cd228dd3c602045` — verify at creation; this is `origin/dev` at the time of planning |
| **Owner** | repository owner |
| **Integrator** | TODO — staffing is a decision, not a derivation (`AGENTS.md` — *Roles and source of truth*) |
| **Reviewer** | none requested; review is optional and risk-based (`AGENTS.md` — *Independent review*) |
| **Concurrency** | one writer; sequential sessions may continue the task in the same worktree |

## Local workspace

| | |
| --- | --- |
| **Worktree** | `C:/Code/Autostich-worktrees/mobile-tile-design` — read back from `git rev-parse --show-toplevel` |
| **Branch checked out there** | `task/mobile-tile-design` |
| **Upstream** | none — the branch deliberately does not track its base |
| **Preview port** | `5187` |
| **Preview URL** | `http://localhost:5187/scripts/mobile-tile-sheet.html` |
| **Server invocation** | `npm run dev -- --port 5187 --strictPort` |

**Not 5186.** That port is pinned by `icon-position-review`'s contract, which lives on
`task/icon-position-review` and is therefore invisible to the cockpit's
`grep -rn "Preview port" docs/workstreams`. Under D2 the two tasks run independently, so they must not
share a port.

## Scope

In this order.

**S1 — baseline.** Run `npm ci` in the worktree, then measure the current `npm test` result and record it
verbatim in the definition of done, before the first edit. H6 exists because a pre-existing failure read
as a self-inflicted one costs an afternoon.

**S2 — the measurement (deliverable M).** Read the rendered tile width and emblem-box width for all three
selection screens out of the **running application** at 320 / 390 / 480 / 639 px, DPR recorded. Those four
span the phone band, which is fluid: the derivation predicts a 2.4× spread from bottom to top, and the
Banner variant's `max-width` cap depends on the real number. No emblem is needed for this — the emblem box
is the tile's padding box. Output a short table plus a JSON sidecar under
`docs/workstreams/mobile-icons/mobile-tile-design/visual/`.

**S3 — the sheet (deliverable S).** `scripts/mobile-tile-sheet.{mjs,html,page.js}`: a standalone page
served by the Vite dev server that imports the real `src/index.css` and the real art modules, builds the
tile markup at the widths S2 measured, and renders each variant as a **whole card** — head with ornaments
plus a **row of real tiles** — for each of the three screens. Capture one PNG per screen per variant
through `scripts/cdp.mjs`, plus a sidecar with the read-back geometry and a SHA-256 per image.

**S4 — the V3 round.** Present the sheets for the design decision. The verdict is transcribed verbatim
with its date into the findings document, per `task-lifecycle.md` — *A finding is not a finding until it
has an ID*.

### The variants (D1)

Two. Neither may add a pixel to the tile or change a type size (D4).

| | Description |
| --- | --- |
| **Banner** | Full-width strip **behind** the badge row and the name, masked out before the description, `max-width` capped so the emblem does not grow with the viewport. It adds no padding: the text is lifted with `position: relative`, the way `.co-head` already lifts the card head above the corner ornaments. The desktop's push-down banner (`padding-top: 176px`) is **not** on the sheet — D4 excludes it |
| **Corner emblem** | Fixed motif in the tile's **top right**, outside the text flow, in the space the badge row leaves free — the owner's variant |

The medallion is dropped (D1).

## Non-goals and tripwire

| Non-goal | Why |
| --- | --- |
| Any change under `src/` | Part 1 shows designs; it does not ship one |
| Any visible change at or above **640 px** | D3 — phones only. The desktop was already V3-approved; the 640–1279 band is now out of scope as well |
| Any change to `icon-position-review` or the files its part 2 will edit | D2 |
| New icons, glyphs or artwork | `AGENTS.md` house rule; the drawing is final |
| Choosing the anchor for any emblem | That is part 2, and doing it first throws it away |
| Re-baking any lot | See the planning report's irreversible decision |
| Moving a breakpoint number | Owner decision (`task-lifecycle.md` §4); not proposed. 640 px is Tailwind's existing `sm:`, not a new number |

**Must-not-touch, verifiable by blob hash:** `src/index.css`, `src/ui/SkillSelect.jsx`,
`src/ui/PerkSelect.jsx`, `src/ui/LegendarySelect.jsx`, `src/ui/CardCorners.jsx`, `src/ui/useIsWide.js`,
`scripts/skill-art-build.py`, `test/perk-art.test.js`, and everything under `src/assets/`.

**Tripwire.** If `git status --porcelain -- src/ test/ scripts/skill-art-build.py` returns anything at
all — stop. Part 1 writes only under `scripts/mobile-tile-sheet.*` and
`docs/workstreams/mobile-icons/mobile-tile-design/`.

## Approved architecture

Binding, not suggestions.

1. **The sheet is a standalone page against the dev server**, on the shape of
   `scripts/icon-contact-sheet.{mjs,html,page.js}`. It imports from `src/` and writes nothing there.
2. **The real stylesheet lays the tiles out.** No zone number is copied from `src/index.css` into the
   sheet. Numbers are read *back* out of the DOM and printed into the sidecar.
3. **No new dependency.** Chrome is driven through `scripts/cdp.mjs`, as the viewport proof and the
   contact sheet already do.
4. **Determinism**: `deviceScaleFactor` 1 so one image pixel is one CSS pixel; `prefers-reduced-motion`
   emulated; fonts awaited and every emblem `decode()`d before capture; no timestamp and no SHA drawn
   into an image; the render flags the contact sheet measured
   (`--disable-gpu`, `--force-color-profile=srgb`, `--font-render-hinting=none`, `--disable-lcd-text`).
5. **The sheet shows whole cards, not tiles in isolation.** The corner ornaments cannot survive the move
   unchanged — two 300 px copies overlap by ~242 px on a 358 px head and add light through
   `mix-blend-mode: screen` — so head and tiles are judged together or the judgement is incomplete.
6. **Each variant is shown as a row of real tiles including its decisive case.** For the corner emblem
   that is the **fullest badge row** on each screen — a perk offer with category, tier and upgrade
   badges, a skill offer with faction, consumer and legendary badges — because the badge row is what
   eats the free top-right corner. For the banner it is the **longest description**, which the mask must
   clear. A sheet that shows neither shows both variants at their best rather than at the moment that
   decides them.
7. **D4 is proven numerically, not by eye.** For every tile the sheet records the bounding box and the
   computed font size of the badge, name and description rows **with and without** the emblem, and prints
   both sets into the sidecar. A variant whose numbers differ has failed D4 regardless of how it looks.
8. **One ornament per card head below 640 px** (D5), achieved by hiding the mirrored copy in CSS.
   `CardCorners.jsx` keeps exactly two `<img>` elements, so `test/corner-art.test.js:300` stays green,
   and both copies share one `src`, so this costs no additional fetch. **The ornament keeps its baked
   300 px width** — a single copy fits the head from a 332 px viewport upward, so no mobile ornament
   zone is introduced and `test/corner-art.test.js:231`, which pins the CSS width to the bake's
   `strip_w`, keeps holding. The 320 px capture exists to answer the one case this leaves open.
9. **The measurement drives the real application**, reached through a dev run under `VITE_PREVIEW=1`
   (H7). If a screen cannot be reached, that is reported as a limit of the evidence, not worked around
   with a hand-set width.

## Task-specific inputs

- **Screens:** `SkillSelect`, `PerkSelect`, `LegendarySelect`.
- **Band:** below 640 px — one tile per row on all three screens. 390 × 844 is canonical
  (`scripts/phone-proof.mjs` checks against exactly that).
- **Widths to measure and render:** 320 / 390 / 480 / 639 px.
- **Derived emblem-box widths, to be confirmed by M:** perk ~235 / ~305 / ~395 / ~554 px; skill and
  legendary ~251 / ~321 / ~411 / ~570 px.
- **Emblem inventory:** 112 — 84 skills, 21 legendary perks, 7 perk categories. A drift in that count
  means artwork arrived or an emblem stopped resolving, and either way the sheet no longer shows what the
  gate asks for.
- **Desktop zones for comparison:** `.sk-strip` 210 px tall at `strip_w` 277; `.pk-strip` 201 px tall at
  `strip_w` 265; `.co-corner` 300 × 115.
- **Languages:** German and English at 390 px. Tile height depends on text length and the two differ.

## Acceptance gate

> One sheet per screen per variant, captured across the phone band from the real stylesheet, each showing
> a whole card and a row of real tiles including that variant's decisive case — from which the owner can
> pick a tile design in a single pass. Plus the measured tile widths that part 2's zone arithmetic will
> divide by, and the with/without geometry that proves D4.
>
> The task fails if the widths in the sheet were assumed rather than measured, if a variant is shown that
> changes a tile's box or a type size, or if any file under `src/` or `test/` changed.

## Expected file surface

Indicative. Anything outside it is recorded and reported before it is changed.

```
scripts/mobile-tile-sheet.mjs
scripts/mobile-tile-sheet.html
scripts/mobile-tile-sheet.page.js
docs/workstreams/mobile-icons/mobile-tile-design/task-contract.md
docs/workstreams/mobile-icons/mobile-tile-design/planning-report.md
docs/workstreams/mobile-icons/mobile-tile-design/findings.md
docs/workstreams/mobile-icons/mobile-tile-design/visual/*.png
docs/workstreams/mobile-icons/mobile-tile-design/visual/*.json
```

Committing captured images is justified here under `task-lifecycle.md` — *Committing evidence*: the
finding **is** visual, and the owner's verdict is given against these exact images. Keep them as small as
the judgement allows and record a SHA-256 per image in the sidecar, so a re-run is checkable without a
second copy of the pictures.

## Known hazards

Each is marked **measured**, **not measured and why**, or **not applicable** before handoff
(`task-lifecycle.md` §11).

| | Hazard | Resolution required |
| --- | --- | --- |
| H1 | `task/icon-position-review` part 2 will edit `src/index.css` and the same three screens | **Not applicable to part 1, measured.** D2: not waited for, not touched. Blob hash proves all four files byte-identical to the base. Carried into part 2's contract as a live hazard, where the overlap is textual and not semantic |
| H1b | `test/perk-art.test.js` is also on that collision surface (:223, :300, :302) | **Not applicable to part 1, measured** — blob hash unchanged. On part 2's hazard list |
| H2 | Below 1280 px no `<img>` exists at all — first placement, not adjustment | **Measured live, 2026-08-23** — `ornaments: 0` and `hasImg: false` on every tile at every width in `M-tile-widths.json`. Carried into part 2's contract |
| H3 | The phone band is fluid, and the baked bloom divides by the render width | **Measured, 2026-08-23** — `visual/M-tile-widths.json`. Phone case: skill 245/315/405/564 px, perk 233/303/393/552 px, legendary 249/319/409/568 px at 320/390/480/639 px. +14 % over the baked zone at 390 px, +105 % at 639 px, spread 2.3×. The Banner's `max-width` cap is load-bearing, not a refinement |
| H4 | **Not applicable to part 1** — no `src/` or `test/` change, blob hash verified. Named for part 2, which reverses their invariant and must rewrite and counter-check each. Original entry: Source-text ratchets: `test/skill-art.test.js:122`, `test/perk-art.test.js:198–199`, `test/leg-gleich.test.js:59`, `test/corner-art.test.js:231`, `CardCorners.jsx` two-`<img>` guard | Not applicable to part 1 (no `src/` or `test/` change); named so part 2 plans their rewrite and counter-check rather than discovering them |
| H5 | `scripts/icon-contact-sheet.*` is on `task/icon-position-review`, not on `dev` | **Measured — it was a template, not a dependency.** Part 1 wrote its own sheet from its shape and needed nothing from that branch. One consequence surfaced instead: `launch()` in `scripts/cdp.mjs` takes no render flags on this base, so the determinism flags could not be passed. Recorded in `findings.md` under the limits of the evidence |
| H6 | `npm test` baseline unknown | **Measured, 2026-08-23, in this worktree: green.** `npm test` (`vitest run`) — 138 files, 2149 tests, all passed, exit 0, 45.83 s. The load-dependent `test/i18n-guards.test.js` timeouts the `icon-position-review` contract reported did **not** reproduce, and no `--testTimeout` override was needed. Any red run from here on is this task's own |
| H7 | The three screens are not reachable from a hub click path | **Measured, 2026-08-23 — all three reachable.** Not via a dev run: round 1 and 2 are played from a seeded run, the legendary phase is resumed into from a real run state, and the application needs its „Lauf fortsetzen" click because it does not auto-resume |
| H8 | D3 leaves the 640–1279 band with no emblems and no ornaments | **Not applicable to part 1** — it changes no rule at any width. Carried into part 2's contract, which proves it by rule applicability: every added rule sits below 640 px and the JSX gate is a phone query, not `!wide` |

## Definition of done

Ticked only when true.

- [x] `npm ci` ran in this worktree (exit 0); the `npm test` baseline is recorded verbatim, with the
      command — see H6: green, 138 files / 2149 tests, exit 0
- [x] Deliverable M: measured tile and emblem-box widths for three screens at 320 / 390 / 480 / 639 px,
      DPR recorded — `visual/M-tile-widths.json`, both scrollbar modes, written up in `findings.md`
- [x] Deliverable S: one PNG per screen per variant, whole card, row of real tiles including that
      variant's decisive case, plus the sidecar with read-back geometry and SHA-256
- [x] D4 proven: tile bounding boxes and computed font sizes are identical with and without the emblem,
      for every tile on the sheet, and the two sets are in the sidecar
- [x] The sheet hard-codes no number that also lives in `src/index.css`
- [x] `git status --porcelain -- src/ test/` is empty, and the must-not-touch list is verified by blob hash
- [x] `npm test`, `npm run lint -- --max-warnings=0`, `npm run build`, `npm run gen:db` — reported under
      `AGENTS.md` House rules, against the recorded baseline
- [x] The V3 verdict is transcribed verbatim with its date into `findings.md`
- [x] Every hazard above is marked measured / not measured with reason / not applicable
- [x] Part 2's contract is drafted from the verdict, carries D2's rebase note, and names the V1 baseline
      set: 390 × 844, both languages, all three screens, DPR 1

## Open questions

Owner-facing: none blocking. D1–D5 settled the decision block on 2026-08-23. One reading is recorded
rather than asked, because it is correctable in a word at the visual gate: D4 is taken as *nothing may
change size*, which removes the desktop's push-down banner from the sheet. If it meant only *nothing may
shrink*, the push-down banner returns as a third row and the sheet is re-captured — cheap, because the
harness is parameterized by variant.

Worker-facing, resolved during the work and recorded, not escalated:

- Whether the legendary phase can be reached in a dev run, or only its skill and perk siblings (H7).
- Where the Banner's `max-width` cap sits — chosen at the device once M has the real widths.
- Whether the corner emblem bleeds off the tile edge or sits fully inside it; both go on the sheet if the
  capture budget allows, otherwise the bleeding one, which is the harder case for the tile's `overflow`.
- Whether the corner emblem sits above or below the badge row in paint order when the two do overlap.
  Below is the assumption — the badges carry text — and the sheet shows the collision either way.
