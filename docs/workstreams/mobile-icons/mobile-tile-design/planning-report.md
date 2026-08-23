# mobile-tile-design — planning report

Workstream `mobile-icons`, Tier C. Part 1 of two.
Contract for part 1: [`task-contract.md`](./task-contract.md).

---

## Decisions taken

The decision block was answered on 2026-08-23. Recorded here rather than restated as open questions,
per `task-lifecycle.md` — *A finding is not a finding until it has an ID*.

**D1 — the variant set: two.** Banner, plus a **corner emblem** the owner specified in place of the
proposed watermark. The medallion is **dropped**: *„nur banner und Eck emblem. brauchen das icon nicht
zweimal"* — it and the corner emblem are the same move twice, a fixed-size whole motif beside the text,
and only the flow differs. Both remaining variants are shown on all three screens.

The corner is the **top right**, revised by the owner after a second look: *„ich hab nochmal geschaut
emblem oben rechts, da ist am meisten Platz"* (first stated as bottom right, *„da ist meistens Platz"*).
The revision is the better one and it also moves the variant's failure case. Bottom right depends on
where the description happens to stop, which varies per tile; top right depends on the badge row, which
is short on most tiles but not on all — a perk offer carrying category, tier **and** upgrade badges, or
a skill offer carrying faction, consumer and legendary badges, fills that row. **That tile, not the one
with the longest description, is now the decisive case on the sheet.**

**D2 — no interaction with `icon-position-review`.** Owner: *„icon-positin ist eine desktop rework wird
hier nicht angefasst"*. That task is neither waited for nor touched. The consequence for part 2 is
recorded under H1 — the files overlap textually while the rules do not overlap at all.

**D3 — phones only.** Owner: *„NUR mobile"*. Scope is the band **below 640 px**, authored and captured
at 390 × 844. The 640–1279 px band keeps exactly what it has today: no emblems, no ornaments. That is
now a tripwire rather than a preference — see *Non-goals and tripwires*.

**D4 — nothing may change size.** Owner: *„die Kacheln und Text sollen nicht in Größe verändert
werden"*. The tile's box and every type size in it stay exactly as they are today. The emblem is added
**around** the existing layout, never by making room in it.

This is the constraint with the longest reach in the whole workstream, and it rewrites one of the two
variants. On the desktop the banner is not an overlay: `.sk-offer-art` adds `padding-top: 176px` and
pushes the badges, the name and the description down. Carried over literally, that grows every mobile
tile by the height of the zone, which D4 forbids.

The mobile banner is therefore re-specified: **a strip that sits behind the top of the tile**, under the
badge row and the name, masked out before the description — the same move the corner ornaments already
make in the card head, where `.co-head` lifts the text above the artwork and nothing shifts. It adds no
padding and changes no box.

What that excludes, stated plainly so it is not rediscovered at the gate: the desktop's push-down banner
is not on the sheet. If the intent was only "do not shrink anything", say so and the pushing banner
returns as a third row.

**D5 — one ornament per head, not the mirrored pair.** Read from the same sentence as D1 and applied to
the card head, where the pair is a real problem rather than a redundancy: two 300 px copies on a 358 px
head overlap by ~242 px and add light through `mix-blend-mode: screen`. Dropping the mirrored copy below
640 px solves it without inventing a mobile ornament size. Implemented by hiding the right copy in CSS
rather than by a prop, so `CardCorners.jsx` keeps exactly two `<img>` elements and its guard
(`test/corner-art.test.js:300`) stays green; both copies share one `src`, so the phone still fetches one
image.

---

## The one decision that is not cheap to correct later

**Whether the phone gets its own baked emblem lot.**

Every other choice in this workstream is a line of CSS: zone heights, anchors, how the breakpoint is
wired, which variant wins. A second baked lot is not. The bloom is baked into the delivery files at a
radius derived from the CSS width the emblem is drawn at — `sigma = bloom_css * size / strip_w` in
`scripts/skill-art-build.py`. A lot baked for a second width means 112 additional delivery files in
Git permanently, a second `strip_w` per lot in the bake table, and a second set to re-align whenever
the artwork changes.

D3 makes this sharper rather than softer, because the phone band is **fluid** and its spread is wide
(next section): a fluid emblem has no single width to bake against at all. The two fixed-width variants
do, and one of them is the width the desktop already bakes for.

