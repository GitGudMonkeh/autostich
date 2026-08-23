# task-contract — mobile-tile-build (part 2: ship the chosen design)

Workstream `mobile-icons`, Tier C. Part 2 of two.

Part 1 (`../mobile-tile-design/`) measured the phone tile, built the comparison and ran the V3 gate.
This contract ships what the owner chose there. Read part 1's
[`findings.md`](../mobile-tile-design/findings.md) first — it carries the verdict, the measurements
and the two mistakes that are worth not repeating.

**The verdict, verbatim (2026-08-23):** „corner emblem it is. aber mit weniger ausfaden zur Mitte.
aber das ist ja Feintuning", and on the fade comparison sheet: **„less fade"**.

---

## Identity

| | |
| --- | --- |
| **Branch** | `task/mobile-tile-build`, under `feature/mobile-icons` |
| **Base** | `feature/mobile-icons` @ `899089ccb7724be37201a81547db5fef32c2d8e9` — read back at creation. **Not `dev`, and the draft's reasoning is superseded:** part 1 was integrated into the feature branch first, and the feature branch was then brought up to current `dev`, so branching from it is `git-workflow.md` §4's rule rather than a stack on an unmerged sibling. That base carries part 1's measurement and sheets, which part 2 reads |
| **Owner** | repository owner |
| **Integrator** | repository owner, through this session |
| **Reviewer** | none requested; review is optional and risk-based (`AGENTS.md` — *Independent review*) |
| **Concurrency** | one writer; sequential sessions may continue the task in the same worktree |

## Local workspace

| | |
| --- | --- |
| **Worktree** | `C:/Code/Autostich-worktrees/mobile-tile-build` — read back from `git rev-parse --show-toplevel` |
| **Preview port** | `5188` — 5186 is held by `icon-position-review` (invisible to a cockpit grep, it lives on that branch), 5187 by part 1 |
| **Server invocation** | `npm run dev -- --port 5188 --strictPort` |

## Scope

**S1 — baseline.** `npm ci`, then `npm test`, recorded verbatim before the first edit. Part 1 measured
it green (138 files / 2149 tests, exit 0) on `2eddf9d3`; re-measure rather than inherit, because the
base moves.

**S2 — V1 capture.** Before the first pixel moves. Set by D3: **390 × 844, German and English, all
three selection screens, DPR 1.** `docs/workstreams/mobile-icons/mobile-tile-design/tile-width-probe.mjs`
already drives all three screens at phone widths and is the shortest route to a capture that matches
V2.

**S3 — the emblem.** Render the tile emblem below 640 px, in the tile's top-right corner, to the
values in *Approved architecture*. Three screens, one shared rule.

**S4 — the ornament.** One corner ornament per card head below 640 px instead of the mirrored pair
(D5), at its unchanged baked 300 px width.

**S5 — the proof that nothing above 640 px moved.** Rule applicability plus geometry, per H8.

**S6 — V2, V3, V4.** Same sizes, same state, same languages as V1; the human gate; the classification
table.

## Non-goals and tripwire

| Non-goal | Why |
| --- | --- |
| Any visible change at or above **640 px** | D3 — phones only. The desktop is V3-approved and the 640–1279 band is out of scope |
| The banner variant | Rejected at V3 |
| Re-baking any lot, or adding a mobile lot | Settled — see *The bloom question is closed* below |
| `object-position` on the mobile emblem | Has no effect here — see the same section |
| New icons, glyphs or artwork | `AGENTS.md` house rule; the drawing is final |
| Touching `icon-position-review` or resolving its part 2 | D2 |
| Moving a breakpoint number | Owner decision (`task-lifecycle.md` §4). 640 px is Tailwind's existing `sm:` |

**Tripwire.** If the diff changes `.sk-strip`, `.pk-strip`, `.pk-strip-mid`, `.co-corner` or
`CardCorners` such that the change takes effect **at or above 640 px** — stop. The mobile rules live
in their own `@media (max-width: 639.98px)` block, never as an edit to the existing bodies.

