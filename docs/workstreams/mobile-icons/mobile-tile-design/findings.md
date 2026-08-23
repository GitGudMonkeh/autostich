# mobile-tile-design — findings

Task `mobile-tile-design`, workstream `mobile-icons`, branch `task/mobile-tile-design`.
Contract: [`task-contract.md`](./task-contract.md). Planning report:
[`planning-report.md`](./planning-report.md). Part 1 of two.

**Status: part 1 in progress.** Setup and baseline done; the measurement and the sheet are open.

---

## S1 — baseline, before the first edit

Measured in this worktree on 2026-08-23, at base `2eddf9d3eceb2168851481a38cd228dd3c602045`, before
any file under `scripts/` or `src/` was touched.

```console
$ npm ci
… exit 0
$ npm test          # vitest run

 Test Files  138 passed (138)
      Tests  2149 passed (2149)
   Duration  45.83s
… exit 0
```

**The baseline is green.** This matters beyond bookkeeping: the `icon-position-review` contract
recorded `npm test` exiting 1 through load-dependent timeouts in `test/i18n-guards.test.js`, green
only under `npx vitest run --testTimeout=30000`. That did **not** reproduce here, and no timeout
override was used. H6 is therefore resolved in the strong direction — from here on, a red suite is
this task's own doing and needs no argument about pre-existing failures.

`npm ci` emitted `npm warn allow-scripts` for `esbuild` and `ffmpeg-static`: their `postinstall`
steps were not run. **Observed, and shown to be harmless for this task** — Vitest, and therefore
Vite and esbuild, ran the full suite from this worktree. It is recorded because a later failure of
the dev server or the build would make it the first thing to check, and because nothing here is
worth guessing about twice.

---

## Setup, and what it deviated from

`/create-task` could not be invoked by this session — the project commands carry
`disable-model-invocation`, and `CLAUDE.md` reserves them for the owner. The owner instructed this
session to take the step over on 2026-08-23. Its steps were then carried out by hand, with its own
prohibitions in force: nothing pushed, nothing deleted, no force flag, nothing overwritten.

Recorded because a hand-run setup is a deviation, and because two of its results differ from what the
command would have produced:

- **The preview port is 5187, not 5186.** The command allocates the lowest free port from 5181 up,
  reading `grep -rn "Preview port" docs/workstreams` in the cockpit checkout. That grep sees
  5180–5185 and would have chosen 5186 — which `icon-position-review`'s contract already pins, in a
  file that exists only on `task/icon-position-review` and is therefore invisible to a cockpit grep.
  **This is a gap in the allocation rule, not a one-off**: any contract on an unmerged branch is
  invisible the same way. Worth a follow-up task against `.claude/commands/create-task.md`.
- **The contract is the real one, not a scaffold.** The command writes headings plus `TODO`; the
  planning session had already written the contract, so it was placed instead. No section was left
  as a heading.

The base branch `feature/mobile-icons` exists locally only, by the owner's decision of 2026-08-23:
pushing it now would protect nothing, since it points at `2eddf9d3`, a commit `origin/dev` already
carries, and the contract records the base as a SHA rather than as a branch name. It becomes durable
— and is pushed — when the first task branch is integrated into it.

---

## M — the measurement (deliverable), 2026-08-23

`docs/workstreams/mobile-icons/mobile-tile-design/tile-width-probe.mjs`, output
`visual/M-tile-widths.json`. Measured in the running application at
`2eddf9d3eceb2168851481a38cd228dd3c602045`, DPR 1, German, seed `11`, dev server on port 5187. The
route to the three screens is `icons-corners`' — play round 1 and 2, resume into the legendary phase
from a real run state.

### The emblem box on a phone

The number is the tile's **padding box**, because that is what `position: absolute; left: 0; right: 0`
resolves against. Percentages are against the width the lot's bloom was baked for: 277 px for the
skill lot (which the legendary screen also uses — it renders `.sk-strip`), 265 px for the perk lot.

