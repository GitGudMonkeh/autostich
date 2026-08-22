# Visual review — icons-perks

The §8 lifecycle of `docs/engineering/task-lifecycle.md`. Tier C runs the visual gate **always**.

**V3 was passed by the owner on 2026-08-22**, recorded below with the verdict verbatim. Everything
else here is capture, measurement and classification — the worker's work. The judgement is not: no
agent approved anything in this document (§8 — *V3*: "an agent must not report a visual result as
approved").

---

## How both halves were captured

One committed script produced V1 and V2, with the same seed, the same viewports and the same
application state on both sides:

```bash
npm run dev -- --port 5184 --strictPort
node docs/workstreams/desktop-icons/icons-perks/perk-zone-probe.mjs --label V1
node docs/workstreams/desktop-icons/icons-perks/perk-zone-probe.mjs --label V2
```

| Control | Value |
| --- | --- |
| Viewports | 1280 × 720, 1600 × 900, 1920 × 1080, 2560 × 1440 — the four in `src/ui/testViewport.js` |
| DPR | 1 |
| Browser | headless Chrome via `scripts/cdp.mjs`, `Emulation.setDeviceMetricsOverride` |
| Determinism | `prefers-reduced-motion: reduce`, `Math.random` replaced by a seeded PRNG before any app script, audio muted, telemetry off |
| Application state | run seed 33 (typed as `11`), round 2 = first perk decision, one skill picked in round 1, MAX speed |
| Profile | `tier3` / `tier4` / `legLayer` owned — the 9 SP that open the legendary perk layer |
| Language | German |

**Why that profile.** On a fresh profile `nodeEffects` returns `legendaryLayer: false, maxTier: 2`, so
no legendary perk can be offered at all and seed 33 yields three ordinary tier-I family perks. With
the layer open, seed 33's first offer is **Vabanque (legendary) · Starker Auftakt II · Leibwache I** —
one legendary and two regular perks in one offer. That is the only configuration in which a single
capture can show both icon populations side by side under identical tile geometry, which is exactly
what this task's acceptance gate asks for. The profile is written through the app's own
migrate-and-merge path and is a state a real player reaches; nothing in `src/` is touched for it.

### Files

```text
visual/V1-measurements.json          visual/V2-measurements.json
visual/V1-perk-<size>.png            visual/V2-perk-<size>.png            full viewport, 4 sizes
visual/V1-perk-card-<size>.png       visual/V2-perk-card-<size>.png       the overlay card, 4 sizes

visual/V2-legendaries-anchor-comparison.png      all 21, both anchors, in the real 265x201 zone
visual/V2-legendaries-in-strip-geometry.png      all 21 as shipped, cropped and masked as the browser does
visual/V2-perkcats-in-strip-geometry.png         all 7, likewise
```

---

## V1 — pre-change baseline

Taken **before the first pixel moved**, and then damaged and repaired. Both halves of that are
recorded here because the repair is what makes the baseline usable and the damage is what a reviewer
would otherwise have to guess at.

**What happened.** V1 was captured first, against the untouched worktree, before any file in `src/`
was changed. Later in the task the probe was re-run with `--label V1` by operator error, after the
implementation was in place, overwriting the baseline files with post-change captures.

**How it was repaired.** The base state is committed and immutable, and the change is confined to
tracked files plus new untracked ones. `src/ui/PerkSelect.jsx` and `src/index.css` were restored from
`HEAD`, the probe was re-run, and the implementation was restored and verified byte-identical by
`git hash-object` before and after. The shipped V1 is therefore a **deterministic render of the base
commit**, not a reconstruction from memory or from a partially reverted tree.

**Why that is trustworthy here, and where it still falls short.** The regenerated V1 reproduces the
original capture's figures exactly — tile 270 px at all three desktop sizes, no `<img>` on any tile,
the same three perks in the same order — so the regeneration is checked against the original, not
merely asserted. What is lost is the property §8 actually values: that the baseline could not have
been influenced by knowledge of the change. A reviewer should treat V1 as *base-commit-derived*
rather than *untouched-first-capture*, and the honest statement is that the original was taken
correctly and then destroyed, not that the process was clean throughout. Recorded as **DR-1**.

| Viewport | Tile | `<img>` present | Card height |
| --- | --- | --- | --- |
| 1280 × 720 | 230 px | no (below the gate) | 172.38 px |
| 1600 × 900 | **270 px** | no | 162.50 px |
| 1920 × 1080 | **270 px** | no | 162.50 px |
| 2560 × 1440 | **270 px** | no | 162.50 px |

---

## The measurement this task exists for

The perk offer tile is **270.00 CSS px** wide and **the emblem inside it is drawn 265 px wide**,
identical at 1600, 1920 and 2560, read out of the live DOM in the running application. The tile is
constant because the level-up overlay card is width-capped at 880 px, so the three-column grid is
830 px and each column is (830 − 2 × 10 gap) / 3; the image is 5 px narrower because `left: 0;
right: 0` resolves against the button's padding box and `.as-edge-card` carries a 4 px rarity edge
plus 1 px on the other three sides.

**265 is the number the bloom is divided by, and getting there took two passes.** The first read the
tile width off the grid and wrote 270 — the right screen, the wrong box — which would have baked a
radius of 22.76 px where the correct one is 23.18. Recorded as `ICONS-PERK-VIS-07`, because it is the
same failure mode as the tripwire the contract names, arrived at from a different direction.

**The legendary tile measures the same as the regular ones** — 270.00 px outer, 265 px of drawn image —
which confirms live what the contract's Q1 closed from the code: one `strip_w` covers both lots.

Three neighbouring values are traps: `STRIP_W = 277`, never measured on anything; 270.66, the *skill*
card (`ICONS-VIS-01`); and 270, this screen's own tile. All three are close enough to look right and
none is the width the emblem is drawn at. `test/perk-art.test.js` asserts that none of them appears.

The zone HEIGHT, 201 px, is derived rather than chosen: 76 % of the measured 265, the composition
window the perk masters were built for. A guard recomputes it from the width so the two cannot drift.

---

## V2 — post-change capture

Same script, same seed, same sizes, same DPR, same state.

| Viewport | Tile | `<img>` | Bound file | Card height |
| --- | --- | --- | --- | --- |
| 1280 × 720 | 230 px | **0 of 3** | — | 172.38 px (unchanged from V1) |
| 1600 × 900 | 270 px | 3 of 3 | see below | 317.50 px |
| 1920 × 1080 | 270 px | 3 of 3 | see below | 317.50 px |
| 2560 × 1440 | 270 px | 3 of 3 | see below | 317.50 px |

Per tile, at every desktop size:

| Tile | Population | Resolved to |
| --- | --- | --- |
| Vabanque | legendary | `L_VAB_vabanque.webp` — **its own** emblem |
| Starker Auftakt II | family, category B | `perkcat_B_stich.webp` — **its category's** emblem |
| Leibwache I | family, category C | `perkcat_C_rolle.webp` — **its category's** emblem |

Live computed style on the strip: `object-fit: cover`, `mix-blend-mode: screen`, mask
`linear-gradient(180deg, #000 62%, transparent)`, `filter: none`. Strip box 265 × 201 at all three sizes.
`object-position: 50% 0%` on the two category strips and `50% 50%` on the legendary one.

**The acceptance gate's two halves are both visible in one capture**, and the desktop gate is shown by
absence rather than by invisibility: at 1280 × 720 the tiles carry no `<img>` element at all, and the
card height is unchanged from V1 to the hundredth of a pixel.

---

## V3 — human visual review gate: **PASSED by the owner, 2026-08-22**

The verdict, verbatim:

> bilder passen

Recorded by the worker; the judgement is the owner's. Nothing in this section is an agent's visual
approval (§8 — *V3*).

**What was put in front of the gate**, so that a later reader knows what the verdict covers:

| Shown | File |
| --- | --- |
| The before/after pair | `V1-perk-card-1920x1080.png` against `V2-perk-card-1920x1080.png` |
| The tightest desktop size | `V2-perk-card-1600x900.png` |
| **The anchor decision** | `V2-legendaries-anchor-comparison.png` — all 21, top-anchored above, centre-anchored below |
| All 28 emblems as cropped and masked | `V2-legendaries-in-strip-geometry.png`, `V2-perkcats-in-strip-geometry.png` |
| Full viewport, all four sizes | `V2-perk-<size>.png` |

Two questions were named explicitly at the gate, because both are choices this task made rather than
found, and both are one line to reverse. **Both are closed by the verdict above:**

1. **The legendary strip is centre-anchored, the category strips are top-anchored**
   (`ICONS-PERK-VIS-02`). The comparison image was among what was shown. Approved as shipped.
2. **The tile roughly doubles in height** — 162.5 px to 317.5 px (`ICONS-PERK-VIS-03`). Nothing
   clips and nothing scrolls at any of the four sizes. Approved as shipped.

The verdict does **not** extend to what the captures could not show, which stays open and is listed
under *Downgrade records* below: 25 of the 28 emblems were never rendered by the application, only
German was captured, and only DPR 1.

---

## V4 — classification

Every finding has an ID. Nothing here is closed by an agent.

| ID | Finding | Classification | Disposition |
| --- | --- | --- | --- |
| `ICONS-PERK-VIS-01` | The emblem is drawn 265 px wide — not the 277 the skill lots are baked against, nor the 270.66 the skill card measures, nor the 270 of the perk tile itself. Both perk lots are baked against the measured 265 | Defect in this task — **fixed** | This was the task. Guarded by `test/perk-art.test.js`, counter-checked by setting `strip_w=277` and watching the guard go red |
| `ICONS-PERK-VIS-02` | The 21 legendary masters are centred (light centroid 0.48) where the 7 category masters are top-weighted (0.42). Under a top-anchored 76 % window the legendary subjects are cut — Henker keeps 34.7 % of its light, and what survives is the axe *shaft*. The legendary strip is therefore centre-anchored: median retention 71.4 % → 86.5 % | New design question — **closed at V3, 2026-08-22** | Shipped as one CSS class (`.pk-strip-mid`). The owner saw the both-anchors comparison and approved it as shipped. Measurement in `docs/art/legendaries/README.md` |
| `ICONS-PERK-VIS-03` | The offer tile grows from 162.5 px to 317.5 px tall. At 1600 × 900 — the tightest desktop size — the overlay still fits without scrolling, and the wings are unaffected | Expected platform behaviour — **closed at V3, 2026-08-22** | No fix. It is the same consequence the skill card already carries (`padding-top: 176px` there, 167 here) |
| `ICONS-PERK-VIS-04` | Legendary and category emblems are aligned against their own lots, so they do not match each other on a screen where they appear side by side: category median 23.5 % luminous area, legendary median 30.1 %. The legendary tiles read brighter | **New design question** | Per-lot alignment is the contract's *Approved architecture* 6 and was followed. Whether the two lots should also be aligned to each other is a question this task is not authorised to answer — named as input to a future workstream |
| `ICONS-PERK-VIS-05` | `align --lot perkcats` under the new statistic proposes 1.06 for E Form where 0.73 ships — the largest divergence in that lot. Both numbers are internally correct; they measure different things (total emitted light vs luminous area) | **Pre-existing, out of scope** | The contract requires the README's existing factors be applied, not re-derived. The script reports the divergence rather than acting on it |
| `ICONS-PERK-VIS-06` | The skill lots remain baked against `STRIP_W = 277` while the skill card measures 270.66 — the audit's `ICONS-VIS-01`, still open | **Pre-existing, out of scope** | Re-baking lightning and ice is an explicit non-goal of this contract. Carried forward unchanged. Note that `ICONS-PERK-VIS-07` below suggests the audit's 270.66 may itself be the skill BUTTON rather than the skill strip; not investigated, because touching the skill lots is a non-goal |
| `ICONS-PERK-VIS-07` | The first pass measured the perk TILE (270 px) instead of the emblem drawn inside it (265 px), and baked both lots against 270. Wrong by 5 px, i.e. a bloom radius of 22.76 px against the correct 23.18 | Defect in this task — **fixed** | Caught by reading the `<img>` box out of the live DOM rather than only the button's. Both lots re-baked at 265; the guard now also rejects `strip_w=270`. Worth carrying into the reviewer's reading: the contract's tripwire warns against a BORROWED constant, and this was a measured one that measured the wrong box — the same failure with a different origin |

### Downgrade records

| ID | What is missing | Why it is recorded rather than repaired |
| --- | --- | --- |
| `DR-1` | V1 was taken correctly, then overwritten by operator error and regenerated from the immutable base commit | Regeneration reproduces the original figures exactly, but a re-derived baseline is weaker than an untouched one and is labelled as such rather than presented as clean |
| `DR-2` | Only **one** of the 21 legendary emblems (`L_VAB`) and **two** of the 7 category emblems (`B`, `C`) were seen rendered by the application. The other 25 were verified as files and as bindings, not on the screen | A perk offer holds three tiles, and driving 26 further offers means playing out the run's RNG. What was checked instead: every file bakes, every binding resolves in `test/perk-art.test.js` in both directions, and all 28 are rendered in the exact strip geometry in the contact sheets. That is a lot-level check, not a screen-level one |
