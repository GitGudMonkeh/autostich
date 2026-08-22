# Evidence package — icons-corners

Tier C task under `feature/desktop-icons`. Branch `task/icons-corners`, worktree
`C:/Code/Autostich-worktrees/icons-corners`, base `feature/desktop-icons`.

What was claimed, what was measured, and what was not. **Three design rounds** — the numbers below
are the shipped state after round 3.

---

## 0. Scope, as changed

The contract scoped the ornaments to the skill and perk selection heads, and named extending them to
any further screen as a **non-goal**. At the round-1 V3 gate the owner asked for the legendary phase
to be included. That is a deliberate scope extension by the person who owns scope — recorded here
rather than folded in quietly.

It then changed shape once more. Round 2 gave that screen a gold phase ornament (the perk filigree
re-hued at bake time); round 3 replaced it with the **faction ornament of the active tab**, on the
owner's verdict that the legendary head speaks the skill head's language. The gold delivery and the
bake-time recolour were **deleted rather than left dormant** — a capability with no caller is a
promise nobody checks.

Two things follow from the extension, and both are weaker than the rest of this package:

- the legendary screen has **no true V1** (§4),
- it is captured by **resuming an injected run state** rather than by playing to cycle 29 (§4).

---

## 1. Gates

Run in the worktree, in the order `AGENTS.md` gives, as bare commands — nothing piped, so no exit
code was swallowed. All re-run after round 3.

| Gate | Command | Result |
| --- | --- | --- |
| Tests | `npm test` | **Exit 1.** The single failure is `test/i18n-guards.test.js › jeder Katalog-Schlüssel wird auch irgendwo benutzt`, a **timeout at 5000 ms, not an assertion failure** — hazard H7, pre-existing |
| Tests, H7 comparison | `npx vitest run --testTimeout=30000` | **2139 / 2139 passed, 137 / 137 files, exit 0** — the figure the contract names as honest for this base (2101 on the base, +38 from this task) |
| Build, on the CSS | see `ICONS-CORNER-12` | The round-3 edit left a comment unterminated. **The suite stayed fully green; only `npm run build` failed.** Fixed, and worth knowing: no guard in this repository reads CSS validity |
| Lint | `npm run lint -- --max-warnings=0` | **Exit 0** |
| Build | `npm run build` | **Exit 0** |
| Preview build | `VITE_PREVIEW=1 npm run build` | **Exit 0** |
| Database | `npm run gen:db` | **Exit 0** |
| Localization | `npm run loc:export` | **Exit 0, and no drift** — `git status` unchanged afterwards. Ran rather than declared not-applicable: the ornaments add no player-visible string (`alt=""`, `aria-hidden="true"`) |

**`npm test` does not pass, and this document does not claim it does.** H7 predicted exactly this.
Both numbers are above; the failing test is the same one, failing the same way, for the same reason.

Inherited caveat, slightly worsened: this task adds ~8 kB to the ~1.5 MB corpus that guard
concatenates and scans — inside the run-to-run spread but not literally zero. Not fixed here: raising
the budget means editing a guard this task does not own, for a condition it did not create.

---

## 2. The zone — the number this task existed to produce

`bake --lot corners` refused because `strip_w=None`. It no longer refuses, and the reason is a
measurement.

**`strip_w = 300` CSS px.** Read from the running application by `corner-zone-probe.mjs`:

| | Skill head | Perk head | Legendary head |
| --- | --- | --- | --- |
| Overlay card | 880 px (padding box **878**) | 880 px (padding box **878**) | 880 px (padding box **878**) |
| Head padding | 16 px | 24 px | 16 px |
| Band to the sticky bar | **77 px** | **115 px** | no sticky bar on this screen |

Identical at 1600×900, 1920×1080 and 2560×1440. At 1280×720 the card is 768 px, below the 1400 px
gate — nothing renders.

**Contract Q1 answered: one `strip_w`, not two — and it survived a third screen** it was not measured
against, which is the strongest available evidence that it was the right shape of answer.

**The honest shape of this number.** Unlike the emblem zones it is *declared* rather than *resolved*:
`.pk-strip` is stretched between `left:0` and `right:0` and is whatever the tile allows, which is why
`icons-perks` had to read 265 out of the DOM. A corner ornament is anchored and given a width. So 300
was chosen — against a measured envelope: widest head text 244 px, centred, leaving ~317 px per side
on the perk head and ~324 px on the skill head. **V2 closes the loop**: the rendered width is
300.00 px at every desktop viewport on all three screens.