| Viewport | Skill | Perk | Legendary | vs baked |
| --- | --- | --- | --- | --- |
| 320 | 245 | 233 | 249 | −12 % |
| **390** | **315** | **303** | **319** | **+14 %** |
| 480 | 405 | 393 | 409 | +47 % |
| 639 | 564 | 552 | 568 | +105 % |

One column on every screen at every width, measured from the resolved `grid-template-columns` — the
band claim is confirmed rather than read off the JSX.

### What this settles

**H3 — confirmed, and quantified.** At the canonical 390 px the phone tile is **14 % wider** than the
desktop zone, not the 15–16 % the planning report derived and not the 8 % the first (wrong) run
suggested. The baked 16 css-px bloom therefore renders at about **18.3 css-px** on a 390 px phone.
Whether that is visible is a question for the visual gate; it is not a reason to bake a second lot.

**The band is fluid, 2.3×.** From 245 px at 320 to 564 px at 639 on the skill screen, 233 → 552 on the
perk screen. At the top of the band the emblem is **twice** the desktop width and the bloom would
render at ~33 css-px. **The banner variant's `max-width` cap is therefore not a refinement, it is
load-bearing** — without it the design is wrong at one end of the very band it is authored for. The
two fixed-width variants do not have this problem at all.

**H7 — resolved.** All three screens are reachable at phone widths. The application does **not**
auto-resume a run: it comes up on the hub with a „Lauf fortsetzen" button. The first version of this
probe omitted that click and reported `reached: false` at all four widths, which read like a phone
limitation and was nothing of the kind.

**D5 — the derived floor holds.** Room for one 300 px ornament inside the card head is +56 px at
390 px and **−14 px at 320 px**. The crossing point is a card padding box of 300 px, i.e. a viewport
of **334 px** — the planning report derived 332. Above it the ornament keeps its baked width and
`test/corner-art.test.js:231` keeps holding; below it the right 14 px are clipped at the card's
padding edge. **Inferred, not measured:** that clipping is harmless, because the masters' light is
concentrated in the upper-left quadrant and runs out at ~213 px (`docs/art/corners/README.md`), so
what is cut is dark. The 320 px capture on the sheet is what turns that into an observation.

**H2 — confirmed live.** `ornaments: 0` and `hasImg: false` on every tile at every width. Below
1280 px there is genuinely no `<img>` in the DOM.

### The scrollbar, and why the first run was wrong

The first complete run measured 16 px narrower on the skill and perk screens and 8 px narrower on the
legendary one. The difference was **not** a property of the screens: `.overlay-card` is
`overflow-y: auto`, a classic desktop scrollbar takes layout width, and `clientWidth` shrinks by
exactly that. The legendary screen shows one tile and does not scroll, so it lost less.

Two consequences, and the second is the one that matters:

1. **The number the design is authored against is the overlay-scrollbar one.** iOS and Android use
   overlay scrollbars, which take no layout width. `Emulation.setScrollbarsHidden` reproduces that.
2. **With classic scrollbars the zone is content-dependent** — it moves with the number of offers and
   the length of their text. A desktop browser at a narrow width therefore renders a slightly
   different zone than a phone at the same width. Recorded as a limit of the evidence: this
   workstream authors against the phone.

Both modes are in the sidecar so the difference is on the record rather than silently chosen.

### The three screens differ by 4 and 16 px, from two known causes

In overlay mode the card padding box is **identical** on all three screens (356 px at 390 px), so the
remaining differences are the screens' own:

- **16 px** — the perk card is `p-6`, the skill and legendary cards are `px-4`.
- **4 px** — a nested container on the skill screen only; the legendary grid fills its card exactly.

Three zones, from two causes, both in the markup. Part 2 authors one rule with a per-screen width, or
one width and accepts 16 px of slack — that choice belongs to the sheet, not to this table.

