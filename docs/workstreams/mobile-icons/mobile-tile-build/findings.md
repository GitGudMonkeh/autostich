# mobile-tile-build — findings

Task `mobile-tile-build`, workstream `mobile-icons`, branch `task/mobile-tile-build`.
Contract: [`task-contract.md`](./task-contract.md). Part 2 of two.
Part 1's record, including the V3 verdict this task implements:
[`../mobile-tile-design/findings.md`](../mobile-tile-design/findings.md).

---

## S1 — baseline, before the first edit

Measured in this worktree on 2026-08-23, at base
`899089ccb7724be37201a81547db5fef32c2d8e9`, before any file under `src/` was touched.

```console
$ npm ci      … exit 0
$ npm test    # vitest run

 Test Files  139 passed (139)
      Tests  2153 passed (2153)
… exit 0
```

Green. Four more tests than part 1's baseline: `dev` gained `test/skill-invocation-guard.test.js` with
the move of the three project commands to `.claude/skills/`.

## S2 — V1, before the first pixel moves

`phone-capture.mjs --label V1`, output `visual/V1-*.png` and `visual/V1-phone-capture.json`.

D3's set: **390 × 844, German and English, all three selection screens, DPR 1**, scrollbars hidden so
the widths are the phone case. Six images.

The capture also carries geometry, so V1 vs V2 is a diff of numbers and not only a look at two
pictures. Measured tile padding boxes:

| | Skill | Perk | Legendary |
| --- | --- | --- | --- |
| V1, 390 px, de and en alike | 315 | 303 | 319 |

**These match part 1's measurement exactly** — two scripts written days apart, same route, same
numbers. That is the cross-check that makes the figure worth dividing a bloom radius by.

One thing was changed rather than inherited from part 1's probe: the resume button is now found by
**class** (`button.as-cta-primary`, `StartScreen.jsx:455`) instead of by matching „fortsetzen". The
text match works in German and fails silently in English, and this capture runs in both — the same
trap `perkArt.js` calls out for emblems bound to translated names.

---

## S3–S5 — the implementation, 2026-08-23

### What changed

| File | Change |
| --- | --- |
| `src/ui/useIsWide.js` | `PHONE_MAX = 639.98` and `useIsPhone()` beside `DESKTOP_MIN`/`useIsWide()` — the threshold in one place, not spelled in three screens |
| `src/index.css` | one `@media (max-width: 639.98px)` block: `.mc-tile`, `.mc-emblem`, and `.co-corner-r { display: none; }`. Nothing above it was edited |
| `SkillSelect.jsx` · `PerkSelect.jsx` · `LegendarySelect.jsx` | the emblem and the ornament gate become two queries — `(wide \|\| phone)`, never `!wide` — and the class switches per fassung |
| four guard files | rewritten and counter-checked, below |

**639.98, not 639.** A media query has to be unambiguous at a fractional window width. `max-width:
639px` would leave 639.5 px in neither branch — not the phone, not `sm:` — and the tile would stand
there single-column with no emblem.

**`(wide || phone)`, never `!wide`.** The negation is all of below-1280 and would light the emblem up
in the 640–1279 band, which D3 excludes. This is asserted by a guard of its own, because it is the
kind of thing that reads correct and is only visible on a tablet.

### The measured result

At 390 × 844, both languages, all three screens, scrollbars hidden:

- **28 emblems rendered**, every one **88 × 88**, `mix-blend-mode: screen`, `filter: none`,
  `object-fit: cover`.
- **Exactly 1 of 2 ornaments visible** per card head — D5, on every screen at both widths.
- **Tile boxes and type sizes identical to V1**: 14 tiles compared, **0 differences**
  (`visual/V1-V2-geometry.json`). D4 is a diff of numbers, not a look at two pictures.

### H8 — the 640–1279 band is untouched, and it is proven, not argued

`phone-capture.mjs --label H8 --h8` renders at **700 px**, inside the band this task leaves alone:

| 700 px | emblems | ornaments visible | columns |
| --- | --- | --- | --- |
| skill, de and en | 0 | 0 | 2 |
| perk, de and en | 0 | 0 | 3 |
| legendary, de and en | 0 | 0 | 2 |

That is the point at which a gate written as `!useIsWide()` would betray itself. It does not.

### The guards: rewritten, and each one counter-checked

Eight of the nine red tests were H4's — the ratchets that assert „no phone loads these images".
That invariant is exactly what this task reverses, so they were **rewritten to the new invariant**,
never weakened: two fassungen, one gate each, and a deliberately empty band between them.

The ninth was **not predicted** and is the more interesting one.
`test/viewport-1280.test.js` §3 asserted that **exactly one** fractional `max-width` exists in the
stylesheet — the „just below the breakpoint" idiom, derived from the token rather than typed. A second
threshold makes the *count* wrong while leaving the *intent* right, so the assertion moved from
„exactly one edge" to „**every** edge is derived from a threshold", with the desktop edge still
required to be present so the check cannot pass on an empty list. `PHONE_MAX` is read out of
`useIsWide.js` by the shared helper, the same way `DESKTOP_MIN` already was — Tailwind ships `sm:`, so
there is no `--breakpoint-*` token to compare against.

**Every rewritten guard was counter-checked** by breaking the seam it protects and proving it fails —
`visual/counter-checks.json`, reproduced by
`node <scratch>/counter-check.mjs`. **11 seams broken, 11 caught, 0 missed:**