## Approved architecture

Binding. The values come from the V3 gate and from part 1's measurement, not from this document's
judgement.

1. **The emblem is a fixed 88 × 88 px box in the tile's top-right corner, flush** (`inset 0`), outside
   the text flow, painted **under** the badges. Not the bleeding sub-variant: the verdict named the
   column that does not carry the word „bleeding".
2. **The mask is** `radial-gradient(120% 120% at 100% 0%, #000 58%, transparent 88%)` — the „less
   fade" column. The no-fade control on that sheet is why a mask exists at all: without one the emblem
   ends on its own square edge and the motif is cut by a straight line.
3. **`mix-blend-mode: screen`, no `filter`.** The ground is black, not transparent, and the bloom is
   baked into the files. A runtime blur here would be raster work on the `phase:levelup` mount, which
   already costs 271–417 ms.
4. **No padding is added and no type size changes.** The tile keeps the box it has today. The text is
   lifted with `position: relative` on the tile's non-image children, exactly as `.co-head` lifts the
   card head above the corner ornaments. **This is verified numerically, not by eye** — part 1's D4
   check is the pattern, and it caught a 297 px regression that still looked plausible on screen.
5. **The gate is a phone query, not the negation of the desktop one.** `!wide` would light up the
   640–1279 band, which D3 excludes. The three screens keep an explicit boolean so the breakpoint
   stays a one-line change.
6. **One ornament per head below 640 px**, by hiding the mirrored copy in CSS.
   `src/ui/CardCorners.jsx` keeps exactly two `<img>` elements — `test/corner-art.test.js:300` asserts
   that — and both copies share one `src`, so this costs no additional fetch. The ornament keeps its
   baked 300 px: measured, a single copy fits the card head from a **334 px** viewport upward. Below
   that the right ~14 px are clipped at the card's padding edge, which is dark area (the masters' light
   runs out at ~213 px, `docs/art/corners/README.md`) — confirm on the 320 px capture rather than
   assume.

### The bloom question is closed, and the alignment step is gone

Two things follow from a **fixed, square** emblem, and both remove work this workstream expected to do.

**No anchor, no alignment.** All 112 tile emblems ship as 384 × 384 squares
(`scripts/skill-art-build.py`: the skill, `perkcats` and `legendaries` lots are square). `object-fit:
cover` of a square source into a square box crops nothing, so `object-position` has no effect and there
is no framing decision left to make. **The emblem alignment that part 2 was scoped to do does not
exist for this design.** It was real for the banner, which crops a wide slice out of a square; the
verdict removed it.

**No mobile lot, and not as a judgement call.** The baked bloom scales with the image, so what is fixed
is the *proportion*:

| | emblem width | bloom, as a share of it |
| --- | --- | --- |
| desktop skill zone | 277 px | 5.78 % |
| desktop perk zone | 265 px | 6.04 % |
| **mobile, 88 px** | 88 px | **5.78 % / 6.04 %** |

Identical. The emblem is smaller; the picture is the same picture. The bloom drift that made a second
baked lot thinkable was a property of *fluid* widths, where the proportion moves across the band. A
fixed box does not have it.

## Task-specific inputs

- **Screens:** `SkillSelect`, `PerkSelect`, `LegendarySelect`.
- **Band:** below 640 px. One tile per row on all three screens, measured.
- **Measured tile padding box** (phone, overlay scrollbars — `../mobile-tile-design/visual/M-tile-widths.json`):

  | Viewport | Skill | Perk | Legendary |
  | --- | --- | --- | --- |
  | 320 | 245 | 233 | 249 |
  | 390 | 315 | 303 | 319 |
  | 480 | 405 | 393 | 409 |
  | 639 | 564 | 552 | 568 |

  The emblem is fixed, so these are not zone inputs any more. They stay because they are what proves
  the emblem does **not** scale with them, and because the ornament's 334 px floor comes out of the
  same table.