### Limits of this evidence

German only; DPR 1; one seed; Chrome via CDP on Windows. Heights are not measured at all — this
answers *how wide*, and the zone heights are a visual-gate question. The tile counts are what seed
`11` produced (3 skill offers, 3 perk offers, 1 legendary tile per faction page), not a claim about
every possible offer.

---

## S — the variant sheets (deliverable), 2026-08-23

`scripts/mobile-tile-sheet.{mjs,html,page.js}`, output `visual/variants-<screen>-<lang>.png`,
`visual/band-<screen>.png` and `visual/S-sheet-measurements.json`. Nine images, 3.9 MB with the two
sidecars.

**Six variant sheets** — three screens × German and English, four columns each: the tile as it renders
today (control), banner, corner emblem, corner emblem bleeding. **Three band sheets** — the banner at
320 / 390 / 480 / 639 px, because "is the banner the right design" and "does the banner hold across a
2.3× band" are two questions and one image cannot answer both.

The tile widths are **not** derived by the sheet. They are read out of `M-tile-widths.json`
(overlay-scrollbar rows) and set explicitly, then read back out of the DOM into the sidecar. A sheet
that produced its own width would be showing a design at a width the application never renders.

### D4 is proven, not asserted

Every variant tile is compared against the control tile of the same sample — bounding box and the
computed font size of the badge, name and description rows. Verdict in the sidecar:
**`no variant changed a tile box or a type size`.**

That check earned its keep on the first run. The bleeding sub-variant set only its two custom
properties while the positioning rule matched a different class, so its emblem fell back into the text
flow and grew every tile by **297 px** — and the sheet still looked plausible at a glance, because a
taller tile on its own column reads as a taller tile. A numeric check caught it immediately; an eye
would have had to notice that one column's cards were not the same height as another's.

### What the sheets show — observations, not the verdict

The verdict is the owner's at V3. These are what the pictures make visible, recorded so the gate
starts from the same place:

- **The banner sits on the text, not above it.** D4 forbids the desktop's push-down padding, so the
  badge row and the skill name are rendered over the brightest part of the emblem. On
  `variants-skill-de.png` „Flächenionisation" and the LEGENDÄR badge are inside the lit area. This is
  the banner's central cost and it follows directly from D4 — it is not a tuning problem.
- **The corner emblem does not fight the text** at the widths measured, and it shows the whole motif.
  Its decisive case is on `variants-perk-*.png`, where the perk tile carries three badges and the
  emblem shares the top-right corner with them.
- **The capped banner stops being a banner at the top of the band.** `band-*.png`: the cap holds the
  emblem at 320 px while the tile grows to 552 px, so at 639 px it reads as a centred patch rather
  than a header strip. Uncapped it would instead double the bloom. Both are visible on that sheet;
  neither is a bug.

### Limits of this evidence

- **The four determinism render flags could not be applied.** `launch()` in `scripts/cdp.mjs` takes no
  flags on this base; the option that adds them is in flight on `task/icon-position-review`, and D2
  says that task is not touched. Consequence: these sheets are reproducible in content but **not
  guaranteed byte-identical between runs**, because every tile goes through a `mix-blend-mode`
  compositing path. The SHA-256 per PNG in the sidecar records what was shown at the gate; it is not a
  reproducibility claim. When that change lands on `dev`, pass the flags and the claim becomes real.
- The sheet builds the tile markup rather than mounting the React screens, so the Tailwind utilities
  are restated as plain CSS. Geometry is not: the widths come from the measurement and the card wash,
  the rarity edge, the ornament zone and the blend come from `src/index.css` and `modalStyle.jsx`.
- One faction (Lightning) stands in for four. The ornament binds to the active tab, so the sheet shows
  the mechanism, not every picture.
- `.as-legendary` (the animated gold frame) and `.as-edge-card.is-sel` are deliberately absent, for
  the reasons `icon-contact-sheet.page.js` gives.