| Seam broken | Guard that caught it |
| --- | --- |
| `PHONE_MAX` moved to 599.98 | viewport-1280 §3 |
| the phone media query moved to 611.98 | viewport-1280 §3 |
| phone gate removed from the skill emblem | skill-art |
| phone gate replaced by `!wide` | skill-art |
| `art` stops switching the class as well as the element | skill-art |
| phone gate removed from the perk emblem | perk-art |
| desktop strip class swapped for the phone one | perk-art |
| legendary screen falls behind the skill screen | leg-gleich |
| `.co-corner-r { display: none; }` removed | corner-art |
| the phone re-declares `.co-corner`'s width | corner-art |
| one screen keeps the single-query ornament gate | corner-art |

### A gate rule I broke, and what it cost

The first run of the four gates was reported to myself as green and was not. The commands were piped
into `tail`, so the shell reported `tail`'s exit code — the exact failure `AGENTS.md` names under
*Important shell rule*. Lint had one warning and the chain carried on regardless.

Re-run without pipes, exit codes read individually: **`npm test` 0, `npm run lint --max-warnings=0` 0,
`npm run build` 0, `npm run gen:db` 0.**

The warning was worth having. `'lang' is defined but never used` in `phone-capture.mjs` pointed at a
real defect: the legendary resume interpolated `${BOOT}` — the *function* — instead of `${BOOT(lang)}`,
writing the arrow function's source into the page and seeding nothing. It only appeared to work because
the earlier `addScriptToEvaluateOnNewDocument` is still registered and re-runs on that navigation. Fixed,
and **V2 and H8 were captured again with the corrected script**, so the committed evidence comes from the
committed tool.

## Gates

| Gate | Result |
| --- | --- |
| `npm test` | 139 files, 2156 tests, exit 0 — three more than the S1 baseline, all added here |
| `npm run lint -- --max-warnings=0` | exit 0 |
| `npm run build` | exit 0 (the >500 kB chunk warning is pre-existing) |
| `npm run gen:db` | exit 0, 219 entries |

## Limits of this evidence

- **Chrome on Windows via CDP, DPR 1, one seed.** Not a real phone: `Emulation.setScrollbarsHidden`
  reproduces an overlay scrollbar's *layout*, not iOS Safari's rendering.
- **Two widths captured** (390 and 320) plus one control width (700). The band between 320 and 639 is
  covered by part 1's measurement, not by images.
- **One faction** stands in on the skill and legendary screens. The ornament binds to the active tab,
  so the sheet shows the mechanism rather than all four pictures.
- **The emblem's size is a judgement, not a measurement.** 88 px was chosen at the device against the
  narrowest measured tile (233 px). Nothing proves it is the best size — that is what V3 is for.

---

## V3 — the visual gate, 2026-08-23

Transcribed verbatim, per `task-lifecycle.md` — *A finding is not a finding until it has an ID*.

> „Sichtgate ist fein. passt"

**Passed.** The gate is the owner's; this session captured, measured and presented, and does not
record a visual result as approved on its own.

## V4 — classification

The owner returned no findings. Everything below is what **this session** observed and is classified
anyway, because an observation that exists only in a chat message is lost.

| ID | Finding | Classification | Disposition |
| --- | --- | --- | --- |
| MTB-1 | Below a 334 px viewport the single card-head ornament overhangs the head and is clipped at the card's padding edge — visible in `V2-*-320x844.png` | **Expected platform behaviour** | Documented, no fix. What is clipped is dark: the masters' luminous area runs out at ~213 px (`docs/art/corners/README.md`), well inside the 286 px head at that width. Confirmed on the 320 px capture rather than argued from the README alone |
| MTB-2 | The emblem's 88 px is a judgement taken at the device, not a derived value | **New design question** | Backlog. Nothing proves it is the best size; it was chosen against the narrowest measured tile (233 px). A future round can move one number and nothing else — `object-fit: cover` on a square source crops nothing, so size is the only free variable |
| MTB-3 | The captures are not guaranteed byte-identical between runs: `launch()` in `scripts/cdp.mjs` takes no render flags on this base, and the option that adds them is in flight on `task/icon-position-review` | **Pre-existing, out of scope** | Backlog. When that change reaches `dev`, pass the four flags and the reproducibility claim becomes real |

Only the first row could have returned as work in this task, and it did not: it is behaviour, not a
defect.

## Known hazards — final state

| | Status |
| --- | --- |
| H1 | **Measured, not applicable.** `icon-position-review` was neither waited for nor touched (D2). Its part 2 will edit `src/index.css` and the three screens; the overlap is textual and not semantic — its rules are desktop-only `object-position`, this task's sit inside a phone-only media block. Whichever lands second rebases |
| H1b | **Not applicable.** `test/perk-art.test.js` was edited here, but only in its wiring group; the `object-position` assertions that task will move (`:223`, `:300`, `:302`) are untouched |
| H4 | **Measured.** Eight predicted ratchets plus one unpredicted, all rewritten to the new invariant and counter-checked. 11 seams broken, 11 caught |
| H4b | **Measured, held.** `test/corner-art.test.js` stayed green throughout: `.co-corner`'s CSS width still equals the bake's `strip_w`, and `CardCorners.jsx` still renders exactly two `<img>` |
| H8 | **Measured.** At 700 px: zero emblems, zero visible ornaments, column counts unchanged |
| H9 | **Measured, controlled.** Both halves were captured with scrollbars hidden, so V1 and V2 are comparable and both describe the phone case |