Recommendation to whoever takes part 2: **do not bake a mobile lot.** If a variant wins whose emblem is
much smaller than the desktop zone, answer the thin glow with display-side compensation — opacity,
contrast — and record it, before a re-bake is proposed.

---

## Where the work stands today

Read out of the source on `dev` at `2eddf9d3` — **measured against the repository, not against a running
application.**

### There is nothing to adjust below 1280 px

The gate is in JSX, not in CSS, so no `<img>` exists on a phone at all:

| Screen | Emblem gate | Ornament gate |
| --- | --- | --- |
| `src/ui/SkillSelect.jsx` | `const art = wide ? skillArt(id) : null;` (:456) | `{wide && curG && <CardCorners …>}` (:211) |
| `src/ui/PerkSelect.jsx` | `const art = inWings ? perkArt(v) : null;` (:121) | `{inWings && <CardCorners …>}` (:86) |
| `src/ui/LegendarySelect.jsx` | `const art = wide ? skillArt(s.id) : null;` (:176) | `{wide && curG && <CardCorners …>}` (:83) |

`wide` and `inWings` are both `useIsWide()`, i.e. `matchMedia("(min-width: 1280px)")`
(`src/ui/useIsWide.js`). Correcting the briefing on one point: **the legendary screen does carry corner
ornaments** — `LegendarySelect.jsx:83`, and `test/corner-art.test.js` asserts that all three screens use
the shared component. All three parts of the scope therefore apply to all three screens.

### The desktop zones, and what they were divided by

| Lot | CSS zone | Baked `strip_w` | Delivery | Baked sigma |
| --- | --- | --- | --- | --- |
| skills | `.sk-strip`, 210 px tall | 277 | 384 px | 22.18 px |
| perkcats / legendaries | `.pk-strip`, 201 px tall | 265 | 384 px | 23.19 px |
| corners | `.co-corner`, 300 × 115 | 300 | 600 × 400 | 32.00 px |

The perk zone width of 265 was measured in the running application by `icons-perks`; the skill lot's 277
predates that measurement and was never re-derived. **Observed, not resolved:** by the same arithmetic
the perk task used (tile 270.66 minus the 4 px rarity edge and a 1 px edge) the skill emblem is drawn at
about 265.7 px, not 277, which would put the shipped skill radius at ~16.7 authored css-px instead of 16.
That is a desktop question and out of scope here. It is recorded so part 2 does not later discover it and
file it as its own defect.

### The phone band is fluid, and the spread is 2.3x

> **Superseded by measurement, 2026-08-23.** The derivation below was written before the worktree
> existed. Deliverable M has since measured all three screens across the band in the running
> application — see [`findings.md`](./findings.md) — and **the measured table is what part 2 authors
> against.** The derivation is kept because its *shape* held (the band is fluid, the phone tile is
> wider than the desktop tile) while two of its numbers did not, and because the difference between
> the two is itself the finding: a classic desktop scrollbar takes layout width and a phone's overlay
> scrollbar does not, so a plausible desk calculation and a plausible desktop measurement can both be
> the wrong number for the device the design is for.
>
> Measured, phone case, tile padding box: skill 245 / **315** / 405 / 564 px and perk 233 / **303** /
> 393 / 552 px at 320 / 390 / 480 / 639 px. At the canonical 390 px that is **+14 %** over the baked
> zone, not the +15–16 % derived below.

This is the finding that most shapes the design, and D3 does not remove it — it concentrates it.

`.lv-cardwrap` is `w-full max-w-3xl` and `.lv-rig` is `display: contents` below 1280 px, so the card is
`viewport − 32` throughout the phone band. One tile per row below 640 px. The emblem box is the tile's
padding box: the tile minus the 4 px rarity edge and 1 px.

| Viewport | Perk emblem | Skill / legendary emblem |
| --- | --- | --- |
| 320 px | ~235 px | ~251 px |
| **390 px** (canonical) | **~305 px** | **~321 px** |
| 480 px | ~395 px | ~411 px |
| 639 px (top of the band) | ~554 px | ~570 px |
| desktop, for comparison | 265 px | 277 px baked |

Three consequences:

1. **H3 is confirmed in direction.** The one-column phone tile is *wider* than the desktop tile, not
   narrower — at the canonical 390 px already, and by a factor of two at the top of the band.