- **Emblem inventory:** 112 — 84 skills, 21 legendary perks, 7 perk categories.
- **Languages:** German and English at 390 px.

## Acceptance gate

> On a 390 × 844 phone, all three selection screens show their emblems in the tile's top-right corner
> and one ornament in the card head, at the authored values — **and every tile's box and type sizes are
> byte-identical to V1**, shown as numbers rather than asserted.
>
> The task fails if anything renders differently at or above 640 px, or if a tile changed size.

## Expected file surface

```
src/index.css                       # one @media (max-width: 639.98px) block, appended
src/ui/SkillSelect.jsx              # the gate boolean
src/ui/PerkSelect.jsx               # the gate boolean
src/ui/LegendarySelect.jsx          # the gate boolean
test/skill-art.test.js              # H4 — rewritten guard + counter-check
test/perk-art.test.js               # H4 — rewritten guard + counter-check
test/leg-gleich.test.js             # H4 — rewritten guard + counter-check
docs/workstreams/mobile-icons/mobile-tile-build/**
```

`src/ui/CardCorners.jsx` should **not** need to change: D5 is a CSS rule, not a prop.

## Known hazards

| | Hazard | Resolution required |
| --- | --- | --- |
| H4 | Three source-text ratchets assert the exact gate lines and **will go red by design**: `test/skill-art.test.js:122` (`const art = wide ? skillArt(id) : null;`), `test/perk-art.test.js:198–199`, `test/leg-gleich.test.js:59`. Their invariant — „no phone loads these images" — is what this task deliberately reverses | Rewrite each to assert the NEW invariant (the emblem is gated on a phone query, and the desktop gate is untouched), and **counter-check every rewritten guard** by breaking the seam and proving it fails (`testing.md` §5). Never weaken, never delete |
| H4b | `test/corner-art.test.js:231` pins `.co-corner`'s CSS width to the bake's `strip_w`, and `:300` pins CardCorners to exactly two `<img>` | Both hold under the approved architecture. If either goes red, the design drifted — stop and read the assertion before touching it |
| H1 | `icon-position-review` part 2 edits `src/index.css` and the same three screens | D2: not waited for, not touched. The overlap is **textual, not semantic** — its rules are desktop-only `object-position`, ours are a phone-only block. Whichever lands second rebases. Re-check `git rev-list --count dev..task/icon-position-review` before the first commit |
| H8 | Nothing may change in the 640–1279 band | Prove by rule applicability — every added rule sits inside `max-width: 639.98px`, and the JSX gate is a phone query rather than `!wide`, so that band's rule set and DOM are identical before and after. `scripts/phone-proof.mjs` calls this proof 1 and it is the cheap one that catches a real regression |
| H9 | The card scrolls, and a classic desktop scrollbar takes layout width | Already measured in part 1: it costs 16 px on the scrolling screens. The emblem is fixed-size, so it does not move with it — but a V2 captured with classic scrollbars will not match a V1 captured without. Capture both halves the same way |

## Definition of done

- [ ] `npm ci`; `npm test` baseline recorded verbatim before the first edit
- [ ] V1 captured at 390 × 844, both languages, three screens, DPR 1, before the first edit
- [ ] The emblem renders below 640 px on all three screens, at the authored values
- [ ] One ornament per head below 640 px; `test/corner-art.test.js` still green
- [ ] D4 proven numerically: every tile's box and type sizes identical to V1
- [ ] H8 proven by rule applicability, with the command that reproduces it
- [ ] Every rewritten guard counter-checked, and the counter-check recorded
- [ ] `npm test`, `npm run lint -- --max-warnings=0`, `npm run build`, `npm run gen:db`
- [ ] V2 captured, V3 passed by the owner, V4 classification table written
- [ ] Every hazard marked measured / not measured with reason / not applicable