The tripwire was borrowing 265 / 270 / 270.66 / 277. None appears in this lot.

---

## 3. Acceptance gate

Checked against `visual/V2R3-measurements.json` mechanically, per screen, per tab, per viewport:

| Property | Required | Measured |
| --- | --- | --- |
| Rendered width | 300 px, the bake divisor | **300.00 px** everywhere, all three screens |
| Natural size | 3:2, not squashed | **600 × 400** |
| Right copy mirrored | `scaleX(-1)` | `matrix(-1, 0, 0, 1, 0, 0)`; left copy `none` |
| Clipping | none | no overflow left, right or top on any ornament |
| Blend | `screen` | `screen` |
| Runtime filter | none | `filter: none` |
| Opacity | balance × level | matches to 3 decimals for all five keys |
| Below the gate | no `<img>` at all | 0 ornaments in the DOM at 1280×720, all three screens |
| Legendary binding | the tab's faction file | `corner_lightning.webp` on the Blitz tab; no `corner_legendary.webp` anywhere |

The clipping check is not an eyeball: `overflow-y: auto` on the card makes its `overflow-x` compute to
`auto`, so the probe compares each ornament's box against the card's on three edges.

---

## 4. Where the evidence is weakest

Stated before the good news, because it is the part a reviewer should push on.

- **The legendary screen has no true V1.** It entered scope at the round-1 V3 gate, after pixels had
  already moved. `V1L-legendary-1920x1080-card.png` was produced by disabling one JSX line, capturing,
  and restoring — the restore verified by the guards going green. §8 warns about reconstructed
  baselines specifically. One viewport only.
- **The legendary head is reached by injection, not by play.** Cycle 29 of a 50-cycle run is not a
  capture step. A real run state is lifted from `as_activerun` after a seeded run starts, four fields
  are changed (phase, two dead offers, cycle) and it is loaded through the application's own
  `loadActiveRun`, which validates and would discard a malformed state. What renders is
  `LegendarySelect` with real data — but arriving there normally was not tested.
- **The 300 px width is defensible, not inevitable.** ~17 px of slack on the tighter screen. A longer
  head line in a future language, or a change to the 880 px overlay cap, eats it — and then both this
  number and the bake radius are recomputed. The guard comparing them goes red first.
- **The mask floor rests on one measured number.** 77 px is the narrowest head *observed*, not a
  proven minimum.
- **Nothing was measured about performance.** No `filter` was added and the bloom stays baked, but
  `phase:levelup` was not re-timed.
- **One game state per screen, DPR 1 only.**
- **Only the card crops are committed, not the full-frame captures.** The probe writes both; the
  full frames are 41 MB of the 61 MB it produces and each one has a matching `-card` crop of the same
  moment, so the duplicates were dropped rather than carried in the repository forever. Nothing is
  hidden by it — the crop is a crop of the full frame, and the absolute page coordinates are in the
  measurement JSON. Re-running the probe regenerates the full frames.

---

## 5. Guards, and the counter-check

`test/corner-art.test.js`, 38 tests. Every seam below was broken mechanically, the suite run, the file
restored, and the tree verified clean afterwards.

| Seam broken | Guard |
| --- | --- |
| Zone width drifts from the bake divisor | RED |
| Mask outlives the narrowest measured head | RED |
| Filigree mask made identical to the organic one | RED |
| Filigree corner set flush to the card edge | RED |
| `scaleX(-1)` removed | RED |
| `filter: blur(2px)` added | RED |
| Head no longer lifted above the ornaments | RED |
| A `light=` table added to the lot as well | RED |
| Derived gold no longer declared | RED |
| Recolour turned into a flat grey mid-point | RED |
| Skill tab binding replaced by a constant | RED |
| Desktop gate removed (skill) | RED |
| `co-head` class dropped | RED |
| Legendary head bound to its tab | RED |
| Desktop gate removed (legendary) | RED |
| One lot's balance quietly edited | RED |
| `isFiligree` drops the legendary key | RED |
| Filigree case passed as a prop | RED |
| Second ornament deleted | RED |
| Delivery file removed (`corner_ice`) | RED |
| Delivery file removed (`corner_legendary`) | RED |
| Level reverted to the rejected 1 | **RED — after a fix. It was GREEN.** |
| Legendary head pinned to a fixed key | RED |
| `isFiligree` picks the gold key back up | RED |
| A derived delivery reappears | RED |