2. **A fluid full-width emblem has no stable zone.** The Banner variant needs a `max-width` cap, or at
   639 px it renders a 554 px emblem and the baked 16 css-px bloom reads as 33 css-px. The cap turns the
   Banner into a fixed zone above roughly 430 px, which is a design constraint, not an implementation
   detail — it goes on the sheet.
3. **The two fixed-width variants sidestep it entirely.** Their emblem is the same size on a 320 px
   phone and a 639 px window; only the text around it reflows.

These numbers are **inferred from the stylesheet and the JSX, not read off a running application.**
Confirming them is a named deliverable of part 1, because `icons-perks` already recorded what happens
when a zone width is taken from the grid instead of from the element: a bloom radius that is
authoritative and wrong.

### The corner ornaments cannot come across unchanged

`.co-corner` is a fixed 300 × 115 box, anchored left, mirrored right. On a 358 px card head the two
copies overlap by ~242 px, and they are composited with `mix-blend-mode: screen`, so the overlap adds
light — a bright smear behind the title rather than two ornaments.

**D5 turns out to solve this without a mobile zone at all**, which was not obvious when the hazard was
written. A single ornament at its baked 300 px still fits inside the card head from a viewport of
**332 px** upward (300 px plus the card's 32 px of page padding). So the phone keeps the desktop's zone
width, the bake's `strip_w` stays the CSS width, and `test/corner-art.test.js:231` — which pins those
two to each other — keeps holding. Nothing is re-baked and no second ornament number enters the
codebase.

Below 332 px the single ornament overhangs the head. That is what the 320 px capture is for, and it is
the one open ornament question the sheet has to answer rather than assume.

The sheet therefore shows **whole cards**, not tiles in isolation: head and tiles are judged together
or the judgement is incomplete.

---

## The two steps, and why part 1 touches no application source

Part 1 answers "which design". Part 2 answers "where exactly does each motif sit inside it". Doing them
in the other order throws the alignment away, because the anchor that is right for a 2.8:1 banner is not
the anchor that is right for a square emblem in a tile corner.

Part 1 therefore has to *show* designs, not ship them. The route chosen is the one this repository has
already used for exactly this question.

### Chosen: a standalone sheet page against the dev server, read-only against `src/`

`scripts/mobile-tile-sheet.{mjs,html,page.js}`, built on the shape of
`scripts/icon-contact-sheet.{mjs,html,page.js}` (which currently lives on `task/icon-position-review` —
see H5). It serves a page from the Vite dev server that imports the real `src/index.css` and the real art
modules, builds the tile markup at the measured phone widths, renders each variant, and captures one PNG
per screen per variant through `scripts/cdp.mjs`.

Why this one:

- It changes nothing under `src/`, so D2 holds by construction rather than by care.
- The real stylesheet lays the tiles out, so the sheet cannot drift from the CSS by hard-coding it.
- The precedent is proven on this exact surface, including the determinism flags a `mix-blend-mode`
  capture needs (`--disable-gpu`, `--force-color-profile=srgb`, unhinted text).

Its cost, stated plainly: the tile markup is a **second copy** of the JSX class strings. The mitigation is
the one the contact sheet used — read the rendered boxes back out of the DOM and print them into the
sidecar, so a drift shows up as a number that no longer matches rather than as a picture nobody checks.

### Rejected

**Flip the JSX gate behind a query flag and capture the real app.** Truthful markup, but it edits all
three screens and `src/index.css` in order to look at an unfinished design. Rejected on principle, and
now also on D2.

**Force the desktop DOM by shimming `window.matchMedia` at 390 px.** Attractive for five minutes: the
`<img>` elements appear with no source change at all. Rejected because `wide` is overloaded — it also
switches `LevelupRig` into its wings layout, whose CSS is `display: contents` below 1280 px. The result is
not a mobile tile with an emblem; it is the wings' content flowing into the phone column. A sheet that
lies is worse than no sheet.

**Re-implement the crop arithmetic in Node or Python and composite the sheet offline.** No browser, fully
deterministic. Rejected for the reason the contact sheet gives: `object-fit: cover` against the real box,
`screen` blending over a gradient card, and a mask from 62 % would have to be copied out of
`src/index.css` into a second place, and then the sheet is a claim about a reimplementation rather than
about what the player sees.

**Capture the three screens in the real app for the *measurement* pass.** Not rejected — **required.** The
true tile widths must come from the running application, and they can, because measuring them needs no
emblem: it reads the tile's padding box. That is the one part of part 1 that drives the real app, and it
is why it is a named deliverable rather than a bullet inside another one.

---

## Part 1 — the two deliverables

**M — the measurement.** Rendered tile and emblem-box widths for all three screens across the phone band
— 320 / 390 / 480 / 639 px, DPR recorded — read out of the running application. It answers H3 with a
number, gives the sheet its widths, and tells the Banner variant where its cap has to sit. Output: a short
table plus a JSON sidecar.

**S — the variant sheet.** Each variant rendered at those measured widths, whole card per screen, one PNG
per screen per variant, plus a sidecar carrying the read-back geometry and a SHA-256 per image.

Both are inputs to the V3 gate at which the design is chosen. Part 1 moves no pixels in the application,
so V1–V4 do not apply to it; the V1 baseline belongs to part 2, and D3 settles its capture set — 390 × 844
in both languages — so that it is not asked again as a round of its own.

---

## The variants, and what each one costs

Both are re-specified under D4: neither may add a pixel to the tile or change a type size.

| | Banner (behind the head) | Corner emblem (top right) |
| --- | --- | --- |
| Shape | full-width strip behind the badge row and the name, masked out before the description | fixed motif in the tile's top-right corner |
| Relation to the text | **underneath it** — the text is lifted with `position: relative`, exactly as `.co-head` lifts the card head above the ornaments | **beside it** — it occupies the space the badge row leaves free |
| Pixels added to the tile | none | none |
| Emblem width | fluid, needs a `max-width` cap | fixed |
| Baked bloom | scales across the band unless capped | fixed, and partly hidden by the tile edge if it bleeds |
| Motif shown | a wide slice; the anchor question becomes acute | the whole motif, or a deliberate bleed off the corner |
| Continuity with desktop | the same picture, a different mechanism | new language |
| Decisive case on the sheet | the longest description, which the mask must clear | the **fullest badge row**, which is what eats the free corner |
| Main risk | legibility: badges and name now sit on top of a picture rather than above it | a three-badge tile leaves no corner, and the emblem collides with a badge |

Two candidates were considered and are **not** on the sheet. The medallion — dropped by D1. And
ornaments on mobile with no tile emblems at all: the cheapest and calmest option, and it fails the
stated goal.

---

## Delegated to the worker, not to the owner

Recorded here per `AGENTS.md` — *Decision authority*, with the alternatives that were not taken.

- **Where the mobile rules live.** A separate rule block keyed below 640 px — never an edit to the
  existing `.sk-strip` / `.pk-strip` / `.co-corner` bodies. Rejected: overriding the desktop rules and
  re-asserting them inside the desktop block. That makes every desktop value depend on a mobile value
  being correct, and under D3 it would also reach the 640–1279 band, which is now out of scope.
- **How the emblem enters the DOM.** The JSX gate is widened, not removed: the three screens keep an
  explicit boolean, so the breakpoint stays a one-line change. Under D3 the new boolean is a *phone*
  query, not the negation of the desktop one — `!wide` would light up the 640–1279 band too. Rejected:
  rendering the `<img>` unconditionally and hiding it in CSS — that is the "phone fetches images it never
  shows" failure the current comments were written against, inverted.
- **Whether new lots are baked.** No, unless the visual gate forces it — see the irreversible decision.
- **Zone heights, mask stops, the Banner's `max-width`, the corner emblem's inset, the ornament width on
  mobile.** Chosen at the device on the sheet and recorded in part 2's contract.
- **How D4 is proven rather than asserted.** The sheet measures each tile's bounding box and the computed
  font size of its badge, name and description rows **with and without** the emblem, and prints both into
  the sidecar. Identical numbers are the evidence; a picture that looks unchanged is not. Rejected:
  eyeballing it at the gate, which is exactly how a two-pixel reflow ships.

**Not delegated:** any change to a breakpoint *number*. `DESKTOP_MIN = 1280` and its twin in
`src/index.css` are guarded against each other by `test/desktopBreakpoint.js`; moving either is an owner
decision (`task-lifecycle.md` §4), and this workstream does not propose one. 640 px is not a new number —
it is Tailwind's `sm:`, already the column-count breakpoint on all three screens.

---

## Known hazards

| | Hazard | Status |
| --- | --- | --- |
| H1 | `task/icon-position-review` part 2 will edit `src/index.css` and the same three screens | **Measured, and defused by D2 for part 1**, which touches none of them. For part 2 the overlap is **textual, not semantic**: its rules are desktop-only (`object-position` on the existing bodies), ours apply below 640 px only. A merge conflict is possible; a behavioural conflict is not. Whichever lands second rebases. Its three existing commits touch `scripts/cdp.mjs`, `scripts/icon-contact-sheet.*` and its own docs. Its own part-2 gate (`feature/desktop-icons..task/icons-corners`) is now `0`, i.e. open. |
| H1b | The collision surface is wider than the four files the briefing names | **Measured.** `test/perk-art.test.js` asserts `.pk-strip-mid { object-position: center center; }` twice (:223, :300) and `object-position: center top` (:302). The `center 25%` verdict cannot land without editing that file too. |
| H2 | No `<img>` exists below 1280 px — this is a first placement, not an adjustment | **Measured**, table above. |
| H3 | The mobile tile is wider than the desktop tile, and the baked bloom divides by the render width | **Inferred** (~305 / ~321 px at 390 px; ~554 / ~570 px at 639 px). Deliverable M answers it with a measurement. |
| H4 | Source-text ratchets read `src/**` as text | **Measured.** Three guards assert the exact gate lines and will go red *by design* when the gate widens: `test/skill-art.test.js:122`, `test/perk-art.test.js:198–199`, `test/leg-gleich.test.js:59`. Their invariant — "no phone loads these images" — is precisely what this workstream reverses, so they are rewritten and counter-checked, never weakened. Additionally `test/corner-art.test.js:231` pins `.co-corner`'s CSS width to the bake's `strip_w`, so a mobile ornament width needs its own rule rather than an override, and `CardCorners.jsx` may not gain a third `<img>` (:300). |
| H5 | The contact-sheet tooling lives on `task/icon-position-review`, not on `dev` | **Measured**, and it is a template rather than a dependency: part 1 writes its own sheet under its own name. D2 means it is not waited for. |
| H6 | `npm test` baseline | **Not measured, and why:** no worktree for this task exists yet, and a baseline taken in a different checkout is not this one's baseline. It is the first step in the contract's definition of done. The known prior report is load-dependent timeouts in `test/i18n-guards.test.js`, green under `npx vitest run --testTimeout=30000`. |
| H7 | The three screens are not reachable from a hub click path | **Observed, new.** `scripts/phone-proof.mjs` records that the level-up card sits behind a live run. A dev run under `VITE_PREVIEW=1` (`App.jsx:1116` → `DevRunSetup`, which takes a per-round schedule of `skill` / `perk` / …) is the candidate route for deliverable M and for part 2's V1/V2. The legendary phase needs its own check. This is proven before V1 is promised, not after. |
| H8 | D3 leaves the 640–1279 band untouched, and nothing renders there today | **By decision, not by oversight.** Recorded so that a later reader does not read the gap as an unfinished job. It is provable rather than assertable: every rule this workstream adds is inside a `max-width` query below 640 px, and the JSX gate is a phone query rather than `!wide`, so the band's rule set and DOM are byte-identical before and after — the cheap proof `scripts/phone-proof.mjs` calls proof 1. |

---

## Non-goals and tripwires

| Non-goal | Why |
| --- | --- |
| Any visible change at or above **640 px** | D3 — phones only |
| Any change to `icon-position-review` or its files | D2 |
| New icons, glyphs or artwork | `AGENTS.md` house rule; the drawing is final |
| Brightness, colour or bloom of the existing lots | Both lots were approved as generated |
| Re-baking any lot | See the irreversible decision |
| Moving a breakpoint number | Owner decision; not proposed |

**Tripwire 1.** If the diff changes `.sk-strip`, `.pk-strip`, `.pk-strip-mid` or `CardCorners` such that
the change takes effect **at or above 640 px** — stop. Under D3 the threshold moved down from 1280; the
desktop was already protected, and now the tablet band is too.

**Tripwire 2.** If the diff touches `src/index.css`, `PerkSelect.jsx`, `SkillSelect.jsx`,
`LegendarySelect.jsx` or `test/perk-art.test.js` **during part 1** — stop and report. Part 1 writes only
under `scripts/` and `docs/workstreams/mobile-icons/`.