**21 of 21 caught in the final round — but two of those guards had to be repaired first, and both
repairs came from the counter-check rather than from planning.**

- Returning the level to 1 — the exact state the round-1 gate rejected — broke nothing, because every
  other assertion here is ratio-based and deliberately level-independent. Right for the ratios, wrong
  for the level, so the decided level is now pinned (`ICONS-CORNER-09`).
- The slice that isolates the lot declaration looked for a closing `})`. Correct only while the lot
  ended with a dict argument; when round 3 dropped that argument the slice ran on for hundreds of
  lines and swallowed an unrelated `light=`, so the hundredfold-trap guard was **green for the wrong
  reason** (`ICONS-CORNER-13`). It now balances parentheses, and that seam was re-broken to confirm.

A guard that quietly widens its own scope is worse than no guard. Both of these were only visible
because every seam is broken on purpose after every change.

The guard with the most teeth remains the first: the bloom radius is baked by dividing an authored
CSS length by `strip_w`, and the same width is declared again in `index.css`. Each file alone still
says something true if they drift; only the comparison catches it.

---

## 6. Hazards H1–H7

| # | Hazard | What happened |
| --- | --- | --- |
| **H1** | `overflow: hidden` on the perk tile clips anything outside the border box | **Did not apply, and that is measured.** The ornaments live in the card HEAD, not on a tile. The probe checks three edges of every ornament against the card box at every viewport on all three screens: no overflow |
| **H2** | Tile height is content-dependent; only the width is fixed | **Applied in spirit and designed around.** The head has the same property — 77 px against 115 px on two screens. Nothing is anchored to a head height: the zone is a constant 115 px and the mask finishes at 71 px. The guard recomputes that inequality from the CSS |
| **H3** | The masters are 3:2; a hard-coded delivery edge ships them distorted | **Handled and verified.** Delivery is 600 × 400; the guard reads the actual WebP canvas out of all six files rather than trusting the build log |
| **H4** | Additive compositing over the existing emblem in the top 201 px of the perk tile | **Did not arise.** The ornaments are in the head, above the offer grid, and do not overlap the tiles |
| **H5** | Two screens, two card families, one ornament system — the unification question | **Answered both ways.** Taken for the corners (one component, one family, now three screens); declined for the emblem strips. Reasoning in the handoff |
| **H6** | Source-text ratchets can turn red on new JSX/CSS without a behaviour change | **Did not occur.** No pre-existing guard changed state; no existing test file was edited |
| **H7** | `npm test` exits 1 on this base through load-dependent i18n timeouts | **Reproduced, unchanged, not fixed.** §1 has both numbers |

---

## 7. What was measured about the artwork

Difference against each screen's baseline over the real 300 × 115 zone, 1920×1080, at the shipped
level of 3×:

| Lot | Balance | × 3 | Mean added light | Peak (p99) | Area > 2 |
| --- | --- | --- | --- | --- | --- |
| Blitz | 11.0 % | 33.0 % | 2.269 | 40.00 | 18.89 % |
| Feuer | 10.0 % | 30.0 % | 1.751 | 27.51 | 16.74 % |
| Eis | 9.2 % | 27.6 % | 2.241 | 31.39 | 19.57 % |
| Pflanze | 6.4 % | 19.2 % | 1.998 | 23.88 | 22.90 % |
| Perk | 15.6 % | 46.8 % | 1.775 | 27.92 | 16.44 % |

**Spread 1.30-fold**, against 1.27-fold at level 1 — the balance survives the level change, which is
what the split was built for. The legendary head has no row of its own: it shows the faction
ornaments and is covered by theirs.

This measurement also **corrected a wrong first impression** in round 1: by eye Pflanze looked like
the faint one. It is not — it is mid-pack in total light with the largest area at the lowest peak.
The difference between lots is texture, not brightness (`ICONS-CORNER-02`).
